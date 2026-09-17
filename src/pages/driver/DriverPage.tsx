import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FlatButton, FlatDropdown, FlatInputNumber, FlatInputText } from '../../components/flat-form';
import { resetTableData } from '../../components/data-table';
import {
  treksApi,
  type DriverTrek,
  type DriverStop,
  type PaymentMethod,
  type RecordDeliveryPayload,
} from '../../api-client';
import { baseURL } from '../../api-client/api';

type DeliveryRow = {
  basicQtyDelivered: string;
  packagingQtyDelivered: string;
  paymentMethod: string;
  amtPaid: string;
  balance: string;
  notes: string;
};

const PAYMENT_OPTIONS = [
  { label: 'Select method...', value: '' },
  { label: 'Cash',             value: 'Cash' },
  { label: 'Mobile Money',     value: 'MobileMoney' },
  { label: 'Credit',           value: 'Credit' },
  { label: 'Cheque',           value: 'Cheque' },
  { label: 'Bank Transfer',    value: 'BankTransfer' },
];

const STATUS_STYLES: Record<string, string> = {
  Draft:      'text-portal-muted',
  Scheduled:  'text-blue-400',
  InProgress: 'text-yellow-400',
  Completed:  'text-portal-accent',
  Cancelled:  'text-red-400',
};

const STATUS_LABELS: Record<string, string> = {
  Draft: 'Draft', Scheduled: 'Scheduled', InProgress: 'In Progress',
  Completed: 'Completed', Cancelled: 'Cancelled',
};

const numberInputValue = (value?: string) => value ? Number(value) : null;
const numberRowValue = (value: number | null) => value == null ? '' : String(value);

