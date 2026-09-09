import React, { useState, useEffect } from 'react';
import { FlatModal } from '../../../../components/overlay';
import { FlatButton, FlatAsyncSelect, FlatTextarea } from '../../../../components/flat-form';
import { fleetApi, type Vehicle, type TrackingDevice } from '../../../../api-client';
import { resetTableData } from '../../../../components/data-table';
import toast from 'react-hot-toast';

interface AssignStaffModalProps {
  visible: boolean;
  onHide: () => void;
  mode: 'vehicle' | 'device';
  target: Vehicle | TrackingDevice | null;
}

export const AssignStaffModal: React.FC<AssignStaffModalProps> = ({ visible, onHide, mode, target }) => {
  const [staffMemberId, setStaffMemberId] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<any | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setStaffMemberId('');
      setSelectedStaff(null);
      setNotes('');
    }
  }, [visible]);

  const targetName = target
    ? mode === 'vehicle'
      ? `${(target as Vehicle).displayName} (${(target as Vehicle).registrationNumber})`
      : (target as TrackingDevice).name
    : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffMemberId || !target) { toast.error('Please select a staff member.'); return; }

    setSubmitting(true);
    try {
      if (mode === 'vehicle') {
        await fleetApi.assignVehicleStaff(target.id, { staffMemberId, notes: notes.trim() || undefined });
      } else {
        await fleetApi.assignDeviceStaff(target.id, { staffMemberId, notes: notes.trim() || undefined });
      }
      toast.success('Staff assigned successfully.');
      resetTableData();
      onHide();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.detail || 'Failed to assign staff.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FlatModal
      visible={visible}
      onHide={onHide}
      title={`Assign Staff — ${mode === 'vehicle' ? 'Vehicle' : 'Device'}`}
      size="md"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <FlatButton variant="danger-outline" label="Cancel" onClick={onHide} disabled={submitting} />
          <FlatButton
            variant="primary"
            label={submitting ? 'Assigning...' : 'Assign'}
            icon="pi pi-user-plus"
            onClick={handleSubmit}
            loading={submitting}
            disabled={submitting || !staffMemberId}
          />
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="text-xs text-portal-muted">
          {mode === 'vehicle' ? 'Vehicle' : 'Device'}:{' '}
          <span className="text-white font-medium">{targetName}</span>
        </div>

        <FlatAsyncSelect<any>
          id="assign-staff-select"
          label="Staff Member"
          required
          placeholder="Search staff by name or employee number..."
          value={staffMemberId}
          onChange={(val: any, item: any) => {
            setStaffMemberId(val || '');
            setSelectedStaff(item || null);
          }}
          endpointUrl="/staff"
          defaultParams={undefined}
          pageSize={10}
          searchParam="search"
          optionValue="id"
          optionLabel={(s: any) =>
            `${s?.fullName || `${s?.firstName || ''} ${s?.lastName || ''}`.trim()} (${s?.employeeNumber || '—'})`
          }
          itemTemplate={(s: any) => (
            <div className="flex items-center justify-between gap-2 w-full">
              <div className="min-w-0 truncate">
                <span className="font-semibold text-white text-xs block truncate">
                  {s?.fullName || `${s?.firstName || ''} ${s?.lastName || ''}`.trim()}
                </span>
                <span className="text-[11px] text-portal-muted truncate block">
                  {s?.branchName || s?.emailAddress || s?.email || '—'}
                </span>
              </div>
              {s?.employeeNumber && (
                <span className="font-mono text-xs text-portal-accent shrink-0">
                  {s.employeeNumber}
                </span>
              )}
            </div>
          )}
          size="sm"
        />

        {/* Selected staff details card */}
        <div
          className={`transition-opacity duration-200 ${
            selectedStaff ? 'opacity-100' : 'opacity-0 pointer-events-none select-none'
          }`}
        >
          <div className="bg-portal-canvas border border-portal-border/60 rounded p-3 space-y-2 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-portal-border/40">
              <span className="font-semibold text-white">
                {selectedStaff?.fullName || `${selectedStaff?.firstName || ''} ${selectedStaff?.lastName || ''}`.trim()}
              </span>
              {selectedStaff?.employeeNumber && (
                <span className="font-mono text-portal-accent">{selectedStaff.employeeNumber}</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-portal-muted text-[11px] block">Branch</span>
                <span className="text-white">{selectedStaff?.branchName || '—'}</span>
              </div>
              <div>
                <span className="text-portal-muted text-[11px] block">Role</span>
                <span className="text-white">{selectedStaff?.role || selectedStaff?.jobTitle || '—'}</span>
              </div>
            </div>
          </div>
        </div>

        <FlatTextarea
          label="Notes (optional)"
          placeholder="e.g. Assigned for Q3 routes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          maxLength={500}
        />
      </form>
    </FlatModal>
  );
};

export default AssignStaffModal;
