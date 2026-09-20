import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/useAuth';

interface PortalHeaderProps {
  onToggleMobile?: () => void;
}

export const PortalHeader: React.FC<PortalHeaderProps> = ({ onToggleMobile }) => {
  const location = useLocation();
  const { user } = useAuth();

  const currentSection = location.pathname.replace('/portal/', '') || 'Overview';
  const workspaceName = user?.branchName || 'Current workspace';

  return (
    <header className="h-16 sm:h-[72px] bg-portal-canvas border-b border-portal-border/60 px-4 sm:px-6 flex items-center justify-between gap-3 shrink-0 z-20">
      {/* Mobile Hamburger Toggle & Breadcrumb */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={onToggleMobile}
          className="md:hidden h-10 w-10 -ml-1 flex items-center justify-center text-portal-text hover:text-white hover:bg-white/[0.06] rounded transition cursor-pointer shrink-0"
          aria-label="Toggle navigation menu"
          title="Open navigation menu"
        >
          <i className="pi pi-bars text-lg" />
        </button>

        <span className="text-base sm:text-lg text-portal-text font-semibold capitalize truncate">
          {currentSection}
        </span>
      </div>

      {/* Top Right Notifications and Workspace */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Notifications placeholder until the notifications service is available */}
        <button
          type="button"
          disabled
          aria-label="Notifications coming soon"
          className="relative h-10 w-10 sm:h-11 sm:w-11 flex items-center justify-center text-portal-muted rounded transition cursor-not-allowed"
          title="Notifications coming soon"
        >
          <i className="pi pi-bell text-base" />
        </button>

        {/* Current branch/workspace */}
        <div className="hidden md:flex h-10 max-w-48 items-center px-3 bg-portal-surface border border-portal-border text-sm font-medium text-portal-text rounded">
          <span className="truncate">{workspaceName}</span>
        </div>
      </div>
    </header>
  );
};

export default PortalHeader;
