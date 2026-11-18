import assert from 'node:assert/strict';
import test from 'node:test';
import { reviewBasicQuantity } from '../src/pages/portal/fleet/components/matchReviewQuantity.ts';

test('uses the mapped basic quantity when the backend supplies it', () => {
  assert.equal(reviewBasicQuantity({
    basicQty: 12,
    quantity: 5,
  }), 12);
});

test('falls back to the extracted quantity when basic quantity is absent', () => {
  assert.equal(reviewBasicQuantity({
    basicQty: null,
    quantity: 5,
  }), 5);
});

test('normalizes numeric API strings for the quantity input', () => {
  assert.equal(reviewBasicQuantity({ basicQty: null, quantity: '5', quantityText: '5' }), 5);
  assert.equal(reviewBasicQuantity({ basicQty: '2.5', quantity: null, quantityText: null }), 2.5);
});

test('does not copy an explicit packaging quantity into the basic quantity field', () => {
  assert.equal(reviewBasicQuantity({
    basicQty: null,
    quantity: null,
    packagingQty: 7,
    packagingQtyText: '7',
  }), null);
});

test('falls back to the extracted quantity text when parsed API values are empty', () => {
  assert.equal(reviewBasicQuantity({ basicQty: null, quantity: null, quantityText: '5 Pack' }), 5);
  assert.equal(reviewBasicQuantity({ basicQty: null, quantity: null, quantityText: '1,250 Unit' }), 1250);
});
