import { useCallback, useEffect, useRef } from 'react';

export function useThermalInvoicePrint() {
  const receiptRef = useRef<HTMLElement>(null);

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

    let pageStyle = document.getElementById('thermal-invoice-print-styles') as HTMLStyleElement | null;
    if (!pageStyle) {
      pageStyle = document.createElement('style');
      pageStyle.id = 'thermal-invoice-print-styles';
      document.head.appendChild(pageStyle);
    }
    pageStyle.textContent = `@media print {
      body * { visibility: hidden !important; }
      .thermal-invoice-receipt, .thermal-invoice-receipt * { visibility: visible !important; }
      .thermal-invoice-receipt { position: absolute !important; left: 0 !important; top: 0 !important; width: 72mm !important; max-width: none !important; min-height: 0 !important; margin: 0 !important; padding: 2mm !important; box-shadow: none !important; }
      @page { size: 80mm ${Math.max(40, Math.ceil(receiptHeightMm + 4))}mm; margin: 2mm; }
    }`;
  }, []);

  useEffect(() => {
    window.addEventListener('beforeprint', configurePrintPage);
    return () => window.removeEventListener('beforeprint', configurePrintPage);
  }, [configurePrintPage]);

  const printInvoice = useCallback(() => {
    configurePrintPage();
    window.requestAnimationFrame(() => window.print());
  }, [configurePrintPage]);

  return { receiptRef, printInvoice };
}

