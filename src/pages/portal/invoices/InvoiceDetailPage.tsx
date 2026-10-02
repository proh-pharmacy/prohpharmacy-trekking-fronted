import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { invoicesApi, type SaleInvoice } from '../../../api-client';
import { FlatButton } from '../../../components/flat-form';
import { fmtGhs } from '../../../lib/utils';

const STATUS_STYLES: Record<string, string> = {
  Issued: 'text-portal-muted',
  PartiallyPaid: 'text-portal-orange',
  Paid: 'text-portal-accent',
  Voided: 'text-red-accent',
};

const formatDateTime = (value: string) => new Date(value).toLocaleString('en-GB', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

const quantityText = (item: SaleInvoice['lineItems'][number]) => [
  Number(item.packagingQtyDelivered ?? 0) > 0 && item.packagingUnitName ? `${item.packagingQtyDelivered} ${item.packagingUnitName}` : '',
  Number(item.basicQtyDelivered ?? 0) > 0 ? `${item.basicQtyDelivered} ${item.basicUnitName}` : '',
].filter(Boolean).join(' · ') || '—';

export const InvoiceDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { invoiceNumber = '' } = useParams<{ invoiceNumber: string }>();
  const [invoice, setInvoice] = useState<SaleInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    invoicesApi.getInvoice(invoiceNumber)
      .then((data) => { if (active) { setInvoice(data); setError(''); } })
      .catch(() => { if (active) setError('Invoice could not be loaded.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [invoiceNumber]);

  const openPrintPreview = () => {
    const preview = window.open(`/invoice/print/${encodeURIComponent(invoiceNumber)}`, '_blank', 'width=920,height=760');
    if (!preview) toast.error('Allow pop-ups to open the invoice.');
  };

  if (loading) {
    return <div className="flex min-h-[320px] items-center justify-center text-xs text-portal-muted"><i className="pi pi-spin pi-spinner mr-2" />Loading invoice...</div>;
  }

  if (!invoice) {
    return (
      <div className="space-y-4">
        <button type="button" onClick={() => navigate('/portal/invoices')} className="text-portal-muted transition hover:text-portal-heading" aria-label="Back to invoices"><i className="pi pi-arrow-left" /></button>
        <div className="border border-red-accent/30 bg-red-accent/10 p-5 text-xs text-red-accent">{error || 'Invoice not found.'}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={() => navigate('/portal/invoices')} className="text-portal-muted transition hover:text-portal-heading" aria-label="Back to invoices"><i className="pi pi-arrow-left" /></button>
        <FlatButton size="sm" variant="outline" leftIcon="pi pi-print" onClick={openPrintPreview}>Print invoice</FlatButton>
      </div>

      <article className="overflow-hidden border border-portal-border/60 bg-portal-surface">
        <header className="flex flex-col gap-3 border-b border-portal-border/60 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-portal-muted">Sales invoice</p>
            <h1 className="mt-1 font-mono text-lg font-bold text-portal-heading">{invoice.invoiceNumber || 'Invoice'}</h1>
            <p className="mt-1 text-[11px] text-portal-muted">{formatDateTime(invoice.issuedAt)}</p>
          </div>
          <span className={`text-xs font-semibold ${STATUS_STYLES[invoice.status] ?? 'text-portal-muted'}`}>{invoice.status === 'PartiallyPaid' ? 'Partially paid' : invoice.status}</span>
        </header>

        <section className="grid gap-6 border-b border-portal-border/60 p-4 sm:grid-cols-2 sm:p-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-portal-muted">Customer</p>
            <button type="button" onClick={() => navigate(`/portal/customers/${invoice.customerAccountId}`)} className="mt-1 text-left text-xs font-semibold text-portal-text transition hover:text-portal-accent">{invoice.customerName}</button>
            {invoice.customerTradingName && <p className="mt-1 text-[11px] text-portal-muted">{invoice.customerTradingName}</p>}
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
              <div><p className="text-[10px] uppercase tracking-wide text-portal-muted">Code</p><p className="mt-0.5 font-mono text-portal-text">{invoice.customerCode || '—'}</p></div>
              <div><p className="text-[10px] uppercase tracking-wide text-portal-muted">Region</p><p className="mt-0.5 text-portal-text">{invoice.customerRegionName || '—'}</p></div>
              <div><p className="text-[10px] uppercase tracking-wide text-portal-muted">Phone</p><p className="mt-0.5 font-mono text-portal-text">{invoice.customerPhone || '—'}</p></div>
              <div><p className="text-[10px] uppercase tracking-wide text-portal-muted">WhatsApp</p><p className="mt-0.5 font-mono text-portal-text">{invoice.customerWhatsAppNumber || '—'}</p></div>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-portal-muted">Trek</p>
            <button type="button" onClick={() => navigate(`/portal/trekking/${invoice.trekkingTripId}`)} className="mt-1 font-mono text-xs text-portal-text transition hover:text-portal-accent">{invoice.trekNumber}</button>
            <p className="mt-1 text-[11px] text-portal-muted">{invoice.trekDate}</p>
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
              <div><p className="text-[10px] uppercase tracking-wide text-portal-muted">Driver</p><p className="mt-0.5 text-portal-text">{invoice.driverName || '—'}</p></div>
              <div><p className="text-[10px] uppercase tracking-wide text-portal-muted">Sales staff</p><p className="mt-0.5 text-portal-text">{invoice.salesStaffName || '—'}</p></div>
              <div><p className="text-[10px] uppercase tracking-wide text-portal-muted">Vehicle</p><p className="mt-0.5 text-portal-text">{invoice.vehicleDisplayName || '—'}</p></div>
              <div><p className="text-[10px] uppercase tracking-wide text-portal-muted">Region</p><p className="mt-0.5 text-portal-text">{invoice.regionName || '—'}</p></div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-3 border-b border-portal-border/60">
          <div className="p-4 sm:p-5"><p className="text-[10px] uppercase tracking-wider text-portal-muted">Total</p><p className="mt-1 text-xs font-bold text-portal-heading">{fmtGhs(invoice.totalAmount)}</p></div>
          <div className="border-x border-portal-border/60 p-4 sm:p-5"><p className="text-[10px] uppercase tracking-wider text-portal-muted">Paid</p><p className="mt-1 text-xs font-bold text-portal-accent">{fmtGhs(invoice.totalPaid)}</p></div>
          <div className="p-4 sm:p-5"><p className="text-[10px] uppercase tracking-wider text-portal-muted">Balance</p><p className={`mt-1 text-xs font-bold ${invoice.balance > 0 ? 'text-portal-orange' : 'text-portal-muted'}`}>{fmtGhs(invoice.balance)}</p></div>
        </section>

        <section className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-portal-canvas">
              <tr className="text-left text-[10px] uppercase tracking-wider text-portal-muted">
                <th className="px-4 py-3 font-medium sm:px-6">Product</th>
                <th className="px-4 py-3 text-center font-medium">Quantity</th>
                <th className="px-4 py-3 text-right font-medium">Paid</th>
                <th className="px-4 py-3 text-right font-medium sm:px-6">Line total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lineItems.map((item, index) => (
                <tr key={`${item.productId}-${index}`} className="border-t border-portal-border/40">
                  <td className="px-4 py-3 sm:px-6"><p className="text-xs font-semibold text-portal-text">{item.productName}</p>{item.isUnplanned && <p className="mt-0.5 text-[10px] text-portal-orange">Unplanned sale</p>}</td>
                  <td className="px-4 py-3 text-center text-[11px] text-portal-text">{quantityText(item)}</td>
                  <td className="px-4 py-3 text-right text-[11px] text-portal-accent">{fmtGhs(item.amtPaid)}</td>
                  <td className="px-4 py-3 text-right text-xs font-semibold text-portal-text sm:px-6">{fmtGhs(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {invoice.lineItems.length === 0 && <p className="p-8 text-center text-xs text-portal-muted">No delivered line items were returned for this invoice.</p>}
        </section>
      </article>
    </div>
  );
};

export default InvoiceDetailPage;
