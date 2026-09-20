import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { treksApi, type Trek, type TrekStop, type TrekStopProduct, type TrekStatus, type PaymentMethod, type TrekPriceDiffResponse, type DriverReturn, type RecordReturnPayload } from '../../../api-client';
import { FlatButton, FlatDropdown, FlatInputNumber, FlatInputText } from '../../../components/flat-form';
import { FlatConfirmDialog, FlatModal } from '../../../components/overlay';
import { FlatDataTable, resetTableData } from '../../../components/data-table';
import { EditTrekModal } from './components/EditTrekModal';
import { AddStopModal } from './components/AddStopModal';
import toast from 'react-hot-toast';
import { fmtGhs, parseNumericInput } from '../../../lib/utils';

// ── Constants ──────────────────────────────────────────────────────────
const STATUS_COLORS: Record<TrekStatus, string> = {
  Draft: 'text-portal-muted',
  Scheduled: 'text-blue-400',
  InProgress: 'text-yellow-400',
  Completed: 'text-portal-accent',
  Cancelled: 'text-red-400',
};

const STATUS_LABELS: Record<TrekStatus, string> = {
  Draft: 'Draft', Scheduled: 'Scheduled', InProgress: 'In Progress',
  Completed: 'Completed', Cancelled: 'Cancelled',
};

const NEXT_STATUSES: Partial<Record<TrekStatus, TrekStatus[]>> = {
  Draft: ['Scheduled', 'Cancelled'],
  Scheduled: ['InProgress', 'Cancelled'],
  InProgress: ['Completed'],
};

const NEXT_LABELS: Partial<Record<TrekStatus, string>> = {
  Scheduled: 'Mark Scheduled', InProgress: 'Start Trek',
  Completed: 'Mark Completed', Cancelled: 'Cancel Trek',
};

const PAYMENT_OPTIONS = [
  { label: '—', value: '' },
  { label: 'Cash', value: 'Cash' },
  { label: 'Mobile Money', value: 'MobileMoney' },
  { label: 'Credit', value: 'Credit' },
  { label: 'Cheque', value: 'Cheque' },
  { label: 'Bank Transfer', value: 'BankTransfer' },
];

const numberInputValue = (value?: string) => value ? parseNumericInput(value) : null;
const numberRowValue = (value: number | null) => value == null ? '' : String(value);

const calculateDeliveredAmount = (product: TrekStop['products'][number], row: Partial<DeliveryRow>) => {
  const basic = parseNumericInput(row.basicQtyDelivered);
  const packaging = parseNumericInput(row.packagingQtyDelivered);
  return (Number.isFinite(basic) ? basic : 0) * Number(product.basicUnitPrice || 0)
    + (Number.isFinite(packaging) ? packaging : 0) * Number(product.packagingUnitPrice || 0);
};

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
        amtPaid: p.amtPaid != null ? String(p.amtPaid) : '',
        balance: p.balance != null ? String(p.balance) : '',
        notes: p.notes ?? '',
      };
    });
  });
  return rows;
}

