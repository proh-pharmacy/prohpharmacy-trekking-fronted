import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';
import { FlatDataTable, type ColumnDef, type PaginatedDataResponse } from '../../../components/data-table';
import { FlatButton, FlatDropdown } from '../../../components/flat-form';
import { FlatModal } from '../../../components/overlay';
import { reportsApi, organisationApi, type TrekReportItem } from '../../../api-client';
import { fleetApi, type FleetDriver } from '../../../api-client';
import { fmtGhs, fmtGhsShort } from '../../../lib/utils';

const STATUS_OPTIONS = [
  { label: 'All Statuses', value: '' },
  { label: 'Completed', value: 'Completed' },
  { label: 'In Progress', value: 'InProgress' },
  { label: 'Scheduled', value: 'Scheduled' },
  { label: 'Cancelled', value: 'Cancelled' },
  { label: 'Draft', value: 'Draft' },
];

const SORT_OPTIONS = [
  { label: 'Date (Newest First)', value: 'scheduledDate_desc' },
  { label: 'Date (Oldest First)', value: 'scheduledDate_asc' },
  { label: 'Trek Number (A→Z)', value: 'trekNumber_asc' },
  { label: 'Trek Number (Z→A)', value: 'trekNumber_desc' },
  { label: 'Collected (High→Low)', value: 'collected_desc' },
  { label: 'Collected (Low→High)', value: 'collected_asc' },
  { label: 'Outstanding (High→Low)', value: 'outstanding_desc' },
  { label: 'Outstanding (Low→High)', value: 'outstanding_asc' },
];

