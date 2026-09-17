import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { treksApi, type Trek, type TrekStop, type TrekStatus, type PaymentMethod } from '../../../api-client';
import { FlatButton, FlatDropdown, FlatInputNumber, FlatInputText } from '../../../components/flat-form';
import { FlatConfirmDialog } from '../../../components/overlay';
import { resetTableData } from '../../../components/data-table';
import { EditTrekModal } from './components/EditTrekModal';
import { AddStopModal } from './components/AddStopModal';
import toast from 'react-hot-toast';

// ── Constants ──────────────────────────────────────────────────────────
const STATUS_COLORS: Record<TrekStatus, string> = {
  Draft:      'text-portal-muted',
  Scheduled:  'text-blue-400',
  InProgress: 'text-yellow-400',
  Completed:  'text-portal-accent',
  Cancelled:  'text-red-400',
};

const STATUS_LABELS: Record<TrekStatus, string> = {
  Draft: 'Draft', Scheduled: 'Scheduled', InProgress: 'In Progress',
  Completed: 'Completed', Cancelled: 'Cancelled',
};

const NEXT_STATUSES: Partial<Record<TrekStatus, TrekStatus[]>> = {
  Draft:      ['Scheduled', 'Cancelled'],
  Scheduled:  ['InProgress', 'Cancelled'],
  InProgress: ['Completed'],
};

const NEXT_LABELS: Partial<Record<TrekStatus, string>> = {
  Scheduled: 'Mark Scheduled', InProgress: 'Start Trek',
  Completed: 'Mark Completed', Cancelled: 'Cancel Trek',
};

const PAYMENT_OPTIONS = [
  { label: 'Select method...', value: '' },
  { label: 'Cash', value: 'Cash' },
  { label: 'Mobile Money', value: 'MobileMoney' },
  { label: 'Credit', value: 'Credit' },
  { label: 'Cheque', value: 'Cheque' },
  { label: 'Bank Transfer', value: 'BankTransfer' },
];

const numberInputValue = (value?: string) => value ? Number(value) : null;
const numberRowValue = (value: number | null) => value == null ? '' : String(value);

// ── Delivery row state ─────────────────────────────────────────────────
interface DeliveryRow {
  basicQtyDelivered: string;
  packagingQtyDelivered: string;
  paymentMethod: string;
  amtPaid: string;
  balance: string;
  notes: string;
}

function initDeliveryRows(trek: Trek): Record<string, DeliveryRow> {
  const rows: Record<string, DeliveryRow> = {};
  trek.stops.forEach((stop) => {
    stop.products.forEach((p) => {
      rows[p.stopProductId] = {
        basicQtyDelivered: p.basicQtyDelivered != null ? String(p.basicQtyDelivered) : '',
        packagingQtyDelivered: p.packagingQtyDelivered != null ? String(p.packagingQtyDelivered) : '',
        paymentMethod: p.paymentMethod ?? '',
        amtPaid:       p.amtPaid != null ? String(p.amtPaid) : '',
        balance:       p.balance != null ? String(p.balance) : '',
        notes:         p.notes ?? '',
      };
    });
  });
  return rows;
}

