import React, { useState, useEffect, useMemo } from 'react';
import { FlatModal } from '../../../../components/overlay';
import { FlatButton, FlatInputText, FlatDropdown, FlatTextarea } from '../../../../components/flat-form';
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
  const [selectedUnit, setSelectedUnit] = useState<string>('');
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
      setSelectedUnit(product.unit || '');
      setDescription(product.description || '');
    } else {
      setName('');
      setSelectedUnit('');
      setDescription('');
    }
  }, [visible, product]);

  const unitOptions = useMemo(() => {
    const list = availableUnits.map((u) => ({
      label: u.name,
      value: u.name,
    }));
    // If editing and current product unit is not in active units, preserve it in options
    if (product?.unit && !list.some((opt) => opt.value === product.unit)) {
      list.unshift({ label: `${product.unit} (Current)`, value: product.unit });
    }
    return list;
  }, [availableUnits, product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Product name is required.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        unit: selectedUnit.trim() || undefined,
        description: description.trim() || undefined,
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
            disabled={submitting || !name.trim()}
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
          size="sm"
          maxLength={200}
          required
        />

        <FlatDropdown
          label="Packaging Unit"
          value={selectedUnit}
          options={unitOptions}
          onChange={(val: any) => setSelectedUnit(val?.value !== undefined ? val.value : val)}
          placeholder={loadingUnits ? 'Loading units...' : 'Select unit of measure'}
          filter
          filterPlaceholder="Search unit..."
          size="sm"
          helperText="Select packaging format (e.g. Strips, Boxes, Cartons)."
        />

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
