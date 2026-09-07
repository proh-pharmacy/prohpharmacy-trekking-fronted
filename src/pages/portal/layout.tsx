import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context';
import toast from 'react-hot-toast';

interface NavItem {
  label: string;
  to: string;
  icon: string;
  badge?: string | number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const PortalLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    toast.success('Signed out successfully.');
    await logout();
    navigate('/login');
  };

  const navSections: NavSection[] = [
    {
      title: 'Operations',
      items: [
        { label: 'Overview', to: '/portal/dashboard', icon: 'pi pi-th-large' },
        { label: 'Trekking Missions', to: '/portal/trekking', icon: 'pi pi-compass', badge: 14 },
        { label: 'Live Tracking', to: '/portal/tracking', icon: 'pi pi-map' },
      ],
    },
    {
      title: 'Human Resources',
      items: [
        { label: 'Staff Directory', to: '/portal/staff', icon: 'pi pi-users' },
        { label: 'Duty Roster', to: '/portal/roster', icon: 'pi pi-calendar' },
        { label: 'Attendance Logs', to: '/portal/attendance', icon: 'pi pi-check-square' },
      ],
    },
    {
      title: 'Logistics & Supply',
      items: [
        { label: 'Products & Stock', to: '/portal/products', icon: 'pi pi-box' },
        { label: 'Health Clinics', to: '/portal/customers', icon: 'pi pi-building' },
        { label: 'Vehicle Fleet', to: '/portal/fleet', icon: 'pi pi-car' },
      ],
    },
    {
      title: 'Finance & Admin',
      items: [
        { label: 'Ledger & Payments', to: '/portal/ledger', icon: 'pi pi-wallet' },
        { label: 'Reports & Audits', to: '/portal/reports', icon: 'pi pi-chart-line' },
        { label: 'Access Control', to: '/portal/settings', icon: 'pi pi-shield' },
      ],
    },
  ];

  const userInitials = (user?.fullName || user?.email || 'U')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="min-h-screen flex bg-[#141c17] text-white font-sans antialiased selection:bg-[#41cc84] selection:text-black">
      {/* Sleek Dark Green Sidebar */}
      <aside
        className={`bg-[#18231c] border-r border-white/10 flex flex-col shrink-0 transition-all duration-300 z-30 ${
          collapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        {/* Sidebar Header with Brand Mark */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-white/10">
          <NavLink
            to="/portal/dashboard"
            className="flex items-center gap-3 overflow-hidden group focus:outline-none"
          >
            <div className="relative shrink-0 flex items-center justify-center w-10 h-10 rounded bg-[#202d24] border border-white/10 group-hover:border-[#41cc84]/40 transition">
              <img
                src="/images/prohpharmacy_icon_white.png"
                alt="ProH Pharmacy Logo"
                className="w-6 h-6 object-contain"
              />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#41cc84] border-2 border-[#18231c] rounded-full" />
            </div>

            {!collapsed && (
              <div className="min-w-0 transition-opacity duration-200">
                <div className="font-bold text-sm tracking-wide text-white truncate">
                  ProH Pharmacy
                </div>
                <div className="text-[10px] text-[#41cc84] font-semibold tracking-wider uppercase truncate">
                  Trekking Operations
                </div>
              </div>
            )}
          </NavLink>

          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded transition cursor-pointer"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <i className={`pi ${collapsed ? 'pi-chevron-right' : 'pi-chevron-left'} text-xs`} />
          </button>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto custom-scrollbar">
          {navSections.map((section) => (
            <div key={section.title} className="space-y-1">
              {!collapsed && (
                <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-white/40">
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
                    className={`relative flex items-center gap-3.5 px-3 py-2.5 text-xs font-semibold rounded transition-all duration-150 group ${
                      isActive
                        ? 'bg-white/10 text-white shadow-xs'
                        : 'text-white/70 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {/* Active vertical green neon line (inspired by Image 2 reference) */}
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#41cc84] rounded-r shadow-[0_0_8px_#41cc84]" />
                    )}

                    <i
                      className={`${item.icon} text-sm shrink-0 transition-colors ${
                        isActive ? 'text-[#41cc84]' : 'text-white/60 group-hover:text-white'
                      }`}
                    />

                    {!collapsed && (
                      <span className="truncate flex-1 tracking-wide">{item.label}</span>
                    )}

                    {!collapsed && item.badge && (
                      <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold bg-[#41cc84]/20 text-[#41cc84] border border-[#41cc84]/30 rounded">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User Profile Pill in Sidebar Bottom (Matching Image 3 active dot style) */}
        <div className="p-3 border-t border-white/10 bg-[#16201a]">
          <div className="flex items-center gap-3">
            {/* Avatar with Live Green Status Indicator */}
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded bg-[#2a382e] border border-white/15 flex items-center justify-center text-xs font-bold text-[#41cc84] shadow-inner">
                {userInitials}
              </div>
              <span
                className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#41cc84] border-2 border-[#16201a] rounded-full"
                title="Active"
              />
            </div>

            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold truncate text-white">
                  {user?.fullName || user?.email?.split('@')[0] || 'Operations Lead'}
                </div>
                <div className="text-[10px] text-[#41cc84] truncate font-semibold uppercase tracking-wider">
                  {user?.roles?.[0] || 'Super Admin'}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleLogout}
              title="Sign Out"
              className="p-2 text-white/50 hover:text-red-400 hover:bg-white/10 rounded transition cursor-pointer ml-auto"
            >
              <i className="pi pi-sign-out text-sm" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#141c17] overflow-hidden">
        {/* Top Navbar in Dark Theme */}
        <header className="h-16 bg-[#18231c] border-b border-white/10 px-6 flex items-center justify-between shrink-0 z-20">
          {/* Breadcrumb & Regional Hub Badge */}
          <div className="flex items-center gap-3">
            <div className="text-xs font-mono text-white/50">
              PORTAL <span className="text-white/30">/</span>{' '}
              <span className="text-[#41cc84] font-semibold">
                {location.pathname.replace('/portal/', '').toUpperCase() || 'DASHBOARD'}
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-white/5 border border-white/10 text-[11px] font-medium text-white/80 rounded">
              <span className="w-1.5 h-1.5 bg-[#41cc84] rounded-full animate-pulse" />
              <span>Ashaiman Regional Hub</span>
            </div>
          </div>

          {/* Quick Actions, Dev Previews & Alerts */}
          <div className="flex items-center gap-3">
            {/* Live Operational Status */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-[#41cc84]/10 border border-[#41cc84]/30 text-white text-xs rounded">
              <i className="pi pi-compass text-[#41cc84] text-xs" />
              <span className="font-semibold text-[#41cc84]">14 Active Treks</span>
            </div>

            {/* Quick Preview Links */}
            <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-white/10 text-xs">
              <NavLink
                to="/toasts"
                className="px-2.5 py-1 text-white/70 hover:text-white hover:bg-white/10 border border-white/10 rounded transition text-[11px] font-medium"
              >
                <i className="pi pi-bell mr-1 text-[10px] text-[#41cc84]" />
                Toasts
              </NavLink>
              <NavLink
                to="/table"
                className="px-2.5 py-1 text-white/70 hover:text-white hover:bg-white/10 border border-white/10 rounded transition text-[11px] font-medium"
              >
                <i className="pi pi-table mr-1 text-[10px] text-[#41cc84]" />
                Staff Table
              </NavLink>
            </div>

            {/* Notifications Icon */}
            <button
              type="button"
              onClick={() => toast.success('All operational nodes healthy. No critical concerns.')}
              className="relative p-2 text-white/70 hover:text-white hover:bg-white/10 rounded transition cursor-pointer"
              title="Notifications"
            >
              <i className="pi pi-bell text-sm" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#41cc84] rounded-full shadow-[0_0_6px_#41cc84]" />
            </button>
          </div>
        </header>

        {/* Active Child Page Outlet */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default PortalLayout;
