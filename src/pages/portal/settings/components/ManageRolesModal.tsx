import React, { useState, useEffect } from 'react';
import { FlatModal } from '../../../../components/overlay';
import { FlatButton, FlatMultiSelect } from '../../../../components/flat-form';
import { usersApi, type Role, type UserItem } from '../../../../api-client';
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

interface ManageRolesModalProps {
  visible: boolean;
  onHide: () => void;
  user: UserItem | null;
  availableRoles: Role[];
  onSuccess?: () => void;
}

export const ManageRolesModal: React.FC<ManageRolesModalProps> = ({
  visible,
  onHide,
  user,
  availableRoles,
  onSuccess,
}) => {
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      const initialRoles = user.systemRoles || user.roles || [];
      setSelectedRoles([...initialRoles]);
    }
  }, [user]);

  if (!user) return null;

  const currentRoles = user.systemRoles || user.roles || [];
  const rolesToDisplay = availableRoles.length > 0 ? availableRoles : DEFAULT_SYSTEM_ROLES;
  const roleOptions = rolesToDisplay.map((r) => ({
    label: r.name,
    value: r.name,
  }));

  const hasChanges =
    selectedRoles.length !== currentRoles.length ||
    selectedRoles.some((r) => !currentRoles.includes(r));

  const handleSave = async () => {
    if (selectedRoles.length === 0) {
      toast.error('User must have at least one role assigned.');
      return;
    }

    setSaving(true);
    try {
      const targetId = String(user.userId || user.id);
      const rolesToAdd = selectedRoles.filter((r) => !currentRoles.includes(r));
      const rolesToRemove = currentRoles.filter((r) => !selectedRoles.includes(r));

      // Execute additions and removals
      for (const role of rolesToAdd) {
        await usersApi.assignRole(targetId, role);
      }
      for (const role of rolesToRemove) {
        await usersApi.removeRole(targetId, role);
      }

      toast.success(`Roles updated for ${user.fullName}`);
      resetTableData();
      onHide();
      onSuccess?.();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Failed to update roles.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <FlatModal
      visible={visible}
      onHide={onHide}
      title="Manage User Roles"
      subtitle={`Assign or revoke system privileges for ${user.fullName}`}
      badge={user.status}
      size="sm"
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
            label={saving ? 'Saving...' : 'Save Roles'}
            icon="pi pi-check"
            onClick={handleSave}
            loading={saving}
            disabled={saving || selectedRoles.length === 0 || !hasChanges}
          />
        </div>
      }
    >
      <div className="space-y-4 py-1">
        {/* User Summary Card */}
        <div className="p-3 bg-portal-canvas border border-portal-border/60 rounded flex items-center justify-between gap-3 text-xs">
          <div className="min-w-0">
            <span className="font-semibold text-white block truncate">
              {user.fullName}
            </span>
            <span className="text-[11px] text-portal-muted font-mono block truncate">
              {user.emailAddress || user.email || '—'}
            </span>
          </div>
          {user.employeeNumber && (
            <span className="font-mono text-xs text-portal-accent shrink-0">
              {user.employeeNumber}
            </span>
          )}
        </div>

        {/* Roles MultiSelect */}
        <FlatMultiSelect
          label="Assigned Roles"
          required
          value={selectedRoles}
          onChange={(val) => setSelectedRoles(val || [])}
          options={roleOptions}
          placeholder="Select system roles..."
          size="sm"
          display="chip"
          errorMessage={selectedRoles.length === 0 ? 'At least one role is required.' : undefined}
        />
      </div>
    </FlatModal>
  );
};

export default ManageRolesModal;
