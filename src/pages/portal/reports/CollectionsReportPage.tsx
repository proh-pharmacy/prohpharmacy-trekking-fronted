import React, { useState, useEffect, useCallback } from 'react';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';
import { FlatButton, FlatDropdown } from '../../../components/flat-form';
import { reportsApi, organisationApi, type CollectionsReportResponse } from '../../../api-client';
import { fmtGhs, fmtGhsShort } from '../../../lib/utils';
import { FlatDataTable } from '../../../components/data-table';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  Cash: 'Cash',
  MobileMoney: 'Mobile Money',
  Cheque: 'Cheque',
  BankTransfer: 'Bank Transfer',
  Credit: 'Credit',
  Unspecified: 'Unspecified',
};

export const CollectionsReportPage: React.FC = () => {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState(todayStr());
  const [branchId, setBranchId] = useState('');
  const [regionId, setRegionId] = useState('');

  const [branchOptions, setBranchOptions] = useState<{ label: string; value: string }[]>([{ label: 'All Branches', value: '' }]);
  const [regionOptions, setRegionOptions] = useState<{ label: string; value: string }[]>([{ label: 'All Regions', value: '' }]);

  const [data, setData] = useState<CollectionsReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    Promise.allSettled([
      organisationApi.getBranches(),
      organisationApi.getRegions(),
    ]).then(([branchRes, regionRes]) => {
      if (branchRes.status === 'fulfilled') {
        setBranchOptions([{ label: 'All Branches', value: '' }, ...branchRes.value.map((b) => ({ label: b.name, value: b.id }))]);
      }
      if (regionRes.status === 'fulfilled') {
        setRegionOptions([{ label: 'All Regions', value: '' }, ...regionRes.value.map((r) => ({ label: r.name, value: r.id }))]);
      }
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reportsApi.getCollectionsReport({
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
        ...(branchId ? { branchId } : {}),
        ...(regionId ? { regionId } : {}),
      });
      setData(res);
    } catch {
      toast.error('Failed to load collections report.');
    } finally {
      setLoading(false);
    }
  }, [from, to, branchId, regionId]);

  useEffect(() => { load(); }, [load]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const { blob, filename } = await reportsApi.exportCollectionsReport({
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
        ...(branchId ? { branchId } : {}),
        ...(regionId ? { regionId } : {}),
      });
      saveAs(blob, filename);
      toast.success('Report downloaded.');
    } catch {
      toast.error('Failed to generate report.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Filter bar ── */}
      <div className="bg-portal-surface border border-portal-border/60 p-4 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-xl font-bold tracking-tight text-white">Collections Report</h2>
          <FlatButton
            variant="primary"
            label={exporting ? 'Generating...' : 'Export Report'}
            icon="pi pi-download"
            onClick={handleExport}
            loading={exporting}
            disabled={exporting || loading}
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-portal-muted uppercase tracking-wide mb-1.5">From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="bg-portal-canvas border border-portal-border text-white text-xs h-9 px-3 w-full focus:outline-none focus:border-portal-accent" />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-portal-muted uppercase tracking-wide mb-1.5">To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className="bg-portal-canvas border border-portal-border text-white text-xs h-9 px-3 w-full focus:outline-none focus:border-portal-accent" />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-portal-muted uppercase tracking-wide mb-1.5">Branch</label>
            <FlatDropdown value={branchId} options={branchOptions}
              onChange={(val: any) => setBranchId(val?.value !== undefined ? val.value : val)}
              placeholder="All Branches" size="sm" />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-portal-muted uppercase tracking-wide mb-1.5">Region</label>
            <FlatDropdown value={regionId} options={regionOptions}
              onChange={(val: any) => setRegionId(val?.value !== undefined ? val.value : val)}
              placeholder="All Regions" size="sm" />
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <span className="text-xs text-portal-muted flex items-center gap-2">
            <i className="pi pi-spin pi-spinner" /> Loading...
          </span>
        </div>
      )}

      {!loading && data && (
        <>
          {/* ── Summary stats ── */}
          <div className="flex gap-3">
            <div className="flex-1 min-w-0 bg-portal-surface border border-portal-border/60 p-3">
              <p className="text-[10px] text-portal-muted uppercase tracking-wide mb-1">Total Collected</p>
              <p className="text-xs font-semibold text-portal-accent truncate" title={fmtGhs(data.totalCollected)}>{fmtGhsShort(data.totalCollected)}</p>
            </div>
            <div className="flex-1 min-w-0 bg-portal-surface border border-portal-border/60 p-3">
              <p className="text-[10px] text-portal-muted uppercase tracking-wide mb-1">Total Transactions</p>
          <p className="text-xs font-semibold text-portal-text truncate">{data.totalTransactions.toLocaleString()}</p>
            </div>
          </div>

          {/* ── Two tables ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* By Payment Method */}
            <div className="bg-portal-surface border border-portal-border/60">
              <div className="px-5 py-3 border-b border-portal-border/60">
                <span className="text-sm font-bold text-white">By Payment Method</span>
              </div>
              <FlatDataTable
                data={data.byPaymentMethod}
                enablePaginator={false}
                enableTableFilter={false}
                emptyDataText="No data."
                columns={[
                  { field: 'paymentMethod', header: 'Method', body: (row) => <span className="text-xs text-portal-text">{PAYMENT_METHOD_LABELS[row.paymentMethod] ?? row.paymentMethod}</span> },
                  { field: 'transactions', header: 'Transactions', body: (row) => <span className="text-xs text-portal-muted">{row.transactions.toLocaleString()}</span> },
                  { field: 'total', header: 'Total', body: (row) => <span className="text-xs font-mono text-portal-accent">{fmtGhs(row.total)}</span> },
                ]}
              />
            </div>

            {/* By Branch */}
            <div className="bg-portal-surface border border-portal-border/60">
              <div className="px-5 py-3 border-b border-portal-border/60">
                <span className="text-sm font-bold text-white">By Branch</span>
              </div>
              <FlatDataTable
                data={data.byBranch}
                enablePaginator={false}
                enableTableFilter={false}
                emptyDataText="No data."
                columns={[
                  { field: 'branchName', header: 'Branch', body: (row) => <span className="text-xs text-portal-text">{row.branchName}</span> },
                  { field: 'transactions', header: 'Transactions', body: (row) => <span className="text-xs text-portal-muted">{row.transactions.toLocaleString()}</span> },
                  { field: 'total', header: 'Total', body: (row) => <span className="text-xs font-mono text-portal-accent">{fmtGhs(row.total)}</span> },
                ]}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CollectionsReportPage;
