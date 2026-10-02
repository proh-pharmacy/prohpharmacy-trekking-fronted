import { forwardRef } from 'react';
import { fmtGhs } from '../../lib/utils';
import { cn } from '../../lib/utils';

export interface ThermalInvoiceLine {
  key: string;
  productName: string;
  quantity: string;
  lineTotal: number;
}

export interface ThermalInvoiceReceiptProps {
  invoiceNumber?: string | null;
  issuedAt: string;
  subtitle?: string | null;
  customerName: string;
  trekNumber: string;
  trekDate: string;
  lines: ThermalInvoiceLine[];
  totalAmount: number;
  totalPaid: number;
  balance: number;
  paymentMethods?: string | null;
  qrCode?: string | null;
  qrCaption?: string | null;
  className?: string;
}

export const ThermalInvoiceReceipt = forwardRef<HTMLElement, ThermalInvoiceReceiptProps>(({
  invoiceNumber,
  issuedAt,
  subtitle,
  customerName,
  trekNumber,
  trekDate,
  lines,
  totalAmount,
  totalPaid,
  balance,
  paymentMethods,
  qrCode,
  qrCaption,
  className,
}, ref) => (
  <article
    ref={ref}
    className={cn('thermal-invoice-receipt mx-auto min-h-[100mm] max-w-full overflow-hidden bg-white px-[4mm] pb-[7mm] pt-[5mm] font-mono text-[11px] text-main-text shadow-2xl', className)}
    style={{ width: '80mm' }}
  >
    <header className="text-center">
      {qrCode && <img src={qrCode} alt="Invoice QR code" className="mx-auto mb-[2mm] h-[25mm] w-[25mm]" />}
      <h1 className="m-0 text-[15px] font-bold leading-tight">ProH Pharmacy</h1>
      {subtitle && <p className="mt-[1mm] text-[10px] leading-snug">{subtitle}</p>}
      <p className="mt-[1mm] text-[10px] leading-snug">{issuedAt}</p>
    </header>

    <div className="my-[3mm] border-y border-dashed border-main-text py-[2mm] text-center text-xs font-bold">
      SALES INVOICE{invoiceNumber ? `: ${invoiceNumber}` : ''}
    </div>

    <section className="space-y-[0.7mm] py-[1mm] leading-snug">
      <div className="flex justify-between gap-[3mm]"><span className="text-muted-text">Customer</span><strong className="max-w-[65%] break-words text-right">{customerName}</strong></div>
      <div className="flex justify-between gap-[3mm]"><span className="text-muted-text">Trek</span><strong className="max-w-[65%] text-right">{trekNumber}</strong></div>
      <div className="flex justify-between gap-[3mm]"><span className="text-muted-text">Trek date</span><strong className="max-w-[65%] text-right">{trekDate}</strong></div>
    </section>

    <div className="mt-[2mm] grid grid-cols-[minmax(0,1fr)_23%_25%] gap-x-[2mm] border-b border-dashed border-main-text py-[2mm] font-bold">
      <span>Item</span><span className="text-center">Qty</span><span className="text-right">Amt</span>
    </div>
    <section>
      {lines.map((item) => (
        <div key={item.key} className="grid grid-cols-[minmax(0,1fr)_23%_25%] items-start gap-x-[2mm] border-b border-dotted border-muted-text py-[2.2mm] text-[10px]">
          <span className="min-w-0 break-words">{item.productName}</span>
          <span className="break-words text-center">{item.quantity}</span>
          <span className="whitespace-nowrap text-right">{Number(item.lineTotal).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      ))}
    </section>

    <section className="py-[2.5mm]">
      <div className="flex justify-between py-[0.7mm]"><span>Sub total</span><strong>{fmtGhs(totalAmount)}</strong></div>
      <div className="flex justify-between py-[0.7mm]"><span>Paid</span><strong>{fmtGhs(totalPaid)}</strong></div>
      <div className="mt-[1mm] flex justify-between border-t border-dashed border-main-text pt-[1.5mm] text-[13px] font-bold"><span>Balance</span><strong>{fmtGhs(balance)}</strong></div>
    </section>

    <div className="border-t border-dashed border-main-text py-[2mm] leading-snug">Payment method: <strong>{paymentMethods || '—'}</strong></div>
    <p className="mt-[3mm] border-t border-dashed border-main-text pt-[2.5mm] text-center text-[10px]">Thank you for your purchase!</p>
    {qrCaption && <p className="mt-[1mm] text-center text-[8px] text-muted-text">{qrCaption}</p>}
  </article>
));

ThermalInvoiceReceipt.displayName = 'ThermalInvoiceReceipt';
