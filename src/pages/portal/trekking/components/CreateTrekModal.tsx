import React, { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';
import { FlatModal } from '../../../../components/overlay';
import { FlatButton, FlatDropdown, FlatTextarea } from '../../../../components/flat-form';
import { FlatAsyncSelect } from '../../../../components/flat-form/FlatAsyncSelect';
import { treksApi, fleetApi, organisationApi, type Branch, type Vehicle } from '../../../../api-client';
import { resetTableData } from '../../../../components/data-table';
import toast from 'react-hot-toast';

const schema = z.object({
  branchId:      z.string().min(1, 'Branch is required'),
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
  const [branchId, setBranchId]           = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [vehicleId, setVehicleId]         = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [notes, setNotes]                 = useState('');
  const [saving, setSaving]               = useState(false);
  const [errors, setErrors]               = useState<Errors>({});
  const [branches, setBranches]           = useState<Branch[]>([]);

  const clearError = (field: keyof Errors) =>
    setErrors((p) => { const n = { ...p }; delete n[field]; return n; });

  useEffect(() => {
    if (visible) {
      organisationApi.getBranches().then(setBranches).catch(() => {});
    }
  }, [visible]);

  const fetchVehicles = useCallback(async (params: { pageNumber: number; pageSize: number; search?: string }) => {
    const res = await fleetApi.getVehicles({ ...params });
    const raw: Vehicle[] = res?.data ?? res?.items ?? (Array.isArray(res) ? res : []);
    const total = res?.totalPages ?? 1;
    return { data: raw.filter((v) => v.currentStaffId), totalPages: total };
  }, []);

  const reset = () => {
    setBranchId(''); setScheduledDate(''); setVehicleId('');
    setSelectedVehicle(null); setNotes(''); setErrors({});
  };

  const handleHide = () => { reset(); onHide(); };


  const handleSubmit = async () => {
    const result = schema.safeParse({ branchId, scheduledDate, vehicleId });
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
      await treksApi.createTrek({ branchId, scheduledDate, vehicleId, notes: notes.trim() || undefined });
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

  const branchOptions = [
    { label: 'Select branch...', value: '' },
    ...branches.map((b) => ({ label: b.name, value: b.id })),
  ];

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
        {/* Branch + Date */}
        <div className="grid grid-cols-2 gap-3">
          <FlatDropdown
            label="Branch"
            required
            options={branchOptions}
            value={branchId}
            onChange={(v: any) => {
              setBranchId(v?.value !== undefined ? v.value : v);
              clearError('branchId');
            }}
            size="sm"
            errorMessage={errors.branchId}
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

        {/* Vehicle — auto-infers driver */}
        <FlatAsyncSelect<Vehicle>
          label="Vehicle"
          required
          placeholder="Search vehicles..."
          value={vehicleId}
          onChange={(v, item) => {
            setVehicleId(v);
            setSelectedVehicle(item ?? null);
            clearError('vehicleId');
          }}
          fetchFn={fetchVehicles}
          optionValue="id"
          optionLabel={(v) => `${v.displayName} · ${v.registrationNumber}`}
          itemTemplate={(item) => (
            <div>
              <span className="font-medium text-white text-xs">{item.displayName}</span>
              <span className="font-mono text-portal-accent text-[11px] ml-2">{item.registrationNumber}</span>
              {item.currentStaffName && (
                <span className="text-portal-muted text-[11px] ml-2">— {item.currentStaffName}</span>
              )}
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