const STATUS_COLORS: Record<string, string> = {
  Completed: 'text-portal-accent',
  InProgress: 'text-yellow-400',
  Scheduled: 'text-blue-400',
  Cancelled: 'text-red-400',
  Draft: 'text-portal-muted',
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export const TrekReportPage: React.FC = () => {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalTreks: 0, completed: 0, cancelled: 0, inProgress: 0,
    totalCollected: 0, totalOutstanding: 0,
  });

  const [branchOptions, setBranchOptions] = useState<{ label: string; value: string }[]>([{ label: 'All Branches', value: '' }]);
  const [driverOptions, setDriverOptions] = useState<{ label: string; value: string }[]>([{ label: 'All Drivers', value: '' }]);

  useEffect(() => {
    Promise.allSettled([
      organisationApi.getBranches(),
      fleetApi.getDrivers(),
    ]).then(([branchRes, driverRes]) => {
      if (branchRes.status === 'fulfilled') {
        setBranchOptions([
          { label: 'All Branches', value: '' },
          ...branchRes.value.map((b) => ({ label: b.name, value: b.id })),
        ]);
      }
      if (driverRes.status === 'fulfilled') {
        setDriverOptions([
          { label: 'All Drivers', value: '' },
          ...(driverRes.value as FleetDriver[])
            .filter((d) => d.staffName)
            .map((d) => ({ label: d.staffName!, value: d.staffMemberId })),
        ]);
      }
    });
  }, []);

  // ── Export modal ───────────────────────────────────────────────────
  const [exportVisible, setExportVisible] = useState(false);
  const [exportFrom, setExportFrom] = useState('');
  const [exportTo, setExportTo] = useState(todayStr());
  const [exportBranchId, setExportBranchId] = useState('');
  const [exportDriverId, setExportDriverId] = useState('');
  const [exportStatus, setExportStatus] = useState('');
  const [exporting, setExporting] = useState(false);

  const resetExport = () => {
    setExportFrom(''); setExportTo(todayStr()); setExportBranchId('');
    setExportDriverId(''); setExportStatus(''); setExportVisible(false);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const { blob, filename } = await reportsApi.exportTrekReport({
        ...(exportFrom ? { from: exportFrom } : {}),
        ...(exportTo ? { to: exportTo } : {}),
        ...(exportBranchId ? { branchId: exportBranchId } : {}),
        ...(exportDriverId ? { driverId: exportDriverId } : {}),
        ...(exportStatus ? { status: exportStatus } : {}),
      });
      saveAs(blob, filename);
      toast.success('Report downloaded.');
      resetExport();
    } catch {
      toast.error('Failed to generate report.');
    } finally {
      setExporting(false);
    }
  };

  // ── Data mapper ────────────────────────────────────────────────────
  const dataMapper = useCallback(
    (response: any): PaginatedDataResponse<TrekReportItem> => {
      const payload = response || {};
      setStats({
        totalTreks: payload.totalTreks ?? 0,
        completed: payload.completed ?? 0,
        cancelled: payload.cancelled ?? 0,
        inProgress: payload.inProgress ?? 0,
        totalCollected: payload.totalCollected ?? 0,
        totalOutstanding: payload.totalOutstanding ?? 0,
      });
      const treks: TrekReportItem[] = Array.isArray(payload.treks) ? payload.treks : [];
      return {
        data: treks,
        totalCount: payload.totalCount ?? treks.length,
        totalPages: payload.totalPages ?? 1,
        currentPage: payload.page ?? 1,
        pageSize: payload.pageSize ?? 20,
      };
    },
    []
  );

  const parsePayload = useCallback((payload: any) => ({
    pageNumber: payload.pageNumber || payload.page || 1,
    pageSize: payload.pageSize || 20,
    search: payload.search || undefined,
    sort: payload.sort || 'scheduledDate_desc',
    ...(payload.branchId ? { branchId: payload.branchId } : {}),
    ...(payload.driverId ? { driverId: payload.driverId } : {}),
    ...(payload.status ? { status: payload.status } : {}),
  }), []);

  // ── Columns ────────────────────────────────────────────────────────
  const columns: ColumnDef<TrekReportItem>[] = useMemo(() => [
    {
      field: 'trekNumber',
      header: 'Trek',
      body: (row) => (
        <button
          type="button"
          onClick={() => navigate(`/portal/trekking/${row.id}`)}
          className="font-mono font-bold text-xs text-portal-accent hover:text-white transition cursor-pointer"
        >
          {row.trekNumber}
        </button>
      ),
    },
    {
      field: 'scheduledDate',
      header: 'Date',
      style: { width: '110px' },
      body: (row) => <span className="text-xs text-portal-text font-mono">{row.scheduledDate}</span>,
    },
    {
      field: 'driverName',
      header: 'Driver',
      style: { width: '160px' },
      body: (row) => <span className="text-xs text-portal-text">{row.driverName || '—'}</span>,
    },
    {
      field: 'branchName',
      header: 'Branch',
      style: { width: '150px' },
      body: (row) => <span className="text-xs text-portal-text">{row.branchName || '—'}</span>,
    },
    {
      field: 'status',
      header: 'Status',
      style: { width: '110px' },
      body: (row) => (
        <span className={`text-xs font-semibold ${STATUS_COLORS[row.status] ?? 'text-portal-muted'}`}>
          {row.status === 'InProgress' ? 'In Progress' : row.status}
        </span>
      ),
    },
    {
      field: 'stopsCount',
      header: 'Stops',
      style: { width: '70px', textAlign: 'center' },
      headerStyle: { textAlign: 'center' },
      body: (row) => <span className="text-xs text-portal-text text-center block">{row.stopsCount}</span>,
    },
    {
      field: 'totalCollected',
      header: 'Collected',
      style: { width: '120px', textAlign: 'right' },
      headerStyle: { textAlign: 'right' },
      body: (row) => (
        <span className="font-mono text-xs text-portal-accent">{fmtGhs(row.totalCollected)}</span>
      ),
    },
    {
      field: 'totalOutstanding',
      header: 'Outstanding',
      style: { width: '130px', textAlign: 'right' },
      headerStyle: { textAlign: 'right' },
      body: (row) => (
        <span className={`font-mono text-xs font-semibold ${row.totalOutstanding > 0 ? 'text-orange-400' : 'text-portal-accent'}`}>
          {fmtGhs(row.totalOutstanding)}
        </span>
      ),
    },
  ], [navigate]);

  return (
    <div className="space-y-6">
      {/* ── Summary stats ── */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[110px] bg-portal-surface border border-portal-border/60 p-3 min-w-0">
          <p className="text-[10px] text-portal-muted uppercase tracking-wide mb-1">Total Treks</p>
          <p className="text-xs font-semibold text-white truncate">{stats.totalTreks.toLocaleString()}</p>
        </div>
        <div className="flex-1 min-w-[110px] bg-portal-surface border border-portal-border/60 p-3 min-w-0">
          <p className="text-[10px] text-portal-muted uppercase tracking-wide mb-1">Completed</p>
          <p className="text-xs font-semibold text-portal-accent truncate">{stats.completed.toLocaleString()}</p>
        </div>
        <div className="flex-1 min-w-[110px] bg-portal-surface border border-portal-border/60 p-3 min-w-0">
          <p className="text-[10px] text-portal-muted uppercase tracking-wide mb-1">In Progress</p>
          <p className="text-xs font-semibold text-yellow-400 truncate">{stats.inProgress.toLocaleString()}</p>
        </div>
        <div className="flex-1 min-w-[110px] bg-portal-surface border border-portal-border/60 p-3 min-w-0">
          <p className="text-[10px] text-portal-muted uppercase tracking-wide mb-1">Cancelled</p>
          <p className="text-xs font-semibold text-red-400 truncate">{stats.cancelled.toLocaleString()}</p>
        </div>
        <div className="flex-1 min-w-[110px] bg-portal-surface border border-portal-border/60 p-3 min-w-0">
          <p className="text-[10px] text-portal-muted uppercase tracking-wide mb-1">Total Collected</p>
          <p className="text-xs font-semibold text-portal-accent truncate" title={fmtGhs(stats.totalCollected)}>{fmtGhsShort(stats.totalCollected)}</p>
        </div>
        <div className="flex-1 min-w-[110px] bg-portal-surface border border-portal-border/60 p-3 min-w-0">
          <p className="text-[10px] text-portal-muted uppercase tracking-wide mb-1">Total Outstanding</p>
          <p className="text-xs font-semibold text-orange-400 truncate" title={fmtGhs(stats.totalOutstanding)}>{fmtGhsShort(stats.totalOutstanding)}</p>
        </div>
      </div>

      {/* ── Table ── */}
      <FlatDataTable<TrekReportItem>
        dataSourceUrl="/reports/treks"
        columns={columns}
        heading="Trek Performance"
        hasAction
        actionName="Export Report"
        onAction={() => setExportVisible(true)}
        filterable="search"
        filterablePlaceholder="Search by trek number, driver, or branch..."
        enableTableFilter
        enablePaginator
        initialPageSize={20}
        emptyDataText="No treks found."
        dataMapper={dataMapper}
        parsePayload={parsePayload}
        extendedFilter={{
          enable: true,
          filters: [
            { type: 'SelectFilter', accessor: 'status', label: 'Status', args: { options: STATUS_OPTIONS } },
            { type: 'SelectFilter', accessor: 'branchId', label: 'Branch', args: { options: branchOptions } },
            { type: 'SelectFilter', accessor: 'driverId', label: 'Driver', args: { options: driverOptions } },
            { type: 'SelectFilter', accessor: 'sort', label: 'Sort', args: { options: SORT_OPTIONS } },
          ],
        }}
      />

      {/* ── Export modal ── */}
      <FlatModal
        visible={exportVisible}
        onHide={resetExport}
        title="Export Trek Report"
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <FlatButton variant="danger-outline" label="Cancel" onClick={resetExport} disabled={exporting} />
            <FlatButton
              variant="primary"
              label={exporting ? 'Generating...' : 'Download'}
              icon="pi pi-download"
              onClick={handleExport}
              loading={exporting}
              disabled={exporting}
            />
          </div>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-portal-muted uppercase tracking-wide mb-1.5">From</label>
              <input type="date" value={exportFrom} onChange={(e) => setExportFrom(e.target.value)}
                className="bg-portal-canvas border border-portal-border text-white text-sm h-9 px-3 w-full focus:outline-none focus:border-portal-accent" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-portal-muted uppercase tracking-wide mb-1.5">To</label>
              <input type="date" value={exportTo} onChange={(e) => setExportTo(e.target.value)}
                className="bg-portal-canvas border border-portal-border text-white text-sm h-9 px-3 w-full focus:outline-none focus:border-portal-accent" />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-portal-muted uppercase tracking-wide mb-1.5">Branch</label>
            <FlatDropdown value={exportBranchId} options={branchOptions}
              onChange={(val: any) => setExportBranchId(val?.value !== undefined ? val.value : val)}
              placeholder="All Branches" size="sm" />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-portal-muted uppercase tracking-wide mb-1.5">Driver</label>
            <FlatDropdown value={exportDriverId} options={driverOptions}
              onChange={(val: any) => setExportDriverId(val?.value !== undefined ? val.value : val)}
              placeholder="All Drivers" size="sm" />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-portal-muted uppercase tracking-wide mb-1.5">Status</label>
            <FlatDropdown value={exportStatus} options={STATUS_OPTIONS}
              onChange={(val: any) => setExportStatus(val?.value !== undefined ? val.value : val)}
              placeholder="All Statuses" size="sm" />
          </div>
        </div>
      </FlatModal>
    </div>
  );
};

export default TrekReportPage;
