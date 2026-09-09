import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  usersApi,
  staffApi,
  organisationApi,
  type UserItem,
  type StaffItem,
  type Role,
  type Branch,
} from '../../../api-client';
import {
  FlatDataTable,
  type ColumnDef,
  type FilterParam,
  type PaginatedDataResponse,
  resetTableData,
} from '../../../components/data-table';
import { InviteUserModal } from './components/InviteUserModal';
import { ManageRolesModal } from './components/ManageRolesModal';
import { PasswordResetResultModal } from './components/PasswordResetResultModal';
import { CreateStaffModal } from './components/CreateStaffModal';
import { EditStaffModal } from './components/EditStaffModal';
import { GrantStaffAccessModal } from './components/GrantStaffAccessModal';
import { EditRolePermissionsView } from './components/EditRolePermissionsView';
import { CreateRoleModal } from './components/CreateRoleModal';
import { FlatConfirmDialog } from '../../../components/overlay';
import { FlatButton } from '../../../components/flat-form';
import toast from 'react-hot-toast';

const SEEDED_ROLES: Role[] = [
  { name: 'SuperAdmin', description: 'Complete system, security, user administration & organisation authority.', isSystem: true },
  { name: 'OperationsManager', description: 'All treks, fleet, customer accounts, and operations reports.', isSystem: true },
  { name: 'BranchManager', description: 'Staff, vehicles, treks, and customer onboarding for assigned branch.', isSystem: true },
  { name: 'FieldStaff', description: 'Assigned treks, customer registration, visit capture, and check-ins.', isSystem: true },
  { name: 'Driver', description: 'Assigned transit runs only, mobile trekking telemetry & delivery logs.', isSystem: true },
  { name: 'CreditOfficer', description: 'Customer KYC, credit risk assessment, customer approval & ledger.', isSystem: true },
  { name: 'Auditor', description: 'Read-only analytics, reports export, and system audit event inspection.', isSystem: true },
];

