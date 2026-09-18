import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FlatButton, FlatDropdown, FlatInputNumber, FlatInputText } from '../../components/flat-form';
import {
  treksApi,
  type DriverTrek,
  type DriverStop,
  type PaymentMethod,
} from '../../api-client';
import { FlatDataTable, resetTableData } from '../../components/data-table';
import { baseURL } from '../../api-client/api';
import { useFieldControl } from './control/useFieldControl';
import { FieldActions, type FieldActionKind, type FieldActionRequest } from './control/FieldActions';
import { DriverDashboard } from './control/DriverDashboard';
import { CockpitBackLink } from './control/CockpitBackLink';
import { OfflineMapControl } from './control/OfflineMapControl';
import { useDeviceStatus } from './control/useDeviceStatus';
import type { FieldCustomer, QueuedAction, RegionTrek } from './control/api';
import { FlatModal } from '../../components/overlay/FlatModal';

type DeliveryRow = {
  basicQtyDelivered: string;
  packagingQtyDelivered: string;
  paymentMethod: string;
  amtPaid: string;
  balance: string;
  notes: string;
};

type CustomerListRow = FieldCustomer & { syncStatus?: 'pending' | 'conflict'; syncReason?: string };

const PAYMENT_OPTIONS = [
  { label: 'Select method...', value: '' },
  { label: 'Cash',             value: 'Cash' },
  { label: 'Mobile Money',     value: 'MobileMoney' },
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
  onVoid: (stopId: string, returnId: string) => void;
  onFieldAction: (kind: FieldActionKind, stopId: string) => void;
  queuedReturns: QueuedAction[];
}

