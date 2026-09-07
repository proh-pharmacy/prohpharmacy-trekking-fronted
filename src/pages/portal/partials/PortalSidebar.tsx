import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context';
import { PORTAL_NAV_SECTIONS } from './portalNavItems';
import toast from 'react-hot-toast';

interface PortalSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const PortalSidebar: React.FC<PortalSidebarProps> = ({
  collapsed,
  onToggleCollapse,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = async () => {
    toast.success('Signed out successfully.');
    await logout();
    navigate('/login');
  };

  const userInitials = (user?.fullName || user?.email || 'KH')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const userName = user?.fullName || 'Kwesi Mensah';

  return (
    <aside
      className={`h-full bg-[#2d333b] border-r border-[#444c56]/60 flex flex-col shrink-0 transition-all duration-300 z-30 ${
        collapsed ? 'w-[72px]' : 'w-60 lg:w-64'
      }`}
    >
      {/* Top: User Profile & Collapse Toggle */}
      <div className="shrink-0 p-4 border-b border-[#444c56]/60 bg-[#2d333b]">
        {!collapsed ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {/* User Avatar with Primary Green Active Dot */}
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-full bg-[#22272e] border border-[#444c56] flex items-center justify-center text-xs font-semibold text-white shadow-inner">
                  {userInitials}
                </div>
                <span
                  className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#41cc84] border-2 border-[#2d333b] rounded-full"
                  title="Online"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white truncate tracking-tight">
                  {userName}
                </div>
                <div className="text-[10px] text-[#768390] truncate font-mono">
                  {user?.roles?.[0] || 'Operations Lead'}
                </div>
              </div>
            </div>

            {/* Collapse Sidebar Button */}
            <button
              type="button"
              onClick={onToggleCollapse}
              className="p-1.5 text-[#768390] hover:text-white hover:bg-white/[0.06] rounded transition cursor-pointer"
              title="Collapse sidebar"
            >
              <i className="pi pi-chevron-left text-xs" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2.5">
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-[#22272e] border border-[#444c56] flex items-center justify-center text-xs font-semibold text-white shadow-inner">
                {userInitials}
              </div>
              <span
                className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#41cc84] border-2 border-[#2d333b] rounded-full"
                title="Online"
              />
            </div>

            <button
              type="button"
              onClick={onToggleCollapse}
              className="p-1.5 text-[#768390] hover:text-white hover:bg-white/[0.06] rounded transition cursor-pointer"
              title="Expand sidebar"
            >
              <i className="pi pi-chevron-right text-xs" />
            </button>
          </div>
        )}

        {/* Quick Search Box */}
        {!collapsed ? (
          <div className="mt-3.5 flex items-center gap-2 px-3 py-2 bg-[#22272e] border border-[#444c56] rounded text-xs text-[#adbac7] focus-within:border-[#41cc84] focus-within:text-white transition">
            <i className="pi pi-search text-xs text-[#768390]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="bg-transparent border-none outline-none text-xs text-[#cdd9e5] placeholder-[#768390] w-full"
            />
            <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-mono bg-[#2d333b] text-[#768390] rounded border border-[#444c56]">
              ⌘K
            </span>
          </div>
        ) : (
          <div className="mt-3 flex justify-center">
            <button
              type="button"
              onClick={onToggleCollapse}
              className="p-2 text-[#768390] hover:text-white hover:bg-white/[0.06] rounded transition"
              title="Search (⌘K)"
            >
              <i className="pi pi-search text-xs" />
            </button>
          </div>
        )}
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 px-3 py-3 space-y-5 overflow-y-auto custom-scrollbar">
        {PORTAL_NAV_SECTIONS.map((section) => (
          <div key={section.title} className="space-y-1">
            {!collapsed && (
              <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-white/50">
                {section.title}
              </div>
            )}

            {section.items.map((item) => {
              const isActive =
                location.pathname === item.to ||
                (item.to === '/portal/dashboard' && location.pathname === '/portal');

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  title={collapsed ? item.label : undefined}
                  className={`relative flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded transition-all duration-150 group ${
                    isActive
                      ? 'bg-[#41cc84] hover:bg-[#36ba76] text-white font-bold shadow-[0_0_12px_rgba(65,204,132,0.25)]'
                      : 'text-white/90 hover:text-white hover:bg-white/[0.08]'
                  }`}
                >
                  <i
                    className={`${item.icon} text-sm shrink-0 transition-colors ${
                      isActive ? 'text-white' : 'text-white/70 group-hover:text-white'
                    }`}
                  />

                    {!collapsed && (
                      <span className="truncate flex-1 tracking-tight">{item.label}</span>
                    )}

                    {!collapsed && (
                      item.badge ? (
                        <span
                          className={`ml-auto px-1.5 py-0.5 text-[10px] font-bold rounded ${
                            isActive
                              ? 'bg-black/20 text-white'
                              : 'bg-[#22272e] text-white/90 border border-[#444c56]'
                          }`}
                        >
                          {item.badge}
                        </span>
                      ) : (
                        <i
                          className={`pi pi-chevron-right text-[9px] shrink-0 transition-opacity ${
                            isActive
                              ? 'text-white/70'
                              : 'text-white/40 group-hover:text-white/80 opacity-0 group-hover:opacity-100'
                          }`}
                        />
                      )
                    )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom Sidebar Brand Mark */}
      <div className="shrink-0 p-3.5 border-t border-[#444c56]/60 bg-[#2d333b] flex items-center justify-between">
        {!collapsed ? (
          <>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded bg-[#22272e] border border-[#444c56] flex items-center justify-center shrink-0">
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
              className="p-1.5 text-[#DE2512] hover:text-[#ff5c4c] hover:bg-[#DE2512]/10 rounded transition cursor-pointer ml-auto"
            >
              <i className="pi pi-sign-out text-sm" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={handleLogout}
            title="Sign Out"
            className="w-full flex justify-center p-2 text-[#DE2512] hover:text-[#ff5c4c] hover:bg-[#DE2512]/10 rounded transition cursor-pointer"
          >
            <i className="pi pi-sign-out text-sm" />
          </button>
        )}
      </div>
    </aside>
  );
};

export default PortalSidebar;