export const UsersAndRolesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // URL-driven active tab
  const rawTab = searchParams.get('tab');
  const activeTab: 'users' | 'staff' | 'matrix' =
    rawTab === 'staff' || rawTab === 'matrix' ? rawTab : 'users';

  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [createRoleVisible, setCreateRoleVisible] = useState(false);

  const handleTabChange = (tab: 'users' | 'staff' | 'matrix') => {
    if (tab !== 'matrix') {
      setEditingRole(null);
    }
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (tab === 'users') {
        next.delete('tab');
      } else {
        next.set('tab', tab);
      }
      return next;
    });
  };

  const [roles, setRoles] = useState<Role[]>(SEEDED_ROLES);
  const [roleSearch, setRoleSearch] = useState('');
  const [roleViewMode, setRoleViewMode] = useState<'table' | 'cards'>('table');
  const [branches, setBranches] = useState<Branch[]>([]);

  // Modals & Floating Action Menus
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [createStaffVisible, setCreateStaffVisible] = useState(false);
  const [manageRolesUser, setManageRolesUser] = useState<UserItem | null>(null);
  const [editStaffTarget, setEditStaffTarget] = useState<StaffItem | null>(null);
  const [grantAccessStaffTarget, setGrantAccessStaffTarget] = useState<StaffItem | null>(null);
  const [resetResult, setResetResult] = useState<{
    user: UserItem | null;
    newPassword?: string;
    message?: string;
  } | null>(null);

  const [confirmDialog, setConfirmDialog] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    variant: 'primary' | 'danger' | 'warning';
    action: () => Promise<void>;
  }>({
    visible: false,
    title: '',
    message: '',
    confirmLabel: 'Confirm',
    variant: 'primary',
    action: async () => {},
  });

  const [menuState, setMenuState] = useState<{
    user: UserItem;
    top: number;
    left: number;
  } | null>(null);

  const [staffMenuState, setStaffMenuState] = useState<{
    staff: StaffItem;
    top: number;
    left: number;
  } | null>(null);

  // Status normalization helper for user display
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

  // Close floating action menus on outside click, Escape key or resize
  useEffect(() => {
    if (!menuState && !staffMenuState) return;

    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-actions-menu]') || target?.closest('[data-actions-trigger]')) {
        return;
      }
      setMenuState(null);
      setStaffMenuState(null);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuState(null);
        setStaffMenuState(null);
      }
    };

    const handleResize = () => {
      setMenuState(null);
      setStaffMenuState(null);
    };

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
  }, [menuState, staffMenuState]);

  // Load available roles & branches
  const loadInitialData = useCallback(async () => {
    try {
      const fetchedRoles = await usersApi.getRoles();
      if (fetchedRoles && fetchedRoles.length > 0) {
        setRoles(fetchedRoles);
      }
    } catch {
      // Fallback seeded roles stay in place
    }

    try {
      const fetchedBranches = await organisationApi.getBranches();
      if (fetchedBranches && fetchedBranches.length > 0) {
        setBranches(fetchedBranches);
      }
    } catch {
      // Branches stay empty if unavailable
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const filteredRoles = useMemo(() => {
    if (!roleSearch.trim()) return roles;
    const q = roleSearch.toLowerCase();
    return roles.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q))
    );
  }, [roles, roleSearch]);

  // Refresh table data
  const handleUserRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/users'] });
    resetTableData();
  }, [queryClient]);

  const handleStaffRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/staff'] });
    resetTableData();
  }, [queryClient]);

  // --- User Actions ---
  const handleToggleUserStatus = (user: UserItem) => {
    const isActivating = getDisplayStatus(user) === 'Suspended';
    const targetId = user.id || (user as any).userId;

    setConfirmDialog({
      visible: true,
      title: isActivating ? 'Activate Account' : 'Suspend Account',
      message: isActivating
        ? `Are you sure you want to activate ${user.fullName}'s account to restore full system access?`
        : `Are you sure you want to suspend ${user.fullName}? They will be immediately blocked from accessing the system.`,
      confirmLabel: isActivating ? 'Activate Account' : 'Suspend Account',
      variant: isActivating ? 'primary' : 'danger',
      action: async () => {
        try {
          if (isActivating) {
            await usersApi.activateUser(targetId);
            toast.success(`Account for ${user.fullName} activated.`);
          } else {
            await usersApi.suspendUser(targetId);
            toast.success(`Account for ${user.fullName} suspended.`);
          }
          handleUserRefresh();
        } catch {
          toast.error(`Failed to update status for ${user.fullName}.`);
        } finally {
          setConfirmDialog((prev) => ({ ...prev, visible: false }));
        }
      },
    });
  };

  const handleRevokeSessions = (user: UserItem) => {
    const targetId = user.id || (user as any).userId;

    setConfirmDialog({
      visible: true,
      title: 'Revoke Active Sessions',
      message: `Force logout all active sessions for ${user.fullName}? This will invalidate all active login tokens immediately.`,
      confirmLabel: 'Revoke Sessions',
      variant: 'danger',
      action: async () => {
        try {
          await usersApi.revokeSessions(targetId);
          toast.success(`All active sessions revoked for ${user.fullName}.`);
          handleUserRefresh();
        } catch {
          toast.error(`Failed to revoke sessions for ${user.fullName}.`);
        } finally {
          setConfirmDialog((prev) => ({ ...prev, visible: false }));
        }
      },
    });
  };

  const handleResetPassword = (user: UserItem) => {
    const targetId = user.id || (user as any).userId;
    const email = user.email || (user as any).emailAddress;

    setConfirmDialog({
      visible: true,
      title: 'Reset User Password',
      message: `Reset password for ${user.fullName}? All active sessions will be terminated and new login credentials will be generated.`,
      confirmLabel: 'Reset Password',
      variant: 'warning',
      action: async () => {
        try {
          const res = await usersApi.adminResetPassword(targetId);
          if (res && res.newPassword) {
            setResetResult({
              user,
              newPassword: res.newPassword,
              message: res.message,
            });
          } else {
            toast.success(res?.message || `Password reset instructions sent to ${email}.`);
          }
          handleUserRefresh();
        } catch (err: any) {
          const msg =
            err.response?.data?.detail ||
            err.response?.data?.message ||
            `Failed to reset password for ${email}.`;
          toast.error(msg);
        } finally {
          setConfirmDialog((prev) => ({ ...prev, visible: false }));
        }
      },
    });
  };

  const handleResendInvite = (user: UserItem) => {
    const targetId = user.id || (user as any).userId;
    const email = user.email || (user as any).emailAddress;

    setConfirmDialog({
      visible: true,
      title: 'Resend Invitation',
      message: `Send a fresh invitation link to ${email || user.fullName}?`,
      confirmLabel: 'Resend Link',
      variant: 'primary',
      action: async () => {
        try {
          await usersApi.resendInvitation(targetId);
          toast.success(`Fresh invitation link sent to ${email}.`);
          handleUserRefresh();
        } catch {
          toast.error(`Failed to resend invitation.`);
        } finally {
          setConfirmDialog((prev) => ({ ...prev, visible: false }));
        }
      },
    });
  };

  // --- Staff Actions ---
  const handleStaffStatusChange = (
    staff: StaffItem,
    newStatus: 'Active' | 'Suspended' | 'Offboarded'
  ) => {
    const isActivatingFromOffboarded = staff.employmentStatus === 'Offboarded' && newStatus === 'Active';
    const isSuspending = newStatus === 'Suspended';
    const isOffboarding = newStatus === 'Offboarded';

    setConfirmDialog({
      visible: true,
      title: isOffboarding
        ? 'Offboard Staff Member'
        : isSuspending
        ? 'Suspend Staff Member'
        : isActivatingFromOffboarded
        ? 'Reactivate & Onboard Staff'
        : 'Activate Staff Member',
      message: isOffboarding
        ? `Are you sure you want to offboard ${staff.fullName}? This permanently marks them as offboarded and revokes system access.`
        : isSuspending
        ? `Suspending ${staff.fullName} immediately revokes all operational access and mobile app tokens. Are you sure you want to proceed?`
        : isActivatingFromOffboarded
        ? `Are you sure you want to onboard ${staff.fullName} back to active status? This will restore operational status and re-enable platform access.`
        : `Are you sure you want to activate ${staff.fullName} and restore operational status?`,
      confirmLabel: isOffboarding
        ? 'Offboard Staff'
        : isSuspending
        ? 'Suspend Staff'
        : isActivatingFromOffboarded
        ? 'Reactivate Staff'
        : 'Activate Staff',
      variant: isOffboarding || isSuspending ? 'danger' : 'primary',
      action: async () => {
        try {
          await staffApi.changeStatus(staff.id, newStatus);
          toast.success(`Staff member ${staff.fullName} set to ${newStatus}.`);
          handleStaffRefresh();
        } catch (err: any) {
          toast.error(
            err.response?.data?.message ||
              err.response?.data?.detail ||
              `Failed to update status for ${staff.fullName}.`
          );
        } finally {
          setConfirmDialog((prev) => ({ ...prev, visible: false }));
        }
      },
    });
  };

  // --- Users Data Mapper & Payloads ---
  const userDataMapper = useCallback((raw: any): PaginatedDataResponse<UserItem> => {
    const rawList = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.data)
      ? raw.data
      : [];

    const items: UserItem[] = rawList.map((u: any) => {
      const resolvedId = String(u.userId || u.id || '');
      let resolvedStatus: 'Active' | 'Pending' | 'Suspended' = 'Active';
      const rawStatus = u.employmentStatus || u.status;
      if (rawStatus) {
        const s = String(rawStatus).toLowerCase();
        if (s === 'pending') resolvedStatus = 'Pending';
        else if (s === 'suspended' || s === 'offboarded') resolvedStatus = 'Suspended';
        else resolvedStatus = 'Active';
      } else if (u.isActive === false) {
        resolvedStatus = 'Suspended';
      } else if (u.isActive === true) {
        resolvedStatus = 'Active';
      }

      const resolvedEmail = String(u.emailAddress || u.email || '');
      const resolvedRoles: string[] = Array.isArray(u.systemRoles)
        ? u.systemRoles
        : Array.isArray(u.roles)
        ? u.roles
        : u.role
        ? [u.role]
        : [];

      return {
        id: resolvedId,
        userId: resolvedId,
        email: resolvedEmail,
        emailAddress: resolvedEmail,
        firstName: u.firstName || u.fullName?.split(' ')[0] || '',
        lastName: u.lastName || u.fullName?.split(' ').slice(1).join(' ') || '',
        fullName:
          u.fullName ||
          [u.firstName, u.lastName].filter(Boolean).join(' ') ||
          resolvedEmail ||
          'Unknown User',
        phoneNumber: u.phoneNumber || '',
        role: u.role || resolvedRoles[0] || '',
        roles: resolvedRoles,
        systemRoles: resolvedRoles,
        status: resolvedStatus,
        employmentStatus: u.employmentStatus || resolvedStatus,
        isActive: u.isActive ?? (resolvedStatus === 'Active'),
        hasAppAccess: u.hasAppAccess ?? true,
        staffMemberId: u.staffMemberId || u.staffId,
        staffId: u.staffId || u.staffMemberId,
        employeeNumber: u.employeeNumber,
        branchName: u.branchName,
        branchId: u.branchId,
        permissions: Array.isArray(u.permissions) ? u.permissions : [],
        profilePhotoUrl: u.profilePhotoUrl,
        currentDeviceId: u.currentDeviceId,
        currentDeviceName: u.currentDeviceName,
        joinedOn: u.joinedOn,
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt || new Date().toISOString(),
        updatedAt: u.updatedAt ?? null,
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

  const parseUserPayload = useCallback((payload: Record<string, any>) => {
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

  // --- Staff Data Mapper & Payloads ---
  const staffDataMapper = useCallback((raw: any): PaginatedDataResponse<StaffItem> => {
    const rawList = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.items)
      ? raw.items
      : Array.isArray(raw?.data)
      ? raw.data
      : [];

    const items: StaffItem[] = rawList.map((s: any) => ({
      id: String(s.id || s.staffMemberId || ''),
      employeeNumber: s.employeeNumber || s.staffNumber,
      firstName: s.firstName || '',
      lastName: s.lastName || '',
      fullName:
        s.fullName ||
        [s.firstName, s.lastName].filter(Boolean).join(' ') ||
        'Staff Member',
      phoneNumber: s.phoneNumber || s.phone || '',
      emailAddress: s.emailAddress || s.email || '',
      email: s.emailAddress || s.email || '',
      branchId: s.branchId,
      branchName: s.branchName || '—',
      role: s.role || s.jobTitle || 'Staff',
      jobTitle: s.jobTitle || s.role || 'Staff',
      systemRoles: Array.isArray(s.systemRoles) ? s.systemRoles : s.role ? [s.role] : [],
      joinedOn: s.joinedOn,
      employmentStatus: s.employmentStatus || s.status || 'Active',
      status: s.employmentStatus || s.status || 'Active',
      hasAppAccess: s.hasAppAccess ?? false,
      profilePhotoUrl: s.profilePhotoUrl || null,
      createdAt: s.createdAt || new Date().toISOString(),
      updatedAt: s.updatedAt || null,
    }));

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

  const parseStaffPayload = useCallback((payload: Record<string, any>) => {
    const clean: Record<string, any> = { ...payload };
    if (clean.hasAppAccess === '' || clean.hasAppAccess === undefined) {
      delete clean.hasAppAccess;
    } else if (clean.hasAppAccess === 'true') {
      clean.hasAppAccess = true;
    } else if (clean.hasAppAccess === 'false') {
      clean.hasAppAccess = false;
    }

    if (!clean.status) delete clean.status;
    if (!clean.branchId) delete clean.branchId;

    return clean;
  }, []);

  // Filter definitions
  const userExtendedFilters: FilterParam[] = useMemo(
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

  const staffExtendedFilters: FilterParam[] = useMemo(
    () => [
      {
        type: 'SelectFilter',
        accessor: 'status',
        label: 'Status',
        args: {
          options: [
            { label: 'All Statuses', value: '' },
            { label: 'Active', value: 'Active' },
            { label: 'Pending', value: 'Pending' },
            { label: 'Suspended', value: 'Suspended' },
            { label: 'Offboarded', value: 'Offboarded' },
          ],
        },
      },
      {
        type: 'SelectFilter',
        accessor: 'hasAppAccess',
        label: 'Access Tier',
        args: {
          options: [
            { label: 'All Staff', value: '' },
            { label: 'Platform Access Enabled', value: 'true' },
            { label: 'No Login Access', value: 'false' },
          ],
        },
      },
      {
        type: 'SelectFilter',
        accessor: 'branchId',
        label: 'Branch',
        args: {
          options: [
            { label: 'All Branches', value: '' },
            ...branches.map((b) => ({ label: b.name, value: b.id })),
          ],
        },
      },
    ],
    [branches]
  );

  // User Table Column Definitions
  const userColumns: ColumnDef<UserItem>[] = useMemo(
    () => [
      {
        field: 'fullName',
        header: 'User',
        sortable: true,
        body: (user) => {
          const userId = user.id || (user as any).userId;
          return (
            <div
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => navigate(`/portal/settings/users/${userId}`)}
              title="Click to view & edit user details"
            >
              <div className="w-8 h-8 rounded-full bg-portal-canvas border border-portal-border flex items-center justify-center font-bold text-white text-xs shrink-0 group-hover:border-portal-accent transition-colors">
                {user.fullName
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-white text-xs truncate group-hover:text-portal-accent transition-colors">
                  {user.fullName}
                </div>
                <div className="text-[11px] text-portal-accent font-mono truncate">{user.email}</div>
              </div>
            </div>
          );
        },
      },
      {
        field: 'roles',
        header: 'Role',
        body: (user) => (
          <span className="text-xs text-portal-text font-medium">
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
              className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                status === 'Active'
                  ? 'text-portal-accent'
                  : status === 'Pending'
                  ? 'text-amber-400'
                  : 'text-red-accent'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  status === 'Active'
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
          <span className="text-portal-text font-mono text-xs font-medium">
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
                    setStaffMenuState(null);
                    setMenuState({
                      user,
                      top: rect.bottom + 4,
                      left: Math.max(8, rect.right - menuWidth),
                    });
                  }
                }}
                title="Actions"
                className={`w-7 h-7 inline-flex items-center justify-center rounded transition cursor-pointer ${
                  isMenuActive
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
    [menuState, navigate]
  );

  // Staff Table Column Definitions
  const staffColumns: ColumnDef<StaffItem>[] = useMemo(
    () => [
      {
        field: 'fullName',
        header: 'Staff Member',
        sortable: true,
        body: (staff) => (
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => setEditStaffTarget(staff)}
            title="Click to view & edit staff member details"
          >
            <div className="w-8 h-8 rounded-full bg-portal-canvas border border-portal-border flex items-center justify-center font-bold text-white text-xs shrink-0 group-hover:border-portal-accent transition-colors">
              {staff.fullName
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-white text-xs truncate group-hover:text-portal-accent transition-colors">
                {staff.fullName}
              </div>
              <div className="text-[11px] text-portal-muted font-mono truncate">
                {staff.emailAddress || staff.phoneNumber || '—'}
              </div>
            </div>
          </div>
        ),
      },
      {
        field: 'employeeNumber',
        header: 'Emp #',
        sortable: true,
        body: (staff) => (
          <span className="font-mono text-xs text-portal-accent font-medium">
            {staff.employeeNumber || '—'}
          </span>
        ),
      },
      {
        field: 'branchName',
        header: 'Branch',
        sortable: true,
        body: (staff) => (
          <span className="text-xs text-portal-text font-medium">
            {staff.branchName || '—'}
          </span>
        ),
      },
      {
        field: 'role',
        header: 'Role / Title',
        body: (staff) => (
          <span className="text-xs text-white font-medium">
            {staff.role || staff.jobTitle || 'Staff'}
          </span>
        ),
      },
      {
        field: 'hasAppAccess',
        header: 'Platform Access',
        body: (staff) => (
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-medium ${
              staff.hasAppAccess ? 'text-portal-accent' : 'text-portal-muted'
            }`}
          >
            <i
              className={`pi ${
                staff.hasAppAccess
                  ? 'pi-check-circle text-portal-accent'
                  : 'pi-minus-circle text-portal-muted'
              } text-[11px]`}
            />
            <span>{staff.hasAppAccess ? 'Access Enabled' : 'No Login Access'}</span>
          </span>
        ),
      },

      {
        field: 'joinedOn',
        header: 'Joined',
        sortable: true,
        body: (staff) => (
          <span className="text-portal-text font-mono text-xs">
            {staff.joinedOn ? new Date(staff.joinedOn).toLocaleDateString() : '—'}
          </span>
        ),
      },
      {
        field: 'actions',
        header: 'Actions',
        headerStyle: { textAlign: 'right' },
        style: { width: '80px', textAlign: 'right' },
        body: (staff) => {
          const isMenuActive = staffMenuState?.staff && staffMenuState.staff.id === staff.id;

          return (
            <div className="flex justify-end">
              <button
                type="button"
                data-actions-trigger="true"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isMenuActive) {
                    setStaffMenuState(null);
                  } else {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const menuWidth = 208;
                    setMenuState(null);
                    setStaffMenuState({
                      staff,
                      top: rect.bottom + 4,
                      left: Math.max(8, rect.right - menuWidth),
                    });
                  }
                }}
                title="Actions"
                className={`w-7 h-7 inline-flex items-center justify-center rounded transition cursor-pointer ${
                  isMenuActive
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
    [staffMenuState]
  );

  return (
    <div className="space-y-6">
      {/* Tabs */}
      {!editingRole && (
        <div className="flex border-b border-portal-border/60 gap-6 text-xs font-bold">
          <button
            type="button"
            onClick={() => handleTabChange('users')}
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
            onClick={() => handleTabChange('staff')}
            className={`pb-3 -mb-px border-b-2 transition cursor-pointer flex items-center gap-2 !rounded-none rounded-none ${
              activeTab === 'staff'
                ? 'border-portal-accent text-white'
                : 'border-transparent text-portal-muted hover:text-white'
            }`}
          >
            <i className="pi pi-id-card text-xs" />
            <span>Staff Directory</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('matrix')}
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
      )}

      {activeTab === 'users' ? (
        <FlatDataTable<UserItem>
          dataSourceUrl="/users?sort=createdAt_desc"
          columns={userColumns}
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
            filters: userExtendedFilters,
          }}
          enablePaginator
          initialPageSize={10}
          emptyDataText="No user accounts matched your search criteria."
          dataMapper={userDataMapper}
          parsePayload={parseUserPayload}
        />
      ) : activeTab === 'staff' ? (
        <FlatDataTable<StaffItem>
          dataSourceUrl="/staff?sort=createdAt_desc"
          columns={staffColumns}
          heading="Staff Directory"
          headerNotes="Directory of all organization personnel across hubs and branches. Access-enabled staff can log in to operations."
          hasAction
          actionName="Add Staff"
          onAction={() => setCreateStaffVisible(true)}
          filterable="search"
          filterablePlaceholder="Search staff by name, email, or phone..."
          enableTableFilter
          extendedFilter={{
            enable: true,
            filters: staffExtendedFilters,
          }}
          enablePaginator
          initialPageSize={10}
          emptyDataText="No staff members matched your search criteria."
          dataMapper={staffDataMapper}
          parsePayload={parseStaffPayload}
        />
      ) : editingRole ? (
        <EditRolePermissionsView
          role={editingRole}
          onBack={() => setEditingRole(null)}
          onRoleUpdated={(updated) => {
            setRoles((prev) =>
              prev.map((r) =>
                r.id === updated.id || r.name === updated.name ? updated : r
              )
            );
            setEditingRole(updated);
          }}
        />
      ) : (
        /* Role Permissions Matrix Tab */
        <div className="space-y-4">
          {/* Header Card: Controls & Actions */}
          <div className="bg-portal-surface border border-portal-border/60 rounded p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <i className="pi pi-shield text-portal-accent text-xs" />
                <span>Role Permissions Matrix</span>
              </h2>
              <p className="text-xs text-portal-muted mt-1">
                Configure operational authority, assign module capabilities, and manage system access tiers.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {/* Filter input */}
              <div className="relative w-44 sm:w-56">
                <i className="pi pi-search absolute left-2.5 top-1/2 -translate-y-1/2 text-portal-muted text-xs pointer-events-none" />
                <input
                  type="text"
                  value={roleSearch}
                  onChange={(e) => setRoleSearch(e.target.value)}
                  placeholder="Filter roles..."
                  className="w-full h-[38px] pl-8 pr-7 bg-portal-canvas border border-portal-border rounded text-xs text-white placeholder-portal-muted focus:outline-none focus:border-portal-accent transition"
                />
                {roleSearch && (
                  <button
                    type="button"
                    onClick={() => setRoleSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-portal-muted hover:text-white"
                  >
                    <i className="pi pi-times text-[10px]" />
                  </button>
                )}
              </div>

              {/* View Toggle (Table / Cards) */}
              <div className="inline-flex items-center bg-portal-canvas border border-portal-border rounded p-0.5 h-[38px]">
                <button
                  type="button"
                  onClick={() => setRoleViewMode('table')}
                  title="Table View"
                  className={`h-full px-2.5 rounded text-xs inline-flex items-center justify-center transition cursor-pointer ${
                    roleViewMode === 'table'
                      ? 'bg-portal-surface text-white shadow-xs font-semibold'
                      : 'text-portal-muted hover:text-white'
                  }`}
                >
                  <i className="pi pi-bars text-xs" />
                </button>
                <button
                  type="button"
                  onClick={() => setRoleViewMode('cards')}
                  title="Cards View"
                  className={`h-full px-2.5 rounded text-xs inline-flex items-center justify-center transition cursor-pointer ${
                    roleViewMode === 'cards'
                      ? 'bg-portal-surface text-white shadow-xs font-semibold'
                      : 'text-portal-muted hover:text-white'
                  }`}
                >
                  <i className="pi pi-th-large text-xs" />
                </button>
              </div>

              <FlatButton
                type="button"
                variant="primary"
                size="sm"
                leftIcon="pi pi-plus"
                onClick={() => setCreateRoleVisible(true)}
              >
                Create Custom Role
              </FlatButton>
            </div>
          </div>

          {filteredRoles.length === 0 ? (
            <div className="bg-portal-surface border border-portal-border/60 rounded p-12 text-center">
              <i className="pi pi-search text-2xl text-portal-muted mb-2 block" />
              <p className="text-xs text-portal-muted">No roles found matching "{roleSearch}"</p>
            </div>
          ) : roleViewMode === 'table' ? (
            /* Cohesive Table View - Sleek & Low Cognitive Load */
            <div className="bg-portal-surface border border-portal-border/60 rounded overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-portal-border/60 bg-portal-canvas/40 text-[11px] font-medium text-portal-muted uppercase tracking-wider">
                      <th className="py-3 px-5">Role</th>
                      <th className="py-3 px-5">Scope & Description</th>
                      <th className="py-3 px-5">Type</th>
                      <th className="py-3 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-portal-border/40">
                    {filteredRoles.map((role) => {
                      const isSystem =
                        role.isSystem ??
                        (role.name === 'SuperAdmin' ||
                          role.name === 'Admin' ||
                          role.name === 'BranchManager' ||
                          role.name === 'OperationsManager' ||
                          role.name === 'Driver' ||
                          role.name === 'FieldStaff' ||
                          role.name === 'CreditOfficer' ||
                          role.name === 'Auditor');

                      return (
                        <tr
                          key={role.id || role.name}
                          className="hover:bg-white/[0.02] transition"
                        >
                          <td className="py-3.5 px-5">
                            <span className="text-xs font-bold text-white">
                              {role.name}
                            </span>
                          </td>
                          <td className="py-3.5 px-5">
                            <p className="text-xs text-portal-muted max-w-xl leading-relaxed">
                              {role.description || 'System authority scope.'}
                            </p>
                          </td>
                          <td className="py-3.5 px-5">
                            <span
                              className={`text-[11px] font-mono ${
                                isSystem ? 'text-portal-muted' : 'text-portal-accent'
                              }`}
                            >
                              {isSystem ? 'System' : 'Custom'}
                            </span>
                          </td>
                          <td className="py-3.5 px-5 text-right">
                            <FlatButton
                              type="button"
                              variant="outline"
                              size="sm"
                              leftIcon="pi pi-sliders-h"
                              onClick={() => setEditingRole(role)}
                            >
                              Edit Permissions
                            </FlatButton>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Streamlined Cards View - Without Duplicate Noise */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRoles.map((role) => {
                const isSystem =
                  role.isSystem ??
                  (role.name === 'SuperAdmin' ||
                    role.name === 'Admin' ||
                    role.name === 'BranchManager' ||
                    role.name === 'OperationsManager' ||
                    role.name === 'Driver' ||
                    role.name === 'FieldStaff' ||
                    role.name === 'CreditOfficer' ||
                    role.name === 'Auditor');

                return (
                  <div
                    key={role.id || role.name}
                    className="p-5 bg-portal-surface border border-portal-border/60 rounded flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-xs font-bold text-white">
                          {role.name}
                        </span>
                        <span
                          className={`text-[10px] font-mono uppercase tracking-wider ${
                            isSystem ? 'text-portal-muted' : 'text-portal-accent'
                          }`}
                        >
                          {isSystem ? 'System' : 'Custom'}
                        </span>
                      </div>
                      <p className="text-xs text-portal-muted leading-relaxed min-h-[38px] mb-4">
                        {role.description || 'System authority scope.'}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-portal-border/40">
                      <FlatButton
                        type="button"
                        variant="outline"
                        size="sm"
                        fullWidth
                        leftIcon="pi pi-sliders-h"
                        onClick={() => setEditingRole(role)}
                      >
                        Edit Permissions
                      </FlatButton>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <InviteUserModal
        visible={inviteModalVisible}
        onHide={() => setInviteModalVisible(false)}
        availableRoles={roles}
        onSuccess={handleUserRefresh}
      />

      <ManageRolesModal
        visible={Boolean(manageRolesUser)}
        onHide={() => setManageRolesUser(null)}
        user={manageRolesUser}
        availableRoles={roles}
        onSuccess={handleUserRefresh}
      />

      <CreateStaffModal
        visible={createStaffVisible}
        onHide={() => setCreateStaffVisible(false)}
        onSuccess={handleStaffRefresh}
        branches={branches}
        availableRoles={roles}
      />

      <EditStaffModal
        visible={Boolean(editStaffTarget)}
        onHide={() => setEditStaffTarget(null)}
        staff={editStaffTarget}
        onSuccess={handleStaffRefresh}
        branches={branches}
        availableRoles={roles}
      />

      <GrantStaffAccessModal
        visible={Boolean(grantAccessStaffTarget)}
        onHide={() => setGrantAccessStaffTarget(null)}
        staff={grantAccessStaffTarget}
        availableRoles={roles}
        onSuccess={handleStaffRefresh}
      />

      <FlatConfirmDialog
        visible={confirmDialog.visible}
        onHide={() => setConfirmDialog((prev) => ({ ...prev, visible: false }))}
        onConfirm={confirmDialog.action}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        variant={confirmDialog.variant}
      />

      <PasswordResetResultModal
        visible={Boolean(resetResult)}
        onHide={() => setResetResult(null)}
        user={resetResult?.user || null}
        newPassword={resetResult?.newPassword}
        message={resetResult?.message}
      />

      <CreateRoleModal
        visible={createRoleVisible}
        onHide={() => setCreateRoleVisible(false)}
        onSuccess={(newRole) => {
          setRoles((prev) => [...prev, newRole]);
          setEditingRole(newRole);
        }}
      />

      {/* Floating Action Menu for User Row */}
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
                      const userId = u.id || (u as any).userId;
                      setMenuState(null);
                      navigate(`/portal/settings/users/${userId}`);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-white hover:bg-white/10 transition-colors text-left cursor-pointer font-medium"
                  >
                    <i className="pi pi-user-edit text-portal-accent text-xs w-4" />
                    <span>View Details & Roles</span>
                  </button>
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
                      handleToggleUserStatus(u);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-white hover:bg-white/10 transition-colors text-left cursor-pointer font-medium"
                  >
                    <i
                      className={`pi ${
                        getDisplayStatus(menuState.user) === 'Active'
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

      {/* Floating Action Menu for Staff Row */}
      {staffMenuState &&
        createPortal(
          <div
            data-actions-menu="true"
            style={{
              top: `${staffMenuState.top}px`,
              left: `${staffMenuState.left}px`,
            }}
            className="fixed z-[9999] w-52 bg-portal-card border border-portal-card-border rounded shadow-2xl shadow-black/60 py-1 text-xs divide-y divide-white/10 font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="py-0.5">
              <button
                type="button"
                onClick={() => {
                  const s = staffMenuState.staff;
                  setStaffMenuState(null);
                  setEditStaffTarget(s);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-white hover:bg-white/10 transition-colors text-left cursor-pointer font-medium"
              >
                <i className="pi pi-user-edit text-portal-accent text-xs w-4" />
                <span>Edit Details</span>
              </button>
              {!staffMenuState.staff.hasAppAccess && (
                <button
                  type="button"
                  onClick={() => {
                    const s = staffMenuState.staff;
                    setStaffMenuState(null);
                    setGrantAccessStaffTarget(s);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-white hover:bg-white/10 transition-colors text-left cursor-pointer font-medium"
                >
                  <i className="pi pi-key text-portal-accent text-xs w-4" />
                  <span>Grant Platform Access</span>
                </button>
              )}
            </div>

            <div className="py-0.5">
              {staffMenuState.staff.employmentStatus === 'Suspended' ? (
                <button
                  type="button"
                  onClick={() => {
                    const s = staffMenuState.staff;
                    setStaffMenuState(null);
                    handleStaffStatusChange(s, 'Active');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-white hover:bg-white/10 transition-colors text-left cursor-pointer font-medium"
                >
                  <i className="pi pi-check text-portal-accent text-xs w-4" />
                  <span>Activate Staff</span>
                </button>
              ) : staffMenuState.staff.employmentStatus === 'Offboarded' ? (
                <button
                  type="button"
                  onClick={() => {
                    const s = staffMenuState.staff;
                    setStaffMenuState(null);
                    handleStaffStatusChange(s, 'Active');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-white hover:bg-white/10 transition-colors text-left cursor-pointer font-medium"
                >
                  <i className="pi pi-user-plus text-portal-accent text-xs w-4" />
                  <span>Reactivate & Onboard</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const s = staffMenuState.staff;
                    setStaffMenuState(null);
                    handleStaffStatusChange(s, 'Suspended');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-white hover:bg-white/10 transition-colors text-left cursor-pointer font-medium"
                >
                  <i className="pi pi-ban text-red-accent text-xs w-4" />
                  <span>Suspend Staff</span>
                </button>
              )}

              {staffMenuState.staff.employmentStatus !== 'Offboarded' && (
                <button
                  type="button"
                  onClick={() => {
                    const s = staffMenuState.staff;
                    setStaffMenuState(null);
                    handleStaffStatusChange(s, 'Offboarded');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-white hover:bg-white/10 transition-colors text-left cursor-pointer font-medium"
                >
                  <i className="pi pi-user-minus text-red-accent text-xs w-4" />
                  <span>Offboard Staff</span>
                </button>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default UsersAndRolesPage;
