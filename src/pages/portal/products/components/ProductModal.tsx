import React, { useState, useEffect, useMemo } from 'react';
import { FlatModal } from '../../../../components/overlay';
import { FlatButton, FlatInputText, FlatInputNumber, FlatDropdown, FlatTextarea } from '../../../../components/flat-form';
import { productsApi, type Product, type Unit } from '../../../../api-client';
import { resetTableData } from '../../../../components/data-table';
import toast from 'react-hot-toast';

const EMPTY_UNITS: Unit[] = [];

interface ProductModalProps {
  visible: boolean;
  onHide: () => void;
  product: Product | null;
  units?: Unit[];
  onSuccess?: () => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  visible,
  onHide,
  product,
  units: propUnits = EMPTY_UNITS,
  onSuccess,
}) => {
  const isEditing = Boolean(product);
  const [name, setName] = useState('');
  const [basicUnitId, setBasicUnitId] = useState('');
  const [basicUnitPrice, setBasicUnitPrice] = useState<number | null>(0);
  const [packagingUnitId, setPackagingUnitId] = useState('');
  const [packagingUnitPrice, setPackagingUnitPrice] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [availableUnits, setAvailableUnits] = useState<Unit[]>(propUnits);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch active units list when modal opens
  useEffect(() => {
    if (!visible) return;

    let isMounted = true;
    setLoadingUnits(true);
    productsApi
      .getUnits({ isActive: true, pageSize: 100 })
      .then((unitsList) => {
        if (isMounted) {
          setAvailableUnits(unitsList);
        }
      })
      .catch(() => {
        if (isMounted && propUnits.length > 0) {
          setAvailableUnits(propUnits);
        }
      })
      .finally(() => {
        if (isMounted) setLoadingUnits(false);
      });

    return () => {
      isMounted = false;
    };
  }, [visible]);

  // Initialize form state
  useEffect(() => {
    if (!visible) return;
    if (product) {
      setName(product.name || '');
      setBasicUnitId(product.basicUnitId || '');
      setBasicUnitPrice(product.basicUnitPrice ?? 0);
      setPackagingUnitId(product.packagingUnitId || '');
      setPackagingUnitPrice(product.packagingUnitPrice ?? null);
      setDescription(product.description || '');
    } else {
      setName('');
      setBasicUnitId('');
      setBasicUnitPrice(0);
      setPackagingUnitId('');
      setPackagingUnitPrice(null);
      setDescription('');
    }
  }, [visible, product]);

  const unitOptions = useMemo(() => {
    const list = availableUnits.map((unit) => ({ label: unit.name, value: unit.id }));
    if (product?.basicUnitId && !list.some((option) => option.value === product.basicUnitId)) {
      list.unshift({ label: `${product.basicUnitName} (Current)`, value: product.basicUnitId });
    }
    if (product?.packagingUnitId && !list.some((option) => option.value === product.packagingUnitId)) {
      list.push({ label: `${product.packagingUnitName} (Current)`, value: product.packagingUnitId });
    }
    return list;
  }, [availableUnits, product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Product name is required.');
      return;
    }
    if (!basicUnitId) { toast.error('Basic unit is required.'); return; }
    if (basicUnitPrice === null || basicUnitPrice < 0) { toast.error('Enter a valid basic unit price.'); return; }
    if (packagingUnitId && packagingUnitId === basicUnitId) {
      toast.error('Packaging unit must differ from the basic unit.');
      return;
    }
    if (packagingUnitId && (packagingUnitPrice === null || packagingUnitPrice < 0)) {
      toast.error('Enter a valid packaging unit price.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        basicUnitId,
        basicUnitPrice,
        packagingUnitId: packagingUnitId || null,
        packagingUnitPrice: packagingUnitId ? packagingUnitPrice : null,
      };

      if (isEditing && product) {
        await productsApi.updateProduct(product.id, payload);
        toast.success(`Product "${name.trim()}" updated successfully.`);
      } else {
        await productsApi.createProduct(payload);
        toast.success(`Product "${name.trim()}" created successfully.`);
      }

      resetTableData();
      onHide();
      onSuccess?.();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.detail || 'Failed to save product.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FlatModal
      visible={visible}
      onHide={onHide}
      title={isEditing ? 'Edit Product' : 'Add Product'}
      size="md"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <FlatButton
            variant="danger-outline"
            label="Cancel"
            onClick={onHide}
            disabled={submitting}
          />
          <FlatButton
            variant="primary"
            label={submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Product'}
            icon={isEditing ? 'pi pi-check' : 'pi pi-plus'}
            onClick={handleSubmit}
            loading={submitting}
            disabled={submitting || !name.trim() || !basicUnitId || basicUnitPrice === null || (Boolean(packagingUnitId) && packagingUnitPrice === null)}
          />
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FlatInputText
          label="Product Name"
          placeholder="e.g. Paracetamol 500mg Tablets"
          value={name}
          onChange={(e) => setName(e.target.value)}
          size="md"
          maxLength={200}
          required
        />

        <FlatDropdown
          label="Basic Unit"
          value={basicUnitId}
          options={unitOptions}
          onChange={(val: string) => setBasicUnitId(val || '')}
          placeholder={loadingUnits ? 'Loading units...' : 'Select basic unit'}
          filter
          filterPlaceholder="Search unit..."
          size="md"
          required
        />

        <FlatInputNumber
          label="Basic Unit Price"
          value={basicUnitPrice}
          onChange={setBasicUnitPrice}
          min={0}
          minFractionDigits={2}
          maxFractionDigits={2}
          size="md"
          required
        />

        <FlatDropdown
          label="Packaging Unit (Optional)"
          value={packagingUnitId}
          options={unitOptions.filter((option) => option.value !== basicUnitId)}
          onChange={(val: string) => {
            setPackagingUnitId(val || '');
            if (!val) setPackagingUnitPrice(null);
          }}
          placeholder={loadingUnits ? 'Loading units...' : 'Select packaging unit'}
          filter
          filterPlaceholder="Search unit..."
          showClear
          size="md"
        />

        {packagingUnitId && (
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
        )}

        <FlatTextarea
          label="Description"
          placeholder="Clinical description, indications, or dosage guidelines (optional)..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          maxLength={500}
        />
      </form>
    </FlatModal>
  );
};

export default ProductModal;
