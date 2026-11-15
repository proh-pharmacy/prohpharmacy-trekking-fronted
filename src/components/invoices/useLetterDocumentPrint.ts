import { useCallback, useEffect, useRef } from 'react';

const PRINT_STYLE_ID = 'letter-document-print-styles';

const formatGeneratedTimestamp = () => new Date().toLocaleString('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const markPrintAncestors = (element: HTMLElement) => {
  let ancestor = element.parentElement;
  while (ancestor) {
    ancestor.setAttribute('data-print-ancestor', 'true');
    if (ancestor === document.body) break;
    ancestor = ancestor.parentElement;
  }
};

const clearPrintAttributes = () => {
  document.querySelectorAll<HTMLElement>('.professional-print-document[data-print-active="true"]')
    .forEach(element => element.removeAttribute('data-print-active'));
  document.querySelectorAll<HTMLElement>('[data-print-ancestor="true"]')
    .forEach(element => element.removeAttribute('data-print-ancestor'));
};

export function useLetterDocumentPrint() {
  const documentRef = useRef<HTMLElement>(null);

  const configurePrintPage = useCallback(() => {
    let activeDocument = document.querySelector<HTMLElement>('.professional-print-document[data-print-active="true"]');
    if (!activeDocument && documentRef.current && !documentRef.current.closest('.letter-print-host')) {
      documentRef.current.setAttribute('data-print-active', 'true');
      markPrintAncestors(documentRef.current);
      activeDocument = documentRef.current;
      window.addEventListener('afterprint', clearPrintAttributes, { once: true });
    }
    if (!activeDocument || (documentRef.current && documentRef.current !== activeDocument)) return;

    const rootStyles = getComputedStyle(document.documentElement);
    const invoiceInk = rootStyles.getPropertyValue('--color-invoice-ink').trim() || 'var(--color-invoice-ink)';
    const lightGreen = rootStyles.getPropertyValue('--color-light-green').trim() || 'var(--color-light-green)';
    const mutedText = rootStyles.getPropertyValue('--color-muted-text').trim() || 'var(--color-muted-text)';

    let pageStyle = document.getElementById(PRINT_STYLE_ID) as HTMLStyleElement | null;
    if (!pageStyle) {
      pageStyle = document.createElement('style');
      pageStyle.id = PRINT_STYLE_ID;
      document.head.appendChild(pageStyle);
    }
    pageStyle.textContent = `
      @page {
        color-scheme: light;
        size: Letter portrait;
        margin: 6mm;
      }
      @media print {
        :root, html, body {
          color-scheme: light !important;
          width: auto !important;
          min-height: auto !important;
          margin: 0 !important;
          padding: 0 !important;
          background: white !important;
          color: ${invoiceInk} !important;
        }
        body * { visibility: hidden !important; }
        .professional-print-document { display: none !important; }
        [data-print-ancestor="true"] > :not([data-print-ancestor="true"]):not(.professional-print-document[data-print-active="true"]) { display: none !important; }
        .letter-print-host, [data-print-ancestor="true"], .professional-print-document[data-print-active="true"], .professional-print-document[data-print-active="true"] * { visibility: visible !important; }
        [data-print-ancestor="true"] { display: block !important; position: static !important; width: auto !important; max-width: none !important; height: auto !important; min-height: 0 !important; max-height: none !important; margin: 0 !important; padding: 0 !important; border: 0 !important; overflow: visible !important; background: transparent !important; transform: none !important; contain: none !important; animation: none !important; }
        .letter-print-host { position: static !important; }
        [data-print-ancestor="true"],
        .professional-print-document[data-print-active="true"],
        .professional-print-document[data-print-active="true"] * { box-shadow: none !important; text-shadow: none !important; filter: none !important; backdrop-filter: none !important; will-change: auto !important; }
        .professional-print-document[data-print-active="true"] { display: block !important; position: relative !important; left: auto !important; top: auto !important; box-sizing: border-box !important; width: 100% !important; min-width: 0 !important; max-width: none !important; min-height: 0 !important; margin: 0 !important; padding: 0 !important; border: 0 !important; box-shadow: none !important; overflow: visible !important; background: white !important; color: ${invoiceInk} !important; print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
        .professional-print-document[data-print-active="true"], .professional-print-document[data-print-active="true"] * { border-radius: 0 !important; }
        .professional-print-document[data-print-active="true"] .invoice-print-page {
          display: flex !important;
          flex-direction: column !important;
          box-sizing: border-box !important;
          width: 100% !important;
          height: 265mm !important;
          min-height: 265mm !important;
          max-height: 265mm !important;
          padding: 4mm !important;
          margin: 0 !important;
          border: 0 !important;
          background: white !important;
          overflow: hidden !important;
        }
        .professional-print-document[data-print-active="true"] .invoice-print-page:not(:last-child) {
          break-after: page !important;
          page-break-after: always !important;
        }
        .professional-print-document[data-print-active="true"] .document-body {
          display: flex !important;
          flex: 1 1 auto !important;
          flex-direction: column !important;
          padding: 2mm 4mm !important;
        }
        .professional-print-document[data-print-active="true"] .invoice-items thead { display: table-header-group !important; }
        .professional-print-document[data-print-active="true"] .invoice-items tbody { break-inside: avoid; }
        .professional-print-document[data-print-active="true"] .document-inline-footer {
          display: block !important;
          position: static !important;
          margin-top: auto !important;
          padding-top: 3mm !important;
          background: transparent !important;
          color: ${mutedText} !important;
          print-color-adjust: exact !important;
          -webkit-print-color-adjust: exact !important;
        }
        .professional-print-document[data-print-active="true"] .document-inline-footer > div {
          border-top: 1px solid ${invoiceInk} !important;
          background: ${lightGreen} !important;
          color: ${mutedText} !important;
          print-color-adjust: exact !important;
          -webkit-print-color-adjust: exact !important;
        }
        .professional-print-document[data-print-active="true"] .print-footer-website {
          color: ${invoiceInk} !important;
        }
        .professional-print-document[data-print-active="true"] .print-footer-message,
        .professional-print-document[data-print-active="true"] .print-footer-details,
        .professional-print-document[data-print-active="true"] .print-generated-at,
        .professional-print-document[data-print-active="true"] .print-page-number {
          color: ${mutedText} !important;
        }
      }
    `;
  }, []);

  useEffect(() => {
    window.addEventListener('beforeprint', configurePrintPage);
    return () => window.removeEventListener('beforeprint', configurePrintPage);
  }, [configurePrintPage]);

  const printDocument = useCallback(() => {
    if (!documentRef.current) return;
    clearPrintAttributes();
    documentRef.current.setAttribute('data-print-active', 'true');
    const generatedAt = `Generated: ${formatGeneratedTimestamp()}`;
    documentRef.current.querySelectorAll<HTMLElement>('.print-generated-at')
      .forEach(element => { element.textContent = generatedAt; });
    markPrintAncestors(documentRef.current);
    configurePrintPage();
    window.addEventListener('afterprint', clearPrintAttributes, { once: true });
    window.requestAnimationFrame(() => window.print());
  }, [configurePrintPage]);

  return { documentRef, printDocument };
}
