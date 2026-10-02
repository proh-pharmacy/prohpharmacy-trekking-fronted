import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
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

  // form state
  const [productId, setProductId] = useState('');
  const [productName, setProductName] = useState('');
  const [productUnits, setProductUnits] = useState<{ basic?: string | null; packaging?: string | null }>({});
  const [basicQty, setBasicQty] = useState<number | null>(null);
  const [packagingQty, setPackagingQty] = useState<number | null>(null);

  const [balance, setBalance] = useState<{ basic: number; packaging: number } | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const pendingRemoveItem = useMemo(
    () => items.find((i) => i.productId === pendingRemoveId) || null,
    [items, pendingRemoveId],
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

  const footer = isLocked
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
      onHide={submitting ? () => {} : onHide}
      title={title}
      size="lg"
      footer={footer}
    >
      <div className="relative min-h-[380px] py-3">
        {isLocked ? (
          productForm
        ) : (
          <>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wide text-portal-muted">
                  Products ({items.length})
                </span>
                <FlatButton
                  size="sm"
                  variant="outline"
                  leftIcon="pi pi-plus"
                  onClick={() => { resetForm(); setFormOpen(true); }}
                  disabled={formOpen}
                >
                  Add new item
                </FlatButton>
              </div>

              {items.length === 0 ? (
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
    </FlatModal>
  );
};
