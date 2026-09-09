import React, { useState, useEffect, useCallback } from 'react';
import { FlatModal } from '../../../../components/overlay';
import { FlatButton } from '../../../../components/flat-form';
import { FlatConfirmDialog } from '../../../../components/overlay';
import { treksApi, type Trek, type TrekStatus, type TrekStop } from '../../../../api-client';
import { AddStopModal } from './AddStopModal';
import { EditTrekModal } from './EditTrekModal';
import { resetTableData } from '../../../../components/data-table';
import toast from 'react-hot-toast';

const STATUS_STYLES: Record<TrekStatus, string> = {
  Draft:      'bg-portal-surface text-portal-muted border border-portal-border',
  Scheduled:  'bg-blue-900/40 text-blue-400 border border-blue-800',
  InProgress: 'bg-yellow-900/40 text-yellow-400 border border-yellow-800',
  Completed:  'bg-green-900/40 text-portal-accent border border-green-800',
  Cancelled:  'bg-red-900/40 text-red-400 border border-red-800',
};

const STATUS_LABELS: Record<TrekStatus, string> = {
  Draft: 'Draft', Scheduled: 'Scheduled', InProgress: 'In Progress',
  Completed: 'Completed', Cancelled: 'Cancelled',
};

const NEXT_STATUSES: Partial<Record<TrekStatus, TrekStatus[]>> = {
  Draft:      ['Scheduled', 'Cancelled'],
  Scheduled:  ['InProgress', 'Cancelled'],
  InProgress: ['Completed'],
};

const NEXT_LABELS: Partial<Record<TrekStatus, string>> = {
  Scheduled: 'Mark Scheduled', InProgress: 'Start Trek', Completed: 'Mark Completed', Cancelled: 'Cancel Trek',
};

interface Props {
  visible: boolean;
  onHide: () => void;
  trekId: string | null;
  onUpdated?: () => void;
}

