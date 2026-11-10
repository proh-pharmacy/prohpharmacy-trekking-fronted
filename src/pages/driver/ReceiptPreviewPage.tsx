import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { getApiError } from '../../api-client';
import { invoicesApi, type PaymentReceipt } from '../../api-client/invoices';
import { ProfessionalPaymentReceipt, useLetterDocumentPrint } from '../../components/invoices';

export function ReceiptPreviewPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token')?.trim() ?? '';
  const paymentId = searchParams.get('paymentId')?.trim() ?? '';
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [regionName, setRegionName] = useState('');
  const [vehicleName, setVehicleName] = useState('');
  const [trekNumber, setTrekNumber] = useState('');
  const [trekDate, setTrekDate] = useState('');
  const [driverName, setDriverName] = useState('');
  const [salesStaffName, setSalesStaffName] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { documentRef, printDocument } = useLetterDocumentPrint();

  useEffect(() => {
    let active = true;
    if (!token || !paymentId) {
      setError('This receipt link is incomplete.');
      setLoading(false);
      return () => { active = false; };
    }
    setLoading(true);
    invoicesApi.getReceipt(paymentId, token).then(async payment => {
      const invoice = await invoicesApi.getDriverInvoice(token, payment.invoiceId);
      const invoiceUrl = `${window.location.origin}/invoice/preview?token=${encodeURIComponent(token)}&invoiceId=${encodeURIComponent(payment.invoiceId)}`;
      const qr = await QRCode.toDataURL(invoiceUrl, { errorCorrectionLevel: 'M', margin: 1, width: 144 });
      return { payment, invoice, qr };
    }).then((data) => {
      if (!active) return;
      setReceipt(data.payment);
      setCustomerName(data.invoice.customerName);
      setRegionName(data.invoice.regionName);
      setVehicleName(data.invoice.vehicleDisplayName);
      setTrekNumber(data.invoice.trekNumber);
      setTrekDate(data.invoice.trekDate);
      setDriverName(data.invoice.driverName);
      setSalesStaffName(data.invoice.salesStaffName || '');
      setQrCode(data.qr);
      setError('');
    }).catch((loadError: unknown) => {
      if (!active) return;
      const apiError = getApiError(loadError);
      setError(apiError?.code === '404' ? 'This receipt could not be found.' : apiError?.message || 'Receipt unavailable.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [paymentId, token]);

  if (loading) return <div className="flex min-h-dvh items-center justify-center bg-invoice-backdrop text-xs text-portal-muted"><i className="pi pi-spin pi-spinner mr-2" />Loading receipt...</div>;
  if (!receipt) return <div className="flex min-h-dvh items-center justify-center bg-invoice-backdrop p-6 text-center text-base font-semibold text-white">{error || 'Receipt unavailable.'}</div>;

  return (
    <main className="min-h-dvh overflow-x-auto bg-invoice-backdrop px-3 py-6 print:min-h-0 print:overflow-visible print:bg-white print:p-0">
      <div className="invoice-preview-toolbar mb-3 flex justify-center">
        <img src="/images/prohpharmacy_icon_white.png" alt="ProH Pharmacy" className="h-10 w-10 object-contain" />
      </div>
      <ProfessionalPaymentReceipt
        ref={documentRef}
        receipt={receipt}
        customerName={customerName}
        regionName={regionName}
        vehicleName={vehicleName}
        trekNumber={trekNumber}
        trekDate={trekDate}
        driverName={driverName}
        salesStaffName={salesStaffName}
        qrCode={qrCode}
        qrCaption="Scan to view this invoice."
      />
      <div className="invoice-preview-toolbar mt-4 flex justify-center">
        <button type="button" onClick={printDocument} className="inline-flex items-center gap-1.5 !rounded-none border-0 border-b border-dotted border-red-accent-light bg-transparent px-0 pb-0.5 text-[11px] font-semibold text-red-accent-light hover:!border-red-accent hover:!text-red-accent">
          <i className="pi pi-print text-[10px]" aria-hidden="true" /> Print receipt
        </button>
      </div>
    </main>
  );
}

export default ReceiptPreviewPage;
