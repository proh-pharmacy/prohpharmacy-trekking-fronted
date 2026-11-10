import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { FlatButton, FlatDatePicker, FlatDropdown, FlatTextarea } from '../../../../components/flat-form';
import { FlatAsyncSelect } from '../../../../components/flat-form/FlatAsyncSelect';
import { organisationApi, staffApi, type CreateTrekPayload, type Branch, type Region, type Vehicle, type StaffItem } from '../../../../api-client';
import { formatTrekDate, parseTrekDate } from './trekDate';

const schema = z.object({
  regionId:      z.string().min(1, 'Trekking region is required'),
  scheduledDate: z.string().min(1, 'Scheduled date is required'),
  vehicleId:     z.string().min(1, 'Vehicle is required'),
});

type Errors = Partial<Record<keyof z.infer<typeof schema>, string>>;

export interface CreateTrekDraft extends CreateTrekPayload {
  salesStaff?: StaffItem;
}

const fetchSalesStaff = (params: { pageNumber: number; pageSize: number; search?: string }) =>
  staffApi.getStaff(params);

interface Props {
  vehicle: Vehicle;
  initialValues?: CreateTrekDraft;
  onReview: (payload: CreateTrekPayload, draft: CreateTrekDraft) => void;
}

export const CreateTrekForm: React.FC<Props> = ({ onReview, vehicle, initialValues }) => {
  const [regionId, setRegionId]           = useState(initialValues?.regionId ?? vehicle.regionId ?? '');
  const [branchId, setBranchId]           = useState(initialValues?.branchId ?? '');
  const [scheduledDate, setScheduledDate] = useState(initialValues?.scheduledDate ?? '');
  const vehicleId = vehicle.id;
  const [salesStaffId, setSalesStaffId]   = useState(initialValues?.salesStaffId ?? '');
  const [salesStaff, setSalesStaff]       = useState<StaffItem | undefined>(initialValues?.salesStaff);
  const [notes, setNotes]                 = useState(initialValues?.notes ?? '');
  const [errors, setErrors]               = useState<Errors>({});
  const [branches, setBranches]           = useState<Branch[]>([]);
  const [regions, setRegions]             = useState<Region[]>([]);

  const clearError = (field: keyof Errors) =>
    setErrors((p) => { const n = { ...p }; delete n[field]; return n; });

  const [lookupError, setLookupError] = useState('');
  const [lookupLoading, setLookupLoading] = useState(true);
  const [lookupAttempt, setLookupAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setLookupLoading(true);
    setLookupError('');
    Promise.all([organisationApi.getRegions(), organisationApi.getBranches()])
      .then(([nextRegions, nextBranches]) => { if (active) { setRegions(nextRegions); setBranches(nextBranches); } })
      .catch(() => { if (active) setLookupError('Unable to load regions and branches. Please retry.'); })
      .finally(() => { if (active) setLookupLoading(false); });
    return () => { active = false; };
  }, [lookupAttempt]);

  const handleSubmit = () => {
    if (lookupLoading || lookupError) return;
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
    const payload: CreateTrekPayload = {
      regionId,
      branchId: branchId || null,
      scheduledDate,
      vehicleId,
      salesStaffId: salesStaffId || null,
      notes: notes.trim() || undefined,
    };
    onReview(payload, { ...payload, salesStaff: salesStaffId ? salesStaff : undefined });
  };

  const regionOptions = regions.map((region) => ({ label: region.name, value: region.id }));
  const branchOptions = branches.filter((branch) => branch.isActive && branch.regionId === regionId)
    .map((branch) => ({ label: branch.name, value: branch.id }));

  const content = (
      <fieldset disabled={lookupLoading} className="trek-particulars-form min-w-0 space-y-4 border-0 p-0">
      <div className="border-b border-portal-border/60 pb-3">
        <h2 className="text-xs font-normal text-portal-muted">Provide Details for This Trek</h2>
      </div>
      <div className="space-y-4 py-1 text-xs">
        {lookupError && <div role="alert" className="text-xs text-portal-text">{lookupError} <FlatButton size="sm" variant="outline" onClick={() => setLookupAttempt((n) => n + 1)}>Retry</FlatButton></div>}
        {lookupLoading && <p role="status" className="text-xs text-portal-muted">Loading regions and branches...</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FlatDropdown background="surface" className="trek-form-control" label="Trekking Region" required options={regionOptions} value={regionId} size="sm" errorMessage={errors.regionId}
            onChange={(v: any) => { setRegionId(v?.value !== undefined ? v.value : v); setBranchId(''); clearError('regionId'); }} />
          <FlatDatePicker background="surface" className="trek-form-control" label="Scheduled Date" required value={parseTrekDate(scheduledDate)} size="sm" dateFormat="yy-mm-dd" errorMessage={errors.scheduledDate}
            onChange={(date) => { setScheduledDate(formatTrekDate(date)); clearError('scheduledDate'); }} />
          <FlatDropdown background="surface" className="trek-form-control" label="Branch (Optional)" options={branchOptions} value={branchId} size="sm" showClear disabled={!regionId}
            onChange={(v: any) => setBranchId(v?.value !== undefined ? v.value : v || '')} />
          <FlatAsyncSelect<StaffItem> className="trek-form-control" label="Sales Staff (Optional)" value={salesStaffId} initialSelectedItem={salesStaff} onChange={(v, item) => { setSalesStaffId(v || ''); setSalesStaff(item); }} fetchFn={fetchSalesStaff} optionValue="id" optionLabel="fullName" clearable size="sm" />
        </div>
        <p className="text-xs text-portal-text">Driver: {vehicle?.currentStaffName || 'Assigned driver'}</p>
        <FlatTextarea background="surface" className="trek-form-control" label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} rows={2} size="sm" />
        <div className="flex justify-end"><FlatButton size="sm" disabled={lookupLoading || !!lookupError} onClick={handleSubmit}>Continue</FlatButton></div>
      </div>
      </fieldset>
  );

  return content;
};

export default CreateTrekForm;
