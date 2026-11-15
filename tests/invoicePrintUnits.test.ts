import assert from 'node:assert/strict';
import test from 'node:test';
import { invoicePrintUnits } from '../src/components/invoices/invoicePrintUnits.ts';

const line = {
  basicQuantity: 10, basicUnitName: 'Bottle', basicUnitPrice: 12.5,
  packagingQuantity: 2, packagingUnitName: 'Box', packagingUnitPrice: 100,
};

test('printed retail and wholesale quantities keep their own saved unit prices', () => {
  assert.deepEqual(invoicePrintUnits(line), [
    { quantity: 10, name: 'Bottle', price: 12.5 },
    { quantity: 2, name: 'Box', price: 100 },
  ]);
});

test('packaging-only and basic-only lines omit unused units', () => {
  assert.deepEqual(invoicePrintUnits({ ...line, basicQuantity: 0 }), [{ quantity: 2, name: 'Box', price: 100 }]);
  assert.deepEqual(invoicePrintUnits({ ...line, packagingQuantity: null }), [{ quantity: 10, name: 'Bottle', price: 12.5 }]);
});

test('print data preserves zero saved prices and unknown packaging prices', () => {
  assert.deepEqual(invoicePrintUnits({ ...line, basicUnitPrice: 0, packagingUnitPrice: null }), [
    { quantity: 10, name: 'Bottle', price: 0 },
    { quantity: 2, name: 'Box', price: null },
  ]);
  assert.deepEqual(invoicePrintUnits({ ...line, basicQuantity: 0, packagingQuantity: 0 }), [
    { quantity: 0, name: 'Bottle', price: 12.5 },
  ]);
});
