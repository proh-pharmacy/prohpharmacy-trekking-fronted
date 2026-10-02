import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import toast from 'react-hot-toast';
import { type Product, type StockLedgerEntry, vehicleStockApi } from '../../../../api-client';
import { FlatAsyncSelect, FlatButton, FlatDatePicker } from '../../../../components/flat-form';
import { FlatModal } from '../../../../components/overlay';

interface Props {
  visible: boolean;
  vehicleId: string;
  vehicleName: string;
  onHide: () => void;
}

type UnitView = 'basic' | 'packaging';

interface TrendPoint {
  id: string;
  timestamp: number;
  balance: number;
  change: number;
  changeType: StockLedgerEntry['changeType'];
  source: string;
  reason: string | null;
  authorName: string | null;
  isOpening?: boolean;
}

const formatAxisDate = (timestamp: number) => new Date(timestamp).toLocaleDateString('en-GB', {
  day: '2-digit',
  month: 'short',
});

const formatTooltipDate = (timestamp: number) => new Date(timestamp).toLocaleString('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const TrendTooltip = ({ active, payload, unitName }: any) => {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as TrendPoint;
  const sign = point.changeType === 'Addition' ? '+' : '−';
  return (
    <div className="min-w-52 rounded border border-portal-border bg-portal-card p-3 text-[11px] shadow-2xl">
      <p className="font-medium text-white">{formatTooltipDate(point.timestamp)}</p>
      <div className="mt-2 space-y-1 text-portal-muted">
        <p>Balance · <span className="font-mono text-portal-text">{point.balance.toLocaleString()} {unitName}</span></p>
        <p>Change · <span className={`font-mono ${point.changeType === 'Addition' ? 'text-portal-accent' : 'text-red-400'}`}>{sign}{point.change.toLocaleString()} {unitName}</span></p>
        <p>Source · <span className="text-portal-text">{point.source}</span></p>
        {point.reason && <p>Reason · <span className="text-portal-text">{point.reason}</span></p>}
        {point.authorName && <p>By · <span className="text-portal-text">{point.authorName}</span></p>}
      </div>
    </div>
  );
};

