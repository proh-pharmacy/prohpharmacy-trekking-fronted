import React from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';

interface PortalHeaderProps {
  onToggleMobile?: () => void;
}

export const PortalHeader: React.FC<PortalHeaderProps> = ({ onToggleMobile }) => {
  const location = useLocation();

  const currentSection = location.pathname.replace('/portal/', '') || 'Overview';

  return (
    <header className="h-14 bg-portal-canvas border-b border-portal-border/60 px-4 sm:px-6 flex items-center justify-between shrink-0 z-20">
      {/* Mobile Hamburger Toggle & Breadcrumb */}
      <div className="flex items-center gap-2 sm:gap-2.5 text-xs min-w-0">
        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={onToggleMobile}
          className="md:hidden p-1.5 -ml-1 text-portal-muted hover:text-white hover:bg-white/[0.06] rounded transition cursor-pointer shrink-0"
          aria-label="Toggle navigation menu"
          title="Open navigation menu"
        >
          <i className="pi pi-bars text-sm" />
        </button>

        <i className="pi pi-th-large text-portal-muted text-xs hidden sm:inline-block shrink-0" />
        <i className="pi pi-star text-portal-muted text-xs hidden sm:inline-block shrink-0" />
        <span className="text-portal-muted font-medium hidden sm:inline-block shrink-0">Dashboards</span>
        <span className="text-portal-border hidden sm:inline-block shrink-0">/</span>
        <span className="text-white font-semibold capitalize truncate">
          {currentSection}
        </span>
      </div>

      {/* Top Right Quick Actions: Dark Mode, Refresh, Notifications, Status */}
      <div className="flex items-center gap-2.5">
        {/* Dark Mode Icon */}
        <button
          type="button"
          className="p-1.5 text-portal-muted hover:text-white rounded transition cursor-pointer"
          title="Dark Mode Active"
        >
          <i className="pi pi-moon text-xs" />
        </button>

        {/* Refresh Icon */}
        <button
          type="button"
          onClick={() => toast.success('Feed synced with Ashaiman Hub')}
          className="p-1.5 text-portal-muted hover:text-white rounded transition cursor-pointer"
          title="Refresh Sync"
        >
          <i className="pi pi-sync text-xs" />
        </button>

        {/* Notifications Icon with Green Portal Accent Unread Dot */}
        <button
          type="button"
          onClick={() => toast.success('3 field teams currently reporting telemetry.')}
          className="relative p-1.5 text-portal-muted hover:text-white rounded transition cursor-pointer"
          title="Notifications"
        >
          <i className="pi pi-bell text-xs" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-portal-accent rounded-full shadow-[0_0_6px_var(--color-portal-accent)]" />
        </button>

        {/* Hub Badge */}
        <div className="hidden sm:flex items-center px-2.5 py-1 bg-portal-surface border border-portal-border text-[11px] font-medium text-portal-text rounded">
          <span>Ashaiman Regional Hub</span>
        </div>
      </div>
    </header>
  );
};

export default PortalHeader;
