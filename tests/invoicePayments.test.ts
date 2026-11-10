import assert from 'node:assert/strict';
import test from 'node:test';
import { paymentError, hasLegacyCollection, goodsOnly } from '../src/components/invoices/paymentRules.ts';
import { applyOfflineSyncResults, reconcileUnplannedSales } from '../src/pages/driver/control/offlineLifecycle.ts';
import { offlineInvoice } from '../src/pages/driver/control/offlineInvoice.ts';
import type { DriverStop, DriverTrek } from '../src/api-client/treks.ts';
import type { QueuedAction } from '../src/pages/driver/control/api.ts';

test('collection accepts partial and exact payments but rejects Credit, zero, overpayment, invalid precision', () => {
  for (const method of ['Cash', 'MobileMoney', 'Cheque', 'BankTransfer']) {
    assert.equal(paymentError(400, 600, method), null);
    assert.equal(paymentError(200, 200, method), null);
  }
  for (const amount of [0, -1, NaN, Infinity, 600.01, 1.001]) assert.ok(paymentError(amount, 600, 'Cash'));
  assert.ok(paymentError(400, 600, 'Credit'));
});

test('legacy goods requests including zero are quarantined and explicit release retains only goods', () => {
  for (const field of ['amtPaid', 'balance', 'paymentMethod']) {
    const payload = { stopProductId: 'product', basicQtyDelivered: 10, [field]: 0 };
    assert.equal(hasLegacyCollection({ type: 'RecordDelivery', payload }), true);
    assert.deepEqual(goodsOnly(payload), { stopProductId: 'product', basicQtyDelivered: 10 });
    assert.equal(payload[field], 0);
  }
  assert.equal(hasLegacyCollection({ type: 'RecordInvoicePayment', payload: { amount: 400, paymentMethod: 'Cash' } }), false);
});

test('offline stop payment keeps stable payload and UUID through lost response and parent reconciliation', () => {
  const payment: QueuedAction = { type: 'RecordInvoicePayment', clientId: 'payment-uuid', occurredAt: '2026-11-08T12:30:00Z',
    status: 'pending', payload: { stopClientId: 'stop-uuid', amount: 400, paymentMethod: 'Cash', reference: null } };
  const stop: QueuedAction = { type: 'AddWalkInStop', clientId: 'stop-uuid', occurredAt: '2026-11-08T12:00:00Z', status: 'pending', payload: {} };
  const recovered = applyOfflineSyncResults([stop, payment], [{ clientId: stop.clientId, type: stop.type, status: 'AlreadySynced', serverId: 'stop-server', invoiceId: 'invoice-server' }]);
  assert.deepEqual(recovered[1], payment);
  const acknowledged = applyOfflineSyncResults(recovered, [{ clientId: payment.clientId, type: payment.type, status: 'AlreadySynced', serverId: 'payment-server', invoiceId: 'invoice-server', receiptNumber: 'RCP-test' }]);
  assert.equal(acknowledged[1].serverId, 'payment-server');
  assert.equal(acknowledged[1].invoiceId, 'invoice-server');
  assert.equal(acknowledged[1].receiptNumber, 'RCP-test');
  assert.deepEqual(acknowledged[1].payload, payment.payload);
  assert.equal(acknowledged[1].occurredAt, payment.occurredAt);
});

test('a server product mapping cannot silently acknowledge a legacy collection', () => {
  const legacy: QueuedAction = { type: 'RecordUnplannedSale', clientId: 'sale-local', occurredAt: '', status: 'conflict', payload: { amtPaid: 20 }, legacyPaymentReview: true };
  assert.equal(reconcileUnplannedSales([legacy], [{ stopId: 'stop', products: [{ stopProductId: 'product-server', clientGeneratedId: 'sale-local' }] }])[0].status, 'conflict');
});

test('offline invoice uses planned quantities until delivery, including explicit zero, and ignores legacy line payments', () => {
  const stop = { stopId: 'stop', customerName: 'Customer', customerCode: 'C1', sequence: 1, invoiceId: 'invoice', invoiceTotal: 600, invoicePaid: 100, invoiceBalance: 500, invoiceStatus: 'PartiallyPaid', products: [
    { stopProductId: 'product-1', productId: 'p1', productName: 'One', plannedBasicQuantity: 10, plannedPackagingQuantity: 2, basicUnitPrice: 20, packagingUnitPrice: 100, packagingUnitName: 'Box', amtPaid: 999, balance: 999 },
    { stopProductId: 'product-2', productId: 'p2', productName: 'Two', plannedBasicQuantity: 10, plannedPackagingQuantity: 0, basicUnitPrice: 20, packagingUnitPrice: null, packagingUnitName: null, amtPaid: 999 },
  ] } as DriverStop;
  const trek = { trekId: 'trek', stops: [stop], scheduledDate: '2026-11-08' } as DriverTrek;
  const planned = offlineInvoice(trek, stop, [], [], []);
  assert.equal(planned.lineItems.length, 2);
  assert.equal(planned.totalAmount, 600);
  assert.equal(planned.totalPaid, 100);
  assert.equal(planned.balance, 500);
  const delivered = offlineInvoice(trek, stop, [], [], [{ type: 'RecordDelivery', clientId: 'delivery', occurredAt: '', status: 'pending', payload: { stopProductId: 'product-1', basicQtyDelivered: 0, packagingQtyDelivered: 0 } }]);
  assert.equal(delivered.lineItems[0].lineTotal, 0);
  assert.equal(delivered.lineItems[1].lineTotal, 200);
  assert.equal(delivered.totalAmount, 200);
  assert.equal(delivered.balance, 100);
});
