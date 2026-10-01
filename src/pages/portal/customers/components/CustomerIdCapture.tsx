import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  ID_DOCUMENT_TYPES,
  idDocumentLabel,
  idDocumentSides,
  supportsCardScanner,
  validateIdImage,
  type CustomerPhotos,
  type IdDocumentType,
} from '../../../../api-client/customerDocuments';
import { FlatButton, FlatDropdown, FlatInputText } from '../../../../components/flat-form';
import { formatGhanaCardNumber } from '../../../../lib/utils';
import { IdCardScannerModal } from './IdCardScannerModal';

function DocumentPhoto({
  side,
  file,
  pendingFile,
  savedUrl,
  disabled,
  onChange,
}: {
  side: 'front' | 'back';
  file?: File;
  pendingFile?: File;
  savedUrl?: string | null;
  disabled: boolean;
  onChange: (file?: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [viewing, setViewing] = useState(false);
  const source = file || pendingFile;
  const localPreview = useMemo(() => source ? URL.createObjectURL(source) : null, [source]);
  useEffect(() => () => {
    if (localPreview) URL.revokeObjectURL(localPreview);
  }, [localPreview]);

  const preview = localPreview || savedUrl || null;
  const title = `ID document ${side}`;
  const displayName = file?.name || pendingFile?.name || title;

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => (preview ? setViewing(true) : inputRef.current?.click())}
        disabled={disabled}
        className="group relative h-16 w-16 shrink-0 overflow-hidden rounded border-2 border-dashed border-portal-border bg-portal-canvas transition-colors hover:border-portal-accent disabled:cursor-not-allowed disabled:opacity-60"
        aria-label={preview ? `Preview ${title.toLowerCase()}` : `Choose ${title.toLowerCase()}`}
      >
        {preview ? (
          <img src={preview} alt={title} className="h-full w-full object-cover" />
        ) : (
          <i className="pi pi-id-card text-lg text-portal-muted transition-colors group-hover:text-portal-accent" />
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
          <i className={`pi ${preview ? 'pi-search-plus' : 'pi-upload'} text-xs text-white`} />
        </span>
      </button>

      {viewing && preview && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80" onClick={() => setViewing(false)}>
          <div className="relative mx-4 w-full max-w-2xl" onClick={(event) => event.stopPropagation()}>
            <img src={preview} alt={title} className="max-h-[70vh] w-full rounded object-contain" />
            <button type="button" onClick={() => setViewing(false)} className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded bg-black/60 text-white hover:bg-black/80"><i className="pi pi-times text-xs" /></button>
          </div>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-portal-text">{displayName}</p>
        <p className="mt-1 text-[11px] text-portal-muted">JPEG, PNG or WebP · Max 5 MB</p>
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="text-[11px] text-portal-accent hover:text-portal-accent-hover disabled:opacity-60"
          >
            {preview ? 'Change photo' : 'Choose photo'}
          </button>
          {file && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(undefined)}
              className="text-[11px] text-red-400 hover:text-red-300 disabled:opacity-60"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        disabled={disabled}
        onChange={(event) => {
          const selected = event.target.files?.[0];
          event.target.value = '';
          if (!selected) return;
          const error = validateIdImage(selected);
          if (error) {
            toast.error(error);
            return;
          }
          onChange(selected);
        }}
      />
    </div>
  );
}

function CapturedSide({ label, file, savedUrl }: { label: string; file?: File; savedUrl?: string | null }) {
  const [viewing, setViewing] = useState(false);
  const localPreview = useMemo(() => file ? URL.createObjectURL(file) : null, [file]);
  useEffect(() => () => {
    if (localPreview) URL.revokeObjectURL(localPreview);
  }, [localPreview]);

  const preview = localPreview || savedUrl || null;
  if (!preview) return null;
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => setViewing(true)}
        className="group relative h-14 w-20 overflow-hidden rounded border border-portal-border bg-portal-canvas transition-colors hover:border-portal-accent"
        aria-label={`Preview ${label.toLowerCase()}`}
      >
        <img src={preview} alt={label} className="h-full w-full object-cover" />
        <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
          <i className="pi pi-search-plus text-xs text-white" />
        </span>
      </button>
      <span className="text-xs font-medium text-portal-text">{label}</span>
      <i className="pi pi-check text-xs text-portal-accent" aria-hidden="true" />

      {viewing && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80" onClick={() => setViewing(false)}>
          <div className="relative mx-4 w-full max-w-2xl" onClick={(event) => event.stopPropagation()}>
            <img src={preview} alt={label} className="max-h-[70vh] w-full rounded object-contain" />
            <button type="button" onClick={() => setViewing(false)} className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded bg-black/60 text-white hover:bg-black/80"><i className="pi pi-times text-xs" /></button>
          </div>
        </div>
      )}
    </div>
  );
}

