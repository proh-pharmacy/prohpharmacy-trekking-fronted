import React, { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';
import { FlatModal } from '../../../../components/overlay';
import { FlatButton, FlatDropdown, FlatTextarea } from '../../../../components/flat-form';
import { FlatAsyncSelect } from '../../../../components/flat-form/FlatAsyncSelect';
import { treksApi, fleetApi, organisationApi, type Branch, type Region, type Vehicle, type StaffItem } from '../../../../api-client';
import { resetTableData } from '../../../../components/data-table';
import toast from 'react-hot-toast';

const schema = z.object({
  regionId:      z.string().min(1, 'Trekking region is required'),
  scheduledDate: z.string().min(1, 'Scheduled date is required'),
  vehicleId:     z.string().min(1, 'Vehicle is required'),
});

type Errors = Partial<Record<keyof z.infer<typeof schema>, string>>;

interface Props {
  visible: boolean;
  onHide: () => void;
  onSuccess?: () => void;
}

export const CreateTrekModal: React.FC<Props> = ({ visible, onHide, onSuccess }) => {
  const [regionId, setRegionId]           = useState('');
  const [branchId, setBranchId]           = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [vehicleId, setVehicleId]         = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [salesStaffId, setSalesStaffId]   = useState('');
  const [notes, setNotes]                 = useState('');
  const [saving, setSaving]               = useState(false);
  const [errors, setErrors]               = useState<Errors>({});
  const [branches, setBranches]           = useState<Branch[]>([]);
  const [regions, setRegions]             = useState<Region[]>([]);

  const clearError = (field: keyof Errors) =>
    setErrors((p) => { const n = { ...p }; delete n[field]; return n; });

  useEffect(() => {
    if (visible) {
      organisationApi.getRegions().then(setRegions).catch(() => {});
      organisationApi.getBranches().then(setBranches).catch(() => {});
    }
  }, [visible]);

  const fetchVehicles = useCallback(async (params: { pageNumber: number; pageSize: number; search?: string }) => {
    const res = await fleetApi.getVehicles({ ...params, regionId: regionId || undefined });
    const raw: Vehicle[] = res?.data ?? res?.items ?? (Array.isArray(res) ? res : []);
    const total = res?.totalPages ?? 1;
    return { data: raw.filter((v) => v.currentStaffId), totalPages: total };
  }, [regionId]);

  const reset = () => {
    setRegionId(''); setBranchId(''); setScheduledDate(''); setVehicleId('');
    setSelectedVehicle(null); setSalesStaffId(''); setNotes(''); setErrors({});
  };

  const handleHide = () => { reset(); onHide(); };


  const handleSubmit = async () => {
    const result = schema.safeParse({ regionId, scheduledDate, vehicleId });
    if (!result.success) {
      const errs: Errors = {};
      result.error.issues.forEach((i) => {
        const f = i.path[0] as keyof Errors;
        if (!errs[f]) errs[f] = i.message;
      });
      setErrors(errs);
      return;
    }
    setSaving(true);
    try {
      await treksApi.createTrek({ regionId, branchId: branchId || null, scheduledDate, vehicleId, salesStaffId: salesStaffId || null, notes: notes.trim() || undefined });
      toast.success('Trek created.');
      resetTableData();
      handleHide();
      onSuccess?.();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Failed to create trek.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const regionOptions = regions.map((region) => ({ label: region.name, value: region.id }));
  const branchOptions = branches.filter((branch) => branch.isActive && branch.regionId === regionId)
    .map((branch) => ({ label: branch.name, value: branch.id }));

  return (
    <FlatModal
      visible={visible}
      onHide={handleHide}
      title="New Trek"
      subtitle="Plan a new delivery run"
      size="md"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <FlatButton variant="danger-outline" label="Cancel" onClick={handleHide} disabled={saving} />
          <FlatButton variant="primary" label={saving ? 'Creating...' : 'Create Trek'} icon="pi pi-check" onClick={handleSubmit} loading={saving} disabled={saving} />
        </div>
      }
    >
      <div className="space-y-4 py-1 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FlatDropdown
            label="Trekking Region"
            required
            options={regionOptions}
            value={regionId}
            onChange={(v: any) => {
              setRegionId(v?.value !== undefined ? v.value : v);
              setBranchId(''); setVehicleId(''); setSelectedVehicle(null);
              clearError('regionId');
            }}
            size="sm"
            errorMessage={errors.regionId}
          />
          <div>
            <label className="block text-[11px] font-medium text-portal-muted mb-1">
              Scheduled Date <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => { setScheduledDate(e.target.value); clearError('scheduledDate'); }}
              className="w-full h-[38px] px-3 text-xs bg-portal-canvas border border-portal-border rounded text-white focus:outline-none focus:border-portal-accent"
            />
            {errors.scheduledDate && <p className="text-[11px] text-red-400 mt-1">{errors.scheduledDate}</p>}
          </div>
        </div>

        <FlatDropdown
          label="Branch (Optional)"
          options={branchOptions}
          value={branchId}
          onChange={(v: any) => setBranchId(v?.value !== undefined ? v.value : v || '')}
          placeholder={regionId ? 'Select branch' : 'Select region first'}
          disabled={!regionId}
          showClear
          size="sm"
        />

        {/* Vehicle — auto-infers driver */}
        <FlatAsyncSelect<Vehicle>
          key={regionId}
          label="Vehicle"
          required
          placeholder={regionId ? 'Search vehicles in this region...' : 'Select region first'}
          disabled={!regionId}
          value={vehicleId}
          onChange={(v, item) => {
            setVehicleId(v || '');
            setSelectedVehicle(item ?? null);
            clearError('vehicleId');
          }}
          fetchFn={fetchVehicles}
          optionValue="id"
          optionLabel={(v) => `${v.regionName || 'No region'} · ${v.displayName}`}
          itemTemplate={(item) => (
            <div className="min-w-0">
              <span className="block truncate text-[11px] text-portal-accent">{item.regionName || 'No region'}</span>
              <span className="block truncate text-xs font-semibold text-white">{item.displayName}</span>
              <span className="block truncate text-[11px] text-portal-muted">
                {item.currentStaffName ? `Driver: ${item.currentStaffName}` : 'No driver assigned'}
                {item.registrationNumber && ` · ${item.registrationNumber}`}
              </span>
            </div>
          )}
          size="sm"
          errorMessage={errors.vehicleId}
        />

        {/* Driver — read-only, inferred from vehicle */}
        {selectedVehicle?.currentStaffName && (
          <div className="flex items-center gap-2.5 px-3 py-2 bg-portal-canvas border border-portal-border/60 rounded">
            <i className="pi pi-user text-portal-accent text-xs" />
            <div>
              <p className="text-[10px] text-portal-muted uppercase tracking-wide">Driver (auto-assigned)</p>
              <p className="text-xs font-medium text-white">{selectedVehicle.currentStaffName}</p>
            </div>
          </div>
        )}

        <FlatAsyncSelect<StaffItem>
          label="Sales Staff (Optional)"
          value={salesStaffId}
          onChange={(value) => setSalesStaffId(value || '')}
          endpointUrl="/staff"
          optionValue="id"
          optionLabel="fullName"
          placeholder="Search sales staff..."
          clearable
          size="sm"
        />

        <FlatTextarea
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes for this trek..."
          rows={2}
          size="sm"
        />
      </div>
    </FlatModal>
  );
};

export default CreateTrekModal;
