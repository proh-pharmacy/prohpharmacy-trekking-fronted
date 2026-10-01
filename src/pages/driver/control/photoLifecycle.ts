import type { QueuedAction, QueuedPhoto } from './api';

export const photoLabel = (kind: QueuedPhoto['kind']) => ({
  premises: 'Premises photo', portrait: 'Representative photo', idFront: 'ID document front', idBack: 'ID document back',
})[kind];

export const isIdPhoto = (photo: Pick<QueuedPhoto, 'kind'>) => photo.kind === 'idFront' || photo.kind === 'idBack';

// Use the canonical server ID when a registration has already resolved.
export function photoCustomerReference(photo: QueuedPhoto, actions: QueuedAction[]): string | undefined {
  return photo.customerId || actions.find(a => a.clientId === photo.customerClientId && a.status === 'synced')?.serverId || photo.customerClientId;
}

export function replaceQueuedPhoto(photos: QueuedPhoto[], replacement: QueuedPhoto, actions: QueuedAction[]): QueuedPhoto[] {
  const reference = photoCustomerReference(replacement, actions);
  return [...photos.filter(photo => photo.kind !== replacement.kind || photoCustomerReference(photo, actions) !== reference), replacement];
}

export function resolvePhotoDependency(photo: QueuedPhoto, actions: QueuedAction[]): { customerId?: string; reason?: string } {
  const registration = actions.find(action => action.clientId === photo.customerClientId);
  const metadata = actions.find(action => action.clientId === photo.metadataActionId);
  if (photo.metadataActionId && (!metadata || metadata.status !== 'synced' ||
    (metadata.type === 'UpdateCustomer' && metadata.syncResult !== 'Created'))) {
    return { reason: metadata?.reason || 'Waiting for document details to sync. Correct conflicts in the customer form.' };
  }
  if (isIdPhoto(photo) && metadata?.type === 'RegisterCustomer' && metadata.syncResult === 'AlreadySynced') {
    return { reason: 'Waiting for an explicit document update after matching an existing customer.' };
  }
  const customerId = photo.customerId || (registration?.status === 'synced' ? registration.serverId : null);
  return customerId ? { customerId } : { reason: registration?.reason || 'Waiting for customer registration to sync.' };
}

export function photoFailure(photo: QueuedPhoto, error: unknown, now = Date.now()): QueuedPhoto {
  const problem = error as { status?: number; code?: string; message?: string };
  const permanent = ['400', '404', '409', '422'].includes(problem.code || '') ||
    (problem.status !== undefined && problem.status >= 400 && problem.status < 500 && ![408, 429].includes(problem.status));
  const attempts = (photo.attempts || 0) + 1;
  return { ...photo, attempts, status: permanent ? 'conflict' : 'pending',
    nextAttemptAt: permanent ? undefined : now + Math.min(300_000, 5000 * 2 ** Math.min(attempts - 1, 6)),
    reason: `Upload failed: ${problem.message || 'Check your connection and try again.'}` };
}

// Acknowledge only the uploaded version, never a replacement captured in flight.
export const acknowledgePhoto = (photos: QueuedPhoto[], photoId: string) => photos.filter(photo => photo.photoId !== photoId);

/** Registration phone matches don't apply metadata. Follow with an explicit update. */
export function reconcileRegistrationDocuments(actions: QueuedAction[], results: Array<{ clientId: string; status: string }>, makeId: () => string): {
  actions: QueuedAction[]; dependencies: Map<string, string>;
} {
  const next = [...actions];
  const dependencies = new Map<string, string>();
  for (const result of results) {
    const registration = next.find(action => action.clientId === result.clientId && action.type === 'RegisterCustomer');
    if (result.status !== 'AlreadySynced' || !registration?.serverId || !registration.payload.idDocumentType || !registration.payload.idDocumentNumber) continue;
    const updates = next.filter(action => action.type === 'UpdateCustomer' &&
      (action.payload.customerId === registration.serverId || action.payload.customerClientId === registration.clientId) &&
      action.payload.idDocumentType && action.payload.idDocumentNumber).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
    let update = updates[0];
    if (!update) {
      update = { clientId: makeId(), type: 'UpdateCustomer', status: 'pending',
        occurredAt: new Date(Math.max(Date.now(), ...next.map(action => Date.parse(action.occurredAt) + 1))).toISOString(),
        payload: { customerId: registration.serverId, idDocumentType: registration.payload.idDocumentType, idDocumentNumber: registration.payload.idDocumentNumber } };
      next.push(update);
    }
    dependencies.set(registration.clientId, update.clientId);
  }
  return { actions: next, dependencies };
}