export function CustomerIdCapture({
  type,
  number,
  onType,
  onNumber,
  photos,
  onPhotos,
  pendingPhotos,
  frontUrl,
  backUrl,
  disabled,
}: {
  type: IdDocumentType | '';
  number: string;
  onType: (value: IdDocumentType) => void;
  onNumber: (value: string) => void;
  photos: CustomerPhotos;
  onPhotos: (photos: CustomerPhotos) => void;
  pendingPhotos?: CustomerPhotos;
  frontUrl?: string | null;
  backUrl?: string | null;
  disabled: boolean;
}) {
  const [scanning, setScanning] = useState(false);
  const sides = useMemo(() => idDocumentSides(type), [type]);
  const showBack = sides.back !== 'none';
  const canScan = supportsCardScanner(type);
  const manual = !canScan;
  useEffect(() => {
    if (!showBack && (photos.idBack || pendingPhotos?.idBack)) {
      onPhotos({ ...photos, idBack: undefined });
    }
  }, [showBack, photos, pendingPhotos, onPhotos]);
  const hasCapturedImages = Boolean(photos.idFront || frontUrl || (showBack && (photos.idBack || backUrl)));
  const docLabel = idDocumentLabel(type);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FlatDropdown
          label="Document type"
          size="sm"
          value={type}
          disabled={disabled}
          placeholder="Select document type"
          onChange={onType}
          options={ID_DOCUMENT_TYPES.map((value) => ({
            value,
            label: value.replace(/([a-z])([A-Z])/g, '$1 $2'),
          }))}
        />
        <FlatInputText
          label="Document number"
          size="sm"
          value={number}
          maxLength={type === 'GhanaCard' ? 30 : 100}
          disabled={disabled}
          placeholder={type === 'GhanaCard' ? 'GHA-...' : 'Enter document number'}
          onChange={(event) =>
            onNumber(
              type === 'GhanaCard'
                ? formatGhanaCardNumber(event.target.value)
                : event.target.value,
            )
          }
        />
      </div>

      {!type ? (
        <p className="text-[11px] text-portal-muted">Select a document type to add photos.</p>
      ) : canScan ? (
        <div className="flex flex-wrap items-center gap-3">
          <FlatButton
            size="sm"
            variant="primary"
            leftIcon="pi pi-camera"
            disabled={disabled || scanning}
            onClick={() => setScanning(true)}
          >
            {hasCapturedImages ? `Scan ${docLabel} again` : `Scan ${docLabel}`}
          </FlatButton>
        </div>
      ) : (
        <p className="text-[11px] text-portal-muted">Upload a clear photo of the {docLabel}.</p>
      )}

      {type && (manual ? (
        <div className={`grid grid-cols-1 gap-4 ${showBack ? 'sm:grid-cols-2' : ''}`}>
          <DocumentPhoto
            side="front"
            file={photos.idFront}
            pendingFile={pendingPhotos?.idFront}
            savedUrl={frontUrl}
            disabled={disabled}
            onChange={(idFront) => onPhotos({ ...photos, idFront })}
          />
          {showBack && (
            <DocumentPhoto
              side="back"
              file={photos.idBack}
              pendingFile={pendingPhotos?.idBack}
              savedUrl={backUrl}
              disabled={disabled}
              onChange={(idBack) => onPhotos({ ...photos, idBack })}
            />
          )}
        </div>
      ) : hasCapturedImages ? (
        <div className="flex flex-wrap gap-6">
          <CapturedSide label="Front" file={photos.idFront || pendingPhotos?.idFront} savedUrl={frontUrl} />
          {showBack && <CapturedSide label="Back" file={photos.idBack || pendingPhotos?.idBack} savedUrl={backUrl} />}
        </div>
      ) : null)}

      {scanning && (
        <IdCardScannerModal
          documentType={type}
          onClose={() => setScanning(false)}
          onComplete={(result) => {
            onPhotos({ ...photos, ...result });
            setScanning(false);
          }}
        />
      )}
    </div>
  );
}
