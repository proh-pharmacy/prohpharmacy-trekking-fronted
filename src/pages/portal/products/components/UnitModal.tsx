import React, { useState, useEffect } from 'react';
import { FlatModal } from '../../../../components/overlay';
import { FlatButton, FlatInputText } from '../../../../components/flat-form';
import { productsApi, type Unit } from '../../../../api-client';
import { resetTableData } from '../../../../components/data-table';
import toast from 'react-hot-toast';

interface UnitModalProps {
  visible: boolean;
  onHide: () => void;
  unit: Unit | null;
  onSuccess?: () => void;
}

export const UnitModal: React.FC<UnitModalProps> = ({
  visible,
  onHide,
  unit,
  onSuccess,
}) => {
  const isEditing = Boolean(unit);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (unit) {
      setName(unit.name || '');
    } else {
      setName('');
    }
  }, [visible, unit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Unit name is required.');
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing && unit) {
        await productsApi.updateUnit(unit.id, { name: name.trim() });
        toast.success(`Unit "${name.trim()}" updated successfully.`);
      } else {
        await productsApi.createUnit({ name: name.trim() });
        toast.success(`Unit "${name.trim()}" created successfully.`);
      }

      resetTableData();
      onHide();
      onSuccess?.();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.detail || 'Failed to save unit.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FlatModal
      visible={visible}
      onHide={onHide}
      title={isEditing ? 'Edit Unit' : 'Add Unit'}
      size="sm"
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
            label={submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Unit'}
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
          label="Unit Name"
          placeholder="e.g. Strips, Cartons, Boxes, Bottles"
          value={name}
          onChange={(e) => setName(e.target.value)}
          size="sm"
          maxLength={80}
          required
        />
      </form>
    </FlatModal>
  );
};

export default UnitModal;
