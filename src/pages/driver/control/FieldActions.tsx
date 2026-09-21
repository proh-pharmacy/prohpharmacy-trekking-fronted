import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import type { DriverTrek } from '../../../api-client/treks';
import type { Product } from '../../../api-client/products';
import { FlatButton, FlatDropdown, FlatInputNumber, FlatInputText } from '../../../components/flat-form';
import { FlatModal } from '../../../components/overlay/FlatModal';
import { captureGps, type ActionType, type FieldCustomer, type FieldDistrict, type QueuedAction } from './api';
import { fmtGhs, formatGhanaCardNumber, formatGhanaPhoneNumber, normalizeGhanaPhoneNumber, parseNumericInput } from '../../../lib/utils';
import { CustomerModal } from '../../portal/customers/components/CustomerModal';

export type FieldActionKind = 'customer' | 'stop' | 'sale' | 'return';
export interface FieldActionRequest { kind: FieldActionKind; trekId?: string; stopId?: string; stopClientId?: string; sequence?: number; nonce: number }
type Values = Record<string, string>;
const CUSTOMER_TYPES = ['RetailPharmacy', 'WholesalePharmacy', 'OTCMedicineSeller', 'Clinic', 'Hospital', 'ChemicalShop', 'LicensedHealthFacility', 'Other'];
const RELATIONSHIPS = ['Owner', 'Proprietor', 'Director', 'Manager', 'PrimaryContact', 'CreditResponsiblePerson', 'Guarantor', 'Other'];
const PAYMENTS = ['Cash', 'MobileMoney', 'Cheque', 'BankTransfer'];
const options = (values: string[]) => values.map((value) => ({ label: value.replace(/([a-z])([A-Z])/g, '$1 $2'), value }));

interface Props {
  trek: DriverTrek;
  products: Product[];
  customers: FieldCustomer[];
  districts: FieldDistrict[];
  queue: QueuedAction[];
  enqueue: (type: ActionType, payload: Record<string, unknown>) => Promise<string>;
  queuePhoto: (customerClientId: string, kind: 'premises' | 'portrait', file: File) => Promise<string>;
  request?: FieldActionRequest | null;
  backendReady: boolean;
  modalOnly?: boolean;
  fixedTrekId?: string;
  onClose?: () => void;
}

