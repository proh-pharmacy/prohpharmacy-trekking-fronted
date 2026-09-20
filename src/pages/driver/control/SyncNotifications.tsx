import { useEffect, useRef, useState } from 'react';
import type { DriverTrek } from '../../../api-client/treks';
import type { Product } from '../../../api-client/products';
import type { FieldCustomer, QueuedAction, QueuedPhoto } from './api';

interface Props {
  queue: QueuedAction[];
  photos: QueuedPhoto[];
  trek: DriverTrek;
  customers: FieldCustomer[];
  products: Product[];
  online: boolean;
  controlAvailable: boolean;
  busy: boolean;
  onSync: () => Promise<void>;
  onOpenSyncCenter: () => void;
}

const actionTitles: Record<QueuedAction['type'], string> = {
  RegisterCustomer: 'New customer',
  UpdateCustomer: 'Customer update',
  AddCustomerLocation: 'New customer location',
  UpdateCustomerLocation: 'Location update',
  AddWalkInStop: 'Additional stop',
  RecordDelivery: 'Delivery',
  RecordUnplannedSale: 'Unplanned sale',
  RecordReturn: 'Product return',
  VoidReturn: 'Return cancellation',
};

function actionDetail(action: QueuedAction, queue: QueuedAction[], trek: DriverTrek, customers: FieldCustomer[], products: Product[]) {
  const payload = action.payload;
  const customerId = payload.customerId ?? payload.customerAccountId;
  const customerClientId = payload.customerClientId;
  const customerName = customers.find((customer) => customer.id === customerId)?.businessName
    ?? queue.find((item) => item.clientId === customerClientId && item.type === 'RegisterCustomer')?.payload.businessName;

  if (action.type === 'RegisterCustomer') return String(payload.businessName || 'Customer details');
  if (action.type === 'UpdateCustomer' || action.type === 'AddCustomerLocation' || action.type === 'UpdateCustomerLocation') {
    return String(customerName || 'Customer details');
  }
  if (action.type === 'AddWalkInStop') return String(customerName || `Stop ${payload.sequence ?? ''}`).trim();
  if (action.type === 'RecordDelivery') {
    return trek.stops.flatMap((stop) => stop.products).find((product) => product.stopProductId === payload.stopProductId)?.productName || 'Trek product';
  }
  if (action.type === 'RecordUnplannedSale' || action.type === 'RecordReturn') {
    return products.find((product) => product.id === payload.productId)?.name || 'Product details';
  }
  return 'Return details';
}

export function SyncNotifications({ queue, photos, trek, customers, products, online, controlAvailable, busy, onSync, onOpenSyncCenter }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const actions = queue.filter((action) => action.status !== 'synced');
  const uploads = photos.filter((photo) => photo.status !== 'uploaded');
  const pendingCount = actions.filter((action) => action.status === 'pending').length + uploads.filter((photo) => photo.status === 'pending').length;
  const attentionCount = actions.length + uploads.length;
  const notifications = [
    ...actions.map((action) => ({
      id: action.clientId,
      title: actionTitles[action.type],
      detail: actionDetail(action, queue, trek, customers, products),
      status: action.status,
      reason: action.reason,
      occurredAt: action.occurredAt,
    })),
    ...uploads.map((photo) => ({
      id: photo.photoId,
      title: photo.kind === 'premises' ? 'Premises photo' : 'Representative photo',
      detail: photo.file.name,
      status: photo.status,
      reason: photo.reason,
      occurredAt: '',
    })),
  ].sort((a, b) => (a.status === 'conflict' ? -1 : 0) - (b.status === 'conflict' ? -1 : 0) || b.occurredAt.localeCompare(a.occurredAt));

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative flex shrink-0 items-center gap-2">
      {busy && <i className="pi pi-spin pi-sync text-sm text-portal-accent" role="status" aria-label="Sync in progress" />}
      <button
        type="button"
        aria-label={attentionCount ? `Sync notifications, ${attentionCount} item${attentionCount === 1 ? '' : 's'}` : 'Sync notifications'}
        aria-expanded={open}
        aria-controls="driver-sync-notifications"
        onClick={() => setOpen((value) => !value)}
        className={`relative flex h-10 w-10 items-center justify-center rounded transition-colors ${open ? 'bg-portal-accent/10 text-portal-accent' : 'text-portal-text hover:bg-white/[0.08] hover:text-white'}`}
      >
        <i className="pi pi-bell text-base" aria-hidden="true" />
        {attentionCount > 0 && <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-red-accent px-0.5 text-[10px] font-semibold leading-none text-white">{attentionCount > 9 ? '9+' : attentionCount}</span>}
      </button>

      {open && (
        <div id="driver-sync-notifications" className="absolute right-0 top-[calc(100%+0.75rem)] z-[1500] w-[min(22rem,calc(100vw-1rem))] overflow-hidden rounded border border-portal-border bg-portal-surface shadow-2xl">
          <div className="flex items-center justify-between gap-3 border-b border-portal-border/60 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-portal-text">Sync notifications</p>
              <p className="text-[11px] text-portal-muted">{attentionCount ? `${pendingCount} awaiting sync${attentionCount > pendingCount ? ` · ${attentionCount - pendingCount} need attention` : ''}` : 'Everything is up to date'}</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close sync notifications" className="rounded p-1 text-portal-muted hover:bg-white/[0.08] hover:text-white"><i className="pi pi-times text-xs" /></button>
          </div>

          {notifications.length > 0 && (
            <div className="max-h-[min(52dvh,24rem)] overflow-y-auto custom-scrollbar">
              {notifications.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { setOpen(false); onOpenSyncCenter(); }}
                  className="flex w-full items-start gap-3 border-b border-portal-border/40 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-white/[0.05]"
                >
                  <i className={`pi ${item.status === 'conflict' ? 'pi-exclamation-circle text-red-accent' : 'pi-cloud-upload text-portal-accent'} mt-0.5 text-sm`} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-medium text-portal-text">{item.title}</span>
                    <span className="block truncate text-[11px] text-portal-muted">{item.detail}</span>
                    {item.reason && <span className="mt-1 block text-[11px] text-red-accent">{item.reason}</span>}
                  </span>
                  <span className={`shrink-0 text-[10px] ${item.status === 'conflict' ? 'text-red-accent' : 'text-portal-muted'}`}>{item.status === 'conflict' ? 'Needs attention' : 'Pending'}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 border-t border-portal-border/60 px-4 py-3">
            <button type="button" onClick={() => { setOpen(false); onOpenSyncCenter(); }} className="text-xs font-medium text-portal-text hover:text-white">Open Sync Center</button>
            {pendingCount > 0 && <button type="button" onClick={() => void onSync()} disabled={!online || !controlAvailable || busy} className="rounded bg-portal-accent px-3 py-2 text-xs font-semibold text-portal-canvas disabled:cursor-not-allowed disabled:opacity-50">Sync now</button>}
          </div>
        </div>
      )}
    </div>
  );
}
