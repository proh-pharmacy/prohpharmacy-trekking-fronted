import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { invoicesApi, type SaleInvoice } from '../../../api-client';
import { ThermalInvoiceReceipt, useThermalInvoicePrint } from '../../../components/invoices';

const formatDateTime = (value: string) => new Date(value).toLocaleString('en-GB', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

const quantityText = (item: SaleInvoice['lineItems'][number]) => [
  Number(item.packagingQtyDelivered ?? 0) > 0 && item.packagingUnitName ? `${item.packagingQtyDelivered} ${item.packagingUnitName}` : '',
  Number(item.basicQtyDelivered ?? 0) > 0 ? `${item.basicQtyDelivered} ${item.basicUnitName}` : '',
].filter(Boolean).join(' · ') || '—';

export const InvoicePrintPage: React.FC = () => {
  const { invoiceNumber = '' } = useParams<{ invoiceNumber: string }>();
  const { receiptRef, printInvoice } = useThermalInvoicePrint();
  const [invoice, setInvoice] = useState<SaleInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    invoicesApi.getInvoice(invoiceNumber)
      .then((data) => { if (active) { setInvoice(data); setError(''); } })
      .catch(() => { if (active) setError('Invoice could not be loaded.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [invoiceNumber]);

  if (loading) {
    return <div className="flex min-h-dvh items-center justify-center bg-invoice-backdrop text-xs text-portal-muted"><i className="pi pi-spin pi-spinner mr-2" />Loading invoice...</div>;
  }

  if (!invoice) {
    return <div className="flex min-h-dvh items-center justify-center bg-invoice-backdrop p-5"><div className="w-full max-w-sm border border-portal-border bg-portal-surface p-6 text-center text-xs text-red-accent">{error || 'Invoice unavailable.'}</div></div>;
  }

  const paymentMethods = [...new Set(invoice.lineItems.map((item) => item.paymentMethod).filter(Boolean))].join(', ') || '—';
  const lines = invoice.lineItems.map((item, index) => ({
    key: `${item.productId}-${index}`,
    productName: item.productName,
    quantity: quantityText(item),
    lineTotal: item.lineTotal,
  }));

  return (
    <main className="min-h-dvh bg-invoice-backdrop px-3 py-6 print:min-h-0 print:bg-white print:p-0">
      <div className="mb-3 grid grid-cols-[1fr_auto_1fr] items-center">
        <button type="button" onClick={() => window.close()} className="justify-self-start text-portal-muted transition hover:text-white" aria-label="Close print preview"><i className="pi pi-times" /></button>
        <img src="/images/prohpharmacy_icon_white.png" alt="ProH Pharmacy" className="h-10 w-10 object-contain" />
      </div>

      <ThermalInvoiceReceipt
        ref={receiptRef}
        invoiceNumber={invoice.invoiceNumber}
        issuedAt={formatDateTime(invoice.issuedAt)}
        subtitle={invoice.vehicleDisplayName}
        customerName={invoice.customerName}
        trekNumber={invoice.trekNumber}
        trekDate={invoice.trekDate}
        lines={lines}
        totalAmount={invoice.totalAmount}
        totalPaid={invoice.totalPaid}
        balance={invoice.balance}
        paymentMethods={paymentMethods}
      />

      <div className="mt-4 flex justify-center">
        <button
          type="button"
          onClick={printInvoice}
          className="inline-flex items-center gap-1.5 !rounded-none border-0 border-b border-dotted border-red-accent-light bg-transparent px-0 pb-0.5 text-[11px] font-semibold text-red-accent-light transition-colors hover:!border-red-accent hover:!bg-transparent hover:!text-red-accent"
        >
          <i className="pi pi-print text-[10px]" aria-hidden="true" />
          Print invoice
        </button>
      </div>
    </main>
  );
};

export default InvoicePrintPage;
