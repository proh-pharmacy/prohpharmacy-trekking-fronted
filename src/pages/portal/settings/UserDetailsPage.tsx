import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { usersApi, type UserItem } from '../../../api-client';
import { FlatButton, FlatMultiSelect } from '../../../components/flat-form';
import { FlatConfirmDialog } from '../../../components/overlay';

const DEFAULT_SYSTEM_ROLES = [
  'SuperAdmin',
  'OperationsManager',
  'BranchManager',
  'FieldStaff',
  'Driver',
  'CreditOfficer',
  'Auditor',
];

export const UserDetailsPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  // State
  const [user, setUser] = useState<UserItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [assignedRoles, setAssignedRoles] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [availableRoles, setAvailableRoles] = useState<string[]>(DEFAULT_SYSTEM_ROLES);
  const [updatingRoles, setUpdatingRoles] = useState(false);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    visible: boolean;
    title: string;
    message: string;
    variant: 'primary' | 'danger' | 'warning';
    action: () => Promise<void>;
  }>({
    visible: false,
    title: '',
    message: '',
    variant: 'primary',
    action: async () => {},
  });

  // Fetch user data and staff directory
  const fetchUserData = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [userData, staffData, rolesData] = await Promise.all([
        usersApi.getUser(userId),
        usersApi.getStaffMembers().catch(() => []),
        usersApi.getRoles().catch(() => []),
      ]);

      setUser(userData);
      const rolesList = userData.systemRoles?.length
        ? userData.systemRoles
        : userData.roles?.length
        ? userData.roles
        : userData.role
        ? [userData.role]
        : [];
      setAssignedRoles(rolesList);
      setSelectedRoles(rolesList);
      setStaffList(staffData || []);

      if (rolesData && rolesData.length > 0) {
        setAvailableRoles(rolesData.map((r: any) => r.name || r));
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load user details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [userId]);

  // Handle status toggle (Activate / Suspend)
  const handleToggleStatus = () => {
    if (!user) return;
    const isCurrentlyActive = user.status === 'Active' || user.isActive === true;

    setConfirmDialog({
      visible: true,
      title: isCurrentlyActive ? 'Suspend Account' : 'Activate Account',
      message: isCurrentlyActive
        ? `Are you sure you want to suspend ${user.fullName}? They will be immediately blocked from accessing the system.`
        : `Activate ${user.fullName}'s account to restore system access?`,
      variant: isCurrentlyActive ? 'danger' : 'primary',
      action: async () => {
        try {
          if (isCurrentlyActive) {
            await usersApi.suspendUser(user.id);
            toast.success(`Account for ${user.fullName} suspended.`);
            setUser({ ...user, status: 'Suspended', isActive: false });
          } else {
            await usersApi.activateUser(user.id);
            toast.success(`Account for ${user.fullName} activated.`);
            setUser({ ...user, status: 'Active', isActive: true });
          }
        } catch (err: any) {
          toast.error(err.response?.data?.message || 'Failed to update account status.');
        } finally {
          setConfirmDialog((prev) => ({ ...prev, visible: false }));
        }
      },
    });
  };

  // Handle Revoke Sessions
  const handleRevokeSessions = () => {
    if (!user) return;
    setConfirmDialog({
      visible: true,
      title: 'Revoke Active Sessions',
      message: `Force logout all active sessions for ${user.fullName}? This invalidates all active refresh tokens immediately.`,
      variant: 'danger',
      action: async () => {
        try {
          await usersApi.revokeSessions(user.id);
          toast.success(`Active sessions revoked for ${user.fullName}.`);
        } catch (err: any) {
          toast.error(err.response?.data?.message || 'Failed to revoke sessions.');
        } finally {
          setConfirmDialog((prev) => ({ ...prev, visible: false }));
        }
      },
    });
  };

  // Handle Admin Password Reset
  const handleResetPassword = () => {
    if (!user) return;
    setConfirmDialog({
      visible: true,
      title: 'Reset User Password',
      message: `Send a secure password reset email to ${user.email}?`,
      variant: 'warning',
      action: async () => {
        try {
          await usersApi.adminResetPassword(user.id);
          toast.success(`Password reset instructions sent to ${user.email}.`);
        } catch (err: any) {
          toast.error(err.response?.data?.message || 'Failed to trigger password reset.');
        } finally {
          setConfirmDialog((prev) => ({ ...prev, visible: false }));
        }
      },
    });
  };

  // Handle Resend Invitation (for pending accounts)
  const handleResendInvitation = async () => {
    if (!user) return;
    try {
      await usersApi.resendInvitation(user.id);
      toast.success(`New invitation email sent to ${user.email}.`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to resend invitation.');
    }
  };

  // Handle updating user roles
  const handleUpdateRoles = async () => {
    if (!userId || !user) return;
    if (selectedRoles.length === 0) {
      toast.error('At least one role must be assigned to the user.');
      return;
    }
    setUpdatingRoles(true);
    try {
      const rolesToAdd = selectedRoles.filter((r) => !assignedRoles.includes(r));
      const rolesToRemove = assignedRoles.filter((r) => !selectedRoles.includes(r));

      if (rolesToAdd.length > 0) {
        await usersApi.assignRoles(userId, rolesToAdd);
      }

      for (const role of rolesToRemove) {
        await usersApi.removeRole(userId, role);
      }

      setAssignedRoles(selectedRoles);
      setUser((prev) =>
        prev
          ? {
              ...prev,
              roles: selectedRoles,
              systemRoles: selectedRoles,
              role: selectedRoles[0] || '',
            }
          : null
      );
      toast.success('User roles updated successfully.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update user roles.');
    } finally {
      setUpdatingRoles(false);
    }
  };

  const roleOptions = availableRoles.map((role) => ({
    label: role,
    value: role,
  }));

  const hasRoleChanges = (() => {
    if (selectedRoles.length !== assignedRoles.length) return true;
    const sortedCurrent = [...assignedRoles].sort();
    const sortedSelected = [...selectedRoles].sort();
    return sortedCurrent.some((role, index) => role !== sortedSelected[index]);
  })();

  if (loading) {
    return (
      <div className="p-12 text-center text-portal-muted space-y-3">
        <i className="pi pi-spin pi-spinner text-2xl text-portal-accent" />
        <div className="text-xs">Loading user details...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-12 text-center space-y-4">
        <div className="text-base font-bold text-white">User account not found</div>
        <p className="text-xs text-portal-muted">The requested user ID does not exist or has been removed.</p>
        <FlatButton
          label="Return to Users Directory"
          icon="pi pi-arrow-left"
          onClick={() => navigate('/portal/settings/users')}
        />
      </div>
    );
  }

  const isUserActive = user.status === 'Active' || user.isActive === true;

  // Find linked staff details if available
  const linkedStaff = staffList.find(
    (s) => s.id === (user.staffMemberId || user.staffId) || s.staffMemberId === (user.staffMemberId || user.staffId)
  );

  return (
    <div className="space-y-5 max-w-5xl pb-16">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/portal/settings/users"
            className="w-8 h-8 rounded border border-portal-border bg-portal-surface hover:bg-white/[0.06] text-portal-muted hover:text-white flex items-center justify-center transition"
            title="Back to Users & Roles"
          >
            <i className="pi pi-arrow-left text-xs" />
          </Link>
          <div className="flex items-center gap-2 text-xs text-portal-muted">
            <Link to="/portal/settings/users" className="hover:text-white transition">
              Users & Roles
            </Link>
            <span>/</span>
            <span className="text-white font-medium">{user.fullName}</span>
          </div>
        </div>

        <FlatButton
          variant="outline"
          label="Refresh"
          icon="pi pi-refresh"
          size="sm"
          onClick={fetchUserData}
          className="!border-portal-border !text-portal-text hover:!bg-white/[0.06] text-xs font-semibold"
        />
      </div>

      {/* Clean 2-Column Content Grid: Profile & Metadata (Left) & Actions (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* User Summary & Metadata Card */}
        <div className="lg:col-span-2">
          <div className="bg-portal-surface border border-portal-border/60 rounded p-5 space-y-5">
            {/* System Profile Section */}
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-portal-border/40 pb-2">
                System Profile
              </h4>

              <div className="space-y-3 text-xs pt-3">
                <div className="flex items-center justify-between py-1 border-b border-portal-border/40">
                  <span className="text-portal-muted">Corporate Email Address</span>
                  <span className="font-mono text-xs text-white">{user.emailAddress || user.email || '—'}</span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-portal-border/40">
                  <span className="text-portal-muted">Assigned System Roles</span>
                  <span className="text-xs font-medium text-white">
                    {assignedRoles.length > 0 ? assignedRoles.join(', ') : 'No roles assigned'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-portal-border/40">
                  <span className="text-portal-muted">Roles & Permissions</span>
                  <span className="font-mono text-[11px] text-white">
                    {assignedRoles.length} {assignedRoles.length === 1 ? 'role' : 'roles'}
                    {user.permissions && user.permissions.length > 0
                      ? ` (${user.permissions.length} perms)`
                      : ''}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-portal-border/40">
                  <span className="text-portal-muted">Account Status</span>
                  <span
                    className={`font-semibold ${
                      user.status === 'Active'
                        ? 'text-portal-accent'
                        : user.status === 'Pending'
                        ? 'text-amber-400'
                        : 'text-red-accent'
                    }`}
                  >
                    {user.status}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-portal-border/40">
                  <span className="text-portal-muted">Created Date</span>
                  <span className="font-mono text-[11px] text-white">
                    {user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      : 'N/A'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-portal-muted">Last Active</span>
                  <span className="font-mono text-[11px] text-white">
                    {user.lastLoginAt
                      ? new Date(user.lastLoginAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Never'}
                  </span>
                </div>
              </div>
            </div>

            {/* Staff Profile Section */}
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-portal-border/40 pb-2">
                Staff Profile
              </h4>

              <div className="space-y-3 text-xs pt-3">
                <div className="flex items-center justify-between py-1 border-b border-portal-border/40">
                  <span className="text-portal-muted">Employee Number</span>
                  <span className="font-mono text-[11px] text-white font-semibold">
                    {user.employeeNumber || linkedStaff?.employeeNumber || 'N/A'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-portal-border/40">
                  <span className="text-portal-muted">First Name</span>
                  <span className="text-xs font-medium text-white">{user.firstName || linkedStaff?.firstName || '—'}</span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-portal-border/40">
                  <span className="text-portal-muted">Last Name</span>
                  <span className="text-xs font-medium text-white">{user.lastName || linkedStaff?.lastName || '—'}</span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-portal-border/40">
                  <span className="text-portal-muted">Full Name</span>
                  <span className="text-xs font-semibold text-white">{user.fullName || (linkedStaff ? `${linkedStaff.firstName || ''} ${linkedStaff.lastName || ''}`.trim() : '—')}</span>
                </div>

                {(user.branchName || linkedStaff?.branchName) && (
                  <div className="flex items-center justify-between py-1 border-b border-portal-border/40">
                    <span className="text-portal-muted">Branch / Hub</span>
                    <span className="text-xs text-white">
                      {user.branchName || linkedStaff?.branchName}
                    </span>
                  </div>
                )}

                {user.phoneNumber && (
                  <div className="flex items-center justify-between py-1 border-b border-portal-border/40">
                    <span className="text-portal-muted">Phone Number</span>
                    <span className="font-mono text-xs text-white">{user.phoneNumber}</span>
                  </div>
                )}

                {user.joinedOn && (
                  <div className="flex items-center justify-between py-1">
                    <span className="text-portal-muted">Joined Date</span>
                    <span className="font-mono text-[11px] text-white">
                      {user.joinedOn}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Account Actions Column (On Top) */}
        <div className="space-y-4">
          <div className="bg-portal-surface border border-portal-border/60 rounded p-5 space-y-3.5">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-portal-border/40 pb-2">
              Account Actions
            </h4>
            <div className="flex flex-col gap-2.5 pt-1">
              {user.status === 'Pending' ? (
                <FlatButton
                  fullWidth
                  variant="outline"
                  label="Resend Invitation"
                  icon="pi pi-send"
                  size="sm"
                  onClick={handleResendInvitation}
                  className="!bg-portal-accent/15 !border-portal-accent/50 !text-portal-accent hover:!bg-portal-accent/25 hover:!border-portal-accent hover:!text-white text-xs font-semibold"
                />
              ) : (
                <FlatButton
                  fullWidth
                  variant="outline"
                  label={isUserActive ? 'Suspend Account' : 'Activate Account'}
                  icon={isUserActive ? 'pi pi-ban' : 'pi pi-check'}
                  size="sm"
                  onClick={handleToggleStatus}
                  className={
                    isUserActive
                      ? '!bg-red-accent/15 !border-red-accent/50 !text-red-300 hover:!bg-red-accent/25 hover:!border-red-accent hover:!text-white text-xs font-semibold'
                      : '!bg-portal-accent/15 !border-portal-accent/50 !text-portal-accent hover:!bg-portal-accent/25 hover:!border-portal-accent hover:!text-white text-xs font-semibold'
                  }
                />
              )}
              <FlatButton
                fullWidth
                variant="outline"
                label="Revoke All Sessions"
                icon="pi pi-sign-out"
                size="sm"
                onClick={handleRevokeSessions}
                className="!bg-red-accent/15 !border-red-accent/50 !text-red-300 hover:!bg-red-accent/25 hover:!border-red-accent hover:!text-white text-xs font-semibold"
              />
              <FlatButton
                fullWidth
                variant="outline"
                label="Reset Password"
                icon="pi pi-key"
                size="sm"
                onClick={handleResetPassword}
                className="!bg-amber-500/10 !border-amber-500/30 !text-amber-400 hover:!bg-amber-500/20 hover:!border-amber-500/60 hover:!text-amber-200 text-xs font-semibold"
              />

              {/* Roles Management (Multiple Dropdown) */}
              <div className="pt-2.5 border-t border-portal-border/40 space-y-2">
                <label className="text-[11px] font-medium text-portal-muted uppercase tracking-wider flex items-center gap-1">
                  <span>Assigned Roles</span>
                  <span className="text-red-400">*</span>
                </label>
                <FlatMultiSelect
                  value={selectedRoles}
                  onChange={(val) => setSelectedRoles(val || [])}
                  options={roleOptions}
                  placeholder="Select roles..."
                  size="sm"
                  display="chip"
                  errorMessage={
                    selectedRoles.length === 0 ? 'At least one role is required.' : undefined
                  }
                />
                {hasRoleChanges && (
                  <FlatButton
                    fullWidth
                    variant="primary"
                    label={updatingRoles ? 'Updating Roles...' : 'Update Roles'}
                    icon="pi pi-check"
                    size="sm"
                    onClick={handleUpdateRoles}
                    disabled={updatingRoles || selectedRoles.length === 0}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <FlatConfirmDialog
        visible={confirmDialog.visible}
        onHide={() => setConfirmDialog((prev) => ({ ...prev, visible: false }))}
        onConfirm={confirmDialog.action}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
      />
    </div>
  );
};

export default UserDetailsPage;
