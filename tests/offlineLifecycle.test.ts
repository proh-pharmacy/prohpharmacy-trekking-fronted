import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyOfflineSyncResults,
  visibleActionsForStop,
  visibleWalkInStopActions,
  type OfflineActionLike,
  type OfflineSyncResultLike,
} from '../src/pages/driver/control/offlineLifecycle.ts';

const action = (
  type: string,
  clientId: string,
  payload: Record<string, unknown>,
  status: OfflineActionLike['status'] = 'pending',
  serverId?: string,
  occurredAt = '2026-09-23T10:00:00.000Z',
): OfflineActionLike => ({ type, clientId, payload, status, serverId, occurredAt });

const created = (type: string, clientId: string, serverId: string): OfflineSyncResultLike => ({
  type, clientId, serverId, status: 'Created',
});

test('offline customer -> stop -> sale remains linked immediately', () => {
  const queue = [
    action('RegisterCustomer', 'customer-local-1', { businessName: 'One' }),
    action('AddWalkInStop', 'stop-local-1', { trekId: 'trek-1', customerClientId: 'customer-local-1' }),
    action('RecordUnplannedSale', 'sale-local-1', { stopClientId: 'stop-local-1', productId: 'product-1' }),
  ];
  const stops = visibleWalkInStopActions(queue, 'trek-1', []);
  assert.deepEqual(stops.map((item) => item.clientId), ['stop-local-1']);
  assert.deepEqual(visibleActionsForStop(queue, 'RecordUnplannedSale', { stopClientId: 'stop-local-1' })
    .map((item) => item.clientId), ['sale-local-1']);
});

test('multiple offline customers and sales retain separate relationships', () => {
  const queue = [
    action('RegisterCustomer', 'customer-a', { businessName: 'A' }),
    action('AddWalkInStop', 'stop-a', { trekId: 'trek-1', customerClientId: 'customer-a' }),
    action('RecordUnplannedSale', 'sale-a', { stopClientId: 'stop-a' }),
    action('RegisterCustomer', 'customer-b', { businessName: 'B' }, 'pending', undefined, '2026-09-23T10:01:00.000Z'),
    action('AddWalkInStop', 'stop-b', { trekId: 'trek-1', customerClientId: 'customer-b' }, 'pending', undefined, '2026-09-23T10:02:00.000Z'),
    action('RecordUnplannedSale', 'sale-b', { stopClientId: 'stop-b' }, 'pending', undefined, '2026-09-23T10:03:00.000Z'),
  ];
  assert.equal(new Set(queue.map((item) => item.clientId)).size, queue.length);
  assert.deepEqual(visibleActionsForStop(queue, 'RecordUnplannedSale', { stopClientId: 'stop-a' }).map((item) => item.clientId), ['sale-a']);
  assert.deepEqual(visibleActionsForStop(queue, 'RecordUnplannedSale', { stopClientId: 'stop-b' }).map((item) => item.clientId), ['sale-b']);
});

test('rehydrating the same durable queue preserves optimistic stop and sale', () => {
  const rehydrated = JSON.parse(JSON.stringify([
    action('AddWalkInStop', 'stop-local', { trekId: 'trek-1', customerClientId: 'customer-local' }),
    action('RecordUnplannedSale', 'sale-local', { stopClientId: 'stop-local' }),
  ])) as OfflineActionLike[];
  assert.equal(visibleWalkInStopActions(rehydrated, 'trek-1', []).length, 1);
  assert.equal(visibleActionsForStop(rehydrated, 'RecordUnplannedSale', { stopClientId: 'stop-local' }).length, 1);
});

test('a stale or failed refresh does not hide successfully synced local records', () => {
  const queue = [
    action('AddWalkInStop', 'stop-local', { trekId: 'trek-1', customerId: 'customer-server' }, 'synced', 'stop-server'),
    action('RecordUnplannedSale', 'sale-local', { stopId: 'stop-server' }, 'synced', 'product-server'),
  ];
  assert.equal(visibleWalkInStopActions(queue, 'trek-1', []).length, 1);
  assert.equal(visibleActionsForStop(queue, 'RecordUnplannedSale', { stopClientId: 'stop-local' }).length, 1);
});

test('confirmed server records replace optimistic records without duplicates', () => {
  const queue = [
    action('AddWalkInStop', 'stop-local', { trekId: 'trek-1', customerId: 'customer-server' }, 'synced', 'stop-server'),
    action('RecordUnplannedSale', 'sale-local', { stopId: 'stop-server' }, 'synced', 'product-server'),
  ];
  const serverStops = [{ stopId: 'stop-server', products: [{ stopProductId: 'product-server' }] }];
  assert.equal(visibleWalkInStopActions(queue, 'trek-1', serverStops).length, 0);
  assert.equal(visibleActionsForStop(queue, 'RecordUnplannedSale', { stopId: 'stop-server' }, ['product-server']).length, 0);
});

