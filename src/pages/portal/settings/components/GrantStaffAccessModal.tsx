import React, { useState, useEffect } from 'react';
import { FlatModal } from '../../../../components/overlay';
import { FlatButton, FlatInputText, FlatMultiSelect } from '../../../../components/flat-form';
import { staffApi, type StaffItem, type Role } from '../../../../api-client';
import { resetTableData } from '../../../../components/data-table';
import toast from 'react-hot-toast';

interface GrantStaffAccessModalProps {
  visible: boolean;
  onHide: () => void;
  staff: StaffItem | null;
  availableRoles: Role[];
  onSuccess?: () => void;
}

const DEFAULT_SYSTEM_ROLES: Role[] = [
  { name: 'SuperAdmin' },
  { name: 'OperationsManager' },
  { name: 'BranchManager' },
  { name: 'FieldStaff' },
  { name: 'Driver' },
  { name: 'CreditOfficer' },
  { name: 'Auditor' },
];

export const GrantStaffAccessModal: React.FC<GrantStaffAccessModalProps> = ({
  visible,
  onHide,
  staff,
  availableRoles,
  onSuccess,
}) => {
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [initialPassword, setInitialPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [grantedResult, setGrantedResult] = useState<{
    fullName: string;
    email: string;
    roles: string[];
    initialPassword?: string;
  } | null>(null);

  const rolesToDisplay = availableRoles.length > 0 ? availableRoles : DEFAULT_SYSTEM_ROLES;
  const roleOptions = rolesToDisplay.map((r) => ({
    label: r.name,
    value: r.name,
  }));

  const autoDefaultPassword = staff
    ? `${(staff.firstName || '').toLowerCase()}${(staff.lastName || '').toLowerCase()}`.replace(/\s+/g, '') ||
      'firstnamelastname'
    : 'firstnamelastname';

  useEffect(() => {
    if (staff && visible) {
      const initial: string[] = [];
      if (staff.systemRoles && staff.systemRoles.length > 0) {
        initial.push(...staff.systemRoles);
      } else if (staff.role) {
        initial.push(staff.role);
      }
      setSelectedRoles(initial.length > 0 ? initial : ['FieldStaff']);
      setInitialPassword('');
      setShowPassword(false);
      setGrantedResult(null);
    }
  }, [staff, visible]);

  if (!staff) return null;

  const handleCopyPassword = (pwd: string) => {
    navigator.clipboard.writeText(pwd);
    toast.success('Password copied to clipboard.');
  };

  const handleClose = () => {
    const wasGranted = Boolean(grantedResult);
    setGrantedResult(null);
    onHide();
    resetTableData();
    if (wasGranted) {
      onSuccess?.();
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (selectedRoles.length === 0) {
      toast.error('Please assign at least one system role.');
      return;
    }

    if (initialPassword.trim().length > 0 && initialPassword.trim().length < 8) {
      toast.error('Initial password must be at least 8 characters long, or leave blank to use the default.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await staffApi.grantAccess(staff.id, {
        roleNames: selectedRoles,
        initialPassword: initialPassword.trim() || undefined,
      });

      const returnedPassword =
        res?.initialPassword ||
        res?.temporaryPassword ||
        (initialPassword.trim() ? initialPassword.trim() : autoDefaultPassword);

      setGrantedResult({
        fullName: staff.fullName,
        email: staff.emailAddress || staff.email || '',
        roles: selectedRoles,
        initialPassword: returnedPassword,
      });

      toast.success(`Platform access granted to ${staff.fullName}.`);
      resetTableData();
      onSuccess?.();
    } catch (err: any) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        `Failed to grant platform access to ${staff.fullName}.`;
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // One-time credentials reveal state
  if (grantedResult && grantedResult.initialPassword) {
    return (
      <FlatModal
        visible={visible}
        onHide={handleClose}
        title="Platform Access Granted"
        subtitle="One-time login credentials for this staff member"
        size="md"
        footer={
          <div className="flex items-center justify-end w-full">
            <FlatButton
              variant="primary"
              label="Done"
              icon="pi pi-check"
              size="sm"
              onClick={handleClose}
            />
          </div>
        }
      >
        <div className="space-y-4 py-1">
          <div className="bg-portal-canvas border border-portal-border/60 rounded p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-portal-border/40">
              <span className="text-portal-muted">Staff Member</span>
              <span className="font-semibold text-white">{grantedResult.fullName}</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-portal-border/40">
              <span className="text-portal-muted">Login Email</span>
              <span className="font-mono text-white text-xs">{grantedResult.email}</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-portal-border/40">
              <span className="text-portal-muted">Assigned Roles</span>
              <span className="font-medium text-portal-accent text-xs">
                {grantedResult.roles.join(', ')}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <span className="text-portal-muted block text-[11px]">Initial Password</span>
                <span className="font-mono text-amber-400 font-bold text-sm">
                  {grantedResult.initialPassword}
                </span>
              </div>
              <FlatButton
                variant="outline"
                size="sm"
                label="Copy"
                leftIcon="pi pi-copy"
                onClick={() => handleCopyPassword(grantedResult.initialPassword!)}
              />
            </div>
          </div>

          <div className="p-3 bg-portal-canvas/60 border border-portal-border/40 rounded text-[11px] text-portal-muted flex items-start gap-2">
            <i className="pi pi-info-circle text-portal-accent text-xs mt-0.5 shrink-0" />
            <span>
              This temporary password is displayed once. A welcome notification email has also been sent with login instructions.
            </span>
          </div>
        </div>
      </FlatModal>
    );
  }

  return (
    <FlatModal
      visible={visible}
      onHide={onHide}
      title="Grant Platform Access"
      subtitle={`Create a platform user account for ${staff.fullName}`}
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
            label={submitting ? 'Granting Access...' : 'Grant Access'}
            icon="pi pi-key"
            onClick={() => handleSubmit()}
            loading={submitting}
            disabled={submitting || selectedRoles.length === 0}
          />
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-1 text-xs">
        {/* Staff Context Card */}
        <div className="p-3 bg-portal-canvas border border-portal-border/60 rounded flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-portal-surface border border-portal-border flex items-center justify-center font-bold text-white text-xs shrink-0">
              {staff.fullName
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </div>
            <div>
              <div className="font-bold text-white text-sm">{staff.fullName}</div>
              <div className="text-xs text-portal-muted font-mono">{staff.emailAddress || staff.email || staff.phoneNumber}</div>
            </div>
          </div>
          <div className="text-right text-xs">
            <span className="text-portal-muted block text-[11px]">Assigned Branch</span>
            <span className="text-white font-medium">{staff.branchName || '—'}</span>
          </div>
        </div>

        {/* Roles Selection */}
        <div className="space-y-1">
          <FlatMultiSelect
            label="Platform System Roles"
            required
            options={roleOptions}
            value={selectedRoles}
            onChange={(val) => setSelectedRoles(val)}
            placeholder="Select roles for platform access..."
            display="chip"
            helperText="Assign one or multiple roles to determine authorized platform operations."
          />
        </div>

        {/* Initial Password (Optional) */}
        <div className="space-y-1 pt-1 border-t border-portal-border/40">
          <div className="relative">
            <FlatInputText
              label="Initial Password (Optional)"
              type={showPassword ? 'text' : 'password'}
              placeholder={`Defaults to "${autoDefaultPassword}" if omitted`}
              value={initialPassword}
              onChange={(e) => setInitialPassword(e.target.value)}
              size="sm"
              helperText={`Min 8 chars. If left blank, will automatically default to "${autoDefaultPassword}".`}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[26px] text-portal-muted hover:text-white transition-colors cursor-pointer text-xs"
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              <i className={`pi ${showPassword ? 'pi-eye-slash' : 'pi-eye'}`} />
            </button>
          </div>
        </div>
      </form>
    </FlatModal>
  );
};

export default GrantStaffAccessModal;
