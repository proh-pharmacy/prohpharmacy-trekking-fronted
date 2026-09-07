import React from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';

export const PortalHeader: React.FC = () => {
  const location = useLocation();

  const currentSection = location.pathname.replace('/portal/', '') || 'Overview';

  return (
    <header className="h-14 bg-[#22272e] border-b border-[#444c56]/60 px-6 flex items-center justify-between shrink-0 z-20">
      {/* Breadcrumb with Subtle Icons */}
      <div className="flex items-center gap-2.5 text-xs">
        <i className="pi pi-th-large text-[#768390] text-xs" />
        <i className="pi pi-star text-[#768390] text-xs" />
        <span className="text-[#768390] font-medium">Dashboards</span>
        <span className="text-[#444c56]">/</span>
        <span className="text-white font-semibold capitalize">
          {currentSection}
        </span>
      </div>

      {/* Top Right Quick Actions: Dark Mode, Refresh, Notifications, Status */}
      <div className="flex items-center gap-2.5">
        {/* Dark Mode Icon */}
        <button
          type="button"
          className="p-1.5 text-[#768390] hover:text-white rounded transition cursor-pointer"
          title="Dark Mode Active"
        >
          <i className="pi pi-moon text-xs" />
        </button>

        {/* Refresh Icon */}
        <button
          type="button"
          onClick={() => toast.success('Feed synced with Ashaiman Hub')}
          className="p-1.5 text-[#768390] hover:text-white rounded transition cursor-pointer"
          title="Refresh Sync"
        >
          <i className="pi pi-sync text-xs" />
        </button>

        {/* Notifications Icon with Green #41cc84 Unread Dot */}
        <button
          type="button"
          onClick={() => toast.success('3 field teams currently reporting telemetry.')}
          className="relative p-1.5 text-[#768390] hover:text-white rounded transition cursor-pointer"
          title="Notifications"
        >
          <i className="pi pi-bell text-xs" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-[#41cc84] rounded-full shadow-[0_0_6px_#41cc84]" />
        </button>

        {/* Hub Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-[#2d333b] border border-[#444c56] text-[11px] font-medium text-[#cdd9e5] rounded">
          <span className="w-1.5 h-1.5 bg-[#41cc84] rounded-full animate-pulse" />
          <span>Ashaiman Regional Hub</span>
        </div>
      </div>
    </header>
  );
};

export default PortalHeader;
