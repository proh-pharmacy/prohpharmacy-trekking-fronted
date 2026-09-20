import React, { useEffect, useMemo, useState } from 'react';
import { FlatModal } from '../../../../components/overlay';
import { FlatButton, FlatDropdown, FlatInputNumber } from '../../../../components/flat-form';
import { resetTableData } from '../../../../components/data-table';
import { productsApi, type Product, type Unit } from '../../../../api-client';
import toast from 'react-hot-toast';

interface PackagingUnitModalProps {
  visible: boolean;
  onHide: () => void;
  product: Product | null;
}

export const PackagingUnitModal: React.FC<PackagingUnitModalProps> = ({ visible, onHide, product }) => {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [packagingUnitId, setPackagingUnitId] = useState('');
  const [packagingUnitPrice, setPackagingUnitPrice] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setPackagingUnitId(product?.packagingUnitId || '');
    setPackagingUnitPrice(product?.packagingUnitPrice ?? null);
    let mounted = true;
    setLoadingUnits(true);
    productsApi.getUnits({ isActive: true, pageSize: 100 })
      .then((items) => { if (mounted) setUnits(items); })
      .catch(() => { if (mounted) toast.error('Failed to load units.'); })
      .finally(() => { if (mounted) setLoadingUnits(false); });
    return () => { mounted = false; };
  }, [visible, product]);

  const options = useMemo(() => {
    const available = units
      .filter((unit) => unit.id !== product?.basicUnitId)
      .map((unit) => ({ label: unit.name, value: unit.id }));
    if (product?.packagingUnitId && !available.some((item) => item.value === product.packagingUnitId)) {
      available.unshift({ label: `${product.packagingUnitName} (Current)`, value: product.packagingUnitId });
    }
    return available;
  }, [units, product]);

  const updatePackagingUnit = async (unitId: string | null, price: number | null) => {
    if (!product) return;
    setSaving(true);
    try {
      await productsApi.setPackagingUnit(product.id, unitId, price);
      resetTableData();
      toast.success(unitId ? 'Packaging unit saved.' : 'Packaging unit cleared.');
      onHide();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update packaging unit.');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    if (!packagingUnitId) { toast.error('Select a packaging unit.'); return; }
    if (packagingUnitId === product?.basicUnitId) { toast.error('Packaging unit must differ from the basic unit.'); return; }
    if (packagingUnitPrice === null || packagingUnitPrice < 0) { toast.error('Enter a valid packaging unit price.'); return; }
    updatePackagingUnit(packagingUnitId, packagingUnitPrice);
  };

  return (
    <FlatModal
      visible={visible}
      onHide={onHide}
      title="Packaging Unit"
      size="sm"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          {product?.packagingUnitId && (
            <FlatButton variant="danger-outline" label="Clear" onClick={() => updatePackagingUnit(null, null)} disabled={saving} />
          )}
          <FlatButton variant="outline" label="Cancel" onClick={onHide} disabled={saving} />
          <FlatButton variant="primary" label={saving ? 'Saving...' : 'Save'} onClick={handleSave} loading={saving} disabled={saving || !packagingUnitId || packagingUnitPrice === null} />
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-xs text-white font-semibold">{product?.name}</p>
        <p className="text-[11px] text-portal-muted">Basic unit: {product?.basicUnitName || '—'}</p>
        <FlatDropdown
          label="Packaging Unit"
          value={packagingUnitId}
          options={options}
          onChange={(value: string) => setPackagingUnitId(value || '')}
          placeholder={loadingUnits ? 'Loading units...' : 'Select packaging unit'}
          filter
          filterPlaceholder="Search unit..."
          size="md"
          required
        />
        <FlatInputNumber
          label="Packaging Unit Price"
          value={packagingUnitPrice}
          onChange={setPackagingUnitPrice}
          min={0}
          minFractionDigits={2}
          maxFractionDigits={2}
          size="md"
          required
        />
      </div>
    </FlatModal>
  );
};
