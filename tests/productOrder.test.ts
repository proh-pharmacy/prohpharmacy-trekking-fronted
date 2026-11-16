import assert from 'node:assert/strict';
import test from 'node:test';
import { orderDriverProducts } from '../src/pages/driver/control/productOrder.ts';
import type { DriverStopProduct } from '../src/api-client/treks';
import type { QueuedAction } from '../src/pages/driver/control/api';

const product = (id: string, addedAt: string | null, extra = {}) => ({ stopProductId: id, addedAt, ...extra }) as DriverStopProduct;
const sale = (id: string, occurredAt: string, extra = {}) => ({ type: 'RecordUnplannedSale', clientId: id, occurredAt, payload: {}, ...extra }) as QueuedAction;
const ids = (items: ReturnType<typeof orderDriverProducts>) => items.map(item => item.product?.stopProductId ?? item.action?.clientId);
const first = '2026-11-16T10:00:00Z';
const last = '2026-11-16T11:00:00Z';

test('addition dates descend; ties and historical nulls retain source order without mutation', () => {
  const products = [product('historical1', null), product('early', first), product('late1', last), product('historical2', null), product('late2', last)];
  const before = JSON.stringify(products);
  assert.deepEqual(ids(orderDriverProducts(products, [], [])), ['late1', 'late2', 'early', 'historical1', 'historical2']);
  assert.equal(JSON.stringify(products), before);
});
test('delivery changes never substitute for missing or older addition dates', () => {
  const products = [product('old', first, { deliveredAt: '2027-01-01T00:00:00Z' }), product('new', last), product('historical', null, { deliveredAt: '2028-01-01T00:00:00Z' })];
  assert.deepEqual(ids(orderDriverProducts(products, [], [])), ['new', 'old', 'historical']);
});
test('offline sale keeps original occurrence order through acknowledgement and refresh', () => {
  const products = [product('existing', first)];
  const offline = sale('local', last);
  assert.deepEqual(ids(orderDriverProducts(products, [offline], [offline])), ['local', 'existing']);
  const synced = sale('local', last, { serverId: 'server', status: 'synced' });
  assert.deepEqual(ids(orderDriverProducts([...products, product('server', null)], [], [synced])), ['server', 'existing']);
  assert.deepEqual(ids(orderDriverProducts([...products, product('server', last)], [], [])), ['server', 'existing']);
});
test('server addition date takes precedence and invalid dates sort with historical rows', () => {
  const products = [product('server', first), product('later', last), product('invalid', 'bad-date'), product('historical', null)];
  assert.deepEqual(ids(orderDriverProducts(products, [], [sale('local', '2027-01-01T00:00:00Z', { serverId: 'server' })])), ['later', 'server', 'invalid', 'historical']);
});
