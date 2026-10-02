import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { z } from 'zod';
import { FlatConfirmDialog, FlatModal } from '../../../../components/overlay';
import { FlatButton, FlatDropdown, FlatInputNumber, FlatTextarea } from '../../../../components/flat-form';
import { FlatAsyncSelect } from '../../../../components/flat-form/FlatAsyncSelect';
import {
  treksApi, customersApi, organisationApi, vehicleStockApi, getApiError,
  type Customer, type Product, type District, type TrekStop, type AddStopPayload,
} from '../../../../api-client';
import { resetTableData } from '../../../../components/data-table';
import toast from 'react-hot-toast';

const schema = z.object({
  customerAccountId: z.string().min(1, 'Customer is required'),
  sequence: z.number().min(1, 'Sequence must be at least 1'),
});

interface ProductRow {
  key: string;
  productId: string;
  product: Product | null;
  hasPackagingUnit: boolean;
  plannedBasicQuantity: string;
  plannedPackagingQuantity: string;
}

const emptyProductRow = (): ProductRow => ({ key: crypto.randomUUID(), productId: '', product: null, hasPackagingUnit: false, plannedBasicQuantity: '', plannedPackagingQuantity: '' });

const productRowsFromStop = (stop: TrekStop): ProductRow[] => stop.products.map((product) => ({
  key: product.stopProductId,
  productId: product.productId,
  product: {
    id: product.productId,
    name: product.productName,
    basicUnitName: product.basicUnitName,
    packagingUnitName: product.packagingUnitName,
  } as Product,
  hasPackagingUnit: Boolean(product.packagingUnitName),
  plannedBasicQuantity: String(product.plannedBasicQuantity),
  plannedPackagingQuantity: product.plannedPackagingQuantity == null ? '' : String(product.plannedPackagingQuantity),
}));

interface Props {
  visible: boolean;
  onHide: () => void;
  trekId: string;
  trekVehicleId: string;
  trekRegionId: string;
  trekRegionName: string;
  nextSequence: number;
  existingCustomerIds?: string[];
  stop?: TrekStop;
  onSuccess?: () => void;
}

