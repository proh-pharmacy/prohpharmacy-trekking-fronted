import assert from 'node:assert/strict';
import test from 'node:test';
import { createProductMatchFormData } from '../src/api-client/productMatchForm.ts';

test('document matching sends automatic product creation as an explicit multipart boolean', () => {
  assert.equal(createProductMatchFormData([], undefined, false).get('createUnmatchedProducts'), 'false');
  assert.equal(createProductMatchFormData([], undefined, true).get('createUnmatchedProducts'), 'true');
});

test('document matching retains Excel mappings alongside the creation option', () => {
  const mappings = [{ fileIndex: 0, quantityColumn: 'Qty' }];
  const formData = createProductMatchFormData([], mappings, true);

  assert.equal(formData.get('excelMappings'), JSON.stringify(mappings));
  assert.equal(formData.get('createUnmatchedProducts'), 'true');
});
