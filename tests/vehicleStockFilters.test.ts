import assert from 'node:assert/strict';
import test from 'node:test';
import { parseVehicleStockFilters, vehicleStockExtendedFilter } from '../src/pages/portal/fleet/vehicleStockFilters.ts';

test('vehicle selection and stock overview share all five extended filters', () => {
  assert.equal(vehicleStockExtendedFilter.enable, true);
  assert.deepEqual(vehicleStockExtendedFilter.filters.map((filter) => filter.accessor), [
    'regionId', 'branchId', 'status', 'stockState', 'sort',
  ]);
});

test('vehicle stock filters preserve every supported query parameter', () => {
  assert.deepEqual(parseVehicleStockFilters({
    pageNumber: 2, pageSize: 50, search: '  Van  ', regionId: 'region-1',
    branchId: 'branch-1', status: 'Active', stockState: 'loaded', sort: 'displayName_asc',
  }), {
    pageNumber: 2, pageSize: 50, search: 'Van', regionId: 'region-1',
    branchId: 'branch-1', status: 'Active', stockState: 'loaded', sort: 'displayName_asc',
  });
});

test('clearing filters omits empty values and restores default sorting', () => {
  assert.deepEqual(parseVehicleStockFilters({ search: '  ', regionId: '', branchId: '', status: '', stockState: '', sort: '' }), {
    pageNumber: 1, pageSize: 20, sort: 'createdAt_desc',
  });
});
