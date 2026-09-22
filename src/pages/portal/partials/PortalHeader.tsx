import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/useAuth';
import { useTheme } from '../../../context/ThemeContext';

interface PortalHeaderProps {
  onToggleMobile?: () => void;
}

const SECTION_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  traccar: 'Traccar',
  trekking: 'Trekking',
  tracking: 'Tracking',
  'customer-pins': 'Customer pins',
  customers: 'Customers',
  products: 'Products',
  fleet: 'Fleet',
  reports: 'Reports',
  settings: 'Settings',
};

function getHeaderTitle(pathname: string): string {
  const segments = pathname.replace(/^\/portal\/?/, '').split('/').filter(Boolean);
  const section = segments[0] || 'dashboard';
  return SECTION_LABELS[section] || section.replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export const PortalHeader: React.FC<PortalHeaderProps> = ({ onToggleMobile }) => {
  const location = useLocation();
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const currentSection = getHeaderTitle(location.pathname);
  const workspaceName = user?.branchName || 'Current workspace';

  return (
    <header className="portal-mobile-header h-16 sm:h-[72px] bg-sidebar-surface md:bg-header-surface px-4 sm:px-6 flex items-center justify-between gap-3 shrink-0 z-20 transition-colors rounded-none">
      {/* Mobile Hamburger Toggle & Breadcrumb */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={onToggleMobile}
          className="md:hidden h-10 w-10 -ml-1 flex items-center justify-center text-sidebar-heading hover:text-sidebar-heading hover:bg-sidebar-hover rounded transition cursor-pointer shrink-0"
          aria-label="Toggle navigation menu"
          title="Open navigation menu"
        >
          <i className="pi pi-bars text-lg" />
        </button>

        <span className="text-base sm:text-lg text-sidebar-heading md:text-header-heading font-semibold capitalize truncate">
          {currentSection}
        </span>
      </div>

      {/* Top Right Theme Toggle, Notifications and Workspace */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Compact theme toggle, restored from the original dark-only header */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="p-1.5 text-sidebar-heading hover:text-sidebar-heading md:text-header-muted md:hover:text-header-heading rounded transition-colors cursor-pointer"
        >
          <i className={`pi ${isDark ? 'pi-moon' : 'pi-sun'} text-xs`} aria-hidden="true" />
        </button>

        {/* Notifications placeholder until the notifications service is available */}
        <button
          type="button"
          disabled
          aria-label="Notifications coming soon"
          className="relative h-10 w-10 sm:h-11 sm:w-11 flex items-center justify-center text-sidebar-heading md:text-header-muted rounded transition cursor-not-allowed"
          title="Notifications coming soon"
        >
          <i className="pi pi-bell text-base" />
        </button>

        {/* Current branch/workspace */}
        <div className="hidden md:flex h-10 max-w-48 items-center px-3 bg-black/15 dark:bg-portal-canvas border border-header-border text-sm font-medium text-header-text rounded">
          <span className="truncate">{workspaceName}</span>
        </div>
      </div>
    </header>
  );
};

export default PortalHeader;
