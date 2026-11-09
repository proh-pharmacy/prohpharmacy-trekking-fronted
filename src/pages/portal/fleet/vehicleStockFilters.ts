import type { FilterParam } from '../../../components/data-table';

const STATUS_OPTIONS = [
  { label: 'All statuses', value: '' },
  { label: 'Active', value: 'Active' },
  { label: 'Under maintenance', value: 'UnderMaintenance' },
  { label: 'Decommissioned', value: 'Decommissioned' },
];

const STOCK_STATE_OPTIONS = [
  { label: 'All stock states', value: '' },
  { label: 'Loaded', value: 'loaded' },
  { label: 'Empty', value: 'empty' },
];

const SORT_OPTIONS = [
  { label: 'Newest vehicles', value: 'createdAt_desc' },
  { label: 'Oldest vehicles', value: 'createdAt_asc' },
  { label: 'Registration A–Z', value: 'registrationNumber_asc' },
  { label: 'Registration Z–A', value: 'registrationNumber_desc' },
  { label: 'Vehicle name A–Z', value: 'displayName_asc' },
  { label: 'Vehicle name Z–A', value: 'displayName_desc' },
];

export const vehicleStockExtendedFilter: { enable: boolean; filters: FilterParam[] } = {
  enable: true,
  filters: [
    {
      type: 'AsyncSelectFilter',
      accessor: 'regionId',
      label: 'Region',
      args: { endpointUrl: '/organisation/regions', optionValue: 'id', optionLabel: 'name', pageSize: 20, size: 'sm', placeholder: 'Search regions...' },
    },
    {
      type: 'AsyncSelectFilter',
      accessor: 'branchId',
      label: 'Branch',
      args: { endpointUrl: '/organisation/branches', optionValue: 'id', optionLabel: 'name', pageSize: 20, size: 'sm', placeholder: 'Search branches...' },
    },
    { type: 'SelectFilter', accessor: 'status', label: 'Vehicle status', args: { options: STATUS_OPTIONS } },
    { type: 'SelectFilter', accessor: 'stockState', label: 'Stock state', args: { options: STOCK_STATE_OPTIONS } },
    { type: 'SelectFilter', accessor: 'sort', label: 'Sort', args: { options: SORT_OPTIONS } },
  ],
};

export const parseVehicleStockFilters = (payload: any) => ({
  pageNumber: payload.pageNumber || 1,
  pageSize: payload.pageSize || 20,
  sort: payload.sort || 'createdAt_desc',
  ...(payload.search?.trim() ? { search: payload.search.trim() } : {}),
  ...(payload.regionId ? { regionId: payload.regionId } : {}),
  ...(payload.branchId ? { branchId: payload.branchId } : {}),
  ...(payload.status ? { status: payload.status } : {}),
  ...(payload.stockState ? { stockState: payload.stockState } : {}),
});
