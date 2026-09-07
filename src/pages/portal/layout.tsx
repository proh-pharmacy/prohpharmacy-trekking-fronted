import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context';

export const PortalLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-slate-100 text-slate-900 font-sans antialiased">
      {/* Sidebar shell */}
      <aside className="w-64 bg-[#102218] text-white flex flex-col shrink-0 border-r border-slate-800">
        {/* Brand Header */}
        <div className="h-16 px-6 flex items-center gap-3 border-b border-white/10">
          <img
            src="/images/prohpharmacy_icon_white.png"
            alt="ProH Pharmacy Logo"
            className="w-8 h-8 object-contain"
          />
          <div>
            <div className="font-bold text-sm tracking-wide">ProH Pharmacy</div>
            <div className="text-[10px] text-[#4fb587] font-medium">Trekking Operations</div>
          </div>
        </div>

        {/* Navigation links shell */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          <Link
            to="/portal/dashboard"
            className={`flex items-center gap-3 px-3 py-2 text-xs font-semibold uppercase tracking-wider rounded transition-colors ${
              location.pathname === '/portal/dashboard' || location.pathname === '/portal'
                ? 'bg-primary-green text-white'
                : 'text-white/70 hover:bg-white/5 hover:text-white'
            }`}
          >
            <i className="pi pi-th-large text-sm" />
            <span>Dashboard</span>
          </Link>

          <Link
            to="/table"
            className={`flex items-center gap-3 px-3 py-2 text-xs font-semibold uppercase tracking-wider rounded transition-colors ${
              location.pathname === '/table'
                ? 'bg-primary-green text-white'
                : 'text-white/70 hover:bg-white/5 hover:text-white'
            }`}
          >
            <i className="pi pi-table text-sm" />
            <span>Staff Roster</span>
          </Link>
        </nav>

        {/* User Footer & Logout */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold truncate text-white">
              {user?.fullName || user?.email || 'User'}
            </div>
            <div className="text-[10px] text-[#4fb587] truncate uppercase font-semibold">
              {user?.roles?.join(', ') || 'Staff'}
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="Sign Out"
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer"
          >
            <i className="pi pi-sign-out text-sm" />
          </button>
        </div>
      </aside>

      {/* Main Content Area with Outlet */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-300 px-6 flex items-center justify-between shrink-0 shadow-xs">
          <div className="text-xs text-slate-500 font-mono">
            Portal / {location.pathname.replace('/portal/', '').toUpperCase() || 'DASHBOARD'}
          </div>
        </header>

        {/* Outlet rendering the active child page */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default PortalLayout;
