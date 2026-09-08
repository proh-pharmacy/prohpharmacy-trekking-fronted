import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';

interface PermissionGuardProps {
  permission: string;
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
  children,
  fallback,
  redirectTo,
}) => {
  const { can } = usePermissions();

  if (!can(permission)) {
    if (fallback) {
      return <>{fallback}</>;
    }
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />;
    }
    return (
      <div className="min-h-[300px] w-full flex flex-col items-center justify-center p-6 bg-portal-surface border border-portal-border/60 rounded text-center">
        <i className="pi pi-shield text-amber-400 text-3xl mb-3" />
        <h3 className="text-base font-bold text-white mb-1">Permission Required</h3>
        <p className="text-xs text-portal-muted max-w-sm">
          Your account is missing the <code className="font-mono text-portal-accent bg-portal-canvas px-1.5 py-0.5 rounded">{permission}</code> permission required to view this content.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};

export default PermissionGuard;
