import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  FlatDataTable,
  type ColumnDef,
  type PaginatedDataResponse,
} from '../../../components/data-table';
import { FlatButton } from '../../../components/flat-form';
import {
  fleetApi,
  getApiError,
  vehicleStockApi,
  type StockItem,
  type StockLedgerEntry,
  type StockLedgerSource,
  type StockSummary,
  type Vehicle,
} from '../../../api-client';
import { usePermissions } from '../../../hooks/usePermissions';
import { VehicleStockModal } from './components/VehicleStockModal';
import { VehicleStockExportModal } from './components/VehicleStockExportModal';
import { VehicleStockSnapshotExportModal } from './components/VehicleStockSnapshotExportModal';
import { VehicleStockTrendOverlay } from './components/VehicleStockTrendOverlay';
import { ResetVehicleStockModal } from './components/ResetVehicleStockModal';

function formatDateTime(iso: string | null): { date: string; time: string } | null {
  if (!iso) return null;
  try {
    const value = new Date(iso);
    if (Number.isNaN(value.getTime())) return { date: iso, time: '' };
    return {
      date: value.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      time: value.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  } catch {
    return { date: iso, time: '' };
  }
}

function UpdatedAtCell({ value }: { value: string | null }) {
  const formatted = formatDateTime(value);
  if (!formatted) return <span className="text-xs text-portal-muted">—</span>;
  return (
    <div className="leading-tight">
      <div className="text-xs text-portal-text">{formatted.date}</div>
      {formatted.time && <div className="mt-0.5 text-[11px] text-portal-muted">{formatted.time}</div>}
    </div>
  );
}

type StockTab = 'stock' | 'history';

const LEDGER_SOURCE_OPTIONS: { label: string; value: StockLedgerSource }[] = [
  { label: 'Manual load', value: 'ManualLoad' },
  { label: 'Trek completion', value: 'TrekCompletion' },
  { label: 'Return approval', value: 'ReturnApproval' },
  { label: 'Stock reset', value: 'StockReset' },
];

const LEDGER_SOURCE_LABELS: Record<StockLedgerSource, string> = {
  ManualLoad: 'Manual load',
  TrekCompletion: 'Trek completion',
  ReturnApproval: 'Return approval',
  StockReset: 'Stock reset',
};

interface StockLedgerTableProps {
  vehicleId: string;
  onExport: () => void;
  onViewTrend: () => void;
}

const StockLedgerTable: React.FC<StockLedgerTableProps> = ({ vehicleId, onExport, onViewTrend }) => {
  const dataMapper = useCallback(
    (response: any): PaginatedDataResponse<StockLedgerEntry> => {
      if (Array.isArray(response)) {
        return {
          totalCount: response.length,
          totalPages: 1,
          currentPage: 1,
          pageSize: response.length,
          data: response,
        };
      }
      return {
        totalCount: response?.totalCount ?? 0,
        totalPages: response?.totalPages ?? 1,
        currentPage: response?.currentPage ?? 1,
        pageSize: response?.pageSize ?? 20,
        data: response?.data ?? [],
      };
    },
    [],
  );

  const parsePayload = useCallback((payload: any) => {
    const next: Record<string, any> = { ...payload };
    const range = next.recordedAt;
    delete next.recordedAt;
    if (Array.isArray(range)) {
      const [from, to] = range;
      if (from instanceof Date && !Number.isNaN(from.getTime())) {
        const start = new Date(from);
        start.setHours(0, 0, 0, 0);
        next.from = start.toISOString();
      }
      if (to instanceof Date && !Number.isNaN(to.getTime())) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        next.to = end.toISOString();
      }
    }
    delete next.search;
    return next;
  }, []);

  const columns: ColumnDef<StockLedgerEntry>[] = useMemo(
    () => [
      {
        field: 'changeIndicator',
        header: '#',
        style: { width: '4%', whiteSpace: 'nowrap' },
        headerStyle: { width: '4%', whiteSpace: 'nowrap' },
        body: (row) => {
          const isAdd = row.changeType === 'Addition';
          return (
            <i
              className={`pi ${isAdd ? 'pi-arrow-up text-portal-accent' : 'pi-arrow-down text-red-400'} text-xs`}
              aria-label={isAdd ? 'Addition' : 'Reduction'}
            />
          );
        },
      },
      {
        field: 'recordedAt',
        header: 'When',
        style: { width: '16%', whiteSpace: 'nowrap' },
        headerStyle: { width: '16%', whiteSpace: 'nowrap' },
        body: (row) => <UpdatedAtCell value={row.recordedAt} />,
      },
      {
        field: 'productName',
        header: 'Product',
        style: { width: '20%', maxWidth: '20%' },
        headerStyle: { width: '20%', maxWidth: '20%' },
        body: (row) => (
          <div className="min-w-0 max-w-[220px]">
            <div className="truncate text-xs text-portal-text" title={row.productName}>
              {row.productName}
            </div>
          </div>
        ),
      },
      {
        field: 'changeType',
        header: 'Quantity',
        style: { width: '18%', whiteSpace: 'nowrap' },
        headerStyle: { width: '18%', whiteSpace: 'nowrap' },
        body: (row) => {
          const isAdd = row.changeType === 'Addition';
          const tone = isAdd ? 'text-portal-accent' : 'text-red-400';
          return (
            <div className={`font-mono text-xs tabular-nums ${tone}`}>
              <span>
                {row.basicQtyChange} {row.basicUnitName}
              </span>
              {row.packagingUnitName && row.packagingQtyChange > 0 && (
                <span className="text-portal-muted">
                  {' · '}
                  {row.packagingQtyChange} {row.packagingUnitName}
                </span>
              )}
            </div>
          );
        },
      },
      {
        field: 'basicBalanceAfter',
        header: 'Balance',
        style: { width: '16%', whiteSpace: 'nowrap' },
        headerStyle: { width: '16%', whiteSpace: 'nowrap' },
        body: (row) => {
          const isAdd = row.changeType === 'Addition';
          const tone = isAdd ? 'text-portal-accent' : 'text-red-400';
          return (
            <div className={`font-mono text-xs tabular-nums ${tone}`}>
              <span>
                {row.basicBalanceAfter} {row.basicUnitName}
              </span>
              {row.packagingUnitName && (
                <span className="text-portal-muted">
                  {' · '}
                  {row.packagingBalanceAfter} {row.packagingUnitName}
                </span>
              )}
            </div>
          );
        },
      },
      {
        field: 'source',
        header: 'Source',
        style: { width: '14%', whiteSpace: 'nowrap' },
        headerStyle: { width: '14%', whiteSpace: 'nowrap' },
        body: (row) => (
          <span className="text-xs text-portal-text">{LEDGER_SOURCE_LABELS[row.source] ?? row.source}</span>
        ),
      },
      {
        field: 'reason',
        header: 'Reason',
        style: { width: '14%', maxWidth: '14%' },
        headerStyle: { width: '14%', maxWidth: '14%' },
        body: (row) => (
          <div className="min-w-0">
            <div className="truncate text-xs text-portal-text" title={row.reason ?? ''}>
              {row.reason || '—'}
            </div>
            {row.authorName && (
              <div className="mt-0.5 truncate text-[11px] text-portal-muted" title={row.authorName}>
                by {row.authorName}
              </div>
            )}
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <FlatDataTable<StockLedgerEntry>
      dataSourceUrl={`/vehicles/${vehicleId}/stock/ledger`}
      columns={columns}
      heading="Stock history"
      hasAction
      actionName="Export"
      actionIcon="pi pi-download"
      onAction={onExport}
      secondaryAction
      secondaryActionName="View trend"
      secondaryActionIcon="pi pi-chart-line"
      onSecondaryAction={onViewTrend}
      enablePaginator
      initialPageSize={20}
      enableTableFilter
      filterable="search"
      filterablePlaceholder=""
      dataMapper={dataMapper}
      parsePayload={parsePayload}
      emptyDataText="No ledger entries yet."
      extendedFilter={{
        enable: true,
        filters: [
          {
            type: 'AsyncSelectFilter',
            accessor: 'productId',
            label: 'Product',
            args: {
              endpointUrl: `/products?vehicleId=${encodeURIComponent(vehicleId)}`,
              optionValue: 'id',
              optionLabel: 'name',
              pageSize: 20,
              size: 'sm',
              placeholder: 'Search products...',
              itemTemplate: (product: any) => (
                <div className="min-w-0">
                  <span className="block truncate text-xs font-semibold text-white">{product.name}</span>
                  {(product.packagingUnitName || product.basicUnitName) && (
                    <span className="block truncate text-[11px] text-portal-muted">
                      {[product.packagingUnitName, product.basicUnitName].filter(Boolean).join(' / ')}
                    </span>
                  )}
                </div>
              ),
            },
          },
          {
            type: 'SelectFilter',
            accessor: 'source',
            label: 'Source',
            args: { options: LEDGER_SOURCE_OPTIONS },
          },
          {
            type: 'DateRangeFilter',
            accessor: 'recordedAt',
            label: 'Date range',
          },
        ],
      }}
    />
  );
};

export const VehicleStockPage: React.FC = () => {
  const { vehicleId = '' } = useParams<{ vehicleId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const activeTab: StockTab = rawTab === 'history' ? 'history' : 'stock';
  const { hasAnyPermission } = usePermissions();
  const canManage = hasAnyPermission('Vehicles.Manage', 'Vehicles.Edit');

  const handleTabChange = (tab: StockTab) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next, { replace: true });
  };

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [vehicleLoading, setVehicleLoading] = useState(true);
  const [vehicleError, setVehicleError] = useState<string | null>(null);

  const [stock, setStock] = useState<StockItem[]>([]);
  const [stockLoading, setStockLoading] = useState(true);
  const [stockError, setStockError] = useState<string | null>(null);

  const [summary, setSummary] = useState<StockSummary | null>(null);

  const [mode, setMode] = useState<'load' | 'remove' | null>(null);
  const [lockedProduct, setLockedProduct] = useState<{
    id: string;
    name: string;
    basicUnitName: string;
    packagingUnitName: string | null;
  } | null>(null);
  const [trendVisible, setTrendVisible] = useState(false);
  const [exportVisible, setExportVisible] = useState(false);
  const [snapshotExportVisible, setSnapshotExportVisible] = useState(false);
  const [resetVisible, setResetVisible] = useState(false);
  const [rowMenu, setRowMenu] = useState<{ item: StockItem; top: number; left: number } | null>(null);

  useEffect(() => {
    if (!rowMenu) return;
    const close = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-actions-menu]') || target?.closest('[data-actions-trigger]')) return;
      setRowMenu(null);
    };
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [rowMenu]);

  const loadVehicle = useCallback(async () => {
    if (!vehicleId) return;
    setVehicleLoading(true);
    setVehicleError(null);
    try {
      const data = await fleetApi.getVehicle(vehicleId);
      setVehicle(data);
    } catch (err: unknown) {
      const apiError = getApiError(err);
      setVehicleError(apiError?.message || 'Failed to load vehicle.');
    } finally {
      setVehicleLoading(false);
    }
  }, [vehicleId]);

  const loadSummary = useCallback(async () => {
    if (!vehicleId) return;
    try {
      const data = await vehicleStockApi.getStockSummary(vehicleId);
      setSummary(data);
    } catch {
      setSummary(null);
    }
  }, [vehicleId]);

  const loadStock = useCallback(async () => {
    if (!vehicleId) return;
    setStockLoading(true);
    setStockError(null);
    try {
      setStock(await vehicleStockApi.getStock(vehicleId));
    } catch (err: unknown) {
      const apiError = getApiError(err);
      setStockError(apiError?.message || 'Failed to load stock.');
    } finally {
      setStockLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    loadVehicle();
    loadStock();
    loadSummary();
  }, [loadVehicle, loadStock, loadSummary]);

  const columns: ColumnDef<StockItem>[] = useMemo(() => [
    {
      field: 'productName',
      header: 'Product',
      style: { width: '32%', maxWidth: '32%' },
      headerStyle: { width: '32%', maxWidth: '32%' },
      body: (row) => (
        <div className="min-w-0 max-w-[280px]">
          <div className="truncate text-xs text-portal-text" title={row.productName}>{row.productName}</div>
          {row.isLowStock && (
            <div className="mt-0.5 text-[11px] text-amber-400">
              <i className="pi pi-exclamation-triangle mr-1 text-[10px]" />
              Low stock
            </div>
          )}
        </div>
      ),
    },
    {
      field: 'quantity',
      header: 'Quantity',
      style: { width: '22%', whiteSpace: 'nowrap' },
      headerStyle: { width: '22%', whiteSpace: 'nowrap' },
      body: (row) => (
        <div className="font-mono text-xs tabular-nums">
          <span className="text-portal-text">{row.basicQuantityOnHand} {row.basicUnitName}</span>
          {row.packagingUnitName && (
            <span className="text-portal-muted"> · {row.packagingQuantityOnHand} {row.packagingUnitName}</span>
          )}
        </div>
      ),
    },
    {
      field: 'lowStockThreshold',
      header: 'Low stock at',
      style: { width: '18%', whiteSpace: 'nowrap' },
      headerStyle: { width: '18%', whiteSpace: 'nowrap' },
      body: (row) => (
        <span className="font-mono text-xs text-portal-muted tabular-nums">
          {row.lowStockThreshold == null
            ? 'Not available'
            : `${row.lowStockThreshold} ${row.basicUnitName}`}
        </span>
      ),
    },
    {
      field: 'updatedAt',
      header: 'Last updated',
      style: { width: '20%', whiteSpace: 'nowrap' },
      headerStyle: { width: '20%', whiteSpace: 'nowrap' },
      body: (row) => <UpdatedAtCell value={row.updatedAt} />,
    },
    ...(canManage ? [{
      field: 'actions',
      header: 'Actions',
      headerStyle: { width: '8%', textAlign: 'right' as const },
      style: { width: '8%', textAlign: 'right' as const },
      body: (row: StockItem) => {
        const isActive = rowMenu?.item.productId === row.productId;
        return (
          <div className="flex justify-end">
            <button
              type="button"
              data-actions-trigger="true"
              title="Actions"
              onClick={(e) => {
                e.stopPropagation();
                if (isActive) { setRowMenu(null); return; }
                const rect = e.currentTarget.getBoundingClientRect();
                const menuWidth = 192;
                setRowMenu({ item: row, top: rect.bottom + 4, left: Math.max(8, rect.right - menuWidth) });
              }}
              className={`w-7 h-7 inline-flex items-center justify-center rounded transition cursor-pointer ${
                isActive ? 'bg-portal-hover text-portal-heading' : 'text-portal-muted hover:text-portal-heading hover:bg-portal-hover'
              }`}
            >
              <i className="pi pi-ellipsis-v text-xs" />
            </button>
          </div>
        );
      },
    }] : []),
  ], [canManage, rowMenu]);

  const vehicleLabel = summary?.vehicleInfo
    || (vehicle ? [vehicle.regionName, vehicle.displayName].filter(Boolean).join(' - ') : '')
    || (vehicleLoading ? 'Loading…' : '—');

  const handleBack = () => navigate('/portal/fleet/stock');

  return (
    <div className="space-y-5">
      {vehicleError && (
        <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {vehicleError}
        </div>
      )}

      <div className="flex border-b border-portal-border/60 gap-6 text-sm font-semibold overflow-x-auto whitespace-nowrap">
        <button
          type="button"
          onClick={() => handleTabChange('stock')}
          className={`pb-3 -mb-px border-b-2 transition cursor-pointer !rounded-none ${
            activeTab === 'stock'
              ? 'border-portal-accent text-portal-heading font-bold'
              : 'border-transparent text-portal-muted hover:text-portal-heading'
          }`}
        >
          <span>Stock</span>
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('history')}
          className={`pb-3 -mb-px border-b-2 transition cursor-pointer !rounded-none ${
            activeTab === 'history'
              ? 'border-portal-accent text-portal-heading font-bold'
              : 'border-transparent text-portal-muted hover:text-portal-heading'
          }`}
        >
          <span>History</span>
        </button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded text-portal-muted transition-colors hover:bg-white/[0.08] hover:text-portal-text"
            aria-label="Back to vehicle stock"
          >
            <i className="pi pi-arrow-left text-xs" />
          </button>
          <h1 className="truncate text-base font-semibold text-portal-text">
            Vehicle warehouse stock
          </h1>
        </div>

        {activeTab === 'stock' && (
          <div className="flex items-center gap-2">
            <FlatButton size="sm" variant="outline" leftIcon="pi pi-download" onClick={() => setSnapshotExportVisible(true)} disabled={vehicleLoading || !vehicle}>Export</FlatButton>
            {canManage && (
              <>
                <FlatButton size="sm" variant="danger-outline" leftIcon="pi pi-trash" onClick={() => setResetVisible(true)} disabled={stockLoading || stock.length === 0}>Reset stock</FlatButton>
                <FlatButton size="sm" variant="primary" leftIcon="pi pi-plus" onClick={() => { setLockedProduct(null); setMode('load'); }} disabled={vehicleLoading || !vehicle}>Add Stock</FlatButton>
              </>
            )}
          </div>
        )}
      </div>

      {activeTab === 'stock' ? (
        <>
      <div className="flex flex-wrap gap-3">
        <div className="flex-[2] min-w-[220px] bg-portal-surface border border-portal-border/60 p-3 min-w-0">
          <p className="text-[10px] text-portal-muted uppercase tracking-wide mb-1">Vehicle</p>
          <p className="text-xs font-semibold text-portal-text truncate" title={vehicleLabel}>
            {vehicleLabel}
          </p>
        </div>
        <div className="flex-1 min-w-[110px] bg-portal-surface border border-portal-border/60 p-3 min-w-0">
          <p className="text-[10px] text-portal-muted uppercase tracking-wide mb-1">Products Tracked</p>
          <p className="text-xs font-semibold text-portal-text truncate">
            {(summary?.trackedProductCount ?? 0).toLocaleString()}
          </p>
        </div>
        <div className="flex-1 min-w-[110px] bg-portal-surface border border-portal-border/60 p-3 min-w-0">
          <p className="text-[10px] text-portal-muted uppercase tracking-wide mb-1">In Stock</p>
          <p className="text-xs font-semibold text-portal-accent truncate">
            {(summary?.inStockProductCount ?? 0).toLocaleString()}
          </p>
        </div>
        <div className="flex-1 min-w-[110px] bg-portal-surface border border-portal-border/60 p-3 min-w-0">
          <p className="text-[10px] text-portal-muted uppercase tracking-wide mb-1">Out of Stock</p>
          <p className={`text-xs font-semibold truncate ${(summary?.outOfStockProductCount ?? 0) > 0 ? 'text-amber-400' : 'text-portal-text'}`}>
            {(summary?.outOfStockProductCount ?? 0).toLocaleString()}
          </p>
        </div>
      </div>

      <FlatDataTable<StockItem>
        data={stock}
        columns={columns}
        enablePaginator
        initialPageSize={20}
        filterablePlaceholder="Search products..."
        emptyDataText={
          stockError
            ? `Failed to load stock: ${stockError}`
            : stockLoading
              ? 'Loading stock...'
              : 'No stock items yet. Use "Add Stock" to load products onto this vehicle.'
        }
      />
        </>
      ) : (
        <StockLedgerTable
          vehicleId={vehicleId}
          onExport={() => setExportVisible(true)}
          onViewTrend={() => setTrendVisible(true)}
        />
      )}

      <VehicleStockExportModal
        visible={exportVisible}
        vehicleId={vehicleId}
        vehicleName={vehicleLabel}
        onHide={() => setExportVisible(false)}
      />

      <VehicleStockSnapshotExportModal
        visible={snapshotExportVisible}
        vehicleId={vehicleId}
        vehicleName={vehicleLabel}
        onHide={() => setSnapshotExportVisible(false)}
      />

      <ResetVehicleStockModal
        visible={resetVisible}
        vehicleId={vehicleId}
        vehicleName={vehicleLabel}
        onHide={() => setResetVisible(false)}
        onComplete={async () => { await Promise.all([loadStock(), loadSummary()]); }}
      />

      <VehicleStockTrendOverlay
        visible={trendVisible}
        vehicleId={vehicleId}
        vehicleName={vehicleLabel}
        onHide={() => setTrendVisible(false)}
      />

      {mode && vehicle && (
        <VehicleStockModal
          visible={true}
          mode={mode}
          vehicleId={vehicle.id}
          vehicleName={vehicle.displayName}
          lockedProduct={lockedProduct}
          onHide={() => { setMode(null); setLockedProduct(null); }}
          onComplete={() => { loadStock(); loadSummary(); }}
        />
      )}

      {rowMenu &&
        createPortal(
          <div
            data-actions-menu="true"
            style={{ top: `${rowMenu.top}px`, left: `${rowMenu.left}px` }}
            className="fixed z-[9999] w-48 bg-portal-card border border-portal-card-border rounded shadow-2xl shadow-black/60 py-1 text-xs divide-y divide-white/10 font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="py-0.5">
              <button
                type="button"
                onClick={() => {
                  const target = {
                    id: rowMenu.item.productId,
                    name: rowMenu.item.productName,
                    basicUnitName: rowMenu.item.basicUnitName,
                    packagingUnitName: rowMenu.item.packagingUnitName,
                  };
                  setRowMenu(null);
                  setLockedProduct(target);
                  setMode('load');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-white hover:bg-white/10 transition-colors text-left cursor-pointer font-medium"
              >
                <i className="pi pi-plus text-portal-accent text-xs w-4" />
                <span>Increase stock</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = {
                    id: rowMenu.item.productId,
                    name: rowMenu.item.productName,
                    basicUnitName: rowMenu.item.basicUnitName,
                    packagingUnitName: rowMenu.item.packagingUnitName,
                  };
                  setRowMenu(null);
                  setLockedProduct(target);
                  setMode('remove');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-white hover:bg-white/10 transition-colors text-left cursor-pointer font-medium"
              >
                <i className="pi pi-minus text-red-400 text-xs w-4" />
                <span>Reduce stock</span>
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default VehicleStockPage;
