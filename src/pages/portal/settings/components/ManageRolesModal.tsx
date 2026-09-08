import React, { useState, useEffect } from 'react';
import { FlatModal } from '../../../../components/overlay';
import { FlatButton } from '../../../../components/flat-form';
import { usersApi, type Role, type UserItem } from '../../../../api-client';
import toast from 'react-hot-toast';

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

  const handleToggleRole = (roleName: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleName)
        ? prev.filter((r) => r !== roleName)
        : [...prev, roleName]
    );
  };

  const handleSave = async () => {
    if (selectedRoles.length === 0) {
      toast.error('User must have at least one role assigned.');
      return;
    }

    setSaving(true);
    try {
      const targetId = String(user.userId || user.id);
      const currentRoles = user.systemRoles || user.roles || [];
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
            label={saving ? 'Saving...' : 'Save Roles'}
            icon="pi pi-check"
            onClick={handleSave}
            disabled={saving}
          />
        </div>
      }
    >
      <div className="space-y-4">
        {/* User Summary Card */}
        <div className="p-3 bg-portal-canvas border border-portal-border rounded flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-portal-surface border border-portal-border flex items-center justify-center font-bold text-white text-xs">
            {user.fullName
              .split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-white truncate">{user.fullName}</div>
            <div className="text-[11px] text-portal-muted truncate font-mono">{user.emailAddress || user.email}</div>
          </div>
        </div>

        {/* Roles Selection */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-portal-text mb-2.5">
            System Privileges & Permissions
          </label>
          <div className="space-y-2">
            {availableRoles.map((role) => {
              const isChecked = selectedRoles.includes(role.name);
              return (
                <div
                  key={role.name}
                  onClick={() => handleToggleRole(role.name)}
                  className={`p-3 rounded border flex items-center justify-between transition cursor-pointer ${
                    isChecked
                      ? 'bg-portal-accent/10 border-portal-accent text-white'
                      : 'bg-portal-canvas/70 border-portal-border text-portal-text hover:border-portal-border/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] shrink-0 ${
                        isChecked
                          ? 'bg-portal-accent border-portal-accent text-white'
                          : 'border-portal-border bg-portal-surface'
                      }`}
                    >
                      {isChecked && <i className="pi pi-check" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold">{role.name}</div>
                      <div className="text-[11px] text-portal-muted">
                        {role.name === 'Admin'
                          ? 'Full administrative control over settings, users, and branches'
                          : role.name === 'Manager'
                          ? 'Operational authority over rosters, staff schedules, and missions'
                          : role.name === 'Driver'
                          ? 'Dedicated transit delivery, telemetry, and checkpoint logging'
                          : 'Standard staff duties, attendance logs, and inventory viewing'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </FlatModal>
  );
};

export default ManageRolesModal;
