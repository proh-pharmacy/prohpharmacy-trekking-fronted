import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';
import { FlatDataTable, type ColumnDef, type PaginatedDataResponse } from '../../../components/data-table';
import { FlatButton, FlatDropdown, FlatAsyncSelect } from '../../../components/flat-form';
import { FlatModal } from '../../../components/overlay';
import { reportsApi, organisationApi, type ProductReportItem } from '../../../api-client';
import { fmtGhs, fmtGhsShort } from '../../../lib/utils';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export const ProductsReportPage: React.FC = () => {
  const [stats, setStats] = useState({
    totalProductLines: 0,
    totalAmountCollected: 0,
    totalOutstanding: 0,
  });

  const [branchOptions, setBranchOptions] = useState<{ label: string; value: string }[]>([{ label: 'All Branches', value: '' }]);

  useEffect(() => {
    organisationApi.getBranches()
      .then((branches) => {
        setBranchOptions([
          { label: 'All Branches', value: '' },
          ...branches.map((b) => ({ label: b.name, value: b.id })),
        ]);
      })
      .catch(() => {});
  }, []);

  // ── Export modal ───────────────────────────────────────────────────
  const [exportVisible, setExportVisible] = useState(false);
  const [exportFrom, setExportFrom] = useState('');
  const [exportTo, setExportTo] = useState(todayStr());
  const [exportBranchId, setExportBranchId] = useState('');
  const [exportProductId, setExportProductId] = useState('');
  const [exporting, setExporting] = useState(false);

  const resetExport = () => {
    setExportFrom(''); setExportTo(todayStr()); setExportBranchId(''); setExportProductId(''); setExportVisible(false);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const { blob, filename } = await reportsApi.exportProductsReport({
        ...(exportFrom ? { from: exportFrom } : {}),
        ...(exportTo ? { to: exportTo } : {}),
        ...(exportBranchId ? { branchId: exportBranchId } : {}),
        ...(exportProductId ? { productId: exportProductId } : {}),
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
    (response: any): PaginatedDataResponse<ProductReportItem> => {
      const payload = response || {};
      setStats({
        totalProductLines: payload.totalProductLines ?? 0,
        totalAmountCollected: payload.totalAmountCollected ?? 0,
        totalOutstanding: payload.totalOutstanding ?? 0,
      });
      const products: ProductReportItem[] = Array.isArray(payload.products) ? payload.products : [];
      return {
        data: products,
        totalCount: payload.totalCount ?? products.length,
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
    search: payload.productId ? undefined : (payload.search || undefined),
    ...(payload.branchId ? { branchId: payload.branchId } : {}),
    ...(payload.productId ? { productId: payload.productId } : {}),
  }), []);

  // ── Columns ────────────────────────────────────────────────────────
  const columns: ColumnDef<ProductReportItem>[] = useMemo(() => [
    {
      field: 'productName',
      header: 'Product',
      body: (row) => (
        <div>
          <span className="font-bold text-xs text-white">{row.productName}</span>
          {row.unit && <span className="text-[11px] text-portal-muted ml-2">{row.unit}</span>}
        </div>
      ),
    },
    {
      field: 'totalQtyDelivered',
      header: 'Qty Delivered',
      style: { width: '120px', textAlign: 'right' },
      headerStyle: { textAlign: 'right' },
      body: (row) => (
        <span className="font-mono text-xs text-portal-text">{Number(row.totalQtyDelivered).toLocaleString()}</span>
      ),
    },
    {
      field: 'treksCount',
      header: 'Treks',
      style: { width: '80px', textAlign: 'center' },
      headerStyle: { textAlign: 'center' },
      body: (row) => <span className="text-xs text-portal-muted text-center block">{row.treksCount}</span>,
    },
    {
      field: 'totalCollected',
      header: 'Collected',
      style: { width: '130px', textAlign: 'right' },
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
  ], []);

  return (
    <div className="space-y-6">
      {/* ── Summary stats ── */}
      <div className="flex gap-3">
        <div className="flex-1 min-w-0 bg-portal-surface border border-portal-border/60 p-3">
          <p className="text-[10px] text-portal-muted uppercase tracking-wide mb-1">Product Lines</p>
          <p className="text-xs font-semibold text-white truncate">{stats.totalProductLines.toLocaleString()}</p>
        </div>
        <div className="flex-1 min-w-0 bg-portal-surface border border-portal-border/60 p-3">
          <p className="text-[10px] text-portal-muted uppercase tracking-wide mb-1">Total Collected</p>
          <p className="text-xs font-semibold text-portal-accent truncate" title={fmtGhs(stats.totalAmountCollected)}>{fmtGhsShort(stats.totalAmountCollected)}</p>
        </div>
        <div className="flex-1 min-w-0 bg-portal-surface border border-portal-border/60 p-3">
          <p className="text-[10px] text-portal-muted uppercase tracking-wide mb-1">Total Outstanding</p>
          <p className="text-xs font-semibold text-orange-400 truncate" title={fmtGhs(stats.totalOutstanding)}>{fmtGhsShort(stats.totalOutstanding)}</p>
        </div>
      </div>

      {/* ── Table ── */}
      <FlatDataTable<ProductReportItem>
        dataSourceUrl="/reports/products"
        columns={columns}
        heading="Product Delivery"
        hasAction
        actionName="Export Report"
        onAction={() => setExportVisible(true)}
        filterable="search"
        filterablePlaceholder="Search by product name..."
        enableTableFilter
        enablePaginator
        initialPageSize={20}
        emptyDataText="No product data found."
        dataMapper={dataMapper}
        parsePayload={parsePayload}
        extendedFilter={{
          enable: true,
          filters: [
            {
              type: 'AsyncSelectFilter',
              accessor: 'productId',
              label: 'Product',
              args: {
                endpointUrl: '/products',
                optionValue: 'id',
                optionLabel: 'name',
                pageSize: 20,
                placeholder: 'Search products...',
              },
            },
            { type: 'SelectFilter', accessor: 'branchId', label: 'Branch', args: { options: branchOptions } },
          ],
        }}
      />

      {/* ── Export modal ── */}
      <FlatModal
        visible={exportVisible}
        onHide={resetExport}
        title="Export Product Delivery Report"
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
            <label className="block text-[11px] font-medium text-portal-muted uppercase tracking-wide mb-1.5">Product <span className="normal-case font-normal">(optional)</span></label>
            <FlatAsyncSelect
              value={exportProductId || undefined}
              endpointUrl="/products"
              optionValue="id"
              optionLabel="name"
              pageSize={20}
              placeholder="All products..."
              clearable
              size="sm"
              onChange={(val) => setExportProductId(val ?? '')}
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-portal-muted uppercase tracking-wide mb-1.5">Branch</label>
            <FlatDropdown value={exportBranchId} options={branchOptions}
              onChange={(val: any) => setExportBranchId(val?.value !== undefined ? val.value : val)}
              placeholder="All Branches" size="sm" />
          </div>
        </div>
      </FlatModal>
    </div>
  );
};

export default ProductsReportPage;
