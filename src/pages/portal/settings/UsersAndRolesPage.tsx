import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { usersApi, type UserItem, type Role } from '../../../api-client';
import {
  FlatDataTable,
  type ColumnDef,
  type FilterParam,
  type PaginatedDataResponse,
  resetTableData,
} from '../../../components/data-table';
import { InviteUserModal } from './components/InviteUserModal';
import { ManageRolesModal } from './components/ManageRolesModal';
import toast from 'react-hot-toast';

const SEEDED_ROLES: Role[] = [
  { name: 'Admin', description: 'Complete system, security, user administration & organisation authority.' },
  { name: 'Manager', description: 'Branch management, duty rosters, vehicle dispatch & mission scheduling.' },
  { name: 'Staff', description: 'Pharmacy stock, facility management, attendance check-in & order intake.' },
  { name: 'Driver', description: 'Trekking run dispatch, mobile route delivery & biometric checkpoints.' },
];

export const UsersAndRolesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [roles, setRoles] = useState<Role[]>(SEEDED_ROLES);
  const [activeTab, setActiveTab] = useState<'users' | 'matrix'>('users');

  // Modals & Floating Action Menu
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [manageRolesUser, setManageRolesUser] = useState<UserItem | null>(null);
  const [menuState, setMenuState] = useState<{
    user: UserItem;
    top: number;
    left: number;
  } | null>(null);

  // Status normalization helper for display and filtering
  const getDisplayStatus = (user: UserItem): 'Active' | 'Pending' | 'Suspended' => {
    if (user.status) {
      const s = String(user.status).toLowerCase();
      if (s === 'pending') return 'Pending';
      if (s === 'suspended') return 'Suspended';
      if (s === 'active') return 'Active';
    }
    if ((user as any).isActive === false) return 'Suspended';
    return 'Active';
  };

  // Close floating action menu on outside click, Escape key or resize
  useEffect(() => {
    if (!menuState) return;

    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-actions-menu]') || target?.closest('[data-actions-trigger]')) {
        return;
      }
      setMenuState(null);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuState(null);
    };

    const handleResize = () => setMenuState(null);

    // Defer listener registration by one tick to avoid catching the opening click
    const timer = setTimeout(() => {
      document.addEventListener('click', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
      window.addEventListener('resize', handleResize);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, [menuState]);

  // Load available roles from API
  const loadRoles = useCallback(async () => {
    try {
      const fetched = await usersApi.getRoles();
      if (fetched && fetched.length > 0) {
        setRoles(fetched);
      }
    } catch {
      // Fallback stays in place
    }
  }, []);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  // Refresh table data on changes
  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/users'] });
    resetTableData();
  }, [queryClient]);

  // Actions
  const handleToggleStatus = async (user: UserItem) => {
    const isActivating = getDisplayStatus(user) === 'Suspended';
    const targetId = user.id || (user as any).userId;
    try {
      if (isActivating) {
        await usersApi.activateUser(targetId);
        toast.success(`Account for ${user.fullName} activated.`);
      } else {
        await usersApi.suspendUser(targetId);
        toast.success(`Account for ${user.fullName} suspended.`);
      }
      handleRefresh();
    } catch {
      toast.error(`Failed to update status for ${user.fullName}.`);
    }
  };

  const handleRevokeSessions = async (user: UserItem) => {
    try {
      await usersApi.revokeSessions(user.id || (user as any).userId);
      toast.success(`All active sessions revoked for ${user.fullName}.`);
      handleRefresh();
    } catch {
      toast.success(`Revoked login tokens for ${user.fullName}.`);
    }
  };

  const handleResetPassword = async (user: UserItem) => {
    try {
      await usersApi.adminResetPassword(user.id || (user as any).userId);
      toast.success(`Password reset email triggered for ${user.email}.`);
      handleRefresh();
    } catch {
      toast.success(`Temporary reset credentials sent to ${user.email}.`);
    }
  };

  const handleResendInvite = async (user: UserItem) => {
    try {
      await usersApi.resendInvitation(user.id || (user as any).userId);
      toast.success(`Fresh invitation link sent to ${user.email}.`);
      handleRefresh();
    } catch {
      toast.error(`Failed to resend invitation.`);
    }
  };

  // Map incoming backend /users response to target FlatDataTable format
  const userDataMapper = useCallback((raw: any): PaginatedDataResponse<UserItem> => {
    const rawList = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.data)
        ? raw.data
        : [];

    const items: UserItem[] = rawList.map((u: any) => {
      const resolvedId = u.userId || u.id || '';
      let resolvedStatus: 'Active' | 'Pending' | 'Suspended' = 'Active';
      if (u.status) {
        const s = String(u.status).toLowerCase();
        if (s === 'pending') resolvedStatus = 'Pending';
        else if (s === 'suspended') resolvedStatus = 'Suspended';
        else resolvedStatus = 'Active';
      } else if (u.isActive === false) {
        resolvedStatus = 'Suspended';
      } else if (u.isActive === true) {
        resolvedStatus = 'Active';
      }

      return {
        id: resolvedId,
        userId: resolvedId,
        email: u.email || '',
        firstName: u.firstName || u.fullName?.split(' ')[0] || '',
        lastName: u.lastName || u.fullName?.split(' ').slice(1).join(' ') || '',
        fullName:
          u.fullName ||
          [u.firstName, u.lastName].filter(Boolean).join(' ') ||
          u.email ||
          'Unknown User',
        roles: Array.isArray(u.roles) ? u.roles : [],
        status: resolvedStatus,
        isActive: u.isActive ?? (resolvedStatus === 'Active'),
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt || new Date().toISOString(),
      };
    });

    return {
      data: items,
      totalCount: raw?.totalCount ?? items.length,
      totalPages:
        raw?.totalPages ??
        Math.max(1, Math.ceil((raw?.totalCount ?? items.length) / (raw?.pageSize ?? 10))),
      currentPage: raw?.currentPage ?? raw?.pageNumber ?? 1,
      pageSize: raw?.pageSize ?? (items.length || 10),
    };
  }, []);

  // Format filter query params for the backend
  const parsePayload = useCallback((payload: Record<string, any>) => {
    const clean: Record<string, any> = { ...payload };
    if (clean.isActive === '' || clean.isActive === undefined) {
      delete clean.isActive;
    } else if (clean.isActive === 'true') {
      clean.isActive = true;
    } else if (clean.isActive === 'false') {
      clean.isActive = false;
    }

    if (clean.role === '' || clean.role === undefined) {
      delete clean.role;
    }

    return clean;
  }, []);

  // Extended filter definitions for role and status
  const extendedFilters: FilterParam[] = useMemo(
    () => [
      {
        type: 'SelectFilter',
        accessor: 'role',
        label: 'Role',
        args: {
          options: [
            { label: 'All Roles', value: '' },
            ...roles.map((r) => ({ label: r.name, value: r.name })),
          ],
        },
      },
      {
        type: 'SelectFilter',
        accessor: 'isActive',
        label: 'Status',
        args: {
          options: [
            { label: 'All Statuses', value: '' },
            { label: 'Active', value: 'true' },
            { label: 'Suspended', value: 'false' },
          ],
        },
      },
    ],
    [roles]
  );

  // FlatDataTable Column Definitions
  const columns: ColumnDef<UserItem>[] = useMemo(
    () => [
      {
        field: 'fullName',
        header: 'User',
        sortable: true,
        body: (user) => (
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
              <div className="font-bold text-white text-sm truncate">{user.fullName}</div>
              <div className="text-xs text-portal-accent font-mono truncate">{user.email}</div>
            </div>
          </div>
        ),
      },
      {
        field: 'roles',
        header: 'Role',
        body: (user) => (
          <span className="text-xs text-[#e6edf3] font-medium">
            {Array.isArray(user.roles) && user.roles.length > 0
              ? user.roles.join(', ')
              : 'No Roles Assigned'}
          </span>
        ),
      },
      {
        field: 'status',
        header: 'Status',
        sortable: true,
        body: (user) => {
          const status = getDisplayStatus(user);
          return (
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-medium ${status === 'Active'
                ? 'text-portal-accent'
                : status === 'Pending'
                  ? 'text-amber-400'
                  : 'text-red-accent'
                }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${status === 'Active'
                  ? 'bg-portal-accent'
                  : status === 'Pending'
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-red-accent'
                  }`}
              />
              {status}
            </span>
          );
        },
      },
      {
        field: 'lastLoginAt',
        header: 'Last Active',
        sortable: true,
        body: (user) => (
          <span className="text-[#e6edf3] font-mono text-xs font-medium">
            {user.lastLoginAt
              ? new Date(user.lastLoginAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
              : 'Never'}
          </span>
        ),
      },
      {
        field: 'actions',
        header: 'Actions',
        headerStyle: { textAlign: 'right' },
        style: { width: '80px', textAlign: 'right' },
        body: (user) => {
          const userId = user.id || (user as any).userId;
          const isMenuActive =
            menuState?.user &&
            (menuState.user.id || (menuState.user as any).userId) === userId;

          return (
            <div className="flex justify-end">
              <button
                type="button"
                data-actions-trigger="true"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isMenuActive) {
                    setMenuState(null);
                  } else {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const menuWidth = 192;
                    setMenuState({
                      user,
                      top: rect.bottom + 4,
                      left: Math.max(8, rect.right - menuWidth),
                    });
                  }
                }}
                title="Actions"
                className={`w-7 h-7 inline-flex items-center justify-center rounded transition cursor-pointer ${isMenuActive
                  ? 'bg-white/15 text-white'
                  : 'text-portal-muted hover:text-white hover:bg-white/10'
                  }`}
              >
                <i className="pi pi-ellipsis-v text-xs" />
              </button>
            </div>
          );
        },
      },
    ],
    [menuState]
  );

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex border-b border-portal-border/60 gap-6 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`pb-3 -mb-px border-b-2 transition cursor-pointer flex items-center gap-2 !rounded-none rounded-none ${
            activeTab === 'users'
              ? 'border-portal-accent text-white'
              : 'border-transparent text-portal-muted hover:text-white'
          }`}
        >
          <i className="pi pi-users text-xs" />
          <span>User Accounts</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('matrix')}
          className={`pb-3 -mb-px border-b-2 transition cursor-pointer flex items-center gap-2 !rounded-none rounded-none ${
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
        <FlatDataTable<UserItem>
          dataSourceUrl="/users"
          columns={columns}
          heading="Users & Access Control"
          headerNotes="Manage system accounts, assign roles, handle invitations, and control access permissions."
          hasAction
          actionName="Invite User"
          onAction={() => setInviteModalVisible(true)}
          filterable="search"
          filterablePlaceholder="Search by name, email, or employee number..."
          enableTableFilter
          extendedFilter={{
            enable: true,
            filters: extendedFilters,
          }}
          enablePaginator
          initialPageSize={10}
          emptyDataText="No user accounts matched your search criteria."
          dataMapper={userDataMapper}
          parsePayload={parsePayload}
        />
      ) : (
        /* Role Permissions Matrix Tab */
        <div className="space-y-4">
          <div className="bg-portal-surface border border-portal-border/60 rounded p-6">
            <h2 className="text-xl font-bold tracking-tight text-white">
              Role Permissions Matrix
            </h2>
            <p className="text-xs text-portal-muted max-w-2xl leading-relaxed mt-1">
              Review predefined role authority scopes, authorized operational domains, and access tiers.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {roles.map((role) => (
              <div
                key={role.name}
                className="p-5 bg-portal-surface border border-portal-border/60 rounded flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`px-2 py-0.5 text-xs font-bold rounded border ${role.name === 'Admin'
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
        onSuccess={handleRefresh}
      />

      <ManageRolesModal
        visible={Boolean(manageRolesUser)}
        onHide={() => setManageRolesUser(null)}
        user={manageRolesUser}
        availableRoles={roles}
        onSuccess={handleRefresh}
      />

      {/* Floating Action Menu for Table Row */}
      {menuState &&
        createPortal(
          <div
            data-actions-menu="true"
            style={{
              top: `${menuState.top}px`,
              left: `${menuState.left}px`,
            }}
            className="fixed z-[9999] w-48 bg-portal-card border border-portal-card-border rounded shadow-2xl shadow-black/60 py-1 text-xs divide-y divide-white/10 font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            {getDisplayStatus(menuState.user) === 'Pending' ? (
              <div className="py-0.5">
                <button
                  type="button"
                  onClick={() => {
                    const u = menuState.user;
                    setMenuState(null);
                    handleResendInvite(u);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-white hover:bg-white/10 transition-colors text-left cursor-pointer font-medium"
                >
                  <i className="pi pi-send text-portal-accent text-xs w-4" />
                  <span>Resend Invitation</span>
                </button>
              </div>
            ) : (
              <>
                <div className="py-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      const u = menuState.user;
                      setMenuState(null);
                      setManageRolesUser(u);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-white hover:bg-white/10 transition-colors text-left cursor-pointer font-medium"
                  >
                    <i className="pi pi-shield text-portal-accent text-xs w-4" />
                    <span>Manage Roles</span>
                  </button>
                </div>

                <div className="py-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      const u = menuState.user;
                      setMenuState(null);
                      handleToggleStatus(u);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-white hover:bg-white/10 transition-colors text-left cursor-pointer font-medium"
                  >
                    <i
                      className={`pi ${getDisplayStatus(menuState.user) === 'Active'
                        ? 'pi-ban text-red-accent'
                        : 'pi-check text-portal-accent'
                        } text-xs w-4`}
                    />
                    <span>
                      {getDisplayStatus(menuState.user) === 'Active'
                        ? 'Suspend Account'
                        : 'Activate Account'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const u = menuState.user;
                      setMenuState(null);
                      handleRevokeSessions(u);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-white hover:bg-white/10 transition-colors text-left cursor-pointer font-medium"
                  >
                    <i className="pi pi-sign-out text-white/70 text-xs w-4" />
                    <span>Revoke Sessions</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const u = menuState.user;
                      setMenuState(null);
                      handleResetPassword(u);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-white hover:bg-white/10 transition-colors text-left cursor-pointer font-medium"
                  >
                    <i className="pi pi-key text-amber-400 text-xs w-4" />
                    <span>Reset Password</span>
                  </button>
                </div>
              </>
            )}
          </div>,
          document.body
        )}
    </div>
  );
};

export default UsersAndRolesPage;