export const TrekDetailModal: React.FC<Props> = ({ visible, onHide, trekId, onUpdated }) => {
  const [trek, setTrek]             = useState<Trek | null>(null);
  const [loading, setLoading]       = useState(false);
  const [addStopVisible, setAddStopVisible]   = useState(false);
  const [editVisible, setEditVisible]         = useState(false);
  const [removingStop, setRemovingStop]     = useState<TrekStop | null>(null);
  const [changingStatus, setChangingStatus] = useState<TrekStatus | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [driverLink, setDriverLink]         = useState<string | null>(null);

  const loadTrek = useCallback(async () => {
    if (!trekId) return;
    setLoading(true);
    try {
      const data = await treksApi.getTrek(trekId);
      setTrek(data);
    } catch {
      toast.error('Failed to load trek details.');
    } finally {
      setLoading(false);
    }
  }, [trekId]);

  useEffect(() => {
    if (visible && trekId) { setDriverLink(null); loadTrek(); }
  }, [visible, trekId, loadTrek]);

  const handleStatusChange = async (status: TrekStatus) => {
    if (!trek) return;
    setChangingStatus(status);
    try {
      const updated = await treksApi.changeStatus(trek.id, status);
      setTrek(updated);
      resetTableData();
      onUpdated?.();
      toast.success(`Trek ${STATUS_LABELS[status].toLowerCase()}.`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update status.');
    } finally {
      setChangingStatus(null);
    }
  };

  const handleRemoveStop = async () => {
    if (!trek || !removingStop) return;
    try {
      await treksApi.removeStop(trek.id, removingStop.stopId);
      setRemovingStop(null);
      await loadTrek();
      toast.success('Stop removed.');
    } catch {
      toast.error('Failed to remove stop.');
    }
  };

  const handleGenerateLink = async () => {
    if (!trek) return;
    setGeneratingLink(true);
    try {
      const result = await treksApi.generateLink(trek.id);
      setDriverLink(result.url);
      await navigator.clipboard.writeText(result.url).catch(() => {});
      toast.success('Driver link generated and copied to clipboard.');
    } catch {
      toast.error('Failed to generate link.');
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!trek) return;
    setDownloadingPdf(true);
    try {
      const blob = await treksApi.downloadPdf(trek.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TrekkingSheet-${trek.trekNumber}-${trek.scheduledDate}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download PDF.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const isLocked = trek?.status === 'Completed' || trek?.status === 'Cancelled';
  const nextStatuses = trek ? (NEXT_STATUSES[trek.status] ?? []) : [];

  return (
    <>
      <FlatModal
        visible={visible}
        onHide={onHide}
        title={trek ? `Trek — ${trek.trekNumber}` : 'Trek Details'}
        subtitle={trek ? `${trek.branchName} · ${trek.scheduledDate}` : undefined}
        badge={trek ? STATUS_LABELS[trek.status] : undefined}
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full gap-3">
            <div className="flex items-center gap-2">
              {nextStatuses.map((s) => (
                <FlatButton
                  key={s}
                  variant={s === 'Cancelled' ? 'danger-outline' : s === 'Completed' ? 'primary' : 'outline'}
                  size="sm"
                  label={changingStatus === s ? 'Updating...' : (NEXT_LABELS[s] ?? s)}
                  onClick={() => handleStatusChange(s)}
                  loading={changingStatus === s}
                  disabled={!!changingStatus}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              {!isLocked && trek && (
                <FlatButton variant="outline" size="sm" leftIcon="pi pi-pencil" onClick={() => setEditVisible(true)}>
                  Edit
                </FlatButton>
              )}
              <FlatButton variant="outline" label="Close" onClick={onHide} />
            </div>
          </div>
        }
      >
        {loading && (
          <div className="flex items-center justify-center py-12 gap-2 text-portal-muted text-xs">
            <i className="pi pi-spin pi-spinner" /> Loading...
          </div>
        )}

        {!loading && trek && (
          <div className="space-y-5 py-1">
            {/* Trek info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Driver',   value: trek.driverName },
                { label: 'Vehicle',  value: trek.vehicleDisplayName },
                { label: 'Branch',   value: trek.branchName },
                { label: 'Status',   value: (
                  <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${STATUS_STYLES[trek.status]}`}>
                    {STATUS_LABELS[trek.status]}
                  </span>
                )},
              ].map(({ label, value }) => (
                <div key={label} className="bg-portal-canvas border border-portal-border/60 rounded p-2.5">
                  <p className="text-[10px] text-portal-muted uppercase tracking-wide mb-1">{label}</p>
                  <div className="text-xs text-white font-medium">{value}</div>
                </div>
              ))}
            </div>

            {trek.notes && (
              <p className="text-[11px] text-portal-muted italic border-l-2 border-portal-border pl-3">{trek.notes}</p>
            )}

            {/* Actions row */}
            <div className="flex items-center gap-2 flex-wrap">
              <FlatButton
                variant="outline"
                size="sm"
                leftIcon="pi pi-link"
                onClick={handleGenerateLink}
                loading={generatingLink}
                disabled={generatingLink || trek.status === 'Cancelled'}
              >
                {generatingLink ? 'Generating...' : 'Driver Link'}
              </FlatButton>
              <FlatButton
                variant="outline"
                size="sm"
                leftIcon="pi pi-file-pdf"
                onClick={handleDownloadPdf}
                loading={downloadingPdf}
                disabled={downloadingPdf}
              >
                {downloadingPdf ? 'Downloading...' : 'Download PDF'}
              </FlatButton>
              {driverLink && (
                <a
                  href={driverLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-portal-accent hover:underline font-mono truncate max-w-xs"
                >
                  {driverLink}
                </a>
              )}
            </div>

            {/* Stops */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  Stops <span className="text-portal-muted font-normal normal-case tracking-normal ml-1">({trek.stops.length})</span>
                </span>
                {!isLocked && (
                  <FlatButton
                    variant="outline"
                    size="sm"
                    leftIcon="pi pi-plus"
                    onClick={() => setAddStopVisible(true)}
                  >
                    Add Stop
                  </FlatButton>
                )}
              </div>

              {trek.stops.length === 0 ? (
                <div className="text-center py-8 text-portal-muted text-xs border border-dashed border-portal-border rounded">
                  No stops yet. Add your first stop.
                </div>
              ) : (
                <div className="space-y-3">
                  {[...trek.stops].sort((a, b) => a.sequence - b.sequence).map((stop) => (
                    <div key={stop.stopId} className="bg-portal-canvas border border-portal-border/60 rounded p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <span className="shrink-0 w-6 h-6 rounded-full bg-portal-surface border border-portal-border text-[11px] font-bold text-portal-accent flex items-center justify-center">
                            {stop.sequence}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-white">{stop.customerName}</p>
                            <p className="font-mono text-[11px] text-portal-accent">{stop.customerCode}</p>
                            {(stop.primaryLocationLandmark || stop.primaryLocationStreet) && (
                              <p className="text-[11px] text-portal-muted mt-0.5 truncate">
                                {stop.primaryLocationLandmark || stop.primaryLocationStreet}
                              </p>
                            )}
                            {stop.notes && (
                              <p className="text-[11px] text-portal-muted italic mt-0.5">{stop.notes}</p>
                            )}
                            {stop.products.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {stop.products.map((p) => (
                                  <div key={p.productId} className="flex items-center gap-2 text-[11px]">
                                    <i className="pi pi-box text-[10px] text-portal-muted" />
                                    <span className="text-portal-text">{p.productName}</span>
                                    <span className="text-portal-accent font-mono">×{p.plannedQuantity}</span>
                                    {p.unit && <span className="text-portal-muted">{p.unit}</span>}
                                    {p.qtyDelivered != null && (
                                      <span className="text-portal-accent ml-1">({p.qtyDelivered} delivered)</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        {!isLocked && (
                          <button
                            type="button"
                            onClick={() => setRemovingStop(stop)}
                            className="shrink-0 text-portal-muted hover:text-red-400 transition-colors p-1"
                            title="Remove stop"
                          >
                            <i className="pi pi-trash text-xs" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </FlatModal>

      {trek && (
        <EditTrekModal
          visible={editVisible}
          onHide={() => setEditVisible(false)}
          trek={trek}
          onSuccess={(updated) => setTrek(updated)}
        />
      )}

      {trek && (
        <AddStopModal
          visible={addStopVisible}
          onHide={() => setAddStopVisible(false)}
          trekId={trek.id}
          nextSequence={trek.stops.length + 1}
          onSuccess={loadTrek}
        />
      )}

      <FlatConfirmDialog
        visible={!!removingStop}
        onHide={() => setRemovingStop(null)}
        onConfirm={handleRemoveStop}
        title="Remove Stop"
        message={`Remove stop for ${removingStop?.customerName}? This cannot be undone.`}
        confirmLabel="Remove"
        variant="danger"
      />
    </>
  );
};

export default TrekDetailModal;
