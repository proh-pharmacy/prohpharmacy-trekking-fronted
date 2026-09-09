import React, { useState, useEffect } from 'react';
import { FlatModal } from '../../../../components/overlay';
import { FlatButton, FlatInputText, FlatMultiSelect, FlatAsyncSelect } from '../../../../components/flat-form';
import { usersApi, type Role, type InviteStaffResponse } from '../../../../api-client';
import { resetTableData } from '../../../../components/data-table';
import toast from 'react-hot-toast';

const DEFAULT_SYSTEM_ROLES: Role[] = [
  { name: 'SuperAdmin' },
  { name: 'OperationsManager' },
  { name: 'BranchManager' },
  { name: 'FieldStaff' },
  { name: 'Driver' },
  { name: 'CreditOfficer' },
  { name: 'Auditor' },
];

interface InviteUserModalProps {
  visible: boolean;
  onHide: () => void;
  availableRoles: Role[];
  onSuccess?: () => void;
}

export const InviteUserModal: React.FC<InviteUserModalProps> = ({
  visible,
  onHide,
  availableRoles,
  onSuccess,
}) => {
  const [staffMemberId, setStaffMemberId] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<any | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [initialPassword, setInitialPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createdResult, setCreatedResult] = useState<InviteStaffResponse | null>(null);

  const rolesToDisplay = availableRoles.length > 0 ? availableRoles : DEFAULT_SYSTEM_ROLES;
  const roleOptions = rolesToDisplay.map((r) => ({
    label: r.name,
    value: r.name,
  }));

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setCreatedResult(null);
      setStaffMemberId('');
      setSelectedStaff(null);
      setInitialPassword('');
      setSelectedRoles([]);
    }
  }, [visible]);

  const handleCopyPassword = (pwd: string) => {
    navigator.clipboard.writeText(pwd);
    toast.success('Password copied to clipboard!');
  };

  const handleClose = () => {
    onHide();
    resetTableData();
    if (createdResult) {
      onSuccess?.();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffMemberId) {
      toast.error('Please select a staff member.');
      return;
    }
    if (selectedRoles.length === 0) {
      toast.error('Please select at least one role.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await usersApi.inviteUser({
        staffMemberId,
        roleNames: selectedRoles,
        initialPassword: initialPassword.trim() || undefined,
      });

      toast.success('Staff member invited successfully!');
      resetTableData();
      onSuccess?.();

      if (res.initialPassword) {
        setCreatedResult(res);
      } else {
        handleClose();
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Failed to onboard staff member.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Success view when one-time credentials are returned
  if (createdResult && createdResult.initialPassword) {
    return (
      <FlatModal
        visible={visible}
        onHide={handleClose}
        title="Account Created"
        size="md"
        footer={
          <div className="flex items-center justify-end w-full">
            <FlatButton
              variant="primary"
              label="Done"
              icon="pi pi-check"
              onClick={handleClose}
            />
          </div>
        }
      >
        <div className="space-y-4 py-1">
          <div className="bg-portal-canvas border border-portal-border/60 rounded p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-portal-border/40">
              <span className="text-portal-muted">Staff Member</span>
              <span className="font-medium text-white">
                {createdResult.staffFullName || selectedStaff?.fullName || 'Staff Member'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-portal-border/40">
              <span className="text-portal-muted">Login Email</span>
              <span className="font-mono text-white text-xs">
                {createdResult.staffEmail || selectedStaff?.emailAddress || selectedStaff?.email}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-portal-border/40">
              <span className="text-portal-muted">Assigned Roles</span>
              <span className="text-white text-xs">
                {(createdResult.roles || selectedRoles).join(', ')}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <span className="text-portal-muted block text-[11px]">Initial Password</span>
                <span className="font-mono text-amber-400 font-bold text-sm">
                  {createdResult.initialPassword}
                </span>
              </div>
              <FlatButton
                variant="outline"
                size="sm"
                label="Copy"
                leftIcon="pi pi-copy"
                onClick={() => handleCopyPassword(createdResult.initialPassword!)}
              />
            </div>
          </div>
        </div>
      </FlatModal>
    );
  }

  return (
    <FlatModal
      visible={visible}
      onHide={onHide}
      title="Invite User"
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
            label={submitting ? 'Sending...' : 'Send Invitation'}
            icon="pi pi-send"
            onClick={handleSubmit}
            loading={submitting}
            disabled={submitting || !staffMemberId || selectedRoles.length === 0}
          />
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Step 1: Staff Selection Dropdown (Asynchronous, Infinite Scroll & Search) */}
        <FlatAsyncSelect<any>
          id="invite-staff-select"
          label="Select Staff Member"
          required
          placeholder="Search or choose staff member..."
          value={staffMemberId}
          onChange={(val: any, item: any) => {
            setStaffMemberId(val || '');
            setSelectedStaff(item || null);
          }}
          endpointUrl="/staff"
          defaultParams={{ hasAppAccess: false }}
          pageSize={10}
          searchParam="search"
          optionValue="id"
          optionLabel={(staff: any) =>
            `${staff?.fullName || `${staff?.firstName || ''} ${staff?.lastName || ''}`.trim()} (${staff?.employeeNumber || '—'})`
          }
          itemTemplate={(staff: any) => (
            <div className="flex items-center justify-between gap-2 w-full">
              <div className="min-w-0 truncate">
                <span className="font-semibold text-white text-xs block truncate">
                  {staff?.fullName || `${staff?.firstName || ''} ${staff?.lastName || ''}`.trim()}
                </span>
                <span className="text-[11px] text-portal-muted truncate block">
                  {staff?.emailAddress || staff?.email || staff?.branchName || 'No email'}
                </span>
              </div>
              {staff?.employeeNumber && (
                <span className="font-mono text-xs text-portal-accent shrink-0">
                  {staff.employeeNumber}
                </span>
              )}
            </div>
          )}
          size="sm"
        />

        {/* Step 2: Show details, role selector, and password (kept in DOM with opacity-0 to prevent modal resizing) */}
        <div
          className={`space-y-4 pt-1 transition-opacity duration-200 ${
            selectedStaff ? 'opacity-100' : 'opacity-0 pointer-events-none select-none'
          }`}
        >
          {/* Nice Staff Details Card */}
          <div className="bg-portal-canvas border border-portal-border/60 rounded p-4 space-y-2.5 text-xs min-h-[96px]">
            <div className="flex items-center justify-between pb-2 border-b border-portal-border/40">
              <span className="font-semibold text-white text-sm">
                {selectedStaff ? (selectedStaff.fullName || `${selectedStaff.firstName || ''} ${selectedStaff.lastName || ''}`.trim()) : 'Staff Details'}
              </span>
              {selectedStaff?.employeeNumber && (
                <span className="font-mono text-xs text-portal-accent font-semibold">
                  {selectedStaff.employeeNumber}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-0.5">
              <div>
                <span className="text-portal-muted text-[11px] block">Corporate Email</span>
                <span className="font-mono text-white text-xs">
                  {selectedStaff ? (selectedStaff.emailAddress || selectedStaff.email || '—') : '—'}
                </span>
              </div>
              <div>
                <span className="text-portal-muted text-[11px] block">Branch / Hub</span>
                <span className="text-white text-xs">
                  {selectedStaff ? (selectedStaff.branchName || '—') : '—'}
                </span>
              </div>
              {selectedStaff?.jobTitle && (
                <div className="col-span-2">
                  <span className="text-portal-muted text-[11px] block">Job Title</span>
                  <span className="text-white text-xs">
                    {selectedStaff.jobTitle}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Role Selection Field */}
          <FlatMultiSelect
            label="Assigned Roles"
            required
            value={selectedRoles}
            onChange={(val) => setSelectedRoles(val || [])}
            options={roleOptions}
            placeholder="Select roles..."
            size="sm"
            display="chip"
            errorMessage={selectedStaff && selectedRoles.length === 0 ? 'At least one role is required.' : undefined}
          />

          {/* Optional Password Field */}
          <FlatInputText
            label="Password (Optional)"
            type="password"
            placeholder="Defaults to firstnamelastname if omitted"
            value={initialPassword}
            onChange={(e) => setInitialPassword(e.target.value)}
            size="sm"
          />
        </div>
      </form>
    </FlatModal>
  );
};

export default InviteUserModal;