function initRows(trek: DriverTrek): Record<string, DeliveryRow> {
  const rows: Record<string, DeliveryRow> = {};
  trek.stops.forEach((stop) =>
    stop.products.forEach((p) => {
      rows[p.stopProductId] = {
        basicQtyDelivered: p.basicQtyDelivered != null ? String(p.basicQtyDelivered) : '',
        packagingQtyDelivered: p.packagingQtyDelivered != null ? String(p.packagingQtyDelivered) : '',
        paymentMethod: p.paymentMethod ?? '',
        amtPaid:       p.amtPaid != null ? String(p.amtPaid) : '',
        balance:       p.balance != null ? String(p.balance) : '',
        notes:         p.notes ?? '',
      };
    })
  );
  return rows;
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

// ── Stop card ─────────────────────────────────────────────────────────────────

interface StopCardProps {
  stop: DriverStop;
  rows: Record<string, DeliveryRow>;
  locked: boolean;
  recording: boolean;
  onRowChange: (spId: string, field: keyof DeliveryRow, value: string) => void;
  onRecord: (stop: DriverStop) => void;
}

const StopCard: React.FC<StopCardProps> = ({ stop, rows, locked, recording, onRowChange, onRecord }) => {
  const hasProducts = stop.products.length > 0;
  const isRecorded  = hasProducts && stop.products.every((p) => p.basicQtyDelivered != null || p.packagingQtyDelivered != null);

  return (
    <div className="px-4 sm:px-5 py-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="flex items-center gap-2.5 flex-wrap min-w-0">
          <span className="shrink-0 text-[11px] font-bold text-portal-muted">
            {stop.sequence}.
          </span>
          <span className="text-sm font-semibold text-white">{stop.customerName}</span>
          <span className="w-px h-3.5 bg-portal-border shrink-0" />
          <span className="font-mono text-[11px] text-portal-muted">{stop.customerCode}</span>
          {isRecorded && (
            <>
              <span className="w-px h-3.5 bg-portal-border shrink-0" />
              <span className="text-[11px] text-portal-accent flex items-center gap-1">
                <i className="pi pi-check text-[10px]" />
                <span>Recorded</span>
              </span>
            </>
          )}
          {stop.primaryPhoneNumber && (
            <>
              <span className="w-px h-3.5 bg-portal-border shrink-0" />
              <a
                href={`tel:${stop.primaryPhoneNumber}`}
                className="text-[11px] text-portal-muted hover:text-white transition-colors flex items-center gap-1"
              >
                <i className="pi pi-phone text-[9px]" />
                <span>{stop.primaryPhoneNumber}</span>
              </a>
            </>
          )}
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0 bg-portal-canvas/40 border border-portal-border/40 rounded px-3.5 sm:px-4 py-2">
        <div>
          <p className="text-[10px] font-bold text-portal-muted uppercase tracking-wider pb-1 pt-1 mb-0.5">Location</p>
          <InfoRow label="Region"   value={stop.regionName} />
          <InfoRow label="District" value={stop.districtName} />
          <InfoRow label="Landmark" value={stop.primaryLocationLandmark} />
          <InfoRow label="Street"   value={stop.primaryLocationStreet} />
          {!stop.regionName && !stop.districtName && !stop.primaryLocationLandmark && !stop.primaryLocationStreet && stop.location && (
            <InfoRow label="Location" value={stop.location} />
          )}
        </div>
        <div>
          <p className="text-[10px] font-bold text-portal-muted uppercase tracking-wider pb-1 pt-1 mb-0.5">Contact</p>
          <InfoRow label="Customer Phone"  value={stop.primaryPhoneNumber} mono />
          <InfoRow label="Primary Contact" value={stop.primaryContactName} />
          <InfoRow label="Contact Phone"   value={stop.primaryContactPhone} mono />
          {stop.notes && <InfoRow label="Notes" value={stop.notes} />}
        </div>
      </div>

      {/* Products listing */}
      {hasProducts && (
        <div className="space-y-3">
          {/* Desktop Table View (hidden on small screens) */}
          <div className="hidden md:block border border-portal-border/60 bg-portal-canvas/30 rounded overflow-x-auto">
            <table className="min-w-[760px] w-full text-xs">
              <thead className="bg-portal-canvas border-b border-portal-border/60">
                <tr>
                  <th className="text-left text-[10px] font-bold text-portal-muted uppercase tracking-wider py-2.5 px-3 whitespace-nowrap">Product</th>
                  <th className="text-left text-[10px] font-bold text-portal-muted uppercase tracking-wider py-2.5 px-2.5 w-28 whitespace-nowrap">Planned</th>
                  <th className="text-left text-[10px] font-bold text-portal-muted uppercase tracking-wider py-2.5 px-2.5 w-32 whitespace-nowrap">Delivered</th>
                  <th className="text-left text-[10px] font-bold text-portal-muted uppercase tracking-wider py-2.5 px-2.5 w-36 whitespace-nowrap">Payment</th>
                  <th className="text-center text-[10px] font-bold text-portal-muted uppercase tracking-wider py-2.5 px-2.5 w-24 whitespace-nowrap">Amt Paid</th>
                  <th className="text-center text-[10px] font-bold text-portal-muted uppercase tracking-wider py-2.5 px-2.5 w-24 whitespace-nowrap">Balance</th>
                  <th className="text-left text-[10px] font-bold text-portal-muted uppercase tracking-wider py-2.5 px-3 min-w-[140px] whitespace-nowrap">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-portal-border/30">
                {stop.products.map((product) => {
                  const row  = rows[product.stopProductId] ?? {};
                  const spId = product.stopProductId;
                  return (
                    <tr key={spId} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="block font-medium text-white">{product.productName}</span>
                        <span className="block text-[11px] text-portal-muted">
                          GHS {Number(product.basicUnitPrice).toFixed(2)} / {product.basicUnitName || 'basic unit'}
                          {product.packagingUnitName && product.packagingUnitPrice != null &&
                            ` · GHS ${Number(product.packagingUnitPrice).toFixed(2)} / ${product.packagingUnitName}`}
                        </span>
                      </td>
                      <td className="py-2.5 px-2.5 whitespace-nowrap">
                        <span className="block font-mono text-portal-accent font-semibold">{product.plannedBasicQuantity} {product.basicUnitName || 'basic units'}</span>
                        {product.packagingUnitName && <span className="block font-mono text-portal-accent font-semibold">{product.plannedPackagingQuantity ?? 0} {product.packagingUnitName}</span>}
                      </td>
                      <td className="py-2.5 px-2.5 whitespace-nowrap">
                        <div className="space-y-1">
                          <FlatInputNumber id={`${spId}-basic-desktop`} min={0} maxFractionDigits={2} useGrouping={false} size="sm"
                            value={numberInputValue(row.basicQtyDelivered)} disabled={locked} placeholder={`Basic (${product.basicUnitName || 'units'})`}
                            onChange={(value) => onRowChange(spId, 'basicQtyDelivered', numberRowValue(value))} />
                          {product.packagingUnitName && (
                            <FlatInputNumber id={`${spId}-packaging-desktop`} min={0} maxFractionDigits={2} useGrouping={false} size="sm"
                              value={numberInputValue(row.packagingQtyDelivered)} disabled={locked} placeholder={`Packaging (${product.packagingUnitName})`}
                              onChange={(value) => onRowChange(spId, 'packagingQtyDelivered', numberRowValue(value))} />
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-2.5 whitespace-nowrap">
                        <FlatDropdown id={`${spId}-payment-desktop`} options={PAYMENT_OPTIONS}
                          value={row.paymentMethod ?? ''} disabled={locked}
                          onChange={(value) => onRowChange(spId, 'paymentMethod', value ?? '')} size="sm" />
                      </td>
                      <td className="py-2.5 px-2.5 whitespace-nowrap">
                        <FlatInputNumber id={`${spId}-amt-paid-desktop`} min={0} maxFractionDigits={2} useGrouping={false} size="sm"
                          value={numberInputValue(row.amtPaid)} disabled={locked} placeholder="0.00"
                          onChange={(value) => onRowChange(spId, 'amtPaid', numberRowValue(value))} />
                      </td>
                      <td className="py-2.5 px-2.5 whitespace-nowrap">
                        <FlatInputNumber id={`${spId}-balance-desktop`} min={0} maxFractionDigits={2} useGrouping={false} size="sm"
                          value={numberInputValue(row.balance)} disabled={locked} placeholder="0.00"
                          onChange={(value) => onRowChange(spId, 'balance', numberRowValue(value))} />
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <FlatInputText id={`${spId}-notes-desktop`} value={row.notes ?? ''} disabled={locked}
                          placeholder="Optional notes..." onChange={(e) => onRowChange(spId, 'notes', e.target.value)} size="sm" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View (just as we have for the data table) */}
          <div className="md:hidden space-y-3">
            {stop.products.map((product) => {
              const row  = rows[product.stopProductId] ?? {};
              const spId = product.stopProductId;
              return (
                <div
                  key={spId}
                  className="p-3.5 space-y-2.5 bg-portal-canvas/50 border border-portal-border/60 rounded hover:bg-white/[0.02] transition-colors"
                >
                  {/* Product title and planned quantities */}
                  <div className="flex items-start justify-between gap-2 pb-2 border-b border-portal-border/40">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white break-words">{product.productName}</p>
                      <p className="text-[11px] text-portal-muted">
                        GHS {Number(product.basicUnitPrice).toFixed(2)} / {product.basicUnitName || 'basic unit'}
                        {product.packagingUnitName && product.packagingUnitPrice != null &&
                          ` · GHS ${Number(product.packagingUnitPrice).toFixed(2)} / ${product.packagingUnitName}`}
                      </p>
                    </div>
                    <div className="shrink-0 text-right text-[11px]">
                      <span className="block text-portal-muted text-[10px] uppercase font-bold">Planned</span>
                      <span className="block font-mono text-portal-accent font-bold">{product.plannedBasicQuantity} {product.basicUnitName || 'basic units'}</span>
                      {product.packagingUnitName && <span className="block font-mono text-portal-accent font-bold">{product.plannedPackagingQuantity ?? 0} {product.packagingUnitName}</span>}
                    </div>
                  </div>

                  {/* Horizontal entry rows just as DataTable mobile layout */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2 items-center text-xs">
                      <span className="text-[11px] font-bold text-portal-muted uppercase tracking-wider">
                        Basic delivered ({product.basicUnitName || 'units'})
                      </span>
                      <div className="col-span-2">
                        <FlatInputNumber id={`${spId}-basic-mobile`} min={0} maxFractionDigits={2} useGrouping={false} size="sm"
                          value={numberInputValue(row.basicQtyDelivered)} disabled={locked} placeholder="0"
                          onChange={(value) => onRowChange(spId, 'basicQtyDelivered', numberRowValue(value))} />
                      </div>
                    </div>

                    {product.packagingUnitName && (
                      <div className="grid grid-cols-3 gap-2 items-center text-xs">
                        <span className="text-[11px] font-bold text-portal-muted uppercase tracking-wider">
                          Packaging delivered ({product.packagingUnitName})
                        </span>
                        <div className="col-span-2">
                          <FlatInputNumber id={`${spId}-packaging-mobile`} min={0} maxFractionDigits={2} useGrouping={false} size="sm"
                            value={numberInputValue(row.packagingQtyDelivered)} disabled={locked} placeholder="0"
                            onChange={(value) => onRowChange(spId, 'packagingQtyDelivered', numberRowValue(value))} />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-2 items-center text-xs">
                      <span className="text-[11px] font-bold text-portal-muted uppercase tracking-wider">
                        Payment
                      </span>
                      <div className="col-span-2">
                        <FlatDropdown id={`${spId}-payment-mobile`} options={PAYMENT_OPTIONS}
                          value={row.paymentMethod ?? ''} disabled={locked}
                          onChange={(value) => onRowChange(spId, 'paymentMethod', value ?? '')} size="sm" />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 items-center text-xs">
                      <span className="text-[11px] font-bold text-portal-muted uppercase tracking-wider">
                        Amt Paid
                      </span>
                      <div className="col-span-2">
                        <FlatInputNumber id={`${spId}-amt-paid-mobile`} min={0} maxFractionDigits={2} useGrouping={false} size="sm"
                          value={numberInputValue(row.amtPaid)} disabled={locked} placeholder="0.00"
                          onChange={(value) => onRowChange(spId, 'amtPaid', numberRowValue(value))} />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 items-center text-xs">
                      <span className="text-[11px] font-bold text-portal-muted uppercase tracking-wider">
                        Balance
                      </span>
                      <div className="col-span-2">
                        <FlatInputNumber id={`${spId}-balance-mobile`} min={0} maxFractionDigits={2} useGrouping={false} size="sm"
                          value={numberInputValue(row.balance)} disabled={locked} placeholder="0.00"
                          onChange={(value) => onRowChange(spId, 'balance', numberRowValue(value))} />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 items-center text-xs">
                      <span className="text-[11px] font-bold text-portal-muted uppercase tracking-wider">
                        Notes
                      </span>
                      <div className="col-span-2">
                        <FlatInputText id={`${spId}-notes-mobile`} value={row.notes ?? ''} disabled={locked}
                          placeholder="Optional notes..." onChange={(e) => onRowChange(spId, 'notes', e.target.value)} size="sm" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {!locked && (
            <div className="flex items-center justify-between sm:justify-end gap-3 mt-3 pt-1">
              <span className="text-[11px] text-portal-muted md:hidden">
                {isRecorded ? 'Recorded' : 'Pending'}
              </span>
              <FlatButton
                variant={isRecorded ? 'outline' : 'primary'}
                size="sm"
                leftIcon={isRecorded ? 'pi pi-refresh' : 'pi pi-check'}
                onClick={() => onRecord(stop)}
                loading={recording}
                disabled={recording}
                className="w-full sm:w-auto"
              >
                {recording ? 'Saving...' : isRecorded ? 'Update Deliveries' : 'Record Deliveries'}
              </FlatButton>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

export const DriverPage: React.FC = () => {
  const { token: tokenParam } = useParams<{ token?: string }>();
  const [searchParams] = useSearchParams();
  const token = tokenParam || searchParams.get('token') || '';

  const [trek,         setTrek]         = useState<DriverTrek | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [deliveryRows, setDeliveryRows] = useState<Record<string, DeliveryRow>>({});
  const [recordingStop, setRecordingStop] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!token) { setError('Invalid link.'); setLoading(false); return; }
    if (!silent) setLoading(true);
    try {
      const data = await treksApi.getByDriverToken(token);
      setTrek(data);
      setDeliveryRows(initRows(data));
    } catch {
      setError('Trek not found or this link has expired.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const updateRow = useCallback((spId: string, field: keyof DeliveryRow, value: string) => {
    setDeliveryRows((prev) => ({ ...prev, [spId]: { ...prev[spId], [field]: value } }));
  }, []);

  const handleRecord = useCallback(async (stop: DriverStop) => {
    for (const p of stop.products) {
      const row = deliveryRows[p.stopProductId];
      const basic = !row?.basicQtyDelivered ? null : Number(row.basicQtyDelivered);
      const packaging = !row?.packagingQtyDelivered ? null : Number(row.packagingQtyDelivered);
      if (basic === null && packaging === null) {
        toast.error(`Enter a delivered quantity for "${p.productName}".`);
        return;
      }
      if ((basic !== null && (!Number.isFinite(basic) || basic < 0)) ||
          (packaging !== null && (!p.packagingUnitName || !Number.isFinite(packaging) || packaging < 0))) {
        toast.error(`Enter valid delivered quantities for "${p.productName}".`);
        return;
      }
      if (!row.paymentMethod) {
        toast.error(`Payment method is required for "${p.productName}".`);
        return;
      }
      if (!row.amtPaid || parseFloat(row.amtPaid) < 0) {
        toast.error(`Amount paid is required for "${p.productName}".`);
        return;
      }
    }

    setRecordingStop(stop.stopId);
    try {
      const payload: RecordDeliveryPayload = {
        products: stop.products.map((p) => {
          const row = deliveryRows[p.stopProductId];
          return {
            stopProductId: p.stopProductId,
            basicQtyDelivered: row.basicQtyDelivered !== '' ? Number(row.basicQtyDelivered) : undefined,
            packagingQtyDelivered: p.packagingUnitName && row.packagingQtyDelivered !== '' ? Number(row.packagingQtyDelivered) : undefined,
            paymentMethod: row.paymentMethod  ? row.paymentMethod as PaymentMethod : undefined,
            amtPaid:       row.amtPaid        ? parseFloat(row.amtPaid)       : undefined,
            balance:       row.balance        ? parseFloat(row.balance)       : undefined,
            notes:         row.notes          || undefined,
          };
        }),
      };
      await treksApi.recordByDriverToken(token, payload);
      resetTableData();
      toast.success(`Stop ${stop.sequence} recorded.`);
      await load(true);
    } catch {
      toast.error('Failed to record delivery.');
    } finally {
      setRecordingStop(null);
    }
  }, [deliveryRows, token, load]);

  // ── Render states ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-portal-canvas flex items-center justify-center">
        <span className="text-xs text-portal-muted flex items-center gap-2">
          <i className="pi pi-spin pi-spinner" /> Loading...
        </span>
      </div>
    );
  }

  if (error || !trek) {
    return (
      <div className="min-h-screen bg-portal-canvas flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-sm font-semibold text-white mb-1">Link not found</p>
          <p className="text-xs text-portal-muted">{error}</p>
        </div>
      </div>
    );
  }

  const sortedStops = [...trek.stops].sort((a, b) => a.sequence - b.sequence);

  return (
    <div className="min-h-screen bg-portal-canvas">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-portal-surface border-b border-portal-border">
        <div className="container mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-base font-bold text-white leading-none">{trek.trekNumber}</p>
            <p className="text-[11px] text-portal-muted mt-0.5">{trek.scheduledDate} · {trek.regionName}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className={`text-xs font-semibold ${STATUS_STYLES[trek.status] ?? 'text-portal-muted'}`}>
              {STATUS_LABELS[trek.status] ?? trek.status}
            </span>
            <FlatButton
              variant="outline"
              size="sm"
              leftIcon="pi pi-download"
              onClick={() => window.open(`${baseURL}/treks/driver/${token}/sheet/pdf`, '_blank')}
            >
              PDF
            </FlatButton>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5">
        {/* Trek info tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {[
            { label: 'Trekking Region', value: trek.regionName },
            { label: 'Driver',  value: trek.driverName },
            { label: 'Vehicle', value: trek.vehicleDisplayName },
            { label: 'Sales Staff', value: trek.salesStaffName || '—' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-portal-surface border border-portal-border/60 rounded p-2.5 sm:p-3 min-w-0">
              <p className="text-[10px] text-portal-muted uppercase tracking-wide mb-0.5 truncate">{label}</p>
              <p className="text-xs font-medium text-white truncate" title={value}>{value}</p>
            </div>
          ))}
        </div>

        {/* Locked notice */}
        {trek.isLocked && (
          <p className="text-[11px] text-portal-muted italic border-l-2 border-portal-border pl-3">
            <i className="pi pi-lock mr-1.5" />
            This trek is completed. No further changes can be made.
          </p>
        )}

        {/* Stops */}
        <div className="bg-portal-surface border border-portal-border/60 rounded">
          <div className="px-4 sm:px-5 py-3 border-b border-portal-border/60">
            <span className="text-sm font-bold text-white">
              Stops
              <span className="text-portal-muted font-normal text-xs ml-2">({sortedStops.length})</span>
            </span>
          </div>

          {sortedStops.length === 0 ? (
            <p className="text-xs text-portal-muted text-center py-10">No stops on this trek.</p>
          ) : (
            <div className="divide-y divide-portal-border/40">
              {sortedStops.map((stop) => (
                <StopCard
                  key={stop.stopId}
                  stop={stop}
                  rows={deliveryRows}
                  locked={trek.isLocked}
                  recording={recordingStop === stop.stopId}
                  onRowChange={updateRow}
                  onRecord={handleRecord}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DriverPage;
