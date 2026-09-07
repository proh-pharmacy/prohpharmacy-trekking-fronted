import React, { useState, useEffect } from 'react';
import { FlatModal } from '../../../../components/overlay';
import { FlatButton, FlatInputText, FlatDropdown } from '../../../../components/flat-form';
import { organisationApi, type Branch, type District, type Region } from '../../../../api-client';
import toast from 'react-hot-toast';

interface BranchModalProps {
  visible: boolean;
  onHide: () => void;
  branch: Branch | null;
  districts: District[];
  regions: Region[];
  onSuccess?: () => void;
}

export const BranchModal: React.FC<BranchModalProps> = ({
  visible,
  onHide,
  branch,
  districts,
  regions,
  onSuccess,
}) => {
  const isEditing = Boolean(branch);
  const [name, setName] = useState('');
  const [selectedRegionId, setSelectedRegionId] = useState<string>('');
  const [districtId, setDistrictId] = useState('');
  const [address, setAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (branch) {
      setName(branch.name);
      setDistrictId(branch.districtId);
      setAddress(branch.address);
      setPhoneNumber(branch.phoneNumber);
      // Find region from district
      const matchingDist = districts.find((d) => d.id === branch.districtId);
      if (matchingDist) {
        setSelectedRegionId(matchingDist.regionId);
      }
    } else {
      setName('');
      setDistrictId(districts[0]?.id || '');
      setAddress('');
      setPhoneNumber('+233');
      setSelectedRegionId(regions[0]?.id || '');
    }
  }, [branch, visible, districts, regions]);

  // Filter districts based on selected region
  const filteredDistricts = selectedRegionId
    ? districts.filter((d) => d.regionId === selectedRegionId)
    : districts;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Branch name is required.');
      return;
    }
    if (!isEditing && !districtId) {
      toast.error('Please assign a district.');
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing && branch) {
        await organisationApi.updateBranch(branch.id, {
          name: name.trim(),
          address: address.trim(),
          phoneNumber: phoneNumber.trim(),
        });
        toast.success(`Branch "${name}" updated successfully.`);
      } else {
        await organisationApi.createBranch({
          name: name.trim(),
          districtId,
          address: address.trim(),
          phoneNumber: phoneNumber.trim(),
        });
        toast.success(`Branch "${name}" created successfully.`);
      }

      onHide();
      onSuccess?.();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Failed to save branch.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const districtOptions = filteredDistricts.map((d) => ({
    label: d.name,
    value: d.id,
  }));

  const regionOptions = regions.map((r) => ({
    label: r.name,
    value: r.id,
  }));

  return (
    <FlatModal
      visible={visible}
      onHide={onHide}
      title={isEditing ? 'Edit Operational Branch' : 'New Operational Branch'}
      subtitle={
        isEditing
          ? `Modify details and location contact for ${branch?.name}`
          : 'Establish a new regional dispatch office or physical depot'
      }
      icon="pi pi-building"
      badge={isEditing ? 'Update' : 'New Hub'}
      size="md"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <FlatButton
            variant="outline"
            label="Cancel"
            onClick={onHide}
            disabled={submitting}
          />
          <FlatButton
            variant="primary"
            label={submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Branch'}
            icon={isEditing ? 'pi pi-check' : 'pi pi-plus'}
            onClick={handleSubmit}
            disabled={submitting}
          />
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FlatInputText
          label="Branch / Depot Name"
          placeholder="e.g. Ashaiman Regional Hub"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        {!isEditing && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#adbac7] mb-1.5">
                Region <span className="text-red-accent">*</span>
              </label>
              <FlatDropdown
                value={selectedRegionId}
                options={regionOptions}
                onChange={(e) => {
                  setSelectedRegionId(e.value);
                  const firstInRegion = districts.find((d) => d.regionId === e.value);
                  if (firstInRegion) setDistrictId(firstInRegion.id);
                }}
                placeholder="Select Region"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#adbac7] mb-1.5">
                District <span className="text-red-accent">*</span>
              </label>
              <FlatDropdown
                value={districtId}
                options={districtOptions}
                onChange={(e) => setDistrictId(e.value)}
                placeholder="Select District"
              />
            </div>
          </div>
        )}

        <FlatInputText
          label="Physical Street Address"
          placeholder="e.g. 14 Hospital Road, Near Regional Cold Store"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          helperText="Used on mission sheets and fleet delivery manifests."
        />

        <FlatInputText
          label="Official Contact Phone"
          placeholder="e.g. +233 20 123 4567"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          helperText="Direct line for trek dispatch coordination."
        />
      </form>
    </FlatModal>
  );
};

export default BranchModal;
