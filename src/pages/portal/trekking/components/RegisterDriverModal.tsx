import React, { useState, useEffect } from 'react';
import { FlatModal } from '../../../../components/overlay';
import { FlatButton, FlatAsyncSelect } from '../../../../components/flat-form';
import { fleetApi } from '../../../../api-client';
import { resetTableData } from '../../../../components/data-table';
import toast from 'react-hot-toast';

interface RegisterDriverModalProps {
  visible: boolean;
  onHide: () => void;
}

export const RegisterDriverModal: React.FC<RegisterDriverModalProps> = ({ visible, onHide }) => {
  const [staffMemberId, setStaffMemberId] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setStaffMemberId('');
      setSelectedStaff(null);
    }
  }, [visible]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffMemberId) { toast.error('Please select a staff member.'); return; }

    setSubmitting(true);
    try {
      await fleetApi.createDriver(staffMemberId);
      toast.success(`${selectedStaff?.fullName || 'Driver'} added to fleet drivers.`);
      resetTableData();
      onHide();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.detail || 'Failed to register driver.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FlatModal
      visible={visible}
      onHide={onHide}
      title="Register Fleet Driver"
      size="md"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <FlatButton variant="danger-outline" label="Cancel" onClick={onHide} disabled={submitting} />
          <FlatButton
            variant="primary"
            label={submitting ? 'Registering...' : 'Register Driver'}
            icon="pi pi-user-plus"
            onClick={handleSubmit}
            loading={submitting}
            disabled={submitting || !staffMemberId}
          />
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-portal-muted leading-relaxed">
          Registers the selected staff member as a fleet driver and immediately syncs them to Traccar.
        </p>

        <FlatAsyncSelect<any>
          id="register-driver-select"
          label="Staff Member"
          required
          placeholder="Search by name or employee number..."
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
                  {s?.branchName || s?.emailAddress || '—'}
                </span>
              </div>
              {s?.employeeNumber && (
                <span className="font-mono text-xs text-portal-accent shrink-0">{s.employeeNumber}</span>
              )}
            </div>
          )}
          size="sm"
        />

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
      </form>
    </FlatModal>
  );
};

export default RegisterDriverModal;
