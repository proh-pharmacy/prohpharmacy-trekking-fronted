import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context';

interface GuestGuardProps {
  children: React.ReactNode;
}

export const GuestGuard: React.FC<GuestGuardProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#102218] text-white">
        <img
          src="/images/prohpharmacy_icon_white.png"
          alt="ProH Pharmacy Logo"
          className="w-12 h-12 object-contain animate-pulse mb-4"
        />
        <div className="flex items-center gap-2 text-sm text-[#4fb587]">
          <i className="pi pi-spin pi-spinner text-base" />
          <span>Loading portal...</span>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    const searchParams = new URLSearchParams(location.search);
    const rawCallback =
      searchParams.get('callbackUrl') ||
      searchParams.get('returnUrl') ||
      (location.state as { from?: { pathname?: string; search?: string } })?.from?.pathname;

    const destination =
      rawCallback && rawCallback.startsWith('/') && !rawCallback.startsWith('//')
        ? rawCallback
        : '/portal/dashboard';

    return <Navigate to={destination} replace />;
  }


  return <>{children}</>;
};

export default GuestGuard;
