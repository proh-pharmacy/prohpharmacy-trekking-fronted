import assert from 'node:assert/strict';
import test from 'node:test';
import { estimateTrekStock, stockLevel, projectStock } from '../src/pages/driver/control/stockEstimate.ts';
import type { DriverTrek, DriverStopProduct } from '../src/api-client/treks';
import type { StockItem } from '../src/api-client/vehicleStock';
import type { QueuedAction } from '../src/pages/driver/control/api';

const stock = [{ productId: 'p1', productName: 'Product', basicUnitName: 'Bottles', packagingUnitName: 'Boxes', basicQuantityOnHand: 100, packagingQuantityOnHand: 10, lowStockThreshold: 10, updatedAt: null }] as StockItem[];
const product = (overrides: Partial<DriverStopProduct> = {}) => ({ stopProductId: 'line1', productId: 'p1', productName: 'Product', plannedBasicQuantity: 50, plannedPackagingQuantity: 3, basicQtyDelivered: 20, packagingQtyDelivered: 2, ...overrides }) as DriverStopProduct;
const trek = (products = [product()], status = 'InProgress') => ({ trekId: 'trek1', status, stops: [{ stopId: 'stop1', products }] }) as DriverTrek;
const action = (type: QueuedAction['type'], payload: Record<string, unknown>, overrides: Partial<QueuedAction> = {}) => ({ type, payload, clientId: 'action1', status: 'pending', occurredAt: '2026-11-16T10:00:00Z', ...overrides }) as QueuedAction;
const result = (t = trek(), q: QueuedAction[] = [], inventory = stock) => estimateTrekStock(inventory, t, q).byProduct.get('p1')!;

test('subtracts delivered goods in separate units, not planned quantities or payments', () => {
  const item = result(trek([product(), product({ stopProductId: 'line2', basicQtyDelivered: null, packagingQtyDelivered: null })]), [action('RecordInvoicePayment', { amount: 500 })]);
  assert.equal(item.basicRemaining, 80); assert.equal(item.packagingRemaining, 8);
});
test('latest queued edit replaces delivery, including explicit zero and packaging-only edits', () => {
  const q = [action('RecordDelivery', { stopProductId: 'line1', basicQtyDelivered: 40 }), action('RecordDelivery', { stopProductId: 'line1', basicQtyDelivered: 0, packagingQtyDelivered: 4 }, { occurredAt: '2026-11-16T11:00:00Z' })];
  assert.equal(result(trek(), q).basicRemaining, 100);
  assert.equal(result(trek(), q).packagingRemaining, 6);
  const usage = estimateTrekStock(stock, trek(), q).byDelivery.get('line1');
  assert.deepEqual(usage, { basic: 0, packaging: 4 });
});
test('pending and synced-but-unconfirmed sales count once; confirmed sales are deduplicated', () => {
  const sale = action('RecordUnplannedSale', { stopId: 'stop1', productId: 'p1', basicQtyDelivered: 10, packagingQtyDelivered: 1 });
  assert.equal(result(trek(), [sale]).basicRemaining, 70);
  const synced = { ...sale, status: 'synced' as const, serverId: 'sale1' };
  assert.equal(result(trek(), [synced]).basicRemaining, 70);
  const confirmed = trek([product(), product({ stopProductId: 'sale1', clientGeneratedId: sale.clientId, basicQtyDelivered: 10, packagingQtyDelivered: 1 })]);
  assert.equal(result(confirmed, [synced]).basicRemaining, 70);
  assert.equal(result(confirmed, [sale]).basicRemaining, 70);
});
test('offline walk-in sales survive parent reconciliation and exclude other treks', () => {
  const parent = action('AddWalkInStop', { trekId: 'trek1' }, { clientId: 'localStop', serverId: 'newStop', status: 'synced' });
  const sale = action('RecordUnplannedSale', { stopClientId: 'localStop', productId: 'p1', basicQtyDelivered: 15 });
  const foreign = action('RecordUnplannedSale', { stopId: 'anotherTrekStop', productId: 'p1', basicQtyDelivered: 90 });
  assert.equal(result(trek(), [parent, sale, foreign]).basicRemaining, 65);
  assert.equal(result(trek(), [parent, { ...sale, payload: { ...sale.payload, stopClientId: undefined, stopId: 'newStop' } }]).basicRemaining, 65);
});
test('conflicts reserve a conservative quantity and flag review; cancellation releases it', () => {
  const sale = action('RecordUnplannedSale', { stopId: 'stop1', productId: 'p1', basicQtyDelivered: 15 }, { status: 'conflict' });
  assert.equal(result(trek(), [sale]).basicRemaining, 65);
  assert.equal(stockLevel(result(trek(), [sale])).label, 'Needs review');
  assert.equal(result().basicRemaining, 80);
});
test('returns never add speculative saleable stock and completed treks are not deducted twice', () => {
  const q = [action('RecordReturn', { productId: 'p1', basicQtyReturned: 10 })];
  assert.equal(result(trek(), q).basicRemaining, 80);
  assert.equal(result(trek([product()], 'Completed'), q).basicRemaining, 100);
  assert.equal(result(trek([product()], 'Cancelled')).basicRemaining, 100);
});
test('unknown stock stays unknown; zero, low and shortfall statuses are distinct', () => {
  assert.equal(stockLevel(result(trek(), [], [])).label, 'Stock unavailable');
  assert.equal(stockLevel(result(trek([product({ basicQtyDelivered: 100, packagingQtyDelivered: 10 })]))).label, 'Out of stock');
  assert.equal(stockLevel(result(trek([product({ basicQtyDelivered: 95 })]))).label, 'Low stock');
  assert.equal(stockLevel(result(trek([product({ packagingQtyDelivered: 11 })]))).label, 'Shortfall');
});
test('newer server deliveries win over retained synced edits', () => {
  const t = trek([product({ basicQtyDelivered: 30, deliveredAt: '2026-11-16T12:00:00Z' })]);
  const q = [action('RecordDelivery', { stopProductId: 'line1', basicQtyDelivered: 10 }, { status: 'synced' })];
  assert.equal(result(t, q).basicRemaining, 70);
  assert.equal(result(trek(), q).basicRemaining, 90);
});
test('fractional quantities are rounded and inputs are not mutated', () => {
  const inventory = [{ ...stock[0], basicQuantityOnHand: 0.3 }];
  const t = trek([product({ basicQtyDelivered: 0.1 })]);
  const before = JSON.stringify({ inventory, t });
  assert.equal(result(t, [], inventory).basicRemaining, 0.2);
  assert.equal(JSON.stringify({ inventory, t }), before);
});

test('editing an existing delivery releases only its own usage; blanks preserve omitted quantities', () => {
  const estimate = estimateTrekStock(stock, trek(), []);
  const item = estimate.byProduct.get('p1')!;
  assert.deepEqual(projectStock(item, 25, NaN, estimate.byDelivery.get('line1')), {
    availableBasic: 100, availablePackaging: 10, afterBasic: 75, afterPackaging: 8, exceeds: false,
  });
  assert.equal(projectStock(item, 81, 0)?.exceeds, true);
  assert.equal(projectStock(item, 0, 9)?.exceeds, true);
  assert.equal(projectStock(result(trek(), [], []), 1, 0), null);
});
