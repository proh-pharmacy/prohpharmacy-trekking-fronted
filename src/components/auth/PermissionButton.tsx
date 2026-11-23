import { useContext, type ButtonHTMLAttributes } from 'react';
import { AuthContext } from '../../context/authContextDef';
import type { Permission } from '../../lib/permissions/catalogue';

export function useActionPermission(permission?: Permission | readonly Permission[]) {
  const auth = useContext(AuthContext);
  return !permission || (typeof permission === 'string'
    ? auth?.permissions.includes(permission) === true
    : permission.some(key => auth?.permissions.includes(key)));
}

/** Native disabled semantics block pointer and keyboard activation alike. */
export function PermissionButton({ permission, disabled, className, title, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & {
  permission?: Permission | readonly Permission[];
}) {
  const allowed = useActionPermission(permission);
  return <button {...props} disabled={disabled || !allowed}
    title={allowed ? title : 'You do not have permission for this action.'}
    className={`${className ?? ''} disabled:opacity-40 disabled:cursor-not-allowed`} />;
}
