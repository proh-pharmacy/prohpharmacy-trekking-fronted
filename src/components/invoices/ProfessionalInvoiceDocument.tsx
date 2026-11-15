import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { cn, fmtGhs } from '../../lib/utils';
import { DocumentBrandHeader } from './DocumentBrandHeader';
import { DocumentPageFooter } from './DocumentPageFooter';
import { invoicePrintUnits, type InvoicePrintQuantities } from './invoicePrintUnits';

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

export interface ProfessionalInvoiceLine extends InvoicePrintQuantities {
  key: string;
  productName: string;
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

interface IndexedInvoiceLine {
  item: ProfessionalInvoiceLine;
  index: number;
}

interface InvoicePageSlice {
  lines: IndexedInvoiceLine[];
  showTotals: boolean;
}

const estimateFallbackPages = (lines: ProfessionalInvoiceLine[]): InvoicePageSlice[] => {
  if (lines.length === 0) {
    return [{ lines: [], showTotals: true }];
  }

  const pages: InvoicePageSlice[] = [];
  let currentLines: IndexedInvoiceLine[] = [];
  let usedMm = 0;
  let budgetMm = 215;
  const totalsMm = 32;

  lines.forEach((item, index) => {
    const units = invoicePrintUnits(item);
    const unitHeightMm = Math.max(1, units.length) * 5.2;
    const textHeightMm = Math.max(1, Math.ceil((item.productName || '').length / 44)) * 3.8 + 1.4;
    const rowHeightMm = Math.max(unitHeightMm, textHeightMm);

    if (currentLines.length > 0 && usedMm + rowHeightMm > budgetMm) {
      pages.push({ lines: currentLines, showTotals: false });
      currentLines = [{ item, index }];
      usedMm = rowHeightMm;
      budgetMm = 242;
    } else {
      currentLines.push({ item, index });
      usedMm += rowHeightMm;
    }
  });

  if (usedMm + totalsMm <= budgetMm) {
    pages.push({ lines: currentLines, showTotals: true });
  } else {
    pages.push({ lines: currentLines, showTotals: false });
    pages.push({ lines: [], showTotals: true });
  }

  return pages;
};

const pageSignature = (pages: InvoicePageSlice[]) =>
  pages.map(page => `${page.lines.map(entry => entry.index).join(',')}:${page.showTotals ? 1 : 0}`).join('|');

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
}, ref) => {
  const articleRef = useRef<HTMLElement>(null);
  useImperativeHandle(ref, () => articleRef.current as HTMLElement);

  const [measuredPages, setMeasuredPages] = useState<InvoicePageSlice[] | null>(null);
  const pages = measuredPages ?? estimateFallbackPages(lines);
  const generatedTimestamp = formatDateTime(new Date().toISOString());

  useLayoutEffect(() => {
    const article = articleRef.current;
    if (!article) return;
    const articleWidthPx = article.offsetWidth;
    if (articleWidthPx <= 0) return;

    if (lines.length === 0) {
      const emptyPages: InvoicePageSlice[] = [{ lines: [], showTotals: true }];
      setMeasuredPages(prev => (prev && pageSignature(prev) === pageSignature(emptyPages) ? prev : emptyPages));
      return;
    }

    const pxPerMm = articleWidthPx / 215.9;
    // Usable inner height of a 265mm print page (minus 8mm page padding and 4mm body padding).
    const usablePageHeightPx = 253 * pxPerMm;

    const headerEl = article.querySelector<HTMLElement>('[data-invoice-header]');
    const metaEl = article.querySelector<HTMLElement>('[data-invoice-meta]');
    const theadEl = article.querySelector<HTMLElement>('[data-invoice-thead]');
    const totalsEl = article.querySelector<HTMLElement>('[data-invoice-totals]');
    const footerEl = article.querySelector<HTMLElement>('.document-inline-footer');

    const headerPx = headerEl ? headerEl.offsetHeight : 14 * pxPerMm;
    const metaPx = metaEl ? metaEl.offsetHeight + 12 : 16 * pxPerMm;
    const theadPx = theadEl ? theadEl.offsetHeight : 7 * pxPerMm;
    const totalsPx = totalsEl ? totalsEl.offsetHeight + 12 : 32 * pxPerMm;
    const footerPx = footerEl ? footerEl.offsetHeight + 8 : 8 * pxPerMm;

    const firstPageAvailablePx = Math.max(80 * pxPerMm, usablePageHeightPx - headerPx - metaPx - theadPx - footerPx);
    const nextPageAvailablePx = Math.max(100 * pxPerMm, usablePageHeightPx - theadPx - footerPx);

    const lineElements = new Map<number, HTMLElement>();
    article.querySelectorAll<HTMLElement>('[data-invoice-line]').forEach(el => {
      const idx = Number(el.getAttribute('data-invoice-line'));
      if (!Number.isNaN(idx)) lineElements.set(idx, el);
    });

    const nextPages: InvoicePageSlice[] = [];
    let currentLines: IndexedInvoiceLine[] = [];
    let usedPx = 0;
    let budgetPx = firstPageAvailablePx;

    lines.forEach((item, index) => {
      const el = lineElements.get(index);
      const itemPx = el && el.offsetHeight > 0 ? el.offsetHeight : 5.2 * pxPerMm;

      if (currentLines.length > 0 && usedPx + itemPx > budgetPx) {
        nextPages.push({ lines: currentLines, showTotals: false });
        currentLines = [{ item, index }];
        usedPx = itemPx;
        budgetPx = nextPageAvailablePx;
      } else {
        currentLines.push({ item, index });
        usedPx += itemPx;
      }
    });

    if (usedPx + totalsPx <= budgetPx) {
      nextPages.push({ lines: currentLines, showTotals: true });
    } else {
      nextPages.push({ lines: currentLines, showTotals: false });
      nextPages.push({ lines: [], showTotals: true });
    }

    const nextSig = pageSignature(nextPages);
    setMeasuredPages(prev => (prev && pageSignature(prev) === nextSig ? prev : nextPages));
  }, [lines, customerName, customerCode, invoiceNumber, issuedAt, trekNumber, trekDate, status, paymentMethods, qrCode]);

  return (
    <article
      ref={articleRef}
      className={cn(
        'professional-print-document mx-auto box-border min-h-[279.4mm] w-[215.9mm] min-w-[215.9mm] overflow-visible border border-slate-300 bg-white font-sans text-[11px] text-slate-800 print:border-0',
        className,
      )}
    >
      {pages.map((page, pageIndex) => (
        <div
          key={pageIndex}
          className={cn(
            'invoice-print-page flex min-h-[279.4mm] flex-col bg-white p-[4mm]',
            pageIndex > 0 && 'border-t border-dashed border-slate-300 print:border-t-0',
          )}
        >
          {pageIndex === 0 && (
            <div data-invoice-header>
              <DocumentBrandHeader qrCode={qrCode} qrCaption={qrCaption} />
            </div>
          )}

          <div className="document-body flex flex-1 flex-col px-[4mm] py-[2mm]">
            {pageIndex === 0 && (
              <div data-invoice-meta className="mb-3 space-y-2 text-[11px] text-slate-800">
                <div className="grid grid-cols-2 items-start gap-4">
                  <div className="space-y-0.5">
                    <p className="font-medium">{customerName}</p>
                    {customerCode && <p>{customerCode}</p>}
                  </div>
                  <p className="text-right text-slate-500">{formatDateTime(issuedAt)}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <p className="break-words">Trek invoice: {invoiceNumber || '—'}</p>
                  <p>Inventory invoice: <span className="whitespace-nowrap">________________________</span></p>
                </div>
              </div>
            )}

            {(page.lines.length > 0 || lines.length === 0) && (
              <table className="invoice-items mb-3 w-full table-fixed border-collapse text-[11px] leading-snug">
                <colgroup>
                  <col className="w-[8mm]" /><col /><col className="w-[30mm]" /><col className="w-[32mm]" /><col className="w-[34mm]" />
                </colgroup>
                <thead data-invoice-thead className="border-b-2 border-invoice-ink bg-light-green text-[11px] font-semibold uppercase tracking-widest text-invoice-ink">
                  <tr>
                    <th scope="col" className="px-2 py-[1mm] text-left">#</th>
                    <th scope="col" className="px-2 py-[1mm] text-left">Item(s)</th>
                    <th scope="col" className="px-2 py-[1mm] text-left">Qty</th>
                    <th scope="col" className="px-2 py-[1mm] text-right">Price (GHS)</th>
                    <th scope="col" className="px-2 py-[1mm] text-right">Total (GHS)</th>
                  </tr>
                </thead>
                {page.lines.map(({ item, index }) => {
                  const units = invoicePrintUnits(item);
                  return (
                    <tbody key={item.key} data-invoice-line={index} className="break-inside-avoid border-b border-dotted border-slate-300 align-top">
                      {units.map((unit, unitIndex) => (
                        <tr key={unitIndex} className="break-inside-avoid">
                          {unitIndex === 0 && <>
                            <td rowSpan={units.length} className="px-2 py-[1.5mm] tabular-nums text-slate-500">{index + 1}</td>
                            <td rowSpan={units.length} className="break-words px-2 py-[1.5mm] font-medium">{item.productName}</td>
                          </>}
                          <td className="break-words px-2 py-[1.5mm] tabular-nums">{unit.quantity.toLocaleString('en-GH')} {unit.name}</td>
                          <td className="break-words px-2 py-[1.5mm] text-right tabular-nums">{unit.price == null ? '—' : unit.price.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          {unitIndex === 0 && <td rowSpan={units.length} className="break-words px-2 py-[1.5mm] text-right font-medium tabular-nums">{item.lineTotal.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>}
                        </tr>
                      ))}
                    </tbody>
                  );
                })}
                {lines.length === 0 && (
                  <tbody>
                    <tr>
                      <td colSpan={5} className="border-b border-dotted border-slate-300 px-2 py-3 text-slate-500">
                        No products have been added to this invoice.
                      </td>
                    </tr>
                  </tbody>
                )}
              </table>
            )}

            {page.showTotals && (
              <div data-invoice-totals className="break-inside-avoid grid grid-cols-2 items-end gap-6">
                <div className="space-y-2 text-[11px] text-slate-800">
                  <div>
                    <p className="mb-1 font-semibold">Invoice details:</p>
                    <div className="space-y-0.5 text-slate-600">
                      <p>Trek: {trekNumber}</p>
                      <p>Scheduled date: {formatDate(trekDate)}</p>
                      {status && <p>Status: {displayStatus(status)}</p>}
                    </div>
                  </div>
                  <div>
                    <p className="mb-1 font-semibold">Payment terms:</p>
                    <p className="text-slate-600">
                      {paymentMethods || (status === 'Paid' || status === 'PartiallyPaid' ? 'See payment receipt(s)' : 'Awaiting payment')}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[10px] font-semibold uppercase tracking-wider">Invoice total</span>
                    <span className="font-medium tabular-nums">{fmtGhs(totalAmount)}</span>
                  </div>
                  <div className="border-t-[1.5px] border-slate-900 pt-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[10px] font-semibold uppercase tracking-wider">Paid</span>
                      <span className="font-medium tabular-nums">{fmtGhs(totalPaid)}</span>
                    </div>
                  </div>
                  <div className="border-t-[1.5px] border-slate-900 pb-1 pt-2">
                    <div className="flex items-center justify-between text-[14px] font-bold">
                      <span className="text-[10px] uppercase tracking-widest">Balance due</span>
                      <span className="tabular-nums">{fmtGhs(balance)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <DocumentPageFooter
              regionName={regionName}
              vehicleName={vehicleName}
              driverName={driverName}
              salesStaffName={salesStaffName}
              message="This is a computer-generated invoice. No signature is required."
              generatedAt={generatedTimestamp}
              pageNumber={pageIndex + 1}
              totalPages={pages.length}
            />
          </div>
        </div>
      ))}
    </article>
  );
});

ProfessionalInvoiceDocument.displayName = 'ProfessionalInvoiceDocument';
