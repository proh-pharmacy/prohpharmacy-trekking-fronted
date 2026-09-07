import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { PortalSidebar, PortalHeader } from './partials';

export const PortalLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-portal-canvas text-portal-text font-sans antialiased selection:bg-portal-accent selection:text-white">
      {/* Modular Collapsible Sidebar */}
      <PortalSidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />

      {/* Main Content Area - Fixed Header, Scrollable Main Viewport */}
      <div className="flex-1 h-full flex flex-col min-w-0 overflow-hidden">
        <PortalHeader />

        <main className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default PortalLayout;
