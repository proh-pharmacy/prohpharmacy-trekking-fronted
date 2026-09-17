import React, { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';
import { FlatModal } from '../../../../components/overlay';
import { FlatButton, FlatDropdown, FlatInputNumber, FlatTextarea } from '../../../../components/flat-form';
import { FlatAsyncSelect } from '../../../../components/flat-form/FlatAsyncSelect';
import {
  treksApi, customersApi, organisationApi,
  type Customer, type Product, type District, type TrekStop, type AddStopPayload,
} from '../../../../api-client';
import apiClient from '../../../../api-client/api';
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
  trekRegionId: string;
  trekRegionName: string;
  nextSequence: number;
  stop?: TrekStop;
  onSuccess?: () => void;
}

export const AddStopModal: React.FC<Props> = ({ visible, onHide, trekId, trekRegionId, trekRegionName, nextSequence, stop, onSuccess }) => {
  const [customerAccountId, setCustomerAccountId] = useState('');
  const [districtId, setDistrictId]               = useState('');
  const [sequence, setSequence]                   = useState(nextSequence);
  const [notes, setNotes]                         = useState('');
  const [products, setProducts]                   = useState<ProductRow[]>([emptyProductRow()]);
  const [editProducts, setEditProducts]           = useState(false);
  const [districts, setDistricts]                 = useState<District[]>([]);
  const [loadingDistricts, setLoadingDistricts]   = useState(false);
  const [saving, setSaving]                       = useState(false);
  const [errors, setErrors]                       = useState<{ customerAccountId?: string; sequence?: string; products?: string }>({});

  // Reset the form on open. The trek determines the customer region.
  useEffect(() => {
    if (visible) {
      setSequence(stop?.sequence ?? nextSequence);
      setCustomerAccountId(stop?.customerAccountId ?? '');
      setDistrictId('');
      setDistricts([]);
      setNotes(stop?.notes ?? '');
      setProducts(stop ? productRowsFromStop(stop) : [emptyProductRow()]);
      setEditProducts(false);
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

  const fetchProducts = useCallback(async (params: { pageNumber: number; pageSize: number; search?: string }) => {
    const res = await apiClient.get<any>('/products', { params: { ...params, isActive: true } });
    const raw  = res.data?.data ?? res.data?.items ?? (Array.isArray(res.data) ? res.data : []);
    return { data: raw as Product[], totalPages: res.data?.totalPages ?? 1 };
  }, []);

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

  const addProductRow    = () => setProducts((p) => [...p, emptyProductRow()]);
  const removeProductRow = (i: number) => setProducts((p) => p.filter((_, idx) => idx !== i));
  const updateProductRow = (i: number, changes: Partial<ProductRow>) =>
    setProducts((p) => p.map((row, idx) => idx === i ? { ...row, ...changes } : row));

  const handleSubmit = async () => {
    const shouldSendProducts = !stop || editProducts;
    const validProducts = products.filter((p) => p.productId);
    const result = schema.safeParse({ customerAccountId, sequence });
    const errs: typeof errors = {};
    if (!result.success) {
      result.error.issues.forEach((i) => {
        const f = i.path[0] as keyof typeof errors;
        if (!errs[f]) errs[f] = i.message;
      });
    }
    if (shouldSendProducts && (validProducts.length === 0 || products.some((p) => !p.productId))) {
      errs.products = 'Select a product for every line.';
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
          sequence,
          notes: notes.trim(),
          ...(editProducts ? { products: productPayload } : {}),
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
      size="md"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
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
            {stop ? (
              <div>
                <p className="text-[11px] font-medium uppercase text-portal-muted mb-1">Customer</p>
                <p className="text-xs font-semibold text-white py-2">{stop.customerName} · {stop.customerCode}</p>
              </div>
            ) : (
            <FlatAsyncSelect<Customer>
              key={`${trekRegionId}:${districtId}`}
              label="Customer"
              required
              placeholder="Search by name, code, or phone..."
              value={customerAccountId}
              onChange={(v) => {
                setCustomerAccountId(v);
                setErrors((p) => { const n = { ...p }; delete n.customerAccountId; return n; });
              }}
              fetchFn={fetchCustomers}
              optionValue="id"
              optionLabel="businessName"
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
            )}
          </div>
          <FlatInputNumber label="Sequence" required min={1} useGrouping={false} size="sm"
            value={sequence} onChange={(value) => setSequence(value ?? 0)} errorMessage={errors.sequence} />
        </div>

        {stop && !editProducts && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium uppercase text-portal-muted">Products</p>
              <FlatButton variant="ghost" size="sm" label="Change Products" onClick={() => setEditProducts(true)} />
            </div>
            {stop.products.map((product) => (
              <p key={product.stopProductId} className="text-xs text-portal-text">
                {product.productName} · {product.plannedBasicQuantity} {product.basicUnitName || 'basic units'}
                {product.packagingUnitName && ` · ${product.plannedPackagingQuantity ?? 0} ${product.packagingUnitName}`}
              </p>
            ))}
          </div>
        )}

        {(!stop || editProducts) && <div>
          {stop && (
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-[11px] text-portal-muted">Saving product changes replaces all lines and refreshes their prices.</p>
              <FlatButton variant="ghost" size="sm" label="Keep Existing" onClick={() => {
                setEditProducts(false);
                setProducts(productRowsFromStop(stop));
                setErrors((previous) => ({ ...previous, products: undefined }));
              }} />
            </div>
          )}
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] font-medium text-portal-muted">
              Products <span className="text-red-400">*</span>
            </label>
            <button type="button" onClick={addProductRow} className="text-[11px] text-portal-accent hover:text-portal-accent-hover flex items-center gap-1">
              <i className="pi pi-plus text-[10px]" /> Add product
            </button>
          </div>
          <div className="space-y-2">
            {products.map((row, i) => (
              <div key={row.key} className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_7rem_7rem_auto] gap-2 items-end">
                <div className="min-w-0">
                  <FlatAsyncSelect<Product>
                    label="Product"
                    placeholder="Search product..."
                    value={row.productId}
                    initialSelectedItem={row.product ?? undefined}
                    onChange={(v, product) => updateProductRow(i, {
                      productId: v ?? '', product: product ?? null, hasPackagingUnit: Boolean(product?.packagingUnitId),
                      plannedBasicQuantity: '', plannedPackagingQuantity: '',
                    })}
                    fetchFn={fetchProducts}
                    optionValue="id"
                    optionLabel={(p) => `${p.name} · ${p.basicUnitName || 'basic unit'}${p.packagingUnitName ? ` / ${p.packagingUnitName}` : ''}`}
                    itemTemplate={(p) => (
                      <div>
                        <span className="text-white text-xs">{p.name}</span>
                        {p.basicUnitName && <span className="text-portal-muted text-[11px] ml-1.5">({p.basicUnitName})</span>}
                        {p.packagingUnitName && <span className="text-portal-muted text-[11px] ml-1.5">/ {p.packagingUnitName}</span>}
                      </div>
                    )}
                    size="sm"
                    clearable={false}
                  />
                </div>
                <FlatInputNumber id={`stop-basic-${i}`} label={`Basic (${row.product?.basicUnitName || 'units'})`}
                  min={0} maxFractionDigits={2} useGrouping={false} size="sm" placeholder="0"
                  value={row.plannedBasicQuantity === '' ? null : Number(row.plannedBasicQuantity)}
                  onChange={(value) => updateProductRow(i, { plannedBasicQuantity: value == null ? '' : String(value) })} />
                <div
                  className={row.hasPackagingUnit ? '' : 'opacity-0 pointer-events-none'}
                  aria-hidden={!row.hasPackagingUnit}
                >
                  <FlatInputNumber id={`stop-packaging-${i}`} label={`Packaging (${row.product?.packagingUnitName || '—'})`}
                    min={0} maxFractionDigits={2} useGrouping={false} size="sm" placeholder="0"
                    value={row.plannedPackagingQuantity === '' ? null : Number(row.plannedPackagingQuantity)}
                    onChange={(value) => updateProductRow(i, { plannedPackagingQuantity: value == null ? '' : String(value) })}
                    disabled={!row.hasPackagingUnit} />
                </div>
                {products.length > 1 && (
                  <button type="button" onClick={() => removeProductRow(i)} className="h-[38px] px-2 text-red-400 hover:text-red-300 flex items-center">
                    <i className="pi pi-times text-[11px]" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {errors.products && <p className="text-[11px] text-red-400 mt-1">{errors.products}</p>}
        </div>}

        <FlatTextarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes for this stop..." rows={2} maxLength={500} size="sm" />
      </div>
    </FlatModal>
  );
};

export default AddStopModal;
