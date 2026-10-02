import assert from 'node:assert/strict';
import test from 'node:test';
import { ID_DOCUMENT_TYPES, validateIdDocument, validateIdImage } from '../src/api-client/customerDocuments.ts';

test('document details require a supported type and a nonblank number of at most 100 characters', () => {
  for (const type of ID_DOCUMENT_TYPES) assert.equal(validateIdDocument(type, ' A-123 '), undefined);
  assert.ok(validateIdDocument('Unknown', '123'));
  assert.ok(validateIdDocument('', '123'));
  assert.ok(validateIdDocument('Passport', '  '));
  assert.equal(validateIdDocument('Passport', 'x'.repeat(100)), undefined);
  assert.ok(validateIdDocument('Passport', 'x'.repeat(101)));
});

test('ID images accept the three documented MIME types up to exactly 5 MiB', () => {
  for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
    assert.equal(validateIdImage({ type, size: 5 * 1024 * 1024 }), undefined);
    assert.ok(validateIdImage({ type, size: 5 * 1024 * 1024 + 1 }));
    assert.ok(validateIdImage({ type, size: 0 }));
  }
  for (const type of ['image/gif', 'image/svg+xml', 'application/pdf', '']) {
    assert.ok(validateIdImage({ type, size: 100 }));
  }
});
