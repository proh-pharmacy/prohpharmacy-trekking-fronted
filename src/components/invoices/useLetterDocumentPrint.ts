import { useCallback, useEffect, useRef } from 'react';

const PRINT_STYLE_ID = 'letter-document-print-styles';
const cssContent = (value: string) => value
  .replace(/\\/g, '\\\\')
  .replace(/"/g, '\\"')
  .replace(/[\r\n]+/g, ' ');

export function useLetterDocumentPrint() {
  const documentRef = useRef<HTMLElement>(null);

  const configurePrintPage = useCallback(() => {
    const footerMessage = documentRef.current
      ?.querySelector<HTMLElement>('.print-footer-message')
      ?.textContent?.trim() || 'Computer-generated document.';
    const generatedAt = documentRef.current
      ?.querySelector<HTMLElement>('.print-generated-at')
      ?.textContent?.trim() || '';
    let pageStyle = document.getElementById(PRINT_STYLE_ID) as HTMLStyleElement | null;
    if (!pageStyle) {
      pageStyle = document.createElement('style');
      pageStyle.id = PRINT_STYLE_ID;
      document.head.appendChild(pageStyle);
    }
    pageStyle.textContent = `@media print {
      html, body { width: auto !important; min-height: auto !important; margin: 0 !important; padding: 0 !important; background: white !important; }
      body * { visibility: hidden !important; }
      .professional-print-document { display: none !important; }
      [data-print-ancestor="true"] > :not([data-print-ancestor="true"]):not(.professional-print-document[data-print-active="true"]) { display: none !important; }
      .letter-print-host, [data-print-ancestor="true"], .professional-print-document[data-print-active="true"], .professional-print-document[data-print-active="true"] * { visibility: visible !important; }
      [data-print-ancestor="true"] { display: block !important; position: static !important; width: auto !important; max-width: none !important; height: auto !important; min-height: 0 !important; max-height: none !important; margin: 0 !important; padding: 0 !important; border: 0 !important; overflow: visible !important; background: transparent !important; transform: none !important; contain: none !important; animation: none !important; }
      .letter-print-host { position: static !important; }
      .professional-print-document[data-print-active="true"] { display: block !important; position: relative !important; left: auto !important; top: auto !important; box-sizing: border-box !important; width: 100% !important; min-width: 0 !important; max-width: none !important; min-height: 260mm !important; margin: 0 !important; border: 0 !important; box-shadow: none !important; overflow: visible !important; print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
      .professional-print-document[data-print-active="true"], .professional-print-document[data-print-active="true"] * { border-radius: 0 !important; }
      .professional-print-document[data-print-active="true"] > div { min-height: 252mm !important; }
      .professional-print-document[data-print-active="true"] .document-inline-footer { display: none !important; }
      @page {
        size: Letter portrait;
        margin: 6mm 6mm 12mm;
        @bottom-left {
          content: "${cssContent(footerMessage)}";
          color: var(--color-muted-text);
          font-family: "Inter", sans-serif;
          font-size: 7px;
          padding-left: 4mm;
          text-align: left;
        }
        @bottom-right {
          content: "${cssContent(generatedAt)} · Page " counter(page) " of " counter(pages);
          color: var(--color-muted-text);
          font-family: "Inter", sans-serif;
          font-size: 7px;
          padding-right: 4mm;
          text-align: right;
        }
      }
    }`;
  }, []);

  useEffect(() => {
    window.addEventListener('beforeprint', configurePrintPage);
    return () => window.removeEventListener('beforeprint', configurePrintPage);
  }, [configurePrintPage]);

  const printDocument = useCallback(() => {
    if (!documentRef.current) return;
    document.querySelectorAll<HTMLElement>('.professional-print-document[data-print-active="true"]')
      .forEach(element => element.removeAttribute('data-print-active'));
    documentRef.current.setAttribute('data-print-active', 'true');
    const generatedAt = new Date().toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const generatedAtElement = documentRef.current.querySelector<HTMLElement>('.print-generated-at');
    if (generatedAtElement) generatedAtElement.textContent = `Generated: ${generatedAt}`;
    let ancestor = documentRef.current.parentElement;
    while (ancestor) {
      ancestor.setAttribute('data-print-ancestor', 'true');
      if (ancestor === document.body) break;
      ancestor = ancestor.parentElement;
    }
    configurePrintPage();
    const activeDocument = documentRef.current;
    const clearActiveDocument = () => {
      activeDocument.removeAttribute('data-print-active');
      document.querySelectorAll<HTMLElement>('[data-print-ancestor="true"]')
        .forEach(element => element.removeAttribute('data-print-ancestor'));
    };
    window.addEventListener('afterprint', clearActiveDocument, { once: true });
    window.requestAnimationFrame(() => window.print());
  }, [configurePrintPage]);

  return { documentRef, printDocument };
}
