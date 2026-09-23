import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FlatButton, FlatDropdown, FlatInputNumber, FlatInputText } from '../../components/flat-form';
import {
  treksApi,
  type DriverTrek,
  type DriverStop,
  type DriverStopProduct,
  type DriverReturn,
  type PaymentMethod,
  type PortalSession,
} from '../../api-client';
import type { Product } from '../../api-client/products';
import type { Customer, CustomerLocation } from '../../api-client/customers';
import { FlatDataTable, resetTableData } from '../../components/data-table';
import { baseURL } from '../../api-client/api';
import { useFieldControl } from './control/useFieldControl';
import { FieldActions, type FieldActionKind, type FieldActionRequest } from './control/FieldActions';
import { DriverDashboard } from './control/DriverDashboard';
import { OfflineMapControl } from './control/OfflineMapControl';
import { useDeviceStatus } from './control/useDeviceStatus';
import { fieldApi, type FieldCustomer, type QueuedAction, type RegionTrek } from './control/api';
import { FlatConfirmDialog } from '../../components/overlay/FlatConfirmDialog';
import { FlatModal } from '../../components/overlay/FlatModal';
import { CustomerModal, CustomerLocationModal } from '../portal/customers/components/CustomerModal';
import { fmtGhs, parseNumericInput } from '../../lib/utils';

type DeliveryRow = {
  basicQtyDelivered: string;
  packagingQtyDelivered: string;
  paymentMethod: string;
  amtPaid: string;
  balance: string;
  notes: string;
};

type CustomerListRow = FieldCustomer & { syncStatus?: 'pending' | 'conflict'; syncReason?: string };
type ProductLedgerRow = DriverStopProduct & { queuedSale?: QueuedAction; displayRow?: Partial<DeliveryRow> };
type ReturnLedgerRow = DriverReturn & { queuedReturn?: QueuedAction; queuedVoid?: QueuedAction };

function customerForModal(customer: FieldCustomer, districts: { id: string; name: string; regionId: string }[]): Customer {
  const location = customer.primaryLocation ?? (customer.districtId || customer.streetAddress || customer.landmarkAndDirections
    || customer.latitude != null || customer.longitude != null ? {
      districtId: customer.districtId,
      streetAddress: customer.streetAddress,
      landmarkAndDirections: customer.landmarkAndDirections,
      latitude: customer.latitude,
      longitude: customer.longitude,
      accuracyMetres: customer.accuracyMetres,
    } : null);
  const mapLocation = (item: NonNullable<FieldCustomer['primaryLocation']>, primary: boolean): CustomerLocation => ({
    id: item.id || '',
    locationType: (item.locationType || 'BusinessPremises') as CustomerLocation['locationType'],
    regionId: item.regionId ?? customer.regionId ?? districts.find((district) => district.id === item.districtId)?.regionId ?? null,
    regionName: item.regionName ?? customer.regionName ?? null,
    districtId: item.districtId ?? null,
    districtName: item.districtName ?? districts.find((district) => district.id === item.districtId)?.name ?? null,
    streetAddress: item.streetAddress ?? null,
    landmarkAndDirections: item.landmarkAndDirections ?? null,
    latitude: item.latitude ?? null,
    longitude: item.longitude ?? null,
    accuracyMetres: item.accuracyMetres ?? null,
    captureMethod: item.captureMethod || '',
    verificationStatus: item.verificationStatus || '',
    isPrimary: primary,
  });
  const representativeName = [customer.primaryContactFirstName, customer.primaryContactMiddleName, customer.primaryContactLastName]
    .filter(Boolean).join(' ') || customer.primaryContactName || '';
  return {
    id: customer.id,
    customerCode: customer.customerCode || '',
    businessName: customer.businessName,
    tradingName: customer.tradingName || undefined,
    customerType: (customer.customerType || 'Other') as Customer['customerType'],
    registrationStatus: (customer.registrationStatus || 'Active') as Customer['registrationStatus'],
    primaryPhoneNumber: customer.primaryPhoneNumber,
    whatsAppNumber: customer.whatsAppNumber || undefined,
    regionId: customer.regionId || districts[0]?.regionId || '',
    regionName: customer.regionName || '',
    createdAt: '',
    premisesPhotoUrl: customer.premisesPhotoUrl,
    primaryPerson: customer.primaryPerson || (representativeName ? {
      id: customer.primaryPersonId || '',
      fullName: representativeName,
      relationshipType: (customer.primaryContactRelationshipType || 'Owner') as NonNullable<Customer['primaryPerson']>['relationshipType'],
      primaryPhoneNumber: customer.primaryContactPhone || '',
      isPrimaryContact: true,
      isCreditResponsiblePerson: false,
      portraitUrl: customer.portraitUrl || undefined,
    } : undefined),
    primaryLocation: location ? mapLocation(location, true) : undefined,
    additionalLocations: (customer.additionalLocations ?? customer.locations ?? []).map((item) => mapLocation(item, false)),
  };
}

