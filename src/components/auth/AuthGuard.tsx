import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children, requiredRoles }) => {
  const { user, isAuthenticated, isLoading, hasRole } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-portal-canvas">
        <img
          src="/images/prohpharmacy_icon_white.png"
          alt="ProH Pharmacy"
          className="w-12 h-12 object-contain animate-pulse"
        />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    const currentPath = location.pathname + location.search;
    const target = `/login?callbackUrl=${encodeURIComponent(currentPath)}`;
    return <Navigate to={target} replace state={{ from: location }} />;
  }


  if (requiredRoles && requiredRoles.length > 0) {
    const hasRequiredRole = requiredRoles.some((role) => hasRole(role));
    if (!hasRequiredRole) {
      return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-slate-50 text-slate-800">
          <div className="max-w-md w-full bg-white p-8 border border-slate-300 rounded shadow-md text-center">
            <i className="pi pi-lock text-red-accent text-4xl mb-3" />
            <h2 className="text-xl font-bold mb-2">Access Restricted</h2>
            <p className="text-sm text-slate-600 mb-6">
              Your account does not possess the required permission roles to access this module.
            </p>
            <button
              type="button"
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-primary-green hover:bg-deep-green text-white text-xs font-bold uppercase rounded cursor-pointer transition"
            >
              Return Back
            </button>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};

export default AuthGuard;
