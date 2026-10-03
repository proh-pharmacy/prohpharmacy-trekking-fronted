import React, { useState } from 'react';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';
import { FlatModal } from '../../../components/overlay/FlatModal';
import { fieldApi } from './api';

export type DriverDocumentKind = 'sheet' | 'report' | 'snapshot';

interface Props {
  visible: boolean;
  onHide: () => void;
  token: string;
  trekStatus: string;
  online: boolean;
}

interface DocumentRowProps {
  icon: string;
  title: string;
  description: string;
  disabled?: boolean;
  disabledReason?: string;
  loading: boolean;
  onDownload: () => void;
}

const DocumentRow: React.FC<DocumentRowProps> = ({
  icon,
  title,
  description,
  disabled,
  disabledReason,
  loading,
  onDownload,
}) => (
  <div
    className={`flex items-center gap-4 border-b border-portal-border/40 py-4 last:border-b-0 ${
      disabled ? 'opacity-50' : ''
    }`}
  >
    <i className={`${icon} shrink-0 text-xl text-red-400`} aria-hidden="true" />
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium text-portal-heading">{title}</p>
      <p className="mt-0.5 text-xs text-portal-muted">{description}</p>
      {disabled && disabledReason && (
        <p className="mt-1 text-[11px] text-portal-muted">{disabledReason}</p>
      )}
    </div>
    <button
      type="button"
      onClick={onDownload}
      disabled={disabled || loading}
      className="shrink-0 text-xs font-medium text-portal-accent hover:underline disabled:cursor-not-allowed disabled:text-portal-muted disabled:no-underline"
    >
      {loading ? 'Downloading…' : 'Download'}
    </button>
  </div>
);

export const DriverDocumentsModal: React.FC<Props> = ({
  visible,
  onHide,
  token,
  trekStatus,
  online,
}) => {
  const [busy, setBusy] = useState<DriverDocumentKind | null>(null);
  const snapshotEnabled = trekStatus === 'Completed';

  const download = async (
    kind: DriverDocumentKind,
    fn: (token: string) => Promise<{ blob: Blob; filename: string }>,
    label: string,
  ) => {
    if (!online) {
      toast.error('Connect to the internet to download this document.');
      return;
    }
    setBusy(kind);
    try {
      const { blob, filename } = await fn(token);
      saveAs(blob, filename);
      toast.success(`${label} downloaded.`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || `Could not download the ${label.toLowerCase()}.`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <FlatModal visible={visible} onHide={onHide} title="Download documents" size="md">
      <div className="px-2 py-3">
        {!online && (
          <p className="mb-4 text-xs text-portal-muted">
            You&apos;re offline. Reconnect to download documents.
          </p>
        )}

        <div>
          <DocumentRow
            icon="pi pi-file-pdf"
            title="Delivery sheet"
            description="Itinerary with stops, products and planned quantities."
            loading={busy === 'sheet'}
            onDownload={() =>
              void download('sheet', fieldApi.downloadDriverSheet, 'Delivery sheet')
            }
          />

          <DocumentRow
            icon="pi pi-file-pdf"
            title="Financial report"
            description="Sales, collections, balances and refunds."
            loading={busy === 'report'}
            onDownload={() =>
              void download('report', fieldApi.downloadDriverReport, 'Financial report')
            }
          />

          <DocumentRow
            icon="pi pi-file-pdf"
            title="Stock snapshot"
            description="End-of-trek stock reconciliation."
            disabled={!snapshotEnabled}
            disabledReason={snapshotEnabled ? undefined : 'Available after the trek is completed.'}
            loading={busy === 'snapshot'}
            onDownload={() =>
              void download('snapshot', fieldApi.downloadDriverStockSnapshot, 'Stock snapshot')
            }
          />
        </div>
      </div>
    </FlatModal>
  );
};

export default DriverDocumentsModal;
