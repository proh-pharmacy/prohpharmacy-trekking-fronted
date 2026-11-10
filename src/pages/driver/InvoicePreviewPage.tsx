import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { getApiError } from '../../api-client';
import { invoicesApi } from '../../api-client/invoices';
import { ProfessionalInvoiceDocument, useLetterDocumentPrint } from '../../components/invoices';
import { fieldApi, type DriverInvoicePreviewResponse } from './control/api';

export const InvoicePreviewPage: React.FC = () => {
  const { documentRef, printDocument } = useLetterDocumentPrint();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token')?.trim() ?? '';
  const invoiceId = searchParams.get('invoiceId')?.trim() ?? '';
  const customerCode = searchParams.get('cc')?.trim() ?? '';
  const clientGeneratedId = searchParams.get('cid')?.trim() ?? '';
  const [invoice, setInvoice] = useState<DriverInvoicePreviewResponse | null>(null);
  const [qrCode, setQrCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingSync, setPendingSync] = useState(false);
  const identifierParam = invoiceId ? `invoiceId=${encodeURIComponent(invoiceId)}` : customerCode
    ? `cc=${encodeURIComponent(customerCode)}`
    : `cid=${encodeURIComponent(clientGeneratedId)}`;
  const previewUrl = `${window.location.origin}/invoice/preview?token=${encodeURIComponent(token)}&${identifierParam}`;

  useEffect(() => {
    let active = true;
    if (!token || (!invoiceId && !customerCode && !clientGeneratedId)) {
      setError('This invoice link is incomplete.');
      setPendingSync(false);
      setLoading(false);
      return () => { active = false; };
    }
    setLoading(true);
    Promise.all([
      invoiceId ? invoicesApi.getDriverInvoice(token, invoiceId).then(data => ({
        trekNumber: data.trekNumber, scheduledDate: data.trekDate, trekStatus: '', regionName: data.regionName, driverName: data.driverName, salesStaffName: data.salesStaffName, vehicleDisplayName: data.vehicleDisplayName,
        stop: { stopId: '', sequence: 0, isWalkIn: false,
          customer: { id: data.customerAccountId, customerCode: data.customerCode, clientGeneratedId: null, businessName: data.customerName, tradingName: data.customerTradingName, primaryPhoneNumber: data.customerPhone, whatsAppNumber: data.customerWhatsAppNumber, regionName: data.customerRegionName },
          invoice: { id: data.id, invoiceNumber: data.invoiceNumber, status: data.status, issuedAt: data.issuedAt },
          products: data.lineItems, totals: { amountDue: data.totalAmount, amtPaid: data.totalPaid, balance: data.balance } },
      })) : fieldApi.getInvoicePreview(token, { customerCode, clientGeneratedId }),
      QRCode.toDataURL(previewUrl, { errorCorrectionLevel: 'M', margin: 1, width: 144 }),
    ]).then(([data, qr]) => {
      if (!active) return;
      setInvoice(data);
      setQrCode(qr);
      setError('');
      setPendingSync(false);
    }).catch((loadError: unknown) => {
      if (!active) return;
      const apiError = getApiError(loadError);
      if (apiError?.code === '404') {
        setError('Oops! We could not find this invoice at the moment.');
        setPendingSync(true);
      } else {
        setError(apiError?.message || 'Invoice unavailable.');
        setPendingSync(false);
      }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [clientGeneratedId, customerCode, invoiceId, previewUrl, token]);



  if (loading) {
    return <div className="flex min-h-dvh items-center justify-center bg-invoice-backdrop text-xs text-portal-muted"><i className="pi pi-spin pi-spinner mr-2" />Loading invoice...</div>;
  }

  if (!invoice) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-invoice-backdrop p-6">
        <div className="w-full max-w-sm space-y-2 text-center">
          <p className="text-base font-semibold text-white">{error || 'Invoice unavailable.'}</p>
          {pendingSync && (
            <p className="text-xs text-white/70">
              If your sale is very recent, we may still be processing it — please try again in a few minutes.
            </p>
          )}
          <p className="pt-2 text-xs text-white/70">
            Need help? Visit{' '}
            <a
              href="https://prohpharmacy.com/"
              target="_blank"
              rel="noreferrer"
              className="text-portal-accent hover:underline"
            >
              prohpharmacy.com
            </a>
            .
          </p>
        </div>
      </div>
    );
  }

  const issuedAt = invoice.stop.invoice?.issuedAt || invoice.stop.products[0]?.deliveredAt;
  const lines = invoice.stop.products.map((item) => ({
    key: item.productId,
    productName: item.productName,
    quantity: [
      Number(item.packagingQuantity ?? 0) > 0 && item.packagingUnitName ? `${item.packagingQuantity} ${item.packagingUnitName}` : '',
      Number(item.basicQuantity ?? 0) > 0 ? `${item.basicQuantity} ${item.basicUnitName}` : '',
    ].filter(Boolean).join(' · ') || '—',
    lineTotal: item.lineTotal,
  }));

  return (
    <main
      className="min-h-dvh overflow-x-auto bg-invoice-backdrop px-3 py-6 print:min-h-0 print:overflow-visible print:bg-white print:p-0"
    >
      <div className="invoice-preview-toolbar mb-3 flex justify-center">
        <img
          src="/images/prohpharmacy_icon_white.png"
          alt="ProH Pharmacy"
          className="h-10 w-10 object-contain"
        />
      </div>

      <ProfessionalInvoiceDocument
        ref={documentRef}
        invoiceNumber={invoice.stop.invoice?.invoiceNumber}
        issuedAt={issuedAt || invoice.scheduledDate}
        customerName={invoice.stop.customer.businessName}
        customerCode={invoice.stop.customer.customerCode}
        trekNumber={invoice.trekNumber}
        trekDate={invoice.scheduledDate}
        vehicleName={invoice.vehicleDisplayName}
        regionName={invoice.regionName}
        driverName={invoice.driverName}
        salesStaffName={invoice.salesStaffName}
        status={invoice.stop.invoice?.status}
        lines={lines}
        totalAmount={invoice.stop.totals.amountDue}
        totalPaid={invoice.stop.totals.amtPaid}
        balance={invoice.stop.totals.balance}
        qrCode={qrCode}
        qrCaption="Scan the QR code to view this invoice."
      />

      <div className="invoice-preview-toolbar mt-4 flex justify-center">
        <button
          type="button"
          onClick={printDocument}
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