// ── Page ───────────────────────────────────────────────────────────────
export const TrekDetailPage: React.FC = () => {
  const { trekId } = useParams<{ trekId: string }>();
  const navigate = useNavigate();

  const [trek, setTrek] = useState<Trek | null>(null);
  const [loading, setLoading] = useState(true);
  const [deliveryRows, setDeliveryRows] = useState<Record<string, DeliveryRow>>({});
  const [recordingProduct, setRecordingProduct] = useState<string | null>(null);
  const [syncingPrices, setSyncingPrices] = useState(false);
  const [priceDiff, setPriceDiff] = useState<TrekPriceDiffResponse | null>(null);
  const [priceDiffVisible, setPriceDiffVisible] = useState(false);
  const [priceDiffExpanded, setPriceDiffExpanded] = useState(false);
  const [priceUpdateMenuOpen, setPriceUpdateMenuOpen] = useState(false);
  const [changingStatus, setChangingStatus] = useState<TrekStatus | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [openingDriverLink, setOpeningDriverLink] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);
  const [editVisible, setEditVisible] = useState(false);
  const [addStopVisible, setAddStopVisible] = useState(false);
  const [editingStop, setEditingStop] = useState<TrekStop | null>(null);
  const [removingStop, setRemovingStop] = useState<TrekStop | null>(null);
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [confirmStart, setConfirmStart] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);

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

  const handleRecordProduct = async (product: TrekStopProduct): Promise<boolean> => {
    if (!trek) return false;
    const row = deliveryRows[product.stopProductId] ?? {};
    const basic = row.basicQtyDelivered === '' ? null : parseNumericInput(row.basicQtyDelivered);
    const packaging = row.packagingQtyDelivered === '' ? null : parseNumericInput(row.packagingQtyDelivered);
    if (basic === null && packaging === null) {
      toast.error(`Enter a delivered quantity for "${product.productName}".`);
      return false;
    }
    if ((basic !== null && (!Number.isFinite(basic) || basic < 0)) ||
      (packaging !== null && (!product.packagingUnitName || !Number.isFinite(packaging) || packaging < 0))) {
      toast.error(`Enter valid delivered quantities for "${product.productName}".`);
      return false;
    }
    if (!row.paymentMethod) {
      toast.error(`Payment method is required for "${product.productName}".`);
      return false;
    }

    setRecordingProduct(product.stopProductId);
    try {
      await treksApi.recordDelivery(trek.id, {
        products: [{
          stopProductId: product.stopProductId,
          basicQtyDelivered: basic ?? undefined,
          packagingQtyDelivered: product.packagingUnitName && packaging !== null ? packaging : undefined,
          paymentMethod: row.paymentMethod as PaymentMethod,
          ...(row.amtPaid !== '' && row.amtPaid != null
            ? { amtPaid: parseNumericInput(row.amtPaid), balance: Math.max(0, calculateDeliveredAmount(product, row) - parseNumericInput(row.amtPaid)) }
            : {}),
          notes: row.notes || undefined,
        }],
      });
      resetTableData();
      toast.success(`${product.productName} delivery saved.`);
      await loadTrek(true);
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to save delivery.');
      return false;
    } finally {
      setRecordingProduct(null);
    }
  };

  const handleRecordReturn = async (stop: TrekStop, payload: RecordReturnPayload): Promise<boolean> => {
    if (!trek) return false;
    try {
      await treksApi.recordReturn(trek.id, stop.stopId, payload);
      resetTableData();
      await loadTrek(true);
      toast.success('Return saved.');
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to save return.');
      return false;
    }
  };

  const handleVoidReturn = async (stop: TrekStop, item: DriverReturn): Promise<boolean> => {
    if (!trek) return false;
    try {
      await treksApi.voidReturn(trek.id, stop.stopId, item.returnId);
      resetTableData();
      await loadTrek(true);
      toast.success('Return removed.');
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to remove return.');
      return false;
    }
  };

  const handleStatusChange = async (status: TrekStatus) => {
    if (!trek) return;
    setChangingStatus(status);
    try {
      await treksApi.changeStatus(trek.id, status);
      resetTableData();
      await loadTrek(true);
      toast.success(status === 'InProgress'
        ? 'Trek started.'
        : `Trek ${STATUS_LABELS[status].toLowerCase()}.`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update status.');
    } finally {
      setChangingStatus(null);
    }
  };

  const handleResendEmail = async () => {
    if (!trek) return;
    const staffIds = [trek.driverStaffId, trek.salesStaffId].filter((id): id is string => Boolean(id));
    if (!staffIds.length) return;
    setResendingEmail(true);
    setShareOpen(false);
    try {
      await treksApi.sendEmail(trek.id, staffIds);
      toast.success('Trek sheet and driver link resent.');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to resend trek email.');
    } finally {
      setResendingEmail(false);
    }
  };

  const handleGenerateLink = async () => {
    if (!trek) return;
    setGeneratingLink(true);
    setShareOpen(false);
    try {
      const result = await treksApi.generateLink(trek.id);
      await navigator.clipboard.writeText(result.url).catch(() => { });
      toast.success('Driver link copied to clipboard.');
    } catch {
      toast.error('Failed to generate link.');
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleOpenDriverLink = async () => {
    if (!trek) return;
    setOpeningDriverLink(true);
    setShareOpen(false);
    try {
      const result = await treksApi.generateLink(trek.id);
      const opened = window.open(result.url, '_blank', 'noopener,noreferrer');
      if (!opened) window.location.assign(result.url);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to open driver link.');
    } finally {
      setOpeningDriverLink(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!trek) return;
    setDownloadingPdf(true);
    setShareOpen(false);
    try {
      const blob = await treksApi.downloadPdf(trek.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TrekkingSheet-${trek.trekNumber}-${trek.scheduledDate}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download PDF.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleSyncPrices = async () => {
    if (!trek) return;
    setSyncingPrices(true);
    try {
      const result = await treksApi.getPriceDiff(trek.id);
      if (!result.syncRequired || result.differences.length === 0) {
        toast.success('Prices are already up to date.');
        await loadTrek(true);
        return;
      }
      setPriceDiff(result);
      setPriceUpdateMenuOpen(true);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to check trek prices.');
    } finally {
      setSyncingPrices(false);
    }
  };

  const handleViewPriceChanges = () => {
    setPriceUpdateMenuOpen(false);
    setPriceDiffExpanded(true);
    setPriceDiffVisible(true);
  };

  const confirmSyncPrices = async () => {
    if (!trek) return;
    setSyncingPrices(true);
    try {
      const result = await treksApi.syncPrices(trek.id);
      setPriceUpdateMenuOpen(false);
      setPriceDiffVisible(false);
      setPriceDiff(null);
      setPriceDiffExpanded(false);
      await loadTrek(true);
      resetTableData();
      toast.success(result.productsUpdated > 0
        ? `${result.productsUpdated} product price${result.productsUpdated === 1 ? '' : 's'} updated.`
        : 'Prices are already up to date.');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to sync trek prices.');
    } finally {
      setSyncingPrices(false);
    }
  };

  const handleRemoveStop = async () => {
    if (!trek || !removingStop) return;
    if (trek.status === 'InProgress') {
      toast.error('Stops cannot be changed while the trek is in progress.');
      setRemovingStop(null);
      return;
    }
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

  const isLocked = trek?.status === 'Completed' || trek?.status === 'Cancelled';
  const isStructureLocked = isLocked || trek?.status === 'InProgress';
  const isDeliveryLocked = trek?.status !== 'InProgress';
  const nextStatuses = trek ? (NEXT_STATUSES[trek.status] ?? []) : [];
  const sortedStops = trek ? [...trek.stops].sort((a, b) => b.sequence - a.sequence) : [];

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
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-white tracking-tight">{trek.trekNumber}</h1>
            <span className="w-px h-4 bg-portal-border shrink-0" />
            <span className={`text-sm font-semibold ${STATUS_COLORS[trek.status]}`}>
              {STATUS_LABELS[trek.status]}
            </span>
          </div>
          {isLocked && (
            <p className="flex items-center gap-1.5 text-[11px] text-portal-muted italic mt-0.5">
              <i className="pi pi-info-circle shrink-0" />
              <span>This trek is <span className={`font-medium not-italic ${STATUS_COLORS[trek.status]}`}>{STATUS_LABELS[trek.status]}</span> — no further changes can be made.</span>
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

          {!isLocked && trek.syncRequired && (
            <div className="relative inline-flex">
              <FlatButton
                variant="outline"
                size="sm"
                leftIcon="pi pi-refresh"
                onClick={handleSyncPrices}
                loading={syncingPrices}
                disabled={syncingPrices}
              >
                Update available
              </FlatButton>
              <span
                className="absolute -right-1.5 -top-1.5 z-10 flex h-4 w-4 rotate-45 items-center justify-center rounded-[2px] border border-amber-200/90 bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 text-amber-950 shadow-lg shadow-amber-400/40"
                aria-label="Product updates available"
                title="Product updates available"
              >
                <span className="-rotate-45 text-[11px] font-bold leading-none" aria-hidden="true">!</span>
              </span>
              {priceUpdateMenuOpen && priceDiff && (
                <div className="absolute right-0 top-full z-[100] mt-2 w-72 rounded border border-portal-border bg-portal-surface p-3 shadow-xl">
                  <p className="text-[11px] leading-relaxed text-portal-orange">These trek products were created before the latest catalogue update.</p>
                  <div className="mt-3 flex items-center justify-end gap-2">
                    <FlatButton size="sm" variant="outline" onClick={handleViewPriceChanges}>View updates</FlatButton>
                    <FlatButton size="sm" variant="primary" onClick={confirmSyncPrices} loading={syncingPrices} disabled={syncingPrices}>Sync update</FlatButton>
                  </div>
                </div>
              )}
            </div>
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
                <button
                  type="button"
                  onClick={handleOpenDriverLink}
                  disabled={openingDriverLink}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-portal-text hover:bg-white/[0.06] hover:text-white transition-colors disabled:opacity-50"
                >
                  <i className="pi pi-external-link text-portal-accent text-[11px]" />
                  {openingDriverLink ? 'Opening...' : 'Open Driver Link'}
                </button>
                <div className="border-t border-portal-border/60 mx-2" />
                {trek.status === 'InProgress' && (
                  <button
                    type="button"
                    onClick={handleResendEmail}
                    disabled={resendingEmail}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-portal-text hover:bg-white/[0.06] hover:text-white transition-colors disabled:opacity-50"
                  >
                    <i className="pi pi-envelope text-portal-accent text-[11px]" />
                    {resendingEmail ? 'Sending...' : 'Resend Sheet & Link'}
                  </button>
                )}
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
              onClick={() => s === 'Completed' ? setConfirmComplete(true) : s === 'InProgress' ? setConfirmStart(true) : handleStatusChange(s)}
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
          { label: 'Driver', value: trek.driverName },
          { label: 'Vehicle', value: trek.vehicleDisplayName },
          { label: 'Sales Staff', value: trek.salesStaffName || '—' },
          ...(trek.branchName ? [{ label: 'Branch', value: trek.branchName }] : []),
          { label: 'Date', value: trek.scheduledDate },
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
          {!isStructureLocked && (
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
                isLocked={isStructureLocked}
                isDeliveryLocked={isDeliveryLocked}
                deliveryRows={deliveryRows}
                updateRow={updateRow}
            onRecordProduct={handleRecordProduct}
            onRecordReturn={handleRecordReturn}
            onVoidReturn={handleVoidReturn}
                recordingProduct={recordingProduct}
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
        visible={addStopVisible && !isStructureLocked}
        onHide={() => setAddStopVisible(false)}
        trekId={trek.id}
        trekRegionId={trek.regionId}
        trekRegionName={trek.regionName}
        nextSequence={sortedStops.length + 1}
        onSuccess={loadTrek}
      />

      {editingStop && !isStructureLocked && <AddStopModal
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
        visible={confirmStart}
        onHide={() => setConfirmStart(false)}
        onConfirm={() => { setConfirmStart(false); return handleStatusChange('InProgress'); }}
        title="Start Trek"
        message="This will mark the trek as In Progress."
        confirmLabel="Start Trek"
        variant="primary"
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

      <FlatConfirmDialog
        visible={priceDiffVisible}
        onHide={() => { if (!syncingPrices) { setPriceDiffVisible(false); setPriceDiff(null); } }}
        onConfirm={confirmSyncPrices}
        title="Product Updates Available"
        showIcon={false}
        size="lg"
        message={
          <div className="space-y-2.5 lg:min-h-[26rem]">
            {!priceDiffExpanded ? (
              <p className="text-portal-orange">These trek products were created before the latest catalog update. You can view the changes or update the catalogue now.</p>
            ) : (
              <div className="h-64 overflow-y-auto pr-1 lg:h-[28rem]">
                <div className="grid grid-cols-3 overflow-hidden rounded border border-portal-border/40 text-[11px]">
                  <div className="bg-portal-canvas/70">
                    <div className="px-2.5 py-2 text-[10px] font-medium uppercase tracking-wide text-portal-muted">Product</div>
                    {priceDiff?.differences.map((difference) => (
                      <div key={difference.stopProductId} className="min-h-14 border-b border-portal-border/40 px-2.5 py-2 last:border-b-0">
                        <p className="text-portal-text font-medium leading-snug">{difference.productName}</p>
                        {(difference.packagingAdded || difference.packagingRemoved) && (
                          <p className="text-[10px] text-amber-300 mt-1">{difference.packagingAdded ? 'Packaging added' : 'Packaging removed'}</p>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="bg-portal-surface/80 text-portal-text">
                    <div className="px-2.5 py-2 text-[10px] font-medium uppercase tracking-wide text-portal-muted">On trek</div>
                    {priceDiff?.differences.map((difference) => (
                      <div key={difference.stopProductId} className="min-h-14 border-b border-portal-border/40 px-2.5 py-2 space-y-0.5 last:border-b-0">
                        <p>Basic · {fmtGhs(difference.snapshotBasicUnitPrice)}</p>
                        <p>Packaging · {difference.snapshotPackagingUnitPrice == null ? '—' : fmtGhs(difference.snapshotPackagingUnitPrice)}</p>
                      </div>
                    ))}
                  </div>
                  <div className="bg-portal-card/70">
                    <div className="px-2.5 py-2 text-[10px] font-medium uppercase tracking-wide text-portal-muted">Current catalog</div>
                    {priceDiff?.differences.map((difference) => (
                      <div key={difference.stopProductId} className="min-h-14 border-b border-portal-border/40 px-2.5 py-2 space-y-0.5 last:border-b-0">
                        <p className="text-portal-text">Basic · {fmtGhs(difference.catalogBasicUnitPrice)}</p>
                        <p className="text-portal-text">Packaging · {difference.catalogPackagingUnitPrice == null ? '—' : fmtGhs(difference.catalogPackagingUnitPrice)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <p className="text-portal-muted">Syncing updates the trek prices and recalculates planned totals.</p>
          </div>
        }
        cancelLabel="Close"
        secondaryActionLabel={!priceDiffExpanded ? 'View changes' : undefined}
        onSecondaryAction={!priceDiffExpanded ? () => setPriceDiffExpanded(true) : undefined}
        confirmLabel="Sync update"
        variant="primary"
        loading={syncingPrices}
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
  onRecordProduct: (product: TrekStopProduct) => Promise<boolean>;
  onRecordReturn: (stop: TrekStop, payload: RecordReturnPayload) => Promise<boolean>;
  onVoidReturn: (stop: TrekStop, item: DriverReturn) => Promise<boolean>;
  recordingProduct: string | null;
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
  stop, isLocked, isDeliveryLocked, deliveryRows, updateRow, onRecordProduct, onRecordReturn, onVoidReturn, recordingProduct, onEdit, onRemove,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [activeStopTab, setActiveStopTab] = useState<'products' | 'details' | 'returns'>('products');
  const [editingProduct, setEditingProduct] = useState<TrekStopProduct | null>(null);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnProductId, setReturnProductId] = useState('');
  const [returnBasicQty, setReturnBasicQty] = useState('');
  const [returnPackagingQty, setReturnPackagingQty] = useState('');
  const [returnMethod, setReturnMethod] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [savingReturn, setSavingReturn] = useState(false);
  const [voidingReturn, setVoidingReturn] = useState<DriverReturn | null>(null);
  const isRecorded = stop.products.length > 0 && stop.products.every((p) => p.basicQtyDelivered != null || p.packagingQtyDelivered != null);
  const landmark = stop.primaryLocationLandmark?.trim() || null;
  const street = stop.primaryLocationStreet?.trim() || null;
  const selectedReturnProduct = stop.products.find((product) => product.productId === returnProductId);
  const returnTotal = selectedReturnProduct
    ? parseNumericInput(returnBasicQty) * Number(selectedReturnProduct.basicUnitPrice || 0)
      + parseNumericInput(returnPackagingQty) * Number(selectedReturnProduct.packagingUnitPrice || 0)
    : 0;
  const resetReturnForm = () => {
    setReturnProductId(''); setReturnBasicQty(''); setReturnPackagingQty('');
    setReturnMethod(''); setReturnReason('');
  };

  return (
    <div className="px-4 py-3 sm:px-5 sm:py-4">
      {/* Stop header */}
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-label={`${expanded ? 'Collapse' : 'Expand'} products for ${stop.customerName}`}
          title={`${expanded ? 'Collapse' : 'Expand'} products`}
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
        >
          <i className={`pi ${expanded ? 'pi-chevron-down' : 'pi-chevron-right'} shrink-0 text-[10px] text-portal-muted`} aria-hidden="true" />
          <span className="shrink-0 text-[11px] font-bold text-portal-muted">{stop.sequence}.</span>
          <span className="truncate text-sm font-semibold text-white">{stop.customerName}</span>
          <span className="hidden w-px h-3.5 bg-portal-border shrink-0 sm:block" />
          <span className="hidden font-mono text-[11px] text-portal-muted sm:inline">{stop.customerCode}</span>
          {isRecorded && <span className="shrink-0 text-[11px] text-portal-accent">Recorded</span>}
          {stop.customerType && <span className="hidden text-[11px] text-portal-muted md:inline">{stop.customerType.replace(/([A-Z])/g, ' $1').trim()}</span>}
        </button>
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

      {stop.products.length > 0 && (
        <div
          aria-hidden={expanded}
          className={`grid transition-[grid-template-rows] duration-300 ease-out ${expanded ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="ml-8 mt-3 divide-y divide-portal-border/30 sm:ml-10">
              {stop.products.map((product) => {
                const quantities = [
                  product.packagingUnitName && Number(product.plannedPackagingQuantity || 0) > 0
                    ? `${product.plannedPackagingQuantity} ${product.packagingUnitName}` : null,
                  Number(product.plannedBasicQuantity || 0) > 0
                    ? `${product.plannedBasicQuantity} ${product.basicUnitName || 'basic units'}` : null,
                ].filter(Boolean).join(' · ');
                return (
                  <button
                    key={product.stopProductId}
                    type="button"
                    disabled={expanded}
                    onClick={() => { setActiveStopTab('products'); setExpanded(true); }}
                    aria-label={`View ${product.productName} in ${stop.customerName} products`}
                    className="group flex w-full cursor-pointer flex-wrap gap-x-1.5 py-1.5 text-left text-[11px] first:pt-0 last:pb-0"
                  >
                    <span className="text-portal-text transition-colors group-hover:text-portal-accent">{product.productName}</span>
                    {quantities && <span className="text-portal-muted">· {quantities}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="min-h-0 overflow-hidden">
      <div className="mt-4 space-y-4">
      <div className="ml-10 flex items-center gap-1 border-b border-portal-border/50" role="tablist" aria-label={`${stop.customerName} sections`}>
        <button type="button" role="tab" aria-selected={activeStopTab === 'products'} onClick={() => setActiveStopTab('products')} className={`border-b-2 px-3 py-2 text-xs font-medium transition-colors ${activeStopTab === 'products' ? 'border-portal-accent text-portal-accent' : 'border-transparent text-portal-muted hover:text-portal-text'}`}>Products</button>
        <button type="button" role="tab" aria-selected={activeStopTab === 'details'} onClick={() => setActiveStopTab('details')} className={`border-b-2 px-3 py-2 text-xs font-medium transition-colors ${activeStopTab === 'details' ? 'border-portal-accent text-portal-accent' : 'border-transparent text-portal-muted hover:text-portal-text'}`}>Customer details</button>
        <button type="button" role="tab" aria-selected={activeStopTab === 'returns'} onClick={() => setActiveStopTab('returns')} className={`border-b-2 px-3 py-2 text-xs font-medium transition-colors ${activeStopTab === 'returns' ? 'border-portal-accent text-portal-accent' : 'border-transparent text-portal-muted hover:text-portal-text'}`}>Returns{stop.returns?.length ? ` (${stop.returns.length})` : ''}</button>
      </div>
      {/* Info grid */}
      {activeStopTab === 'details' && <div className="ml-10 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0 bg-portal-canvas/40 border border-portal-border/40 rounded px-4 py-2">
              <div>
                <p className="text-[10px] font-bold text-portal-muted uppercase tracking-wider pb-1 pt-1 mb-0.5">Location</p>
                <InfoRow label="Region" value={stop.regionName} />
                <InfoRow label="District" value={stop.districtName} />
                <InfoRow label="Landmark" value={landmark} />
                <InfoRow label="Street" value={street} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-portal-muted uppercase tracking-wider pb-1 pt-1 mb-0.5">Contact</p>
                <InfoRow label="Customer Phone" value={stop.customerPhone} mono />
                <InfoRow label="Primary Contact" value={stop.primaryContactName} />
                <InfoRow label="Contact Phone" value={stop.primaryContactPhone} mono />
                {stop.notes && <InfoRow label="Notes" value={stop.notes} />}
              </div>
            </div>}

            {activeStopTab === 'returns' && (
              <div className="ml-0 sm:ml-10">
                <div className="mb-3 flex justify-end">
                  <FlatButton size="sm" variant="outline" leftIcon="pi pi-plus" disabled={isLocked} onClick={() => setReturnModalOpen(true)}>Record return</FlatButton>
                </div>
                <FlatDataTable
                  data={[...(stop.returns ?? [])].sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())}
                  enablePaginator={false}
                  enableTableFilter={false}
                  emptyDataText="No returns recorded for this stop."
                  columns={[
                    { field: 'productName', header: 'Product', body: (item) => <span className="text-xs text-portal-text">{item.productName}</span> },
                    { field: 'quantities', header: 'Returned', body: (item) => <span className="text-xs text-portal-text">{item.packagingQtyReturned ? `${item.packagingQtyReturned} ${item.packagingUnitName} · ` : ''}{item.basicQtyReturned} {item.basicUnitName}</span> },
                    { field: 'refundAmount', header: 'Refund', body: (item) => <span className="text-xs text-portal-text">{fmtGhs(item.refundAmount)}</span> },
                    { field: 'refundMethod', header: 'Method', body: (item) => <span className="text-xs text-portal-text">{item.refundMethod || '—'}</span> },
                    { field: 'reason', header: 'Reason', body: (item) => <span className="text-[11px] text-portal-muted">{item.reason || '—'}</span> },
                    { field: 'recordedAt', header: 'Recorded', body: (item) => <span className="text-[11px] text-portal-muted">{item.recordedAt ? new Date(item.recordedAt).toLocaleString() : '—'}</span> },
                    { field: 'actions', header: 'Action', body: (item) => <button type="button" className="inline-flex h-7 w-7 items-center justify-center rounded text-portal-muted hover:bg-red-400/10 hover:text-red-300" title="Remove return" aria-label="Remove return" disabled={isLocked} onClick={() => setVoidingReturn(item)}><i className="pi pi-trash text-xs" /></button> },
                  ]}
                />
              </div>
            )}

            {/* Products table */}
            {activeStopTab === 'products' && stop.products.length > 0 && (
              <div className="ml-0 sm:ml-10">
                <FlatDataTable
                  data={stop.products}
                  enablePaginator={false}
                  enableTableFilter={false}
                  emptyDataText="No products recorded for this stop."
                  columns={[
                    { field: 'productName', header: 'Product', body: (product) => <><span className="block text-xs font-semibold text-portal-text">{product.productName}</span><span className="mt-1.5 block text-[11px] font-normal text-portal-muted">{fmtGhs(Number(product.basicUnitPrice))} / {product.basicUnitName || 'basic unit'}{product.packagingUnitName && product.packagingUnitPrice != null ? ` · ${fmtGhs(Number(product.packagingUnitPrice))} / ${product.packagingUnitName}` : ''}</span></> },
                    { field: 'planned', header: 'Planned', body: (product) => <><span className="text-xs text-portal-text">{product.packagingUnitName && Number(product.plannedPackagingQuantity || 0) > 0 ? `${product.plannedPackagingQuantity} ${product.packagingUnitName} · ` : ''}{product.plannedBasicQuantity} {product.basicUnitName || 'basic units'}</span><span className="mt-1 block text-[10px] text-portal-muted">Due · {fmtGhs(Number(product.amountDue ?? 0))}</span></> },
                    { field: 'delivered', header: 'Qty Delivered', body: (product) => { const row = deliveryRows[product.stopProductId] ?? {}; return <span className="text-xs text-portal-text">{row.packagingQtyDelivered && parseNumericInput(row.packagingQtyDelivered) > 0 ? `${row.packagingQtyDelivered} ${product.packagingUnitName} · ` : ''}{row.basicQtyDelivered && parseNumericInput(row.basicQtyDelivered) > 0 ? `${row.basicQtyDelivered} ${product.basicUnitName || 'basic units'}` : '—'}</span>; } },
                    { field: 'paymentMethod', header: 'Payment', body: (product) => <span className="text-xs text-portal-text">{PAYMENT_OPTIONS.find((option) => option.value === (deliveryRows[product.stopProductId] ?? {}).paymentMethod)?.label || '—'}</span> },
                    { field: 'total', header: 'Total', body: (product) => <span className="text-xs text-portal-accent">{fmtGhs(calculateDeliveredAmount(product, deliveryRows[product.stopProductId] ?? {}))}</span> },
                    { field: 'actions', header: 'Record', body: (product) => <button type="button" className="inline-flex h-7 w-7 items-center justify-center rounded text-portal-muted hover:bg-white/[0.08] hover:text-portal-accent disabled:opacity-40" title="Record delivery" aria-label={`Record ${product.productName} delivery`} disabled={isDeliveryLocked} onClick={() => setEditingProduct(product)}><i className="pi pi-pencil text-xs" /></button> },
                  ]}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {editingProduct && (() => {
        const editingRow = deliveryRows[editingProduct.stopProductId] ?? {
          basicQtyDelivered: '', packagingQtyDelivered: '', paymentMethod: '', amtPaid: '', balance: '', notes: '',
        };
        const deliveredAmount = calculateDeliveredAmount(editingProduct, editingRow);
        const paid = editingRow.amtPaid === '' ? null : Number(editingRow.amtPaid);
        const balance = paid == null || !Number.isFinite(paid) ? 0 : Math.max(0, deliveredAmount - paid);
        const plannedAmount = Number(editingProduct.amountDue ?? (Number(editingProduct.plannedBasicQuantity || 0) * Number(editingProduct.basicUnitPrice || 0) + Number(editingProduct.plannedPackagingQuantity || 0) * Number(editingProduct.packagingUnitPrice || 0)));
        const savingProduct = recordingProduct === editingProduct.stopProductId;
        return (
          <FlatModal
            visible
            onHide={() => setEditingProduct(null)}
            title={`Record ${editingProduct.productName}`}
            subtitle="Delivery, payment and notes"
            size="md"
            footer={(
              <div className="flex items-center justify-end gap-2">
                <FlatButton variant="outline" size="sm" onClick={() => setEditingProduct(null)}>Cancel</FlatButton>
                <FlatButton size="sm" onClick={async () => { const saved = await onRecordProduct(editingProduct); if (saved) setEditingProduct(null); }} loading={savingProduct} disabled={savingProduct || isDeliveryLocked}>Save changes</FlatButton>
              </div>
            )}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 rounded border border-portal-border/50 bg-portal-canvas/50 px-3 py-2">
                <div><span className="block text-[10px] uppercase tracking-wider text-portal-muted">Planned</span><span className="text-xs text-portal-text">{editingProduct.plannedBasicQuantity} {editingProduct.basicUnitName || 'basic units'}{editingProduct.packagingUnitName ? ` · ${editingProduct.plannedPackagingQuantity ?? 0} ${editingProduct.packagingUnitName}` : ''}</span></div>
                <div><span className="block text-[10px] uppercase tracking-wider text-portal-muted">Due</span><span className="text-xs text-portal-accent">{fmtGhs(plannedAmount)}</span></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FlatInputNumber id={`${editingProduct.stopProductId}-basic-modal`} label={`${editingProduct.basicUnitName || 'Basic'} delivered`} min={0} maxFractionDigits={2} useGrouping size="md" value={numberInputValue(editingRow.basicQtyDelivered)} onChange={(value) => updateRow(editingProduct.stopProductId, 'basicQtyDelivered', numberRowValue(value))} onInput={(event) => updateRow(editingProduct.stopProductId, 'basicQtyDelivered', (event.target as HTMLInputElement).value)} disabled={isDeliveryLocked} />
                {editingProduct.packagingUnitName && <FlatInputNumber id={`${editingProduct.stopProductId}-packaging-modal`} label={`${editingProduct.packagingUnitName} delivered`} min={0} maxFractionDigits={2} useGrouping size="md" value={numberInputValue(editingRow.packagingQtyDelivered)} onChange={(value) => updateRow(editingProduct.stopProductId, 'packagingQtyDelivered', numberRowValue(value))} onInput={(event) => updateRow(editingProduct.stopProductId, 'packagingQtyDelivered', (event.target as HTMLInputElement).value)} disabled={isDeliveryLocked} />}
                <FlatDropdown id={`${editingProduct.stopProductId}-payment-modal`} label="Payment method" options={PAYMENT_OPTIONS} value={editingRow.paymentMethod} onChange={(value) => updateRow(editingProduct.stopProductId, 'paymentMethod', value ?? '')} disabled={isDeliveryLocked} size="md" />
                <FlatInputNumber id={`${editingProduct.stopProductId}-amt-paid-modal`} label="Amount paid (optional)" min={0} maxFractionDigits={2} useGrouping size="md" value={numberInputValue(editingRow.amtPaid)} onChange={(value) => updateRow(editingProduct.stopProductId, 'amtPaid', numberRowValue(value))} disabled={isDeliveryLocked} />
              </div>
              <div className="grid grid-cols-2 gap-3 rounded border border-portal-border/50 bg-portal-surface px-3 py-2">
                <div><span className="block text-[10px] uppercase tracking-wider text-portal-muted">Calculated total</span><span className="text-sm font-semibold text-portal-accent">{fmtGhs(deliveredAmount)}</span></div>
                <div><span className="block text-[10px] uppercase tracking-wider text-portal-muted">Balance</span><span className="text-sm font-semibold text-portal-text">{fmtGhs(balance)}</span></div>
              </div>
              <FlatInputText id={`${editingProduct.stopProductId}-notes-modal`} label="Delivery note" value={editingRow.notes} onChange={(event) => updateRow(editingProduct.stopProductId, 'notes', event.target.value)} placeholder="Optional delivery note..." size="md" />
              <p className="text-[11px] text-portal-muted">Leave amount paid empty when the customer pays the full calculated total.</p>
            </div>
          </FlatModal>
        );
      })()}

      <FlatModal
        visible={returnModalOpen}
        onHide={() => { if (!savingReturn) { setReturnModalOpen(false); resetReturnForm(); } }}
        title="Record return"
        subtitle="Log products returned at this stop"
        size="md"
        footer={<div className="flex justify-end gap-2"><FlatButton variant="outline" size="sm" onClick={() => { setReturnModalOpen(false); resetReturnForm(); }} disabled={savingReturn}>Cancel</FlatButton><FlatButton size="sm" loading={savingReturn} disabled={savingReturn || returnTotal <= 0} onClick={async () => {
          if (!selectedReturnProduct || !returnBasicQty || parseNumericInput(returnBasicQty) <= 0) { toast.error('Select a product and enter a positive basic quantity.'); return; }
          if (returnTotal <= 0) { toast.error('The calculated refund must be greater than zero.'); return; }
          setSavingReturn(true);
          const saved = await onRecordReturn(stop, { productId: selectedReturnProduct.productId, basicQtyReturned: parseNumericInput(returnBasicQty), ...(returnPackagingQty && { packagingQtyReturned: parseNumericInput(returnPackagingQty) }), refundAmount: returnTotal, ...(returnMethod && { refundMethod: returnMethod as PaymentMethod }), ...(returnReason.trim() ? { reason: returnReason.trim() } : {}) });
          setSavingReturn(false);
          if (saved) { setReturnModalOpen(false); resetReturnForm(); }
        }}>Save return</FlatButton></div>}
      >
        <div className="space-y-3">
          <FlatDropdown id={`${stop.stopId}-return-product`} label="Product" options={stop.products.map((product) => ({ label: product.productName, value: product.productId }))} value={returnProductId} onChange={(value) => { setReturnProductId(value ?? ''); setReturnBasicQty(''); setReturnPackagingQty(''); }} size="md" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FlatInputNumber id={`${stop.stopId}-return-basic`} label={`${selectedReturnProduct?.basicUnitName || 'Basic'} quantity`} min={0} maxFractionDigits={2} useGrouping size="md" value={numberInputValue(returnBasicQty)} onChange={(value) => setReturnBasicQty(numberRowValue(value))} onInput={(event) => setReturnBasicQty((event.target as HTMLInputElement).value)} />
            {selectedReturnProduct?.packagingUnitName && <FlatInputNumber id={`${stop.stopId}-return-packaging`} label={`${selectedReturnProduct.packagingUnitName} quantity`} min={0} maxFractionDigits={2} useGrouping size="md" value={numberInputValue(returnPackagingQty)} onChange={(value) => setReturnPackagingQty(numberRowValue(value))} onInput={(event) => setReturnPackagingQty((event.target as HTMLInputElement).value)} />}
            <FlatDropdown id={`${stop.stopId}-return-method`} label="Refund method" options={PAYMENT_OPTIONS} value={returnMethod} onChange={(value) => setReturnMethod(value ?? '')} size="md" />
          </div>
          <div className="rounded border border-portal-border/50 bg-portal-canvas/50 px-3 py-2"><span className="text-[10px] uppercase tracking-wider text-portal-muted">Calculated refund</span><span className="ml-2 text-sm font-semibold text-portal-accent">{fmtGhs(returnTotal)}</span></div>
          <FlatInputText id={`${stop.stopId}-return-reason`} label="Reason" value={returnReason} onChange={(event) => setReturnReason(event.target.value)} placeholder="Optional reason..." size="md" />
          <p className="text-[11px] text-portal-muted">Refunds are calculated automatically from the returned quantities and snapshotted prices.</p>
        </div>
      </FlatModal>

      <FlatConfirmDialog
        visible={Boolean(voidingReturn)}
        title="Remove return?"
        message="This will remove the selected return from this stop."
        onHide={() => setVoidingReturn(null)}
        onConfirm={async () => { if (!voidingReturn) return; const saved = await onVoidReturn(stop, voidingReturn); if (saved) setVoidingReturn(null); }}
        confirmLabel="Remove"
      />

    </div>
  );
};

export default TrekDetailPage;
