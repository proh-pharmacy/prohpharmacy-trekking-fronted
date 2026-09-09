import React, { useState, useEffect, useMemo } from 'react';
import { FlatModal } from '../../../../components/overlay';
import { FlatButton, FlatInputText, FlatDropdown } from '../../../../components/flat-form';
import {
  organisationApi,
  type Branch,
  type BranchType,
  type District,
  type Region,
  type CreateBranchPayload,
  type UpdateBranchPayload,
} from '../../../../api-client';
import { resetTableData } from '../../../../components/data-table';
import toast from 'react-hot-toast';

interface BranchModalProps {
  visible: boolean;
  onHide: () => void;
  branch: Branch | null;
  districts?: District[];
  regions?: Region[];
  onSuccess?: () => void;
}

const BRANCH_TYPE_OPTIONS = [
  { label: 'Retail (Pharmacy Branch)', value: 'Retail' },
  { label: 'Wholesale (Distribution Hub)', value: 'Wholesale' },
  { label: 'Laboratory (Testing & Diagnostics)', value: 'Laboratory' },
];

export const BranchModal: React.FC<BranchModalProps> = ({
  visible,
  onHide,
  branch,
  districts: initialDistricts = [],
  regions: initialRegions = [],
  onSuccess,
}) => {
  const isEditing = Boolean(branch);
  const [name, setName] = useState('');
  const [branchType, setBranchType] = useState<BranchType>('Retail');
  const [selectedRegionId, setSelectedRegionId] = useState<string>('');
  const [districtId, setDistrictId] = useState('');
  const [address, setAddress] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [availableRegions, setAvailableRegions] = useState<Region[]>(initialRegions);
  const [districtsInRegion, setDistrictsInRegion] = useState<District[]>([]);
  const [loadingDistricts, setLoadingDistricts] = useState(false);

  // 1. Initialize or load regions on open
  useEffect(() => {
    if (!visible) return;

    if (initialRegions && initialRegions.length > 0) {
      setAvailableRegions(initialRegions);
    } else {
      let isMounted = true;
      organisationApi
        .getRegions()
        .then((regs) => {
          if (isMounted && Array.isArray(regs) && regs.length > 0) {
            setAvailableRegions(regs);
          }
        })
        .catch(() => {});
      return () => {
        isMounted = false;
      };
    }
  }, [visible, initialRegions]);

  // 2. Initialize form state on open / branch change
  useEffect(() => {
    if (!visible) return;

    if (branch) {
      setName(branch.name || '');
      setBranchType(branch.branchType || 'Retail');
      setAddress(branch.address || '');
      setContactNumber(branch.contactNumber || branch.phoneNumber || '');
      setDistrictId(branch.districtId || '');
      setLatitude(branch.latitude != null ? String(branch.latitude) : '');
      setLongitude(branch.longitude != null ? String(branch.longitude) : '');

      // Infer regionId from branch.regionId or matching district
      if (branch.regionId) {
        setSelectedRegionId(branch.regionId);
      } else {
        const matchingDist = initialDistricts.find((d) => d.id === branch.districtId);
        if (matchingDist?.regionId) {
          setSelectedRegionId(matchingDist.regionId);
        }
      }
    } else {
      setName('');
      setBranchType('Retail');
      setAddress('');
      setContactNumber('+233');
      setDistrictId('');
      setLatitude('');
      setLongitude('');
      if (availableRegions.length > 0) {
        setSelectedRegionId((prev) => prev || availableRegions[0].id);
      }
    }
  }, [branch, visible, initialDistricts, availableRegions]);

  // 3. Whenever selectedRegionId changes, fetch and display strictly the districts for that region
  useEffect(() => {
    if (!visible || !selectedRegionId) {
      setDistrictsInRegion([]);
      return;
    }

    let isMounted = true;
    const loadDistrictsForRegion = async () => {
      setLoadingDistricts(true);
      try {
        const fetched = await organisationApi.getDistricts(selectedRegionId);
        if (isMounted) {
          setDistrictsInRegion(fetched);
          if (fetched.length > 0) {
            // If current districtId is in this region, keep it; otherwise pick first
            setDistrictId((prev) => (fetched.some((d) => d.id === prev) ? prev : fetched[0].id));
          } else {
            setDistrictId('');
          }
        }
      } catch {
        // Fallback to initialDistricts
        if (isMounted) {
          const fallback = initialDistricts.filter((d) => d.regionId === selectedRegionId);
          setDistrictsInRegion(fallback);
          if (fallback.length > 0) {
            setDistrictId((prev) => (fallback.some((d) => d.id === prev) ? prev : fallback[0].id));
          } else {
            setDistrictId('');
          }
        }
      } finally {
        if (isMounted) setLoadingDistricts(false);
      }
    };

    loadDistrictsForRegion();
    return () => {
      isMounted = false;
    };
  }, [visible, selectedRegionId]);

  const regionOptions = useMemo(
    () =>
      availableRegions.map((r) => ({
        label: r.name,
        value: r.id,
      })),
    [availableRegions]
  );

  const districtOptions = useMemo(
    () =>
      districtsInRegion.map((d) => ({
        label: d.name,
        value: d.id,
      })),
    [districtsInRegion]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Branch name is required.');
      return;
    }
    if (!selectedRegionId) {
      toast.error('Please select a region for the branch.');
      return;
    }
    if (!districtId) {
      toast.error('Please select a district for the branch.');
      return;
    }
    if (!address.trim()) {
      toast.error('Street address is required.');
      return;
    }
    if (!contactNumber.trim() || contactNumber.trim() === '+233') {
      toast.error('Official contact phone is required.');
      return;
    }

    const parsedLat = latitude.trim() !== '' && !isNaN(Number(latitude)) ? Number(latitude) : null;
    const parsedLng = longitude.trim() !== '' && !isNaN(Number(longitude)) ? Number(longitude) : null;

    setSubmitting(true);
    try {
      if (isEditing && branch) {
        const updatePayload: UpdateBranchPayload = {
          name: name.trim(),
          branchType,
          regionId: selectedRegionId,
          districtId,
          address: address.trim(),
          contactNumber: contactNumber.trim(),
          latitude: parsedLat,
          longitude: parsedLng,
        };
        await organisationApi.updateBranch(branch.id, updatePayload);
        toast.success(`Branch "${name}" updated successfully.`);
      } else {
        const createPayload: CreateBranchPayload = {
          name: name.trim(),
          branchType,
          regionId: selectedRegionId,
          districtId,
          address: address.trim(),
          contactNumber: contactNumber.trim(),
          ...(parsedLat !== null ? { latitude: parsedLat } : {}),
          ...(parsedLng !== null ? { longitude: parsedLng } : {}),
        };
        await organisationApi.createBranch(createPayload);
        toast.success(`Branch "${name}" created successfully.`);
      }

      resetTableData();
      onHide();
      onSuccess?.();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.detail || 'Failed to save branch.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FlatModal
      visible={visible}
      onHide={onHide}
      title={isEditing ? 'Edit Branch' : 'Add Branch'}
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
            label={submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Branch'}
            icon={isEditing ? 'pi pi-check' : 'pi pi-plus'}
            onClick={handleSubmit}
            loading={submitting}
            disabled={submitting || !districtId || !name.trim()}
          />
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name and Branch Type */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FlatInputText
            label="Branch / Depot Name"
            placeholder="e.g. Ashaiman Regional Hub"
            value={name}
            onChange={(e) => setName(e.target.value)}
            size="sm"
            required
          />

          <FlatDropdown
            label="Branch Type"
            value={branchType}
            options={BRANCH_TYPE_OPTIONS}
            onChange={(val: any) => setBranchType(val?.value !== undefined ? val.value : val)}
            placeholder="Select Type"
            size="sm"
            required
          />
        </div>

        {/* Region & District hierarchy */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FlatDropdown
            label="Region"
            value={selectedRegionId}
            options={regionOptions}
            onChange={(val: any) => setSelectedRegionId(val?.value !== undefined ? val.value : val)}
            placeholder="Select Region"
            filter
            filterPlaceholder="Search region..."
            size="sm"
            required
          />

          <FlatDropdown
            label="District"
            value={districtId}
            options={districtOptions}
            onChange={(val: any) => setDistrictId(val?.value !== undefined ? val.value : val)}
            placeholder={
              loadingDistricts
                ? 'Loading districts...'
                : !selectedRegionId
                ? 'Select Region first'
                : districtOptions.length === 0
                ? 'No districts found'
                : 'Select District'
            }
            filter
            filterPlaceholder="Search district..."
            disabled={!selectedRegionId || loadingDistricts || districtOptions.length === 0}
            size="sm"
            required
          />
        </div>

        {/* Address and Contact Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FlatInputText
            label="Physical Street Address"
            placeholder="e.g. Plot 5, Harbour Road, Tema"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            size="sm"
            required
          />

          <FlatInputText
            label="Official Contact Phone"
            placeholder="e.g. +233 20 123 4567"
            value={contactNumber}
            onChange={(e) => setContactNumber(e.target.value)}
            size="sm"
            required
          />
        </div>

        {/* Optional GPS Coordinates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FlatInputText
            label="Latitude (Optional)"
            placeholder="e.g. 5.6698"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            size="sm"
          />

          <FlatInputText
            label="Longitude (Optional)"
            placeholder="e.g. -0.0166"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            size="sm"
          />
        </div>
      </form>
    </FlatModal>
  );
};

export default BranchModal;
