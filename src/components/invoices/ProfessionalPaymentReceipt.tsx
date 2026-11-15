import { forwardRef } from 'react';
import type { PaymentReceipt } from '../../api-client/invoices';
import { cn, fmtGhs } from '../../lib/utils';
import { DocumentBrandHeader } from './DocumentBrandHeader';
import { DocumentPageFooter } from './DocumentPageFooter';

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
      'professional-print-document mx-auto box-border min-h-[279.4mm] w-[215.9mm] min-w-[215.9mm] overflow-visible border border-slate-300 bg-white font-sans text-[11px] text-slate-800 print:border-0',
      className,
    )}
  >
    <div className="invoice-print-page flex min-h-[279.4mm] flex-col bg-white p-[4mm]">
      <DocumentBrandHeader qrCode={qrCode} qrCaption={qrCaption} />

      <div className="document-body flex flex-1 flex-col px-[4mm] py-[2mm]">
        <div className="mb-3 grid grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] items-start gap-4">
          <div>
            <div className="space-y-0.5 text-[11px] text-slate-800">
              <p className="font-medium">{customerName || 'Customer'}</p>
              <p>Invoice {receipt.invoiceNumber}</p>
              {!receipt.isLegacy && receipt.receiptNumber && (
                <p className="break-words">Receipt {receipt.receiptNumber}</p>
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

        <div className="grid grid-cols-[1fr_1fr_38mm] border-b-2 border-invoice-ink bg-light-green px-2 py-[1mm] text-[11px] font-semibold uppercase tracking-widest text-invoice-ink">
          <span>Invoice</span>
          <span>Payment method</span>
          <span className="text-right">Amount</span>
        </div>
        <div className="grid grid-cols-[1fr_1fr_38mm] items-start border-b border-dotted border-slate-300 px-2 py-[1.5mm] text-[11px]">
          <span className="font-medium">{receipt.invoiceNumber || '—'}</span>
          <span>{receipt.paymentMethod}</span>
          <span className="text-right font-medium tabular-nums">{fmtGhs(receipt.amount)}</span>
        </div>

        <div className="mt-3 break-inside-avoid grid grid-cols-2 items-start gap-6">
          <div className="space-y-2 text-[11px]">
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
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[10px] font-semibold uppercase tracking-wider">Invoice total</span>
              <span className="font-medium tabular-nums">{fmtGhs(receipt.invoiceTotalAtPayment)}</span>
            </div>
            {previouslyPaid(receipt) > 0.005 && (
              <div className="border-t border-slate-300 pt-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[10px] font-semibold uppercase tracking-wider">Previously paid</span>
                  <span className="font-medium tabular-nums">{fmtGhs(previouslyPaid(receipt))}</span>
                </div>
              </div>
            )}
            <div className="border-t-[1.5px] border-slate-900 pt-2">
              <div className="flex items-center justify-between text-[14px] font-bold">
                <span className="text-[10px] uppercase tracking-widest">Amount received</span>
                <span className="tabular-nums">{fmtGhs(receipt.amount)}</span>
              </div>
            </div>
            <div className="border-t-[1.5px] border-slate-900 pb-1 pt-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[10px] font-semibold uppercase tracking-wider">Balance</span>
                <span className="font-medium tabular-nums">{fmtGhs(receipt.balanceAfterPayment)}</span>
              </div>
            </div>
          </div>
        </div>

        {receipt.isLegacy && (
          <p className="mt-3 border-t border-slate-200 pt-2 text-[10px] text-slate-500">
            Imported payment history — this is not an originally issued receipt.
          </p>
        )}
        <DocumentPageFooter
          regionName={regionName}
          vehicleName={vehicleName}
          driverName={driverName}
          salesStaffName={salesStaffName}
          message={receipt.isLegacy
              ? 'Imported payment record. This is not an originally issued receipt.'
              : 'Thank you for your payment. This is a computer-generated receipt; no signature is required.'}
          generatedAt={recordedAt(new Date().toISOString())}
        />
      </div>
    </div>
  </article>
));

ProfessionalPaymentReceipt.displayName = 'ProfessionalPaymentReceipt';
