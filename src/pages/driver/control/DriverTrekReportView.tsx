import React, { useCallback, useEffect, useState } from 'react';
import type { StockItem } from '../../../api-client/vehicleStock';
import { FlatButton } from '../../../components/flat-form';
import { fmtGhs } from '../../../lib/utils';
import { fieldApi, type DriverTrekReport } from './api';
import { fieldStore } from './store';

interface Props {
  token: string;
  online: boolean;
  vehicleStock: StockItem[];
  onOpenDownloads: () => void;
}

const dateTime = (value: string) => new Date(value).toLocaleString('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const returnTone = (status: string) => status === 'Approved'
  ? 'text-portal-accent'
  : status === 'Rejected'
    ? 'text-red-accent'
    : 'text-portal-muted';

export const DriverTrekReportView: React.FC<Props> = ({ token, online, vehicleStock, onOpenDownloads }) => {
  const [report, setReport] = useState<DriverTrekReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState('');

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError('');
    const cached = await fieldStore.get<DriverTrekReport>(token, 'driverReport').catch(() => undefined);
    if (cached) {
      setReport(cached);
      setStale(true);
    }
    if (!navigator.onLine) {
      if (!cached) setError('Connect to load this report.');
      setLoading(false);
      return;
    }
    try {
      const current = await fieldApi.getDriverReport(token);
      setReport(current);
      setStale(false);
      await fieldStore.set(token, 'driverReport', current);
    } catch (loadError: any) {
      if (!cached) setError(loadError.response?.data?.message || 'Could not load the trek report.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void loadReport(); }, [loadReport]);

  if (loading && !report) {
    return <div className="flex min-h-72 items-center justify-center text-xs text-portal-muted"><i className="pi pi-spin pi-spinner mr-2" />Loading report...</div>;
  }

  if (!report) {
    return (
      <div className="rounded border border-portal-border/60 bg-portal-surface p-8 text-center">
        <p className="text-xs text-portal-muted">{error || 'Report unavailable.'}</p>
        {online && <FlatButton size="sm" variant="outline" className="mt-4" onClick={() => void loadReport()}>Try again</FlatButton>}
      </div>
    );
  }

  const summary = report.summary;
  const refunds = report.refunds ?? [];
  const vehicleStockByProduct = new Map(vehicleStock.map((item) => [item.productId, item]));
  const cashCollected = report.collectionsByMethod
    .filter((item) => item.method.toLowerCase() === 'cash')
    .reduce((total, item) => total + item.amount, 0);
  const approvedCashRefunds = (refunds.length
    ? refunds
    : report.stops.flatMap((stop) => stop.returns)
  ).filter((item) => item.approvalStatus === 'Approved' && item.refundMethod === 'Cash')
    .reduce((total, item) => total + Number(item.refundAmount ?? 0), 0);
  const physicalCash = cashCollected - approvedCashRefunds;
  const statItems = [
    { label: 'Gross sales', value: fmtGhs(summary.totalSalesValue) },
    { label: 'Payments received', value: fmtGhs(summary.totalCollected), tone: 'text-portal-accent' },
    { label: 'Unpaid balance', value: fmtGhs(summary.totalOutstanding) },
    { label: 'Physical cash', value: fmtGhs(physicalCash), tone: 'text-portal-accent' },
    { label: 'Stops visited', value: `${summary.stopsVisited} / ${summary.totalStops}` },
  ];
  const refundStats = [
    { label: 'Approved refunds', value: summary.totalApprovedRefunds ?? 0, count: summary.approvedRefundCount ?? 0, tone: 'text-portal-accent' },
    { label: 'Pending refunds', value: summary.totalPendingRefunds ?? 0, count: summary.pendingRefundCount ?? 0, tone: 'text-portal-text' },
    { label: 'Rejected refunds', value: summary.totalRejectedRefunds ?? 0, count: summary.rejectedRefundCount ?? 0, tone: 'text-red-accent' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-portal-border/60 pb-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-base font-semibold text-portal-text sm:text-lg">Trek Report</h1>
          <p className="text-[11px] text-portal-muted">
            Generated {dateTime(report.generatedAt)}
            {stale && <span className="ml-2 text-red-accent">May be outdated</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <FlatButton size="sm" variant="outline" leftIcon="pi pi-refresh" onClick={() => void loadReport()} loading={loading} disabled={!online || loading}>Refresh</FlatButton>
          <FlatButton size="sm" variant="primary" leftIcon="pi pi-download" onClick={onOpenDownloads}>Download</FlatButton>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {statItems.map((item) => (
          <div key={item.label} className="rounded border border-portal-border/60 bg-portal-surface p-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-portal-muted">{item.label}</p>
            <p className={`mt-1 text-sm font-semibold ${item.tone || 'text-portal-text'}`}>{item.value}</p>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-portal-muted">Physical cash is cash received less approved cash refunds.</p>

      <section className="overflow-hidden rounded border border-portal-border/60 bg-portal-surface">
        <div className="border-b border-portal-border/60 px-4 py-3"><h2 className="text-sm font-semibold text-portal-text">Refunds</h2></div>
        <div className="grid grid-cols-1 gap-px bg-portal-border/40 sm:grid-cols-3">
          {refundStats.map((item) => (
            <div key={item.label} className="bg-portal-surface px-4 py-3">
              <p className="text-[10px] uppercase tracking-wide text-portal-muted">{item.label}</p>
              <div className="mt-1 flex items-baseline justify-between gap-3">
                <p className={`text-xs font-semibold ${item.tone}`}>{fmtGhs(item.value)}</p>
                <span className="text-[11px] text-portal-muted">{item.count.toLocaleString()} {item.count === 1 ? 'return' : 'returns'}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded border border-portal-border/60 bg-portal-surface">
        <div className="border-b border-portal-border/60 px-4 py-3">
          <h2 className="text-sm font-semibold text-portal-text">Payments by method</h2>
        </div>
        {report.collectionsByMethod.length ? (
          <div className="grid grid-cols-2 gap-px bg-portal-border/40 sm:grid-cols-3 lg:grid-cols-4">
            {report.collectionsByMethod.map((item) => (
              <div key={item.method} className="bg-portal-surface px-4 py-3">
                <p className="text-[10px] uppercase tracking-wide text-portal-muted">{item.method}</p>
                <p className="mt-1 text-xs font-semibold text-portal-text">{fmtGhs(item.amount)}</p>
              </div>
            ))}
          </div>
        ) : <p className="px-4 py-6 text-center text-xs text-portal-muted">No collections recorded.</p>}
      </section>

      <section className="overflow-hidden rounded border border-portal-border/60 bg-portal-surface">
        <div className="border-b border-portal-border/60 px-4 py-3"><h2 className="text-sm font-semibold text-portal-text">Stops</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="bg-portal-canvas/50 text-[10px] uppercase tracking-wide text-portal-muted">
              <tr><th className="px-3 py-2">Stop</th><th className="px-3 py-2">Invoice</th><th className="px-3 py-2 text-right">Billable total</th><th className="px-3 py-2 text-right">Paid</th><th className="px-3 py-2 text-right">Balance</th><th className="px-3 py-2">Payment</th></tr>
            </thead>
            <tbody className="divide-y divide-portal-border/40">
              {report.stops.map((stop) => (
                <tr key={`${stop.sequence}-${stop.customerName}`}>
                  <td className="px-3 py-2.5"><span className="block text-xs font-semibold text-portal-text">{stop.sequence}. {stop.customerName}</span></td>
                  <td className="px-3 py-2.5 font-mono text-[11px] text-portal-muted">{stop.invoiceNumber || '—'}</td>
                  <td className="px-3 py-2.5 text-right text-xs text-portal-text">{fmtGhs(stop.amountDue)}</td>
                  <td className="px-3 py-2.5 text-right text-xs text-portal-accent">{fmtGhs(stop.amtPaid)}</td>
                  <td className="px-3 py-2.5 text-right text-xs text-portal-text">{fmtGhs(stop.balance)}</td>
                  <td className="px-3 py-2.5">
                    {(stop.paymentMethods ?? []).length ? (
                      <div className="flex flex-wrap gap-1">
                        {(stop.paymentMethods ?? []).map((method) => (
                          <span key={method} className="rounded bg-white/[0.08] px-2 py-1 text-[10px] font-medium text-portal-text">
                            {method}
                          </span>
                        ))}
                      </div>
                    ) : <span className="text-xs text-portal-muted">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!report.stops.length && <p className="px-4 py-6 text-center text-xs text-portal-muted">No stops recorded.</p>}
      </section>

      <section className="overflow-hidden rounded border border-portal-border/60 bg-portal-surface">
        <div className="border-b border-portal-border/60 px-4 py-3"><h2 className="text-sm font-semibold text-portal-text">Refund details</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead className="bg-portal-canvas/50 text-[10px] uppercase tracking-wide text-portal-muted">
              <tr><th className="px-3 py-2">Customer</th><th className="px-3 py-2">Ref. Invoice</th><th className="px-3 py-2">Product</th><th className="px-3 py-2 text-right">Refund</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Reason</th><th className="px-3 py-2">Recorded</th></tr>
            </thead>
            <tbody className="divide-y divide-portal-border/40">
              {refunds.map((item) => {
                const stockItem = vehicleStockByProduct.get(item.productId);
                return (
                  <tr key={item.returnId}>
                    <td className="px-3 py-2.5"><span className="block text-xs font-semibold text-portal-text">{item.customerName}</span><span className="text-[11px] text-portal-muted">Stop {item.sequence}</span></td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-portal-muted">{item.invoiceNumber || '—'}</td>
                    <td className="px-3 py-2.5"><span className="block text-xs font-semibold text-portal-text">{item.productName}</span><span className="text-[11px] text-portal-muted">{item.packagingQtyReturned != null && item.packagingQtyReturned > 0 ? `${item.packagingQtyReturned.toLocaleString()} ${stockItem?.packagingUnitName || 'packages'} · ` : ''}{item.basicQtyReturned.toLocaleString()} {stockItem?.basicUnitName || 'units'}</span></td>
                    <td className="px-3 py-2.5 text-right"><span className="block text-xs font-semibold text-portal-text">{item.refundAmount == null ? '—' : fmtGhs(item.refundAmount)}</span><span className="text-[11px] text-portal-muted">{item.refundMethod || '—'}</span></td>
                    <td className={`px-3 py-2.5 text-xs font-medium ${returnTone(item.approvalStatus)}`}>{item.approvalStatus}</td>
                    <td className="max-w-[220px] px-3 py-2.5"><span className="block truncate text-xs text-portal-text" title={item.reason || ''}>{item.reason || '—'}</span>{item.rejectionReason && <span className="mt-0.5 block truncate text-[11px] text-red-accent" title={item.rejectionReason}>{item.rejectionReason}</span>}</td>
                    <td className="px-3 py-2.5 text-[11px] text-portal-muted">{dateTime(item.recordedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!refunds.length && <p className="px-4 py-6 text-center text-xs text-portal-muted">No refunds recorded.</p>}
      </section>

      <section className="overflow-hidden rounded border border-portal-border/60 bg-portal-surface">
        <div className="border-b border-portal-border/60 px-4 py-3"><h2 className="text-sm font-semibold text-portal-text">Vehicle stock</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left">
            <thead className="bg-portal-canvas/50 text-[10px] uppercase tracking-wide text-portal-muted">
              <tr><th className="px-3 py-2">Product</th><th className="px-3 py-2">Quantity</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Last updated</th></tr>
            </thead>
            <tbody className="divide-y divide-portal-border/40">
              {vehicleStock.map((item) => {
                const outOfStock = item.basicQuantityOnHand === 0 && item.packagingQuantityOnHand === 0;
                const status = outOfStock ? 'Out of stock' : item.isLowStock ? 'Low stock' : 'In stock';
                const tone = outOfStock || item.isLowStock ? 'text-red-accent' : 'text-portal-accent';
                return (
                <tr key={item.productId}>
                  <td className="px-3 py-2.5 text-xs font-semibold text-portal-text">{item.productName}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-portal-text">
                    {item.packagingUnitName ? `${item.packagingQuantityOnHand.toLocaleString()} ${item.packagingUnitName} · ` : ''}{item.basicQuantityOnHand.toLocaleString()} {item.basicUnitName}
                  </td>
                  <td className={`px-3 py-2.5 text-xs font-medium ${tone}`}>{status}</td>
                  <td className="px-3 py-2.5 text-[11px] text-portal-muted">{item.updatedAt ? dateTime(item.updatedAt) : '—'}</td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!vehicleStock.length && <p className="px-4 py-6 text-center text-xs text-portal-muted">No products are currently stocked on this vehicle.</p>}
      </section>

      {report.stockSummary.length > 0 && (
        <section className="overflow-hidden rounded border border-portal-border/60 bg-portal-surface">
          <div className="border-b border-portal-border/60 px-4 py-3"><h2 className="text-sm font-semibold text-portal-text">Stock reconciliation</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left">
              <thead className="bg-portal-canvas/50 text-[10px] uppercase tracking-wide text-portal-muted">
                <tr><th className="px-3 py-2">Product</th><th className="px-3 py-2 text-right">Loaded</th><th className="px-3 py-2 text-right">Delivered</th><th className="px-3 py-2 text-right">Approved returns</th><th className="px-3 py-2 text-right">Remaining</th></tr>
              </thead>
              <tbody className="divide-y divide-portal-border/40">
                {report.stockSummary.map((item) => (
                  <tr key={item.productId}>
                    <td className="px-3 py-2.5 text-xs font-semibold text-portal-text">{item.productName}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs text-portal-text">{item.basicQtyLoaded.toLocaleString()} {vehicleStockByProduct.get(item.productId)?.basicUnitName || ''}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs text-portal-text">{item.basicQtyDelivered.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs text-portal-text">{item.basicQtyApprovedReturns.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs text-portal-accent">{item.basicQtyRemaining.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};

export default DriverTrekReportView;
