import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import type { DriverTrek } from '../../../api-client/treks';
import type { Product } from '../../../api-client/products';
import { FlatButton, FlatDropdown, FlatInputNumber, FlatInputText } from '../../../components/flat-form';
import { FlatModal } from '../../../components/overlay/FlatModal';
import { captureGps, type ActionType, type FieldCustomer, type QueuedAction } from './api';

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
  queue: QueuedAction[];
  enqueue: (type: ActionType, payload: Record<string, unknown>) => Promise<string>;
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
      <span className="block text-sm font-bold text-white">{title}</span>
      <span className="mt-1 block text-xs leading-relaxed text-portal-text">{description}</span>
    </span>
  </button>;
}

export function FieldActions({ trek, products, customers, queue, enqueue, request, backendReady, modalOnly = false, fixedTrekId, onClose }: Props) {
  const [kind, setKind] = useState<FieldActionKind | null>(null);
  const [values, setValues] = useState<Values>({});
  const [saving, setSaving] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'capturing' | 'captured' | 'unavailable'>('idle');
  const set = (field: string, value: string) => setValues((prev) => ({ ...prev, [field]: value }));
  const text = (field: string, label: string, required = false) => <FlatInputText label={label} value={values[field] ?? ''} onChange={(e) => set(field, e.target.value)} required={required} size="sm" />;
  const number = (field: string, label: string, required = false, min = 0) => <FlatInputNumber label={label} value={values[field] ? Number(values[field]) : null} onChange={(value) => set(field, value == null ? '' : String(value))} required={required} min={min} maxFractionDigits={2} useGrouping={false} size="sm" />;
  const select = (field: string, label: string, choices: { label: string; value: string }[], required = false) => <FlatDropdown label={label} value={values[field] ?? ''} options={choices} onChange={(value) => set(field, value ?? '')} required={required} filter size="sm" />;
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
  const pendingCustomers = queue.filter((action) => action.type === 'RegisterCustomer' && action.status !== 'conflict');
  const pendingStops = queue.filter((action) => action.type === 'AddWalkInStop' && action.status !== 'conflict');
  const customerChoices = [
    ...customers.map((customer) => ({ label: `${customer.businessName} · ${customer.primaryPhoneNumber}`, value: `id:${customer.id}` })),
    ...pendingCustomers.map((action) => ({ label: `${action.payload.businessName} · saved on device`, value: `client:${action.clientId}` })),
  ];
  const stopChoices = [
    ...(!trek.isLocked ? trek.stops : []).map((stop) => ({ label: `${stop.sequence}. ${stop.customerName}`, value: `id:${stop.stopId}` })),
    ...pendingStops.filter((action) => !fixedTrekId || action.payload.trekId === fixedTrekId).map((action) => ({ label: `Walk-in ${action.payload.sequence} · saved on device`, value: `client:${action.clientId}` })),
  ];
  const selectedProduct = products.find((product) => product.id === values.productId);
  const selectedStop = values.stopId ?? '';
  const close = () => { setKind(null); setValues({}); setGpsStatus('idle'); onClose?.(); };

  async function save() {
    try {
      setSaving(true);
      if ((values.notes?.length ?? 0) > 500) throw new Error('Notes or reason must be at most 500 characters.');
      if (kind === 'customer') {
        if (!values.businessName?.trim() || !values.primaryPhoneNumber?.trim() || !values.customerType ||
          !values.firstName?.trim() || !values.lastName?.trim() || !values.relationshipType || !values.representativePhone?.trim()) throw new Error('Complete the required customer and representative fields.');
        setGpsStatus('capturing');
        const gps = await captureGps();
        setGpsStatus(gps ? 'captured' : 'unavailable');
        await enqueue('RegisterCustomer', {
          businessName: values.businessName.trim(), primaryPhoneNumber: values.primaryPhoneNumber.trim(), customerType: values.customerType,
          ...(values.tradingName && { tradingName: values.tradingName.trim() }),
          ...(values.whatsAppNumber && { whatsAppNumber: values.whatsAppNumber.trim() }),
          representative: { firstName: values.firstName.trim(), lastName: values.lastName.trim(), relationshipType: values.relationshipType,
            primaryPhoneNumber: values.representativePhone.trim(), ...(values.middleName && { middleName: values.middleName.trim() }) },
          gps,
        });
      } else if (kind === 'stop') {
        if (!values.customer) throw new Error('Select a customer.');
        if (!values.sequence || !Number.isInteger(Number(values.sequence)) || Number(values.sequence) <= 0) throw new Error('Enter a positive whole number for the stop sequence.');
        const targetTrekId = fixedTrekId || requestedTrekId || values.trekId || trek.trekId;
        const gps = await captureGps();
        const reference = values.customer.startsWith('client:') ? { customerClientId: values.customer.slice(7) } : { customerId: values.customer.slice(3) };
        await enqueue('AddWalkInStop', { trekId: targetTrekId, ...reference, sequence: Number(values.sequence),
          ...(values.notes && { notes: values.notes.trim() }), ...(gps && { gps }) });
      } else if (kind === 'sale' || kind === 'return') {
        if (!selectedStop || !values.productId || !values.basicQty || Number(values.basicQty) <= 0) throw new Error('Select a stop, product and positive basic quantity.');
        const stopReference = selectedStop.startsWith('client:') ? { stopClientId: selectedStop.slice(7) } : { stopId: selectedStop.slice(3) };
        if (kind === 'sale') {
          await enqueue('RecordUnplannedSale', { ...stopReference, productId: values.productId, basicQtyDelivered: Number(values.basicQty),
            ...(values.packagingQty && { packagingQtyDelivered: Number(values.packagingQty) }),
            ...(values.paymentMethod && { paymentMethod: values.paymentMethod }),
            amtPaid: Number(values.amount || 0), balance: Number(values.balance || 0),
            ...(values.notes && { notes: values.notes.trim() }) });
        } else {
          const gps = await captureGps();
          await enqueue('RecordReturn', { ...stopReference, productId: values.productId, basicQtyReturned: Number(values.basicQty),
            ...(values.packagingQty && { packagingQtyReturned: Number(values.packagingQty) }),
            refundAmount: Number(values.amount || 0), ...(values.paymentMethod && { refundMethod: values.paymentMethod }),
            ...(values.notes && { reason: values.notes.trim() }), ...(gps && { gps }) });
        }
      }
      toast.success('Saved on this device. It will sync when connected.');
      close();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not save this action.'); }
    finally { setSaving(false); }
  }

  return <>
    {!modalOnly && <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ActionTile icon="pi-user-plus" title="Register customer" description="Add a customer in this trekking region." onClick={() => open('customer')} />
        {!trek.isLocked && <ActionTile icon="pi-map-marker" title="Add walk-in stop" description="Add a customer visit to this trek." onClick={() => open('stop')} />}
        {!!stopChoices.length && <>
          <ActionTile icon="pi-shopping-cart" title="Unplanned sale" description="Record a product sold at a stop." onClick={() => open('sale')} />
          <ActionTile icon="pi-replay" title="Record return" description="Log a product returned by a customer." onClick={() => open('return')} />
        </>}
      </div>
      <p className="flex items-center gap-2 text-[11px] text-portal-muted"><i className="pi pi-database text-portal-accent" aria-hidden="true" />{backendReady ? 'Saved on this device · syncs when connected' : 'Saved on this device · upload when the backend is available'}</p>
    </div>}
    <FlatModal visible={kind !== null} onHide={close} title={{ customer: 'Register customer', stop: 'Add walk-in stop', sale: 'Record unplanned sale', return: 'Record return' }[kind ?? 'customer']} size="md"
      footer={<><FlatButton size="sm" variant="ghost" onClick={close}>Cancel</FlatButton><FlatButton size="sm" onClick={save} loading={saving}>Save action</FlatButton></>}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {kind === 'stop' && !customerChoices.length && <p className="col-span-full text-xs text-yellow-400">Customer list is empty. Download offline customers or register a new customer first.</p>}
        {(kind === 'sale' || kind === 'return') && !products.length && <p className="col-span-full text-xs text-yellow-400">Product catalogue is empty. Use Sync products in Offline data first.</p>}
        {kind === 'customer' && <>
          <div className="col-span-full flex items-center gap-2 text-[11px] text-portal-muted">
            <i className={`pi ${gpsStatus === 'capturing' ? 'pi-spin pi-spinner' : gpsStatus === 'captured' ? 'pi-check-circle text-portal-accent' : gpsStatus === 'unavailable' ? 'pi-exclamation-circle text-yellow-400' : 'pi-map-marker'}`} />
            <span>{gpsStatus === 'capturing' ? 'Capturing device location…' : gpsStatus === 'captured' ? 'Device location captured and will be saved with this customer.' : gpsStatus === 'unavailable' ? 'Location unavailable. Customer will still be saved without GPS.' : 'Device location is captured automatically when you save.'}</span>
          </div>
          {text('businessName', 'Business name', true)} {text('primaryPhoneNumber', 'Customer phone', true)}
          {select('customerType', 'Customer type', options(CUSTOMER_TYPES), true)} {text('tradingName', 'Trading name')}
          {text('whatsAppNumber', 'WhatsApp number')}
          <p className="col-span-full text-xs font-bold text-white pt-2">Representative</p>
          {text('firstName', 'First name', true)} {text('middleName', 'Middle name')} {text('lastName', 'Last name', true)}
          {select('relationshipType', 'Relationship', options(RELATIONSHIPS), true)} {text('representativePhone', 'Representative phone', true)}
        </>}
        {kind === 'stop' && <>
          {select('customer', 'Customer', customerChoices, true)} {number('sequence', 'Stop sequence', true, 1)} {text('notes', 'Notes')}
        </>}
        {(kind === 'sale' || kind === 'return') && <>
          {!(modalOnly && (requestedStopId || requestedStopClientId)) && select('stopId', 'Stop', stopChoices, true)}
          {select('productId', 'Product', products.filter((product) => product.isActive !== false).map((product) => ({ label: product.name, value: product.id })), true)}
          {number('basicQty', kind === 'sale' ? `Basic qty delivered${selectedProduct?.basicUnitName ? ` (${selectedProduct.basicUnitName})` : ''}` : `Basic qty returned${selectedProduct?.basicUnitName ? ` (${selectedProduct.basicUnitName})` : ''}`, true, 0.01)}
          {selectedProduct?.packagingUnitName && number('packagingQty', `${kind === 'sale' ? 'Packaging qty delivered' : 'Packaging qty returned'} (${selectedProduct.packagingUnitName})`)}
          {select('paymentMethod', kind === 'sale' ? 'Payment method' : 'Refund method', options(PAYMENTS))}
          {number('amount', kind === 'sale' ? 'Amount paid' : 'Refund amount')}
          {kind === 'sale' && number('balance', 'Balance')}
          {text('notes', kind === 'sale' ? 'Notes' : 'Reason')}
        </>}
      </div>
    </FlatModal>
  </>;
}