const StopCard: React.FC<StopCardProps> = ({ stop, rows, locked, recording, onRowChange, onRecord, onVoid, onFieldAction, queuedReturns }) => {
  const [expanded, setExpanded] = useState(false);
  const hasProducts = stop.products.length > 0;
  const hasPlanned = stop.products.some((product) => !product.isUnplanned);
  const isRecorded  = hasProducts && stop.products.every((p) => p.basicQtyDelivered != null || p.packagingQtyDelivered != null);

  return (
    <div className="px-4 sm:px-5 py-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 min-w-0">
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={`stop-details-${stop.stopId}`}
          onClick={() => setExpanded((current) => !current)}
          className="flex min-h-[44px] min-w-0 flex-1 items-center gap-2.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-portal-accent"
        >
          <span className="shrink-0 text-[11px] font-bold text-portal-muted">
            {stop.sequence}.
          </span>
          <span className="min-w-0 truncate text-[13px] font-semibold text-white sm:text-sm">{stop.customerName}</span>
          <span className="w-px h-3.5 bg-portal-border shrink-0" />
          <span className="hidden font-mono text-[11px] text-portal-muted sm:inline">{stop.customerCode}</span>
          {isRecorded && (
            <>
              <span className="hidden w-px h-3.5 bg-portal-border shrink-0 sm:inline" />
              <span className="shrink-0 text-[11px] text-portal-accent flex items-center gap-1">
                <i className="pi pi-check text-[10px]" />
                <span>Recorded</span>
              </span>
            </>
          )}
          {stop.isWalkIn && <span className="hidden shrink-0 text-[11px] text-portal-accent md:inline">Walk-in</span>}
          <i className={`pi pi-chevron-down ml-auto shrink-0 text-xs text-portal-muted transition-transform duration-300 motion-reduce:transition-none ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
        {stop.primaryPhoneNumber && <a href={`tel:${stop.primaryPhoneNumber}`} aria-label={`Call ${stop.customerName}`} className="flex h-10 w-10 shrink-0 items-center justify-center text-portal-muted hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-portal-accent"><i className="pi pi-phone text-sm" aria-hidden="true" /></a>}
      </div>

      <div
        id={`stop-details-${stop.stopId}`}
        aria-hidden={!expanded}
        inert={!expanded}
        className={`grid transition-[grid-template-rows,margin] duration-300 ease-in-out motion-reduce:transition-none ${expanded ? 'mt-3 grid-rows-[1fr]' : 'mt-0 grid-rows-[0fr]'}`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-4 border-t border-portal-border/40 pt-4">
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

      <div className="flex flex-wrap gap-2 items-center">
        {stop.isWalkIn && <span className="text-[11px] text-portal-accent">Walk-in stop</span>}
        {!locked && <>
          <FlatButton size="sm" variant="ghost" onClick={() => onFieldAction('sale', stop.stopId)}>Unplanned sale</FlatButton>
          <FlatButton size="sm" variant="ghost" onClick={() => onFieldAction('return', stop.stopId)}>Record return</FlatButton>
        </>}
      </div>
      {!!stop.returns?.length && <div className="space-y-1">
        <p className="text-[11px] font-bold text-portal-muted uppercase">Returns</p>
        {stop.returns.map((item) => <div key={item.returnId} className="flex items-center justify-between gap-2 text-xs text-portal-text">
          <span>{item.productName} · {item.basicQtyReturned} {item.basicUnitName}{item.packagingQtyReturned ? ` · ${item.packagingQtyReturned} ${item.packagingUnitName}` : ''}</span>
          {!locked && <FlatButton size="sm" variant="ghost" onClick={() => onVoid(stop.stopId, item.returnId)}>Void</FlatButton>}
        </div>)}
      </div>}
      {!!queuedReturns.length && <p className="text-[11px] text-portal-muted">{queuedReturns.length} return action(s) saved on this device.</p>}

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
                  className="p-3 space-y-3 bg-portal-canvas/50 border border-portal-border/60 rounded hover:bg-white/[0.02] transition-colors"
                >
                  {/* Product title and planned quantities */}
                  <div className="flex items-start justify-between gap-2 pb-2 border-b border-portal-border/40">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-white break-words sm:text-xs">{product.productName}</p>
                      <p className="text-[11px] text-portal-muted">
                        GHS {Number(product.basicUnitPrice).toFixed(2)} / {product.basicUnitName || 'basic unit'}
                        {product.packagingUnitName && product.packagingUnitPrice != null &&
                          ` · GHS ${Number(product.packagingUnitPrice).toFixed(2)} / ${product.packagingUnitName}`}
                      </p>
                    </div>
                    <div className="shrink-0 text-right text-[11px]">
                      <span className="block text-portal-muted text-[10px] uppercase font-semibold">Planned</span>
                      <span className="block font-mono text-portal-accent font-bold">{product.plannedBasicQuantity} {product.basicUnitName || 'basic units'}</span>
                      {product.packagingUnitName && <span className="block font-mono text-portal-accent font-bold">{product.plannedPackagingQuantity ?? 0} {product.packagingUnitName}</span>}
                    </div>
                  </div>

                  {/* Horizontal entry rows just as DataTable mobile layout */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2 items-center text-[11px]">
                      <span className="text-[10px] font-semibold text-portal-muted uppercase tracking-wide">
                        Basic delivered ({product.basicUnitName || 'units'})
                      </span>
                      <div className="col-span-2 text-[11px]">
                        <FlatInputNumber id={`${spId}-basic-mobile`} min={0} maxFractionDigits={2} useGrouping={false} size="sm"
                          value={numberInputValue(row.basicQtyDelivered)} disabled={locked} placeholder="0"
                          onChange={(value) => onRowChange(spId, 'basicQtyDelivered', numberRowValue(value))} />
                      </div>
                    </div>

                    {product.packagingUnitName && (
                      <div className="grid grid-cols-3 gap-2 items-center text-[11px]">
                        <span className="text-[10px] font-semibold text-portal-muted uppercase tracking-wide">
                          Packaging delivered ({product.packagingUnitName})
                        </span>
                        <div className="col-span-2 text-[11px]">
                          <FlatInputNumber id={`${spId}-packaging-mobile`} min={0} maxFractionDigits={2} useGrouping={false} size="sm"
                            value={numberInputValue(row.packagingQtyDelivered)} disabled={locked} placeholder="0"
                            onChange={(value) => onRowChange(spId, 'packagingQtyDelivered', numberRowValue(value))} />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-2 items-center text-[11px]">
                      <span className="text-[10px] font-semibold text-portal-muted uppercase tracking-wide">
                        Payment
                      </span>
                      <div className="col-span-2 text-[11px]">
                        <FlatDropdown id={`${spId}-payment-mobile`} options={PAYMENT_OPTIONS}
                          value={row.paymentMethod ?? ''} disabled={locked}
                          onChange={(value) => onRowChange(spId, 'paymentMethod', value ?? '')} size="sm" />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 items-center text-[11px]">
                      <span className="text-[10px] font-semibold text-portal-muted uppercase tracking-wide">
                        Amt Paid
                      </span>
                      <div className="col-span-2 text-[11px]">
                        <FlatInputNumber id={`${spId}-amt-paid-mobile`} min={0} maxFractionDigits={2} useGrouping={false} size="sm"
                          value={numberInputValue(row.amtPaid)} disabled={locked} placeholder="0.00"
                          onChange={(value) => onRowChange(spId, 'amtPaid', numberRowValue(value))} />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 items-center text-[11px]">
                      <span className="text-[10px] font-semibold text-portal-muted uppercase tracking-wide">
                        Balance
                      </span>
                      <div className="col-span-2 text-[11px]">
                        <FlatInputNumber id={`${spId}-balance-mobile`} min={0} maxFractionDigits={2} useGrouping={false} size="sm"
                          value={numberInputValue(row.balance)} disabled={locked} placeholder="0.00"
                          onChange={(value) => onRowChange(spId, 'balance', numberRowValue(value))} />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 items-center text-[11px]">
                      <span className="text-[10px] font-semibold text-portal-muted uppercase tracking-wide">
                        Notes
                      </span>
                      <div className="col-span-2 text-[11px]">
                        <FlatInputText id={`${spId}-notes-mobile`} value={row.notes ?? ''} disabled={locked}
                          placeholder="Optional notes..." onChange={(e) => onRowChange(spId, 'notes', e.target.value)} size="sm" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {!locked && hasPlanned && (
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
        </div>
      </div>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

export const DriverPage: React.FC = () => {
  const { token: tokenParam } = useParams<{ token?: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const token = tokenParam || searchParams.get('token') || '';
  const view = location.pathname.startsWith('/treks/driver/') ? location.pathname.split('/')[3] : 'dashboard';
  const driverHref = (section?: string, extras?: Record<string, string>) => {
    const params = new URLSearchParams({ token, ...extras });
    return `/treks/driver${section ? `/${section}` : ''}?${params.toString()}`;
  };

  const { trek, products, customers, regionTreks, queue, photoQueue, loading, syncing, refreshing, online, error, controlAvailable, lastSyncedAt, refresh, syncProducts, uploadCustomerPremisesPhoto, uploadCustomerPortrait, sync, completeTrek, enqueue, queuePhoto, retry, remove } = useFieldControl(token);
  const { device, phoneAddress, weather, deviceUnavailable, reporting, locationError, sendingSos, report, sendSos } = useDeviceStatus(token);
  const [deliveryRows, setDeliveryRows] = useState<Record<string, DeliveryRow>>({});
  const [recordingStop, setRecordingStop] = useState<string | null>(null);
  const [assignedStopRequest, setAssignedStopRequest] = useState<FieldActionRequest | null>(null);
  const [customerRequest, setCustomerRequest] = useState<FieldActionRequest | null>(null);
  const premisesPhotoInputRef = useRef<HTMLInputElement>(null);
  const premisesPhotoCustomerIdRef = useRef<string | null>(null);
  const [uploadingCustomerPhotoId, setUploadingCustomerPhotoId] = useState<string | null>(null);
  const [uploadingPortraitId, setUploadingPortraitId] = useState<string | null>(null);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [completingTrek, setCompletingTrek] = useState(false);
  const handleFieldPremisesPhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    const customerId = premisesPhotoCustomerIdRef.current;
    if (!file || !customerId) return;
    if (!online) { toast.error('Connect to upload a premises photo.'); return; }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Choose a JPEG, PNG, or WebP photo.'); return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Premises photo must be 5 MB or smaller.'); return;
    }
    setUploadingCustomerPhotoId(customerId);
    try {
      await uploadCustomerPremisesPhoto(customerId, file);
      toast.success('Premises photo uploaded.');
    } catch (uploadError: any) {
      toast.error(uploadError.response?.data?.message || uploadError.response?.data?.detail || 'Could not upload premises photo.');
    } finally {
      setUploadingCustomerPhotoId(null);
      premisesPhotoCustomerIdRef.current = null;
    }
  };
  const handleFieldPortraitChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    const customer = customers.find((item) => item.id === premisesPhotoCustomerIdRef.current);
    if (!file || !customer || !customer.primaryPersonId) return;
    if (!online) { toast.error('Connect to upload a representative photo.'); return; }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { toast.error('Choose a JPEG, PNG, or WebP photo.'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Representative photo must be 5 MB or smaller.'); return; }
    setUploadingPortraitId(customer.id);
    try {
      await uploadCustomerPortrait(customer.id, customer.primaryPersonId, file);
      toast.success('Representative photo uploaded.');
    } catch (uploadError: any) {
      toast.error(uploadError.response?.data?.message || uploadError.response?.data?.detail || 'Could not upload representative photo.');
    } finally {
      setUploadingPortraitId(null);
      premisesPhotoCustomerIdRef.current = null;
    }
  };
  useEffect(() => { if (view !== 'assigned') setAssignedStopRequest(null); }, [view]);
  useEffect(() => { if (view !== 'customers') setCustomerRequest(null); }, [view]);
  const actionRequest: FieldActionRequest | null = view === 'actions' && searchParams.has('kind') ? {
    kind: searchParams.get('kind') as FieldActionKind,
    trekId: searchParams.get('trekId') || undefined,
    stopId: searchParams.get('stopId') || undefined,
    nonce: Number(searchParams.get('nonce') || 0),
  } : null;
  const openAction = (kind: FieldActionKind, trekId?: string, stopId?: string) => {
    navigate(driverHref('actions', { kind, ...(trekId && { trekId }), ...(stopId && { stopId }), nonce: String(Date.now()) }));
  };

  const handleCompleteTrek = async () => {
    setCompletingTrek(true);
    try {
      await completeTrek();
      setCompleteDialogOpen(false);
      toast.success('Trek completed and ledger synced.');
    } catch (completionError) {
      toast.error(completionError instanceof Error ? completionError.message : 'The trek could not be completed.');
    } finally {
      setCompletingTrek(false);
    }
  };

  useEffect(() => { if (trek) setDeliveryRows(initRows(trek)); }, [trek]);

  const updateRow = useCallback((spId: string, field: keyof DeliveryRow, value: string) => {
    setDeliveryRows((prev) => ({ ...prev, [spId]: { ...prev[spId], [field]: value } }));
  }, []);

  const handleRecord = useCallback(async (stop: DriverStop) => {
    for (const p of stop.products.filter((product) => !product.isUnplanned)) {
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
      if (!controlAvailable) {
        if (!online) { toast.error('Connect to record deliveries until the updated backend is available.'); return; }
        await treksApi.recordByDriverToken(token, { products: stop.products.filter((product) => !product.isUnplanned).map((p) => {
          const row = deliveryRows[p.stopProductId];
          return { stopProductId: p.stopProductId,
            basicQtyDelivered: row.basicQtyDelivered !== '' ? Number(row.basicQtyDelivered) : undefined,
            packagingQtyDelivered: p.packagingUnitName && row.packagingQtyDelivered !== '' ? Number(row.packagingQtyDelivered) : undefined,
            paymentMethod: row.paymentMethod ? row.paymentMethod as PaymentMethod : undefined,
            amtPaid: row.amtPaid ? Number(row.amtPaid) : undefined,
            balance: row.balance ? Number(row.balance) : undefined,
            notes: row.notes || undefined };
        }) });
        resetTableData();
        toast.success(`Stop ${stop.sequence} recorded.`);
        await refresh(true);
        return;
      }
      for (const p of stop.products.filter((product) => !product.isUnplanned)) {
          const row = deliveryRows[p.stopProductId];
          await enqueue('RecordDelivery', {
            stopProductId: p.stopProductId,
            basicQtyDelivered: row.basicQtyDelivered !== '' ? Number(row.basicQtyDelivered) : undefined,
            packagingQtyDelivered: p.packagingUnitName && row.packagingQtyDelivered !== '' ? Number(row.packagingQtyDelivered) : undefined,
            paymentMethod: row.paymentMethod  ? row.paymentMethod as PaymentMethod : undefined,
            amtPaid:       row.amtPaid        ? parseFloat(row.amtPaid)       : undefined,
            balance:       row.balance        ? parseFloat(row.balance)       : undefined,
            notes:         row.notes          || undefined,
          });
      }
      toast.success(`Stop ${stop.sequence} saved on this device.`);
    } catch {
      toast.error('Could not save delivery on this device.');
    } finally {
      setRecordingStop(null);
    }
  }, [deliveryRows, enqueue, controlAvailable, online, token, refresh]);

  const handleVoid = useCallback(async (_stopId: string, returnId: string) => {
    try { await enqueue('VoidReturn', { returnId }); toast.success('Return void saved on this device.'); }
    catch { toast.error('Could not save return void.'); }
  }, [enqueue]);

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

  if (!trek) {
    return (
      <div className="min-h-screen bg-portal-canvas flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-sm font-semibold text-white mb-1">Field data unavailable</p>
          <p className="text-xs text-portal-muted">{error || 'Connect once to download this trek.'}</p>
        </div>
      </div>
    );
  }

  const sortedStops = [...trek.stops].sort((a, b) => a.sequence - b.sequence);
  const queuedStops = queue.filter((action) => action.type === 'AddWalkInStop' && action.status === 'pending' && action.payload.trekId === trek.trekId);
  const customerRows: CustomerListRow[] = [
    ...customers,
    ...queue.filter((action) => action.type === 'RegisterCustomer' && action.status !== 'synced').map((action) => ({
      id: action.clientId,
      businessName: String(action.payload.businessName || ''),
      primaryPhoneNumber: String(action.payload.primaryPhoneNumber || ''),
      customerType: String(action.payload.customerType || ''),
      primaryContactName: [
        (action.payload.representative as Record<string, unknown> | undefined)?.firstName,
        (action.payload.representative as Record<string, unknown> | undefined)?.lastName,
      ].filter(Boolean).join(' '),
      primaryPersonId: (action.payload.primaryPersonId as string | undefined) ?? null,
      latitude: (action.payload.gps as { latitude?: number } | null | undefined)?.latitude ?? null,
      longitude: (action.payload.gps as { longitude?: number } | null | undefined)?.longitude ?? null,
      accuracyMetres: (action.payload.gps as { accuracyMetres?: number } | null | undefined)?.accuracyMetres ?? null,
      syncStatus: action.status as 'pending' | 'conflict',
      syncReason: action.reason,
    })),
  ];
  const nextStopSequence = Math.max(0, ...sortedStops.map((stop) => stop.sequence), ...queuedStops.map((action) => Number(action.payload.sequence) || 0)) + 1;
  const visibleTreks = regionTreks.length ? regionTreks : [{ trekId: trek.trekId, trekNumber: trek.trekNumber, scheduledDate: trek.scheduledDate,
    status: trek.status, driverName: trek.driverName, salesStaffName: trek.salesStaffName, regionName: trek.regionName, stopsCount: trek.stops.length }];
  const pendingCount = queue.filter((action) => action.status === 'pending').length + photoQueue.filter((photo) => photo.status === 'pending').length;
  const isStopRecorded = (s: DriverStop) =>
    s.products.length > 0 &&
    s.products.every((p) => p.basicQtyDelivered != null || p.packagingQtyDelivered != null);

  return (
    <div className="min-h-screen bg-portal-canvas flex flex-col">
      <div className="min-h-screen w-full">
        <DriverDashboard
          trek={trek}
          customers={customers}
          regionalCount={regionTreks.length || null}
          pendingCount={pendingCount}
          syncing={syncing}
          onSync={sync}
          online={online}
          device={device}
          phoneAddress={phoneAddress?.label ?? null}
          deviceUnavailable={deviceUnavailable}
          reporting={reporting}
          locationError={locationError}
          sendingSos={sendingSos}
          weather={weather}
          reportLocation={() => report()}
          sendSos={sendSos}
          activeView={view}
          setActiveView={(nextView, options) => {
            const params = options?.kind ? { ...options, nonce: String(Date.now()) } : options;
            navigate(driverHref(nextView === 'dashboard' ? undefined : nextView, params));
          }}
          renderStopsView={() => (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-portal-border/60 pb-3">
                <div>
                  <h1 className="text-sm font-bold text-white sm:text-lg">{trek.trekNumber} · Assigned Stops</h1>
                  <p className="text-[11px] text-portal-muted sm:text-xs">{trek.regionName} · {trek.scheduledDate}</p>
                </div>
                <div className="flex w-full flex-col items-stretch gap-2 pb-1 sm:w-auto sm:flex-row sm:items-center sm:pb-0">
                  {!trek.isLocked && trek.status === 'InProgress' && <FlatButton
                    size="sm"
                    leftIcon="pi pi-plus"
                    className="w-full shrink-0 sm:w-auto"
                    onClick={() => setAssignedStopRequest({ kind: 'stop', trekId: trek.trekId, sequence: nextStopSequence, nonce: Date.now() })}
                  >Add walk-in stop</FlatButton>}
                  {!trek.isLocked && trek.status === 'InProgress' && <FlatButton
                    size="sm"
                    variant="outline"
                    leftIcon="pi pi-check-circle"
                    className="w-full shrink-0 sm:w-auto"
                    disabled={!online || syncing || completingTrek}
                    onClick={() => setCompleteDialogOpen(true)}
                  >Complete trek</FlatButton>}
                  <FlatButton
                    size="sm"
                    variant="outline"
                    leftIcon="pi pi-download"
                    className="w-full shrink-0 sm:w-auto"
                    onClick={() => window.open(`${baseURL}/treks/driver/${token}/sheet/pdf`, '_blank')}
                  >
                    Download PDF Sheet
                  </FlatButton>
                  <span className="hidden shrink-0 sm:inline-flex">
                    <CockpitBackLink onClick={() => navigate(driverHref(undefined))} />
                  </span>
                </div>
              </div>

              {trek.isLocked && (
                <p className="text-[11px] text-portal-muted italic border-l-2 border-portal-border pl-3">
                  <i className="pi pi-lock mr-1.5" />
                  This trek is completed. No further changes can be made.
                </p>
              )}

              <FieldActions
                trek={trek}
                products={products}
                customers={customers}
                queue={queue}
                enqueue={enqueue}
                queuePhoto={queuePhoto}
                request={assignedStopRequest}
                backendReady={controlAvailable}
                modalOnly
                fixedTrekId={trek.trekId}
                onClose={() => setAssignedStopRequest(null)}
              />

              <div id="assigned-stops" className="bg-portal-surface border border-portal-border/60 rounded overflow-hidden">
                <div className="px-4 sm:px-5 py-3 border-b border-portal-border/60 flex items-center justify-between">
                  <span className="text-sm font-bold text-white">
                    Stops Ledger <span className="text-portal-muted font-normal text-xs ml-1">({sortedStops.length + queuedStops.length})</span>
                  </span>
                  <span className="text-xs text-portal-accent font-medium">
                    {sortedStops.filter(isStopRecorded).length} recorded
                  </span>
                </div>

                {sortedStops.length === 0 && queuedStops.length === 0 ? (
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
                        onVoid={handleVoid}
                        onFieldAction={(kind, stopId) => kind === 'sale'
                          ? setAssignedStopRequest({ kind: 'sale', stopId, nonce: Date.now() })
                          : openAction(kind, undefined, stopId)}
                        queuedReturns={queue.filter(
                          (action) =>
                            action.type === 'RecordReturn' &&
                            action.status !== 'synced' &&
                            action.payload.stopId === stop.stopId
                        )}
                      />
                    ))}
                    {queuedStops.map((action) => {
                      const customer = customers.find((item) => item.id === action.payload.customerId);
                      const queuedCustomer = queue.find((item) => item.type === 'RegisterCustomer' && item.clientId === action.payload.customerClientId);
                      return <div key={action.clientId} className="flex flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs sm:px-5">
                        <span className="font-semibold text-white">{String(action.payload.sequence)}. {customer?.businessName || String(queuedCustomer?.payload.businessName || 'Walk-in customer')}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-portal-accent">Saved on device · awaiting sync</span>
                          {!trek.isLocked && <FlatButton size="sm" variant="ghost" onClick={() => setAssignedStopRequest({ kind: 'sale', stopClientId: action.clientId, nonce: Date.now() })}>Unplanned sale</FlatButton>}
                        </div>
                      </div>;
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
          renderCustomersView={() => (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 border-b border-portal-border/60 pb-3">
                <span aria-hidden="true" />
                <CockpitBackLink onClick={() => navigate(driverHref(undefined))} />
              </div>
              <FieldActions
                trek={trek}
                products={products}
                customers={customers}
                queue={queue}
                enqueue={enqueue}
                queuePhoto={queuePhoto}
                request={customerRequest}
                backendReady={controlAvailable}
                modalOnly
                onClose={() => setCustomerRequest(null)}
              />
              <input ref={premisesPhotoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => void handleFieldPremisesPhotoChange(event)} />
              <input id="driver-portrait-upload" type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => void handleFieldPortraitChange(event)} />
              <FlatDataTable<CustomerListRow>
                data={customerRows}
                columns={[
                  { field: 'businessName', header: 'Customer', body: (item) => <span className="text-xs font-semibold text-white">{item.businessName}</span> },
                  { field: 'customerCode', header: 'Code', body: (item) => <span className="font-mono text-[11px] text-portal-muted">{item.customerCode || '—'}</span> },
                  { field: 'customerType', header: 'Type', body: (item) => <span className="text-xs text-portal-text">{item.customerType?.replace(/([a-z])([A-Z])/g, '$1 $2') || '—'}</span> },
                  { field: 'primaryPhoneNumber', header: 'Phone', body: (item) => <a href={`tel:${item.primaryPhoneNumber}`} className="text-xs text-portal-text hover:text-white">{item.primaryPhoneNumber}</a> },
                  { field: 'primaryContactName', header: 'Contact', body: (item) => item.primaryContactName || '—' },
                  { field: 'location', header: 'Location', body: (item) => {
                    const latitude = item.latitude ?? item.primaryLocation?.latitude;
                    const longitude = item.longitude ?? item.primaryLocation?.longitude;
                    const accuracy = item.accuracyMetres ?? item.primaryLocation?.accuracyMetres;
                    return latitude != null && longitude != null
                      ? <span className="text-[11px] text-portal-accent" title={`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`}>GPS captured{accuracy != null ? ` · ±${Math.round(accuracy)} m` : ''}</span>
                      : <span className="text-[11px] text-portal-muted">No GPS captured</span>;
                  } },
                  { field: 'premisesPhotoUrl', header: 'Premises photo', body: (item) => <div className="flex items-center gap-2">
                    {item.premisesPhotoUrl && <a href={item.premisesPhotoUrl} target="_blank" rel="noreferrer"><img src={item.premisesPhotoUrl} alt={`${item.businessName} premises`} className="h-9 w-12 rounded object-cover" /></a>}
                    {item.syncStatus ? <span className="text-[11px] text-portal-muted">{item.syncStatus === 'conflict' ? 'Resolve sync first' : 'Upload after sync'}</span>
                      : online ? <FlatButton size="sm" variant="ghost" loading={uploadingCustomerPhotoId === item.id} disabled={uploadingCustomerPhotoId !== null} onClick={() => { premisesPhotoCustomerIdRef.current = item.id; premisesPhotoInputRef.current?.click(); }}>{item.premisesPhotoUrl ? 'Replace' : 'Upload'}</FlatButton>
                        : <span className="text-[11px] text-portal-muted">Connect to upload</span>}
                  </div> },
                  { field: 'portraitUrl', header: 'Representative', body: (item) => <div className="flex items-center gap-2">
                    {item.portraitUrl && <a href={item.portraitUrl} target="_blank" rel="noreferrer"><img src={item.portraitUrl} alt={`${item.primaryContactName || item.businessName} portrait`} className="h-9 w-9 rounded-full object-cover" /></a>}
                    {item.syncStatus ? <span className="text-[11px] text-portal-muted">Upload after sync</span>
                      : item.primaryPersonId && online ? <FlatButton size="sm" variant="ghost" loading={uploadingPortraitId === item.id} disabled={uploadingPortraitId !== null} onClick={() => { premisesPhotoCustomerIdRef.current = item.id; document.getElementById('driver-portrait-upload')?.click(); }}>{item.portraitUrl ? 'Replace' : 'Upload'}</FlatButton>
                        : <span className="text-[11px] text-portal-muted">{item.primaryPersonId ? 'Connect to upload' : 'Person ID unavailable'}</span>}
                  </div> },
                  { field: 'syncStatus', header: 'Status', body: (item) => item.syncStatus
                    ? <span className={`text-[11px] ${item.syncStatus === 'conflict' ? 'text-red-accent' : 'text-portal-accent'}`} title={item.syncReason}>{item.syncStatus === 'conflict' ? 'Needs attention' : 'Awaiting sync'}</span>
                    : <span className="text-[11px] text-portal-muted">Available offline</span> },
                ]}
                heading={`Customers in ${trek.regionName}`}
                headerNotes={<span className="text-[11px] text-portal-muted">Saved on this device for offline use.</span>}
                hasAction
                actionName="Add customer"
                onAction={() => setCustomerRequest({ kind: 'customer', nonce: Date.now() })}
                filterablePlaceholder="Search customers..."
                enableTableFilter
                enablePaginator
                initialPageSize={10}
                emptyDataText="No customers saved on this device yet. Connect to download the region list, or add a customer."
              />
            </div>
          )}
          renderTreksView={() => (
            <div className="space-y-4">
              <FlatDataTable<RegionTrek>
                data={visibleTreks}
                columns={[
                  {
                    field: 'trekNumber',
                    header: 'Trek ID',
                    body: (item) => (
                      <span className="font-semibold text-white">
                        {item.trekNumber}
                        {item.trekId === trek.trekId && (
                          <span className="block text-[11px] text-portal-accent">Assigned to you</span>
                        )}
                      </span>
                    ),
                  },
                  { field: 'regionName', header: 'Trekking Region' },
                  { field: 'scheduledDate', header: 'Date' },
                  {
                    field: 'status',
                    header: 'Status',
                    body: (item) => (
                      <span className={STATUS_STYLES[item.status] ?? 'text-portal-muted'}>
                        {STATUS_LABELS[item.status] ?? item.status}
                      </span>
                    ),
                  },
                  { field: 'driverName', header: 'Driver' },
                  { field: 'salesStaffName', header: 'Sales Staff', body: (item) => item.salesStaffName || '—' },
                  { field: 'stopsCount', header: 'Stops' },
                  {
                    field: 'actions',
                    header: 'Actions',
                    body: (item) =>
                      item.status !== 'Completed' && item.status !== 'Cancelled' ? (
                        <FlatButton size="sm" variant="ghost" onClick={() => openAction('stop', item.trekId)}>
                          Add stop
                        </FlatButton>
                      ) : null,
                  },
                ]}
                heading={`Treks in ${trek.regionName}`}
                headerNotes={
                  !regionTreks.length ? (
                    <span className="text-[11px] text-yellow-400">
                      Regional list not downloaded; showing your assigned trek.
                    </span>
                  ) : (
                    <span className="text-[11px] text-portal-muted">Saved on this device for offline use.</span>
                  )
                }
                filterablePlaceholder="Search trek, driver or region..."
                enableTableFilter
                enablePaginator
                initialPageSize={10}
                emptyDataText="No regional treks available."
              />
            </div>
          )}
          renderActionsView={() => (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-portal-border/60 pb-3">
                <div>
                  <h1 className="text-base font-bold text-white sm:text-lg">Field Actions</h1>
                </div>
                <CockpitBackLink onClick={() => navigate(driverHref(undefined))} />
              </div>
              <FieldActions
                trek={trek}
                products={products}
                customers={customers}
                queue={queue}
                enqueue={enqueue}
                queuePhoto={queuePhoto}
                request={actionRequest}
                backendReady={controlAvailable}
              />
            </div>
          )}
          renderOfflineView={() => (
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center justify-between border-b border-portal-border/60 pb-3">
                <div>
                  <h1 className="text-base font-bold text-white sm:text-lg">Offline & Sync Center</h1>
                  <p className="text-xs text-portal-muted">Local IndexedDB database & sync status</p>
                </div>
                <CockpitBackLink onClick={() => navigate(driverHref(undefined))} />
              </div>

              <section className="bg-portal-surface border border-portal-border/60 rounded p-4 sm:p-5 space-y-4 shadow-md">
                <div>
                  <h2 className="text-sm font-bold text-white">Device Database Storage</h2>
                  <p className="text-[11px] text-portal-muted">
                    Saved in this device’s IndexedDB for complete offline use.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2 text-center sm:grid-cols-3 sm:gap-3">
                  {[
                    { label: 'Products Cached', value: products.length },
                    { label: 'Customers Cached', value: customers.length },
                    { label: 'Pending Sync Actions', value: pendingCount },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="bg-portal-canvas/70 rounded p-3 border border-portal-border/40"
                    >
                      <p className="text-lg font-bold text-white sm:text-xl">{item.value}</p>
                      <p className="text-[11px] text-portal-muted mt-0.5">{item.label}</p>
                    </div>
                  ))}
                </div>

                <p className="text-[11px] text-portal-muted">
                  Last full sync: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : 'Never'}
                </p>

                <div className="flex flex-wrap gap-2 pt-1">
                  <FlatButton
                    size="sm"
                    variant="outline"
                    leftIcon="pi pi-download"
                    loading={refreshing}
                    onClick={() => void refresh(false)}
                  >
                    Download All Offline Data
                  </FlatButton>
                  <FlatButton
                    size="sm"
                    variant="outline"
                    leftIcon="pi pi-box"
                    loading={refreshing}
                    onClick={() =>
                      void syncProducts()
                        .then((count) => toast.success(`${count} products saved on this device.`))
                        .catch(() => toast.error('Product sync failed.'))
                    }
                  >
                    Sync Products Catalogue
                  </FlatButton>
                  <FlatButton
                    size="sm"
                    leftIcon="pi pi-refresh"
                    loading={syncing}
                    disabled={!controlAvailable || !online}
                    onClick={sync}
                  >
                    Upload Queued Actions {pendingCount ? `(${pendingCount})` : ''}
                  </FlatButton>
                </div>

                {!controlAvailable && (
                  <p className="text-[11px] text-yellow-400">
                    The updated backend endpoints are not responding. Local caching continues to work.
                  </p>
                )}
              </section>

              <OfflineMapControl regionName={trek.regionName} online={online} />

              {queue.some((action) => action.status !== 'synced') && (
                <div className="bg-portal-surface border border-portal-border/60 rounded p-4 space-y-3 shadow-md">
                  <h2 className="text-sm font-bold text-white">Local Action Queue</h2>
                  {queue
                    .filter((action) => action.status !== 'synced')
                    .map((action) => (
                      <div
                        key={action.clientId}
                        className="flex flex-wrap items-center justify-between gap-2 text-xs border-t border-portal-border/40 pt-2.5"
                      >
                        <span className="text-portal-text">
                          {action.type.replace(/([a-z])([A-Z])/g, '$1 $2')} ·{' '}
                          {new Date(action.occurredAt).toLocaleTimeString()}
                        </span>
                        <span className="flex items-center gap-2">
                          <span
                            className={
                              action.status === 'conflict' ? 'text-red-400' : 'text-portal-accent'
                            }
                          >
                            {action.status === 'conflict'
                              ? `Conflict: ${action.reason || 'Review required'}`
                              : controlAvailable
                              ? 'Ready to sync'
                              : 'Waiting for connection'}
                          </span>
                          {action.status === 'conflict' && (
                            <>
                              <FlatButton size="sm" variant="ghost" onClick={() => void retry(action.clientId)}>
                                Retry
                              </FlatButton>
                              <FlatButton size="sm" variant="ghost" onClick={() => void remove(action.clientId)}>
                                Dismiss
                              </FlatButton>
                            </>
                          )}
                          {action.type === 'RecordReturn' &&
                            action.status === 'pending' &&
                            !queue.some(
                              (other) =>
                                other.type === 'VoidReturn' &&
                                other.payload.returnClientId === action.clientId
                            ) && (
                              <FlatButton
                                size="sm"
                                variant="ghost"
                                onClick={() => void enqueue('VoidReturn', { returnClientId: action.clientId })}
                              >
                                Void
                              </FlatButton>
                            )}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        />
      </div>
      <FlatModal
        visible={completeDialogOpen}
        onHide={() => { if (!completingTrek) setCompleteDialogOpen(false); }}
        title="Complete trek"
        size="sm"
        footer={
          <>
            <FlatButton size="sm" variant="ghost" disabled={completingTrek} onClick={() => setCompleteDialogOpen(false)}>
              Cancel
            </FlatButton>
            <FlatButton size="sm" variant="primary" loading={completingTrek} onClick={() => void handleCompleteTrek()}>
              Complete trek
            </FlatButton>
          </>
        }
      >
        <p className="text-sm text-portal-text">
          This will sync any pending field actions, post the final ledger entries, and lock the trek. You cannot add stops, deliveries, sales, or returns afterwards.
        </p>
        {!online && <p className="mt-3 text-xs text-yellow-400">Connect to the internet before completing this trek.</p>}
        {pendingCount > 0 && <p className="mt-3 text-xs text-portal-muted">{pendingCount} pending item{pendingCount === 1 ? '' : 's'} will be synced first.</p>}
      </FlatModal>
    </div>
  );
};

export default DriverPage;
