import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import toast from 'react-hot-toast';
import { invoicesApi, type CollectionMethod, type InvoicePaymentRequest, type PaymentReceipt, type SaleInvoice, type StopInvoiceSummary } from '../../api-client/invoices';
import { FlatButton, FlatDropdown, FlatInputText } from '../flat-form';
import { FlatModal } from '../overlay';
import { resetTableData } from '../data-table';
import { fmtGhs } from '../../lib/utils';
import type { QueuedAction } from '../../pages/driver/control/api';
import { collectionMethods, invoiceStatusLabel, paymentError } from './paymentRules';
import { ThermalInvoiceReceipt } from './ThermalInvoiceReceipt';
import { ThermalPaymentReceipt } from './ThermalPaymentReceipt';
import { useThermalInvoicePrint } from './useThermalInvoicePrint';

type Props = {
  summary: StopInvoiceSummary;
  token?: string;
  customerName?: string;
  stopId?: string;
  stopClientId?: string;
  queue?: QueuedAction[];
  offlineInvoice?: SaleInvoice;
  goodsPending?: boolean;
  disabled?: boolean;
  enqueue?: (type: 'RecordInvoicePayment', payload: Record<string, unknown>) => Promise<string>;
  onChanged?: () => void | Promise<unknown>;
  showSummary?: boolean;
};
const message = (error: unknown) => {
  const e = error as { response?: { data?: { message?: string; detail?: string } }; message?: string };
  return e.response?.data?.message || e.response?.data?.detail || e.message || 'Request failed. Please retry.';
};

