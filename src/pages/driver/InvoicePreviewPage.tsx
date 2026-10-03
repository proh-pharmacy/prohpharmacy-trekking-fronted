import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { getApiError } from '../../api-client';
import { ThermalInvoiceReceipt, useThermalInvoicePrint } from '../../components/invoices';
import { fieldApi, type DriverInvoicePreviewResponse } from './control/api';

const dateTime = (value: string) => new Date(value).toLocaleString('en-GB', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

export const InvoicePreviewPage: React.FC = () => {
  const { receiptRef, printInvoice } = useThermalInvoicePrint();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token')?.trim() ?? '';
  const customerCode = searchParams.get('cc')?.trim() ?? '';
  const clientGeneratedId = searchParams.get('cid')?.trim() ?? '';
  const [invoice, setInvoice] = useState<DriverInvoicePreviewResponse | null>(null);
  const [qrCode, setQrCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const identifierParam = customerCode
    ? `cc=${encodeURIComponent(customerCode)}`
    : `cid=${encodeURIComponent(clientGeneratedId)}`;
  const previewUrl = `${window.location.origin}/invoice/preview?token=${encodeURIComponent(token)}&${identifierParam}`;

  useEffect(() => {
    let active = true;
    if (!token || (!customerCode && !clientGeneratedId)) {
      setError('This invoice link is incomplete.');
      setLoading(false);
      return () => { active = false; };
    }
    setLoading(true);
    Promise.all([
      fieldApi.getInvoicePreview(token, { customerCode, clientGeneratedId }),
      QRCode.toDataURL(previewUrl, { errorCorrectionLevel: 'M', margin: 1, width: 144 }),
    ]).then(([data, qr]) => {
      if (!active) return;
      setInvoice(data);
      setQrCode(qr);
      setError('');
    }).catch((loadError: unknown) => {
      if (!active) return;
      const apiError = getApiError(loadError);
      if (apiError?.code === '404') {
        setError("This invoice isn't available yet — the driver's device hasn't synced this sale. Please try again later.");
      } else {
        setError(apiError?.message || 'Invoice unavailable.');
      }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [clientGeneratedId, customerCode, previewUrl, token]);

  const paymentMethods = useMemo(() => invoice
    ? [...new Set(invoice.stop.products.map((item) => item.paymentMethod).filter(Boolean))].join(', ') || '—'
    : '—', [invoice]);

  if (loading) {
    return <div className="flex min-h-dvh items-center justify-center bg-invoice-backdrop text-xs text-portal-muted"><i className="pi pi-spin pi-spinner mr-2" />Loading invoice...</div>;
  }

  if (!invoice) {
    return <div className="flex min-h-dvh items-center justify-center bg-invoice-backdrop p-5"><div className="w-full max-w-sm rounded border border-portal-border bg-portal-surface p-6 text-center text-xs text-red-accent">{error || 'Invoice unavailable.'}</div></div>;
  }

  const issuedAt = invoice.stop.invoice?.issuedAt || invoice.stop.products[0]?.deliveredAt;
  const lines = invoice.stop.products.map((item) => ({
    key: item.productId,
    productName: item.productName,
    quantity: [
      Number(item.packagingQtyDelivered ?? 0) > 0 && item.packagingUnitName ? `${item.packagingQtyDelivered} ${item.packagingUnitName}` : '',
      Number(item.basicQtyDelivered ?? 0) > 0 ? `${item.basicQtyDelivered} ${item.basicUnitName}` : '',
    ].filter(Boolean).join(' · ') || '—',
    lineTotal: item.lineTotal,
  }));

  return (
    <main
      className="min-h-dvh bg-invoice-backdrop px-3 py-6 print:min-h-0 print:bg-white print:p-0"
    >
      <div className="invoice-preview-toolbar mb-3 flex justify-center">
        <img
          src="/images/prohpharmacy_icon_white.png"
          alt="ProH Pharmacy"
          className="h-10 w-10 object-contain"
        />
      </div>

      <ThermalInvoiceReceipt
        ref={receiptRef}
        invoiceNumber={invoice.stop.invoice?.invoiceNumber}
        issuedAt={issuedAt ? dateTime(issuedAt) : invoice.scheduledDate}
        subtitle={invoice.vehicleDisplayName}
        customerName={invoice.stop.customer.businessName}
        trekNumber={invoice.trekNumber}
        trekDate={invoice.scheduledDate}
        lines={lines}
        totalAmount={invoice.stop.totals.amountDue}
        totalPaid={invoice.stop.totals.amtPaid}
        balance={invoice.stop.totals.balance}
        paymentMethods={paymentMethods}
        qrCode={qrCode}
        qrCaption="Scan the QR code to view this invoice."
      />

      <div className="invoice-preview-toolbar mt-4 flex justify-center">
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

export default InvoicePreviewPage;
