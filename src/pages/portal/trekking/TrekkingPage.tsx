import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlatDataTable, resetTableData, type ColumnDef, type PaginatedDataResponse } from '../../../components/data-table';
import { FlatButton } from '../../../components/flat-form';
import { FlatConfirmDialog, FlatModal } from '../../../components/overlay';
import { type Trek, type TrekStatus, organisationApi, treksApi } from '../../../api-client';
import { CreateTrekModal } from './components/CreateTrekModal';
import toast from 'react-hot-toast';
import { usePermissions } from '../../../hooks/usePermissions';

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
  const { hasAnyPermission } = usePermissions();
  const canCreateTrek = hasAnyPermission('Treks.Create', 'Treks.Manage');
  const canDeleteTrek = hasAnyPermission('Treks.Delete', 'Treks.Manage');
  const [createVisible, setCreateVisible] = useState(false);
  const [createdTrek, setCreatedTrek] = useState<Trek | null>(null);
  const [trekToDelete, setTrekToDelete] = useState<Trek | null>(null);
  const [deletingTrek, setDeletingTrek] = useState(false);
  const [regionOptions, setRegionOptions] = useState<{ label: string; value: string }[]>([
    { label: 'All Regions', value: '' },
  ]);
  const [branchOptions, setBranchOptions] = useState<{ label: string; value: string }[]>([
    { label: 'All Branches', value: '' },
  ]);

  useEffect(() => {
    organisationApi.getRegions().then((regions) => {
      setRegionOptions([
        { label: 'All Regions', value: '' },
        ...regions.map((region) => ({ label: region.name, value: region.id })),
      ]);
    }).catch(() => {});
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
      regionId:           t.regionId || '',
      regionName:         t.regionName || '',
      branchId:           t.branchId || null,
      branchName:         t.branchName || null,
      driverStaffId:      t.driverStaffId || '',
      driverName:         t.driverName || '—',
      salesStaffId:       t.salesStaffId || null,
      salesStaffName:     t.salesStaffName || null,
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
    sort:       payload.sort       || 'updatedAt_desc',
    ...(payload.status     ? { status:        payload.status }     : {}),
    ...(payload.regionId   ? { regionId:      payload.regionId }   : {}),
    ...(payload.branchId   ? { branchId:      payload.branchId }   : {}),
    ...(payload.scheduledDate ? { scheduledDate: payload.scheduledDate } : {}),
  }), []);

  const handleDeleteTrek = async () => {
    if (!trekToDelete || (trekToDelete.status !== 'Draft' && trekToDelete.status !== 'Scheduled')) return;
    setDeletingTrek(true);
    try {
      await treksApi.deleteTrek(trekToDelete.id);
      resetTableData();
      setTrekToDelete(null);
      toast.success('Trek deleted.');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || err.response?.data?.message || 'Failed to delete trek.');
    } finally {
      setDeletingTrek(false);
    }
  };

  const columns: ColumnDef<Trek>[] = useMemo(() => [
    {
      field: 'trekNumber',
      header: 'Trek #',
      style: { width: '120px' },
      body: (row) => (
        <button
          type="button"
          onClick={() => navigate(`/portal/trekking/${row.id}`)}
          className="text-left font-mono text-xs font-medium text-portal-accent hover:underline"
        >
          {row.trekNumber}
        </button>
      ),
    },
    {
      field: 'regionName',
      header: 'Trekking Region',
      style: { width: '150px' },
      body: (row) => <span className="text-xs font-medium text-portal-text">{row.regionName || '—'}</span>,
    },
    {
      field: 'driverName',
      header: 'Driver',
      body: (row) => <span className="text-xs font-medium text-portal-text">{row.driverName}</span>,
    },
    {
      field: 'salesStaffName',
      header: 'Sales Staff',
      body: (row) => <span className="text-xs font-medium text-portal-text">{row.salesStaffName || '—'}</span>,
    },
    {
      field: 'vehicleDisplayName',
      header: 'Vehicle',
      style: { width: '160px' },
      body: (row) => <span className="text-xs font-medium text-portal-text">{row.vehicleDisplayName}</span>,
    },
    {
      field: 'scheduledDate',
      header: 'Date',
      style: { width: '110px' },
      body: (row) => <span className="text-xs font-medium text-portal-text">{row.scheduledDate}</span>,
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
      style: { width: '100px', textAlign: 'right' },
      body: (row) => (
        <div className="flex items-center justify-end gap-2">
          <FlatButton
            variant="outline"
            size="icon-sm"
            leftIcon="pi pi-eye"
            aria-label={`View ${row.trekNumber}`}
            title="View trek"
            onClick={() => navigate(`/portal/trekking/${row.id}`)}
          />
          {canDeleteTrek && (row.status === 'Draft' || row.status === 'Scheduled') && (
            <FlatButton
              variant="danger-outline"
              size="icon-sm"
              leftIcon="pi pi-trash"
              aria-label={`Delete ${row.trekNumber}`}
              title="Delete trek"
              onClick={() => setTrekToDelete(row)}
            />
          )}
        </div>
      ),
    },
  ], [canDeleteTrek, navigate]);

  return (
    <div className="space-y-4">
      <FlatDataTable<Trek>
        dataSourceUrl="/treks"
        columns={columns}
        heading="Trekking"
        hasAction={canCreateTrek}
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
              accessor: 'regionId',
              label: 'Region',
              args: { options: regionOptions },
            },
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
        onSuccess={setCreatedTrek}
      />

      <FlatConfirmDialog
        visible={!!trekToDelete}
        onHide={() => setTrekToDelete(null)}
        onConfirm={handleDeleteTrek}
        loading={deletingTrek}
        title="Delete Trek"
        message={
          <span>
            Delete <span className="font-mono text-red-accent">{trekToDelete?.trekNumber}</span>? This permanently removes the trek and its planned stops and products.
          </span>
        }
        confirmLabel="Delete Trek"
        variant="danger"
      />

      <FlatModal
        visible={!!createdTrek}
        onHide={() => setCreatedTrek(null)}
        title="Trek Created"
        size="sm"
        footer={
          <div className="flex w-full items-center justify-end gap-3">
            <FlatButton variant="outline" size="sm" onClick={() => setCreatedTrek(null)}>Close</FlatButton>
            <FlatButton
              variant="primary"
              size="sm"
              onClick={() => {
                if (!createdTrek) return;
                const trekId = createdTrek.id;
                setCreatedTrek(null);
                navigate(`/portal/trekking/${trekId}`);
              }}
            >
              View Trek
            </FlatButton>
          </div>
        }
      >
        <p className="text-sm text-portal-text">
          <span className="font-mono text-portal-accent">{createdTrek?.trekNumber}</span> is saved as a draft. View it to add stops and products.
        </p>
      </FlatModal>
    </div>
  );
};

export default TrekkingPage;
