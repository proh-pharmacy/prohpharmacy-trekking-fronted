import React, { useState, useEffect, useMemo } from 'react';
import { FlatModal } from '../../../../components/overlay';
import { FlatButton, FlatInputText, FlatDropdown } from '../../../../components/flat-form';
import { fleetApi, organisationApi, type Vehicle, type Branch, type Region } from '../../../../api-client';
import { resetTableData } from '../../../../components/data-table';
import toast from 'react-hot-toast';

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR + 1 - 1990 + 1 }, (_, i) => {
  const y = CURRENT_YEAR + 1 - i;
  return { label: String(y), value: y };
});

interface VehicleModalProps {
  visible: boolean;
  onHide: () => void;
  vehicle: Vehicle | null;
}

export const VehicleModal: React.FC<VehicleModalProps> = ({ visible, onHide, vehicle }) => {
  const isEditing = Boolean(vehicle);

  const [registrationNumber, setRegistrationNumber] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState<number | null>(null);
  const [colour, setColour] = useState('');
  const [regionId, setRegionId] = useState('');
  const [branchId, setBranchId] = useState('');

  const [regions, setRegions] = useState<Region[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingRegions, setLoadingRegions] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let mounted = true;
    setLoadingRegions(true);
    setLoadingBranches(true);
    organisationApi
      .getRegions()
      .then((items) => { if (mounted) setRegions(items); })
      .catch(() => { if (mounted) toast.error('Failed to load regions.'); })
      .finally(() => { if (mounted) setLoadingRegions(false); });
    organisationApi
      .getBranches()
      .then((b) => { if (mounted) setBranches(b); })
      .catch(() => {})
      .finally(() => { if (mounted) setLoadingBranches(false); });
    return () => { mounted = false; };
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    if (vehicle) {
      setRegistrationNumber(vehicle.registrationNumber || '');
      setDisplayName(vehicle.displayName || '');
      setMake(vehicle.make || '');
      setModel(vehicle.model || '');
      setYear(vehicle.year || null);
      setColour(vehicle.colour || '');
      setRegionId(vehicle.regionId || '');
      setBranchId(vehicle.branchId || '');
    } else {
      setRegistrationNumber('');
      setDisplayName('');
      setMake('');
      setModel('');
      setYear(null);
      setColour('');
      setRegionId('');
      setBranchId('');
    }
  }, [visible, vehicle]);

  const regionOptions = useMemo(
    () => regions.map((region) => ({ label: region.name, value: region.id })),
    [regions]
  );

  const branchOptions = useMemo(
    () => branches.filter((branch) => branch.isActive && branch.regionId === regionId)
      .map((branch) => ({ label: branch.name, value: branch.id })),
    [branches, regionId]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) { toast.error('Display name is required.'); return; }
    if (!isEditing && !registrationNumber.trim()) { toast.error('Registration number is required.'); return; }
    if (!make.trim()) { toast.error('Make is required.'); return; }
    if (!model.trim()) { toast.error('Model is required.'); return; }
    if (!year) { toast.error('Year is required.'); return; }
    if (!colour.trim()) { toast.error('Colour is required.'); return; }
    if (!regionId) { toast.error('Trekking region is required.'); return; }

    setSubmitting(true);
    try {
      if (isEditing && vehicle) {
        await fleetApi.updateVehicle(vehicle.id, {
          displayName: displayName.trim(),
          make: make.trim(),
          model: model.trim(),
          year,
          colour: colour.trim(),
          regionId,
          branchId: branchId || undefined,
        });
        toast.success(`Vehicle "${displayName.trim()}" updated.`);
      } else {
        await fleetApi.createVehicle({
          registrationNumber: registrationNumber.trim().toUpperCase(),
          displayName: displayName.trim(),
          make: make.trim(),
          model: model.trim(),
          year,
          colour: colour.trim(),
          regionId,
          branchId: branchId || undefined,
        });
        toast.success(`Vehicle "${displayName.trim()}" registered.`);
      }
      resetTableData();
      onHide();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.detail || 'Failed to save vehicle.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="mt-4 mb-3">
      <span className="text-[11px] font-medium text-portal-muted uppercase tracking-wide">{children}</span>
      <div className="h-[1px] w-full bg-portal-border mt-2" />
    </div>
  );

  return (
    <FlatModal
      visible={visible}
      onHide={onHide}
      title={isEditing ? 'Edit Vehicle' : 'Register Vehicle'}
      size="md"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <FlatButton variant="danger-outline" label="Cancel" onClick={onHide} disabled={submitting} />
          <FlatButton
            variant="primary"
            label={submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Register'}
            icon={isEditing ? 'pi pi-check' : 'pi pi-plus'}
            onClick={handleSubmit}
            loading={submitting}
            disabled={submitting}
          />
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <SectionLabel>Vehicle Details</SectionLabel>

        {!isEditing && (
          <FlatInputText
            label="Registration Number"
            placeholder="e.g. GR-1234-24"
            value={registrationNumber}
            onChange={(e) => setRegistrationNumber(e.target.value)}
            size="md"
            maxLength={30}
            required
          />
        )}
        {isEditing && (
          <div className="flex items-center gap-2 bg-portal-canvas border border-portal-border rounded px-3 py-2">
            <i className="pi pi-lock text-portal-muted text-xs" />
            <span className="text-[11px] text-portal-muted uppercase tracking-wide">Registration</span>
            <span className="text-xs font-mono text-white ml-auto">{vehicle?.registrationNumber}</span>
          </div>
        )}

        <FlatInputText
          label="Display Name"
          placeholder="e.g. Sprinter Van 1"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          size="md"
          maxLength={80}
          required
        />

        <FlatDropdown
          label="Trekking Region"
          value={regionId}
          options={regionOptions}
          onChange={(val: any) => {
            const nextRegionId = val?.value !== undefined ? val.value : val;
            setRegionId(nextRegionId || '');
            setBranchId('');
          }}
          placeholder={loadingRegions ? 'Loading regions...' : 'Select trekking region'}
          filter
          filterPlaceholder="Search region..."
          size="md"
          required
        />

        <FlatDropdown
          label="Branch (Optional)"
          value={branchId}
          options={branchOptions}
          onChange={(val: any) => setBranchId(val?.value !== undefined ? val.value : val || '')}
          placeholder={loadingBranches ? 'Loading branches...' : regionId ? 'Select branch' : 'Select region first'}
          filter
          filterPlaceholder="Search branch..."
          showClear
          size="md"
          disabled={!regionId}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FlatInputText
            label="Make"
            placeholder="e.g. Mercedes-Benz"
            value={make}
            onChange={(e) => setMake(e.target.value)}
            size="md"
            maxLength={80}
            required
          />
          <FlatInputText
            label="Model"
            placeholder="e.g. Sprinter"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            size="md"
            maxLength={80}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FlatDropdown
            label="Year"
            value={year}
            options={YEAR_OPTIONS}
            onChange={(val: any) => setYear(val?.value !== undefined ? val.value : val)}
            placeholder="Select year"
            filter
            filterPlaceholder="Search year..."
            size="md"
          />
          <FlatInputText
            label="Colour"
            placeholder="e.g. White"
            value={colour}
            onChange={(e) => setColour(e.target.value)}
            size="md"
            maxLength={50}
            required
          />
        </div>

      </form>
    </FlatModal>
  );
};

export default VehicleModal;
