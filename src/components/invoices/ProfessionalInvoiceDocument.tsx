import { forwardRef } from 'react';
import { cn, fmtGhs } from '../../lib/utils';

const formatDateTime = (value: string) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDate = (value: string) => {
  if (!value) return '—';
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const displayStatus = (status?: string | null) => {
  if (status === 'Issued') return 'Awaiting payment';
  if (status === 'PartiallyPaid') return 'Partially paid';
  return status || '';
};

export interface ProfessionalInvoiceLine {
  key: string;
  productName: string;
  quantity: string;
  lineTotal: number;
}

export interface ProfessionalInvoiceDocumentProps {
  invoiceNumber?: string | null;
  issuedAt: string;
  customerName: string;
  customerCode?: string | null;
  trekNumber: string;
  trekDate: string;
  vehicleName?: string | null;
  regionName?: string | null;
  driverName?: string | null;
  salesStaffName?: string | null;
  status?: string | null;
  lines: ProfessionalInvoiceLine[];
  totalAmount: number;
  totalPaid: number;
  balance: number;
  paymentMethods?: string | null;
  qrCode?: string | null;
  qrCaption?: string | null;
  className?: string;
}

export const ProfessionalInvoiceDocument = forwardRef<HTMLElement, ProfessionalInvoiceDocumentProps>(({
  invoiceNumber,
  issuedAt,
  customerName,
  customerCode,
  trekNumber,
  trekDate,
  vehicleName,
  regionName,
  driverName,
  salesStaffName,
  status,
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
              <p className="font-medium">{customerName}</p>
              {customerCode && <p>{customerCode}</p>}
            </div>
          </div>
          <div className="text-right">
            <h1 className="break-words text-[24px] font-semibold uppercase leading-tight tracking-wide">
              {invoiceNumber || 'INVOICE'}
            </h1>
            <p className="mt-1 text-[11px] text-slate-500">{formatDateTime(issuedAt)}</p>
          </div>
        </div>

        <div className="flex gap-2 border-b-2 border-invoice-ink bg-light-green px-[4mm] py-[3mm] text-[11px] font-semibold uppercase tracking-widest text-invoice-ink">
          <div className="w-[10mm] shrink-0">#</div>
          <div className="flex-[1.1]">Item(s)</div>
          <div className="w-[38mm] text-left">Qty</div>
          <div className="w-[22mm] text-right">Total</div>
        </div>

        <div className="mb-8">
          {lines.length > 0 ? lines.map((item, index) => (
            <div key={item.key} className="break-inside-avoid border-b border-dotted border-slate-300">
              <div className="flex items-start gap-2 px-[4mm] py-[4mm] text-[11px]">
                <div className="w-[10mm] shrink-0 tabular-nums text-slate-500">{index + 1}</div>
                <div className="min-w-0 flex-[1.1] break-words font-medium leading-snug">{item.productName}</div>
                <div className="w-[38mm] shrink-0 text-left leading-snug">{item.quantity}</div>
                <div className="w-[22mm] shrink-0 text-right font-medium tabular-nums">{fmtGhs(item.lineTotal)}</div>
              </div>
            </div>
          )) : (
            <p className="border-b border-dotted border-slate-300 px-[4mm] py-[6mm] text-[11px] text-slate-500">
              No products have been added to this invoice.
            </p>
          )}
        </div>

        <div className="break-inside-avoid grid grid-cols-2 items-end gap-6">
          <div className="space-y-3 text-[11px] text-slate-800">
            <div>
              <p className="mb-1 font-semibold">Invoice details:</p>
              <div className="space-y-0.5 text-slate-600">
                <p>Trek: {trekNumber}</p>
                <p>Scheduled date: {formatDate(trekDate)}</p>
                {status && <p>Status: {displayStatus(status)}</p>}
                {driverName && <p>Driver: {driverName}</p>}
                {salesStaffName && <p>Sales staff: {salesStaffName}</p>}
              </div>
            </div>
            <div>
              <p className="mb-1 font-semibold">Payment terms:</p>
              <p className="text-slate-600">
                {paymentMethods || (status === 'Paid' || status === 'PartiallyPaid' ? 'See payment receipt(s)' : 'Awaiting payment')}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[10px] font-semibold uppercase tracking-wider">Invoice total</span>
              <span className="font-medium tabular-nums">{fmtGhs(totalAmount)}</span>
            </div>
            <div className="border-t-[1.5px] border-slate-900 pt-3">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[10px] font-semibold uppercase tracking-wider">Paid</span>
                <span className="font-medium tabular-nums">{fmtGhs(totalPaid)}</span>
              </div>
            </div>
            <div className="border-t-[1.5px] border-slate-900 pb-1 pt-3">
              <div className="flex items-center justify-between text-[14px] font-bold">
                <span className="text-[10px] uppercase tracking-widest">Balance due</span>
                <span className="tabular-nums">{fmtGhs(balance)}</span>
              </div>
            </div>
          </div>
        </div>

        <footer className="document-inline-footer mt-auto flex break-inside-avoid items-center justify-between gap-6 border-t border-slate-200 pt-[4mm] text-[9px] text-slate-500">
          <span className="print-footer-message">This is a computer-generated invoice. No signature is required.</span>
          <span className="print-generated-at shrink-0">Generated: {formatDateTime(new Date().toISOString())}</span>
        </footer>
      </div>
    </div>
  </article>
));

ProfessionalInvoiceDocument.displayName = 'ProfessionalInvoiceDocument';