export const AddStopModal: React.FC<Props> = ({ visible, onHide, trekId, trekVehicleId, trekRegionId, trekRegionName, nextSequence, existingCustomerIds = [], stop, onSuccess }) => {
  const [customerAccountId, setCustomerAccountId] = useState('');
  const [districtId, setDistrictId]               = useState('');
  const [sequence, setSequence]                   = useState(nextSequence);
  const [notes, setNotes]                         = useState('');
  const [products, setProducts]                   = useState<ProductRow[]>([]);
  const [productEntry, setProductEntry]           = useState<ProductRow>(emptyProductRow());
  const [productFormOpen, setProductFormOpen]     = useState(false);
  const [editingProductKey, setEditingProductKey] = useState<string | null>(null);
  const [pendingRemoveKey, setPendingRemoveKey]   = useState<string | null>(null);
  const [productEntryError, setProductEntryError] = useState('');
  const [stockBalance, setStockBalance]           = useState<{ basic: number; packaging: number } | null>(null);
  const [stockLoading, setStockLoading]           = useState(false);
  const [stockNotTracked, setStockNotTracked]     = useState(false);
  const [stockCheckFailed, setStockCheckFailed]   = useState(false);
  const [productScope, setProductScope]           = useState<'vehicle' | 'all'>('vehicle');
  const [districts, setDistricts]                 = useState<District[]>([]);
  const [loadingDistricts, setLoadingDistricts]   = useState(false);
  const [saving, setSaving]                       = useState(false);
  const [errors, setErrors]                       = useState<{ customerAccountId?: string; sequence?: string; products?: string }>({});
  const customerChanged = Boolean(stop && customerAccountId !== stop.customerAccountId);
  const unavailableCustomerIds = useMemo(
    () => new Set(existingCustomerIds.filter((id) => id !== stop?.customerAccountId)),
    [existingCustomerIds, stop?.customerAccountId]
  );

  const initialStopCustomer = useMemo(() => stop ? ({
    id: stop.customerAccountId,
    businessName: stop.customerName,
    customerCode: stop.customerCode,
  } as Customer) : undefined, [stop?.customerAccountId, stop?.customerName, stop?.customerCode]);

  // Reset the form on open. The trek determines the customer region.
  useEffect(() => {
    if (visible) {
      setSequence(stop?.sequence ?? nextSequence);
      setCustomerAccountId(stop?.customerAccountId ?? '');
      setDistrictId('');
      setDistricts([]);
      setNotes(stop?.notes ?? '');
      setProducts(stop?.products.length ? productRowsFromStop(stop) : []);
      setProductEntry(emptyProductRow());
      setProductFormOpen(false);
      setEditingProductKey(null);
      setPendingRemoveKey(null);
      setProductEntryError('');
      setStockBalance(null);
      setStockLoading(false);
      setStockNotTracked(false);
      setStockCheckFailed(false);
      setProductScope('vehicle');
      setErrors({});
    }
  }, [visible, nextSequence, trekRegionId, stop]);

  // Load only districts in the trek's region.
  useEffect(() => {
    if (!visible || !trekRegionId || stop) { setDistricts([]); return; }
    setLoadingDistricts(true);
    organisationApi.getDistricts(trekRegionId)
      .then(setDistricts)
      .catch(() => {})
      .finally(() => setLoadingDistricts(false));
  }, [visible, trekRegionId, stop]);

  // Clear customer when district changes
  useEffect(() => {
    if (!stop) setCustomerAccountId('');
  }, [districtId, stop]);

  const productPickerParams = useMemo(() => ({
    isActive: true,
    ...(productScope === 'vehicle' ? { vehicleId: trekVehicleId } : {}),
  }), [productScope, trekVehicleId]);

  useEffect(() => {
    if (!visible || !productFormOpen || !productEntry.productId) {
      setStockBalance(null);
      setStockLoading(false);
      setStockNotTracked(false);
      setStockCheckFailed(false);
      return;
    }

    let cancelled = false;
    setStockLoading(true);
    setStockBalance(null);
    setStockNotTracked(false);
    setStockCheckFailed(false);
    vehicleStockApi.getProductStock(trekVehicleId, productEntry.productId)
      .then((stock) => {
        if (cancelled) return;
        setStockBalance({
          basic: stock.basicQuantityOnHand ?? 0,
          packaging: stock.packagingQuantityOnHand ?? 0,
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const apiError = getApiError(error);
        if (apiError?.code === '404' || (error as any)?.response?.status === 404) {
          setStockNotTracked(true);
        } else {
          setStockCheckFailed(true);
        }
      })
      .finally(() => { if (!cancelled) setStockLoading(false); });

    return () => { cancelled = true; };
  }, [visible, productFormOpen, productEntry.productId, trekVehicleId]);

  // fetchFn recreated when the trek region or selected district changes
  const fetchCustomers = useCallback(async (params: { pageNumber: number; pageSize: number; search?: string }) => {
    const res = await customersApi.getCustomers({
      ...params,
      regionId: trekRegionId,
      ...(districtId ? { districtId } : {}),
    });
    const raw: Customer[] = res?.data ?? res?.items ?? (Array.isArray(res) ? res : []);
    return { data: raw, totalPages: res?.totalPages ?? 1 };
  }, [trekRegionId, districtId]);

  const regionOptions = [{ label: trekRegionName, value: trekRegionId }];

  const districtOptions = [
    { label: 'All Districts', value: '' },
    ...districts.map((d) => ({ label: d.name, value: d.id })),
  ];

  const openNewProductEntry = () => {
    setProductEntry(emptyProductRow());
    setEditingProductKey(null);
    setProductEntryError('');
    setProductFormOpen(true);
  };

  const openProductEntry = (row: ProductRow) => {
    setProductEntry({ ...row });
    setEditingProductKey(row.key);
    setProductEntryError('');
    setProductFormOpen(true);
  };

  const closeProductEntry = () => {
    setProductEntry(emptyProductRow());
    setEditingProductKey(null);
    setProductEntryError('');
    setStockBalance(null);
    setStockNotTracked(false);
    setStockCheckFailed(false);
    setProductFormOpen(false);
  };

  const saveProductEntry = () => {
    const basic = Number(productEntry.plannedBasicQuantity || 0);
    const packaging = Number(productEntry.plannedPackagingQuantity || 0);
    if (!productEntry.productId || !productEntry.product) {
      setProductEntryError('Select a product.');
      return;
    }
    if (products.some((row) => row.key !== editingProductKey && row.productId === productEntry.productId)) {
      setProductEntryError('This product is already in the list.');
      return;
    }
    if (!Number.isFinite(basic) || !Number.isFinite(packaging) || basic < 0 || packaging < 0 || basic + packaging <= 0) {
      setProductEntryError('Enter a positive basic or packaging quantity.');
      return;
    }

    if (editingProductKey) {
      setProducts((current) => current.map((row) => row.key === editingProductKey ? productEntry : row));
    } else {
      setProducts((current) => [...current, productEntry]);
    }
    setErrors((current) => { const next = { ...current }; delete next.products; return next; });
    closeProductEntry();
  };

  const enteredProducts = products;
  const productsChanged = Boolean(stop && (
    enteredProducts.length !== stop.products.length ||
    enteredProducts.some((row, index) => {
      const original = stop.products[index];
      return !original || row.productId !== original.productId ||
        Number(row.plannedBasicQuantity || 0) !== Number(original.plannedBasicQuantity || 0) ||
        Number(row.plannedPackagingQuantity || 0) !== Number(original.plannedPackagingQuantity || 0);
    })
  ));

  const plannedBasicQuantity = Number(productEntry.plannedBasicQuantity || 0);
  const plannedPackagingQuantity = Number(productEntry.plannedPackagingQuantity || 0);
  const basicExceedsStock = Boolean(stockBalance && plannedBasicQuantity > stockBalance.basic);
  const packagingExceedsStock = Boolean(
    stockBalance && productEntry.hasPackagingUnit && plannedPackagingQuantity > stockBalance.packaging,
  );
  const manageVehicleStockLink = (
    <a
      href={`/portal/fleet/vehicles/${trekVehicleId}/stock`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 font-medium text-portal-accent hover:underline"
    >
      Manage vehicle stock <i className="pi pi-external-link text-[9px]" />
    </a>
  );

  const handleSubmit = async () => {
    const shouldSendProducts = !stop || (customerChanged ? enteredProducts.length > 0 : productsChanged);
    const validProducts = products.filter((p) => p.productId);
    const result = schema.safeParse({ customerAccountId, sequence });
    const errs: typeof errors = {};
    if (!result.success) {
      result.error.issues.forEach((i) => {
        const f = i.path[0] as keyof typeof errors;
        if (!errs[f]) errs[f] = i.message;
      });
    }
    if (customerAccountId && unavailableCustomerIds.has(customerAccountId)) {
      errs.customerAccountId = 'This customer is already a stop on the trek.';
    }
    if (shouldSendProducts && validProducts.length === 0) {
      errs.products = 'Add at least one product.';
    } else if (shouldSendProducts && new Set(validProducts.map((p) => p.productId)).size !== validProducts.length) {
      errs.products = 'Each product can only be added once.';
    } else if (shouldSendProducts && products.some((p) => {
      const basic = p.plannedBasicQuantity === '' ? 0 : Number(p.plannedBasicQuantity);
      const packaging = p.plannedPackagingQuantity === '' ? 0 : Number(p.plannedPackagingQuantity);
      return !Number.isFinite(basic) || !Number.isFinite(packaging) || basic < 0 || packaging < 0 || basic + packaging <= 0;
    })) {
      errs.products = 'Enter a positive basic or packaging quantity for every product.';
    }
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSaving(true);
    try {
      const productPayload: AddStopPayload['products'] = validProducts.map((p) => ({
        productId: p.productId,
        plannedBasicQuantity: Number(p.plannedBasicQuantity || 0),
        ...(p.hasPackagingUnit ? { plannedPackagingQuantity: Number(p.plannedPackagingQuantity || 0) } : {}),
      }));
      if (stop) {
        await treksApi.updateStop(trekId, stop.stopId, {
          ...(customerChanged ? { customerAccountId } : {}),
          sequence,
          notes: notes.trim(),
          ...(shouldSendProducts ? { products: productPayload } : {}),
        });
      } else {
        await treksApi.addStop(trekId, {
          customerAccountId,
          sequence,
          notes: notes.trim() || undefined,
          products: productPayload,
        });
      }
      resetTableData();
      toast.success(stop ? 'Stop updated.' : 'Stop added.');
      onSuccess?.();
      onHide();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.response?.data?.message || (stop ? 'Failed to update stop.' : 'Failed to add stop.');
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <FlatModal
      visible={visible}
      onHide={onHide}
      title={stop ? 'Edit Stop' : 'Add Stop'}
      subtitle={stop ? `Update stop for ${stop.customerName}` : 'Add a customer delivery stop to this trek'}
      size="lg"
      footer={
        <div className={`flex items-center justify-end gap-3 w-full transition-opacity ${productFormOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`} aria-hidden={productFormOpen}>
          <FlatButton variant="danger-outline" label="Cancel" onClick={onHide} disabled={saving} />
          <FlatButton variant="primary" label={saving ? 'Saving...' : stop ? 'Save Stop' : 'Add Stop'} icon={stop ? 'pi pi-check' : 'pi pi-plus'} onClick={handleSubmit} loading={saving} disabled={saving} />
        </div>
      }
    >
      <div className="space-y-4 py-1 text-xs">

        {/* The trek fixes the region; the district narrows the customer list. */}
        {!stop && <div className="grid grid-cols-2 gap-3">
          <FlatDropdown
            label="Trekking Region"
            options={regionOptions}
            value={trekRegionId}
            disabled
            size="sm"
          />
          <FlatDropdown
            label="District"
            options={districtOptions}
            value={districtId}
            onChange={(v: any) => setDistrictId(v?.value !== undefined ? v.value : v)}
            placeholder="All Districts"
            disabled={!trekRegionId || loadingDistricts}
            size="sm"
          />
        </div>}

        {/* Customer async search — key forces remount on filter change */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <FlatAsyncSelect<Customer>
              key={stop ? `edit:${stop.stopId}` : `${trekRegionId}:${districtId}`}
              label="Customer"
              required
              placeholder="Search by name, code, or phone..."
              value={customerAccountId}
              initialSelectedItem={initialStopCustomer}
              onChange={(v) => {
                const nextCustomerId = v || '';
                setCustomerAccountId(nextCustomerId);
                setErrors((p) => { const n = { ...p }; delete n.customerAccountId; return n; });
              }}
              fetchFn={fetchCustomers}
              optionValue="id"
              optionLabel="businessName"
              optionDisabled={(customer) => unavailableCustomerIds.has(customer.id)}
              selectedItemTemplate={(item) => (
                <span className="truncate text-xs text-portal-text">
                  {item.businessName} <span className="font-mono text-portal-muted">· {item.customerCode}</span>
                </span>
              )}
              itemTemplate={(item) => (
                <div>
                  <span className="font-medium text-white text-xs">{item.businessName}</span>
                  <span className="font-mono text-portal-accent text-[11px] ml-2">{item.customerCode}</span>
                  {item.regionName && (
                    <span className="text-portal-muted text-[11px] ml-2">· {item.regionName}</span>
                  )}
                </div>
              )}
              size="sm"
              errorMessage={errors.customerAccountId}
            />
          </div>
          <FlatInputNumber label="Sequence" required min={1} useGrouping={false} size="sm"
            value={sequence} onChange={(value) => setSequence(value ?? 0)} errorMessage={errors.sequence} />
        </div>

        <div className="relative min-h-[320px] overflow-hidden rounded border border-portal-border/50 bg-portal-canvas/30 p-3">
          <div className={`space-y-3 transition-opacity duration-200 ${productFormOpen ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
            {stop && (
              <p className="text-[11px] text-portal-muted">{customerChanged
                ? 'These product entries will be saved with the new customer.'
                : 'Edited products replace the existing lines and refresh their prices.'}</p>
            )}

            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-medium uppercase tracking-wide text-portal-muted">
                Products ({products.length}) <span className="text-red-400">*</span>
              </span>
              <FlatButton size="sm" variant="outline" leftIcon="pi pi-plus" label="Add new item" onClick={openNewProductEntry} />
            </div>

            {products.length === 0 ? (
              <div className="rounded border border-dashed border-portal-border/60 bg-portal-canvas/40 py-8 text-center text-xs text-portal-muted">
                No products added yet.
              </div>
            ) : (
              <div className="overflow-hidden rounded border border-portal-border/60">
                <table className="w-full text-xs">
                  <thead className="bg-portal-canvas/50 text-portal-muted">
                    <tr>
                      <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide">Product</th>
                      <th className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wide">Quantity</th>
                      <th className="w-[70px]" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-portal-border/40">
                    {products.map((row) => (
                      <tr key={row.key}>
                        <td className="px-3 py-2">
                          <p className="max-w-[22rem] truncate text-xs font-semibold text-white">{row.product?.name}</p>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right font-mono text-[11px] tabular-nums text-portal-text">
                          {row.hasPackagingUnit ? `${Number(row.plannedPackagingQuantity || 0)} ${row.product?.packagingUnitName || 'packaging'} · ` : ''}
                          {Number(row.plannedBasicQuantity || 0)} {row.product?.basicUnitName || 'basic'}
                        </td>
                        <td className="whitespace-nowrap px-2 py-2 text-right">
                          <button type="button" onClick={() => openProductEntry(row)} className="h-6 w-6 rounded text-portal-muted transition hover:bg-white/[0.08] hover:text-white" title="Edit product">
                            <i className="pi pi-pencil text-[10px]" />
                          </button>
                          <button type="button" onClick={() => setPendingRemoveKey(row.key)} className="h-6 w-6 rounded text-red-400 transition hover:bg-red-500/10 hover:text-red-300" title="Remove product">
                            <i className="pi pi-times text-[10px]" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {errors.products && <p className="text-[11px] text-red-400">{errors.products}</p>}
          </div>

          <div
            className={`absolute inset-0 z-20 overflow-y-auto bg-portal-surface/35 px-4 py-4 backdrop-blur-sm transition-all duration-200 ${
              productFormOpen ? 'visible opacity-100' : 'invisible pointer-events-none opacity-0'
            }`}
            aria-hidden={!productFormOpen}
          >
            <div className="mx-auto max-w-sm space-y-3">
              <div className="mb-4 border-b border-portal-border/60 pb-3">
                <span className="text-[11px] font-medium uppercase tracking-wide text-portal-muted">
                  {editingProductKey ? 'Edit product entry' : 'New product entry'}
                </span>
              </div>

              <FlatAsyncSelect<Product>
                key={`${productScope}:${editingProductKey || 'new'}`}
                label="Product"
                required
                placeholder="Search products..."
                value={productEntry.productId}
                initialSelectedItem={productEntry.product ?? undefined}
                onChange={(value, product) => {
                  setProductEntry((current) => ({
                    ...current,
                    productId: value ?? '',
                    product: product ?? null,
                    hasPackagingUnit: Boolean(product?.packagingUnitId || product?.packagingUnitName),
                    plannedBasicQuantity: '',
                    plannedPackagingQuantity: '',
                  }));
                  setProductEntryError('');
                }}
                endpointUrl="/products"
                defaultParams={productPickerParams}
                pageSize={15}
                searchParam="search"
                optionValue="id"
                optionLabel={(product) => `${product.name} · ${product.packagingUnitName ? `${product.packagingUnitName} / ` : ''}${product.basicUnitName || 'basic unit'}`}
                optionDisabled={(product) => products.some((selected) => selected.key !== editingProductKey && selected.productId === product.id)}
                itemTemplate={(product) => (
                  <div className="min-w-0">
                    <span className="block truncate text-xs font-semibold text-white">{product.name}</span>
                    <span className="block truncate text-[11px] text-portal-muted">{[product.packagingUnitName, product.basicUnitName].filter(Boolean).join(' / ')}</span>
                  </div>
                )}
                size="sm"
                clearable={false}
                filter={{
                  label: 'Product scope',
                  value: productScope,
                  options: [
                    { label: 'Vehicle catalogue', value: 'vehicle' },
                    { label: 'All products', value: 'all' },
                  ],
                  onChange: (value) => {
                    setProductScope(value === 'all' ? 'all' : 'vehicle');
                  },
                }}
              />

              {productEntry.hasPackagingUnit && (
                <FlatInputNumber
                  id="stop-entry-packaging"
                  label={productEntry.product?.packagingUnitName || 'Packaging unit'}
                  min={0}
                  maxFractionDigits={2}
                  useGrouping={false}
                  size="sm"
                  placeholder="0"
                  value={productEntry.plannedPackagingQuantity === '' ? null : Number(productEntry.plannedPackagingQuantity)}
                  onChange={(value) => setProductEntry((current) => ({ ...current, plannedPackagingQuantity: value == null ? '' : String(value) }))}
                />
              )}
              <FlatInputNumber
                id="stop-entry-basic"
                label={productEntry.product?.basicUnitName || 'Basic unit'}
                min={0}
                maxFractionDigits={2}
                useGrouping={false}
                size="sm"
                placeholder="0"
                value={productEntry.plannedBasicQuantity === '' ? null : Number(productEntry.plannedBasicQuantity)}
                onChange={(value) => setProductEntry((current) => ({ ...current, plannedBasicQuantity: value == null ? '' : String(value) }))}
              />

              {productEntry.productId && (
                <div className="border-t border-portal-border/60 pt-3 text-[11px]">
                  {stockLoading ? (
                    <span className="inline-flex items-center gap-1.5 text-portal-muted"><i className="pi pi-spin pi-spinner text-[10px]" /> Loading current stock...</span>
                  ) : stockNotTracked ? (
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-portal-orange">
                      <span>This product has not been added to the selected vehicle's stock.</span>
                      {manageVehicleStockLink}
                    </div>
                  ) : stockCheckFailed ? (
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-portal-orange">
                      <span>Current vehicle stock could not be checked.</span>
                      {manageVehicleStockLink}
                    </div>
                  ) : stockBalance ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3 text-portal-muted">
                        <span>Current vehicle stock</span>
                        <span className="text-right font-mono tabular-nums text-portal-text">
                          {stockBalance.basic} {productEntry.product?.basicUnitName || 'basic'}
                          {productEntry.hasPackagingUnit ? ` · ${stockBalance.packaging} ${productEntry.product?.packagingUnitName}` : ''}
                        </span>
                      </div>
                      {basicExceedsStock && (
                        <p className="text-portal-orange">
                          {productEntry.product?.basicUnitName || 'Basic unit'} quantity exceeds stock by {(plannedBasicQuantity - stockBalance.basic).toLocaleString()}.
                        </p>
                      )}
                      {packagingExceedsStock && (
                        <p className="text-portal-orange">
                          {productEntry.product?.packagingUnitName || 'Packaging unit'} quantity exceeds stock by {(plannedPackagingQuantity - stockBalance.packaging).toLocaleString()}.
                        </p>
                      )}
                      {(basicExceedsStock || packagingExceedsStock) && manageVehicleStockLink}
                    </div>
                  ) : null}
                </div>
              )}

              {productEntryError && <p className="text-[11px] text-red-400">{productEntryError}</p>}
              <div className="flex items-center justify-end gap-2 pt-1">
                <FlatButton size="sm" variant="outline" label="Close" onClick={closeProductEntry} />
                <FlatButton size="sm" variant="primary" leftIcon="pi pi-plus" label={editingProductKey ? 'Update' : 'Add'} onClick={saveProductEntry} />
              </div>
            </div>
          </div>
        </div>

        <FlatTextarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes for this stop..." rows={2} maxLength={500} size="sm" />
      </div>

      <FlatConfirmDialog
        visible={!!pendingRemoveKey}
        onHide={() => setPendingRemoveKey(null)}
        title="Remove product"
        message={`Remove "${products.find((row) => row.key === pendingRemoveKey)?.product?.name || 'this product'}" from the stop?`}
        confirmLabel="Remove"
        variant="danger"
        onConfirm={() => {
          setProducts((current) => current.filter((row) => row.key !== pendingRemoveKey));
          setPendingRemoveKey(null);
        }}
      />
    </FlatModal>
  );
};

export default AddStopModal;
