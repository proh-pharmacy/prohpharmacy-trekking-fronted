import { useRef, useState } from 'react';
import { saveAs } from 'file-saver';
import { getApiError, treksApi, type Trek } from '../../../../api-client';
import { FlatModal } from '../../../../components/overlay';

const DOCUMENTS = [
  { kind: 'sheet', title: 'Delivery sheet', description: 'Itinerary with stops, products and planned quantities.', filename: 'TrekkingSheet' },
  { kind: 'report', title: 'Financial report', description: 'Sales, collections, balances and refunds.', filename: 'TrekReport' },
  { kind: 'snapshot', title: 'Stock snapshot', description: 'End-of-trek stock reconciliation.', filename: 'TrekStockSnapshot' },
] as const;

type DocumentKind = typeof DOCUMENTS[number]['kind'];

export function TrekDocumentsModal({ visible, onHide, trek }: {
  visible: boolean;
  onHide: () => void;
  trek: Trek;
}) {
  const [busy, setBusy] = useState<DocumentKind | null>(null);
  const [error, setError] = useState('');
  const downloading = useRef(false);

  const download = async (document: typeof DOCUMENTS[number]) => {
    if (downloading.current || (document.kind === 'snapshot' && trek.status !== 'Completed')) return;
    downloading.current = true;
    setBusy(document.kind);
    setError('');
    try {
      const blob = await treksApi.downloadDocument(trek.id, document.kind);
      saveAs(blob, `${document.filename}-${trek.trekNumber}-${trek.scheduledDate}.pdf`);
    } catch (cause) {
      const body = (cause as { response?: { data?: unknown } })?.response?.data;
      let message = getApiError(cause)?.message;
      if (body instanceof Blob) {
        try {
          const detail = JSON.parse(await body.text());
          message = detail.detail || detail.message || detail.title || message;
        } catch { /* Use the request error if the response is not JSON. */ }
      }
      setError(message || `Could not download the ${document.title.toLowerCase()}.`);
    } finally {
      downloading.current = false;
      setBusy(null);
    }
  };

  return (
    <FlatModal visible={visible} onHide={() => { if (!busy) { setError(''); onHide(); } }} closable={!busy} title="Download documents" size="md">
      <div className="px-2 py-3">
        {DOCUMENTS.map((document) => {
          const unavailable = document.kind === 'snapshot' && trek.status !== 'Completed';
          return (
            <div key={document.kind} className={`flex items-center gap-4 border-b border-portal-border/40 py-4 last:border-b-0 ${unavailable ? 'opacity-50' : ''}`}>
              <i className="pi pi-file-pdf shrink-0 text-xl text-red-accent" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-portal-heading">{document.title}</p>
                <p className="mt-0.5 text-xs text-portal-muted">{document.description}</p>
                {unavailable && <p className="mt-1 text-[11px] text-portal-muted">Available after the trek is completed.</p>}
              </div>
              <button type="button" disabled={unavailable || Boolean(busy)} onClick={() => void download(document)} className="shrink-0 text-xs font-medium text-portal-accent hover:underline disabled:cursor-not-allowed disabled:text-portal-muted disabled:no-underline">
                {busy === document.kind ? 'Downloading…' : 'Download'}
              </button>
            </div>
          );
        })}
        {error && <p role="alert" className="mt-3 text-xs text-red-accent">{error}</p>}
      </div>
    </FlatModal>
  );
}
