import React, { useState, useEffect } from 'react';
import { FlatModal } from '../../../../components/overlay';
import { FlatButton, FlatInputText, FlatDropdown } from '../../../../components/flat-form';
import { organisationApi, type Region } from '../../../../api-client';
import toast from 'react-hot-toast';

interface DistrictModalProps {
  visible: boolean;
  onHide: () => void;
  regions: Region[];
  defaultRegionId?: string;
  onSuccess?: () => void;
}

export const DistrictModal: React.FC<DistrictModalProps> = ({
  visible,
  onHide,
  regions,
  defaultRegionId,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [regionId, setRegionId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setName('');
    setRegionId(defaultRegionId || regions[0]?.id || '');
  }, [visible, defaultRegionId, regions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('District name is required.');
      return;
    }
    if (!regionId) {
      toast.error('Please select a region.');
      return;
    }

    setSubmitting(true);
    try {
      await organisationApi.createDistrict({
        name: name.trim(),
        regionId,
      });
      toast.success(`District "${name}" created successfully.`);
      onHide();
      onSuccess?.();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Failed to create district.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const regionOptions = regions.map((r) => ({
    label: r.name,
    value: r.id,
  }));

  return (
    <FlatModal
      visible={visible}
      onHide={onHide}
      title="Create Administrative District"
      subtitle="Define a district zone under a Ghana administrative region"
      badge="Setup"
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
            label={submitting ? 'Creating...' : 'Create District'}
            icon="pi pi-plus"
            onClick={handleSubmit}
            disabled={submitting}
          />
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#adbac7] mb-1.5">
            Parent Region <span className="text-red-accent">*</span>
          </label>
          <FlatDropdown
            value={regionId}
            options={regionOptions}
            onChange={(e) => setRegionId(e.value)}
            placeholder="Select Region"
          />
        </div>

        <FlatInputText
          label="District Name"
          placeholder="e.g. Tema Metropolitan"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </form>
    </FlatModal>
  );
};

export default DistrictModal;
