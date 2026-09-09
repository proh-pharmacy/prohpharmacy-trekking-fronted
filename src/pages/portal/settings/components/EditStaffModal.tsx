import React, { useState, useEffect } from 'react';
import { FlatModal } from '../../../../components/overlay';
import { FlatButton, FlatInputText, FlatDropdown } from '../../../../components/flat-form';
import { staffApi, type StaffItem, type Branch, type Role } from '../../../../api-client';
import { resetTableData } from '../../../../components/data-table';
import toast from 'react-hot-toast';

interface EditStaffModalProps {
  visible: boolean;
  onHide: () => void;
  staff: StaffItem | null;
  onSuccess?: () => void;
  branches: Branch[];
  availableRoles: Role[];
}

const DEFAULT_STAFF_ROLES: Role[] = [
  { name: 'Driver' },
  { name: 'FieldStaff' },
  { name: 'BranchManager' },
  { name: 'OperationsManager' },
  { name: 'CreditOfficer' },
  { name: 'Auditor' },
  { name: 'SuperAdmin' },
];

export const EditStaffModal: React.FC<EditStaffModalProps> = ({
  visible,
  onHide,
  staff,
  onSuccess,
  branches,
  availableRoles,
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [branchId, setBranchId] = useState('');
  const [role, setRole] = useState('');
  const [saving, setSaving] = useState(false);

  const rolesToDisplay = availableRoles.length > 0 ? availableRoles : DEFAULT_STAFF_ROLES;

  const branchOptions = [
    { label: 'Select branch / hub...', value: '' },
    ...branches.map((b) => ({ label: b.name, value: b.id })),
  ];

  const roleOptions = [
    { label: 'Select role / position...', value: '' },
    ...rolesToDisplay.map((r) => ({ label: r.name, value: r.name })),
  ];

  useEffect(() => {
    if (staff) {
      setFirstName(staff.firstName || '');
      setLastName(staff.lastName || '');
      setPhoneNumber(staff.phoneNumber || '');
      setBranchId(staff.branchId || '');
      setRole(staff.role || staff.jobTitle || '');
    }
  }, [staff]);

  if (!staff) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('First and last name are required.');
      return;
    }
    if (!phoneNumber.trim()) {
      toast.error('Phone number is required.');
      return;
    }
    if (!branchId) {
      toast.error('Branch is required.');
      return;
    }

    setSaving(true);
    try {
      await staffApi.updateStaff(staff.id, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phoneNumber.trim(),
        branchId,
        role: role || undefined,
      });

      toast.success(`Staff member ${firstName} ${lastName} updated.`);
      resetTableData();
      onHide();
      onSuccess?.();
    } catch (err: any) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Failed to update staff member.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <FlatModal
      visible={visible}
      onHide={onHide}
      title="Edit Staff Member"
      subtitle={`Update details for ${staff.fullName}`}
      badge={staff.status || staff.employmentStatus}
      size="md"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <FlatButton
            variant="danger-outline"
            label="Cancel"
            onClick={onHide}
            disabled={saving}
          />
          <FlatButton
            variant="primary"
            label={saving ? 'Saving...' : 'Save Changes'}
            icon="pi pi-check"
            onClick={handleSubmit}
            loading={saving}
            disabled={saving || !firstName.trim() || !lastName.trim() || !phoneNumber.trim()}
          />
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-1 text-xs">
        {/* Read-Only Summary Header */}
        <div className="p-3 bg-portal-canvas border border-portal-border/60 rounded flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="font-semibold text-white block truncate">
              {staff.fullName}
            </span>
            <span className="text-[11px] text-portal-muted font-mono block truncate">
              {staff.emailAddress || staff.email || 'No email registered'}
            </span>
          </div>
          {staff.employeeNumber && (
            <span className="font-mono text-xs text-portal-accent shrink-0">
              {staff.employeeNumber}
            </span>
          )}
        </div>

        {/* Name Fields */}
        <div className="grid grid-cols-2 gap-3">
          <FlatInputText
            label="First Name"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            size="sm"
          />
          <FlatInputText
            label="Last Name"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            size="sm"
          />
        </div>

        {/* Contact & Branch */}
        <div className="grid grid-cols-2 gap-3">
          <FlatInputText
            label="Phone Number"
            required
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            size="sm"
          />
          <FlatDropdown
            label="Assigned Branch / Hub"
            required
            options={branchOptions}
            value={branchId}
            onChange={(val) => setBranchId(val)}
            size="sm"
          />
        </div>

        {/* Role Field */}
        <div>
          <FlatDropdown
            label="Position / Role"
            options={roleOptions}
            value={role}
            onChange={(val) => setRole(val)}
            size="sm"
          />
        </div>
      </form>
    </FlatModal>
  );
};

export default EditStaffModal;