const PAYMENT_OPTIONS = [
  { label: '—', value: '' },
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

const numberInputValue = (value?: string) => value ? parseNumericInput(value) : null;
const numberRowValue = (value: number | null) => value == null ? '' : String(value);

function queuedActionSummary(action: QueuedAction): string {
  const payload = action.payload;
  if (action.type === 'RecordDelivery') return `Product ${String(payload.stopProductId || '')} · ${String(payload.basicQtyDelivered ?? 0)} basic units`;
  if (action.type === 'RecordUnplannedSale') return `Product ${String(payload.productId || '')} · ${String(payload.basicQtyDelivered ?? 0)} basic units`;
  if (action.type === 'RecordReturn') return `Product ${String(payload.productId || '')} · ${String(payload.basicQtyReturned ?? 0)} basic units`;
  if (action.type === 'AddWalkInStop') return `Sequence ${String(payload.sequence || '')}`;
  if (action.type === 'RegisterCustomer') return String(payload.businessName || 'New customer');
  if (action.type === 'UpdateCustomer') return `Customer ${String(payload.customerId || '')}`;
  if (action.type === 'AddCustomerLocation') return `Customer location ${String(payload.customerId || payload.customerClientId || '')}`;
  if (action.type === 'UpdateCustomerLocation') return `Location ${String(payload.locationId || payload.locationClientId || '')}`;
  if (action.type === 'VoidReturn') return `Return ${String(payload.returnId || payload.returnClientId || '')}`;
  return '';
}

const calculateDeliveredAmount = (product: DriverStop['products'][number], row: Partial<DeliveryRow>) => {
  const basic = parseNumericInput(row.basicQtyDelivered);
  const packaging = parseNumericInput(row.packagingQtyDelivered);
  return (Number.isFinite(basic) ? basic : 0) * Number(product.basicUnitPrice || 0)
    + (Number.isFinite(packaging) ? packaging : 0) * Number(product.packagingUnitPrice || 0);
};

function deliveryRowFromProduct(p: DriverStopProduct): DeliveryRow {
  return {
    basicQtyDelivered: p.basicQtyDelivered != null ? String(p.basicQtyDelivered) : '',
    packagingQtyDelivered: p.packagingQtyDelivered != null ? String(p.packagingQtyDelivered) : '',
    paymentMethod: p.paymentMethod ?? '',
    amtPaid: p.amtPaid != null ? String(p.amtPaid) : '',
    balance: p.balance != null ? String(p.balance) : '',
    notes: p.notes ?? '',
  };
}

function initRows(trek: DriverTrek): Record<string, DeliveryRow> {
  const rows: Record<string, DeliveryRow> = {};
  trek.stops.forEach((stop) =>
    stop.products.forEach((p) => {
      rows[p.stopProductId] = deliveryRowFromProduct(p);
    })
  );
  return rows;
}

const InfoRow: React.FC<{ label: string; value?: string | null; mono?: boolean }> = ({ label, value, mono }) => {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-portal-border/30 last:border-0">
      <span className="text-[11px] text-portal-muted shrink-0">{label}</span>
      <span className={`text-[11px] text-portal-text text-right ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
};

// ── Stop card ─────────────────────────────────────────────────────────────────

interface StopCardProps {
  stop: DriverStop;
  rows: Record<string, DeliveryRow>;
  locked: boolean;
  onRowChange: (spId: string, field: keyof DeliveryRow, value: string) => void;
  onRecordProduct: (product: DriverStopProduct) => Promise<boolean>;
  recordingProduct: string | null;
  onVoid: (stopId: string, returnId: string) => void | Promise<void>;
  onFieldAction: (kind: FieldActionKind, stopId: string) => void;
  queuedReturns: QueuedAction[];
  queuedVoids: QueuedAction[];
  queuedSales: QueuedAction[];
  queuedDeliveries: QueuedAction[];
  queuedStop?: QueuedAction;
  products: Product[];
  onRemoveQueued: (clientId: string) => Promise<void>;
  onCancelQueuedDelivery: (product: DriverStopProduct, actions: QueuedAction[]) => Promise<void>;
  syncing: boolean;
}

const StopCard: React.FC<StopCardProps> = ({ stop, rows, locked, onRowChange, onRecordProduct, recordingProduct, onVoid, onFieldAction, queuedReturns, queuedVoids, queuedSales, queuedDeliveries, queuedStop, products, onRemoveQueued, onCancelQueuedDelivery, syncing }) => {
  const [expanded, setExpanded] = useState(Boolean(queuedStop));
  const [activeStopTab, setActiveStopTab] = useState<'products' | 'details' | 'returns'>('products');
  const [editingProduct, setEditingProduct] = useState<DriverStopProduct | null>(null);
  const [returnToRemove, setReturnToRemove] = useState<{ stopId: string; returnId: string; productName: string } | null>(null);
  const hasProducts = stop.products.length > 0;
  const isRecorded = hasProducts && stop.products.every((p) => p.basicQtyDelivered != null || p.packagingQtyDelivered != null);
  const pendingActionCount = queuedSales.length + queuedReturns.length + queuedDeliveries.length + queuedVoids.length;
  const pendingDeliveryFor = (product: DriverStopProduct) => queuedDeliveries.filter(
    (action) => action.payload.stopProductId === product.stopProductId);
  const displayRowFor = (product: DriverStopProduct): Partial<DeliveryRow> => {
    const pending = pendingDeliveryFor(product).at(-1);
    if (!pending) return rows[product.stopProductId] ?? {};
    const payload = pending.payload;
    return {
      ...deliveryRowFromProduct(product),
      ...(payload.basicQtyDelivered != null ? { basicQtyDelivered: String(payload.basicQtyDelivered) } : {}),
      ...(payload.packagingQtyDelivered != null ? { packagingQtyDelivered: String(payload.packagingQtyDelivered) } : {}),
      ...(payload.paymentMethod != null ? { paymentMethod: String(payload.paymentMethod) } : {}),
      ...(payload.amtPaid != null ? { amtPaid: String(payload.amtPaid) } : { amtPaid: '' }),
      ...(payload.notes != null ? { notes: String(payload.notes) } : {}),
    };
  };
  const productRows: ProductLedgerRow[] = [
    ...stop.products.map((product) => ({ ...product, displayRow: displayRowFor(product) })),
    ...queuedSales.map((action): ProductLedgerRow => {
      const product = products.find((item) => item.id === action.payload.productId);
      return {
        stopProductId: action.clientId,
        productName: product?.name || 'Product',
        basicUnitName: product?.basicUnitName || 'basic units',
        packagingUnitName: product?.packagingUnitName || null,
        basicUnitPrice: Number(product?.basicUnitPrice ?? 0),
        packagingUnitPrice: product?.packagingUnitPrice ?? null,
        plannedBasicQuantity: 0,
        plannedPackagingQuantity: null,
        basicQtyDelivered: Number(action.payload.basicQtyDelivered ?? 0),
        packagingQtyDelivered: action.payload.packagingQtyDelivered == null ? null : Number(action.payload.packagingQtyDelivered),
        paymentMethod: (action.payload.paymentMethod as PaymentMethod) || null,
        isUnplanned: true,
        queuedSale: action,
      };
    }),
  ];
  const returnRows: ReturnLedgerRow[] = [
    ...(stop.returns ?? []).map((item) => ({
      ...item,
      queuedVoid: queuedVoids.find((action) => action.payload.returnId === item.returnId),
    })),
    ...queuedReturns.map((action): ReturnLedgerRow => {
      const product = products.find((item) => item.id === action.payload.productId);
      return {
        returnId: action.clientId,
        productId: String(action.payload.productId || ''),
        productName: product?.name || 'Product',
        basicUnitName: product?.basicUnitName || 'basic units',
        packagingUnitName: product?.packagingUnitName || null,
        basicQtyReturned: Number(action.payload.basicQtyReturned ?? 0),
        packagingQtyReturned: action.payload.packagingQtyReturned == null ? null : Number(action.payload.packagingQtyReturned),
        basicUnitPrice: Number(product?.basicUnitPrice ?? 0),
        packagingUnitPrice: product?.packagingUnitPrice ?? null,
        refundAmount: action.payload.refundAmount == null ? null : Number(action.payload.refundAmount),
        refundMethod: (action.payload.refundMethod as PaymentMethod) || null,
        reason: action.payload.reason == null ? null : String(action.payload.reason),
        recordedAt: action.occurredAt,
        queuedReturn: action,
        queuedVoid: queuedVoids.find((item) => item.payload.returnClientId === action.clientId),
      };
    }),
  ].sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());

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
          <span className="min-w-0 truncate text-[13px] font-medium text-portal-text sm:text-sm">{stop.customerName}</span>
          {queuedStop && <span className={`shrink-0 text-[11px] ${queuedStop.status === 'conflict' ? 'text-red-accent' : 'text-portal-accent'}`} title={queuedStop.reason}>{queuedStop.status === 'conflict' ? 'Needs review' : 'Awaiting sync'}</span>}
          {pendingActionCount > 0 && <span className="shrink-0 text-[11px] text-portal-muted">{pendingActionCount} pending</span>}
          <span className="w-px h-3.5 bg-portal-border shrink-0" />
          <span className="hidden font-mono text-[11px] text-portal-muted sm:inline">{stop.customerCode}</span>
          {isRecorded && (
            <>
              <span className="hidden w-px h-3.5 bg-portal-border shrink-0 sm:inline" />
                <span className="shrink-0 text-[11px] text-portal-muted flex items-center gap-1">
                <i className="pi pi-check text-[10px]" />
                <span>Recorded</span>
              </span>
            </>
          )}
          {stop.isWalkIn && <span className="hidden shrink-0 text-[11px] text-portal-muted md:inline">Additional stop</span>}
          <i className={`pi pi-chevron-down ml-auto shrink-0 text-xs text-portal-muted transition-transform duration-300 motion-reduce:transition-none ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
        {queuedStop && <button type="button" className="shrink-0 text-[11px] text-portal-muted hover:text-red-accent disabled:opacity-40" disabled={syncing || locked} onClick={() => void onRemoveQueued(queuedStop.clientId)}>Cancel stop</button>}
        {stop.primaryPhoneNumber && <a href={`tel:${stop.primaryPhoneNumber}`} aria-label={`Call ${stop.customerName}`} className="flex h-10 w-10 shrink-0 items-center justify-center text-portal-muted hover:text-portal-heading focus-visible:outline focus-visible:outline-2 focus-visible:outline-portal-accent"><i className="pi pi-phone text-sm" aria-hidden="true" /></a>}
      </div>

      <div
        id={`stop-details-${stop.stopId}`}
        aria-hidden={!expanded}
        inert={!expanded}
        className={`grid transition-[grid-template-rows,margin] duration-300 ease-in-out motion-reduce:transition-none ${expanded ? 'mt-3 grid-rows-[1fr]' : 'mt-0 grid-rows-[0fr]'}`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-4 border-t border-portal-border/40 pt-4">
      <div className="flex flex-wrap gap-2 items-center">
        {!locked && <>
          <FlatButton size="sm" variant="ghost" className="!border-portal-accent/40 !bg-portal-accent/10 !text-portal-accent hover:!bg-portal-accent/20" onClick={() => onFieldAction('sale', stop.stopId)}>Unplanned sale</FlatButton>
          <FlatButton size="sm" variant="ghost" className="!border-portal-orange/40 !bg-portal-orange/10 !text-portal-orange hover:!bg-portal-orange/20" onClick={() => onFieldAction('return', stop.stopId)}>Record return</FlatButton>
        </>}
      </div>
      <div className="flex items-center gap-1 border-b border-portal-border/50" role="tablist" aria-label={`${stop.customerName} sections`}>
        <button type="button" role="tab" aria-selected={activeStopTab === 'products'} onClick={() => setActiveStopTab('products')} className={`border-b-2 px-3 py-2 text-xs font-medium transition-colors ${activeStopTab === 'products' ? 'border-portal-accent text-portal-accent' : 'border-transparent text-portal-muted hover:text-portal-text'}`}>Products</button>
        <button type="button" role="tab" aria-selected={activeStopTab === 'details'} onClick={() => setActiveStopTab('details')} className={`border-b-2 px-3 py-2 text-xs font-medium transition-colors ${activeStopTab === 'details' ? 'border-portal-accent text-portal-accent' : 'border-transparent text-portal-muted hover:text-portal-text'}`}>Customer details</button>
        <button type="button" role="tab" aria-selected={activeStopTab === 'returns'} onClick={() => setActiveStopTab('returns')} className={`border-b-2 px-3 py-2 text-xs font-medium transition-colors ${activeStopTab === 'returns' ? 'border-portal-orange text-portal-orange' : 'border-transparent text-portal-muted hover:text-portal-text'}`}>Returns{returnRows.length ? ` (${returnRows.length})` : ''}</button>
      </div>
      {activeStopTab === 'details' && <>
      {/* Info grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 py-2">
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
          {stop.latitude != null && stop.longitude != null && (
            <a
              href={`https://www.google.com/maps?q=${encodeURIComponent(`${stop.latitude},${stop.longitude}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-portal-accent hover:text-portal-accent-hover"
            >
              <i className="pi pi-map-marker text-[10px]" aria-hidden="true" />
              Open in Maps
              {stop.accuracyMetres != null && <span className="text-portal-muted">· ±{Math.round(stop.accuracyMetres)} m</span>}
            </a>
          )}
        </div>
      </div>
      </>}

      {activeStopTab === 'products' && <>
      {/* Products listing */}
      {!!productRows.length && (
        <FlatDataTable
          data={productRows}
          enablePaginator={false}
          enableTableFilter={false}
          emptyDataText="No products recorded for this stop."
          columns={[
            { field: 'productName', header: 'Product', body: (product) => <><span className="block text-xs font-medium text-portal-text">{product.productName}</span><span className="mt-1.5 block text-[11px] font-normal text-portal-muted">{fmtGhs(Number(product.basicUnitPrice))} / {product.basicUnitName || 'basic unit'}{product.packagingUnitName && product.packagingUnitPrice != null ? ` · ${fmtGhs(Number(product.packagingUnitPrice))} / ${product.packagingUnitName}` : ''}</span></> },
            { field: 'planned', header: 'Planned', body: (product) => product.queuedSale ? <span className="text-[11px] text-portal-muted">Unplanned sale</span> : <><span className="text-xs text-portal-text">{product.packagingUnitName && Number(product.plannedPackagingQuantity || 0) > 0 ? `${product.plannedPackagingQuantity} ${product.packagingUnitName} · ` : ''}{product.plannedBasicQuantity} {product.basicUnitName || 'basic units'}</span><span className="mt-1 block text-[10px] text-portal-muted">Due · {fmtGhs(Number(product.amountDue ?? 0))}</span></> },
            { field: 'delivered', header: 'Delivered', body: (product) => { const row = product.queuedSale ? { basicQtyDelivered: String(product.basicQtyDelivered ?? ''), packagingQtyDelivered: String(product.packagingQtyDelivered ?? '') } : product.displayRow ?? displayRowFor(product); return <span className="text-xs text-portal-text">{row.packagingQtyDelivered && parseNumericInput(row.packagingQtyDelivered) > 0 ? `${row.packagingQtyDelivered} ${product.packagingUnitName} · ` : ''}{row.basicQtyDelivered && parseNumericInput(row.basicQtyDelivered) > 0 ? `${row.basicQtyDelivered} ${product.basicUnitName || 'basic units'}` : '—'}</span>; } },
            { field: 'paymentMethod', header: 'Payment', body: (product) => <span className="text-xs text-portal-text">{PAYMENT_OPTIONS.find((option) => option.value === (product.queuedSale ? product.paymentMethod : (product.displayRow ?? displayRowFor(product)).paymentMethod))?.label || '—'}</span> },
            { field: 'total', header: 'Total', body: (product) => <span className="text-xs text-portal-accent">{fmtGhs(calculateDeliveredAmount(product, product.queuedSale ? { basicQtyDelivered: String(product.basicQtyDelivered ?? ''), packagingQtyDelivered: String(product.packagingQtyDelivered ?? '') } : product.displayRow ?? displayRowFor(product)))}</span> },
            { field: 'actions', header: 'Record', body: (product) => {
              if (product.queuedSale) return <div className="flex flex-col items-start gap-1"><span className={`text-[11px] ${product.queuedSale.status === 'conflict' ? 'text-red-accent' : 'text-portal-accent'}`}>{product.queuedSale.status === 'conflict' ? 'Needs review' : 'Awaiting sync'}</span><button type="button" className="text-[11px] text-portal-muted hover:text-red-accent disabled:opacity-40" disabled={syncing || locked} onClick={() => void onRemoveQueued(product.queuedSale!.clientId)}>Cancel</button></div>;
              const pending = pendingDeliveryFor(product);
              return pending.length ? (
                <div className="flex flex-col items-start gap-1">
                  <span className={`text-[11px] ${pending.some((action) => action.status === 'conflict') ? 'text-red-accent' : 'text-portal-accent'}`}>
                    {pending.some((action) => action.status === 'conflict') ? 'Needs review' : 'Awaiting sync'}
                  </span>
                  <button type="button" className="text-[11px] text-portal-muted hover:text-red-accent disabled:opacity-40" disabled={syncing} onClick={() => void onCancelQueuedDelivery(product, pending)}>Cancel</button>
                </div>
              ) : <button type="button" className="inline-flex h-7 w-7 items-center justify-center rounded text-portal-muted hover:bg-white/[0.08] hover:text-portal-accent disabled:opacity-40" title={product.isUnplanned ? 'Edit unplanned sale' : 'Record delivery'} aria-label={`${product.isUnplanned ? 'Edit' : 'Record'} ${product.productName} delivery`} disabled={locked} onClick={() => setEditingProduct(product)}><i className="pi pi-pencil text-xs" /></button>;
            } },
          ]}
        />
      )}
      {!productRows.length && <p className="py-6 text-center text-[11px] text-portal-muted">No products recorded for this stop.</p>}
      </>}
      {activeStopTab === 'returns' && <div className="space-y-3">
        <FlatDataTable
          data={returnRows}
          enablePaginator={false}
          enableTableFilter={returnRows.length > 4}
          filterablePlaceholder="Search returns..."
          emptyDataText="No returns recorded for this stop."
          columns={[
            { field: 'productName', header: 'Product', body: (item) => <span className="text-xs text-portal-text">{item.productName}</span> },
            { field: 'quantities', header: 'Returned', body: (item) => <span className="text-xs text-portal-text">{item.packagingQtyReturned ? `${item.packagingQtyReturned} ${item.packagingUnitName} · ` : ''}{item.basicQtyReturned} {item.basicUnitName}</span> },
            { field: 'refundAmount', header: 'Refund', body: (item) => <span className="text-xs text-portal-text">{fmtGhs(item.refundAmount)}</span> },
            { field: 'refundMethod', header: 'Method', body: (item) => <span className="text-xs text-portal-text">{item.refundMethod || '—'}</span> },
            { field: 'reason', header: 'Reason', body: (item) => <span className="text-[11px] text-portal-muted">{item.reason || '—'}</span> },
            { field: 'recordedAt', header: 'Recorded', body: (item) => <span className="text-[11px] text-portal-muted">{item.recordedAt ? new Date(item.recordedAt).toLocaleString() : '—'}</span> },
            { field: 'actions', header: 'Action', body: (item) => {
              if (item.queuedReturn || item.queuedVoid) {
                const action = item.queuedReturn || item.queuedVoid!;
                return <div className="flex flex-col items-start gap-1"><span className={`text-[11px] ${action.status === 'conflict' ? 'text-red-accent' : 'text-portal-orange'}`}>{action.status === 'conflict' ? 'Needs review' : item.queuedVoid ? 'Removal pending' : 'Awaiting sync'}</span><button type="button" className="text-[11px] text-portal-muted hover:text-red-accent disabled:opacity-40" disabled={syncing || locked} onClick={() => void onRemoveQueued(action.clientId)}>Cancel</button></div>;
              }
              return !locked ? <button type="button" className="inline-flex h-7 w-7 items-center justify-center rounded text-portal-muted hover:bg-red-accent/10 hover:text-red-accent" title="Remove return" aria-label={`Remove return for ${item.productName}`} onClick={() => setReturnToRemove({ stopId: stop.stopId, returnId: item.returnId, productName: item.productName })}><i className="pi pi-trash text-xs" /></button> : null;
            } },
          ]}
        />
      </div>}
          </div>
        </div>
      </div>

      {editingProduct && (() => {
        const row = rows[editingProduct.stopProductId] ?? { basicQtyDelivered: '', packagingQtyDelivered: '', paymentMethod: '', amtPaid: '', balance: '', notes: '' };
        const calculatedTotal = calculateDeliveredAmount(editingProduct, row);
        const paid = row.amtPaid === '' ? null : parseNumericInput(row.amtPaid);
        const balance = paid == null || !Number.isFinite(paid) ? 0 : Math.max(0, calculatedTotal - paid);
        const saving = recordingProduct === editingProduct.stopProductId;
        return <FlatModal visible onHide={() => setEditingProduct(null)} title={`Record ${editingProduct.productName}`} subtitle="Delivery, payment and notes" size="md" footer={<div className="flex items-center justify-end gap-2"><FlatButton variant="outline" size="sm" onClick={() => setEditingProduct(null)}>Cancel</FlatButton><FlatButton size="sm" loading={saving} disabled={saving || locked} onClick={async () => { const saved = await onRecordProduct(editingProduct); if (saved) setEditingProduct(null); }}>Save changes</FlatButton></div>}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 rounded border border-portal-border/50 bg-portal-canvas/50 px-3 py-2"><div><span className="block text-[10px] uppercase tracking-wider text-portal-muted">Planned</span><span className="text-xs text-portal-text">{editingProduct.packagingUnitName && Number(editingProduct.plannedPackagingQuantity || 0) > 0 ? `${editingProduct.plannedPackagingQuantity} ${editingProduct.packagingUnitName} · ` : ''}{editingProduct.plannedBasicQuantity} {editingProduct.basicUnitName || 'basic units'}</span></div><div><span className="block text-[10px] uppercase tracking-wider text-portal-muted">Due</span><span className="text-xs text-portal-accent">{fmtGhs(Number(editingProduct.amountDue ?? 0))}</span></div></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FlatInputNumber id={`${editingProduct.stopProductId}-basic-driver-modal`} label={`${editingProduct.basicUnitName || 'Basic'} delivered`} min={0} maxFractionDigits={2} useGrouping size="sm" value={numberInputValue(row.basicQtyDelivered)} onChange={(value) => onRowChange(editingProduct.stopProductId, 'basicQtyDelivered', numberRowValue(value))} onInput={(event) => onRowChange(editingProduct.stopProductId, 'basicQtyDelivered', (event.target as HTMLInputElement).value)} disabled={locked} />
              {editingProduct.packagingUnitName && <FlatInputNumber id={`${editingProduct.stopProductId}-packaging-driver-modal`} label={`${editingProduct.packagingUnitName} delivered`} min={0} maxFractionDigits={2} useGrouping size="sm" value={numberInputValue(row.packagingQtyDelivered)} onChange={(value) => onRowChange(editingProduct.stopProductId, 'packagingQtyDelivered', numberRowValue(value))} onInput={(event) => onRowChange(editingProduct.stopProductId, 'packagingQtyDelivered', (event.target as HTMLInputElement).value)} disabled={locked} />}
              <FlatDropdown id={`${editingProduct.stopProductId}-payment-driver-modal`} label="Payment method" options={PAYMENT_OPTIONS} value={row.paymentMethod} onChange={(value) => onRowChange(editingProduct.stopProductId, 'paymentMethod', value ?? '')} disabled={locked} size="sm" />
              <FlatInputNumber id={`${editingProduct.stopProductId}-amt-paid-driver-modal`} label="Amount paid (optional)" min={0} maxFractionDigits={2} useGrouping size="sm" value={numberInputValue(row.amtPaid)} onChange={(value) => onRowChange(editingProduct.stopProductId, 'amtPaid', numberRowValue(value))} disabled={locked} />
            </div>
            <div className="grid grid-cols-2 gap-3 rounded border border-portal-border/50 bg-portal-surface px-3 py-2"><div><span className="block text-[10px] uppercase tracking-wider text-portal-muted">Calculated total</span><span className="text-sm font-semibold text-portal-accent">{fmtGhs(calculatedTotal)}</span></div><div><span className="block text-[10px] uppercase tracking-wider text-portal-muted">Balance</span><span className="text-sm font-semibold text-portal-text">{fmtGhs(balance)}</span></div></div>
            <FlatInputText id={`${editingProduct.stopProductId}-notes-driver-modal`} label="Delivery note" value={row.notes} onChange={(event) => onRowChange(editingProduct.stopProductId, 'notes', event.target.value)} placeholder="Optional delivery note..." size="sm" />
          </div>
        </FlatModal>;
      })()}
      <FlatConfirmDialog
        visible={returnToRemove !== null}
        onHide={() => setReturnToRemove(null)}
        onConfirm={async () => {
          if (!returnToRemove) return;
          await onVoid(returnToRemove.stopId, returnToRemove.returnId);
          setReturnToRemove(null);
        }}
        title="Remove return?"
        message={`Remove the recorded return for ${returnToRemove?.productName ?? 'this product'}? This action cannot be undone.`}
        confirmLabel="Remove return"
        variant="danger"
        icon="pi pi-trash"
      />
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
  const [sessionRemembered, setSessionRemembered] = useState(() => {
    try { return Boolean(localStorage.getItem('portalSession')); } catch { return false; }
  });
  useEffect(() => {
    if (!token) return;
    const cached = localStorage.getItem('portalSession');
    if (!cached) {
      setSessionRemembered(false);
      return;
    }
    try {
      const session = JSON.parse(cached) as Record<string, unknown>;
      localStorage.setItem('portalSession', JSON.stringify({ ...session, driverToken: token }));
      setSessionRemembered(true);
    } catch {
      localStorage.removeItem('portalSession');
      setSessionRemembered(false);
    }
  }, [token]);
  const driverHref = (section?: string, extras?: Record<string, string>) => {
    const params = new URLSearchParams({ token, ...extras });
    return `/treks/driver${section ? `/${section}` : ''}?${params.toString()}`;
  };

  const { trek, products, customers, districts, regionTreks, assignedTreks, queue, photoQueue, loading, syncing, refreshing, uploadingPhotos, online, error, controlAvailable, lastSyncedAt, refresh, syncProducts, uploadCustomerPremisesPhoto, uploadCustomerPortrait, sync, completeTrek, enqueue, rememberCustomerLocation, queuePhoto, retry, remove, removePhoto, retryPhoto } = useFieldControl(token);
  const { device, phoneAddress, weather, deviceUnavailable, reporting, locationError, sendingSos, report, sendSos } = useDeviceStatus(token);
  const [deliveryRows, setDeliveryRows] = useState<Record<string, DeliveryRow>>({});
  const [recordingProduct, setRecordingProduct] = useState<string | null>(null);
  const [assignedStopRequest, setAssignedStopRequest] = useState<FieldActionRequest | null>(null);
  const [customerRequest, setCustomerRequest] = useState<FieldActionRequest | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<FieldCustomer | null>(null);
  const editingCustomerModal = useMemo(() => editingCustomer ? customerForModal(editingCustomer, districts) : null, [editingCustomer, districts]);
  const [locationCustomer, setLocationCustomer] = useState<FieldCustomer | null>(null);
  const [editingLocation, setEditingLocation] = useState<CustomerLocation | null>(null);
  const [trekListTab, setTrekListTab] = useState<'mine' | 'region'>('region');
  const [trekToSwitch, setTrekToSwitch] = useState<RegionTrek | null>(null);
  const [switchingTrek, setSwitchingTrek] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [completingTrek, setCompletingTrek] = useState(false);
  const switchTrek = async (trekId: string): Promise<boolean> => {
    if (!navigator.onLine) { toast.error('Online required to switch.'); return false; }
    try {
      const result = await fieldApi.generateTrekToken(token, trekId);
      window.location.assign(result.url);
      return true;
    } catch (switchError: any) {
      toast.error(switchError.response?.data?.detail || switchError.response?.data?.message || 'Could not open this trek.');
      return false;
    }
  };
  const confirmTrekSwitch = async () => {
    if (!trekToSwitch) return;
    setSwitchingTrek(true);
    try {
      if (await switchTrek(trekToSwitch.trekId)) setTrekToSwitch(null);
    } finally { setSwitchingTrek(false); }
  };
  useEffect(() => { if (view !== 'assigned') setAssignedStopRequest(null); }, [view]);
  useEffect(() => { if (view !== 'customers') setCustomerRequest(null); }, [view]);
  const actionRequest: FieldActionRequest | null = view === 'actions' && searchParams.has('kind') ? {
    kind: searchParams.get('kind') as FieldActionKind,
    trekId: searchParams.get('trekId') || undefined,
    stopId: searchParams.get('stopId') || undefined,
    nonce: Number(searchParams.get('nonce') || 0),
  } : null;
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

  const cancelQueuedDelivery = useCallback(async (product: DriverStopProduct, actions: QueuedAction[]) => {
    for (const action of actions) await remove(action.clientId);
    setDeliveryRows((prev) => ({ ...prev, [product.stopProductId]: deliveryRowFromProduct(product) }));
  }, [remove]);

  const handleRecordProduct = useCallback(async (product: DriverStopProduct): Promise<boolean> => {
    const row = deliveryRows[product.stopProductId] ?? {};
    const basic = !row.basicQtyDelivered ? null : parseNumericInput(row.basicQtyDelivered);
    const packaging = !row.packagingQtyDelivered ? null : parseNumericInput(row.packagingQtyDelivered);
    if (basic === null && packaging === null) { toast.error(`Enter a delivered quantity for "${product.productName}".`); return false; }
    if ((basic !== null && (!Number.isFinite(basic) || basic < 0)) || (packaging !== null && (!product.packagingUnitName || !Number.isFinite(packaging) || packaging < 0))) { toast.error(`Enter valid delivered quantities for "${product.productName}".`); return false; }
    if (!row.paymentMethod) { toast.error(`Payment method is required for "${product.productName}".`); return false; }
    setRecordingProduct(product.stopProductId);
    const payload = { stopProductId: product.stopProductId, basicQtyDelivered: basic ?? undefined, packagingQtyDelivered: product.packagingUnitName && packaging !== null ? packaging : undefined, paymentMethod: row.paymentMethod as PaymentMethod, ...(row.amtPaid !== '' && row.amtPaid != null ? { amtPaid: parseNumericInput(row.amtPaid), balance: Math.max(0, calculateDeliveredAmount(product, row) - parseNumericInput(row.amtPaid)) } : {}), notes: row.notes || undefined };
    try {
      if (!controlAvailable) {
        if (!online) { toast.error('Connect to record this delivery.'); return false; }
        await treksApi.recordByDriverToken(token, { products: [payload] });
        resetTableData();
        await refresh(true);
        toast.success(`${product.productName} delivery saved.`);
      } else {
        await enqueue('RecordDelivery', payload);
        toast.success(`${product.productName} saved on this device.`);
      }
      return true;
    } catch { toast.error('Could not save delivery.'); return false; }
    finally { setRecordingProduct(null); }
  }, [deliveryRows, enqueue, controlAvailable, online, token, refresh]);

  const handleVoid = useCallback(async (_stopId: string, returnId: string) => {
    try { await enqueue('VoidReturn', { returnId }); toast.success('Return void saved on this device.'); }
    catch { toast.error('Could not save return void.'); }
  }, [enqueue]);

  // ── Render states ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="h-dvh bg-portal-canvas flex items-center justify-center">
        <span className="text-xs text-portal-muted flex items-center gap-2">
          <i className="pi pi-spin pi-spinner" /> Loading...
        </span>
      </div>
    );
  }

  if (!trek) {
    return (
      <div className="h-dvh bg-portal-canvas flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-sm font-semibold text-portal-text mb-1">Field data unavailable</p>
          <p className="text-xs text-portal-muted">{error || 'Connect once to download this trek.'}</p>
        </div>
      </div>
    );
  }

  const sortedStops = [...trek.stops].sort((a, b) => a.sequence - b.sequence);
  const queuedStops = queue.filter((action) => action.type === 'AddWalkInStop' && action.status !== 'synced' && action.payload.trekId === trek.trekId);
  const registeredCustomerActions = queue
    .filter((action) => action.type === 'RegisterCustomer')
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  const locallyCreatedCustomerIds = new Map(
    registeredCustomerActions
      .filter((action) => action.serverId)
      .map((action, index) => [action.serverId as string, index])
  );
  const orderedCustomers = [...customers].sort((a, b) => {
    const aIndex = locallyCreatedCustomerIds.get(a.id);
    const bIndex = locallyCreatedCustomerIds.get(b.id);
    if (aIndex == null && bIndex == null) return 0;
    if (aIndex == null) return 1;
    if (bIndex == null) return -1;
    return aIndex - bIndex;
  });
  const customerRows: CustomerListRow[] = [
    ...registeredCustomerActions.filter((action) => action.status !== 'synced').map((action) => ({
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
    ...orderedCustomers,
  ];
  const nextStopSequence = Math.max(0, ...sortedStops.map((stop) => stop.sequence), ...queuedStops.map((action) => Number(action.payload.sequence) || 0)) + 1;
  const visibleTreks = regionTreks.length ? regionTreks : [{ trekId: trek.trekId, trekNumber: trek.trekNumber, scheduledDate: trek.scheduledDate,
    status: trek.status, driverName: trek.driverName, salesStaffName: trek.salesStaffName, regionName: trek.regionName, stopsCount: trek.stops.length }];
  const pendingCount = queue.filter((action) => action.status === 'pending').length + photoQueue.filter((photo) => photo.status === 'pending').length;
  const isStopRecorded = (s: DriverStop) =>
    s.products.length > 0 &&
    s.products.every((p) => p.basicQtyDelivered != null || p.packagingQtyDelivered != null);

  const keepDriverSession = () => {
    const session: PortalSession = {
      driverToken: token,
      trekId: trek.trekId,
      trekNumber: trek.trekNumber,
      regionName: trek.regionName,
      scheduledDate: trek.scheduledDate,
      status: trek.status,
      driver: { id: '', name: trek.driverName, phone: '' },
      salesRep: trek.salesStaffName ? { id: trek.salesStaffId || '', name: trek.salesStaffName, phone: '' } : null,
    };
    localStorage.setItem('portalSession', JSON.stringify(session));
    setSessionRemembered(true);
    toast.success('This trek will be remembered on this device.');
  };

  const logoutDriverSession = () => {
    localStorage.removeItem('portalSession');
    setSessionRemembered(false);
    navigate('/login', { replace: true });
  };

  return (
    <div className="driver-page-shell flex h-dvh flex-col overflow-hidden bg-portal-canvas">
      <div className="min-h-0 w-full flex-1">
        <DriverDashboard
          trek={trek}
          customers={customers}
          regionalCount={regionTreks.length || null}
          pendingCount={pendingCount}
          queue={queue}
          photoQueue={photoQueue}
          products={products}
          controlAvailable={controlAvailable}
          syncBusy={syncing || refreshing || uploadingPhotos || completingTrek}
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
          sessionRemembered={sessionRemembered}
          onKeepLoggedIn={keepDriverSession}
          onLogout={logoutDriverSession}
          renderStopsView={() => (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-portal-border/60 pb-3">
                <div>
                  <h1 className="text-sm font-semibold text-portal-text sm:text-lg">{trek.trekNumber} · Assigned Stops</h1>
                </div>
                <div className="w-full sm:w-auto">
                  <div className="grid grid-cols-3 gap-0 w-full sm:min-w-[320px] rounded overflow-hidden border border-portal-border/70 divide-x divide-portal-border/70 shadow-xs">
                    {/* 1. Add Stop (First item, highlighted green background) */}
                    <button
                      type="button"
                      disabled={trek.isLocked || trek.status !== 'InProgress'}
                      onClick={() => setAssignedStopRequest({ kind: 'stop', trekId: trek.trekId, sequence: nextStopSequence, nonce: Date.now() })}
                      className="flex h-[38px] items-center justify-center gap-1.5 px-2.5 text-xs font-semibold bg-portal-accent hover:bg-portal-accent-hover active:bg-portal-accent-hover text-white transition-colors select-none focus:outline-none focus:ring-1 focus:ring-portal-accent disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Add additional stop"
                    >
                      <i className="pi pi-plus text-xs font-bold" aria-hidden="true" />
                      <span>Add</span>
                    </button>

                    {/* 2. Complete Trek */}
                    <button
                      type="button"
                      disabled={trek.isLocked || trek.status !== 'InProgress' || !online || syncing || completingTrek}
                      onClick={() => setCompleteDialogOpen(true)}
                      className="flex h-[38px] items-center justify-center gap-1.5 px-2.5 text-xs font-semibold bg-portal-surface hover:bg-portal-hover active:bg-portal-active text-portal-text transition-colors select-none focus:outline-none focus:ring-1 focus:ring-portal-accent disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Complete trek"
                    >
                      <i className="pi pi-check-circle text-xs" aria-hidden="true" />
                      <span>Complete</span>
                    </button>

                    {/* 3. PDF Sheet (Last item) */}
                    <button
                      type="button"
                      onClick={() => window.open(`${baseURL}/treks/driver/${token}/sheet/pdf`, '_blank')}
                      className="flex h-[38px] items-center justify-center gap-1.5 px-2.5 text-xs font-semibold bg-portal-surface hover:bg-portal-hover active:bg-portal-active text-portal-text transition-colors select-none focus:outline-none focus:ring-1 focus:ring-portal-accent"
                      title="Download PDF Sheet"
                    >
                      <i className="pi pi-file-pdf text-xs font-bold text-red-400" aria-hidden="true" />
                      <span>Download</span>
                    </button>
                  </div>
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
                districts={districts}
                queue={queue}
                enqueue={enqueue}
                queuePhoto={queuePhoto}
                request={trek.isLocked ? null : assignedStopRequest}
                backendReady={controlAvailable}
                modalOnly
                fixedTrekId={trek.trekId}
                onClose={() => setAssignedStopRequest(null)}
              />

              <div id="assigned-stops" className="bg-portal-surface border border-portal-border/60 rounded overflow-hidden">
                <div className="px-4 sm:px-5 py-3 border-b border-portal-border/60 flex items-center justify-between">
                  <span className="text-sm font-semibold text-portal-text">
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
                        onRowChange={updateRow}
                        onRecordProduct={handleRecordProduct}
                        recordingProduct={recordingProduct}
                        onVoid={handleVoid}
                        onFieldAction={(kind, stopId) => { if (!trek.isLocked) setAssignedStopRequest({ kind, stopId, nonce: Date.now() }); }}
                        products={products}
                        queuedReturns={queue.filter(
                          (action) =>
                            action.type === 'RecordReturn' &&
                            action.status !== 'synced' &&
                            action.payload.stopId === stop.stopId
                        )}
                        queuedVoids={queue.filter((action) => action.type === 'VoidReturn' && action.status !== 'synced'
                          && ((stop.returns ?? []).some((item) => item.returnId === action.payload.returnId)
                            || queue.some((item) => item.type === 'RecordReturn' && item.payload.stopId === stop.stopId
                              && item.clientId === action.payload.returnClientId)))}
                        queuedSales={queue.filter((action) => action.type === 'RecordUnplannedSale' && action.status !== 'synced' && action.payload.stopId === stop.stopId)}
                        queuedDeliveries={queue.filter((action) => action.type === 'RecordDelivery' && action.status !== 'synced' && stop.products.some((product) => product.stopProductId === action.payload.stopProductId))}
                        onRemoveQueued={remove}
                        onCancelQueuedDelivery={cancelQueuedDelivery}
                        syncing={syncing}
                      />
                    ))}
                    {queuedStops.map((action) => {
                      const customer = customers.find((item) => item.id === action.payload.customerId);
                      const queuedCustomer = queue.find((item) => item.type === 'RegisterCustomer' && item.clientId === action.payload.customerClientId);
                      const queuedSales = queue.filter((queuedAction) => queuedAction.type === 'RecordUnplannedSale'
                        && queuedAction.status !== 'synced'
                        && queuedAction.payload.stopClientId === action.clientId);
                      const queuedReturnsForStop = queue.filter((queuedAction) => queuedAction.type === 'RecordReturn'
                        && queuedAction.status !== 'synced'
                        && queuedAction.payload.stopClientId === action.clientId);
                      const stop: DriverStop = {
                        stopId: action.clientId,
                        sequence: Number(action.payload.sequence) || 0,
                        customerName: customer?.businessName || String(queuedCustomer?.payload.businessName || 'Additional stop customer'),
                        customerCode: customer?.customerCode || '',
                        primaryPhoneNumber: customer?.primaryPhoneNumber || String(queuedCustomer?.payload.primaryPhoneNumber || ''),
                        regionName: customer?.regionName || trek.regionName,
                        districtName: customer?.primaryLocation?.districtName || '',
                        primaryLocationLandmark: customer?.primaryLocation?.landmarkAndDirections || '',
                        primaryLocationStreet: customer?.primaryLocation?.streetAddress || '',
                        latitude: customer?.primaryLocation?.latitude ?? null,
                        longitude: customer?.primaryLocation?.longitude ?? null,
                        accuracyMetres: customer?.primaryLocation?.accuracyMetres ?? null,
                        products: [],
                        returns: [],
                        isWalkIn: true,
                      };
                      return <StopCard
                        key={action.clientId}
                        stop={stop}
                        rows={deliveryRows}
                        locked={trek.isLocked || action.status === 'conflict'}
                        onRowChange={updateRow}
                        onRecordProduct={handleRecordProduct}
                        recordingProduct={recordingProduct}
                        onVoid={handleVoid}
                        onFieldAction={(kind) => { if (!trek.isLocked) setAssignedStopRequest({ kind, stopClientId: action.clientId, nonce: Date.now() }); }}
                        products={products}
                        queuedReturns={queuedReturnsForStop}
                        queuedVoids={queue.filter((item) => item.type === 'VoidReturn' && item.status !== 'synced'
                          && queuedReturnsForStop.some((queuedReturn) => queuedReturn.clientId === item.payload.returnClientId))}
                        queuedSales={queuedSales}
                        queuedDeliveries={[]}
                        queuedStop={action}
                        onRemoveQueued={remove}
                        onCancelQueuedDelivery={cancelQueuedDelivery}
                        syncing={syncing}
                      />;
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
          renderCustomersView={() => (
            <div className="space-y-4">
              {editingCustomer && <CustomerModal
                visible
                onHide={() => setEditingCustomer(null)}
                customer={editingCustomerModal}
                onAddLocation={() => { setEditingLocation(null); setLocationCustomer(editingCustomer); setEditingCustomer(null); }}
                onEditLocation={(location) => { setEditingLocation(location); setLocationCustomer(editingCustomer); setEditingCustomer(null); }}
                pendingLocationIds={queue.filter((action) => action.type === 'UpdateCustomerLocation' && action.status === 'pending')
                  .map((action) => String(action.payload.locationId || action.payload.locationClientId || ''))}
                driverMode={{ districts, region: { id: districts[0]?.regionId || '', name: editingCustomer.regionName || trek.regionName }, onSubmit: async (payload, photos) => {
                  const { districtId, streetAddress, landmarkAndDirections, gps, ...customerFields } = payload;
                  await enqueue('UpdateCustomer', customerFields);
                  const currentLocation = editingCustomer.primaryLocation;
                  const locationChanges: Record<string, unknown> = {};
                  if (typeof districtId === 'string' && districtId !== (currentLocation?.districtId || '')) locationChanges.districtId = districtId;
                  if (typeof streetAddress === 'string' && streetAddress !== (currentLocation?.streetAddress || '')) locationChanges.streetAddress = streetAddress;
                  if (typeof landmarkAndDirections === 'string' && landmarkAndDirections !== (currentLocation?.landmarkAndDirections || '')) locationChanges.landmarkAndDirections = landmarkAndDirections;
                  if (gps && typeof gps === 'object') {
                    const fix = gps as { latitude?: number; longitude?: number; accuracyMetres?: number };
                    if (fix.latitude !== currentLocation?.latitude || fix.longitude !== currentLocation?.longitude || fix.accuracyMetres !== currentLocation?.accuracyMetres) locationChanges.gps = fix;
                  }
                  if (Object.keys(locationChanges).length) {
                    await enqueue(currentLocation?.id ? 'UpdateCustomerLocation' : 'AddCustomerLocation', {
                      ...(currentLocation?.id ? { locationId: currentLocation.id } : { customerId: editingCustomer.id, isPrimary: true }),
                      ...locationChanges,
                    });
                  }
                  if (photos.premises) { if (!online) throw new Error('Connect to upload customer photos.'); await uploadCustomerPremisesPhoto(editingCustomer.id, photos.premises); }
                  if (photos.portrait) { if (!online || !editingCustomer.primaryPersonId) throw new Error('Representative photo upload requires an online representative record.'); await uploadCustomerPortrait(editingCustomer.id, editingCustomer.primaryPersonId, photos.portrait); }
                  toast.success('Customer update saved on this device.');
                }}}
              />}
              {locationCustomer && <CustomerLocationModal
                visible
                onHide={() => { setLocationCustomer(null); setEditingLocation(null); }}
                customerName={locationCustomer.businessName}
                location={editingLocation}
                region={{ id: '', name: locationCustomer.regionName || trek.regionName }}
                districts={districts}
                districtRequired={false}
                includeRegion={false}
                regionLocked
                driverEdit={Boolean(editingLocation)}
                online={online}
                onSubmit={async (payload) => {
                  if (editingLocation) {
                    const { latitude, longitude, accuracyMetres, ...locationFields } = payload;
                    const added = queue.find((action) => action.type === 'AddCustomerLocation' && action.clientId === editingLocation.id);
                    const reference = added?.status === 'pending' ? { locationClientId: added.clientId }
                      : { locationId: added?.serverId || editingLocation.id };
                    await enqueue('UpdateCustomerLocation', {
                      ...reference,
                      ...locationFields,
                      ...(typeof latitude === 'number' && typeof longitude === 'number' && typeof accuracyMetres === 'number'
                        ? { gps: { latitude, longitude, accuracyMetres } } : {}),
                    });
                    resetTableData();
                    toast.success('Location update saved on this device.');
                    return;
                  }
                  if (!online) {
                    const { latitude, longitude, accuracyMetres, ...locationFields } = payload;
                    await enqueue('AddCustomerLocation', {
                      ...(locationCustomer.clientGeneratedId && !locationCustomer.id ? { customerClientId: locationCustomer.clientGeneratedId } : { customerId: locationCustomer.id }),
                      ...locationFields,
                      ...(typeof latitude === 'number' && typeof longitude === 'number' && typeof accuracyMetres === 'number'
                        ? { gps: { latitude, longitude, accuracyMetres } } : {}),
                    });
                    resetTableData();
                    toast.success('Location saved on this device. It will sync when connected.');
                    return;
                  }
                  const savedLocation = await fieldApi.addCustomerLocation(token, locationCustomer.id, payload);
                  await rememberCustomerLocation(locationCustomer.id, savedLocation as Record<string, unknown>);
                  resetTableData();
                  await refresh(true);
                  toast.success('Additional location added.');
                }}
              />}
              <FieldActions
                trek={trek}
                products={products}
                customers={customers}
                districts={districts}
                queue={queue}
                enqueue={enqueue}
                queuePhoto={queuePhoto}
                request={customerRequest}
                backendReady={controlAvailable}
                modalOnly
                onClose={() => setCustomerRequest(null)}
              />
              <FlatDataTable<CustomerListRow>
                key={`customers-${customerRows.length}`}
                data={customerRows}
                columns={[
                  { field: 'businessName', header: 'Customer', body: (item) => <span className="text-xs font-medium text-portal-accent">{item.businessName}</span> },
                  { field: 'customerCode', header: 'Code', body: (item) => <span className="font-mono text-[11px] text-portal-muted">{item.customerCode || '—'}</span> },
                  { field: 'customerType', header: 'Type', body: (item) => <span className="text-xs text-portal-text">{item.customerType?.replace(/([a-z])([A-Z])/g, '$1 $2') || '—'}</span> },
                  { field: 'primaryPhoneNumber', header: 'Phone', body: (item) => <a href={`tel:${item.primaryPhoneNumber}`} className="text-xs text-portal-text hover:text-portal-heading">{item.primaryPhoneNumber}</a> },
                  { field: 'primaryContactName', header: 'Contact', body: (item) => item.primaryContactName || '—' },
                  { field: 'location', header: 'Location', body: (item) => {
                    const latitude = item.latitude ?? item.primaryLocation?.latitude;
                    const longitude = item.longitude ?? item.primaryLocation?.longitude;
                    const accuracy = item.accuracyMetres ?? item.primaryLocation?.accuracyMetres;
                    return latitude != null && longitude != null
                      ? <span className="text-[11px] text-portal-muted" title={`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`}>GPS captured{accuracy != null ? ` · ±${Math.round(accuracy)} m` : ''}</span>
                      : <span className="text-[11px] text-portal-muted">No GPS captured</span>;
                  } },
                  { field: 'syncStatus', header: 'Status', body: (item) => item.syncStatus
                    ? <span className={`text-[11px] ${item.syncStatus === 'conflict' ? 'text-red-accent' : 'text-portal-accent'}`} title={item.syncReason}>{item.syncStatus === 'conflict' ? 'Needs attention' : 'Awaiting sync'}</span>
                    : <span className="text-[11px] text-portal-muted">Available offline</span> },
                  { field: 'actions', header: 'Action', body: (item) => item.syncStatus ? null : <FlatButton size="sm" variant="ghost" onClick={() => setEditingCustomer(item)}>Edit</FlatButton> },
                ]}
                heading={`Customers in ${trek.regionName}`}
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
              <div className="flex items-center gap-1 border-b border-portal-border/60">
                <button type="button" onClick={() => setTrekListTab('region')} className={`border-b-2 px-3 py-2 text-sm font-semibold transition-colors ${trekListTab === 'region' ? 'border-portal-accent text-portal-accent' : 'border-transparent text-portal-muted hover:text-portal-heading'}`}>Regional Treks</button>
                <button type="button" onClick={() => setTrekListTab('mine')} className={`border-b-2 px-3 py-2 text-sm font-semibold transition-colors ${trekListTab === 'mine' ? 'border-portal-accent text-portal-accent' : 'border-transparent text-portal-muted hover:text-portal-heading'}`}>Assigned treks</button>
              </div>
              <FlatDataTable<RegionTrek>
                data={trekListTab === 'mine' ? (assignedTreks.length ? assignedTreks : [visibleTreks.find((item) => item.trekId === trek.trekId) ?? visibleTreks[0]]) : visibleTreks}
                columns={[
                  {
                    field: 'trekNumber',
                    header: 'Trek ID',
                    body: (item) => (
                      <span className="font-medium text-portal-text">
                        {item.trekNumber}
                        {item.trekId === trek.trekId && (
                          <span className="block text-[11px] text-portal-accent">Assigned to you</span>
                        )}
                      </span>
                    ),
                  },
                  { field: 'regionName', header: 'Trekking Region', body: (item) => <span className="text-xs font-medium text-portal-text">{item.regionName || '—'}</span> },
                  { field: 'scheduledDate', header: 'Date', body: (item) => <span className="text-xs font-medium text-portal-text">{item.scheduledDate || '—'}</span> },
                  {
                    field: 'status',
                    header: 'Status',
                    body: (item) => (
                      <span className={`text-xs font-medium ${STATUS_STYLES[item.status] ?? 'text-portal-muted'}`}>
                        {STATUS_LABELS[item.status] ?? item.status}
                      </span>
                    ),
                  },
                  { field: 'driverName', header: 'Driver', body: (item) => <span className="text-xs font-medium text-portal-text">{item.driverName || '—'}</span> },
                  { field: 'salesStaffName', header: 'Sales Staff', body: (item) => <span className="text-xs font-medium text-portal-text">{item.salesStaffName || '—'}</span> },
                  { field: 'stopsCount', header: 'Stops', body: (item) => <span className="text-xs font-medium text-portal-text">{item.stopsCount}</span> },
                  {
                    field: 'actions',
                    header: 'Actions',
                    body: (item) => item.trekId === trek.trekId || item.trekNumber === trek.trekNumber ? <span className="text-[11px] text-portal-muted">Current workspace</span> : <FlatButton size="sm" variant="ghost" className="!bg-portal-hover !text-portal-heading hover:!bg-portal-active" title="Switch workspace" onClick={() => setTrekToSwitch(item)}>Switch workspace</FlatButton>,
                  },
                ]}
                heading={trekListTab === 'mine' ? 'Assigned treks' : `Treks in ${trek.regionName}`}
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
              <div className="border-b border-portal-border/60 pb-3">
                <div>
                  <h1 className="text-base font-semibold text-portal-text sm:text-lg">Field Actions</h1>
                </div>
              </div>
              <FieldActions
                trek={trek}
                products={products}
                customers={customers}
                districts={districts}
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
              <div className="border-b border-portal-border/60 pb-3">
                <div>
                  <h1 className="text-base font-semibold text-portal-text sm:text-lg">Offline & Sync Center</h1>
                  <p className="text-xs text-portal-muted">Local IndexedDB database & sync status</p>
                </div>
              </div>

              <section className="bg-portal-surface border border-portal-border/60 rounded p-4 sm:p-5 space-y-4 shadow-md">
                <div>
                  <h2 className="text-sm font-semibold text-portal-text">Device Database Storage</h2>
                  <p className="text-[11px] text-portal-muted">
                    Saved in this device’s IndexedDB for complete offline use.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2 text-center sm:grid-cols-4 sm:gap-3">
                  {[
                    { label: 'Products Cached', value: products.length },
                    { label: 'Customers Cached', value: customers.length },
                    { label: 'Districts Cached', value: districts.length },
                    { label: 'Pending Sync Actions', value: pendingCount },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="bg-portal-canvas/70 rounded p-3 border border-portal-border/40"
                    >
                      <p className="text-lg font-semibold text-portal-text sm:text-xl">{item.value}</p>
                      <p className="text-[11px] text-portal-muted mt-0.5">{item.label}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 border-t border-portal-border/40 pt-3 text-[11px] text-portal-muted">
                  <i className="pi pi-map-marker text-portal-accent" aria-hidden="true" />
                  <span>Active region cached: <strong className="font-medium text-portal-text">{trek.regionName || 'Unavailable'}</strong></span>
                </div>

                <p className="text-[11px] text-portal-muted">
                  Last data refresh: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : 'Never'}
                </p>

                <div className="flex flex-wrap gap-2 pt-1">
                  <FlatButton
                    size="sm"
                    variant="outline"
                    leftIcon="pi pi-download"
                    loading={refreshing}
                    disabled={!online || refreshing || syncing}
                    onClick={() => void refresh(false)
                      .then((complete) => {
                        if (complete) toast.success('All offline data refreshed on this device.');
                        else toast.error('Some offline data could not be refreshed.');
                      })
                      .catch(() => toast.error('Offline data refresh failed.'))}
                  >
                    Force Full Refresh
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
                    disabled={!controlAvailable || !online || pendingCount === 0}
                    onClick={sync}
                  >
                    Upload Queued Actions {pendingCount ? `(${pendingCount})` : ''}
                  </FlatButton>
                </div>
                <p className="text-[11px] text-portal-muted">
                  Downloads fresh trek, product, customer, district and trek list data without using the last refresh date. Queued uploads stay saved.
                </p>

                {!controlAvailable && (
                  <p className="text-[11px] text-yellow-400">
                    The updated backend endpoints are not responding. Local caching continues to work.
                  </p>
                )}
              </section>

              <OfflineMapControl regionName={trek.regionName} online={online} />

              {queue.some((action) => action.status !== 'synced') && (
                <div className="bg-portal-surface border border-portal-border/60 rounded p-4 space-y-3 shadow-md">
                  <h2 className="text-sm font-semibold text-portal-text">Local Action Queue</h2>
                  {queue
                    .filter((action) => action.status !== 'synced')
                    .map((action) => (
                      <div
                        key={action.clientId}
                        className="flex flex-wrap items-center justify-between gap-2 text-xs border-t border-portal-border/40 pt-2.5"
                      >
                        <span className="text-portal-text">
                          <span className="block">{action.type.replace(/([a-z])([A-Z])/g, '$1 $2')} · {new Date(action.occurredAt).toLocaleTimeString()}</span>
                          <span className="block text-[11px] text-portal-muted">{queuedActionSummary(action)}</span>
                        </span>
                        <span className="flex items-center gap-2">
                          <span
                            className={
                              action.status === 'conflict' || action.reason ? 'text-red-400' : 'text-portal-accent'
                            }
                          >
                            {action.status === 'conflict'
                              ? `Conflict: ${action.reason || 'Review required'}`
                              : action.reason
                              ? action.reason
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
                          {action.status === 'pending' && (
                            <FlatButton size="sm" variant="ghost" onClick={() => void remove(action.clientId)}>
                              Remove
                            </FlatButton>
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
              {photoQueue.some((photo) => photo.status !== 'uploaded') && (
                <div className="bg-portal-surface border border-portal-border/60 rounded p-4 space-y-3 shadow-md">
                  <h2 className="text-sm font-semibold text-portal-text">Photo Upload Queue</h2>
                  {photoQueue.filter((photo) => photo.status !== 'uploaded').map((photo) => (
                    <div key={photo.photoId} className="flex flex-wrap items-center justify-between gap-2 border-t border-portal-border/40 pt-2.5 text-xs">
                      <span className="text-portal-text">{photo.kind === 'premises' ? 'Premises photo' : 'Representative photo'}<span className="ml-2 text-[11px] text-portal-muted">{photo.file.name}</span></span>
                      <span className="flex items-center gap-2"><span className={photo.status === 'conflict' || photo.reason?.startsWith('Upload failed:') ? 'text-red-400' : 'text-portal-accent'}>{photo.reason || 'Awaiting sync'}</span>{photo.status !== 'conflict' && <FlatButton size="sm" variant="ghost" onClick={() => void retryPhoto(photo.photoId)}>Retry</FlatButton>}<FlatButton size="sm" variant="ghost" onClick={() => void removePhoto(photo.photoId)}>Remove</FlatButton></span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        />
      </div>
      <FlatModal
        visible={trekToSwitch !== null}
        onHide={() => { if (!switchingTrek) setTrekToSwitch(null); }}
        title={online ? 'Switch primary trek workspace' : 'Internet connection required'}
        size="sm"
        footer={online
          ? <div className="flex justify-end gap-2"><FlatButton size="sm" variant="outline" onClick={() => setTrekToSwitch(null)} disabled={switchingTrek}>Cancel</FlatButton><FlatButton size="sm" onClick={() => void confirmTrekSwitch()} loading={switchingTrek} disabled={switchingTrek}>Switch workspace</FlatButton></div>
          : <div className="flex justify-end"><FlatButton size="sm" variant="outline" onClick={() => setTrekToSwitch(null)}>Close</FlatButton></div>}
      >
        {online ? <>
          <p className="text-sm text-portal-text">Switch to <span className="font-semibold text-portal-accent">{trekToSwitch?.trekNumber}</span>?</p>
          <p className="mt-2 text-[11px] text-portal-muted">This trek will become your primary workspace. New activity will be recorded there.</p>
        </> : <p className="text-sm text-portal-text">Connect to the internet to switch workspace.</p>}
      </FlatModal>

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
