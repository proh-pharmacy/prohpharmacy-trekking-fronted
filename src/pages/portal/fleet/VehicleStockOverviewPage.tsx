import React, { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FlatDataTable,
  type ColumnDef,
  type PaginatedDataResponse,
} from '../../../components/data-table';
import { FlatButton } from '../../../components/flat-form';
import type { VehicleStockOverview } from '../../../api-client';

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

const formatDateTime = (value: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: value, time: '' };
  return {
    date: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
  };
};

const normalizeVehicle = (value: any): VehicleStockOverview => ({
  id: String(value?.id ?? ''),
  registrationNumber: value?.registrationNumber ?? '',
  displayName: value?.displayName ?? '',
  make: value?.make ?? '',
  model: value?.model ?? '',
  year: Number(value?.year ?? 0),
  colour: value?.colour ?? '',
  regionId: String(value?.regionId ?? ''),
  regionName: value?.regionName ?? null,
  branchId: value?.branchId ?? null,
  branchName: value?.branchName ?? null,
  operationalStatus: value?.operationalStatus ?? 'Active',
  currentStaffId: value?.currentStaffId ?? null,
  currentStaffName: value?.currentStaffName ?? null,
  createdAt: value?.createdAt ?? '',
  updatedAt: value?.updatedAt ?? null,
  stock: {
    trackedProductCount: Number(value?.stock?.trackedProductCount ?? 0),
    inStockProductCount: Number(value?.stock?.inStockProductCount ?? 0),
    outOfStockProductCount: Number(value?.stock?.outOfStockProductCount ?? 0),
    lowStockProductCount: Number(value?.stock?.lowStockProductCount ?? 0),
    hasStockLoaded: Boolean(value?.stock?.hasStockLoaded),
    lastUpdatedAt: value?.stock?.lastUpdatedAt ?? null,
  },
});

export const VehicleStockOverviewPage: React.FC = () => {
  const navigate = useNavigate();

  const openStock = useCallback((vehicleId: string) => {
    navigate(`/portal/fleet/vehicles/${vehicleId}/stock`);
  }, [navigate]);

  const dataMapper = useCallback((response: any): PaginatedDataResponse<VehicleStockOverview> => {
    const payload = response ?? {};
    const source = Array.isArray(payload) ? payload : Array.isArray(payload.data) ? payload.data : [];
    const vehicles = source.map(normalizeVehicle);
    return {
      data: vehicles,
      totalCount: Number(payload.totalItems ?? payload.totalCount ?? vehicles.length),
      totalPages: Number(payload.totalPages ?? 1),
      currentPage: Number(payload.pageNumber ?? payload.currentPage ?? 1),
      pageSize: Number(payload.pageSize ?? (vehicles.length || 20)),
    };
  }, []);

  const parsePayload = useCallback((payload: any) => ({
    pageNumber: payload.pageNumber || 1,
    pageSize: payload.pageSize || 20,
    sort: payload.sort || 'createdAt_desc',
    ...(payload.search?.trim() ? { search: payload.search.trim() } : {}),
    ...(payload.regionId ? { regionId: payload.regionId } : {}),
    ...(payload.branchId ? { branchId: payload.branchId } : {}),
    ...(payload.status ? { status: payload.status } : {}),
    ...(payload.stockState ? { stockState: payload.stockState } : {}),
  }), []);

  const columns: ColumnDef<VehicleStockOverview>[] = useMemo(() => [
    {
      field: 'displayName',
      header: 'Vehicle',
      style: { width: '28%' },
      body: (row) => (
        <button type="button" onClick={() => openStock(row.id)} className="text-left">
          <span className="block text-xs font-semibold text-portal-accent transition hover:text-portal-accent-hover">{[row.regionName, row.displayName].filter(Boolean).join(' - ') || '—'}</span>
        </button>
      ),
    },
    {
      field: 'inventory',
      header: 'Inventory Status',
      style: { width: '16%' },
      body: (row) => (
          <span className={`flex items-center gap-1.5 text-xs font-semibold ${row.stock.hasStockLoaded ? 'text-portal-accent' : 'text-portal-muted'}`}>
            <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${row.stock.hasStockLoaded ? 'bg-portal-accent' : 'bg-portal-muted'}`} />
            {row.stock.hasStockLoaded ? 'Loaded' : 'Empty'}
          </span>
      ),
    },
    {
      field: 'inventoryQuantity',
      header: 'Inventory Quantity',
      style: { width: '28%' },
      body: (row) => (
        <div className="space-y-1">
          <span className="block text-[11px] text-portal-text">
            {row.stock.trackedProductCount > 0
              ? `${row.stock.inStockProductCount.toLocaleString()} of ${row.stock.trackedProductCount.toLocaleString()} products in stock`
              : 'No products tracked'}
          </span>
          {(row.stock.lowStockProductCount > 0 || row.stock.outOfStockProductCount > 0) && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium">
              {row.stock.lowStockProductCount > 0 && (
                <span className="text-portal-orange">{row.stock.lowStockProductCount.toLocaleString()} low</span>
              )}
              {row.stock.lowStockProductCount > 0 && row.stock.outOfStockProductCount > 0 && (
                <span aria-hidden="true" className="text-portal-muted">·</span>
              )}
              {row.stock.outOfStockProductCount > 0 && (
                <span className="text-red-accent">{row.stock.outOfStockProductCount.toLocaleString()} out of stock</span>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      field: 'lastUpdatedAt',
      header: 'Last Updated',
      style: { width: '16%' },
      body: (row) => {
        const updated = formatDateTime(row.stock.lastUpdatedAt);
        return updated ? (
          <div>
            <span className="block text-[11px] text-portal-text">{updated.date}</span>
            <span className="mt-0.5 block text-[10px] text-portal-muted">{updated.time}</span>
          </div>
        ) : <span className="text-xs text-portal-muted">—</span>;
      },
    },
    {
      field: 'actions',
      header: 'Actions',
      style: { width: '12%', textAlign: 'right' },
      headerStyle: { textAlign: 'right' },
      body: (row) => (
        <FlatButton
          variant="outline"
          size="sm"
          label="Manage stock"
          className="whitespace-nowrap"
          leftIcon="pi pi-box"
          title="Manage stock"
          aria-label={`Manage stock for ${row.registrationNumber}`}
          onClick={() => openStock(row.id)}
        />
      ),
    },
  ], [openStock]);

  return (
    <FlatDataTable<VehicleStockOverview>
      dataSourceUrl="/fleet/vehicles/stock-overview"
      columns={columns}
      heading="Vehicle Stock"
      filterable="search"
      filterablePlaceholder="Search registration, vehicle name, make or model..."
      enableTableFilter
      enablePaginator
      initialPageSize={20}
      persistFiltersInUrl
      postData={{ sort: 'createdAt_desc' }}
      emptyDataText="No vehicles found."
      dataMapper={dataMapper}
      parsePayload={parsePayload}
      extendedFilter={{
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
      }}
    />
  );
};

export default VehicleStockOverviewPage;
