import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';

interface PermissionGuardProps {
  permission?: string;
  permissions?: string[];
  mode?: 'any' | 'all';
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

/**
 * Route or component-level guard that enforces a specific permission key.
 * Specified in docs/frontend/03-roles-and-permissions.md Section 9.
 */
export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permission,
  permissions = [],
  mode = 'any',
  children,
  fallback,
  redirectTo,
}) => {
  const { hasAnyPermission, hasAllPermissions } = usePermissions();
  const required = permission ? [permission, ...permissions] : permissions;
  const allowed = mode === 'all'
    ? hasAllPermissions(...required)
    : hasAnyPermission(...required);

  if (!allowed) {
    if (fallback) {
      return <>{fallback}</>;
    }
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />;
    }
    return <ForbiddenOverlay />;
  }

  return <>{children}</>;
};

/** Full-route 403 presentation, matching the reference app's access control behavior. */
const ForbiddenOverlay: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-[2000] flex h-dvh w-screen items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <main className="relative flex w-full max-w-md flex-col items-center rounded border border-red-accent/70 bg-portal-surface p-8 text-center shadow-2xl ring-1 ring-red-accent/30">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-red-accent/60 text-red-accent">
          <i className="pi pi-lock text-xl" aria-hidden="true" />
        </div>
        <p className="font-mono text-7xl font-black tracking-widest text-white">403</p>
        <h1 className="mt-1 text-lg font-bold text-white">Access forbidden</h1>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-portal-muted">
          You do not have permission to view this page.
        </p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-6 rounded bg-red-accent px-6 py-2.5 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-red-accent-hover"
        >
          Go back
        </button>
      </main>
    </div>
  );
};

/** Inline visibility guard for buttons, tabs, menu items, and other UI actions. */
export const PermissionGate: React.FC<{
  permission?: string;
  permissions?: string[];
  mode?: 'any' | 'all';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ permission, permissions = [], mode = 'any', children, fallback = null }) => {
  const { hasAnyPermission, hasAllPermissions } = usePermissions();
  const required = permission ? [permission, ...permissions] : permissions;
  const allowed = mode === 'all'
    ? hasAllPermissions(...required)
    : hasAnyPermission(...required);
  return allowed ? <>{children}</> : <>{fallback}</>;
};

export default PermissionGuard;
