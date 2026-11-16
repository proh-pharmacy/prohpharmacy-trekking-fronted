import { memo, useMemo } from 'react';
import { FlatDataTable } from '../../../components/data-table';
import { projectStock, stockLevel, type StockEstimate, type StockUsage, type TrekStockEstimate } from './stockEstimate';

const dateFormat = new Intl.DateTimeFormat('en-GB', { dateStyle: 'short', timeStyle: 'short' });
const format = new Intl.NumberFormat('en-GH', { maximumFractionDigits: 2 });
function stockQuantity(item: StockEstimate, basic: number | null, packaging: number | null) {
  if (basic === null) return 'Unavailable';
  return `${format.format(basic)} ${item.basicUnitName}${item.packagingUnitName ? ` · ${format.format(packaging ?? 0)} ${item.packagingUnitName}` : ''}`;
}

export const StockLevel = memo(function StockLevel({ item }: { item?: StockEstimate }) {
  const status = stockLevel(item);
  return <div className="min-w-32"><span className={`block text-xs font-semibold tabular-nums ${status.tone}`}>{item ? stockQuantity(item, item.basicRemaining, item.packagingRemaining) : 'Unavailable'}</span><span className="block text-[11px] text-portal-muted">{status.label} · estimate</span></div>;
});

/** Only the selected product's arithmetic runs as the driver types. */
export const StockPreview = memo(function StockPreview({ item, basic, packaging, replacing }: {
  item?: StockEstimate; basic: number; packaging: number; replacing?: StockUsage;
}) {
  if (!item || item.basicRemaining === null) return <p className="col-span-full text-[11px] text-portal-muted">Vehicle stock unavailable for this product. Availability cannot be estimated.</p>;
  const { availableBasic, availablePackaging, afterBasic, afterPackaging, exceeds } = projectStock(item, basic, packaging, replacing)!;
  return <div className="col-span-full space-y-2 rounded bg-portal-canvas/50 p-3" style={{ contain: 'layout style paint' }}>
    <div className="flex flex-wrap justify-between gap-2"><span className="text-[11px] text-portal-muted">Estimated available{replacing ? ' for this delivery' : ''}</span><span className="text-xs font-semibold tabular-nums text-portal-text">{stockQuantity(item, availableBasic, availablePackaging)}</span></div>
    <div className="flex flex-wrap justify-between gap-2"><span className="text-[11px] text-portal-muted">After this sale</span><span className={`text-xs font-semibold tabular-nums ${exceeds ? 'text-red-accent' : 'text-portal-accent'}`}>{stockQuantity(item, afterBasic, afterPackaging)}</span></div>
    <p className={`min-h-8 text-[11px] ${exceeds || item.needsReview ? 'text-portal-orange' : 'text-portal-muted'}`}>{exceeds ? 'Quantity exceeds estimated stock. Check the vehicle before saving.' : item.needsReview ? 'Some saved deliveries need review. Check the Sync Centre.' : 'Stock estimate includes saved sales.'}</p>
  </div>;
});

const stockColumns = [
  { field: 'productName', header: 'Product', body: (item: StockEstimate) => <span className="text-xs font-semibold text-portal-text">{item.productName}</span> },
  { field: 'basicOnHand', header: 'Vehicle balance', body: (item: StockEstimate) => <span className="text-xs tabular-nums text-portal-text">{stockQuantity(item, item.basicOnHand, item.packagingOnHand)}</span> },
  { field: 'basicUsed', header: 'Trek deduction', body: (item: StockEstimate) => <span className="text-xs tabular-nums text-portal-text">{stockQuantity(item, item.basicUsed, item.packagingUsed)}</span> },
  { field: 'basicRemaining', header: 'Estimated remaining', body: (item: StockEstimate) => <StockLevel item={item} /> },
  { field: 'updatedAt', header: 'Balance updated', body: (item: StockEstimate) => <span className="text-[11px] text-portal-muted">{item.updatedAt ? dateFormat.format(new Date(item.updatedAt)) : '—'}</span> },
];
export const TrekStockTable = memo(function TrekStockTable({ estimate, online, active }: { estimate: TrekStockEstimate; online: boolean; active: boolean }) {
  const rows = useMemo(() => Array.from(estimate.byProduct.values()), [estimate]);
  return <section className="rounded border border-portal-border/60 bg-portal-surface">
    <div className="space-y-1 px-4 py-3"><h2 className="text-sm font-semibold text-portal-text">Vehicle stock levels</h2><p className="text-[11px] text-portal-muted">{online ? 'Latest downloaded balance' : 'Offline · last downloaded balance'}{active ? ' less recorded deliveries and queued sales on this trek.' : ' · this trek is closed; no additional deductions applied.'} Other active treks are not included. Returns count only after approval and refresh.</p></div>
    <FlatDataTable dataKey="productId" data={rows} columns={stockColumns} enablePaginator initialPageSize={10} enableTableFilter filterablePlaceholder="Search vehicle products..." emptyDataText="Vehicle stock data is unavailable. Connect and refresh to download it." />
  </section>;
});
