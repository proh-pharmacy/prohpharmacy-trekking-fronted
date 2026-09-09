import React, { useState, useEffect } from 'react';
import { FlatModal } from '../../../../components/overlay';
import {
  FlatButton,
  FlatInputText,
  FlatDropdown,
  FlatSwitch,
  FlatMultiSelect,
} from '../../../../components/flat-form';
import { staffApi, type Branch, type Role, type CreateStaffResponse } from '../../../../api-client';
import { resetTableData } from '../../../../components/data-table';
import toast from 'react-hot-toast';

interface CreateStaffModalProps {
  visible: boolean;
  onHide: () => void;
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

export const CreateStaffModal: React.FC<CreateStaffModalProps> = ({
  visible,
  onHide,
  onSuccess,
  branches,
  availableRoles,
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [branchId, setBranchId] = useState('');
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [joinedOn, setJoinedOn] = useState(() => new Date().toISOString().slice(0, 10));

  // Platform access controls (only active & required when switch is ON)
  const [grantAppAccess, setGrantAppAccess] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [initialPassword, setInitialPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [createdResult, setCreatedResult] = useState<CreateStaffResponse | null>(null);

  const autoDefaultPassword =
    `${firstName.toLowerCase()}${lastName.toLowerCase()}`.replace(/\s+/g, '') ||
    'firstnamelastname';

  const rolesToDisplay = availableRoles.length > 0 ? availableRoles : DEFAULT_STAFF_ROLES;

  const branchOptions = [
    { label: 'Select branch / hub...', value: '' },
    ...branches.map((b) => ({ label: b.name, value: b.id })),
  ];

  const roleOptions = rolesToDisplay.map((r) => ({
    label: r.name,
    value: r.name,
  }));

  useEffect(() => {
    if (visible) {
      setFirstName('');
      setLastName('');
      setEmailAddress('');
      setPhoneNumber('');
      setBranchId('');
      setEmployeeNumber('');
      setJoinedOn(new Date().toISOString().slice(0, 10));
      setGrantAppAccess(false);
      setSelectedRoles([]);
      setInitialPassword('');
      setShowPassword(false);
      setCreatedResult(null);
    }
  }, [visible]);

  const handleCopyPassword = (pwd: string) => {
    navigator.clipboard.writeText(pwd);
    toast.success('Password copied to clipboard!');
  };

  const handleClose = () => {
    onHide();
    if (createdResult) {
      onSuccess?.();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('First and last name are required.');
      return;
    }
    if (!emailAddress.trim()) {
      toast.error('Corporate email address is required.');
      return;
    }
    if (!phoneNumber.trim()) {
      toast.error('Phone number is required.');
      return;
    }
    if (!branchId) {
      toast.error('Please assign a branch/hub.');
      return;
    }
    if (grantAppAccess && selectedRoles.length === 0) {
      toast.error('Please assign at least one platform system role.');
      return;
    }
    if (grantAppAccess && initialPassword.trim().length > 0 && initialPassword.trim().length < 8) {
      toast.error('Initial password must be at least 8 characters long, or leave blank to use the default.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        emailAddress: emailAddress.trim().toLowerCase(),
        phoneNumber: phoneNumber.trim(),
        branchId,
        joinedOn,
        role: grantAppAccess ? selectedRoles[0] : undefined,
        employeeNumber: employeeNumber.trim() || undefined,
        grantAppAccess,
        initialPassword: grantAppAccess && initialPassword.trim() ? initialPassword.trim() : undefined,
      };

      const res = await staffApi.createStaff(payload);

      toast.success(`Staff member ${res.fullName || `${firstName} ${lastName}`} created.`);
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
        'Failed to create staff member.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Success view when one-time credentials are generated
  if (createdResult && createdResult.initialPassword) {
    return (
      <FlatModal
        visible={visible}
        onHide={handleClose}
        title="Staff Created & Access Granted"
        subtitle="One-time system login credentials"
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
              <span className="font-semibold text-white">
                {createdResult.fullName || `${firstName} ${lastName}`}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-portal-border/40">
              <span className="text-portal-muted">Employee Number</span>
              <span className="font-mono text-xs text-portal-accent font-semibold">
                {createdResult.employeeNumber || 'Auto-generated'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-portal-border/40">
              <span className="text-portal-muted">Login Email</span>
              <span className="font-mono text-white text-xs">
                {createdResult.emailAddress || emailAddress}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-portal-border/40">
              <span className="text-portal-muted">Branch / Hub</span>
              <span className="text-white text-xs">
                {createdResult.branchName || branches.find((b) => b.id === branchId)?.name || '—'}
              </span>
            </div>

            {selectedRoles.length > 0 && (
              <div className="flex items-center justify-between py-1 border-b border-portal-border/40">
                <span className="text-portal-muted">Assigned Roles</span>
                <span className="font-medium text-portal-accent text-xs">
                  {selectedRoles.join(', ')}
                </span>
              </div>
            )}

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

          <div className="p-3 bg-portal-canvas/60 border border-portal-border/40 rounded text-[11px] text-portal-muted flex items-start gap-2">
            <i className="pi pi-info-circle text-portal-accent text-xs mt-0.5 shrink-0" />
            <span>
              Store or share this temporary password with the staff member. A welcome email has also been sent with login instructions.
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
      title="Add Staff Member"
      subtitle="Register an employee into the organization directory"
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
            label={submitting ? 'Creating...' : 'Create Staff'}
            icon="pi pi-check"
            onClick={handleSubmit}
            loading={submitting}
            disabled={
              submitting ||
              !firstName.trim() ||
              !lastName.trim() ||
              !emailAddress.trim() ||
              !phoneNumber.trim() ||
              !branchId ||
              (grantAppAccess && selectedRoles.length === 0)
            }
          />
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-1 text-xs">
        {/* Name Fields */}
        <div className="grid grid-cols-2 gap-3">
          <FlatInputText
            label="First Name"
            required
            placeholder="e.g. Kwame"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            size="sm"
          />
          <FlatInputText
            label="Last Name"
            required
            placeholder="e.g. Asante"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            size="sm"
          />
        </div>

        {/* Contact Fields */}
        <div className="grid grid-cols-2 gap-3">
          <FlatInputText
            label="Corporate Email"
            required
            type="email"
            placeholder="k.asante@prohpharmacy.com"
            value={emailAddress}
            onChange={(e) => setEmailAddress(e.target.value)}
            size="sm"
          />
          <FlatInputText
            label="Phone Number"
            required
            placeholder="+233 20 123 4567"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            size="sm"
          />
        </div>

        {/* Branch & Joined Date */}
        <div className="grid grid-cols-2 gap-3">
          <FlatDropdown
            label="Assigned Branch / Hub"
            required
            options={branchOptions}
            value={branchId}
            onChange={(val) => setBranchId(val)}
            size="sm"
          />
          <FlatInputText
            label="Joined Date"
            type="date"
            required
            value={joinedOn}
            onChange={(e) => setJoinedOn(e.target.value)}
            size="sm"
          />
        </div>

        {/* Custom Employee Number (Optional) */}
        <div>
          <FlatInputText
            label="Employee # (Optional)"
            placeholder="Auto-generated if omitted"
            value={employeeNumber}
            onChange={(e) => setEmployeeNumber(e.target.value)}
            size="sm"
            helperText="Leave blank to automatically assign the next sequential employee number."
          />
        </div>

        {/* Grant Platform Access Section */}
        <div className="pt-2 border-t border-portal-border/50 space-y-3">
          <div className="flex items-center justify-between p-3 bg-portal-canvas border border-portal-border/60 rounded">
            <div className="space-y-0.5">
              <span className="font-semibold text-white block text-xs">Grant Platform Login Access</span>
              <span className="text-[11px] text-portal-muted block">
                Creates a user account immediately so this staff member can log into operations.
              </span>
            </div>
            <FlatSwitch
              checked={grantAppAccess}
              onChange={(val) => setGrantAppAccess(val)}
            />
          </div>

          {/* Roles & Password only rendered when Platform Access is granted */}
          {grantAppAccess && (
            <div className="p-3 bg-portal-canvas/40 border border-portal-border/40 rounded space-y-3 animate-fadeIn">
              <div className="space-y-1">
                <FlatMultiSelect
                  label="Platform System Roles"
                  required
                  options={roleOptions}
                  value={selectedRoles}
                  onChange={(val) => setSelectedRoles(val)}
                  placeholder="Select platform roles (e.g. Driver, FieldStaff)..."
                  display="chip"
                  helperText="Required when granting platform access. Determines authorized operations."
                />
              </div>

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
          )}
        </div>
      </form>
    </FlatModal>
  );
};

export default CreateStaffModal;