function ActionTile({ icon, title, description, onClick }: {
  icon: string;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return <button type="button" onClick={onClick}
    className="group flex min-h-[154px] flex-col justify-between rounded border border-portal-border/70 bg-portal-surface p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-portal-accent/70 hover:bg-portal-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-portal-accent active:translate-y-0">
    <span className="flex w-full items-start justify-between">
      <span className="flex h-11 w-11 items-center justify-center rounded bg-portal-accent/10 text-portal-accent transition-colors group-hover:bg-portal-accent/20">
        <i className={`pi ${icon} text-xl`} aria-hidden="true" />
      </span>
      <i className="pi pi-arrow-up-right text-xs text-portal-muted transition-colors group-hover:text-portal-accent" aria-hidden="true" />
    </span>
    <span className="block">
      <span className="block text-sm font-semibold text-portal-text">{title}</span>
      <span className="mt-1 block text-xs leading-relaxed text-portal-text">{description}</span>
    </span>
  </button>;
}

export function FieldActions({ trek, products, customers, districts, queue, enqueue, queuePhoto, request, backendReady, modalOnly = false, fixedTrekId, onClose }: Props) {
  const [kind, setKind] = useState<FieldActionKind | null>(null);
  const [values, setValues] = useState<Values>({});
  const [saving, setSaving] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'capturing' | 'captured' | 'unavailable'>('idle');
  const [premisesPhoto, setPremisesPhoto] = useState<File | null>(null);
  const [portraitPhoto, setPortraitPhoto] = useState<File | null>(null);
  const [premisesPreview, setPremisesPreview] = useState<string | null>(null);
  const [portraitPreview, setPortraitPreview] = useState<string | null>(null);
  const [customerGps, setCustomerGps] = useState<Awaited<ReturnType<typeof captureGps>>>(null);
  const set = (field: string, value: string) => setValues((prev) => ({ ...prev, [field]: value }));
  const text = (field: string, label: string, required = false) => <FlatInputText label={label} value={values[field] ?? ''} onChange={(e) => set(field, e.target.value)} required={required} size="md" />;
  const number = (field: string, label: string, required = false, min = 0) => (
    <FlatInputNumber
      id={`${kind ?? 'action'}-${field}`}
      label={label}
      value={values[field] === '' || values[field] == null ? null : parseNumericInput(values[field])}
      onChange={(value) => set(field, value == null ? '' : String(value))}
      onInput={(event) => set(field, (event.target as HTMLInputElement).value)}
      onKeyUp={(event) => set(field, (event.target as HTMLInputElement).value)}
      min={min}
      maxFractionDigits={2}
      useGrouping
      required={required}
      size="md"
    />
  );
  const select = (field: string, label: string, choices: { label: string; value: string }[], required = false) => <FlatDropdown label={label} value={values[field] ?? ''} options={choices} onChange={(value) => set(field, value ?? '')} required={required} filter size="md" />;
  const open = (next: FieldActionKind, trekId?: string, stopId?: string) => { setValues({ ...(next === 'stop' && { trekId: trekId || fixedTrekId || trek.trekId }), ...(stopId && { stopId: `id:${stopId}` }) }); setKind(next); };
  const requestedKind = request?.kind;
  const requestedTrekId = request?.trekId;
  const requestedStopId = request?.stopId;
  const requestedStopClientId = request?.stopClientId;
  const requestedSequence = request?.sequence;
  const requestedNonce = request?.nonce;
  useEffect(() => {
    if (!requestedKind) { setKind(null); return; }
    setValues({ ...(requestedKind === 'stop' && { trekId: fixedTrekId || requestedTrekId || trek.trekId }), ...(requestedStopId && { stopId: `id:${requestedStopId}` }), ...(requestedStopClientId && { stopId: `client:${requestedStopClientId}` }), ...(requestedSequence && { sequence: String(requestedSequence) }) });
    setKind(requestedKind);
  }, [requestedKind, requestedTrekId, requestedStopId, requestedStopClientId, requestedSequence, requestedNonce, fixedTrekId, trek.trekId]);
  const pendingCustomers = queue
    .filter((action) => action.type === 'RegisterCustomer' && action.status === 'pending')
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  const pendingStops = queue.filter((action) => action.type === 'AddWalkInStop' && action.status !== 'conflict');
  const customerChoices = [
    ...pendingCustomers.map((action) => ({ label: `${action.payload.businessName} · saved on device`, value: `client:${action.clientId}` })),
    ...[...customers]
      .sort((a, b) => String(b.createdAt || b.recordedAt || '').localeCompare(String(a.createdAt || a.recordedAt || '')))
      .map((customer) => ({ label: `${customer.businessName} · ${customer.primaryPhoneNumber}`, value: `id:${customer.id}` })),
  ];
  const stopChoices = [
    ...(!trek.isLocked ? trek.stops : []).map((stop) => ({ label: `${stop.sequence}. ${stop.customerName}`, value: `id:${stop.stopId}` })),
    ...pendingStops.filter((action) => !fixedTrekId || action.payload.trekId === fixedTrekId).map((action) => ({ label: `Additional stop ${action.payload.sequence} · saved on device`, value: `client:${action.clientId}` })),
  ];
  const selectedProduct = products.find((product) => product.id === values.productId);
  const calculatedSaleAmount = selectedProduct && kind === 'sale'
    ? (parseNumericInput(values.basicQty) * Number(selectedProduct.basicUnitPrice || 0))
      + (parseNumericInput(values.packagingQty) * Number(selectedProduct.packagingUnitPrice || 0))
    : 0;
  const calculatedReturnAmount = selectedProduct && kind === 'return'
    ? (parseNumericInput(values.basicQty) * Number(selectedProduct.basicUnitPrice || 0))
      + (parseNumericInput(values.packagingQty) * Number(selectedProduct.packagingUnitPrice || 0))
    : 0;
  const saleAmountPaid = values.amount?.trim() ? parseNumericInput(values.amount) : null;
  const saleBalance = saleAmountPaid == null || !Number.isFinite(saleAmountPaid)
    ? 0
    : Math.max(0, calculatedSaleAmount - saleAmountPaid);
  const selectedStop = values.stopId ?? '';
  const close = () => { [premisesPreview, portraitPreview].forEach((preview) => { if (preview) URL.revokeObjectURL(preview); }); setKind(null); setValues({}); setGpsStatus('idle'); setCustomerGps(null); setPremisesPhoto(null); setPortraitPhoto(null); setPremisesPreview(null); setPortraitPreview(null); onClose?.(); };
  const choosePhoto = (setter: (file: File | null) => void, previewSetter: (preview: string | null) => void, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size === 0) { toast.error('Choose a non-empty photo.'); return; }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { toast.error('Choose a JPEG, PNG, or WebP photo.'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Photo must be 5 MB or smaller.'); return; }
    previewSetter(URL.createObjectURL(file));
    setter(file);
  };

  async function save() {
    try {
      setSaving(true);
      if (trek.isLocked && kind !== 'customer') throw new Error('This trek is completed and no further changes can be made.');
      if ((values.notes?.length ?? 0) > 500) throw new Error('Notes or reason must be at most 500 characters.');
      if (kind === 'customer') {
        if (!values.businessName?.trim() || !values.primaryPhoneNumber?.trim() || !values.customerType ||
          !values.firstName?.trim() || !values.lastName?.trim() || !values.relationshipType || !values.representativePhone?.trim()) throw new Error('Complete the required customer and representative fields.');
        const customerClientId = await enqueue('RegisterCustomer', {
          businessName: values.businessName.trim(), primaryPhoneNumber: normalizeGhanaPhoneNumber(values.primaryPhoneNumber), customerType: values.customerType,
          ...(values.tradingName && { tradingName: values.tradingName.trim() }),
          ...(values.whatsAppNumber && { whatsAppNumber: normalizeGhanaPhoneNumber(values.whatsAppNumber) }),
          representative: { firstName: values.firstName.trim(), lastName: values.lastName.trim(), relationshipType: values.relationshipType,
            primaryPhoneNumber: normalizeGhanaPhoneNumber(values.representativePhone), ...(values.middleName && { middleName: values.middleName.trim() }),
            ...(values.ghanaCardNumber && { ghanaCardNumber: values.ghanaCardNumber.trim() }) },
          ...(values.districtId && { districtId: values.districtId }),
          ...(values.streetAddress?.trim() && { streetAddress: values.streetAddress.trim() }),
          ...(values.landmarkAndDirections?.trim() && { landmarkAndDirections: values.landmarkAndDirections.trim() }),
          gps: customerGps,
        });
        if (premisesPhoto) await queuePhoto(customerClientId, 'premises', premisesPhoto);
        if (portraitPhoto) await queuePhoto(customerClientId, 'portrait', portraitPhoto);
      } else if (kind === 'stop') {
        if (!values.customer) throw new Error('Select a customer.');
        if (!values.sequence || !Number.isInteger(parseNumericInput(values.sequence)) || parseNumericInput(values.sequence) <= 0) throw new Error('Enter a positive whole number for the stop sequence.');
        const targetTrekId = fixedTrekId || requestedTrekId || values.trekId || trek.trekId;
        const gps = await captureGps();
        const reference = values.customer.startsWith('client:') ? { customerClientId: values.customer.slice(7) } : { customerId: values.customer.slice(3) };
        await enqueue('AddWalkInStop', { trekId: targetTrekId, ...reference, sequence: parseNumericInput(values.sequence),
          ...(values.notes && { notes: values.notes.trim() }), ...(gps && { gps }) });
      } else if (kind === 'sale' || kind === 'return') {
        if (!selectedStop || !values.productId || !values.basicQty || parseNumericInput(values.basicQty) <= 0) throw new Error('Select a stop, product and positive basic quantity.');
        if (kind === 'return' && !values.paymentMethod) throw new Error('Select a refund method.');
        if (kind === 'return' && calculatedReturnAmount <= 0) throw new Error('The calculated refund must be greater than zero.');
        const stopReference = selectedStop.startsWith('client:') ? { stopClientId: selectedStop.slice(7) } : { stopId: selectedStop.slice(3) };
        if (kind === 'sale') {
          await enqueue('RecordUnplannedSale', { ...stopReference, productId: values.productId, basicQtyDelivered: parseNumericInput(values.basicQty),
            ...(values.packagingQty && { packagingQtyDelivered: parseNumericInput(values.packagingQty) }),
            ...(values.paymentMethod && { paymentMethod: values.paymentMethod }),
            ...((values.amount ?? '').trim() ? { amtPaid: saleAmountPaid, balance: saleBalance } : {}),
            ...(values.notes && { notes: values.notes.trim() }) });
        } else {
          const gps = await captureGps();
          await enqueue('RecordReturn', { ...stopReference, productId: values.productId, basicQtyReturned: parseNumericInput(values.basicQty),
            ...(values.packagingQty && { packagingQtyReturned: parseNumericInput(values.packagingQty) }),
            refundAmount: calculatedReturnAmount,
            ...(values.paymentMethod && { refundMethod: values.paymentMethod }),
            ...(values.notes && { reason: values.notes.trim() }), ...(gps && { gps }) });
        }
      }
      toast.success('Saved on this device. It will sync when connected.');
      close();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not save this action.'); }
    finally { setSaving(false); }
  }

  return <>
    {kind === 'customer' && <CustomerModal visible onHide={close} customer={null} driverMode={{ districts, region: { id: districts[0]?.regionId || '', name: trek.regionName }, onSubmit: async (payload, photos) => {
      const customerClientId = await enqueue('RegisterCustomer', payload);
      if (photos.premises) await queuePhoto(customerClientId, 'premises', photos.premises);
      if (photos.portrait) await queuePhoto(customerClientId, 'portrait', photos.portrait);
      toast.success('Customer saved on this device. It will sync when connected.');
    } }} />}
    {!modalOnly && <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ActionTile icon="pi-user-plus" title="Register customer" description="Add a customer in this trekking region." onClick={() => open('customer')} />
        {!trek.isLocked && <ActionTile icon="pi-map-marker" title="Add additional stop" description="Add a customer visit to this trek." onClick={() => open('stop')} />}
        {!!stopChoices.length && <>
          <ActionTile icon="pi-shopping-cart" title="Unplanned sale" description="Record a product sold at a stop." onClick={() => open('sale')} />
          <ActionTile icon="pi-replay" title="Record return" description="Log a product returned by a customer." onClick={() => open('return')} />
        </>}
      </div>
      <p className="flex items-center gap-2 text-[11px] text-portal-muted"><i className="pi pi-database text-portal-accent" aria-hidden="true" />{backendReady ? 'Saved on this device · syncs when connected' : 'Saved on this device · upload when the backend is available'}</p>
    </div>}
    <FlatModal visible={kind !== null && kind !== 'customer'} onHide={close} title={{ customer: 'Register customer', stop: 'Add additional stop', sale: 'Record unplanned sale', return: 'Record return' }[kind ?? 'customer']} size="md"
      footer={<><FlatButton size="sm" variant="ghost" onClick={close}>Cancel</FlatButton><FlatButton size="sm" onClick={save} loading={saving} disabled={saving || (trek.isLocked && kind !== 'customer') || (kind === 'sale' && calculatedSaleAmount <= 0) || (kind === 'return' && calculatedReturnAmount <= 0)}>Save action</FlatButton></>}> 
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {kind === 'stop' && !customerChoices.length && <p className="col-span-full text-xs text-yellow-400">Customer list is empty. Download offline customers or register a new customer first.</p>}
        {(kind === 'sale' || kind === 'return') && !products.length && <p className="col-span-full text-xs text-yellow-400">Product catalogue is empty. Use Sync products in Offline data first.</p>}
        {kind === 'customer' && <div className="col-span-full space-y-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-portal-muted">Business Info</p>
          <div className="h-px bg-portal-border" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {text('businessName', 'Business name', true)} <FlatInputText label="Customer phone" placeholder="+233 24 123 4567" value={values.primaryPhoneNumber ?? ''} onChange={(event) => set('primaryPhoneNumber', formatGhanaPhoneNumber(event.target.value))} required size="md" />
            {select('customerType', 'Customer type', options(CUSTOMER_TYPES), true)} {text('tradingName', 'Trading name')}
            <FlatInputText label="WhatsApp number" placeholder="+233 24 123 4567" value={values.whatsAppNumber ?? ''} onChange={(event) => set('whatsAppNumber', formatGhanaPhoneNumber(event.target.value))} size="md" />
          </div>
          <p className="pt-2 text-[11px] font-medium uppercase tracking-wide text-portal-muted">Representative</p>
          <div className="h-px bg-portal-border" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {text('firstName', 'First name', true)} {text('middleName', 'Middle name')} {text('lastName', 'Last name', true)}
            <FlatInputText label="Ghana Card number" value={values.ghanaCardNumber ?? ''} onChange={(event) => set('ghanaCardNumber', formatGhanaCardNumber(event.target.value))} size="md" placeholder="GHA-..." maxLength={30} />
            {select('relationshipType', 'Relationship', options(RELATIONSHIPS), true)} <FlatInputText label="Representative phone" placeholder="+233 24 123 4567" value={values.representativePhone ?? ''} onChange={(event) => set('representativePhone', formatGhanaPhoneNumber(event.target.value))} required size="md" />
          </div>
          <p className="pt-2 text-[11px] font-medium uppercase tracking-wide text-portal-muted">Location</p>
          <div className="h-px bg-portal-border" />
          {select('districtId', 'District', districts.map((district) => ({ label: district.name, value: district.id })))}
          {text('streetAddress', 'Street address')} {text('landmarkAndDirections', 'Landmark and directions')}
          <div className="flex flex-col gap-3 rounded border border-portal-border/60 bg-portal-canvas/40 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-[11px] text-portal-muted"><i className={`pi ${gpsStatus === 'capturing' ? 'pi-spin pi-spinner' : gpsStatus === 'captured' ? 'pi-check-circle text-portal-accent' : gpsStatus === 'unavailable' ? 'pi-exclamation-circle text-yellow-400' : 'pi-map-marker'}`} /><span>{gpsStatus === 'captured' ? 'Device location captured and will be saved with this customer.' : gpsStatus === 'unavailable' ? 'Location unavailable. Customer can still be saved without GPS.' : 'Capture the customer location when you are ready.'}</span></div>
            <FlatButton size="sm" variant="outline" leftIcon="pi pi-map-marker" onClick={async () => { setGpsStatus('capturing'); const gps = await captureGps(); setCustomerGps(gps); setGpsStatus(gps ? 'captured' : 'unavailable'); }} loading={gpsStatus === 'capturing'} disabled={gpsStatus === 'capturing'}>Capture location</FlatButton>
          </div>
          <p className="pt-2 text-[11px] font-medium uppercase tracking-wide text-portal-muted">Attachments</p>
          <div className="h-px bg-portal-border" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { title: 'Business premises photo', file: premisesPhoto, preview: premisesPreview, setFile: setPremisesPhoto, setPreview: setPremisesPreview },
              { title: 'Representative photo', file: portraitPhoto, preview: portraitPreview, setFile: setPortraitPhoto, setPreview: setPortraitPreview },
            ].map((photo) => <div key={photo.title} className="rounded border border-portal-border/60 bg-portal-canvas/40 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded border border-dashed border-portal-border bg-portal-canvas">
                  {photo.preview ? <img src={photo.preview} alt={`${photo.title} preview`} className="h-full w-full object-cover" /> : <i className="pi pi-camera text-lg text-portal-muted" aria-hidden="true" />}
                </div>
                <div className="min-w-0 flex-1"><p className="text-xs font-medium text-portal-text">{photo.title}</p><p className="mt-1 text-[11px] text-portal-muted">JPEG, PNG or WebP · Max 5 MB · Optional</p><div className="mt-2 flex items-center gap-3"><label className="cursor-pointer text-[11px] text-portal-accent hover:text-portal-accent-hover">{photo.file ? 'Change photo' : 'Choose photo'}<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => choosePhoto(photo.setFile, photo.setPreview, event)} /></label>{photo.file && <button type="button" className="text-[11px] text-red-400 hover:text-red-300" onClick={() => { photo.setFile(null); photo.setPreview(null); }}>Remove</button>}</div></div>
              </div>
              {!photo.file && <p className="mt-2 text-[11px] text-portal-muted">Uploaded after this customer receives a server ID.</p>}
            </div>)}
          </div>
        </div>}
        {kind === 'stop' && <>
          {select('customer', 'Customer', customerChoices, true)} {number('sequence', 'Stop sequence', true, 1)} {text('notes', 'Notes')}
        </>}
        {(kind === 'sale' || kind === 'return') && <>
          {!(modalOnly && (requestedStopId || requestedStopClientId)) && select('stopId', 'Stop', stopChoices, true)}
          {select('productId', 'Product', products.filter((product) => product.isActive !== false).map((product) => ({ label: product.name, value: product.id })), true)}
          {number('basicQty', kind === 'sale' ? `Basic qty delivered${selectedProduct?.basicUnitName ? ` (${selectedProduct.basicUnitName})` : ''}` : `Basic qty returned${selectedProduct?.basicUnitName ? ` (${selectedProduct.basicUnitName})` : ''}`, true, 0)}
          {selectedProduct?.packagingUnitName && number('packagingQty', `${kind === 'sale' ? 'Packaging qty delivered' : 'Packaging qty returned'} (${selectedProduct.packagingUnitName})`)}
          {kind === 'sale' && selectedProduct && <div className="col-span-full flex items-center justify-between rounded border border-portal-border/50 bg-portal-canvas/50 px-3 py-2"><span className="text-[10px] font-medium uppercase tracking-wider text-portal-muted">Calculated sale total</span><span className="text-sm font-semibold text-portal-accent">{fmtGhs(calculatedSaleAmount)}</span></div>}
          {kind === 'return' && selectedProduct && <div className="col-span-full flex items-center justify-between rounded border border-portal-border/50 bg-portal-canvas/50 px-3 py-2"><span className="text-[10px] font-medium uppercase tracking-wider text-portal-muted">Calculated return amount</span><span className="text-sm font-semibold text-portal-orange">{fmtGhs(calculatedReturnAmount)}</span></div>}
          {select('paymentMethod', kind === 'sale' ? 'Payment method' : 'Refund method', options(PAYMENTS), kind === 'return')}
          {kind === 'sale' && number('amount', 'Amount paid')}
          {kind === 'sale' && <div className="col-span-full flex items-center justify-between rounded border border-portal-border/50 bg-portal-canvas/50 px-3 py-2"><span className="text-[10px] font-medium uppercase tracking-wider text-portal-muted">Balance</span><span className="text-sm font-semibold text-portal-text">{fmtGhs(saleBalance)}</span></div>}
          {text('notes', kind === 'sale' ? 'Notes' : 'Reason')}
        </>}
      </div>
    </FlatModal>
  </>;
}
