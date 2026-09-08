import { useAuth } from '../context';

/**
 * Hook to check permissions against the authenticated user's permissions array.
 * Per docs/frontend/03-roles-and-permissions.md Section 9:
 * Permissions come back in the login and auth/me response.
 */
export function usePermissions() {
  const { user, can: contextCan, permissions } = useAuth();

  const can = (permission: string): boolean => {
    if (contextCan) return contextCan(permission);
    return user?.permissions?.includes(permission) ?? false;
  };

  const hasAnyPermission = (...requiredPermissions: string[]): boolean => {
    return requiredPermissions.some((p) => can(p));
  };

  const hasAllPermissions = (...requiredPermissions: string[]): boolean => {
    return requiredPermissions.every((p) => can(p));
  };

  return {
    can,
    hasAnyPermission,
    hasAllPermissions,
    permissions,
  };
}

export default usePermissions;
