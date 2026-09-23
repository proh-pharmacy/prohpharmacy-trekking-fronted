import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { z } from 'zod';
import { FlatModal } from '../../../../components/overlay';
import { FlatButton, FlatDatePicker, FlatDropdown, FlatTextarea } from '../../../../components/flat-form';
import { FlatAsyncSelect } from '../../../../components/flat-form/FlatAsyncSelect';
import { treksApi, fleetApi, organisationApi, staffApi, type Trek, type Branch, type Region, type Vehicle, type StaffItem } from '../../../../api-client';
import { resetTableData } from '../../../../components/data-table';
import toast from 'react-hot-toast';
import { formatTrekDate, parseTrekDate } from './trekDate';

const schema = z.object({
  regionId:      z.string().min(1, 'Trekking region is required'),
  scheduledDate: z.string().min(1, 'Scheduled date is required'),
  vehicleId:     z.string().min(1, 'Vehicle is required'),
});

type Errors = Partial<Record<keyof z.infer<typeof schema>, string>>;

interface Props {
  visible: boolean;
  onHide: () => void;
  trek: Trek;
  onSuccess?: (updated: Trek) => void;
}

export const EditTrekModal: React.FC<Props> = ({ visible, onHide, trek, onSuccess }) => {
  const [regionId, setRegionId]               = useState('');
  const [branchId, setBranchId]               = useState('');
  const [scheduledDate, setScheduledDate]     = useState('');
  const [vehicleId, setVehicleId]             = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [initialVehicle, setInitialVehicle] = useState<Vehicle | undefined>();
  const [vehicleRegionFilter, setVehicleRegionFilter] = useState<'all' | 'trek'>('all');
  const [salesStaffId, setSalesStaffId]       = useState('');
  const [staffBranchFilter, setStaffBranchFilter] = useState('');
  const [notes, setNotes]                     = useState('');
  const [saving, setSaving]                   = useState(false);
  const [errors, setErrors]                   = useState<Errors>({});
  const [branches, setBranches]               = useState<Branch[]>([]);
  const [regions, setRegions]                 = useState<Region[]>([]);

  const clearError = (field: keyof Errors) =>
    setErrors((p) => { const n = { ...p }; delete n[field]; return n; });

  useEffect(() => {
    if (visible && trek) {
      setRegionId(trek.regionId);
      setBranchId(trek.branchId || '');
      setScheduledDate(trek.scheduledDate);
      setVehicleId(trek.vehicleId);
      setSalesStaffId(trek.salesStaffId || '');
      setStaffBranchFilter('');
      setNotes(trek.notes ?? '');
      setErrors({});
      setSelectedVehicle(null);
      setInitialVehicle(undefined);
      setVehicleRegionFilter('all');
      organisationApi.getRegions().then(setRegions).catch(() => {});
      organisationApi.getBranches().then(setBranches).catch(() => {});
    }
  }, [visible, trek]);

  useEffect(() => {
    if (!visible || !trek.vehicleId) return;
    let active = true;
    fleetApi.getVehicle(trek.vehicleId)
      .then((vehicle) => { if (active) setInitialVehicle(vehicle); })
      .catch(() => {});
    return () => { active = false; };
  }, [visible, trek.vehicleId]);

  const fetchVehicles = useCallback(async (params: { pageNumber: number; pageSize: number; search?: string }) => {
    if (vehicleRegionFilter === 'trek' && !regionId) return { data: [], totalPages: 1 };
    const res = await fleetApi.getVehicles({ ...params, regionId: vehicleRegionFilter === 'trek' ? regionId || undefined : undefined });
    const raw: Vehicle[] = res?.data ?? res?.items ?? (Array.isArray(res) ? res : []);
    return { data: raw.filter((v) => v.currentStaffId), totalPages: res?.totalPages ?? 1 };
  }, [regionId, vehicleRegionFilter]);

  const fetchSalesStaff = useCallback(
    (params: { pageNumber: number; pageSize: number; search?: string }) =>
      staffApi.getStaff({ ...params, branchId: staffBranchFilter || undefined }),
    [staffBranchFilter],
  );

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
      const updated = await treksApi.updateTrek(trek.id, {
        regionId,
        branchId: branchId || null,
        scheduledDate,
        vehicleId,
        salesStaffId: salesStaffId || null,
        notes: notes.trim() || null,
      });
      toast.success('Trek updated.');
      resetTableData();
      onSuccess?.(updated);
      onHide();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Failed to update trek.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const regionOptions = regions.map((region) => ({ label: region.name, value: region.id }));
  const branchOptions = branches.filter((branch) => branch.isActive && branch.regionId === regionId)
    .map((branch) => ({ label: branch.name, value: branch.id }));

  const driverName = selectedVehicle?.currentStaffName ?? (vehicleId === trek.vehicleId ? trek.driverName : null);
  const selectedInitialVehicle = useMemo(() => initialVehicle?.id === trek.vehicleId ? initialVehicle : ({
    id: trek.vehicleId,
    displayName: trek.vehicleDisplayName,
    regionName: '',
    registrationNumber: '',
    currentStaffName: trek.driverName,
  } as Vehicle), [initialVehicle, trek.vehicleId, trek.vehicleDisplayName, trek.driverName]);
  const initialSalesStaff = useMemo(() => trek.salesStaffId && trek.salesStaffName ? ({
    id: trek.salesStaffId,
    fullName: trek.salesStaffName,
  } as StaffItem) : undefined, [trek.salesStaffId, trek.salesStaffName]);

  return (
    <FlatModal
      visible={visible}
      onHide={onHide}
      title="Edit Trek"
      subtitle={`Editing ${trek.trekNumber}`}
      size="md"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <FlatButton variant="danger-outline" label="Cancel" onClick={onHide} disabled={saving} />
          <FlatButton variant="primary" label={saving ? 'Saving...' : 'Save Changes'} icon="pi pi-check" onClick={handleSubmit} loading={saving} disabled={saving} />
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
              const nextRegionId = v?.value !== undefined ? v.value : v;
              setRegionId(nextRegionId);
              setBranchId('');
              clearError('regionId');
            }}
            size="sm"
            errorMessage={errors.regionId}
          />
          <FlatDatePicker
            label="Scheduled Date"
            required
            value={parseTrekDate(scheduledDate)}
            onChange={(date) => { setScheduledDate(formatTrekDate(date)); clearError('scheduledDate'); }}
            dateFormat="yy-mm-dd"
            baseZIndex={2100}
            size="sm"
            errorMessage={errors.scheduledDate}
          />
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

        <FlatAsyncSelect<Vehicle>
          label="Vehicle"
          required
          placeholder={vehicleRegionFilter === 'trek' ? (regionId ? 'Search vehicles in trekking region...' : 'Select a trekking region first...') : 'Search vehicles across all regions...'}
          helperText={vehicleRegionFilter === 'trek' && !regionId ? 'Select a trekking region above to see its vehicles.' : undefined}
          value={vehicleId}
          initialSelectedItem={vehicleId === trek.vehicleId ? selectedInitialVehicle : undefined}
          onChange={(v, item) => { setVehicleId(v || ''); setSelectedVehicle(item ?? null); clearError('vehicleId'); }}
          fetchFn={fetchVehicles}
          filter={{
            label: 'Filter by',
            value: vehicleRegionFilter,
            onChange: (value) => setVehicleRegionFilter(value as 'all' | 'trek'),
            options: [
              { label: 'All regions', value: 'all' },
              { label: 'Trekking region', value: 'trek' },
            ],
          }}
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

        {driverName && (
          <div className="flex items-center gap-2.5 px-3 py-2 bg-portal-canvas border border-portal-border/60 rounded">
            <i className="pi pi-user text-portal-accent text-xs" />
            <div>
              <p className="text-[10px] text-portal-muted uppercase tracking-wide">Driver (auto-assigned)</p>
              <p className="text-xs font-medium text-white">{driverName}</p>
            </div>
          </div>
        )}

        <FlatAsyncSelect<StaffItem>
          label="Sales Staff (Optional)"
          value={salesStaffId}
          initialSelectedItem={initialSalesStaff}
          onChange={(value) => setSalesStaffId(value || '')}
          fetchFn={fetchSalesStaff}
          filter={{
            label: 'Filter by',
            value: staffBranchFilter,
            onChange: setStaffBranchFilter,
            options: [
              { label: 'All branches', value: '' },
              ...branches.filter((branch) => branch.isActive).map((branch) => ({ label: branch.name, value: branch.id })),
            ],
          }}
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

export default EditTrekModal;
