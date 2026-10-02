import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { getApiError } from '../../api-client';
import { fmtGhs } from '../../lib/utils';
import { fieldApi, type DriverInvoicePreviewResponse } from './control/api';

const dateTime = (value: string) => new Date(value).toLocaleString('en-GB', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

export const InvoicePreviewPage: React.FC = () => {
  const receiptRef = useRef<HTMLElement>(null);
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token')?.trim() ?? '';
  const customerCode = searchParams.get('cc')?.trim() ?? '';
  const [invoice, setInvoice] = useState<DriverInvoicePreviewResponse | null>(null);
  const [qrCode, setQrCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const previewUrl = `${window.location.origin}/invoice/preview?token=${encodeURIComponent(token)}&cc=${encodeURIComponent(customerCode)}`;

  useEffect(() => {
    let active = true;
    if (!token || !customerCode) {
      setError('This invoice link is incomplete.');
      setLoading(false);
      return () => { active = false; };
    }
    setLoading(true);
    Promise.all([
      fieldApi.getInvoicePreview(token, customerCode),
      QRCode.toDataURL(previewUrl, { errorCorrectionLevel: 'M', margin: 1, width: 144 }),
    ]).then(([data, qr]) => {
      if (!active) return;
      setInvoice(data);
      setQrCode(qr);
      setError('');
    }).catch((loadError: unknown) => {
      if (active) setError(getApiError(loadError)?.message || 'Invoice unavailable.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [customerCode, previewUrl, token]);

  const paymentMethods = useMemo(() => invoice
    ? [...new Set(invoice.stop.products.map((item) => item.paymentMethod).filter(Boolean))].join(', ') || '—'
    : '—', [invoice]);

  const configurePrintPage = useCallback(() => {
    const receipt = receiptRef.current;
    if (!receipt) return;

    const measurement = receipt.cloneNode(true) as HTMLElement;
    measurement.setAttribute('aria-hidden', 'true');
    Object.assign(measurement.style, {
      position: 'fixed',
      left: '-10000px',
      top: '0',
      width: '72mm',
      maxWidth: 'none',
      minHeight: '0',
      margin: '0',
      padding: '2mm',
      boxShadow: 'none',
      visibility: 'hidden',
    });
    document.body.appendChild(measurement);

    const receiptHeightMm = measurement.getBoundingClientRect().height * 25.4 / 96;
    measurement.remove();

    let pageStyle = document.getElementById('invoice-print-page-size') as HTMLStyleElement | null;
    if (!pageStyle) {
      pageStyle = document.createElement('style');
      pageStyle.id = 'invoice-print-page-size';
      document.head.appendChild(pageStyle);
    }
    pageStyle.textContent = `@media print { @page { size: 80mm ${Math.max(40, Math.ceil(receiptHeightMm + 4))}mm; margin: 2mm; } }`;
  }, []);

  useEffect(() => {
    window.addEventListener('beforeprint', configurePrintPage);
    return () => window.removeEventListener('beforeprint', configurePrintPage);
  }, [configurePrintPage]);

  const printInvoice = () => {
    configurePrintPage();
    window.requestAnimationFrame(() => window.print());
  };

  if (loading) {
    return <div className="flex min-h-dvh items-center justify-center bg-portal-canvas text-xs text-portal-muted"><i className="pi pi-spin pi-spinner mr-2" />Loading invoice...</div>;
  }

  if (!invoice) {
    return <div className="flex min-h-dvh items-center justify-center bg-portal-canvas p-5"><div className="w-full max-w-sm rounded border border-portal-border bg-portal-surface p-6 text-center text-xs text-red-accent">{error || 'Invoice unavailable.'}</div></div>;
  }

  const issuedAt = invoice.stop.invoice?.issuedAt || invoice.stop.products[0]?.deliveredAt;

  return (
    <main
      className="min-h-dvh bg-invoice-backdrop px-3 py-6 print:min-h-0 print:bg-white print:p-0"
    >
      <style>{`@media print { .invoice-preview-toolbar { display: none !important; } .thermal-receipt { width: 72mm !important; max-width: none !important; min-height: 0 !important; margin: 0 !important; padding: 2mm !important; box-shadow: none !important; } }`}</style>
      <div className="invoice-preview-toolbar mb-3 flex justify-center">
        <img
          src="/images/prohpharmacy_icon_white.png"
          alt="ProH Pharmacy"
          className="h-10 w-10 object-contain"
        />
      </div>

      <article ref={receiptRef} className="thermal-receipt mx-auto min-h-[100mm] max-w-full overflow-hidden bg-white px-[4mm] pb-[7mm] pt-[5mm] font-mono text-[11px] text-main-text shadow-2xl" style={{ width: '80mm' }}>
        <header className="text-center">
          {qrCode && <img src={qrCode} alt="Invoice QR code" className="mx-auto mb-[2mm] h-[25mm] w-[25mm]" />}
          <h1 className="m-0 text-[15px] font-bold leading-tight">ProH Pharmacy</h1>
          <p className="mt-[1mm] text-[10px] leading-snug">{invoice.vehicleDisplayName}</p>
          <p className="mt-[1mm] text-[10px] leading-snug">{issuedAt ? dateTime(issuedAt) : invoice.scheduledDate}</p>
        </header>

        <div className="my-[3mm] border-y border-dashed border-main-text py-[2mm] text-center text-xs font-bold">
          SALES INVOICE{invoice.stop.invoice?.invoiceNumber ? `: ${invoice.stop.invoice.invoiceNumber}` : ''}
        </div>

        <section className="space-y-[0.7mm] py-[1mm] leading-snug">
          <div className="flex justify-between gap-[3mm]"><span className="text-muted-text">Customer</span><strong className="max-w-[65%] text-right break-words">{invoice.stop.customer.businessName}</strong></div>
          <div className="flex justify-between gap-[3mm]"><span className="text-muted-text">Trek</span><strong className="max-w-[65%] text-right">{invoice.trekNumber}</strong></div>
          <div className="flex justify-between gap-[3mm]"><span className="text-muted-text">Trek date</span><strong className="max-w-[65%] text-right">{invoice.scheduledDate}</strong></div>
        </section>

        <div className="mt-[2mm] grid grid-cols-[minmax(0,1fr)_23%_25%] gap-x-[2mm] border-b border-dashed border-main-text py-[2mm] font-bold">
          <span>Item</span><span className="text-center">Qty</span><span className="text-right">Amt</span>
        </div>
        <section>
          {invoice.stop.products.map((item) => {
            const quantity = [
              Number(item.packagingQtyDelivered ?? 0) > 0 && item.packagingUnitName ? `${item.packagingQtyDelivered} ${item.packagingUnitName}` : '',
              Number(item.basicQtyDelivered ?? 0) > 0 ? `${item.basicQtyDelivered} ${item.basicUnitName}` : '',
            ].filter(Boolean).join(' · ');
            return (
              <div key={item.productId} className="grid grid-cols-[minmax(0,1fr)_23%_25%] items-start gap-x-[2mm] border-b border-dotted border-muted-text py-[2.2mm] text-[10px]">
                <span className="min-w-0 break-words">{item.productName}</span>
                <span className="break-words text-center">{quantity}</span>
                <span className="whitespace-nowrap text-right">{Number(item.lineTotal).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            );
          })}
        </section>

        <section className="py-[2.5mm]">
          <div className="flex justify-between py-[0.7mm]"><span>Sub total</span><strong>{fmtGhs(invoice.stop.totals.amountDue)}</strong></div>
          <div className="flex justify-between py-[0.7mm]"><span>Paid</span><strong>{fmtGhs(invoice.stop.totals.amtPaid)}</strong></div>
          <div className="mt-[1mm] flex justify-between border-t border-dashed border-main-text pt-[1.5mm] text-[13px] font-bold"><span>Balance</span><strong>{fmtGhs(invoice.stop.totals.balance)}</strong></div>
        </section>

        <div className="border-t border-dashed border-main-text py-[2mm] leading-snug">Payment method: <strong>{paymentMethods}</strong></div>
        <p className="mt-[3mm] border-t border-dashed border-main-text pt-[2.5mm] text-center text-[10px]">Thank you for your purchase!</p>
        <p className="mt-[1mm] text-center text-[8px] text-muted-text">Scan the QR code to view this invoice.</p>
      </article>

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
