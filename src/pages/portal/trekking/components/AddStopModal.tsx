import React, { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';
import { FlatModal } from '../../../../components/overlay';
import { FlatButton, FlatDropdown } from '../../../../components/flat-form';
import { FlatAsyncSelect } from '../../../../components/flat-form/FlatAsyncSelect';
import {
  treksApi, customersApi, organisationApi,
  type Customer, type Product, type Region, type District,
} from '../../../../api-client';
import apiClient from '../../../../api-client/api';
import toast from 'react-hot-toast';

const schema = z.object({
  customerAccountId: z.string().min(1, 'Customer is required'),
  sequence: z.number().min(1, 'Sequence must be at least 1'),
});

interface ProductRow {
  productId: string;
  plannedQuantity: number;
}

interface Props {
  visible: boolean;
  onHide: () => void;
  trekId: string;
  nextSequence: number;
  onSuccess?: () => void;
}

export const AddStopModal: React.FC<Props> = ({ visible, onHide, trekId, nextSequence, onSuccess }) => {
  const [customerAccountId, setCustomerAccountId] = useState('');
  const [regionId, setRegionId]                   = useState('');
  const [districtId, setDistrictId]               = useState('');
  const [sequence, setSequence]                   = useState(nextSequence);
  const [notes, setNotes]                         = useState('');
  const [products, setProducts]                   = useState<ProductRow[]>([{ productId: '', plannedQuantity: 1 }]);
  const [regions, setRegions]                     = useState<Region[]>([]);
  const [districts, setDistricts]                 = useState<District[]>([]);
  const [loadingDistricts, setLoadingDistricts]   = useState(false);
  const [saving, setSaving]                       = useState(false);
  const [errors, setErrors]                       = useState<{ customerAccountId?: string; sequence?: string; products?: string }>({});

  // Load regions + products once on open
  useEffect(() => {
    if (visible) {
      setSequence(nextSequence);
      setCustomerAccountId('');
      setRegionId('');
      setDistrictId('');
      setDistricts([]);
      setNotes('');
      setProducts([{ productId: '', plannedQuantity: 1 }]);
      setErrors({});
      organisationApi.getRegions().then(setRegions).catch(() => {});
    }
  }, [visible, nextSequence]);

  // Load districts when region changes
  useEffect(() => {
    if (!regionId) { setDistricts([]); setDistrictId(''); return; }
    setLoadingDistricts(true);
    organisationApi.getDistricts(regionId)
      .then(setDistricts)
      .catch(() => {})
      .finally(() => setLoadingDistricts(false));
    setDistrictId('');
    setCustomerAccountId('');
  }, [regionId]);

  // Clear customer when district changes
  useEffect(() => {
    setCustomerAccountId('');
  }, [districtId]);

  const fetchProducts = useCallback(async (params: { pageNumber: number; pageSize: number; search?: string }) => {
    const res = await apiClient.get<any>('/products', { params: { ...params, isActive: true } });
    const raw  = res.data?.data ?? res.data?.items ?? (Array.isArray(res.data) ? res.data : []);
    return { data: raw as Product[], totalPages: res.data?.totalPages ?? 1 };
  }, []);

  // fetchFn recreated when regionId or districtId changes
  const fetchCustomers = useCallback(async (params: { pageNumber: number; pageSize: number; search?: string }) => {
    const res = await customersApi.getCustomers({
      ...params,
      ...(regionId   ? { regionId }   : {}),
      ...(districtId ? { districtId } : {}),
    });
    const raw: Customer[] = res?.data ?? res?.items ?? (Array.isArray(res) ? res : []);
    return { data: raw, totalPages: res?.totalPages ?? 1 };
  }, [regionId, districtId]);

  const regionOptions = [
    { label: 'All Regions', value: '' },
    ...regions.map((r) => ({ label: r.name, value: r.id })),
  ];

  const districtOptions = [
    { label: regionId ? 'All Districts' : 'Select region first', value: '' },
    ...districts.map((d) => ({ label: d.name, value: d.id })),
  ];

  const addProductRow    = () => setProducts((p) => [...p, { productId: '', plannedQuantity: 1 }]);
  const removeProductRow = (i: number) => setProducts((p) => p.filter((_, idx) => idx !== i));
  const updateProductRow = (i: number, field: keyof ProductRow, value: any) =>
    setProducts((p) => p.map((row, idx) => idx === i ? { ...row, [field]: value } : row));

  const handleSubmit = async () => {
    const validProducts = products.filter((p) => p.productId && p.plannedQuantity > 0);
    const result = schema.safeParse({ customerAccountId, sequence });
    const errs: typeof errors = {};
    if (!result.success) {
      result.error.issues.forEach((i) => {
        const f = i.path[0] as keyof typeof errors;
        if (!errs[f]) errs[f] = i.message;
      });
    }
    if (validProducts.length === 0) errs.products = 'Add at least one product with a quantity.';
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSaving(true);
    try {
      await treksApi.addStop(trekId, {
        customerAccountId,
        sequence,
        notes: notes.trim() || undefined,
        products: validProducts,
      });
      toast.success('Stop added.');
      onSuccess?.();
      onHide();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Failed to add stop.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <FlatModal
      visible={visible}
      onHide={onHide}
      title="Add Stop"
      subtitle="Add a customer delivery stop to this trek"
      size="md"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <FlatButton variant="danger-outline" label="Cancel" onClick={onHide} disabled={saving} />
          <FlatButton variant="primary" label={saving ? 'Adding...' : 'Add Stop'} icon="pi pi-plus" onClick={handleSubmit} loading={saving} disabled={saving} />
        </div>
      }
    >
      <div className="space-y-4 py-1 text-xs">

        {/* Region + District filters */}
        <div className="grid grid-cols-2 gap-3">
          <FlatDropdown
            label="Region"
            options={regionOptions}
            value={regionId}
            onChange={(v: any) => setRegionId(v?.value !== undefined ? v.value : v)}
            placeholder="All Regions"
            size="sm"
          />
          <FlatDropdown
            label="District"
            options={districtOptions}
            value={districtId}
            onChange={(v: any) => setDistrictId(v?.value !== undefined ? v.value : v)}
            placeholder={regionId ? 'All Districts' : 'Select region first'}
            disabled={!regionId || loadingDistricts}
            size="sm"
          />
        </div>

        {/* Customer async search — key forces remount on filter change */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <FlatAsyncSelect<Customer>
              key={`${regionId}:${districtId}`}
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
          </div>
          <div>
            <label className="block text-[11px] font-medium text-portal-muted mb-1">
              Sequence <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              min={1}
              value={sequence}
              onChange={(e) => setSequence(Number(e.target.value))}
              className="w-full h-[38px] px-3 text-xs bg-portal-canvas border border-portal-border rounded text-white focus:outline-none focus:border-portal-accent"
            />
            {errors.sequence && <p className="text-[11px] text-red-400 mt-1">{errors.sequence}</p>}
          </div>
        </div>

        {/* Products */}
        <div>
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
              <div key={i} className="flex items-start gap-2">
                <div className="flex-1">
                  <FlatAsyncSelect<Product>
                    placeholder="Search product..."
                    value={row.productId}
                    onChange={(v) => updateProductRow(i, 'productId', v ?? '')}
                    fetchFn={fetchProducts}
                    optionValue="id"
                    optionLabel={(p) => `${p.name}${p.unit ? ` (${p.unit})` : ''}`}
                    itemTemplate={(p) => (
                      <div>
                        <span className="text-white text-xs">{p.name}</span>
                        {p.unit && <span className="text-portal-muted text-[11px] ml-1.5">({p.unit})</span>}
                      </div>
                    )}
                    size="sm"
                    clearable={false}
                  />
                </div>
                <div className="w-24">
                  <input
                    type="number"
                    min={1}
                    value={row.plannedQuantity}
                    onChange={(e) => updateProductRow(i, 'plannedQuantity', Number(e.target.value))}
                    placeholder="Qty"
                    className="w-full h-[38px] px-3 text-xs bg-portal-canvas border border-portal-border rounded text-white focus:outline-none focus:border-portal-accent"
                  />
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
        </div>

        <div>
          <label className="block text-[11px] font-medium text-portal-muted mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes for this stop..."
            rows={2}
            className="w-full px-3 py-2 text-xs bg-portal-canvas border border-portal-border rounded text-white focus:outline-none focus:border-portal-accent resize-none"
          />
        </div>
      </div>
    </FlatModal>
  );
};

export default AddStopModal;
