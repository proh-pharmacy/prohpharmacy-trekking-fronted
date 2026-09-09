import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlatDataTable, type ColumnDef, type PaginatedDataResponse } from '../../../components/data-table';
import { FlatButton } from '../../../components/flat-form';
import { type Trek, type TrekStatus, organisationApi } from '../../../api-client';
import { CreateTrekModal } from './components/CreateTrekModal';

const STATUS_STYLES: Record<TrekStatus, string> = {
  Draft:      'text-portal-muted',
  Scheduled:  'text-blue-400',
  InProgress: 'text-yellow-400',
  Completed:  'text-portal-accent',
  Cancelled:  'text-red-400',
};

const STATUS_LABELS: Record<TrekStatus, string> = {
  Draft: 'Draft', Scheduled: 'Scheduled', InProgress: 'In Progress',
  Completed: 'Completed', Cancelled: 'Cancelled',
};

const STATUS_FILTER_OPTIONS = [
  { label: 'All Statuses', value: '' },
  { label: 'Draft', value: 'Draft' },
  { label: 'Scheduled', value: 'Scheduled' },
  { label: 'In Progress', value: 'InProgress' },
  { label: 'Completed', value: 'Completed' },
  { label: 'Cancelled', value: 'Cancelled' },
];

export const TrekkingPage: React.FC = () => {
  const navigate = useNavigate();
  const [createVisible, setCreateVisible] = useState(false);
  const [branchOptions, setBranchOptions] = useState<{ label: string; value: string }[]>([
    { label: 'All Branches', value: '' },
  ]);

  useEffect(() => {
    organisationApi.getBranches().then((branches) => {
      setBranchOptions([
        { label: 'All Branches', value: '' },
        ...branches.map((b) => ({ label: b.name, value: b.id })),
      ]);
    }).catch(() => {});
  }, []);

  const dataMapper = useCallback((response: any): PaginatedDataResponse<Trek> => {
    const payload = response || {};
    const raw: any[] = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data)  ? payload.data
      : Array.isArray(payload?.items) ? payload.items
      : [];

    const data: Trek[] = raw.map((t: any) => ({
      id:                 String(t.id || ''),
      trekNumber:         t.trekNumber || '',
      branchId:           t.branchId || '',
      branchName:         t.branchName || '—',
      driverStaffId:      t.driverStaffId || '',
      driverName:         t.driverName || '—',
      vehicleId:          t.vehicleId || '',
      vehicleDisplayName: t.vehicleDisplayName || '—',
      scheduledDate:      t.scheduledDate || '',
      status:             t.status || 'Draft',
      notes:              t.notes ?? null,
      createdAt:          t.createdAt || '',
      updatedAt:          t.updatedAt ?? null,
      stops:              t.stops ?? [],
    }));

    return {
      data,
      totalCount:  payload?.totalCount  ?? data.length,
      totalPages:  payload?.totalPages  ?? 1,
      currentPage: payload?.currentPage ?? 1,
      pageSize:    payload?.pageSize    ?? data.length,
    };
  }, []);

  const parsePaginationPayload = useCallback((payload: any) => ({
    pageNumber: payload.pageNumber || 1,
    pageSize:   payload.pageSize   || 10,
    search:     payload.search     || undefined,
    sort:       payload.sort       || 'scheduledDate_desc',
    ...(payload.status     ? { status:        payload.status }     : {}),
    ...(payload.branchId   ? { branchId:      payload.branchId }   : {}),
    ...(payload.scheduledDate ? { scheduledDate: payload.scheduledDate } : {}),
  }), []);

  const columns: ColumnDef<Trek>[] = useMemo(() => [
    {
      field: 'trekNumber',
      header: 'Trek #',
      style: { width: '120px' },
      body: (row) => (
        <button
          type="button"
          onClick={() => navigate(`/portal/trekking/${row.id}`)}
          className="font-mono text-xs text-portal-accent hover:underline text-left"
        >
          {row.trekNumber}
        </button>
      ),
    },
    {
      field: 'driverName',
      header: 'Driver',
      body: (row) => <span className="text-xs text-white">{row.driverName}</span>,
    },
    {
      field: 'vehicleDisplayName',
      header: 'Vehicle',
      style: { width: '160px' },
      body: (row) => <span className="text-xs text-portal-text">{row.vehicleDisplayName}</span>,
    },
    {
      field: 'branchName',
      header: 'Branch',
      style: { width: '140px' },
      body: (row) => <span className="text-xs text-portal-text">{row.branchName}</span>,
    },
    {
      field: 'scheduledDate',
      header: 'Date',
      style: { width: '110px' },
      body: (row) => <span className="text-xs font-mono text-portal-text">{row.scheduledDate}</span>,
    },
    {
      field: 'status',
      header: 'Status',
      style: { width: '110px' },
      body: (row) => (
        <span className={`text-xs font-medium ${STATUS_STYLES[row.status as TrekStatus] || 'text-portal-muted'}`}>
          {STATUS_LABELS[row.status as TrekStatus] || row.status}
        </span>
      ),
    },
    {
      field: 'actions',
      header: 'Actions',
      headerStyle: { textAlign: 'right' },
      style: { width: '80px', textAlign: 'right' },
      body: (row) => (
        <div className="flex items-center justify-end">
          <FlatButton
            variant="outline"
            size="sm"
            leftIcon="pi pi-eye"
            onClick={() => navigate(`/portal/trekking/${row.id}`)}
          >
            View
          </FlatButton>
        </div>
      ),
    },
  ], []);

  return (
    <div className="space-y-4">
      <FlatDataTable<Trek>
        dataSourceUrl="/treks"
        columns={columns}
        heading="Trekking"
        hasAction
        actionName="New Trek"
        onAction={() => setCreateVisible(true)}
        filterable="search"
        filterablePlaceholder="Search by trek number or driver..."
        enableTableFilter
        enablePaginator
        initialPageSize={10}
        emptyDataText="No treks found."
        dataMapper={dataMapper}
        parsePayload={parsePaginationPayload}
        extendedFilter={{
          enable: true,
          filters: [
            {
              type: 'SelectFilter',
              accessor: 'status',
              label: 'Status',
              args: { options: STATUS_FILTER_OPTIONS },
            },
            {
              type: 'SelectFilter',
              accessor: 'branchId',
              label: 'Branch',
              args: { options: branchOptions },
            },
            {
              type: 'DateFilter',
              accessor: 'scheduledDate',
              label: 'Scheduled Date',
            },
          ],
        }}
      />

      <CreateTrekModal
        visible={createVisible}
        onHide={() => setCreateVisible(false)}
      />
    </div>
  );
};

export default TrekkingPage;
