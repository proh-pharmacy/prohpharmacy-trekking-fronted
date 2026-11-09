import React, { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import ReactCrop, { type Crop, type PercentCrop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { FlatConfirmDialog, FlatModal } from '../../../../components/overlay';
import { resetTableData } from '../../../../components/data-table';
import {
  FlatAsyncSelect,
  FlatButton,
  FlatDropdown,
  FlatInputNumber,
  FlatTextarea,
} from '../../../../components/flat-form';
import {
  getApiError,
  vehicleStockApi,
  type Product,
  productsApi,
  type ProductMatchRow,
  type StockLineItem,
} from '../../../../api-client';

type Mode = 'load' | 'remove';

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
}

interface ReviewValidationError {
  id: string;
  field: 'productId' | 'basicQty' | 'packagingQty';
  message: string;
}

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
  if (score == null) return { score: null, color: 'text-portal-muted' };
  if (score >= 95) return { score, color: 'text-portal-accent' };
  if (score >= 85) return { score, color: 'text-portal-orange' };
  return { score, color: 'text-red-accent' };
};

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
  const [reviewValidationError, setReviewValidationError] = useState<ReviewValidationError | null>(null);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropUrl, setCropUrl] = useState('');
  const [cropQueue, setCropQueue] = useState<File[]>([]);
  const [cropIndex, setCropIndex] = useState(0);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const cropImageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // form state
  const [productId, setProductId] = useState('');
  const [productName, setProductName] = useState('');
  const [productUnits, setProductUnits] = useState<{ basic?: string | null; packaging?: string | null }>({});
  const [basicQty, setBasicQty] = useState<number | null>(null);
  const [packagingQty, setPackagingQty] = useState<number | null>(null);

  const [balance, setBalance] = useState<{ basic: number; packaging: number } | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const [pendingReviewRemoveId, setPendingReviewRemoveId] = useState<string | null>(null);
  const [resetReviewPending, setResetReviewPending] = useState(false);
  const pendingRemoveItem = useMemo(
    () => items.find((i) => i.productId === pendingRemoveId) || null,
    [items, pendingRemoveId],
  );
  const pendingReviewRemoveItem = useMemo(
    () => reviewItems?.find((item) => item.id === pendingReviewRemoveId) || null,
    [reviewItems, pendingReviewRemoveId],
  );

  const hasPackaging = !!productUnits.packaging;

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
  };

  useEffect(() => {
    if (visible) {
      setItems([]);
      setReviewItems(null);
      setReviewValidationError(null);
      setPendingRemoveId(null);
      setPendingReviewRemoveId(null);
      setResetReviewPending(false);
      setUploadErrors([]);
      setCropFile(null);
      setCropQueue([]);
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
      setBalance(null);
      setBalanceLoading(false);
    }
  }, [visible, mode, isLocked, lockedProduct]);

  useEffect(() => {
    if (!visible || !productId) {
      setBalance(null);
      setBalanceLoading(false);
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
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const apiError = getApiError(err);
        if (apiError?.code === '404' || (err as any)?.response?.status === 404) {
          setBalance({ basic: 0, packaging: 0 });
        } else {
          toast.error(apiError?.message || 'Failed to load current balance.');
          setBalance(null);
        }
      })
      .finally(() => { if (!cancelled) setBalanceLoading(false); });
    return () => { cancelled = true; };
  }, [visible, productId, vehicleId]);

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
    await submit([{ productId, basicQty: basic, packagingQty: hasPackaging ? packaging : 0 }]);
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
    })));
  };

  const processUploadFiles = async (files: File[]) => {
    setUploading(true);
    try {
      const result = await productsApi.matchFiles(files);
      const rows: ReviewItem[] = result.files.flatMap((file) => file.rows.map((row, index) => {
        const candidate = row.candidates?.[0];
        return {
          id: `${file.fileIndex}-${row.page ?? row.row ?? index}-${index}`,
          source: row,
          productId: row.suggestedProductId || '',
          productName: candidate?.name || row.extractedName || '',
          basicUnitName: candidate?.basicUnitName || null,
          packagingUnitName: candidate?.packagingUnitName || null,
          basicQty: row.basicQty,
          packagingQty: row.packagingQty,
        };
      }));
      setUploadErrors(result.files.flatMap((file) => file.errors.map((error) => `${file.fileName}: ${error.message}`)));
      if (!rows.length) {
        toast.error('No product rows were extracted from the selected files.');
        return;
      }
      setReviewItems(rows);
      setFormOpen(false);
      const failed = result.files.filter((file) => file.status !== 'Processed');
      if (failed.length) toast(`Some files need attention (${failed.length}).`, { icon: '⚠️' });
    } catch (err: unknown) {
      const apiError = getApiError(err);
      toast.error(apiError?.message || 'Could not process the selected documents.');
    } finally {
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
    const firstImage = files.findIndex((file) => file.type.startsWith('image/') || /\.(jpe?g|png)$/i.test(file.name));
    if (firstImage >= 0) {
      beginCrop(files, firstImage);
    } else {
      void processUploadFiles(files);
    }
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
    setReviewValidationError({ id: item.id, field, message });
    const productLabel = item.source.extractedName || item.productName || 'manually added product';
    toast.error(`Row ${index + 1} — ${productLabel}: ${message}`);
    requestAnimationFrame(() => {
      document.getElementById(`stock-review-row-${item.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  const appendReviewItem = () => {
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
          unitText: null,
          quantity: null,
          basicQty: null,
          packagingQty: null,
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
      },
    ]);
  };

  const submitReview = async () => {
    if (!reviewItems?.length || submitting) return;
    const invalidIndex = reviewItems.findIndex((item) => !item.productId || item.basicQty == null || item.basicQty <= 0 || (item.packagingQty ?? 0) < 0);
    if (invalidIndex >= 0) {
      const invalid = reviewItems[invalidIndex];
      if (!invalid.productId) {
        showReviewValidationError(invalid, invalidIndex, 'productId', 'Select a matched product.');
      } else if (invalid.basicQty == null) {
        showReviewValidationError(invalid, invalidIndex, 'basicQty', 'Enter the basic quantity.');
      } else if (invalid.basicQty <= 0) {
        showReviewValidationError(invalid, invalidIndex, 'basicQty', 'Basic quantity must be greater than 0.');
      } else {
        showReviewValidationError(invalid, invalidIndex, 'packagingQty', 'Packaging quantity cannot be negative.');
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
    await submit(reviewItems.map((item) => ({ productId: item.productId, basicQty: item.basicQty as number, packagingQty: item.packagingQty ?? 0 })));
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

  const footer = cropFile
    ? (
      <div className="flex items-center justify-end gap-3 w-full">
        <FlatButton variant="danger-outline" label="Cancel" onClick={onHide} disabled={uploading} />
        <FlatButton variant="primary" label={uploading ? 'Preparing...' : 'Use cropped image'} icon="pi pi-check" onClick={() => void handleCropConfirm()} loading={uploading} disabled={!completedCrop || uploading} />
      </div>
    )
    : reviewItems
    ? (
      <div className="flex items-center justify-end gap-3 w-full">
        <FlatButton variant="danger-outline" label="Cancel" onClick={onHide} disabled={submitting} />
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
        <FlatButton variant="danger-outline" label="Cancel" onClick={onHide} disabled={submitting} />
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
        <FlatButton variant="danger-outline" label="Cancel" onClick={onHide} disabled={submitting} />
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
    <FlatModal
      visible={visible}
      onHide={submitting || uploading || !!cropFile ? () => {} : onHide}
      title={title}
      size="xl"
      footer={footer}
    >
      <div className="relative min-h-[380px] py-3">
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
              {!reviewItems && (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wide text-portal-muted">
                    Products ({items.length})
                  </span>
                  <div className="flex items-center gap-2">
                    {!isRemove && (
                      <FlatButton size="sm" variant="outline" leftIcon="pi pi-upload" onClick={() => fileInputRef.current?.click()} loading={uploading} disabled={formOpen || uploading}>Upload</FlatButton>
                    )}
                    <FlatButton size="sm" variant="outline" leftIcon="pi pi-plus" onClick={() => { resetForm(); setFormOpen(true); }} disabled={formOpen || uploading}>Add item</FlatButton>
                  </div>
                </div>
              )}

              {reviewItems ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wide text-portal-muted">Review extracted rows ({reviewItems.length})</span>
                    <FlatButton size="sm" variant="danger-outline" label="Reset" icon="pi pi-refresh" onClick={() => setResetReviewPending(true)} disabled={uploading || submitting} />
                  </div>
                  {uploadErrors.length > 0 && (
                    <div className="rounded border border-amber-400/30 bg-amber-400/5 px-3 py-2 text-[11px] text-amber-400">
                      {uploadErrors.map((error) => <div key={error}>{error}</div>)}
                    </div>
                  )}
                  <div className="overflow-x-auto rounded border border-portal-border/60">
                    <table className="w-full min-w-[770px] text-xs">
                      <thead className="bg-portal-canvas/40 text-portal-muted"><tr>
                        <th className="w-[42px] px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide">#</th>
                        <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide">Extracted Name</th>
                        <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide">Matched Product</th>
                        <th className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wide">Basic qty</th>
                        <th className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wide">Pack qty</th>
                        <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide">Confidence</th>
                        <th className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wide">Action</th>
                      </tr></thead>
                      <tbody className="divide-y divide-portal-border/40">
                        {reviewItems.length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-3 py-8 text-center text-[11px] text-portal-muted">
                              No extracted rows remain. Choose other files to continue.
                            </td>
                          </tr>
                        )}
                        {reviewItems.map((item, index) => (
                          <tr
                            key={item.id}
                            id={`stock-review-row-${item.id}`}
                            className={`align-top transition-colors ${reviewValidationError?.id === item.id ? 'bg-red-accent/5' : ''}`}
                          >
                            <td className="w-[42px] px-3 py-2 font-mono text-[11px] text-portal-muted">{index + 1}</td>
                            <td className="px-3 py-2 text-portal-text">
                              {item.source.matchStatus === 'Manual' ? (
                                <span className="text-[11px] text-portal-muted">Added manually</span>
                              ) : item.source.extractedName ? (
                                <abbr
                                  title={item.source.extractedName}
                                  className="block max-w-[150px] cursor-help truncate no-underline"
                                >
                                  {item.source.extractedName}
                                </abbr>
                              ) : '—'}
                            </td>
                            <td className="w-[260px] px-3 py-2">
                              <FlatAsyncSelect<Product> size="sm" placeholder="Select product" value={item.productId} initialSelectedItem={item.source.candidates?.find((candidate) => candidate.productId === item.productId) as Product | undefined} endpointUrl="/products" defaultParams={{ isActive: true }} pageSize={10} searchParam="search" optionValue="id" optionLabel={(p) => p.name} errorMessage={reviewValidationError?.id === item.id && reviewValidationError.field === 'productId' ? reviewValidationError.message : undefined} onChange={(value, product) => updateReviewItem(item.id, { productId: (value as string) || '', productName: product?.name || '', basicUnitName: product?.basicUnitName || null, packagingUnitName: product?.packagingUnitName || null })} />
                            </td>
                            <td className="w-[110px] px-3 py-2"><FlatInputNumber size="sm" min={0} value={item.basicQty} errorMessage={reviewValidationError?.id === item.id && reviewValidationError.field === 'basicQty' ? reviewValidationError.message : undefined} onChange={(value) => updateReviewItem(item.id, { basicQty: value })} /></td>
                            <td className="w-[110px] px-3 py-2"><FlatInputNumber size="sm" min={0} value={item.packagingQty} errorMessage={reviewValidationError?.id === item.id && reviewValidationError.field === 'packagingQty' ? reviewValidationError.message : undefined} onChange={(value) => updateReviewItem(item.id, { packagingQty: value })} /></td>
                            <td className="w-[90px] px-3 py-2">
                              {(() => {
                                const indicator = matchIndicator(item.source);
                                const isUnmatched = item.source.matchStatus === 'Unmatched';
                                const isManual = item.source.matchStatus === 'Manual';
                                const details = [
                                  isManual ? 'Manually added product row' : null,
                                  item.source.page != null ? `Page ${item.source.page}` : null,
                                  item.source.row != null ? `Row ${item.source.row}` : null,
                                  item.source.ocrConfidence != null ? `OCR confidence: ${Math.round(item.source.ocrConfidence * 100)}%` : null,
                                  ...(item.source.warnings || []),
                                ].filter(Boolean).join('\n');
                                return (
                                  <div className="group relative inline-flex cursor-help" title={details || 'No additional review information.'}>
                                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                                      <span className={`text-[11px] font-semibold ${indicator.color}`}>
                                        {isManual ? 'Manual' : isUnmatched ? 'Unmatched' : indicator.score == null ? '—' : `${Math.round(indicator.score)}%`}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })()}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => setPendingReviewRemoveId(item.id)}
                                disabled={submitting}
                                className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap text-[11px] font-semibold text-red-accent transition-colors hover:text-red-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
                                aria-label={`Remove extracted row for ${item.productName || item.source.extractedName || 'unmatched product'}`}
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
        title="Remove extracted row"
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
        visible={resetReviewPending}
        onHide={() => setResetReviewPending(false)}
        title="Reset extracted rows"
        message="Discard the extracted rows and your review changes? You will return to the initial Add Stock view."
        confirmLabel="Reset"
        variant="danger"
        onConfirm={() => {
          setReviewItems(null);
          setReviewValidationError(null);
          setItems([]);
          setUploadErrors([]);
          setPendingReviewRemoveId(null);
          setFormOpen(false);
          resetForm();
          if (fileInputRef.current) fileInputRef.current.value = '';
          setResetReviewPending(false);
        }}
      />
    </FlatModal>
  );
};
