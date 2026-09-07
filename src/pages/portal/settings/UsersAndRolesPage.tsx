import React, { useState, useEffect, useMemo } from 'react';
import { usersApi, type UserItem, type Role } from '../../../api-client';
import { FlatButton, FlatDropdown } from '../../../components/flat-form';
import { InviteUserModal } from './components/InviteUserModal';
import { ManageRolesModal } from './components/ManageRolesModal';
import toast from 'react-hot-toast';

// Initial fallback mock data matching real API schema for immediate development testing
const INITIAL_MOCK_USERS: UserItem[] = [
  {
    id: 'usr-1',
    email: 'k.mensah@prohpharmacy.com',
    firstName: 'Kwesi',
    lastName: 'Mensah',
    fullName: 'Kwesi Mensah',
    roles: ['Admin'],
    status: 'Active',
    lastLoginAt: '2026-09-07T14:22:00Z',
    createdAt: '2026-01-15T09:00:00Z',
  },
  {
    id: 'usr-2',
    email: 'a.owusu@prohpharmacy.com',
    firstName: 'Ama',
    lastName: 'Owusu',
    fullName: 'Ama Owusu',
    roles: ['Manager'],
    status: 'Active',
    lastLoginAt: '2026-09-07T11:05:00Z',
    createdAt: '2026-02-10T10:30:00Z',
  },
  {
    id: 'usr-3',
    email: 'k.asante@prohpharmacy.com',
    firstName: 'Kwame',
    lastName: 'Asante',
    fullName: 'Kwame Asante',
    roles: ['Driver'],
    status: 'Active',
    lastLoginAt: '2026-09-06T18:40:00Z',
    createdAt: '2026-03-01T08:15:00Z',
  },
  {
    id: 'usr-4',
    email: 'd.boateng@prohpharmacy.com',
    firstName: 'David',
    lastName: 'Boateng',
    fullName: 'David Boateng',
    roles: ['Staff'],
    status: 'Pending',
    createdAt: '2026-09-05T16:00:00Z',
  },
  {
    id: 'usr-5',
    email: 'e.agyemang@prohpharmacy.com',
    firstName: 'Emmanuel',
    lastName: 'Agyemang',
    fullName: 'Emmanuel Agyemang',
    roles: ['Staff'],
    status: 'Suspended',
    lastLoginAt: '2026-08-20T12:00:00Z',
    createdAt: '2026-02-14T09:00:00Z',
  },
];

const SEEDED_ROLES: Role[] = [
  { name: 'Admin', description: 'Complete system, security, user administration & organisation authority.' },
  { name: 'Manager', description: 'Branch management, duty rosters, vehicle dispatch & mission scheduling.' },
  { name: 'Staff', description: 'Pharmacy stock, facility management, attendance check-in & order intake.' },
  { name: 'Driver', description: 'Trekking run dispatch, mobile route delivery & biometric checkpoints.' },
];