export const VehicleStockTrendOverlay: React.FC<Props> = ({ visible, vehicleId, vehicleName, onHide }) => {
  const [productId, setProductId] = useState('');
  const [product, setProduct] = useState<Product | null>(null);
  const [dateRange, setDateRange] = useState<(Date | null)[] | null>(null);
  const [entries, setEntries] = useState<StockLedgerEntry[]>([]);
  const [unitView, setUnitView] = useState<UnitView>('basic');
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const clearTrend = () => {
    setEntries([]);
    setHasLoaded(false);
  };

  const handleViewTrend = async () => {
    if (!productId) {
      toast.error('Select a product.');
      return;
    }
    const [from, to] = dateRange ?? [];
    setLoading(true);
    try {
      const end = to ? new Date(to) : null;
      if (end) end.setHours(23, 59, 59, 999);
      const data = await vehicleStockApi.getStockTrend(vehicleId, {
        productId,
        ...(from ? { from: new Date(from).toISOString() } : {}),
        ...(end ? { to: end.toISOString() } : {}),
      });
      setEntries([...data].sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()));
      setHasLoaded(true);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || error.response?.data?.message || 'Failed to load stock trend.');
    } finally {
      setLoading(false);
    }
  };

  const packagingUnitName = product?.packagingUnitName || entries.find((entry) => entry.packagingUnitName)?.packagingUnitName || null;
  const basicUnitName = product?.basicUnitName || entries[0]?.basicUnitName || 'basic units';
  const activeUnitName = unitView === 'packaging' ? packagingUnitName || 'packaging units' : basicUnitName;
  const points: TrendPoint[] = useMemo(() => {
    const changes = entries.map((entry) => ({
      id: entry.id,
      timestamp: new Date(entry.recordedAt).getTime(),
      balance: unitView === 'packaging' ? entry.packagingBalanceAfter : entry.basicBalanceAfter,
      change: unitView === 'packaging' ? entry.packagingQtyChange : entry.basicQtyChange,
      changeType: entry.changeType,
      source: entry.source,
      reason: entry.reason,
      authorName: entry.authorName,
    }));
    if (changes.length === 0) return [];
    const first = changes[0];
    const signedFirstChange = first.changeType === 'Addition' ? first.change : -first.change;
    const openingBalance = first.balance - signedFirstChange;
    const leadTime = changes.length > 1
      ? Math.max(60_000, Math.min(86_400_000, (changes[1].timestamp - first.timestamp) / 2))
      : 86_400_000;
    return [{
      id: 'opening-balance',
      timestamp: first.timestamp - leadTime,
      balance: openingBalance,
      change: 0,
      changeType: 'Addition' as const,
      source: 'Opening balance',
      reason: null,
      authorName: null,
      isOpening: true,
    }, ...changes];
  }, [entries, unitView]);
  const openingBalance = points[0]?.balance ?? 0;
  const currentBalance = points.at(-1)?.balance ?? 0;
  const netChange = currentBalance - openingBalance;

  return (
    <FlatModal
      visible={visible}
      onHide={onHide}
      title="Stock Trend"
      subtitle={vehicleName}
      size="xl"
      className="!bg-portal-canvas"
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_auto] md:items-end">
          <FlatAsyncSelect<Product>
            label="Product"
            required
            size="sm"
            placeholder="Search vehicle products..."
            value={productId}
            endpointUrl={`/products?vehicleId=${encodeURIComponent(vehicleId)}`}
            pageSize={20}
            optionValue="id"
            optionLabel="name"
            itemTemplate={(item) => (
              <div className="min-w-0">
                <span className="block truncate text-xs font-semibold text-white">{item.name}</span>
                <span className="block truncate text-[11px] text-portal-muted">{[item.packagingUnitName, item.basicUnitName].filter(Boolean).join(' / ')}</span>
              </div>
            )}
            onChange={(value, item) => {
              setProductId((value as string) || '');
              setProduct(item || null);
              setUnitView('basic');
              clearTrend();
            }}
          />
          <FlatDatePicker
            label="Date range"
            size="sm"
            selectionMode={'range' as any}
            readOnlyInput
            hideOnRangeSelection
            value={dateRange}
            onChange={(value) => {
              setDateRange(value || null);
              clearTrend();
            }}
            placeholder="All dates"
          />
          <FlatButton size="sm" variant="primary" leftIcon="pi pi-chart-line" label="View Trend" onClick={handleViewTrend} loading={loading} disabled={loading} />
        </div>

        <div className="min-h-[390px] rounded border border-portal-border/60 bg-portal-surface/55 p-4">
          {!hasLoaded ? (
            <div className="flex h-[350px] items-center justify-center text-xs text-portal-muted">Select a product to view its stock trend.</div>
          ) : points.length === 0 ? (
            <div className="flex h-[350px] items-center justify-center text-xs text-portal-muted">No stock history was found for this selection.</div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[11px] text-portal-muted">{entries.length} stock {entries.length === 1 ? 'change' : 'changes'}</p>
                {packagingUnitName && (
                  <div className="flex items-center rounded border border-portal-border bg-portal-surface p-0.5">
                    <button type="button" onClick={() => setUnitView('basic')} className={`h-7 rounded px-3 text-[11px] font-medium transition ${unitView === 'basic' ? 'bg-white/[0.10] text-white' : 'text-portal-muted hover:text-white'}`}>{basicUnitName}</button>
                    <button type="button" onClick={() => setUnitView('packaging')} className={`h-7 rounded px-3 text-[11px] font-medium transition ${unitView === 'packaging' ? 'bg-white/[0.10] text-white' : 'text-portal-muted hover:text-white'}`}>{packagingUnitName}</button>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-8 gap-y-2 border-y border-portal-border/40 py-2.5 text-[11px]">
                <p className="text-portal-muted">Opening · <span className="ml-1 font-mono text-portal-text">{openingBalance.toLocaleString()} {activeUnitName}</span></p>
                <p className="text-portal-muted">Current · <span className="ml-1 font-mono text-white">{currentBalance.toLocaleString()} {activeUnitName}</span></p>
                <p className="text-portal-muted">Net change · <span className={`ml-1 font-mono ${netChange >= 0 ? 'text-portal-accent' : 'text-red-400'}`}>{netChange > 0 ? '+' : ''}{netChange.toLocaleString()} {activeUnitName}</span></p>
                <div className="ml-auto flex items-center gap-4 text-portal-muted">
                  <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-portal-accent" />Addition</span>
                  <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-accent" />Reduction</span>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={310}>
                <AreaChart data={points} margin={{ top: 12, right: 18, left: 4, bottom: 4 }}>
                  <defs>
                    <linearGradient id="stock-balance-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-portal-heading)" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="var(--color-portal-heading)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--color-portal-border)" strokeOpacity={0.45} vertical={false} />
                  <XAxis dataKey="timestamp" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={formatAxisDate} tick={{ fill: 'var(--color-portal-muted)', fontSize: 10 }} axisLine={{ stroke: 'var(--color-portal-border)' }} tickLine={false} minTickGap={28} />
                  <YAxis tick={{ fill: 'var(--color-portal-muted)', fontSize: 10 }} axisLine={false} tickLine={false} width={48} allowDecimals={false} />
                  <ReferenceLine y={0} stroke="var(--color-portal-border)" />
                  <Tooltip content={<TrendTooltip unitName={activeUnitName} />} cursor={{ stroke: 'var(--color-portal-muted)', strokeDasharray: '3 3' }} />
                  <Area
                    type="stepAfter"
                    dataKey="balance"
                    stroke="var(--color-portal-heading)"
                    fill="url(#stock-balance-fill)"
                    strokeWidth={2.5}
                    activeDot={{ r: 5, fill: 'var(--color-portal-heading)', stroke: 'var(--color-portal-canvas)', strokeWidth: 2 }}
                    dot={(props: any) => {
                      const point = props.payload as TrendPoint;
                      return <circle key={point.id} cx={props.cx} cy={props.cy} r={point.isOpening ? 2.5 : 4} fill={point.isOpening ? 'var(--color-portal-heading)' : point.changeType === 'Addition' ? 'var(--color-portal-accent)' : 'var(--color-red-accent)'} stroke="var(--color-portal-canvas)" strokeWidth={1.5} />;
                    }}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </FlatModal>
  );
};

export default VehicleStockTrendOverlay;
