import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Tooltip } from 'primereact/tooltip';
import { useAuth } from '../../../context';
import { PORTAL_NAV_SECTIONS } from './portalNavItems';
import toast from 'react-hot-toast';

interface PortalSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const PortalSidebar: React.FC<PortalSidebarProps> = ({
  collapsed,
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');

  // Track responsive screen size (>= 768px is desktop)
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Only collapse to mini icon bar on desktop; mobile drawer is always full width when open
  const showCollapsed = isDesktop && collapsed;

  // Auto-close mobile drawer on route navigation
  useEffect(() => {
    if (mobileOpen && onCloseMobile) {
      onCloseMobile();
    }
  }, [location.pathname]);

  // Handle ESC key to dismiss mobile drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileOpen && onCloseMobile) {
        onCloseMobile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen, onCloseMobile]);

  const handleLogout = async () => {
    if (onCloseMobile) onCloseMobile();
    toast.success('Signed out successfully.');
    await logout();
    navigate('/login');
  };

  const handleNavItemClick = () => {
    if (!isDesktop && onCloseMobile) {
      onCloseMobile();
    }
  };

  const userInitials = (user?.fullName || user?.email || 'KH')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const userName = user?.fullName || 'Kwesi Mensah';

  const filteredNavSections = PORTAL_NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) =>
      item.label.toLowerCase().includes(searchQuery.trim().toLowerCase())
    ),
  })).filter((section) => section.items.length > 0);

  return (
    <>
      {/* Mobile Drawer Dark Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden transition-opacity duration-300 ${
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onCloseMobile}
        aria-hidden="true"
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 md:static md:z-30 h-full bg-portal-surface border-r border-portal-border/60 flex flex-col shrink-0 transition-all duration-300 ease-in-out shadow-2xl md:shadow-none w-72 max-w-[85vw] ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${
          showCollapsed ? 'md:w-[72px]' : 'md:w-60 lg:w-64'
        }`}
      >
        {/* Tooltip for Collapsed Sidebar Elements (desktop only) */}
        <Tooltip
          target=".portal-tooltip-item"
          position="right"
          showDelay={100}
          hideDelay={40}
          className="portal-sidebar-tooltip"
          disabled={!showCollapsed}
        />

        {/* Top: User Profile & Collapse / Close Controls */}
        <div className="shrink-0 p-4 border-b border-portal-border/60 bg-portal-surface">
          {!showCollapsed ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {/* User Avatar */}
                <div className="shrink-0">
                  <div className="w-9 h-9 rounded-full bg-portal-canvas border border-portal-border flex items-center justify-center text-xs font-semibold text-white shadow-inner">
                    {userInitials}
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-white truncate tracking-tight">
                    {userName}
                  </div>
                  <div className="text-[10px] text-portal-muted truncate font-mono">
                    {user?.roles?.[0] || 'Operations Lead'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {/* Desktop Collapse Sidebar Button */}
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="hidden md:flex items-center justify-center p-1.5 text-portal-muted hover:text-white hover:bg-white/[0.06] rounded transition cursor-pointer"
                  title="Collapse sidebar"
                  aria-label="Collapse sidebar"
                >
                  <i className="pi pi-chevron-left text-xs" />
                </button>

                {/* Mobile Close Button */}
                <button
                  type="button"
                  onClick={onCloseMobile}
                  className="flex md:hidden items-center justify-center p-1.5 text-portal-muted hover:text-white hover:bg-white/[0.06] rounded transition cursor-pointer"
                  title="Close sidebar"
                  aria-label="Close sidebar"
                >
                  <i className="pi pi-times text-xs" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2.5">
              <div
                className="portal-tooltip-item cursor-pointer"
                data-pr-tooltip={`${userName} • ${user?.roles?.[0] || 'Operations Lead'}`}
                data-pr-position="right"
              >
                <div className="w-9 h-9 rounded-full bg-portal-canvas border border-portal-border flex items-center justify-center text-xs font-semibold text-white shadow-inner">
                  {userInitials}
                </div>
              </div>

              <button
                type="button"
                onClick={onToggleCollapse}
                className="p-1.5 text-portal-muted hover:text-white hover:bg-white/[0.06] rounded transition cursor-pointer portal-tooltip-item"
                data-pr-tooltip="Expand sidebar"
                data-pr-position="right"
                aria-label="Expand sidebar"
              >
                <i className="pi pi-chevron-right text-xs" />
              </button>
            </div>
          )}

          {/* Quick Search Box */}
          {!showCollapsed ? (
            <div className="mt-3.5 flex items-center gap-2 px-3 py-2 bg-portal-canvas border border-portal-border rounded text-xs text-portal-text focus-within:border-portal-accent focus-within:text-white transition">
              <i className="pi pi-search text-xs text-portal-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search navigation..."
                className="bg-transparent border-none outline-none text-xs text-portal-text placeholder-portal-muted w-full"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-portal-muted hover:text-white text-[10px]"
                  title="Clear search"
                >
                  <i className="pi pi-times" />
                </button>
              ) : (
                <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-mono bg-portal-surface text-portal-muted rounded border border-portal-border">
                  ⌘K
                </span>
              )}
            </div>
          ) : (
            <div className="mt-3 flex justify-center">
              <button
                type="button"
                onClick={onToggleCollapse}
                className="p-2 text-portal-muted hover:text-white hover:bg-white/[0.06] rounded transition portal-tooltip-item"
                data-pr-tooltip="Search (⌘K)"
                data-pr-position="right"
              >
                <i className="pi pi-search text-xs" />
              </button>
            </div>
          )}
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 px-3 py-3 space-y-5 overflow-y-auto custom-scrollbar">
          {filteredNavSections.map((section) => (
            <div key={section.title} className="space-y-1">
              {!showCollapsed ? (
                <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-white/50">
                  {section.title}
                </div>
              ) : (
                <div
                  className="flex items-center justify-center py-2 text-white/35 hover:text-white/70 transition-colors portal-tooltip-item cursor-default"
                  data-pr-tooltip={section.title}
                  data-pr-position="right"
                >
                  <i className="pi pi-ellipsis-h text-xs" />
                </div>
              )}

              {section.items.map((item) => {
                const isActive =
                  location.pathname === item.to ||
                  (item.to === '/portal/dashboard' && location.pathname === '/portal');

                const tooltipText = item.badge
                  ? `${item.label} (${item.badge})`
                  : item.label;

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={handleNavItemClick}
                    data-pr-tooltip={showCollapsed ? tooltipText : undefined}
                    data-pr-position="right"
                    className={`relative flex items-center ${
                      showCollapsed ? 'justify-center px-0' : 'gap-3 px-3'
                    } py-2.5 text-xs rounded transition-all duration-150 group portal-tooltip-item ${
                      isActive
                        ? 'bg-portal-accent hover:bg-portal-accent-hover text-white font-bold shadow-[0_0_12px_rgba(65,204,132,0.25)]'
                        : 'text-light-green font-normal hover:text-white hover:bg-white/[0.08]'
                    }`}
                  >
                    <i
                      className={`${item.icon} text-sm shrink-0 transition-colors ${
                        isActive ? 'text-white' : 'text-light-green/80 group-hover:text-white'
                      }`}
                    />

                    {!showCollapsed && (
                      <span className="truncate flex-1 tracking-tight">{item.label}</span>
                    )}

                    {!showCollapsed && (
                      item.badge ? (
                        <span
                          className={`ml-auto px-1.5 py-0.5 text-[10px] font-medium rounded ${
                            isActive
                              ? 'bg-black/20 text-white'
                              : 'bg-portal-canvas text-light-green border border-portal-border'
                          }`}
                        >
                          {item.badge}
                        </span>
                      ) : (
                        <i
                          className={`pi pi-chevron-right text-[9px] shrink-0 transition-opacity ${
                            isActive
                              ? 'text-white/70'
                              : 'text-light-green/50 group-hover:text-white/80 opacity-0 group-hover:opacity-100'
                          }`}
                        />
                      )
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
          {filteredNavSections.length === 0 && (
            <div className="px-3 py-6 text-center text-xs text-portal-muted">
              No navigation items found
            </div>
          )}
        </nav>

        {/* Bottom Sidebar Brand Mark & Sign Out */}
        <div className="shrink-0 p-3.5 border-t border-portal-border/60 bg-portal-surface flex items-center justify-between">
          {!showCollapsed ? (
            <>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded bg-portal-canvas border border-portal-border flex items-center justify-center shrink-0">
                  <img
                    src="/images/prohpharmacy_icon_white.png"
                    alt="ProH Logo"
                    className="w-4 h-4 object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold tracking-wider text-white uppercase truncate">
                    PROH PHARMACY
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                title="Sign Out"
                aria-label="Sign Out"
                className="p-1.5 text-red-accent hover:text-red-accent-hover hover:bg-red-accent/10 rounded transition cursor-pointer ml-auto"
              >
                <i className="pi pi-sign-out text-sm" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex justify-center p-2 text-red-accent hover:text-red-accent-hover hover:bg-red-accent/10 rounded transition cursor-pointer portal-tooltip-item"
              data-pr-tooltip="Sign Out"
              data-pr-position="right"
              aria-label="Sign Out"
            >
              <i className="pi pi-sign-out text-sm" />
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

export default PortalSidebar;