test('customer and stop IDs reconcile even when the sale fails', () => {
  const queue = [
    action('RegisterCustomer', 'customer-local', { businessName: 'Customer' }),
    action('AddWalkInStop', 'stop-local', { trekId: 'trek-1', customerClientId: 'customer-local' }),
    action('RecordUnplannedSale', 'sale-local', { stopClientId: 'stop-local' }),
  ];
  const reconciled = applyOfflineSyncResults(queue, [
    created('RegisterCustomer', 'customer-local', 'customer-server'),
    created('AddWalkInStop', 'stop-local', 'stop-server'),
    { type: 'RecordUnplannedSale', clientId: 'sale-local', serverId: null, status: 'Conflict', reason: 'Temporary failure' },
  ]);
  assert.deepEqual(reconciled[1].payload, { trekId: 'trek-1', customerId: 'customer-server' });
  assert.deepEqual(reconciled[2].payload, { stopId: 'stop-server' });
  assert.equal(reconciled[2].status, 'conflict');
  assert.equal(visibleActionsForStop(reconciled, 'RecordUnplannedSale', { stopId: 'stop-server' }).length, 1);
});

test('a successful sale is not hidden when its local parent remains conflicted', () => {
  const queue = [
    action('AddWalkInStop', 'stop-local', { trekId: 'trek-1', customerClientId: 'customer-local' }),
    action('RecordUnplannedSale', 'sale-local', { stopClientId: 'stop-local' }),
  ];
  const reconciled = applyOfflineSyncResults(queue, [
    { type: 'AddWalkInStop', clientId: 'stop-local', serverId: null, status: 'Conflict', reason: 'Customer is unavailable' },
    created('RecordUnplannedSale', 'sale-local', 'product-server'),
  ]);
  assert.equal(reconciled[0].status, 'conflict');
  assert.equal(reconciled[1].status, 'synced');
  assert.equal(visibleWalkInStopActions(reconciled, 'trek-1', []).length, 1);
  assert.equal(visibleActionsForStop(reconciled, 'RecordUnplannedSale', { stopClientId: 'stop-local' }).length, 1);
});

test('parent IDs reconcile into dependent actions omitted from the sync batch', () => {
  const queue = [
    action('RegisterCustomer', 'customer-local', { businessName: 'Customer' }),
    action('AddWalkInStop', 'stop-local', { trekId: 'trek-1', customerClientId: 'customer-local' }),
    action('RecordUnplannedSale', 'sale-local', { stopClientId: 'stop-local' }),
  ];
  const afterCustomer = applyOfflineSyncResults(queue, [created('RegisterCustomer', 'customer-local', 'customer-server')]);
  assert.deepEqual(afterCustomer[1].payload, { trekId: 'trek-1', customerId: 'customer-server' });
  const afterStop = applyOfflineSyncResults(afterCustomer, [created('AddWalkInStop', 'stop-local', 'stop-server')]);
  assert.deepEqual(afterStop[2].payload, { stopId: 'stop-server' });
  assert.equal(afterStop[2].status, 'pending');
});

test('a child created after its parent synced reconciles from the stored server ID', () => {
  const queue = [
    action('AddWalkInStop', 'stop-local', { trekId: 'trek-1', customerId: 'customer-server' }, 'synced', 'stop-server'),
    action('RecordUnplannedSale', 'sale-local', { stopClientId: 'stop-local' }),
  ];
  const reconciled = applyOfflineSyncResults(queue, [{
    type: 'RecordUnplannedSale', clientId: 'sale-local', serverId: null, status: 'Conflict', reason: 'Retry later',
  }]);
  assert.deepEqual(reconciled[1].payload, { stopId: 'stop-server' });
  assert.equal(visibleActionsForStop(queue, 'RecordUnplannedSale', { stopId: 'stop-server' }).length, 1);
});

test('a failed stop and sale remain retryable and visible', () => {
  const queue = [
    action('AddWalkInStop', 'stop-local', { trekId: 'trek-1', customerClientId: 'customer-local' }, 'conflict'),
    action('RecordUnplannedSale', 'sale-local', { stopClientId: 'stop-local' }, 'conflict'),
  ];
  assert.equal(visibleWalkInStopActions(queue, 'trek-1', []).length, 1);
  assert.equal(visibleActionsForStop(queue, 'RecordUnplannedSale', { stopClientId: 'stop-local' }).length, 1);
});
