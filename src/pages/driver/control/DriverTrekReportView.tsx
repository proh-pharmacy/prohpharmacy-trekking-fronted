import React, { useCallback, useEffect, useState } from 'react';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';
import { FlatButton } from '../../../components/flat-form';
import { fmtGhs } from '../../../lib/utils';
import { fieldApi, type DriverTrekReport } from './api';
import { fieldStore } from './store';

interface Props {
  token: string;
  online: boolean;
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

export const DriverTrekReportView: React.FC<Props> = ({ token, online }) => {
  const [report, setReport] = useState<DriverTrekReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
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

  const downloadPdf = async () => {
    if (!online) {
      toast.error('Connect to download the report.');
      return;
    }
    setDownloading(true);
    try {
      const { blob, filename } = await fieldApi.downloadDriverReport(token);
      saveAs(blob, filename);
      toast.success('Report downloaded.');
    } catch (downloadError: any) {
      toast.error(downloadError.response?.data?.message || 'Could not download the report.');
    } finally {
      setDownloading(false);
    }
  };

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
  const statItems = [
    { label: 'Sales value', value: fmtGhs(summary.totalSalesValue) },
    { label: 'Collected', value: fmtGhs(summary.totalCollected), tone: 'text-portal-accent' },
    { label: 'Outstanding', value: fmtGhs(summary.totalOutstanding) },
    { label: 'Approved refunds', value: fmtGhs(summary.totalApprovedRefunds) },
    { label: 'Net cash position', value: fmtGhs(summary.netCashOnHand), tone: 'text-portal-accent' },
    { label: 'Stops visited', value: `${summary.stopsVisited} / ${summary.totalStops}` },
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
          <FlatButton size="sm" variant="primary" leftIcon="pi pi-file-pdf" onClick={() => void downloadPdf()} loading={downloading} disabled={!online || downloading}>Download PDF</FlatButton>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {statItems.map((item) => (
          <div key={item.label} className="rounded border border-portal-border/60 bg-portal-surface p-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-portal-muted">{item.label}</p>
            <p className={`mt-1 text-sm font-semibold ${item.tone || 'text-portal-text'}`}>{item.value}</p>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-portal-muted">Net cash position includes cash and Mobile Money collections, less approved cash refunds.</p>

      <section className="rounded border border-portal-border/60 bg-portal-surface">
        <div className="border-b border-portal-border/60 px-4 py-3">
          <h2 className="text-sm font-semibold text-portal-text">Collections</h2>
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
                  <td className="px-3 py-2.5"><span className="block text-xs font-semibold text-portal-text">{stop.sequence}. {stop.customerName}</span>{stop.returns.map((item, index) => <span key={`${item.productName}-${index}`} className={`mt-1 block text-[11px] ${returnTone(item.approvalStatus)}`}>{item.productName} · {item.basicQtyReturned} returned · {item.approvalStatus}</span>)}</td>
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
                  <td className="px-3 py-2.5 text-right font-mono text-xs text-portal-text">{item.basicQtyLoaded.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs text-portal-text">{item.basicQtyDelivered.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs text-portal-text">{item.basicQtyApprovedReturns.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs text-portal-accent">{item.basicQtyRemaining.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!report.stockSummary.length && <p className="px-4 py-6 text-center text-xs text-portal-muted">No allocated stock to reconcile.</p>}
      </section>
    </div>
  );
};

export default DriverTrekReportView;