export function InvoicePayments({ summary, token, customerName, stopId, stopClientId, queue = [], offlineInvoice, goodsPending, disabled, enqueue, onChanged, showSummary = true }: Props) {
  const [open, setOpen] = useState(false);
  const [invoice, setInvoice] = useState<SaleInvoice | null>(null);
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [method, setMethod] = useState<CollectionMethod>('Cash');
  const [reference, setReference] = useState('');
  const [pending, setPending] = useState<InvoicePaymentRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [rejected, setRejected] = useState(false);
  const [invoiceQrCode, setInvoiceQrCode] = useState('');
  const [receiptQrCode, setReceiptQrCode] = useState('');
  const [online, setOnline] = useState(navigator.onLine);
  const busyRef = useRef(false);
  const { receiptRef, printInvoice } = useThermalInvoicePrint();
  const key = `invoice-payment:${token || 'staff'}:${summary.invoiceId || stopClientId || stopId}`;
  const cacheKey = `invoice-detail:${token || 'staff'}:${summary.invoiceId}`;
  const paymentActions = queue.filter(action => action.type === 'RecordInvoicePayment' && !action.paymentConflictResolved && (
    (summary.invoiceId && (action.payload.invoiceId === summary.invoiceId || action.invoiceId === summary.invoiceId))
    || (stopId && action.payload.stopId === stopId) || (stopClientId && action.payload.stopClientId === stopClientId)
    || (stopId && queue.some(parent => parent.type === 'AddWalkInStop' && parent.clientId === action.payload.stopClientId && parent.serverId === stopId))));
  const outstandingActions = paymentActions.filter(action => action.status !== 'synced');
  const reserved = outstandingActions.reduce((sum, action) => sum + Number(action.payload.amount || 0), 0);
  const balance = Math.max(0, Number(invoice?.balance ?? summary.invoiceBalance ?? 0) - reserved);
  const paymentRevision = paymentActions.map(action => `${action.clientId}:${action.status}`).join('|');

  useEffect(() => {
    if (!open || !navigator.onLine || !summary.invoiceId) return;
    let active = true;
    const request = token ? invoicesApi.getDriverInvoice(token, summary.invoiceId) : invoicesApi.getInvoice(summary.invoiceNumber!);
    void request.then(data => { if (active) setInvoice(data); }).catch(() => {});
    return () => { active = false; };
  }, [open, summary.invoiceId, summary.invoiceNumber, summary.invoicePaid, summary.invoiceBalance, summary.invoiceTotal, token, paymentRevision]);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);

  useEffect(() => {
    if (!open || !token || !summary.invoiceId) return;
    let active = true;
    const url = `${window.location.origin}/invoice/preview?token=${encodeURIComponent(token)}&invoiceId=${encodeURIComponent(summary.invoiceId)}`;
    void QRCode.toDataURL(url, { margin: 1, width: 144 }).then(code => { if (active) setInvoiceQrCode(code); }).catch(() => {});
    return () => { active = false; };
  }, [open, token, summary.invoiceId]);

  useEffect(() => {
    setReceiptQrCode('');
    if (!open || !token || !receipt?.paymentId || receipt.isLegacy || !receipt.receiptNumber) return;
    let active = true;
    const url = `${window.location.origin}/receipt/preview?token=${encodeURIComponent(token)}&paymentId=${encodeURIComponent(receipt.paymentId)}`;
    void QRCode.toDataURL(url, { margin: 1, width: 144 }).then(code => { if (active) setReceiptQrCode(code); }).catch(() => {});
    return () => { active = false; };
  }, [open, receipt?.isLegacy, receipt?.paymentId, receipt?.receiptNumber, token]);

  const load = async () => {
    if (!navigator.onLine) {
      const cached = localStorage.getItem(cacheKey);
      const saved = cached ? JSON.parse(cached) as SaleInvoice : null;
      // The trek snapshot may be newer than the detail cache.
      const paid = Math.max(offlineInvoice?.totalPaid ?? 0, saved?.totalPaid ?? 0);
      const source = offlineInvoice ? { ...offlineInvoice, totalPaid: paid, balance: Math.max(0, offlineInvoice.totalAmount - paid), payments: saved?.payments ?? [] } : saved;
      if (source) setInvoice(source);
      else throw new Error('Connect once to load this invoice before collecting payment.');
      return source;
    }
    if (!summary.invoiceId) {
      if (offlineInvoice) { setInvoice(offlineInvoice); return offlineInvoice; }
      throw new Error('Sync the customer stop to retrieve its invoice.');
    }
    const data = token
      ? await invoicesApi.getDriverInvoice(token, summary.invoiceId)
      : await invoicesApi.getInvoice(summary.invoiceNumber!);
    setInvoice(data);
    // Failure to cache a read must not conceal the invoice.
    try { localStorage.setItem(cacheKey, JSON.stringify(data)); } catch { /* read remains usable online */ }
    return data;
  };

  const show = async () => {
    setOpen(true); setReceipt(null); setError(''); setBusy(true);
    try {
      const raw = localStorage.getItem(key);
      const saved = raw ? JSON.parse(raw) as InvoicePaymentRequest : null;
      setRejected(!!localStorage.getItem(`${key}:rejected`));
      setPending(saved); setAmount(saved?.amount ?? null); setMethod(saved?.paymentMethod ?? 'Cash'); setReference(saved?.reference ?? '');
      await load();
    } catch (e) { setInvoice(null); setError(message(e)); }
    finally { setBusy(false); }
  };

  const collect = async () => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError('');
    const run = async () => {
      // Re-read under the browser lock: another tab may have an uncertain payment.
      const stored = localStorage.getItem(key);
      let request = stored ? JSON.parse(stored) as InvoicePaymentRequest : pending;
      if (request && !pending) {
        setPending(request); setAmount(request.amount); setMethod(request.paymentMethod); setReference(request.reference ?? '');
        throw new Error('A saved payment needs confirmation. Use Retry saved payment with its original details.');
      }
      if (!request) {
        if (goodsPending && navigator.onLine) throw new Error('Sync the saved goods changes before collecting payment.');
        if (outstandingActions.length) throw new Error('Resolve the queued payment in the Sync Centre before collecting another payment.');
        const latest = await load();
        if (!latest || latest.status === 'Voided') throw new Error('This invoice cannot receive payments.');
        const validation = paymentError(Number(amount), latest.balance - reserved, method);
        if (validation) throw new Error(validation);
        if (reference.length > 200) throw new Error('Reference must be 200 characters or fewer.');
        if (enqueue && (!navigator.onLine || !summary.invoiceId)) {
          await enqueue('RecordInvoicePayment', {
            ...(summary.invoiceId ? { invoiceId: summary.invoiceId } : stopClientId ? { stopClientId } : { stopId }),
            amount: Number(amount), paymentMethod: method, reference: reference.trim() || null,
          });
          setAmount(null); toast.success('Payment saved on this device. Its receipt will be available after sync.');
          return;
        }
        request = { clientGeneratedId: crypto.randomUUID(), amount: Number(amount), paymentMethod: method, reference: reference.trim() || null, recordedAt: new Date().toISOString() };
        // Must succeed before the first network attempt. Never change this payload on retry.
        localStorage.setItem(key, JSON.stringify(request));
        localStorage.removeItem(`${key}:rejected`); setRejected(false);
        setPending(request);
      }
      if (!navigator.onLine) throw new Error('Reconnect to retry the saved payment with its original details.');
      const result = await invoicesApi.recordPayment(summary.invoiceId!, request, token);
      resetTableData();
      setReceipt(result);
      if (invoice) {
        const updated = { ...invoice, totalAmount: result.invoiceTotalAtPayment,
          totalPaid: result.invoiceTotalAtPayment - result.balanceAfterPayment, balance: result.balanceAfterPayment,
          status: result.balanceAfterPayment > 0 ? 'PartiallyPaid' as const : 'Paid' as const,
          payments: [...(invoice.payments ?? []).filter(p => p.paymentId !== result.paymentId), result] };
        setInvoice(updated);
        try { localStorage.setItem(cacheKey, JSON.stringify(updated)); } catch { /* receipt remains visible */ }
      }
      localStorage.removeItem(key);
      localStorage.removeItem(`${key}:rejected`); setRejected(false);
      setPending(null); setAmount(null); setReference('');
      toast.success('Payment recorded.');
      // A refresh failure is separate from the successfully recorded collection.
      try { await load(); await onChanged?.(); } catch { setError('Payment recorded. Refresh invoice details to see the latest balance.'); }
    };
    try {
      if (navigator.locks) await navigator.locks.request(key, run); else await run();
    } catch (e) {
      setError(message(e));
      const response = (e as { response?: { status?: number; data?: { code?: string } } }).response;
      if (response?.status === 422 && String(response.data?.code) !== '409') {
        // A definite validation rejection can be corrected; uncertain outcomes cannot.
        try { localStorage.setItem(`${key}:rejected`, message(e)); setRejected(true); } catch { /* keep original retry request */ }
      }
      if ((e as { response?: { status?: number } }).response?.status === 409) await load().catch(() => {});
    } finally { busyRef.current = false; setBusy(false); }
  };

  const viewReceipt = async (paymentId: string) => {
    setBusy(true); setError('');
    try { setReceipt(await invoicesApi.getReceipt(paymentId, token)); }
    catch (e) { setError(message(e)); }
    finally { setBusy(false); }
  };

  return <>
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2 text-[11px] text-portal-muted">
      {showSummary && <>
        <span className="font-mono text-portal-accent">{summary.invoiceNumber || 'Invoice awaiting sync'}</span>
        <span>{invoiceStatusLabel(summary.invoiceStatus)}</span>
        <span>Total {fmtGhs(summary.invoiceTotal)}</span><span>Paid {fmtGhs(summary.invoicePaid)}</span><span>Balance {fmtGhs(summary.invoiceBalance)}</span>
      </>}
      <FlatButton size="sm" variant="outline" onClick={() => void show()}>View invoice / payments</FlatButton>
    </div>
    <FlatModal
      visible={open}
      onHide={() => { if (!busy) setOpen(false); }}
      title={receipt ? 'Payment receipt' : invoice?.invoiceNumber || 'Invoice and payments'}
      subtitle={!receipt && invoice ? `${invoice.customerName} · ${invoiceStatusLabel(invoice.status)}` : undefined}
      size="lg"
    >
      <div className="space-y-4 text-xs text-portal-text">
        {busy && <p role="status" className="text-portal-muted">Loading…</p>}
        {error && (
          <div role="alert" className="rounded border border-red-accent/40 bg-red-accent/10 px-3 py-2 text-xs text-red-accent">
            {error}
          </div>
        )}
        {receipt ? (
          <div className="space-y-4">
            <div className="rounded border border-portal-border bg-portal-canvas p-4 !shadow-none">
              <ThermalPaymentReceipt ref={receiptRef} receipt={receipt} customerName={customerName || invoice?.customerName} qrCode={receiptQrCode} qrCaption={receiptQrCode ? 'Scan to view this receipt.' : undefined} />
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-portal-border pt-3">
              <FlatButton size="sm" variant="outline" leftIcon="pi pi-arrow-left" onClick={() => setReceipt(null)}>Back to invoice</FlatButton>
              {!receipt.isLegacy && receipt.receiptNumber && (
                <FlatButton size="sm" leftIcon="pi pi-print" onClick={printInvoice}>Print / Save PDF</FlatButton>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Top KPI Summary Strip */}
            {invoice && (
              <div className="grid grid-cols-3 divide-x divide-portal-border rounded border border-portal-border bg-portal-canvas overflow-hidden !shadow-none">
                <div className="px-4 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-portal-muted mb-0.5">Invoice Total</p>
                  <p className="font-mono text-sm font-bold text-portal-heading tabular-nums">{fmtGhs(invoice.totalAmount)}</p>
                </div>
                <div className="px-4 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-portal-muted mb-0.5">Total Paid</p>
                  <p className="font-mono text-sm font-bold text-portal-accent tabular-nums">{fmtGhs(invoice.totalPaid)}</p>
                </div>
                <div className="px-4 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-portal-muted mb-0.5">Balance Due</p>
                  <p className={`font-mono text-sm font-bold tabular-nums ${balance > 0 ? 'text-portal-orange' : 'text-portal-heading'}`}>{fmtGhs(balance)}</p>
                </div>
              </div>
            )}

            {/* Collect Payment & Payment History */}
            <div className="space-y-4">
              {(pending || (invoice && invoice.status !== 'Voided' && balance > 0 && !disabled)) && (
                <div className="rounded border border-portal-border bg-portal-canvas p-4 space-y-3 !shadow-none">
                  <div className="border-b border-portal-border/60 pb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-portal-heading">Collect Payment</h3>
                  </div>
                  {!online && (
                    <p className="text-[11px] text-portal-orange">
                      Offline: balance is based on saved data. The server will validate it during sync; a receipt is issued only after acceptance.
                    </p>
                  )}
                  {pending && (
                    <p className="text-[11px] text-portal-orange">
                      A payment is saved for retry. Its amount, method and reference are locked until its outcome is confirmed. Retrying uses the original payment ID.
                    </p>
                  )}
                  {pending && rejected && (
                    <div>
                      <FlatButton
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => {
                          try {
                            localStorage.setItem(`${key}:rejected:${pending.clientGeneratedId}`, JSON.stringify(pending));
                            localStorage.removeItem(key);
                            localStorage.removeItem(`${key}:rejected`);
                            setPending(null);
                            setRejected(false);
                            setError('The server rejected that request. Correct the details before submitting a new payment.');
                          } catch (e) {
                            setError(message(e));
                          }
                        }}
                      >
                        Correct rejected payment
                      </FlatButton>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FlatInputText
                      label="Amount collected (GHS)"
                      size="sm"
                      type="number"
                      inputMode="decimal"
                      min="0.01"
                      step="0.01"
                      max={pending ? undefined : balance}
                      value={amount == null ? '' : String(amount)}
                      onChange={event => setAmount(event.target.value === '' ? null : Number(event.target.value))}
                      disabled={busy || !!pending}
                      className="!bg-portal-surface focus:!bg-portal-surface"
                    />
                    <FlatDropdown
                      label="Payment method"
                      size="sm"
                      background="surface"
                      value={method}
                      options={collectionMethods.map(value => ({ label: value, value }))}
                      onChange={value => setMethod(value)}
                      disabled={busy || !!pending}
                    />
                  </div>
                  <FlatInputText
                    label="Reference (optional)"
                    size="sm"
                    maxLength={200}
                    value={reference}
                    onChange={event => setReference(event.target.value)}
                    disabled={busy || !!pending}
                    className="!bg-portal-surface focus:!bg-portal-surface"
                  />
                  {goodsPending && online && (
                    <p className="text-[11px] text-portal-orange">Sync saved goods changes before collecting payment.</p>
                  )}
                  <div className="flex justify-end pt-1">
                    <FlatButton
                      size="sm"
                      loading={busy}
                      disabled={busy || (!pending && (!invoice || outstandingActions.length > 0 || (!!goodsPending && online)))}
                      onClick={() => void collect()}
                    >
                      {pending ? 'Retry saved payment' : online ? 'Record payment' : 'Save payment offline'}
                    </FlatButton>
                  </div>
                </div>
              )}

              {/* Payment History Card */}
              <div className="rounded border border-portal-border bg-portal-canvas p-4 space-y-3 !shadow-none">
                <div className="flex items-center justify-between border-b border-portal-border/60 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-portal-heading">Payment History</h3>
                  <span className="font-mono text-[11px] text-portal-muted">
                    {(invoice?.payments ?? []).length + paymentActions.length} recorded
                  </span>
                </div>
                {!(invoice?.payments ?? []).length && !paymentActions.length && (
                  <p className="text-portal-muted py-2">No payments recorded.</p>
                )}
                <div className="divide-y divide-portal-border/40">
                  {(invoice?.payments ?? []).map(payment => (
                    <div key={payment.paymentId} className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
                      <div className="space-y-0.5">
                        <p className="font-mono text-xs font-semibold text-portal-heading">
                          {fmtGhs(payment.amount)} <span className="font-sans font-normal text-portal-muted">· {payment.paymentMethod}</span>
                        </p>
                        <p className="text-[11px] text-portal-muted">
                          {new Date(payment.recordedAt).toLocaleString('en-GB')}
                        </p>
                      </div>
                      {payment.isLegacy || !payment.receiptNumber ? (
                        <span className="text-[11px] text-portal-muted">Imported history</span>
                      ) : (
                        <FlatButton size="sm" variant="outline" leftIcon="pi pi-receipt" className="!text-red-accent hover:!text-red-accent" title={`View receipt ${payment.receiptNumber}`} aria-label={`View receipt ${payment.receiptNumber}`} onClick={() => void viewReceipt(payment.paymentId)}>
                          View Receipt
                        </FlatButton>
                      )}
                    </div>
                  ))}
                  {paymentActions.map(action => (
                    <div key={action.clientId} className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0 last:pb-0 text-portal-muted">
                      <div className="space-y-0.5">
                        <p className="font-mono text-xs font-semibold text-portal-text">
                          {fmtGhs(Number(action.payload.amount))}
                        </p>
                        <p className="text-[11px]">
                          {action.status === 'synced' ? 'Payment synced' : action.status === 'conflict' ? 'Payment needs review in Sync Centre' : 'Payment awaiting sync'}
                        </p>
                        {action.reason && <p className="text-[11px] text-portal-orange">{action.reason}</p>}
                      </div>
                      {action.status === 'synced' && action.serverId && (
                        <FlatButton size="sm" variant="outline" leftIcon="pi pi-receipt" className="!text-red-accent hover:!text-red-accent" title={action.receiptNumber ? `View receipt ${action.receiptNumber}` : 'View receipt'} aria-label={action.receiptNumber ? `View receipt ${action.receiptNumber}` : 'View receipt'} onClick={() => void viewReceipt(action.serverId!)}>
                          View Receipt
                        </FlatButton>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Actions Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-portal-border pt-3">
              <FlatButton
                size="sm"
                variant="outline"
                leftIcon="pi pi-refresh"
                disabled={busy}
                onClick={() => { setBusy(true); void load().catch(e => setError(message(e))).finally(() => setBusy(false)); }}
              >
                Refresh invoice
              </FlatButton>
              {invoice && (
                <FlatButton size="sm" variant="outline" leftIcon="pi pi-print" disabled={!invoice.invoiceNumber} onClick={printInvoice}>
                  Print invoice
                </FlatButton>
              )}
            </div>

            {/* Hidden printable invoice receipt for Print invoice button */}
            {invoice && (
              <div hidden>
                <ThermalInvoiceReceipt
                  ref={receiptRef}
                  invoiceNumber={invoice.invoiceNumber}
                  customerName={invoice.customerName}
                  trekNumber={invoice.trekNumber}
                  trekDate={invoice.trekDate}
                  issuedAt={invoice.issuedAt}
                  lines={invoice.lineItems.map((line, index) => ({
                    key: line.stopProductId || String(index),
                    productName: line.productName,
                    quantity: `${line.basicQuantity} ${line.basicUnitName}${line.packagingUnitName ? ` · ${line.packagingQuantity ?? 0} ${line.packagingUnitName}` : ''}`,
                    lineTotal: line.lineTotal,
                  }))}
                  totalAmount={invoice.totalAmount}
                  totalPaid={invoice.totalPaid}
                  balance={invoice.balance}
                  qrCode={invoiceQrCode}
                  qrCaption={invoiceQrCode ? 'Scan to view this invoice.' : undefined}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </FlatModal>
  </>;
}
