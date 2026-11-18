import React, { useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import ReactCrop, { type Crop, type PercentCrop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { FlatConfirmDialog, FlatModal } from '../../../../components/overlay';
import { resetTableData } from '../../../../components/data-table';
import {
  FlatAsyncSelect,
  FlatButton,
  FlatCheckbox,
  FlatDropdown,
  FlatInputNumber,
  FlatTextarea,
} from '../../../../components/flat-form';
import {
  getApiError,
  vehicleStockApi,
  type Product,
  type ProductMatchCandidate,
  type ProductMatchJobAccepted,
  type ProductMatchJobStatus,
  type ProductMatchResult,
  type ProductMatchSummary,
  productsApi,
  type ProductMatchRow,
  type StockLineItem,
} from '../../../../api-client';
import { ProductModal } from '../../products/components/ProductModal';
import {
  sortItemsByConfidence,
  sortItemsForDefaultReview,
  type ConfidenceSortDirection,
} from './confidenceSort';
import { reviewBasicQuantity } from './matchReviewQuantity';

type Mode = 'load' | 'remove';
type ReviewStatusFilter = 'All' | 'AutoCreated' | 'Unmatched' | 'Ambiguous' | 'Suggested' | 'Exact' | 'Manual';

const REDUCTION_REASON_OPTIONS = [
  { label: 'Damaged goods', value: 'Damaged goods' },
  { label: 'Expired stock', value: 'Expired stock' },
  { label: 'Inventory correction', value: 'Inventory correction' },
  { label: 'Returned to warehouse', value: 'Returned to warehouse' },
  { label: 'Lost or missing stock', value: 'Lost or missing stock' },
  { label: 'Other', value: 'Other' },
];

interface StagedItem {
  productId: string;
  productName: string;
  basicUnitName?: string | null;
  packagingUnitName?: string | null;
  basicQty: number;
  packagingQty: number;
  basicUnitPrice: number | null;
  beforeBasic: number;
  beforePackaging: number;
}

interface ReviewItem {
  id: string;
  source: ProductMatchRow;
  productId: string;
  productName: string;
  basicUnitName: string | null;
  packagingUnitName: string | null;
  basicQty: number | null;
  packagingQty: number | null;
  basicUnitPrice: number | null;
  selectedProduct: Product | null;
}

interface ReviewValidationError {
  id: string;
  field: 'productId' | 'basicQty' | 'packagingQty' | 'basicUnitPrice';
  message: string;
}

const hasAtMostTwoDecimalPlaces = (value: number) => {
  const roundedToCents = Math.round((value + Number.EPSILON) * 100) / 100;
  return Math.abs(value - roundedToCents) < 1e-9;
};

const TERMINAL_MATCH_STATUSES = new Set(['Completed', 'PartiallyCompleted', 'Failed']);
const MATCH_JOB_POLL_INTERVAL_MS = 500;

const waitForPollingDelay = (milliseconds: number, signal: AbortSignal) => new Promise<void>((resolve, reject) => {
  if (signal.aborted) {
    reject(new DOMException('Document matching polling stopped.', 'AbortError'));
    return;
  }
  const handleAbort = () => {
    window.clearTimeout(timeoutId);
    reject(new DOMException('Document matching polling stopped.', 'AbortError'));
  };
  const timeoutId = window.setTimeout(() => {
    signal.removeEventListener('abort', handleAbort);
    resolve();
  }, milliseconds);
  signal.addEventListener('abort', handleAbort, { once: true });
});

const isRequestCancelled = (error: unknown) => (
  (error instanceof DOMException && error.name === 'AbortError')
  || (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ERR_CANCELED')
);

const responseStatus = (error: unknown) => (
  typeof error === 'object' && error !== null && 'response' in error
    ? (error as { response?: { status?: number } }).response?.status
    : undefined
);

const formatUploadFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const canAutoCreateProductsFromFiles = (files: File[]) => (
  files.length > 0 && files.every((file) => /\.(xlsx|pdf)$/i.test(file.name))
);

const cropImageFile = async (file: File, crop: PixelCrop, image: HTMLImageElement): Promise<File> => {
  const canvas = document.createElement('canvas');
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  canvas.width = Math.max(1, Math.round(crop.width * scaleX));
  canvas.height = Math.max(1, Math.round(crop.height * scaleY));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not prepare the cropped image.');
  context.drawImage(image, crop.x * scaleX, crop.y * scaleY, crop.width * scaleX, crop.height * scaleY, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.92));
  if (!blob) throw new Error('Could not create the cropped image.');
  return new File([blob], file.name, { type: blob.type });
};

const matchIndicator = (row: ProductMatchRow) => {
  const score = row.candidates?.[0]?.similarityScore;
  if (row.matchStatus === 'Unmatched') return { score: null, color: 'text-red-accent' };
  if (row.matchStatus === 'Ambiguous') return { score: score ?? null, color: 'text-red-accent' };
  if (score == null) return { score: null, color: 'text-portal-muted' };
  if (row.matchStatus === 'Suggested') return { score, color: score >= 85 ? 'text-portal-orange' : 'text-red-accent' };
  if (score >= 95) return { score, color: 'text-portal-accent' };
  if (score >= 85) return { score, color: 'text-portal-orange' };
  return { score, color: 'text-red-accent' };
};

const isAutoCreatedRow = (row: ProductMatchRow) => (
  row.autoCreated === true || row.matchStatus === 'AutoCreated'
);

const candidateAsProduct = (
  candidate: ProductMatchCandidate | undefined,
  basicUnitPrice: number | null,
): Product | null => candidate ? {
  id: candidate.productId,
  name: candidate.name,
  description: null,
  basicUnitId: candidate.basicUnitId || '',
  basicUnitName: candidate.basicUnitName || '',
  basicUnitPrice: basicUnitPrice ?? 0,
  vehicleBasicUnitPrice: basicUnitPrice,
  packagingUnitId: candidate.packagingUnitId || null,
  packagingUnitName: candidate.packagingUnitName || null,
  packagingUnitPrice: null,
  isActive: true,
} : null;

interface ReviewTableTooltipHandle {
  show: (item: ReviewItem, target: HTMLElement) => void;
  scheduleHide: () => void;
  hideImmediate: () => void;
}

const ReviewTableTooltip = React.forwardRef<ReviewTableTooltipHandle>((_, ref) => {
  const [item, setItem] = useState<ReviewItem | null>(null);
  const [visible, setVisible] = useState(false);
  const [animateMove, setAnimateMove] = useState(false);
  const [coords, setCoords] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const tooltipElRef = useRef<HTMLDivElement | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const activeTargetRef = useRef<HTMLElement | null>(null);
  const visibleRef = useRef(false);

  const computeWindowSafeCoords = (target: HTMLElement, measuredEl?: HTMLDivElement | null) => {
    const MARGIN = 12;
    const GAP = 8;
    const rect = target.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const tooltipWidth = measuredEl?.offsetWidth || Math.min(280, viewportWidth - MARGIN * 2);
    const tooltipHeight = measuredEl?.offsetHeight || 140;

    const x = Math.min(
      Math.max(MARGIN, rect.left),
      Math.max(MARGIN, viewportWidth - tooltipWidth - MARGIN),
    );

    const spaceAbove = rect.top - GAP - MARGIN;
    const spaceBelow = viewportHeight - rect.bottom - GAP - MARGIN;
    const placeBelow = spaceAbove < tooltipHeight && spaceBelow > spaceAbove;
    const rawY = placeBelow
      ? rect.bottom + GAP
      : rect.top - GAP - tooltipHeight;
    const y = Math.min(
      Math.max(MARGIN, rawY),
      Math.max(MARGIN, viewportHeight - tooltipHeight - MARGIN),
    );

    return { x, y };
  };

  const clearTimers = () => {
    if (hideTimerRef.current != null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (rafRef.current != null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const hideNow = () => {
    clearTimers();
    activeTargetRef.current = null;
    visibleRef.current = false;
    setVisible(false);
    setAnimateMove(false);
  };

  useEffect(() => () => clearTimers(), []);

  useEffect(() => {
    if (!visible) return undefined;
    const handleScrollOrWheel = () => {
      hideNow();
    };
    window.addEventListener('scroll', handleScrollOrWheel, { capture: true, passive: true });
    window.addEventListener('wheel', handleScrollOrWheel, { capture: true, passive: true });
    return () => {
      window.removeEventListener('scroll', handleScrollOrWheel, { capture: true });
      window.removeEventListener('wheel', handleScrollOrWheel, { capture: true });
    };
  }, [visible]);

  useLayoutEffect(() => {
    if (!visible || !activeTargetRef.current || !tooltipElRef.current) return;
    const next = computeWindowSafeCoords(activeTargetRef.current, tooltipElRef.current);
    setCoords((prev) => (prev.x === next.x && prev.y === next.y ? prev : next));
  }, [item, visible]);

  useImperativeHandle(ref, () => ({
    show: (nextItem: ReviewItem, target: HTMLElement) => {
      if (hideTimerRef.current != null) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }

      const wasVisible = visibleRef.current;
      activeTargetRef.current = target;
      setItem(nextItem);
      setCoords(computeWindowSafeCoords(target, tooltipElRef.current));

      if (!wasVisible) {
        setAnimateMove(false);
        setVisible(true);
        visibleRef.current = true;
        if (rafRef.current != null) window.cancelAnimationFrame(rafRef.current);
        rafRef.current = window.requestAnimationFrame(() => {
          setAnimateMove(true);
          rafRef.current = null;
        });
      } else {
        setAnimateMove(true);
        setVisible(true);
      }
    },
    scheduleHide: () => {
      if (hideTimerRef.current != null) window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = window.setTimeout(() => {
        activeTargetRef.current = null;
        visibleRef.current = false;
        setVisible(false);
        setAnimateMove(false);
        hideTimerRef.current = null;
      }, 90);
    },
    hideImmediate: () => {
      hideNow();
    },
  }), []);

  if (!item || typeof document === 'undefined') return null;

  const row = item.source;
  const isAutoCreated = isAutoCreatedRow(row);
  const isManual = row.matchStatus === 'Manual';
  const indicator = matchIndicator(row);
  const statusText = isAutoCreated
    ? 'Newly created'
    : isManual
      ? 'Added manually'
      : row.matchStatus === 'Ambiguous'
        ? 'Ambiguous match'
        : row.matchStatus === 'Suggested'
          ? 'Suggested match'
          : row.matchStatus === 'Unmatched'
            ? 'Unmatched'
            : 'Exact match';
  const statusColor = isAutoCreated
    ? 'text-portal-accent'
    : isManual
      ? 'text-portal-muted'
      : indicator.color;

  const locationParts = [
    row.page != null ? `Page ${row.page}` : null,
    row.row != null ? `Row ${row.row}` : null,
  ].filter(Boolean).join(' · ');

  const showCandidates = !isAutoCreated && !isManual && (
    row.candidates?.length > 1
    || ((row.matchStatus === 'Ambiguous' || row.matchStatus === 'Suggested') && row.candidates?.length > 0)
  );
  const topCandidates = showCandidates ? row.candidates.slice(0, 3) : [];
  const warnings = row.warnings?.filter(Boolean) || [];

  return createPortal(
    <div
      ref={tooltipElRef}
      role="tooltip"
      aria-hidden={!visible}
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        width: 280,
        maxWidth: 'calc(100vw - 24px)',
        maxHeight: 'calc(100vh - 24px)',
        transform: `translate3d(${Math.round(coords.x)}px, ${Math.round(coords.y)}px, 0)`,
        transition: animateMove
          ? 'transform 170ms cubic-bezier(0.22, 1, 0.36, 1), opacity 130ms ease'
          : 'opacity 130ms ease',
        willChange: 'transform, opacity',
        zIndex: 9999,
      }}
      className={`pointer-events-none overflow-hidden rounded border border-portal-border bg-portal-surface px-3 py-2.5 shadow-xl ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <p className="break-words text-xs font-semibold leading-snug text-portal-heading">
        {row.extractedName || item.productName || 'Added manually'}
      </p>
      <div className="mt-1 flex items-center justify-between gap-3 text-[11px]">
        <span className={`font-medium ${statusColor}`}>
          {statusText}
          {indicator.score != null && !isAutoCreated && !isManual ? ` · ${Math.round(indicator.score)}%` : ''}
        </span>
        {locationParts && (
          <span className="shrink-0 text-portal-muted">{locationParts}</span>
        )}
      </div>

      {topCandidates.length > 0 && (
        <div className="mt-2 space-y-1 border-t border-portal-border/50 pt-2">
          {topCandidates.map((candidate) => (
            <div key={candidate.productId} className="flex items-center justify-between gap-3 text-[11px]">
              <span className="truncate text-portal-text">{candidate.name}</span>
              <span className="shrink-0 font-mono tabular-nums text-portal-muted">
                {Math.round(candidate.similarityScore)}%
              </span>
            </div>
          ))}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="-mx-3 -mb-2.5 mt-2.5 divide-y divide-portal-border/50 border-t border-portal-border/60 text-[11px] leading-snug text-portal-muted">
          {warnings.map((warning, index) => (
            <div
              key={`${warning}-${index}`}
              className="px-3 py-2 odd:bg-portal-canvas/60"
            >
              {warning}
            </div>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
});

interface VehicleStockModalProps {
  visible: boolean;
  onHide: () => void;
  mode: Mode;
  vehicleId: string;
  vehicleName: string;
  onComplete: () => void;
  lockedProduct?: {
    id: string;
    name: string;
    basicUnitName?: string | null;
    packagingUnitName?: string | null;
  } | null;
}

export const VehicleStockModal: React.FC<VehicleStockModalProps> = ({
  visible,
  onHide,
  mode,
  vehicleId,
  vehicleName: _vehicleName,
  onComplete,
  lockedProduct = null,
}) => {
  const queryClient = useQueryClient();
  const isRemove = mode === 'remove';
  const isLocked = !!lockedProduct;
  const title = isRemove ? 'Reduce Stock' : 'Add Stock';

  const [items, setItems] = useState<StagedItem[]>([]);
  const [formOpen, setFormOpen] = useState(isLocked);
  const [reasonSelection, setReasonSelection] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [excludeTracked, setExcludeTracked] = useState(false);
  const [reviewItems, setReviewItems] = useState<ReviewItem[] | null>(null);
  const [confidenceSortDirection, setConfidenceSortDirection] = useState<ConfidenceSortDirection | null>(null);
  const [reviewStatusFilter, setReviewStatusFilter] = useState<ReviewStatusFilter>('All');
  const [createUnmatchedProducts, setCreateUnmatchedProducts] = useState(false);
  const [matchSummary, setMatchSummary] = useState<ProductMatchSummary | null>(null);
  const [reviewValidationError, setReviewValidationError] = useState<ReviewValidationError | null>(null);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [matchJob, setMatchJob] = useState<ProductMatchJobStatus | null>(null);
  const [productModalRowId, setProductModalRowId] = useState<string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropUrl, setCropUrl] = useState('');
  const [cropQueue, setCropQueue] = useState<File[]>([]);
  const [pendingUploadFiles, setPendingUploadFiles] = useState<File[]>([]);
  const [cropIndex, setCropIndex] = useState(0);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const cropImageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const matchAbortRef = useRef<AbortController | null>(null);

  // form state
  const [productId, setProductId] = useState('');
  const [productName, setProductName] = useState('');
  const [productUnits, setProductUnits] = useState<{ basic?: string | null; packaging?: string | null }>({});
  const [basicQty, setBasicQty] = useState<number | null>(null);
  const [packagingQty, setPackagingQty] = useState<number | null>(null);
  const [basicUnitPrice, setBasicUnitPrice] = useState<number | null>(null);

  const [balance, setBalance] = useState<{ basic: number; packaging: number } | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const [pendingReviewRemoveId, setPendingReviewRemoveId] = useState<string | null>(null);
  const [resetListPending, setResetListPending] = useState(false);
  const reviewTooltipRef = useRef<ReviewTableTooltipHandle | null>(null);
  const reviewItemById = useMemo(
    () => new Map((reviewItems || []).map((item) => [item.id, item])),
    [reviewItems],
  );

  const handleReviewTableTriggerEnter = (event: React.SyntheticEvent<HTMLElement>) => {
    const target = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-review-tooltip-id]');
    if (!target) {
      reviewTooltipRef.current?.scheduleHide();
      return;
    }
    const id = target.getAttribute('data-review-tooltip-id');
    const item = id ? reviewItemById.get(id) : undefined;
    if (item) {
      reviewTooltipRef.current?.show(item, target);
    }
  };
  const pendingRemoveItem = useMemo(
    () => items.find((i) => i.productId === pendingRemoveId) || null,
    [items, pendingRemoveId],
  );
  const pendingReviewRemoveItem = useMemo(
    () => reviewItems?.find((item) => item.id === pendingReviewRemoveId) || null,
    [reviewItems, pendingReviewRemoveId],
  );
  const productModalReviewItem = useMemo(
    () => reviewItems?.find((item) => item.id === productModalRowId) || null,
    [reviewItems, productModalRowId],
  );
  const sortedReviewItems = useMemo(
    () => sortItemsByConfidence(reviewItems || [], confidenceSortDirection),
    [reviewItems, confidenceSortDirection],
  );
  const visibleReviewItems = useMemo(
    () => sortedReviewItems.filter((item) => {
      if (reviewStatusFilter === 'All') return true;
      if (reviewStatusFilter === 'AutoCreated') return isAutoCreatedRow(item.source);
      return !isAutoCreatedRow(item.source) && item.source.matchStatus === reviewStatusFilter;
    }),
    [sortedReviewItems, reviewStatusFilter],
  );
  const reviewDisplayIndexById = useMemo(
    () => new Map(visibleReviewItems.map((item, index) => [item.id, index])),
    [visibleReviewItems],
  );
  const reviewFilterChips = useMemo(() => {
    const rows = reviewItems || [];
    let autoCreated = 0;
    let exact = 0;
    let suggested = 0;
    let ambiguous = 0;
    let unmatched = 0;
    let manual = 0;

    for (const item of rows) {
      if (isAutoCreatedRow(item.source)) {
        autoCreated += 1;
      } else if (item.source.matchStatus === 'Exact') {
        exact += 1;
      } else if (item.source.matchStatus === 'Suggested') {
        suggested += 1;
      } else if (item.source.matchStatus === 'Ambiguous') {
        ambiguous += 1;
      } else if (item.source.matchStatus === 'Unmatched') {
        unmatched += 1;
      } else if (item.source.matchStatus === 'Manual') {
        manual += 1;
      }
    }

    const chips: Array<{
      label: string;
      value: ReviewStatusFilter;
      count: number;
      countTone: string;
      activeTone: string;
    }> = [
      { label: 'All', value: 'All', count: rows.length || (matchSummary?.totalRows ?? 0), countTone: 'text-portal-text', activeTone: 'bg-portal-accent/20 text-portal-accent' },
      { label: 'Newly created', value: 'AutoCreated', count: rows.length ? autoCreated : (matchSummary?.autoCreated ?? 0), countTone: 'text-portal-accent', activeTone: 'bg-portal-accent/20 text-portal-accent' },
      { label: 'Exact', value: 'Exact', count: rows.length ? exact : (matchSummary?.exact ?? 0), countTone: 'text-portal-accent', activeTone: 'bg-portal-accent/20 text-portal-accent' },
      { label: 'Suggested', value: 'Suggested', count: rows.length ? suggested : (matchSummary?.suggested ?? 0), countTone: 'text-portal-orange', activeTone: 'bg-portal-orange/20 text-portal-orange' },
      { label: 'Ambiguous', value: 'Ambiguous', count: rows.length ? ambiguous : (matchSummary?.ambiguous ?? 0), countTone: 'text-red-accent', activeTone: 'bg-red-accent/20 text-red-accent' },
      { label: 'Unmatched', value: 'Unmatched', count: rows.length ? unmatched : (matchSummary?.unmatched ?? 0), countTone: 'text-red-accent', activeTone: 'bg-red-accent/20 text-red-accent' },
    ];

    if (manual > 0 || reviewStatusFilter === 'Manual') {
      chips.push({ label: 'Manual', value: 'Manual', count: manual, countTone: 'text-blue-400', activeTone: 'bg-blue-400/20 text-blue-400' });
    }

    return chips;
  }, [reviewItems, matchSummary, reviewStatusFilter]);

  const hasPackaging = !!productUnits.packaging;
  const canAutoCreateMissingProducts = canAutoCreateProductsFromFiles(pendingUploadFiles);

  const resetForm = () => {
    if (isLocked && lockedProduct) {
      setProductId(lockedProduct.id);
      setProductName(lockedProduct.name);
      setProductUnits({
        basic: lockedProduct.basicUnitName ?? null,
        packaging: lockedProduct.packagingUnitName ?? null,
      });
    } else {
      setProductId('');
      setProductName('');
      setProductUnits({});
    }
    setBasicQty(null);
    setPackagingQty(null);
    setBasicUnitPrice(null);
  };

  useEffect(() => {
    reviewTooltipRef.current?.hideImmediate();
    if (!visible) {
      matchAbortRef.current?.abort();
      matchAbortRef.current = null;
      return;
    }
    matchAbortRef.current?.abort();
    matchAbortRef.current = null;
    if (visible) {
      setItems([]);
      setReviewItems(null);
      setConfidenceSortDirection(null);
      setReviewStatusFilter('All');
      setCreateUnmatchedProducts(false);
      setMatchSummary(null);
      setReviewValidationError(null);
      setPendingRemoveId(null);
      setPendingReviewRemoveId(null);
      setResetListPending(false);
      setUploadErrors([]);
      setMatchJob(null);
      setProductModalRowId(null);
      setCropFile(null);
      setCropQueue([]);
      setPendingUploadFiles([]);
      setCropIndex(0);
      setCropUrl('');
      setReasonSelection('');
      setReason('');
      setSubmitting(false);
      setFormOpen(isLocked);
      setExcludeTracked(false);
      if (isLocked && lockedProduct) {
        setProductId(lockedProduct.id);
        setProductName(lockedProduct.name);
        setProductUnits({
          basic: lockedProduct.basicUnitName ?? null,
          packaging: lockedProduct.packagingUnitName ?? null,
        });
      } else {
        setProductId('');
        setProductName('');
        setProductUnits({});
      }
      setBasicQty(null);
      setPackagingQty(null);
      setBasicUnitPrice(null);
      setBalance(null);
      setBalanceLoading(false);
    }
  }, [visible, mode, isLocked, lockedProduct]);

  useEffect(() => () => matchAbortRef.current?.abort(), []);

  useEffect(() => {
    if (!visible || !productId) {
      setBalance(null);
      setBalanceLoading(false);
      setBasicUnitPrice(null);
      return;
    }
    let cancelled = false;
    setBalanceLoading(true);
    setBalance(null);
    vehicleStockApi.getProductStock(vehicleId, productId)
      .then((data) => {
        if (cancelled) return;
        setBalance({
          basic: data.basicQuantityOnHand ?? 0,
          packaging: data.packagingQuantityOnHand ?? 0,
        });
        if (!isRemove) setBasicUnitPrice(data.vehicleBasicUnitPrice ?? null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const apiError = getApiError(err);
        if (apiError?.code === '404' || (err as any)?.response?.status === 404) {
          setBalance({ basic: 0, packaging: 0 });
          if (!isRemove) setBasicUnitPrice(null);
        } else {
          toast.error(apiError?.message || 'Failed to load current balance.');
          setBalance(null);
        }
      })
      .finally(() => { if (!cancelled) setBalanceLoading(false); });
    return () => { cancelled = true; };
  }, [visible, productId, vehicleId, isRemove]);

  const stagedProductIds = useMemo(
    () => new Set(items.map((i) => i.productId)),
    [items],
  );

  const pickerParams = useMemo(() => {
    if (isRemove) return { vehicleId, inStockOnly: true, isActive: true };
    return excludeTracked
      ? { vehicleId, excludeVehicleStock: true, isActive: true }
      : { isActive: true };
  }, [isRemove, vehicleId, excludeTracked]);

  const handleAddToList = () => {
    if (!productId) {
      toast.error('Pick a product.');
      return;
    }
    if (stagedProductIds.has(productId)) {
      toast.error('Product already added.');
      return;
    }
    const basic = basicQty ?? 0;
    const packaging = packagingQty ?? 0;
    if (basic <= 0) {
      toast.error('Basic quantity must be greater than zero.');
      return;
    }
    if (packaging < 0) {
      toast.error('Packaging quantity cannot be negative.');
      return;
    }
    if (!isRemove && basicUnitPrice != null && (
      basicUnitPrice <= 0
      || !hasAtMostTwoDecimalPlaces(basicUnitPrice)
    )) {
      toast.error('Enter a positive basic-unit price with no more than two decimal places, or leave it empty.');
      return;
    }
    if (isRemove && balance && basic > balance.basic) {
      toast.error(`Quantity cannot exceed the current balance of ${balance.basic} ${productUnits.basic || 'basic'}.`);
      return;
    }
    if (isRemove && balance && packaging > balance.packaging) {
      toast.error(`Quantity cannot exceed the current balance of ${balance.packaging} ${productUnits.packaging || 'packaging'}.`);
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        productId,
        productName,
        basicUnitName: productUnits.basic ?? null,
        packagingUnitName: productUnits.packaging ?? null,
        basicQty: basic,
        packagingQty: hasPackaging ? packaging : 0,
        basicUnitPrice: isRemove ? null : basicUnitPrice,
        beforeBasic: balance?.basic ?? 0,
        beforePackaging: balance?.packaging ?? 0,
      },
    ]);
    resetForm();
    setFormOpen(false);
  };

  const handleLockedSubmit = async () => {
    if (!productId || submitting) return;
    const basic = basicQty ?? 0;
    const packaging = packagingQty ?? 0;
    if (basic <= 0) {
      toast.error('Basic quantity must be greater than zero.');
      return;
    }
    if (packaging < 0) {
      toast.error('Packaging quantity cannot be negative.');
      return;
    }
    if (!isRemove && basicUnitPrice != null && (
      basicUnitPrice <= 0
      || !hasAtMostTwoDecimalPlaces(basicUnitPrice)
    )) {
      toast.error('Enter a positive basic-unit price with no more than two decimal places, or leave it empty.');
      return;
    }
    if (isRemove && balance && basic > balance.basic) {
      toast.error(`Quantity cannot exceed the current balance of ${balance.basic} ${productUnits.basic || 'basic'}.`);
      return;
    }
    if (isRemove && balance && packaging > balance.packaging) {
      toast.error(`Quantity cannot exceed the current balance of ${balance.packaging} ${productUnits.packaging || 'packaging'}.`);
      return;
    }
    if (isRemove && !reason.trim()) {
      toast.error('Provide a reason for removal.');
      return;
    }
    await submit([{
      productId,
      basicQty: basic,
      packagingQty: hasPackaging ? packaging : 0,
      ...(!isRemove ? { basicUnitPrice } : {}),
    }]);
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (items.length === 0) {
      toast.error('Add at least one product.');
      return;
    }
    if (isRemove && !reason.trim()) {
      toast.error('Provide a reason for removal.');
      return;
    }
    await submit(items.map((i) => ({
      productId: i.productId,
      basicQty: i.basicQty,
      packagingQty: i.packagingQty,
      ...(!isRemove ? { basicUnitPrice: i.basicUnitPrice } : {}),
    })));
  };

  const applyMatchResult = (result: ProductMatchResult) => {
    const uploadedRows: ReviewItem[] = result.files.flatMap((file) => file.rows.map((row, index) => {
        const candidate = row.candidates?.find(({ productId }) => productId === row.suggestedProductId)
          || row.candidates?.[0];
        const matchedProductId = row.suggestedProductId
          || (row.matchStatus !== 'Unmatched' ? candidate?.productId : '')
          || '';
        const selectedProduct = matchedProductId
          ? candidateAsProduct(candidate, row.basicUnitPrice ?? null)
          : null;
        return {
          id: `${file.fileIndex}-${row.page ?? row.row ?? index}-${index}`,
          source: row,
          productId: matchedProductId,
          productName: selectedProduct?.name || row.extractedName || '',
          basicUnitName: selectedProduct?.basicUnitName || null,
          packagingUnitName: selectedProduct?.packagingUnitName || null,
          basicQty: reviewBasicQuantity(row),
          packagingQty: row.packagingQty,
          basicUnitPrice: row.basicUnitPrice ?? null,
          selectedProduct,
        };
    }));
    const manualRows: ReviewItem[] = items.map((item) => ({
      id: `staged-${item.productId}`,
      source: {
        page: null,
        worksheet: null,
        row: null,
        extractedName: item.productName,
        quantityText: String(item.basicQty),
        basicQtyText: String(item.basicQty),
        packagingQtyText: item.packagingQty > 0 ? String(item.packagingQty) : null,
        priceText: item.basicUnitPrice != null ? String(item.basicUnitPrice) : null,
        unitText: item.basicUnitName || null,
        quantity: item.basicQty,
        basicQty: item.basicQty,
        packagingQty: item.packagingQty,
        basicUnitPrice: item.basicUnitPrice,
        ocrConfidence: null,
        matchStatus: 'Manual',
        suggestedProductId: item.productId,
        candidates: [],
        requiresReview: false,
        warnings: [],
      },
      productId: item.productId,
      productName: item.productName,
      basicUnitName: item.basicUnitName || null,
      packagingUnitName: item.packagingUnitName || null,
      basicQty: item.basicQty,
      packagingQty: item.packagingQty,
      basicUnitPrice: item.basicUnitPrice,
      selectedProduct: {
        id: item.productId,
        name: item.productName,
        description: null,
        basicUnitId: '',
        basicUnitName: item.basicUnitName || '',
        basicUnitPrice: item.basicUnitPrice ?? 0,
        vehicleBasicUnitPrice: item.basicUnitPrice,
        packagingUnitId: null,
        packagingUnitName: item.packagingUnitName || null,
        packagingUnitPrice: null,
        isActive: true,
      },
    }));
    setUploadErrors(result.files.flatMap((file) => file.errors.map((error) => `${file.fileName}: ${error.message}`)));
    if (!uploadedRows.length) {
      toast.error('No product rows were extracted from the selected files.');
      return false;
    }
    setReviewItems(sortItemsForDefaultReview([...manualRows, ...uploadedRows]));
    setConfidenceSortDirection(null);
    setReviewStatusFilter('All');
    setMatchSummary(result.summary);
    setFormOpen(false);
    const failed = result.files.filter((file) => file.status !== 'Processed');
    if (failed.length) toast(`Some files need attention (${failed.length}).`, { icon: '⚠️' });
    return true;
  };

  const pollMatchJob = async (accepted: ProductMatchJobAccepted, signal: AbortSignal) => {
    setMatchJob({
      jobId: accepted.jobId,
      status: accepted.status,
      totalFiles: 0,
      processedFiles: 0,
      currentFileIndex: null,
      currentPage: null,
      currentFilePages: null,
      progressPercentage: 0,
      message: 'Your documents are queued for processing.',
      errorMessage: null,
      resultUrl: accepted.resultUrl || null,
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
    });

    while (!signal.aborted) {
      await waitForPollingDelay(MATCH_JOB_POLL_INTERVAL_MS, signal);
      const status = await productsApi.getMatchJob(accepted.jobId, signal);
      setMatchJob(status);
      if (!TERMINAL_MATCH_STATUSES.has(status.status)) continue;
      if (!status.resultUrl) {
        throw new Error(status.errorMessage || status.message || 'Document matching failed. Upload the documents again.');
      }
      try {
        return await productsApi.getMatchResult(accepted.jobId, signal);
      } catch (error: unknown) {
        if (responseStatus(error) === 409) continue;
        throw error;
      }
    }
    throw new DOMException('Document matching polling stopped.', 'AbortError');
  };

  const processUploadFiles = async (files: File[]) => {
    matchAbortRef.current?.abort();
    const controller = new AbortController();
    matchAbortRef.current = controller;
    setUploading(true);
    setMatchJob(null);
    setMatchSummary(null);
    try {
      const accepted = await productsApi.matchFiles(
        files,
        undefined,
        createUnmatchedProducts && canAutoCreateProductsFromFiles(files),
        controller.signal,
      );
      const result = await pollMatchJob(accepted, controller.signal);
      if (applyMatchResult(result)) {
        setPendingUploadFiles([]);
        setCreateUnmatchedProducts(false);
      }
      setMatchJob(null);
    } catch (err: unknown) {
      if (isRequestCancelled(err)) return;
      const apiError = getApiError(err);
      const status = responseStatus(err);
      if (status === 404) {
        toast.error('This document-matching job is no longer available. Upload the documents again.');
      } else {
        toast.error(apiError?.message || (err instanceof Error ? err.message : 'Could not process the selected documents.'));
      }
      setMatchJob(null);
    } finally {
      if (matchAbortRef.current === controller) matchAbortRef.current = null;
      setUploading(false);
    }
  };

  const beginCrop = (files: File[], index: number) => {
    const file = files[index];
    if (!file) {
      void processUploadFiles(files);
      return;
    }
    setCropQueue(files);
    setCropIndex(index);
    setCropFile(file);
    setCropUrl(URL.createObjectURL(file));
    setCrop(undefined);
    setCompletedCrop(null);
  };

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    const allowed = /\.(xlsx|pdf|jpe?g|png)$/i;
    const invalid = files.find((file) => !allowed.test(file.name));
    if (invalid) {
      toast.error(`${invalid.name} is not a supported document.`);
      return;
    }
    setPendingUploadFiles(files);
    if (!canAutoCreateProductsFromFiles(files)) setCreateUnmatchedProducts(false);
    setUploadErrors([]);
  };

  const handlePendingUpload = () => {
    if (!pendingUploadFiles.length || uploading) return;
    const firstImage = pendingUploadFiles.findIndex((file) => file.type.startsWith('image/') || /\.(jpe?g|png)$/i.test(file.name));
    if (firstImage >= 0) {
      beginCrop(pendingUploadFiles, firstImage);
    } else {
      void processUploadFiles(pendingUploadFiles);
    }
  };

  const cancelPendingUpload = () => {
    if (uploading) return;
    setPendingUploadFiles([]);
    setCreateUnmatchedProducts(false);
    setUploadErrors([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCropConfirm = async () => {
    if (!cropFile || !completedCrop || !cropImageRef.current) return;
    setUploading(true);
    try {
      const cropped = await cropImageFile(cropFile, completedCrop, cropImageRef.current);
      const nextFiles = [...cropQueue];
      nextFiles[cropIndex] = cropped;
      URL.revokeObjectURL(cropUrl);
      const nextImageIndex = nextFiles.findIndex((file, index) => index > cropIndex && (file.type.startsWith('image/') || /\.(jpe?g|png)$/i.test(file.name)));
      if (nextImageIndex >= 0) {
        setUploading(false);
        beginCrop(nextFiles, nextImageIndex);
      } else {
        setCropFile(null);
        setCropUrl('');
        setCropQueue([]);
        setPendingUploadFiles(nextFiles);
        await processUploadFiles(nextFiles);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not crop the image.');
      setUploading(false);
    }
  };

  const updateReviewItem = (id: string, patch: Partial<ReviewItem>) => {
    setReviewItems((current) => current?.map((item) => item.id === id ? { ...item, ...patch } : item) || null);
    setReviewValidationError((current) => (
      current?.id === id && Object.prototype.hasOwnProperty.call(patch, current.field) ? null : current
    ));
  };

  const showReviewValidationError = (
    item: ReviewItem,
    index: number,
    field: ReviewValidationError['field'],
    message: string,
  ) => {
    setReviewStatusFilter('All');
    setReviewValidationError({ id: item.id, field, message });
    const productLabel = item.source.extractedName || item.productName || 'manually added product';
    const displayIndex = reviewDisplayIndexById.get(item.id) ?? index;
    toast.error(`Row ${displayIndex + 1} — ${productLabel}: ${message}`);
    requestAnimationFrame(() => {
      document.getElementById(`stock-review-row-${item.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  const appendReviewItem = () => {
    setReviewStatusFilter('All');
    setReviewItems((current) => [
      ...(current || []),
      {
        id: `manual-${crypto.randomUUID()}`,
        source: {
          page: null,
          worksheet: null,
          row: null,
          extractedName: null,
          quantityText: null,
          basicQtyText: null,
          packagingQtyText: null,
          priceText: null,
          unitText: null,
          quantity: null,
          basicQty: null,
          packagingQty: null,
          basicUnitPrice: null,
          ocrConfidence: null,
          matchStatus: 'Manual',
          suggestedProductId: null,
          candidates: [],
          requiresReview: true,
          warnings: [],
        },
        productId: '',
        productName: '',
        basicUnitName: null,
        packagingUnitName: null,
        basicQty: null,
        packagingQty: null,
        basicUnitPrice: null,
        selectedProduct: null,
      },
    ]);
  };

  const submitReview = async () => {
    if (!reviewItems?.length || submitting) return;
    const invalidIndex = reviewItems.findIndex((item) => (
      !item.productId
      || item.basicQty == null
      || item.basicQty <= 0
      || (item.packagingQty ?? 0) < 0
      || (item.basicUnitPrice != null && (
        item.basicUnitPrice <= 0
        || !hasAtMostTwoDecimalPlaces(item.basicUnitPrice)
      ))
    ));
    if (invalidIndex >= 0) {
      const invalid = reviewItems[invalidIndex];
      if (!invalid.productId) {
        showReviewValidationError(invalid, invalidIndex, 'productId', 'Select a matched product.');
      } else if (invalid.basicQty == null) {
        showReviewValidationError(invalid, invalidIndex, 'basicQty', 'Enter the basic quantity.');
      } else if (invalid.basicQty <= 0) {
        showReviewValidationError(invalid, invalidIndex, 'basicQty', 'Basic quantity must be greater than 0.');
      } else if ((invalid.packagingQty ?? 0) < 0) {
        showReviewValidationError(invalid, invalidIndex, 'packagingQty', 'Packaging quantity cannot be negative.');
      } else {
        showReviewValidationError(invalid, invalidIndex, 'basicUnitPrice', 'Enter a positive price with no more than two decimal places, or leave it empty.');
      }
      return;
    }
    const productIds = reviewItems.map((item) => item.productId);
    if (new Set(productIds).size !== productIds.length) {
      const duplicateIndex = productIds.findIndex((productId, index) => productIds.indexOf(productId) !== index);
      showReviewValidationError(reviewItems[duplicateIndex], duplicateIndex, 'productId', 'This product is already selected in another row.');
      return;
    }
    setReviewValidationError(null);
    await submit(reviewItems.map((item) => ({
      productId: item.productId,
      basicQty: item.basicQty as number,
      packagingQty: item.packagingQty ?? 0,
      basicUnitPrice: item.basicUnitPrice,
    })));
  };

  const submit = async (payload: StockLineItem[]) => {
    setSubmitting(true);
    try {
      if (isRemove) {
        await vehicleStockApi.removeStock(vehicleId, { reason: reason.trim(), items: payload });
        toast.success('Stock removed.');
      } else {
        await vehicleStockApi.loadStock(vehicleId, { items: payload });
        toast.success('Stock loaded.');
      }
      resetTableData();
      onComplete();
      onHide();
    } catch (err: unknown) {
      const apiError = getApiError(err);
      const msg = apiError?.message
        || (err instanceof Error ? err.message : null)
        || (isRemove ? 'Failed to remove stock.' : 'Failed to load stock.');
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const closeModal = () => {
    matchAbortRef.current?.abort();
    matchAbortRef.current = null;
    setMatchJob(null);
    setUploading(false);
    setPendingUploadFiles([]);
    setCreateUnmatchedProducts(false);
    onHide();
  };

  const footer = cropFile
    ? (
      <div className="flex items-center justify-end gap-3 w-full">
        <FlatButton variant="danger-outline" label="Cancel" onClick={closeModal} disabled={uploading} />
        <FlatButton variant="primary" label={uploading ? 'Preparing...' : 'Use cropped image'} icon="pi pi-check" onClick={() => void handleCropConfirm()} loading={uploading} disabled={!completedCrop || uploading} />
      </div>
    )
    : matchJob
    ? (
      <div className="flex w-full items-center justify-end">
        <FlatButton variant="danger-outline" label="Close" onClick={closeModal} />
      </div>
    )
    : pendingUploadFiles.length > 0
    ? (
      <div className="flex w-full items-center justify-end gap-3">
        <FlatButton size="sm" variant="outline" label="Cancel" onClick={cancelPendingUpload} disabled={uploading} />
        <FlatButton
          size="sm"
          variant="primary"
          label={uploading ? 'Starting...' : 'Process documents'}
          onClick={handlePendingUpload}
          loading={uploading}
          disabled={uploading || pendingUploadFiles.length === 0}
        />
      </div>
    )
    : reviewItems
    ? (
      <div className="flex items-center justify-end gap-3 w-full">
        <FlatButton variant="danger-outline" label="Cancel" onClick={closeModal} disabled={submitting} />
        <FlatButton variant="primary" label={submitting ? 'Loading...' : 'Confirm stock'} icon="pi pi-check" onClick={submitReview} loading={submitting} disabled={submitting || reviewItems.length === 0} />
      </div>
    )
    : isLocked
    ? (
      <div
        className={`flex items-center justify-end gap-3 w-full transition-opacity ${
          balanceLoading ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        aria-hidden={balanceLoading}
      >
        <FlatButton variant="danger-outline" label="Cancel" onClick={closeModal} disabled={submitting} />
        <FlatButton
          variant={isRemove ? 'danger' : 'primary'}
          label={submitting ? 'Saving...' : (isRemove ? 'Reduce Stock' : 'Add Stock')}
          icon={isRemove ? 'pi pi-minus' : 'pi pi-plus'}
          onClick={handleLockedSubmit}
          loading={submitting}
          disabled={submitting}
        />
      </div>
    )
    : (
      <div
        className={`flex items-center justify-end gap-3 w-full transition-opacity ${formOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        aria-hidden={formOpen}
      >
        <FlatButton variant="danger-outline" label="Cancel" onClick={closeModal} disabled={submitting} />
        <FlatButton
          variant={isRemove ? 'danger' : 'primary'}
          label={submitting ? 'Saving...' : (isRemove ? 'Reduce Stock' : 'Add Stock')}
          icon={isRemove ? 'pi pi-minus' : 'pi pi-plus'}
          onClick={handleSubmit}
          loading={submitting}
          disabled={submitting || items.length === 0}
        />
      </div>
    );

  const reasonFields = isRemove ? (
    <div className="space-y-2">
      <FlatDropdown
        label="Reason"
        required
        size="sm"
        value={reasonSelection}
        options={REDUCTION_REASON_OPTIONS}
        placeholder="Select a reason"
        onChange={(value) => {
          const selected = (value as string) || '';
          setReasonSelection(selected);
          setReason(selected === 'Other' ? '' : selected);
        }}
      />
      {reasonSelection === 'Other' && (
        <FlatTextarea
          label="Other reason"
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Enter the reason"
          rows={2}
          size="sm"
        />
      )}
    </div>
  ) : null;

  const productForm = (
    <div className="space-y-2 max-w-sm mx-auto">
      <div className="pb-2 mb-4 border-b border-portal-border/60">
        <span className="text-[11px] font-medium uppercase tracking-wide text-portal-muted">
          {isRemove ? 'New reduction entry' : 'New product entry'}
        </span>
      </div>
      {isLocked ? (
        <div>
          <label className="block text-[11px] font-medium text-portal-muted uppercase tracking-wide mb-1.5">
            Product
          </label>
          <div className="rounded border border-portal-border/60 bg-portal-canvas/60 px-3 py-2 text-xs text-portal-text truncate">
            {productName || lockedProduct?.name}
          </div>
        </div>
      ) : (
        <FlatAsyncSelect<Product>
          id="stock-product-picker"
          label="Product"
          required
          size="sm"
          placeholder="Search products..."
          value={productId}
          endpointUrl="/products"
          defaultParams={pickerParams}
          pageSize={15}
          searchParam="search"
          optionValue="id"
          optionLabel={(p) => `${p.name}${p.basicUnitName || p.packagingUnitName ? ` · ${[p.packagingUnitName, p.basicUnitName].filter(Boolean).join(' / ')}` : ''}`}
          optionDisabled={(p) => stagedProductIds.has(p.id)}
          itemTemplate={(p) => (
            <div className="min-w-0">
              <span className="block truncate text-xs font-semibold text-white">{p.name}</span>
              {(p.basicUnitName || p.packagingUnitName) && (
                <span className="block truncate text-[11px] text-portal-muted">
                  {[p.packagingUnitName, p.basicUnitName].filter(Boolean).join(' / ')}
                </span>
              )}
            </div>
          )}
          onChange={(val, item) => {
            setProductId((val as string) || '');
            setProductName(item?.name || '');
            setProductUnits({ basic: item?.basicUnitName ?? null, packaging: item?.packagingUnitName ?? null });
            setBasicUnitPrice(!isRemove ? item?.vehicleBasicUnitPrice ?? null : null);
          }}
          filter={!isRemove ? {
            label: 'Scope',
            value: excludeTracked ? 'untracked' : 'all',
            options: [
              { label: 'All products', value: 'all' },
              { label: 'Not on this vehicle', value: 'untracked' },
            ],
            onChange: (val) => setExcludeTracked(val === 'untracked'),
          } : undefined}
        />
      )}

      {hasPackaging && (
        <FlatInputNumber
          label={productUnits.packaging || 'Packaging'}
          size="sm"
          min={0}
          max={isRemove && balance ? balance.packaging : undefined}
          value={packagingQty}
          onChange={(val) => setPackagingQty(val)}
          placeholder="0"
        />
      )}

      <FlatInputNumber
        label={productUnits.basic || 'Basic'}
        required
        size="sm"
        min={1}
        max={isRemove && balance ? balance.basic : undefined}
        value={basicQty}
        onChange={(val) => setBasicQty(val)}
        placeholder="e.g. 100"
      />

      {!isRemove && (
        <FlatInputNumber
          label="Basic unit price (GHS)"
          size="sm"
          min={0.01}
          max={999999999999.99}
          minFractionDigits={2}
          maxFractionDigits={2}
          locale="en-GH"
          useGrouping
          value={basicUnitPrice}
          onChange={setBasicUnitPrice}
          placeholder="Use normal pricing"
          helperText="Optional final vehicle selling price. Leave blank to use normal pricing."
        />
      )}

      {productId && (
        <div className="text-[11px]">
          {balanceLoading ? (
            <span className="inline-flex items-center gap-1.5 text-portal-muted">
              <i className="pi pi-spin pi-spinner text-[10px]" />
              Loading current balance...
            </span>
          ) : balance ? (
            <>
              <div className="flex items-center justify-between py-1.5 text-portal-muted">
                <span>Before</span>
                <span className="font-mono tabular-nums text-portal-text">
                  {balance.basic} {productUnits.basic || 'basic'}
                  {hasPackaging ? ` · ${balance.packaging} ${productUnits.packaging}` : ''}
                </span>
              </div>
              {((basicQty ?? 0) > 0 || (hasPackaging && (packagingQty ?? 0) > 0)) && (
                <div className="flex items-center justify-between py-1.5 border-t border-portal-border/60 text-portal-muted">
                  <span>After</span>
                  <span className={`font-mono tabular-nums ${isRemove ? 'text-amber-400' : 'text-portal-accent'}`}>
                    {isRemove
                      ? Math.max(0, balance.basic - (basicQty ?? 0))
                      : balance.basic + (basicQty ?? 0)
                    } {productUnits.basic || 'basic'}
                    {hasPackaging ? ` · ${
                      isRemove
                        ? Math.max(0, balance.packaging - (packagingQty ?? 0))
                        : balance.packaging + (packagingQty ?? 0)
                    } ${productUnits.packaging}` : ''}
                  </span>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}

      {isLocked && reasonFields}

      {!isLocked && (
        <div
          className={`flex items-center justify-end gap-2 pt-1 transition-opacity ${
            productId && balanceLoading ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
          aria-hidden={!!(productId && balanceLoading)}
        >
          <FlatButton
            size="sm"
            variant="outline"
            label="Close"
            onClick={() => { resetForm(); setFormOpen(false); }}
          />
          <FlatButton
            size="sm"
            variant="primary"
            label="Add"
            icon="pi pi-plus"
            onClick={handleAddToList}
          />
        </div>
      )}
    </div>
  );

  return (
    <>
      <FlatModal
      visible={visible}
      onHide={submitting || (uploading && !matchJob) || !!cropFile ? () => {} : closeModal}
      title={pendingUploadFiles.length > 0 && !cropFile && !matchJob ? 'Upload documents' : title}
      size={pendingUploadFiles.length > 0 && !cropFile && !matchJob ? 'md' : 'xl'}
      footer={footer}
    >
      <div className={`relative py-3 ${pendingUploadFiles.length > 0 && !cropFile && !matchJob ? '' : 'min-h-[380px]'}`}>
        {!isLocked && !isRemove && (
          <input ref={fileInputRef} type="file" multiple accept=".xlsx,.pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleUpload} />
        )}
        {cropFile ? (
          <div className="flex min-h-[440px] flex-col gap-3">
            <div>
              <p className="text-xs font-semibold text-portal-text">Crop document image</p>
              <p className="mt-1 text-[11px] text-portal-muted">Keep the product rows and quantities inside the crop area before matching.</p>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded border border-portal-border/60 bg-portal-canvas p-3">
              <ReactCrop crop={crop} onChange={(_, percent: PercentCrop) => setCrop(percent)} onComplete={(pixel) => setCompletedCrop(pixel)} keepSelection minWidth={48}>
                <img
                  ref={cropImageRef}
                  src={cropUrl}
                  alt="Document crop preview"
                  onLoad={(event) => {
                    const image = event.currentTarget;
                    setCrop({ unit: '%', x: 5, y: 5, width: 90, height: 90 });
                    setCompletedCrop({ unit: 'px', x: image.width * 0.05, y: image.height * 0.05, width: image.width * 0.9, height: image.height * 0.9 });
                    cropImageRef.current = image;
                  }}
                  className="block max-h-[52vh] max-w-full"
                />
              </ReactCrop>
            </div>
            <p className="text-[11px] text-portal-muted">{cropIndex + 1} of {cropQueue.length} image{cropQueue.length === 1 ? '' : 's'}</p>
          </div>
        ) : isLocked ? (
          productForm
        ) : (
          <>
            <div className="space-y-3">
              {!reviewItems && pendingUploadFiles.length === 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wide text-portal-muted">
                    Products ({items.length})
                  </span>
                  <div className="flex items-center gap-2">
                    {items.length > 0 && (
                      <FlatButton size="sm" variant="danger-outline" leftIcon="pi pi-refresh" onClick={() => setResetListPending(true)} disabled={formOpen || uploading}>Reset</FlatButton>
                    )}
                    {!isRemove && (
                      <FlatButton size="sm" variant="accent-outline" leftIcon="pi pi-upload" onClick={() => { setCreateUnmatchedProducts(false); fileInputRef.current?.click(); }} loading={uploading} disabled={formOpen || uploading}>Upload</FlatButton>
                    )}
                    <FlatButton size="sm" variant="primary" leftIcon="pi pi-plus" onClick={() => { resetForm(); setFormOpen(true); }} disabled={formOpen || uploading}>Add item</FlatButton>
                  </div>
                </div>
              )}

              {!reviewItems && uploadErrors.length > 0 && (
                <div className="rounded border border-portal-orange/30 bg-portal-orange/5 px-3 py-2 text-[11px] text-portal-orange">
                  {uploadErrors.map((error) => <div key={error}>{error}</div>)}
                </div>
              )}

              {matchJob ? (
                <div className="border border-portal-border bg-portal-canvas px-4 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold text-portal-text">Processing uploaded documents</p>
                      <p className="mt-1 text-[11px] text-portal-muted">{matchJob.message || 'Checking document progress...'}</p>
                    </div>
                    <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-portal-accent">
                      {Math.max(0, Math.min(100, Math.round(matchJob.progressPercentage || 0)))}%
                    </span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden bg-portal-border" aria-hidden="true">
                    <div
                      className="h-full bg-portal-accent transition-[width] duration-300"
                      style={{ width: `${Math.max(0, Math.min(100, matchJob.progressPercentage || 0))}%` }}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[10px] text-portal-muted">
                    {matchJob.totalFiles > 0 && (
                      <span>Files: {matchJob.processedFiles} of {matchJob.totalFiles}</span>
                    )}
                    {matchJob.currentFileIndex != null && matchJob.totalFiles > 0 && (
                      <span>Current file: {matchJob.currentFileIndex + 1} of {matchJob.totalFiles}</span>
                    )}
                    {matchJob.currentPage != null && (
                      <span>Page: {matchJob.currentPage}{matchJob.currentFilePages ? ` of ${matchJob.currentFilePages}` : ''}</span>
                    )}
                  </div>
                  <p className="mt-3 border-t border-portal-border pt-3 text-[10px] text-portal-muted">
                    You may close this window. Processing will continue on the server, but progress updates will stop here.
                  </p>
                </div>
              ) : pendingUploadFiles.length > 0 ? (
                <div className="space-y-5">
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[11px] font-medium text-portal-text">
                        {pendingUploadFiles.length} {pendingUploadFiles.length === 1 ? 'document' : 'documents'} selected
                      </span>
                      <FlatButton
                        size="sm"
                        variant="ghost"
                        label="Change files"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                      />
                    </div>
                    <ul className="mt-1 max-h-60 overflow-y-auto divide-y divide-portal-border/40" aria-label="Selected documents">
                      {pendingUploadFiles.map((file, index) => {
                        const extension = file.name.split('.').pop()?.toUpperCase() || 'FILE';
                        return (
                          <li key={`${file.name}-${file.lastModified}-${index}`} className="flex items-center gap-3 py-3">
                            <i className={`pi ${extension === 'PDF' ? 'pi-file-pdf' : extension === 'XLSX' ? 'pi-file-excel' : 'pi-image'} shrink-0 text-base text-portal-muted`} aria-hidden="true" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-semibold text-portal-text" title={file.name}>{file.name}</p>
                              <p className="mt-0.5 text-[11px] text-portal-muted">{extension} · {formatUploadFileSize(file.size)}</p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  {canAutoCreateMissingProducts && (
                    <div className="border-t border-portal-border/60 pt-4">
                      <FlatCheckbox
                        id="create-unmatched-products"
                        checked={createUnmatchedProducts}
                        onChange={setCreateUnmatchedProducts}
                        disabled={uploading}
                        className="[&_label]:!items-start [&_.p-checkbox]:!mt-0.5"
                        label={(
                          <span className="block">
                            <span className="block text-xs font-medium !text-red-accent">Automatically Create Missing Products</span>
                            <span className="mt-0.5 block text-[11px] font-normal !text-red-accent">
                              Add any product that is detected in this document but missing from this system product catalogue.
                            </span>
                          </span>
                        )}
                      />
                    </div>
                  )}
                </div>
              ) : reviewItems ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] uppercase tracking-wide text-portal-muted">
                      Review stock rows ({reviewStatusFilter === 'All' ? reviewItems.length : `${visibleReviewItems.length} of ${reviewItems.length}`})
                    </span>
                    <FlatButton size="sm" variant="danger-outline" label="Reset" icon="pi pi-refresh" onClick={() => setResetListPending(true)} disabled={uploading || submitting} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 py-2" role="group" aria-label="Document matching summary">
                    {reviewFilterChips.map((chip) => {
                      const isActive = reviewStatusFilter === chip.value;
                      return (
                        <button
                          key={chip.value}
                          type="button"
                          aria-pressed={isActive}
                          onClick={() => setReviewStatusFilter((current) => (current === chip.value && chip.value !== 'All' ? 'All' : chip.value))}
                          className={`inline-flex cursor-pointer items-center gap-1.5 !rounded-full px-3.5 py-1.5 text-xs transition-colors focus-visible:outline-none ${
                            isActive
                              ? `font-semibold ${chip.activeTone}`
                              : 'text-portal-muted hover:bg-white/[0.05] hover:text-portal-text'
                          }`}
                        >
                          <span className={isActive ? '' : 'underline decoration-dotted decoration-portal-muted/70 underline-offset-4'}>
                            {chip.label}
                          </span>
                          <strong className={`font-mono font-semibold tabular-nums ${isActive ? 'text-current' : chip.countTone}`}>
                            {chip.count}
                          </strong>
                        </button>
                      );
                    })}
                  </div>
                  <span className="sr-only" role="status">
                    Showing {visibleReviewItems.length} of {reviewItems.length} review rows.{' '}
                    {confidenceSortDirection === 'ascending'
                      ? 'Extracted rows sorted by confidence, lowest first.'
                      : confidenceSortDirection === 'descending'
                        ? 'Extracted rows sorted by confidence, highest first.'
                        : ''}
                  </span>
                  {uploadErrors.length > 0 && (
                    <div className="rounded border border-amber-400/30 bg-amber-400/5 px-3 py-2 text-[11px] text-amber-400">
                      {uploadErrors.map((error) => <div key={error}>{error}</div>)}
                    </div>
                  )}
                  <div
                    className="overflow-x-auto rounded border border-portal-border/60"
                    role="region"
                    aria-label="Vehicle stock review rows"
                    tabIndex={0}
                    onScroll={() => reviewTooltipRef.current?.hideImmediate()}
                  >
                    <table className="w-full min-w-[830px] text-xs">
                      <thead className="bg-portal-canvas/40 text-portal-muted"><tr>
                        <th className="w-[42px] px-3 py-2 text-center text-[11px] font-medium uppercase tracking-wide align-middle">#</th>
                        <th className="px-3 py-2 text-center text-[11px] font-medium uppercase tracking-wide align-middle">Extracted Name</th>
                        <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide">Matched Product</th>
                        <th className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wide">Qty</th>
                        <th className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wide">Price</th>
                        <th
                          scope="col"
                          aria-sort={confidenceSortDirection || undefined}
                          className="w-[110px] px-3 py-2 text-center align-middle text-[11px] font-medium uppercase tracking-wide"
                        >
                          <button
                            type="button"
                            className="inline-flex cursor-pointer items-center gap-1.5 text-left uppercase tracking-wide text-portal-muted transition-colors hover:text-portal-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal-accent"
                            onClick={() => setConfidenceSortDirection((current) => current === 'ascending' ? 'descending' : 'ascending')}
                            title={confidenceSortDirection === 'ascending' ? 'Sort confidence high to low' : 'Sort confidence low to high'}
                          >
                            Confidence
                            <i
                              className={`pi ${confidenceSortDirection === 'ascending' ? 'pi-sort-up-fill' : confidenceSortDirection === 'descending' ? 'pi-sort-down-fill' : 'pi-sort-alt'} text-[10px]`}
                              aria-hidden="true"
                            />
                          </button>
                        </th>
                        <th className="px-3 py-2 text-center text-[11px] font-medium uppercase tracking-wide align-middle">Action</th>
                      </tr></thead>
                      <tbody
                        className="divide-y divide-portal-border/40"
                        onMouseOver={handleReviewTableTriggerEnter}
                        onMouseLeave={() => reviewTooltipRef.current?.scheduleHide()}
                        onFocus={handleReviewTableTriggerEnter}
                        onBlur={() => reviewTooltipRef.current?.scheduleHide()}
                      >
                        {visibleReviewItems.length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-3 py-8 text-center text-[11px] text-portal-muted">
                              {reviewItems.length === 0
                                ? 'No stock rows remain. Add a product row to continue.'
                                : 'No rows match this status.'}
                            </td>
                          </tr>
                        )}
                        {visibleReviewItems.map((item, index) => (
                          <tr
                            key={item.id}
                            id={`stock-review-row-${item.id}`}
                            className={`align-top transition-colors ${reviewValidationError?.id === item.id ? 'bg-red-accent/5' : ''}`}
                          >
                            <td className="w-[42px] px-3 py-2 text-center align-middle font-mono text-[11px] text-portal-muted">{index + 1}</td>
                            <td className="px-3 py-2 text-start align-middle text-portal-text">
                              {item.source.matchStatus === 'Manual' ? (
                                <span className="text-[11px] text-portal-muted">Added manually</span>
                              ) : item.source.extractedName ? (() => {
                                const isAutoCreated = isAutoCreatedRow(item.source);
                                const isExact = !isAutoCreated && item.source.matchStatus === 'Exact';
                                const indicator = matchIndicator(item.source);
                                const needsAttention = !isAutoCreated && !isExact;
                                const showAlertIcon = !isAutoCreated && (
                                  item.source.matchStatus === 'Ambiguous' || item.source.matchStatus === 'Unmatched'
                                );
                                return (
                                  <span
                                    tabIndex={0}
                                    data-review-tooltip-id={item.id}
                                    className={`inline-flex max-w-[165px] cursor-help items-center gap-1.5 focus-visible:outline-none ${
                                      needsAttention ? `${indicator.color} font-medium` : 'text-portal-text'
                                    }`}
                                  >
                                    {showAlertIcon && (
                                      <i className="pi pi-exclamation-circle shrink-0 text-[11px]" aria-hidden="true" />
                                    )}
                                    <span className="truncate">{item.source.extractedName}</span>
                                  </span>
                                );
                              })() : '—'}
                            </td>
                            <td className="w-[260px] px-3 py-2">
                              <FlatAsyncSelect<Product>
                                size="sm"
                                placeholder="Select product"
                                value={item.productId}
                                initialSelectedItem={item.selectedProduct || undefined}
                                endpointUrl="/products"
                                defaultParams={{ isActive: true }}
                                pageSize={10}
                                searchParam="search"
                                optionValue="id"
                                optionLabel={(product) => product.name}
                                errorMessage={reviewValidationError?.id === item.id && reviewValidationError.field === 'productId' ? reviewValidationError.message : undefined}
                                footerAction={!item.productId ? {
                                  label: item.source.extractedName
                                    ? `Create “${item.source.extractedName}”`
                                    : 'Create new product',
                                  icon: 'pi pi-plus',
                                  onClick: () => setProductModalRowId(item.id),
                                } : undefined}
                                onChange={(value, product) => updateReviewItem(item.id, {
                                  productId: (value as string) || '',
                                  productName: product?.name || '',
                                  basicUnitName: product?.basicUnitName || null,
                                  packagingUnitName: product?.packagingUnitName || null,
                                  selectedProduct: product || null,
                                })}
                              />
                            </td>
                            <td className="w-[110px] px-3 py-2">
                              <FlatInputNumber
                                id={`stock-review-basic-${item.id}`}
                                aria-label={`Quantity for ${item.productName || item.source.extractedName || 'product row'}`}
                                size="sm"
                                min={0}
                                value={item.basicQty}
                                errorMessage={reviewValidationError?.id === item.id && reviewValidationError.field === 'basicQty' ? reviewValidationError.message : undefined}
                                onChange={(value) => updateReviewItem(item.id, { basicQty: value })}
                              />
                            </td>
                            <td className="w-[160px] px-3 py-2">
                              <FlatInputNumber
                                size="sm"
                                min={0.01}
                                minFractionDigits={2}
                                maxFractionDigits={2}
                                locale="en-GH"
                                useGrouping
                                placeholder="No vehicle price"
                                value={item.basicUnitPrice}
                                errorMessage={reviewValidationError?.id === item.id && reviewValidationError.field === 'basicUnitPrice' ? reviewValidationError.message : undefined}
                                onChange={(value) => updateReviewItem(item.id, { basicUnitPrice: value })}
                              />
                              {item.source.priceText && item.basicUnitPrice == null && (
                                <span
                                  className="mt-1 block cursor-help truncate text-[10px] text-portal-orange"
                                  title={item.source.warnings?.join('\n') || `Could not read extracted price: ${item.source.priceText}`}
                                >
                                  <i className="pi pi-exclamation-triangle mr-1 text-[9px]" aria-hidden="true" />
                                  Extracted: {item.source.priceText}
                                </span>
                              )}
                            </td>
                            <td className="w-[90px] px-3 py-2 text-center align-middle">
                              {(() => {
                                const indicator = matchIndicator(item.source);
                                const isUnmatched = item.source.matchStatus === 'Unmatched';
                                const isManual = item.source.matchStatus === 'Manual';
                                const isAutoCreated = isAutoCreatedRow(item.source);
                                return (
                                  <span
                                    tabIndex={0}
                                    data-review-tooltip-id={item.id}
                                    className="inline-flex cursor-help items-center gap-1.5 whitespace-nowrap focus-visible:outline-none"
                                  >
                                    <span className={`text-[11px] font-semibold ${indicator.color}`}>
                                      {isAutoCreated
                                        ? <span className="inline-flex items-center gap-1 text-portal-accent"><i className="pi pi-plus text-[9px]" aria-hidden="true" />Newly created</span>
                                        : isManual ? 'Manual' : isUnmatched ? 'Unmatched' : indicator.score == null ? '—' : `${Math.round(indicator.score)}%`}
                                    </span>
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="px-3 py-2 text-center align-middle">
                              <button
                                type="button"
                                onClick={() => setPendingReviewRemoveId(item.id)}
                                disabled={submitting}
                                className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap text-[11px] font-semibold text-red-accent transition-colors hover:text-red-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
                                aria-label={`Remove stock row for ${item.productName || item.source.extractedName || 'unmatched product'}`}
                              >
                                <i className="pi pi-trash text-[10px]" aria-hidden="true" />
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-end">
                    <FlatButton
                      size="sm"
                      variant="outline"
                      leftIcon="pi pi-plus"
                      onClick={appendReviewItem}
                      disabled={submitting || uploading}
                    >
                      Add product row
                    </FlatButton>
                  </div>
                </div>
              ) : items.length === 0 ? (
                <div className="rounded border border-dashed border-portal-border/60 bg-portal-canvas/40 py-8 text-center text-xs text-portal-muted">
                  No products added yet.
                </div>
              ) : (
                <div className="rounded border border-portal-border/60 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-portal-canvas/40 text-portal-muted">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-[11px] uppercase tracking-wide">Product</th>
                        <th className="text-right px-3 py-2 font-medium text-[11px] uppercase tracking-wide">Before</th>
                        <th className="text-right px-3 py-2 font-medium text-[11px] uppercase tracking-wide">After</th>
                        <th className="w-[40px]" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-portal-border/40">
                      {items.map((item) => {
                        const afterBasic = isRemove
                          ? Math.max(0, item.beforeBasic - item.basicQty)
                          : item.beforeBasic + item.basicQty;
                        const afterPackaging = isRemove
                          ? Math.max(0, item.beforePackaging - item.packagingQty)
                          : item.beforePackaging + item.packagingQty;
                        const beforeText = `${item.beforeBasic} ${item.basicUnitName || 'basic'}${
                          item.packagingUnitName ? ` · ${item.beforePackaging} ${item.packagingUnitName}` : ''
                        }`;
                        const afterText = `${afterBasic} ${item.basicUnitName || 'basic'}${
                          item.packagingUnitName ? ` · ${afterPackaging} ${item.packagingUnitName}` : ''
                        }`;
                        return (
                          <tr key={item.productId}>
                            <td className="px-3 py-2 text-portal-text">
                              <div className="truncate">{item.productName}</div>
                              {!isRemove && (
                                <div className="mt-0.5 text-[11px] text-portal-muted">
                                  {item.basicUnitPrice != null
                                    ? `Vehicle price: ${item.basicUnitPrice.toLocaleString('en-GH', { style: 'currency', currency: 'GHS' })}`
                                    : 'Normal pricing'}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right font-mono tabular-nums text-portal-muted whitespace-nowrap">
                              {beforeText}
                            </td>
                            <td className={`px-3 py-2 text-right font-mono tabular-nums whitespace-nowrap ${isRemove ? 'text-amber-400' : 'text-portal-accent'}`}>
                              {afterText}
                            </td>
                            <td className="px-2 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => setPendingRemoveId(item.productId)}
                                disabled={submitting}
                                className="w-6 h-6 inline-flex items-center justify-center rounded text-red-400 hover:text-red-300 hover:bg-red-500/10 transition disabled:opacity-60"
                                title="Remove"
                              >
                                <i className="pi pi-times text-[11px]" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {isRemove && reasonFields}
            </div>

            <div
              className={`absolute inset-0 z-20 bg-portal-surface/35 backdrop-blur-sm pt-3 pb-2 ${formOpen ? '' : 'hidden'}`}
            >
              {productForm}
            </div>
          </>
        )}
      </div>

      <FlatConfirmDialog
        visible={!!pendingRemoveItem}
        onHide={() => setPendingRemoveId(null)}
        title="Remove entry"
        message={
          pendingRemoveItem
            ? `Remove "${pendingRemoveItem.productName}" from the list?`
            : ''
        }
        confirmLabel="Remove"
        variant="danger"
        onConfirm={() => {
          if (pendingRemoveId) {
            setItems((prev) => prev.filter((i) => i.productId !== pendingRemoveId));
          }
          setPendingRemoveId(null);
        }}
      />
      <FlatConfirmDialog
        visible={!!pendingReviewRemoveItem}
        onHide={() => setPendingReviewRemoveId(null)}
        title="Remove stock row"
        message={
          pendingReviewRemoveItem
            ? `Remove "${pendingReviewRemoveItem.productName || pendingReviewRemoveItem.source.extractedName || 'Unmatched product'}" from the extracted rows?`
            : ''
        }
        confirmLabel="Remove"
        variant="danger"
        onConfirm={() => {
          if (pendingReviewRemoveId) {
            setReviewItems((current) => current?.filter((item) => item.id !== pendingReviewRemoveId) || null);
            setReviewValidationError((current) => current?.id === pendingReviewRemoveId ? null : current);
          }
          setPendingReviewRemoveId(null);
        }}
      />
      <FlatConfirmDialog
        visible={resetListPending}
        onHide={() => setResetListPending(false)}
        title="Reset stock rows"
        message={reviewItems
          ? 'Clear all manually added and uploaded rows, including your review changes?'
          : 'Clear all manually added product rows?'}
        confirmLabel="Reset"
        variant="danger"
        onConfirm={() => {
          setItems([]);
          setReviewItems(null);
          setReviewStatusFilter('All');
          setReviewValidationError(null);
          setMatchSummary(null);
          setUploadErrors([]);
          setPendingReviewRemoveId(null);
          setFormOpen(false);
          resetForm();
          if (fileInputRef.current) fileInputRef.current.value = '';
          setResetListPending(false);
        }}
      />
      </FlatModal>

      <ProductModal
        visible={Boolean(productModalReviewItem)}
        product={null}
        initialName={productModalReviewItem?.source.extractedName || productModalReviewItem?.productName || ''}
        onHide={() => setProductModalRowId(null)}
        onSuccess={(createdProduct) => {
          if (!productModalRowId) return;
          updateReviewItem(productModalRowId, {
            productId: createdProduct.id,
            productName: createdProduct.name,
            basicUnitName: createdProduct.basicUnitName || null,
            packagingUnitName: createdProduct.packagingUnitName || null,
            selectedProduct: createdProduct,
          });
          setReviewValidationError((current) => (
            current?.id === productModalRowId && current.field === 'productId' ? null : current
          ));
          void queryClient.invalidateQueries({ queryKey: ['flat-async-select', '/products'] });
        }}
      />

      <ReviewTableTooltip ref={reviewTooltipRef} />
    </>
  );
};
