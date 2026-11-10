import { forwardRef } from 'react';
import type { PaymentReceipt } from '../../api-client/invoices';
import { cn, fmtGhs } from '../../lib/utils';

interface Props {
  receipt: PaymentReceipt;
  customerName?: string | null;
  regionName?: string | null;
  vehicleName?: string | null;
  trekNumber?: string | null;
  trekDate?: string | null;
  driverName?: string | null;
  salesStaffName?: string | null;
  qrCode?: string | null;
  qrCaption?: string | null;
  className?: string;
}

const recordedAt = (value: string) => new Date(value).toLocaleString('en-GB', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

const previouslyPaid = (receipt: PaymentReceipt) => Math.max(
  0,
  Number(receipt.invoiceTotalAtPayment) - Number(receipt.amount) - Number(receipt.balanceAfterPayment),
);

export const ProfessionalPaymentReceipt = forwardRef<HTMLElement, Props>(({
  receipt,
  customerName,
  regionName,
  vehicleName,
  trekNumber,
  trekDate,
  driverName,
  salesStaffName,
  qrCode,
  qrCaption,
  className,
}, ref) => (
  <article
    ref={ref}
    className={cn(
      'professional-print-document mx-auto box-border min-h-[279.4mm] w-[215.9mm] min-w-[215.9mm] overflow-visible border border-slate-300 bg-white p-[4mm] font-sans text-[11px] text-slate-800 print:border-0',
      className,
    )}
  >
    <div className="flex min-h-[271.4mm] flex-col bg-white">
      <header className="border-b-2 border-invoice-ink px-[4mm] pb-[3mm] pt-[2mm] text-invoice-ink">
        <div className="flex items-start justify-between gap-8">
          <div className="flex w-[58mm] shrink-0 items-center gap-3">
            <img src="/images/prohpharmacy_icon.png" alt="" className="h-9 w-9 shrink-0 object-contain" />
            <div>
              <p className="text-sm font-semibold leading-tight tracking-wide">PROH PHARMACY</p>
              <p className="mt-1 text-[10px] leading-tight text-slate-500">Trekking Operations</p>
            </div>
          </div>
          <div className="text-right text-[10px] leading-relaxed text-slate-600">
            <p className="mb-1 font-medium">ProH Pharmacy Limited</p>
            {regionName && <p>{regionName}</p>}
            {vehicleName && <p>{vehicleName}</p>}
            <p>prohpharmacy.com</p>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col p-[4mm]">
        <div className="mb-8 grid grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] items-start gap-8">
          <div className="flex items-start gap-[4mm]">
            {qrCode && (
              <div className="shrink-0 text-center">
                <img src={qrCode} alt="Invoice QR code" className="h-[25mm] w-[25mm]" />
                {qrCaption && <p className="mt-1 max-w-[25mm] text-[8px] leading-tight text-slate-500">{qrCaption}</p>}
              </div>
            )}
            <div className="space-y-1 pt-1 text-[11px] text-slate-800">
              <p className="font-medium">{customerName || 'Customer'}</p>
              <p>Invoice {receipt.invoiceNumber}</p>
              {!receipt.isLegacy && receipt.receiptNumber && (
                <p className="max-w-[65mm] break-all">Receipt {receipt.receiptNumber}</p>
              )}
            </div>
          </div>
          <div className="text-right">
            {receipt.isLegacy && (
              <h1 className="break-words text-[24px] font-semibold uppercase leading-tight tracking-wide">
                IMPORTED PAYMENT RECORD
              </h1>
            )}
            <p className="mt-1 text-[11px] text-slate-500">{recordedAt(receipt.recordedAt)}</p>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_1fr_38mm] border-b-2 border-invoice-ink bg-light-green px-[4mm] py-[3mm] text-[11px] font-semibold uppercase tracking-widest text-invoice-ink">
          <span>Invoice</span>
          <span>Payment method</span>
          <span className="text-right">Amount</span>
        </div>
        <div className="grid grid-cols-[1fr_1fr_38mm] items-start border-b border-dotted border-slate-300 px-[4mm] py-[5mm] text-[11px]">
          <span className="font-medium">{receipt.invoiceNumber || '—'}</span>
          <span>{receipt.paymentMethod}</span>
          <span className="text-right font-medium tabular-nums">{fmtGhs(receipt.amount)}</span>
        </div>

        <div className="mt-8 break-inside-avoid grid grid-cols-2 items-start gap-8">
          <div className="space-y-4 text-[11px]">
            <div>
              <p className="mb-1 font-semibold">Payment details:</p>
              <div className="space-y-0.5 text-slate-600">
                <p>Payment method: {receipt.paymentMethod}</p>
                {receipt.reference && <p>Reference: {receipt.reference}</p>}
                <p>Recorded: {recordedAt(receipt.recordedAt)}</p>
              </div>
            </div>
            <div>
              <p className="mb-1 font-semibold">Trek details:</p>
              <div className="space-y-0.5 text-slate-600">
                {trekNumber && <p>Trek: {trekNumber}</p>}
                {trekDate && <p>Scheduled date: {formatDate(trekDate)}</p>}
                {driverName && <p>Driver: {driverName}</p>}
                {salesStaffName && <p>Sales staff: {salesStaffName}</p>}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[10px] font-semibold uppercase tracking-wider">Invoice total</span>
              <span className="font-medium tabular-nums">{fmtGhs(receipt.invoiceTotalAtPayment)}</span>
            </div>
            {previouslyPaid(receipt) > 0.005 && (
              <div className="border-t border-slate-300 pt-3">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[10px] font-semibold uppercase tracking-wider">Previously paid</span>
                  <span className="font-medium tabular-nums">{fmtGhs(previouslyPaid(receipt))}</span>
                </div>
              </div>
            )}
            <div className="border-t-[1.5px] border-slate-900 pt-3">
              <div className="flex items-center justify-between text-[14px] font-bold">
                <span className="text-[10px] uppercase tracking-widest">Amount received</span>
                <span className="tabular-nums">{fmtGhs(receipt.amount)}</span>
              </div>
            </div>
            <div className="border-t-[1.5px] border-slate-900 pb-1 pt-3">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[10px] font-semibold uppercase tracking-wider">Balance</span>
                <span className="font-medium tabular-nums">{fmtGhs(receipt.balanceAfterPayment)}</span>
              </div>
            </div>
          </div>
        </div>

        {receipt.isLegacy && (
          <p className="mt-8 border-t border-slate-200 pt-3 text-[10px] text-slate-500">
            Imported payment history — this is not an originally issued receipt.
          </p>
        )}
        <footer className="document-inline-footer mt-auto flex break-inside-avoid items-center justify-between gap-6 border-t border-slate-200 pt-[4mm] text-[9px] text-slate-500">
          <span className="print-footer-message">
            {receipt.isLegacy
              ? 'Imported payment record. This is not an originally issued receipt.'
              : 'Thank you for your payment. This is a computer-generated receipt; no signature is required.'}
          </span>
          <span className="print-generated-at shrink-0">Generated: {recordedAt(new Date().toISOString())}</span>
        </footer>
      </div>
    </div>
  </article>
));

ProfessionalPaymentReceipt.displayName = 'ProfessionalPaymentReceipt';