// ── Page ───────────────────────────────────────────────────────────────
export const TrekDetailPage: React.FC = () => {
  const { trekId } = useParams<{ trekId: string }>();
  const navigate   = useNavigate();

  const [trek, setTrek]               = useState<Trek | null>(null);
  const [loading, setLoading]         = useState(true);
  const [deliveryRows, setDeliveryRows] = useState<Record<string, DeliveryRow>>({});
  const [recordingStop, setRecordingStop] = useState<string | null>(null);
  const [changingStatus, setChangingStatus] = useState<TrekStatus | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [shareOpen, setShareOpen]     = useState(false);
  const shareRef                      = useRef<HTMLDivElement>(null);
  const [editVisible, setEditVisible] = useState(false);
  const [addStopVisible, setAddStopVisible] = useState(false);
  const [editingStop, setEditingStop] = useState<TrekStop | null>(null);
  const [removingStop, setRemovingStop] = useState<TrekStop | null>(null);
  const [confirmComplete, setConfirmComplete] = useState(false);

  const loadTrek = useCallback(async (silent = false) => {
    if (!trekId) return;
    if (!silent) setLoading(true);
    try {
      const data = await treksApi.getTrek(trekId);
      setTrek(data);
      setDeliveryRows(initDeliveryRows(data));
    } catch {
      toast.error('Failed to load trek.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [trekId]);

  useEffect(() => { loadTrek(); }, [loadTrek]);

  useEffect(() => {
    if (!shareOpen) return;
    const handler = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) setShareOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [shareOpen]);

  const updateRow = (stopProductId: string, field: keyof DeliveryRow, value: string) => {
    setDeliveryRows((prev) => ({
      ...prev,
      [stopProductId]: { ...prev[stopProductId], [field]: value },
    }));
  };

  const handleRecordStop = async (stop: TrekStop) => {
    if (!trek) return;

    // Validate required delivery fields per product
    for (const p of stop.products) {
      const row = deliveryRows[p.stopProductId] ?? {};
      const name = `"${p.productName}"`;
      const basic = row.basicQtyDelivered === '' ? null : Number(row.basicQtyDelivered);
      const packaging = row.packagingQtyDelivered === '' ? null : Number(row.packagingQtyDelivered);
      if (basic === null && packaging === null) {
        toast.error(`Enter a delivered quantity for ${name}.`);
        return;
      }
      if ((basic !== null && (!Number.isFinite(basic) || basic < 0)) ||
          (packaging !== null && (!p.packagingUnitName || !Number.isFinite(packaging) || packaging < 0))) {
        toast.error(`Enter valid delivered quantities for ${name}.`);
        return;
      }
      if (!row.paymentMethod) {
        toast.error(`Payment method is required for ${name}.`);
        return;
      }
      if (!row.amtPaid || parseFloat(row.amtPaid) < 0) {
        toast.error(`Amount paid is required for ${name}.`);
        return;
      }
    }

    setRecordingStop(stop.stopId);
    try {
      const products = stop.products.map((p) => {
          const row = deliveryRows[p.stopProductId] ?? {};
          return {
            stopProductId: p.stopProductId,
            basicQtyDelivered: row.basicQtyDelivered !== '' ? Number(row.basicQtyDelivered) : undefined,
            packagingQtyDelivered: p.packagingUnitName && row.packagingQtyDelivered !== '' ? Number(row.packagingQtyDelivered) : undefined,
            paymentMethod: row.paymentMethod  ? row.paymentMethod as PaymentMethod : undefined,
            amtPaid:       row.amtPaid        ? parseFloat(row.amtPaid)        : undefined,
            balance:       row.balance        ? parseFloat(row.balance)        : undefined,
            notes:         row.notes          ? row.notes                      : undefined,
          };
        });
      await treksApi.recordDelivery(trek.id, { products });
      resetTableData();
      toast.success(`Stop ${stop.sequence} recorded.`);
      await loadTrek(true);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to record delivery.');
    } finally {
      setRecordingStop(null);
    }
  };

  const handleStatusChange = async (status: TrekStatus) => {
    if (!trek) return;
    setChangingStatus(status);
    try {
      await treksApi.changeStatus(trek.id, status);
      await loadTrek(true);
      resetTableData();
      toast.success(`Trek ${STATUS_LABELS[status].toLowerCase()}.`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update status.');
    } finally {
      setChangingStatus(null);
    }
  };

  const handleGenerateLink = async () => {
    if (!trek) return;
    setGeneratingLink(true);
    setShareOpen(false);
    try {
      const result = await treksApi.generateLink(trek.id);
      await navigator.clipboard.writeText(result.url).catch(() => {});
      toast.success('Driver link copied to clipboard.');
    } catch {
      toast.error('Failed to generate link.');
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!trek) return;
    setDownloadingPdf(true);
    setShareOpen(false);
    try {
      const blob = await treksApi.downloadPdf(trek.id);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `TrekkingSheet-${trek.trekNumber}-${trek.scheduledDate}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download PDF.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleRemoveStop = async () => {
    if (!trek || !removingStop) return;
    try {
      await treksApi.removeStop(trek.id, removingStop.stopId);
      resetTableData();
      setRemovingStop(null);
      await loadTrek(true);
      toast.success('Stop removed successfully.');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.detail || 'Failed to remove stop.';
      toast.error(msg);
    }
  };

  const isLocked        = trek?.status === 'Completed' || trek?.status === 'Cancelled';
  const isDeliveryLocked = trek?.status !== 'InProgress';
  const nextStatuses = trek ? (NEXT_STATUSES[trek.status] ?? []) : [];
  const sortedStops  = trek ? [...trek.stops].sort((a, b) => a.sequence - b.sequence) : [];

  // ── Loading ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-portal-muted text-xs gap-2">
        <i className="pi pi-spin pi-spinner" /> Loading trek...
      </div>
    );
  }

  if (!trek) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <p className="text-portal-muted text-sm">Trek not found.</p>
        <FlatButton variant="outline" size="sm" leftIcon="pi pi-arrow-left" onClick={() => navigate('/portal/trekking')}>Back</FlatButton>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Breadcrumb + header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => navigate('/portal/trekking')}
            className="flex items-center gap-1.5 text-[11px] text-portal-muted hover:text-portal-accent transition-colors w-fit"
          >
            <i className="pi pi-arrow-left text-[10px]" /> Trekking
          </button>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-white tracking-tight">{trek.trekNumber}</h1>
            <span className="w-px h-4 bg-portal-border shrink-0" />
            <span className={`text-sm font-semibold ${STATUS_COLORS[trek.status]}`}>
              {STATUS_LABELS[trek.status]}
            </span>
          </div>
          <p className="text-xs text-portal-muted">{trek.regionName} · {trek.scheduledDate}</p>
          {isDeliveryLocked && (
            <p className="flex items-center gap-1.5 text-[11px] text-portal-muted italic mt-0.5">
              <i className="pi pi-info-circle shrink-0" />
              {isLocked
                ? <span>This trek is <span className={`font-medium not-italic ${STATUS_COLORS[trek.status]}`}>{STATUS_LABELS[trek.status]}</span> — no further changes can be made.</span>
                : <span>Delivery details can only be recorded once the trek is <span className="text-yellow-400 font-medium not-italic">In Progress</span>.</span>
              }
            </p>
          )}
        </div>

        {/* Right: edit + share + status actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {!isLocked && (
            <FlatButton variant="outline" size="sm" leftIcon="pi pi-pencil" onClick={() => setEditVisible(true)}>
              Edit
            </FlatButton>
          )}

          {/* Share dropdown */}
          <div className="relative" ref={shareRef}>
            <FlatButton
              variant="outline"
              size="sm"
              leftIcon="pi pi-share-alt"
              onClick={() => setShareOpen((p) => !p)}
              disabled={trek.status === 'Cancelled'}
            >
              Share
            </FlatButton>
            {shareOpen && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-portal-surface border border-portal-border rounded shadow-2xl z-50 overflow-hidden py-1">
                <button
                  type="button"
                  onClick={handleGenerateLink}
                  disabled={generatingLink}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-portal-text hover:bg-white/[0.06] hover:text-white transition-colors disabled:opacity-50"
                >
                  <i className="pi pi-link text-portal-accent text-[11px]" />
                  {generatingLink ? 'Generating...' : 'Copy Driver Link'}
                </button>
                <div className="border-t border-portal-border/60 mx-2" />
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-portal-text hover:bg-white/[0.06] hover:text-white transition-colors disabled:opacity-50"
                >
                  <i className="pi pi-file-pdf text-portal-accent text-[11px]" />
                  {downloadingPdf ? 'Downloading...' : 'Download PDF'}
                </button>
              </div>
            )}
          </div>

          {nextStatuses.map((s) => (
            <FlatButton
              key={s}
              variant={s === 'Cancelled' ? 'danger-outline' : s === 'Completed' ? 'primary' : 'outline'}
              size="sm"
              label={changingStatus === s ? 'Updating...' : (NEXT_LABELS[s] ?? s)}
              onClick={() => s === 'Completed' ? setConfirmComplete(true) : handleStatusChange(s)}
              loading={changingStatus === s}
              disabled={!!changingStatus}
            />
          ))}
        </div>
      </div>

      {/* ── Info cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Trekking Region', value: trek.regionName },
          { label: 'Driver',  value: trek.driverName },
          { label: 'Vehicle', value: trek.vehicleDisplayName },
          { label: 'Sales Staff', value: trek.salesStaffName || '—' },
          ...(trek.branchName ? [{ label: 'Branch', value: trek.branchName }] : []),
          { label: 'Date',    value: trek.scheduledDate },
        ].map(({ label, value }) => (
          <div key={label} className="bg-portal-surface border border-portal-border/60 rounded p-3">
            <p className="text-[10px] text-portal-muted uppercase tracking-wide mb-1">{label}</p>
            <p className="text-xs font-medium text-white">{value}</p>
          </div>
        ))}
      </div>

      {trek.notes && (
        <p className="text-[11px] text-portal-muted italic border-l-2 border-portal-border pl-3">{trek.notes}</p>
      )}

      {/* ── Stops ── */}
      <div className="bg-portal-surface border border-portal-border/60 rounded">
        <div className="flex items-center justify-between px-5 py-3 border-b border-portal-border/60">
          <span className="text-sm font-bold text-white">
            Stops
            <span className="text-portal-muted font-normal text-xs ml-2">({sortedStops.length})</span>
          </span>
          {!isLocked && (
            <FlatButton variant="primary" size="sm" leftIcon="pi pi-plus" onClick={() => setAddStopVisible(true)}>
              Add Stop
            </FlatButton>
          )}
        </div>

        {sortedStops.length === 0 ? (
          <div className="py-12 text-center text-portal-muted text-xs border-dashed border border-portal-border rounded m-4">
            No stops yet. Add the first customer stop to begin planning this trek.
          </div>
        ) : (
          <div className="divide-y divide-portal-border/40">
            {sortedStops.map((stop) => (
              <StopCard
                key={stop.stopId}
                stop={stop}
                isLocked={isLocked}
                isDeliveryLocked={isDeliveryLocked}
                deliveryRows={deliveryRows}
                updateRow={updateRow}
                onRecord={() => handleRecordStop(stop)}
                recording={recordingStop === stop.stopId}
                onEdit={() => setEditingStop(stop)}
                onRemove={() => setRemovingStop(stop)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <EditTrekModal
        visible={editVisible}
        onHide={() => setEditVisible(false)}
        trek={trek}
        onSuccess={(updated) => setTrek(updated)}
      />

      <AddStopModal
        visible={addStopVisible}
        onHide={() => setAddStopVisible(false)}
        trekId={trek.id}
        trekRegionId={trek.regionId}
        trekRegionName={trek.regionName}
        nextSequence={sortedStops.length + 1}
        onSuccess={loadTrek}
      />

      {editingStop && <AddStopModal
        visible
        onHide={() => setEditingStop(null)}
        trekId={trek.id}
        trekRegionId={trek.regionId}
        trekRegionName={trek.regionName}
        nextSequence={editingStop.sequence}
        stop={editingStop}
        onSuccess={() => loadTrek(true)}
      />}

      <FlatConfirmDialog
        visible={!!removingStop}
        onHide={() => setRemovingStop(null)}
        onConfirm={handleRemoveStop}
        title="Remove Delivery Stop"
        message={
          <span>
            Are you sure you want to remove Stop #{removingStop?.sequence} (
            <strong className="text-white">{removingStop?.customerName}</strong>)? Any delivery
            items planned for this stop will also be removed. This action cannot be undone.
          </span>
        }
        confirmLabel="Remove Stop"
        variant="danger"
      />

      <FlatConfirmDialog
        visible={confirmComplete}
        onHide={() => setConfirmComplete(false)}
        onConfirm={() => { setConfirmComplete(false); handleStatusChange('Completed'); }}
        title="Mark Trek as Completed"
        message="Once marked as Completed, all delivery records for this trek will be saved permanently and no further changes can be made. Are you sure you want to proceed?"
        confirmLabel="Mark Completed"
        variant="primary"
      />
    </div>
  );
};

// ── Stop card ──────────────────────────────────────────────────────────
interface StopCardProps {
  stop: TrekStop;
  isLocked: boolean;
  isDeliveryLocked: boolean;
  deliveryRows: Record<string, DeliveryRow>;
  updateRow: (stopProductId: string, field: keyof DeliveryRow, value: string) => void;
  onRecord: () => void;
  recording: boolean;
  onEdit: () => void;
  onRemove: () => void;
}

const InfoRow: React.FC<{ label: string; value?: string | null; mono?: boolean }> = ({ label, value, mono }) => {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-portal-border/30 last:border-0">
      <span className="text-[11px] text-portal-muted shrink-0">{label}</span>
      <span className={`text-[11px] text-white text-right ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
};

const StopCard: React.FC<StopCardProps> = ({
  stop, isLocked, isDeliveryLocked, deliveryRows, updateRow, onRecord, recording, onEdit, onRemove,
}) => {
  const hasProducts  = stop.products.length > 0;
  const isRecorded   = hasProducts && stop.products.every((p) => p.basicQtyDelivered != null || p.packagingQtyDelivered != null);
  const landmark     = stop.primaryLocationLandmark?.trim() || null;
  const street       = stop.primaryLocationStreet?.trim() || null;

  return (
    <div className="px-5 py-4 space-y-4">
      {/* Stop header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap min-w-0">
          <span className="shrink-0 text-[11px] font-bold text-portal-muted">{stop.sequence}.</span>
          <span className="text-sm font-semibold text-white">{stop.customerName}</span>
          <span className="w-px h-3.5 bg-portal-border shrink-0" />
          <span className="font-mono text-[11px] text-portal-muted">{stop.customerCode}</span>
          {isRecorded && (
            <>
              <span className="w-px h-3.5 bg-portal-border shrink-0" />
              <span className="text-[11px] text-portal-accent">Recorded</span>
            </>
          )}
          {stop.customerType && (
            <>
              <span className="w-px h-3.5 bg-portal-border shrink-0" />
              <span className="text-[11px] text-portal-muted">{stop.customerType.replace(/([A-Z])/g, ' $1').trim()}</span>
            </>
          )}
        </div>
        {!isLocked && (
          <div className="flex items-center gap-1 shrink-0">
            <button type="button" onClick={onEdit}
              className="text-portal-text hover:text-portal-accent transition-colors p-1 cursor-pointer"
              title="Edit stop" aria-label={`Edit stop ${stop.sequence}`}>
              <i className="pi pi-pencil text-xs" />
            </button>
            <button type="button" onClick={onRemove}
              className="text-red-accent hover:text-red-accent-hover transition-colors p-1 cursor-pointer"
              title="Remove stop" aria-label={`Remove stop ${stop.sequence}`}>
              <i className="pi pi-trash text-xs" />
            </button>
          </div>
        )}
      </div>

      {/* Info grid */}
      <div className="ml-10 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0 bg-portal-canvas/40 border border-portal-border/40 rounded px-4 py-2">
        <div>
          <p className="text-[10px] font-bold text-portal-muted uppercase tracking-wider pb-1 pt-1 mb-0.5">Location</p>
          <InfoRow label="Region"   value={stop.regionName} />
          <InfoRow label="District" value={stop.districtName} />
          <InfoRow label="Landmark" value={landmark} />
          <InfoRow label="Street"   value={street} />
        </div>
        <div>
          <p className="text-[10px] font-bold text-portal-muted uppercase tracking-wider pb-1 pt-1 mb-0.5">Contact</p>
          <InfoRow label="Customer Phone"   value={stop.customerPhone} mono />
          <InfoRow label="Primary Contact"  value={stop.primaryContactName} />
          <InfoRow label="Contact Phone"    value={stop.primaryContactPhone} mono />
          {stop.notes && <InfoRow label="Notes" value={stop.notes} />}
        </div>
      </div>

      {/* Products table */}
      {stop.products.length > 0 && (
        <div className="overflow-x-auto ml-0 sm:ml-10 border border-portal-border/60 bg-portal-canvas/30 rounded">
          <table className="min-w-[760px] w-full text-xs">
            <thead className="bg-portal-canvas border-b border-portal-border/60">
              <tr>
                <th className="text-left text-[10px] font-bold text-portal-muted uppercase tracking-wider py-2.5 px-3 whitespace-nowrap">Product</th>
                <th className="text-left text-[10px] font-bold text-portal-muted uppercase tracking-wider py-2.5 px-2.5 w-28 whitespace-nowrap">Planned</th>
                <th className="text-left text-[10px] font-bold text-portal-muted uppercase tracking-wider py-2.5 px-2.5 w-32 whitespace-nowrap">Qty Delivered</th>
                <th className="text-left text-[10px] font-bold text-portal-muted uppercase tracking-wider py-2.5 px-2.5 w-36 whitespace-nowrap">Payment</th>
                <th className="text-center text-[10px] font-bold text-portal-muted uppercase tracking-wider py-2.5 px-2.5 w-24 whitespace-nowrap">Amt Paid</th>
                <th className="text-center text-[10px] font-bold text-portal-muted uppercase tracking-wider py-2.5 px-2.5 w-24 whitespace-nowrap">Balance</th>
                <th className="text-left text-[10px] font-bold text-portal-muted uppercase tracking-wider py-2.5 px-3 whitespace-nowrap">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-portal-border/30">
              {stop.products.map((product) => {
                const row = deliveryRows[product.stopProductId] ?? {};
                const spId = product.stopProductId;

                return (
                  <tr key={product.productId} className="group">
                    <td className="py-2 pl-3 pr-4">
                      <span className="block font-medium text-white">{product.productName}</span>
                      <span className="block text-[11px] text-portal-muted">
                        GHS {Number(product.basicUnitPrice).toFixed(2)} / {product.basicUnitName || 'basic unit'}
                        {product.packagingUnitName && product.packagingUnitPrice != null &&
                          ` · GHS ${Number(product.packagingUnitPrice).toFixed(2)} / ${product.packagingUnitName}`}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="block font-mono text-portal-accent">{product.plannedBasicQuantity} {product.basicUnitName || 'basic units'}</span>
                      {product.packagingUnitName && <span className="block font-mono text-portal-accent">{product.plannedPackagingQuantity ?? 0} {product.packagingUnitName}</span>}
                    </td>
                    <td className="py-2 px-3">
                      <div className="space-y-1">
                        <FlatInputNumber id={`${spId}-basic`} min={0} maxFractionDigits={2} useGrouping={false} size="sm"
                          value={numberInputValue(row.basicQtyDelivered)} onChange={(value) => updateRow(spId, 'basicQtyDelivered', numberRowValue(value))}
                          disabled={isDeliveryLocked} placeholder={`Basic (${product.basicUnitName || 'units'})`} />
                        {product.packagingUnitName && (
                          <FlatInputNumber id={`${spId}-packaging`} min={0} maxFractionDigits={2} useGrouping={false} size="sm"
                            value={numberInputValue(row.packagingQtyDelivered)} onChange={(value) => updateRow(spId, 'packagingQtyDelivered', numberRowValue(value))}
                            disabled={isDeliveryLocked} placeholder={`Packaging (${product.packagingUnitName})`} />
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <FlatDropdown id={`${spId}-payment`} options={PAYMENT_OPTIONS} value={row.paymentMethod ?? ''}
                        onChange={(value) => updateRow(spId, 'paymentMethod', value ?? '')} disabled={isDeliveryLocked} size="sm" />
                    </td>
                    <td className="py-2 px-3">
                      <FlatInputNumber id={`${spId}-amt-paid`} min={0} maxFractionDigits={2} useGrouping={false} size="sm"
                        value={numberInputValue(row.amtPaid)} onChange={(value) => updateRow(spId, 'amtPaid', numberRowValue(value))}
                        disabled={isDeliveryLocked} placeholder="0.00" />
                    </td>
                    <td className="py-2 px-3">
                      <FlatInputNumber id={`${spId}-balance`} min={0} maxFractionDigits={2} useGrouping={false} size="sm"
                        value={numberInputValue(row.balance)} onChange={(value) => updateRow(spId, 'balance', numberRowValue(value))}
                        disabled={isDeliveryLocked} placeholder="0.00" />
                    </td>
                    <td className="py-2 pl-3 pr-3">
                      <FlatInputText id={`${spId}-notes`} value={row.notes ?? ''}
                        onChange={(e) => updateRow(spId, 'notes', e.target.value)}
                        disabled={isDeliveryLocked} placeholder="Optional note..." size="sm" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {hasProducts && (
            <div className="flex items-center justify-end px-3 py-3">
              {!isDeliveryLocked && (
                <FlatButton
                  variant={isRecorded ? 'outline' : 'primary'}
                  size="sm"
                  leftIcon={isRecorded ? 'pi pi-refresh' : 'pi pi-check'}
                  onClick={onRecord}
                  loading={recording}
                  disabled={recording}
                >
                  {recording ? 'Saving...' : isRecorded ? 'Update Deliveries' : 'Record Deliveries'}
                </FlatButton>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TrekDetailPage;
