import assert from 'node:assert/strict';
import test from 'node:test';
import { acknowledgePhoto, photoFailure, replaceQueuedPhoto, resolvePhotoDependency, reconcileRegistrationDocuments } from '../src/pages/driver/control/photoLifecycle.ts';
import { applyOfflineSyncResults } from '../src/pages/driver/control/offlineLifecycle.ts';
import { applyCustomerUpdate, mergeCachedCustomer, registrationDetails } from '../src/pages/driver/control/customerCache.ts';
import type { QueuedAction, QueuedPhoto, FieldCustomer } from '../src/pages/driver/control/api.ts';

const registration: QueuedAction = { clientId: 'local', type: 'RegisterCustomer', occurredAt: '2026-10-01T10:00:00Z',
  status: 'pending', payload: { businessName: 'Pharmacy', idDocumentType: 'PharmacyLicence', idDocumentNumber: 'PH-1' } };
const photo = (side: 'idFront' | 'idBack', id = side): QueuedPhoto => ({ photoId: id, customerClientId: 'local', metadataActionId: 'local',
  kind: side, file: new File(['image bytes'], 'card.png', { type: 'image/png' }), status: 'pending' });

test('image bytes survive structured cloning and both sides wait for durable registration mapping', async () => {
  const front = structuredClone(photo('idFront'));
  assert.equal(await front.file.text(), 'image bytes');
  assert.equal(front.file.type, 'image/png');
  assert.equal(resolvePhotoDependency(front, [registration]).customerId, undefined);
  const actions = applyOfflineSyncResults([registration], [{ clientId: 'local', type: 'RegisterCustomer', status: 'Created', serverId: 'server' }]);
  assert.equal(resolvePhotoDependency(front, actions).customerId, 'server');
  assert.equal(resolvePhotoDependency(photo('idBack'), actions).customerId, 'server');
});

test('images with a known server customer still wait for their metadata update to succeed', () => {
  const update: QueuedAction = { ...registration, type: 'UpdateCustomer', clientId: 'edit', payload: { customerId: 'server' } };
  const front = { ...photo('idFront'), customerId: 'server', metadataActionId: 'edit' };
  for (const status of ['pending', 'conflict'] as const) assert.equal(resolvePhotoDependency(front, [{ ...update, status }]).customerId, undefined);
  assert.equal(resolvePhotoDependency(front, [{ ...update, status: 'synced', syncResult: 'AlreadySynced' }]).customerId, undefined);
  assert.equal(resolvePhotoDependency(front, [{ ...update, status: 'synced', syncResult: 'Created' }]).customerId, 'server');
});

test('registration AlreadySynced generates an explicit update and gates image uploads', () => {
  const actions = applyOfflineSyncResults([registration], [{ clientId: 'local', type: 'RegisterCustomer', status: 'AlreadySynced', serverId: 'server' }]);
  assert.equal(resolvePhotoDependency(photo('idFront'), actions).customerId, undefined);
  const reconciled = reconcileRegistrationDocuments(actions, [{ clientId: 'local', status: 'AlreadySynced' }], () => 'edit');
  assert.equal(reconciled.dependencies.get('local'), 'edit');
  assert.deepEqual(reconciled.actions[1].payload, { customerId: 'server', idDocumentType: 'PharmacyLicence', idDocumentNumber: 'PH-1' });
  const pending = { ...photo('idFront'), metadataActionId: 'edit' };
  assert.equal(resolvePhotoDependency(pending, reconciled.actions).customerId, undefined);
  const saved = applyOfflineSyncResults(reconciled.actions, [{ clientId: 'edit', type: 'UpdateCustomer', status: 'Created', serverId: 'server' }]);
  assert.equal(resolvePhotoDependency(pending, saved).customerId, 'server');
});

test('registration replay never overwrites a newer queued document edit', () => {
  const reg = { ...registration, status: 'synced' as const, serverId: 'server', syncResult: 'AlreadySynced' as const };
  const edit: QueuedAction = { ...registration, type: 'UpdateCustomer', clientId: 'newer', payload: { customerId: 'server', idDocumentType: 'Passport', idDocumentNumber: 'P-2' } };
  const result = reconcileRegistrationDocuments([reg, edit], [{ clientId: 'local', status: 'AlreadySynced' }], () => 'unwanted');
  assert.equal(result.actions.length, 2);
  assert.equal(result.dependencies.get('local'), 'newer');
  assert.equal(registrationDetails(reg, [], '')?.idDocumentNumber, undefined);
});

test('replacing front preserves back; an obsolete acknowledgement cannot remove the replacement', () => {
  const initial = [photo('idFront'), photo('idBack')];
  const newer = { ...photo('idFront'), photoId: 'new-front' };
  const replaced = replaceQueuedPhoto(initial, newer, [registration]);
  const acknowledged = acknowledgePhoto(replaced, 'idFront');
  assert.deepEqual(acknowledged.map(item => item.photoId), ['idBack', 'new-front']);
  assert.deepEqual(acknowledgePhoto(acknowledged, 'new-front').map(item => item.photoId), ['idBack']);
});

test('replacement matches a previously local customer after server ID resolution', () => {
  const reg = { ...registration, serverId: 'server', status: 'synced' as const };
  const newer = { ...photo('idFront'), photoId: 'new', customerId: 'server', customerClientId: undefined };
  assert.deepEqual(replaceQueuedPhoto([photo('idFront'), photo('idBack')], newer, [reg]).map(item => item.photoId), ['idBack', 'new']);
});

test('transient failures back off and retain files; business/auth failures require explicit retry', () => {
  const front = photo('idFront');
  const first = photoFailure(front, new Error('Network lost'), 100);
  assert.equal(first.status, 'pending');
  assert.equal(first.nextAttemptAt, 5100);
  assert.equal(first.file, front.file);
  const second = photoFailure(first, { status: 503, message: 'Unavailable' }, 100);
  assert.equal(second.nextAttemptAt, 10100);
  for (const code of ['400', '404', '409', '422']) {
    const failure = photoFailure(front, { status: 422, code, message: 'Correction required' });
    assert.equal(failure.status, 'conflict');
    assert.equal(failure.nextAttemptAt, undefined);
    assert.equal(failure.file, front.file);
  }
});

test('read-back fields merge and unsynced metadata overlays server values without clearing images', () => {
  const server: FieldCustomer = { id: 'server', businessName: 'Pharmacy', primaryPhoneNumber: '0200000000',
    idDocumentType: 'PharmacyLicence', idDocumentNumber: 'PH-1', idCardFrontUrl: 'front', idCardBackUrl: 'back' };
  const incoming = mergeCachedCustomer(server, { ...server, idDocumentType: 'Passport', idDocumentNumber: 'P-2' });
  assert.equal(incoming.idDocumentNumber, 'P-2');
  const local = applyCustomerUpdate(incoming, { idDocumentType: 'Other', idDocumentNumber: 'NEW' }, []);
  assert.equal(local.idDocumentNumber, 'NEW');
  assert.equal(local.idCardBackUrl, 'back');
  assert.equal(applyCustomerUpdate(local, { businessName: 'Updated' }, []).idDocumentNumber, 'NEW');
  assert.equal(mergeCachedCustomer(server, { ...server, idCardFrontUrl: null }).idCardFrontUrl, null);
});
