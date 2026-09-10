import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { saveAs } from 'file-saver';
import { FlatDataTable, type ColumnDef, type PaginatedDataResponse } from '../../../components/data-table';
import { FlatButton, FlatDropdown } from '../../../components/flat-form';
import { FlatModal } from '../../../components/overlay';
import { type LedgerSummaryCustomer, customersApi, organisationApi } from '../../../api-client';

// ── Filter options ──────────────────────────────────────────────────────
const HAS_BALANCE_OPTIONS = [
  { label: 'All Customers', value: '' },
  { label: 'With Balance Only', value: 'true' },
];

const SORT_OPTIONS = [
  { label: 'Balance (High → Low)', value: 'balance_desc' },
  { label: 'Balance (Low → High)', value: 'balance_asc' },
  { label: 'Name (A → Z)', value: 'name_asc' },
  { label: 'Name (Z → A)', value: 'name_desc' },
];

// ── Helpers ─────────────────────────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ── Page ───────────────────────────────────────────────────────────────
export const LedgerSummaryPage: React.FC = () => {
  const navigate = useNavigate();

  // ── Summary stats (side-effected from dataMapper) ──────────────────
  const [stats, setStats] = useState({ totalOutstanding: 0, customersWithBalance: 0 });

  // ── Filter option lists ────────────────────────────────────────────
  const [regionOptions, setRegionOptions] = useState<{ label: string; value: string }[]>([
    { label: 'All Regions', value: '' },
  ]);
  const [branchOptions, setBranchOptions] = useState<{ label: string; value: string }[]>([
    { label: 'All Branches', value: '' },
  ]);

  useEffect(() => {
    Promise.allSettled([
      organisationApi.getRegions(),
      organisationApi.getBranches(),
    ]).then(([regionsResult, branchesResult]) => {
      if (regionsResult.status === 'fulfilled') {
        setRegionOptions([
          { label: 'All Regions', value: '' },
          ...regionsResult.value.map((r) => ({ label: r.name, value: r.id })),
        ]);
      }
      if (branchesResult.status === 'fulfilled') {
        setBranchOptions([
          { label: 'All Branches', value: '' },
          ...branchesResult.value.map((b) => ({ label: b.name, value: b.id })),
        ]);
      }
    });
  }, []);

  // ── Export modal state ─────────────────────────────────────────────
  const [exportVisible, setExportVisible] = useState(false);
  const [exportFrom, setExportFrom] = useState('');
  const [exportTo, setExportTo] = useState(todayStr());
  const [exportHasBalance, setExportHasBalance] = useState('');
  const [exportRegionId, setExportRegionId] = useState('');
  const [exportBranchId, setExportBranchId] = useState('');
  const [exporting, setExporting] = useState(false);

  const resetExportModal = () => {
    setExportFrom('');
    setExportTo(todayStr());
    setExportHasBalance('');
    setExportRegionId('');
    setExportBranchId('');
    setExportVisible(false);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const { blob, filename } = await customersApi.exportLedgerSummary({
        ...(exportFrom ? { from: exportFrom } : {}),
        ...(exportTo ? { to: exportTo } : {}),
        ...(exportHasBalance === 'true' ? { hasBalance: true } : {}),
        ...(exportRegionId ? { regionId: exportRegionId } : {}),
        ...(exportBranchId ? { branchId: exportBranchId } : {}),
      });
      saveAs(blob, filename);
      toast.success('Report downloaded.');
      resetExportModal();
    } catch {
      toast.error('Failed to generate report.');
    } finally {
      setExporting(false);
    }
  };

  // ── Data mapper ────────────────────────────────────────────────────
  const dataMapper = useCallback(
    (response: any): PaginatedDataResponse<LedgerSummaryCustomer> => {
      const payload = response || {};

      setStats({
        totalOutstanding: payload.totalOutstanding ?? 0,
        customersWithBalance: payload.customersWithBalance ?? 0,
      });

      const customers: LedgerSummaryCustomer[] = Array.isArray(payload.customers)
        ? payload.customers
        : [];

      return {
        data: customers,
        totalCount: payload.totalCount ?? customers.length,
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
    sort: payload.sort || 'balance_desc',
    ...(payload.hasBalance === 'true' ? { hasBalance: true } : {}),
    ...(payload.regionId ? { regionId: payload.regionId } : {}),
    ...(payload.branchId ? { branchId: payload.branchId } : {}),
  }), []);

  // ── Columns ────────────────────────────────────────────────────────
  const columns: ColumnDef<LedgerSummaryCustomer>[] = useMemo(
    () => [
      {
        field: 'businessName',
        header: 'Business Name',
        body: (row) => (
          <button
            type="button"
            onClick={() => navigate(`/portal/customers/${row.customerId}`)}
            className="font-bold text-xs text-white hover:text-portal-accent text-left transition cursor-pointer"
          >
            {row.businessName}
          </button>
        ),
      },
      {
        field: 'customerCode',
        header: 'Code',
        style: { width: '120px' },
        body: (row) => (
          <span className="font-mono text-xs text-portal-accent">
            {row.customerCode || '—'}
          </span>
        ),
      },
      {
        field: 'primaryPhoneNumber',
        header: 'Phone',
        style: { width: '140px' },
        body: (row) => (
          <span className="font-mono text-[11px] text-portal-text">
            {row.primaryPhoneNumber || '—'}
          </span>
        ),
      },
      {
        field: 'regionName',
        header: 'Region',
        style: { width: '140px' },
        body: (row) => (
          <span className="text-xs text-portal-text">{row.regionName || '—'}</span>
        ),
      },
      {
        field: 'branchName',
        header: 'Branch',
        style: { width: '140px' },
        body: (row) => (
          <span className="text-xs text-portal-text">{row.branchName || '—'}</span>
        ),
      },
      {
        field: 'totalDebits',
        header: 'Debits',
        style: { width: '110px', textAlign: 'right' },
        headerStyle: { textAlign: 'right' },
        body: (row) => (
          <span className="font-mono text-xs text-red-400">
            GHS {row.totalDebits.toFixed(2)}
          </span>
        ),
      },
      {
        field: 'totalCredits',
        header: 'Credits',
        style: { width: '110px', textAlign: 'right' },
        headerStyle: { textAlign: 'right' },
        body: (row) => (
          <span className="font-mono text-xs text-portal-accent">
            GHS {row.totalCredits.toFixed(2)}
          </span>
        ),
      },
      {
        field: 'currentBalance',
        header: 'Balance',
        style: { width: '110px', textAlign: 'right' },
        headerStyle: { textAlign: 'right' },
        body: (row) => (
          <span
            className={`font-mono text-xs font-semibold ${
              row.currentBalance > 0 ? 'text-orange-400' : 'text-portal-accent'
            }`}
          >
            GHS {row.currentBalance.toFixed(2)}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6">

      {/* ── Summary stats ── */}
      <div className="flex gap-3">
        <div className="flex-1 bg-portal-surface border border-portal-border/60 p-3">
          <p className="text-[10px] text-portal-muted uppercase tracking-wide mb-1">Total Outstanding</p>
          <p className="text-xs font-semibold text-orange-400">GHS {stats.totalOutstanding.toFixed(2)}</p>
        </div>
        <div className="flex-1 bg-portal-surface border border-portal-border/60 p-3">
          <p className="text-[10px] text-portal-muted uppercase tracking-wide mb-1">Customers with Balance</p>
          <p className="text-xs font-semibold text-white">{stats.customersWithBalance}</p>
        </div>
      </div>

      {/* ── Table ── */}
      <FlatDataTable<LedgerSummaryCustomer>
        dataSourceUrl="/ledger/summary"
        columns={columns}
        heading="Ledger Summary"
        hasAction
        actionName="Export Report"
        onAction={() => setExportVisible(true)}
        filterable="search"
        filterablePlaceholder="Search by name or code..."
        enableTableFilter
        enablePaginator
        initialPageSize={20}
        emptyDataText="No customers found."
        dataMapper={dataMapper}
        parsePayload={parsePayload}
        extendedFilter={{
          enable: true,
          filters: [
            {
              type: 'SelectFilter',
              accessor: 'hasBalance',
              label: 'Balance',
              args: { options: HAS_BALANCE_OPTIONS },
            },
            {
              type: 'SelectFilter',
              accessor: 'regionId',
              label: 'Region',
              args: { options: regionOptions },
            },
            {
              type: 'SelectFilter',
              accessor: 'branchId',
              label: 'Branch',
              args: { options: branchOptions },
            },
            {
              type: 'SelectFilter',
              accessor: 'sort',
              label: 'Sort',
              args: { options: SORT_OPTIONS },
            },
          ],
        }}
      />

      {/* ── Export modal ── */}
      <FlatModal
        visible={exportVisible}
        onHide={resetExportModal}
        title="Export Ledger Report"
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <FlatButton
              variant="danger-outline"
              label="Cancel"
              onClick={resetExportModal}
              disabled={exporting}
            />
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
              <label className="block text-[11px] font-medium text-portal-muted uppercase tracking-wide mb-1.5">
                From <span className="font-normal normal-case">(optional)</span>
              </label>
              <input
                type="date"
                value={exportFrom}
                onChange={(e) => setExportFrom(e.target.value)}
                className="bg-portal-canvas border border-portal-border text-white text-sm h-9 px-3 w-full focus:outline-none focus:border-portal-accent"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-portal-muted uppercase tracking-wide mb-1.5">
                To <span className="font-normal normal-case">(optional)</span>
              </label>
              <input
                type="date"
                value={exportTo}
                onChange={(e) => setExportTo(e.target.value)}
                className="bg-portal-canvas border border-portal-border text-white text-sm h-9 px-3 w-full focus:outline-none focus:border-portal-accent"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-portal-muted uppercase tracking-wide mb-1.5">
              Balance Filter
            </label>
            <FlatDropdown
              value={exportHasBalance}
              options={[{ label: 'All Customers', value: '' }, { label: 'With Balance Only', value: 'true' }]}
              onChange={(val: any) => setExportHasBalance(val?.value !== undefined ? val.value : val)}
              placeholder="All Customers"
              size="sm"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-portal-muted uppercase tracking-wide mb-1.5">
              Region
            </label>
            <FlatDropdown
              value={exportRegionId}
              options={regionOptions}
              onChange={(val: any) => setExportRegionId(val?.value !== undefined ? val.value : val)}
              placeholder="All Regions"
              size="sm"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-portal-muted uppercase tracking-wide mb-1.5">
              Branch
            </label>
            <FlatDropdown
              value={exportBranchId}
              options={branchOptions}
              onChange={(val: any) => setExportBranchId(val?.value !== undefined ? val.value : val)}
              placeholder="All Branches"
              size="sm"
            />
          </div>
        </div>
      </FlatModal>
    </div>
  );
};

export default LedgerSummaryPage;
