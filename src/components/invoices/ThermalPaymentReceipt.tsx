import { forwardRef } from 'react';
import type { PaymentReceipt } from '../../api-client/invoices';
import { cn, fmtGhs } from '../../lib/utils';

interface Props {
  receipt: PaymentReceipt;
  customerName?: string | null;
  qrCode?: string | null;
  qrCaption?: string | null;
  className?: string;
}

export const ThermalPaymentReceipt = forwardRef<HTMLElement, Props>(({
  receipt,
  customerName,
  qrCode,
  qrCaption,
  className,
}, ref) => (
  <article
    ref={ref}
    className={cn('thermal-invoice-receipt mx-auto max-w-full overflow-hidden bg-white px-[4mm] pb-[7mm] pt-[5mm] font-mono text-[11px] text-main-text shadow-2xl', className)}
    style={{ width: '80mm' }}
  >
    <header className="text-center">
      {qrCode && <img src={qrCode} alt="Receipt QR code" className="mx-auto mb-[2mm] h-[25mm] w-[25mm]" />}
      <h1 className="m-0 text-[15px] font-bold leading-tight">ProH Pharmacy</h1>
      <p className="mt-[1mm] text-[10px] leading-snug">{new Date(receipt.recordedAt).toLocaleString('en-GB')}</p>
    </header>

    <div className="my-[3mm] border-y border-dashed border-main-text py-[2mm] text-center text-xs font-bold">
      PAYMENT RECEIPT{receipt.receiptNumber ? `: ${receipt.receiptNumber}` : ''}
    </div>

    <section className="space-y-[1mm] py-[1mm] leading-snug">
      {customerName && <div className="flex justify-between gap-[3mm]"><span className="text-muted-text">Customer</span><strong className="max-w-[65%] break-words text-right">{customerName}</strong></div>}
      <div className="flex justify-between gap-[3mm]"><span className="text-muted-text">Invoice</span><strong className="max-w-[65%] break-words text-right">{receipt.invoiceNumber || '—'}</strong></div>
      <div className="flex justify-between gap-[3mm]"><span className="text-muted-text">Method</span><strong className="max-w-[65%] break-words text-right">{receipt.paymentMethod}</strong></div>
      {receipt.reference && <div className="flex justify-between gap-[3mm]"><span className="text-muted-text">Reference</span><strong className="max-w-[65%] break-words text-right">{receipt.reference}</strong></div>}
    </section>

    <section className="mt-[2mm] border-y border-dashed border-main-text py-[2.5mm]">
      <div className="flex justify-between py-[0.7mm] text-[13px] font-bold"><span>Amount received</span><strong>{fmtGhs(receipt.amount)}</strong></div>
      <div className="flex justify-between py-[0.7mm]"><span>Invoice total</span><strong>{fmtGhs(receipt.invoiceTotalAtPayment)}</strong></div>
      <div className="flex justify-between py-[0.7mm]"><span>Balance after payment</span><strong>{fmtGhs(receipt.balanceAfterPayment)}</strong></div>
    </section>

    {receipt.isLegacy && <p className="mt-[2mm] text-center text-[10px]">Imported history — not an issued receipt.</p>}
    <p className="mt-[3mm] text-center text-[10px]">Thank you for your payment!</p>
    {qrCaption && <p className="mt-[1mm] text-center text-[8px] text-muted-text">{qrCaption}</p>}
  </article>
));

ThermalPaymentReceipt.displayName = 'ThermalPaymentReceipt';