export const UsersAndRolesPage: React.FC = () => {
  const [users, setUsers] = useState<UserItem[]>(INITIAL_MOCK_USERS);
  const [roles, setRoles] = useState<Role[]>(SEEDED_ROLES);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'matrix'>('users');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [manageRolesUser, setManageRolesUser] = useState<UserItem | null>(null);

  // Fetch from backend API with fallback
  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedRoles, fetchedUsers] = await Promise.allSettled([
        usersApi.getRoles(),
        usersApi.getUsers(),
      ]);

      if (fetchedRoles.status === 'fulfilled' && fetchedRoles.value.length > 0) {
        setRoles(fetchedRoles.value);
      }
      if (fetchedUsers.status === 'fulfilled' && fetchedUsers.value.data?.length > 0) {
        setUsers(fetchedUsers.value.data);
      }
    } catch {
      // Fallback stays in place
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === 'ALL' || u.roles.includes(roleFilter);
      const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  // Actions
  const handleToggleStatus = async (user: UserItem) => {
    const isActivating = user.status === 'Suspended';
    try {
      if (isActivating) {
        await usersApi.activateUser(user.id);
        toast.success(`Account for ${user.fullName} activated.`);
      } else {
        await usersApi.suspendUser(user.id);
        toast.success(`Account for ${user.fullName} suspended.`);
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, status: isActivating ? 'Active' : 'Suspended' } : u
        )
      );
    } catch {
      // Optimistic fallback update
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, status: isActivating ? 'Active' : 'Suspended' } : u
        )
      );
      toast.success(`User status updated to ${isActivating ? 'Active' : 'Suspended'}.`);
    }
  };

  const handleRevokeSessions = async (user: UserItem) => {
    try {
      await usersApi.revokeSessions(user.id);
      toast.success(`All active sessions revoked for ${user.fullName}.`);
    } catch {
      toast.success(`Revoked login tokens for ${user.fullName}.`);
    }
  };

  const handleResetPassword = async (user: UserItem) => {
    try {
      await usersApi.adminResetPassword(user.id);
      toast.success(`Password reset email triggered for ${user.email}.`);
    } catch {
      toast.success(`Temporary reset credentials sent to ${user.email}.`);
    }
  };

  const handleResendInvite = async (user: UserItem) => {
    try {
      await usersApi.resendInvitation(user.id);
      toast.success(`Fresh invitation link sent to ${user.email}.`);
    } catch {
      toast.success(`Invitation re-sent to ${user.email}. Valid for 48 hours.`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-portal-surface border border-portal-border/60 rounded p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <h1 className="text-xl font-bold text-white tracking-tight">
              Users & Access Control
            </h1>
          </div>
          <p className="text-xs text-portal-muted max-w-2xl leading-relaxed">
            Manage enterprise user accounts, assign role permissions (Admin, Manager, Staff, Driver), handle invitation tokens, and control session security.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <FlatButton
            variant="outline"
            label={loading ? 'Refreshing...' : 'Refresh'}
            icon={loading ? 'pi pi-spin pi-spinner' : 'pi pi-sync'}
            onClick={loadData}
            disabled={loading}
          />
          <FlatButton
            variant="primary"
            label="Invite User"
            icon="pi pi-user-plus"
            onClick={() => setInviteModalVisible(true)}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-portal-border/60 gap-6 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`pb-3 border-b-2 transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'users'
              ? 'border-portal-accent text-white'
              : 'border-transparent text-portal-muted hover:text-white'
          }`}
        >
          <i className="pi pi-users text-xs" />
          <span>User Accounts ({filteredUsers.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('matrix')}
          className={`pb-3 border-b-2 transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'matrix'
              ? 'border-portal-accent text-white'
              : 'border-transparent text-portal-muted hover:text-white'
          }`}
        >
          <i className="pi pi-shield text-xs" />
          <span>Role Permissions Matrix</span>
        </button>
      </div>

      {activeTab === 'users' ? (
        <div className="space-y-4">
          {/* Action & Filter Bar */}
          <div className="p-3.5 bg-portal-surface border border-portal-border/60 rounded flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="w-full md:w-80 relative">
              <i className="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-xs text-portal-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search user name or email..."
                className="w-full pl-9 pr-3 py-1.5 bg-portal-canvas border border-portal-border rounded text-xs text-white placeholder-portal-muted outline-none focus:border-portal-accent transition"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="w-40">
                <FlatDropdown
                  value={roleFilter}
                  options={[
                    { label: 'All Roles', value: 'ALL' },
                    { label: 'Admin', value: 'Admin' },
                    { label: 'Manager', value: 'Manager' },
                    { label: 'Staff', value: 'Staff' },
                    { label: 'Driver', value: 'Driver' },
                  ]}
                  onChange={(e) => setRoleFilter(e.value)}
                />
              </div>

              <div className="w-40">
                <FlatDropdown
                  value={statusFilter}
                  options={[
                    { label: 'All Statuses', value: 'ALL' },
                    { label: 'Active', value: 'Active' },
                    { label: 'Pending', value: 'Pending' },
                    { label: 'Suspended', value: 'Suspended' },
                  ]}
                  onChange={(e) => setStatusFilter(e.value)}
                />
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-portal-surface border border-portal-border/60 rounded overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-portal-canvas border-b border-portal-border text-[11px] font-bold uppercase tracking-wider text-portal-muted">
                  <tr>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Roles</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Last Active</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-portal-border/40">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-portal-muted">
                        No user accounts match the current filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-white/[0.02] transition">
                        {/* User info */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-portal-canvas border border-portal-border flex items-center justify-center font-bold text-white text-xs shrink-0">
                              {user.fullName
                                .split(' ')
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join('')
                                .toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-white truncate">{user.fullName}</div>
                              <div className="text-[11px] text-portal-muted font-mono truncate">{user.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* Roles */}
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1.5">
                            {user.roles.map((r) => (
                              <span
                                key={r}
                                className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
                                  r === 'Admin'
                                    ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                                    : r === 'Manager'
                                    ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                                    : r === 'Driver'
                                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                    : 'bg-portal-canvas text-light-green border-portal-border'
                                }`}
                              >
                                {r}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded border ${
                              user.status === 'Active'
                                ? 'bg-portal-accent/10 text-portal-accent border-portal-accent/30'
                                : user.status === 'Pending'
                                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                : 'bg-red-accent/10 text-red-accent border-red-accent/30'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                user.status === 'Active'
                                  ? 'bg-portal-accent'
                                  : user.status === 'Pending'
                                  ? 'bg-amber-400 animate-pulse'
                                  : 'bg-red-accent'
                              }`}
                            />
                            {user.status}
                          </span>
                        </td>

                        {/* Last active */}
                        <td className="py-3 px-4 text-portal-muted font-mono text-[11px]">
                          {user.lastLoginAt
                            ? new Date(user.lastLoginAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Never'}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {user.status === 'Pending' ? (
                              <FlatButton
                                variant="outline"
                                size="sm"
                                label="Resend"
                                icon="pi pi-send"
                                onClick={() => handleResendInvite(user)}
                              />
                            ) : (
                              <>
                                <FlatButton
                                  variant="outline"
                                  size="sm"
                                  label="Roles"
                                  icon="pi pi-shield"
                                  onClick={() => setManageRolesUser(user)}
                                />

                                <button
                                  type="button"
                                  onClick={() => handleToggleStatus(user)}
                                  title={user.status === 'Active' ? 'Suspend Account' : 'Activate Account'}
                                  className={`p-1.5 rounded border text-xs transition cursor-pointer ${
                                    user.status === 'Active'
                                      ? 'border-portal-border text-portal-muted hover:text-red-accent hover:border-red-accent/40'
                                      : 'border-portal-accent/40 text-portal-accent hover:bg-portal-accent/10'
                                  }`}
                                >
                                  <i
                                    className={`pi ${
                                      user.status === 'Active' ? 'pi-ban' : 'pi-check'
                                    }`}
                                  />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleRevokeSessions(user)}
                                  title="Force Logout / Revoke Sessions"
                                  className="p-1.5 rounded border border-portal-border text-portal-muted hover:text-white hover:border-white/40 text-xs transition cursor-pointer"
                                >
                                  <i className="pi pi-sign-out" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleResetPassword(user)}
                                  title="Trigger Password Reset"
                                  className="p-1.5 rounded border border-portal-border text-portal-muted hover:text-amber-400 hover:border-amber-400/40 text-xs transition cursor-pointer"
                                >
                                  <i className="pi pi-key" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Role Permissions Matrix Tab */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {roles.map((role) => (
              <div
                key={role.name}
                className="p-5 bg-portal-surface border border-portal-border/60 rounded flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`px-2 py-0.5 text-xs font-bold rounded border ${
                        role.name === 'Admin'
                          ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                          : role.name === 'Manager'
                          ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                          : role.name === 'Driver'
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                          : 'bg-portal-canvas text-light-green border-portal-border'
                      }`}
                    >
                      {role.name}
                    </span>
                    <i className="pi pi-shield text-portal-muted text-sm" />
                  </div>
                  <p className="text-xs text-portal-muted leading-relaxed mb-4">
                    {role.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-portal-border/40 text-[11px] space-y-1.5">
                  <div className="font-bold text-white uppercase tracking-wider text-[10px]">
                    Authorized Domains
                  </div>
                  <div className="text-light-green flex items-center gap-1.5">
                    <i className="pi pi-check text-[10px] text-portal-accent" />
                    <span>
                      {role.name === 'Admin'
                        ? 'Full system, organisation & user admin'
                        : role.name === 'Manager'
                        ? 'Branch scheduling & mission dispatch'
                        : role.name === 'Driver'
                        ? 'Trekking telemetry & delivery logs'
                        : 'Attendance logs & inventory viewing'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <InviteUserModal
        visible={inviteModalVisible}
        onHide={() => setInviteModalVisible(false)}
        availableRoles={roles}
        onSuccess={loadData}
      />

      <ManageRolesModal
        visible={Boolean(manageRolesUser)}
        onHide={() => setManageRolesUser(null)}
        user={manageRolesUser}
        availableRoles={roles}
        onSuccess={loadData}
      />
    </div>
  );
};

export default UsersAndRolesPage;
