import assert from 'node:assert/strict';
import test from 'node:test';
import { sortItemsByConfidence } from '../src/pages/portal/fleet/components/confidenceSort.ts';

const row = (id: string, matchStatus: string, similarityScore?: number) => ({
  id,
  source: {
    matchStatus,
    candidates: similarityScore == null ? [] : [{ similarityScore }],
  },
});

test('ascending confidence places unmatched rows first by treating them as zero', () => {
  const result = sortItemsByConfidence([
    row('high', 'Exact', 98),
    row('unmatched', 'Unmatched'),
    row('low', 'Suggested', 72),
  ], 'ascending');

  assert.deepEqual(result.map(({ id }) => id), ['unmatched', 'low', 'high']);
});

test('descending confidence places the highest scored rows first', () => {
  const result = sortItemsByConfidence([
    row('low', 'Suggested', 72),
    row('unmatched', 'Unmatched'),
    row('high', 'Exact', 98),
  ], 'descending');

  assert.deepEqual(result.map(({ id }) => id), ['high', 'low', 'unmatched']);
});

test('rows without match confidence remain last and ties preserve their input order', () => {
  const result = sortItemsByConfidence([
    row('manual-1', 'Manual'),
    row('first-tie', 'Suggested', 85),
    row('manual-2', 'Manual'),
    row('second-tie', 'Suggested', 85),
  ], 'ascending');

  assert.deepEqual(result.map(({ id }) => id), ['first-tie', 'second-tie', 'manual-1', 'manual-2']);
});

test('no direction preserves the original array and order', () => {
  const rows = [row('first', 'Exact', 99), row('second', 'Unmatched')];
  assert.equal(sortItemsByConfidence(rows, null), rows);
});
