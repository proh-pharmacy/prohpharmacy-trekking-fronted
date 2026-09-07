export interface NavItem {
  label: string;
  to: string;
  icon: string;
  badge?: string | number;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const PORTAL_NAV_SECTIONS: NavSection[] = [
  {
    title: 'Dashboards',
    items: [
      { label: 'Overview', to: '/portal/dashboard', icon: 'pi pi-th-large' },
      { label: 'Live Tracking', to: '/portal/tracking', icon: 'pi pi-map' },
      { label: 'Trekking Missions', to: '/portal/trekking', icon: 'pi pi-compass', badge: 14 },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Staff Directory', to: '/portal/staff', icon: 'pi pi-users' },
      { label: 'Duty Roster', to: '/portal/roster', icon: 'pi pi-calendar' },
      { label: 'Attendance Logs', to: '/portal/attendance', icon: 'pi pi-check-square' },
    ],
  },
  {
    title: 'Logistics',
    items: [
      { label: 'Products & Stock', to: '/portal/products', icon: 'pi pi-box' },
      { label: 'Health Clinics', to: '/portal/customers', icon: 'pi pi-building' },
      { label: 'Vehicle Fleet', to: '/portal/fleet', icon: 'pi pi-car' },
    ],
  },
  {
    title: 'Settings',
    items: [
      { label: 'Access Control', to: '/portal/settings', icon: 'pi pi-shield' },
      { label: 'Reports & Audits', to: '/portal/reports', icon: 'pi pi-chart-line' },
      { label: 'Ledger & Payments', to: '/portal/ledger', icon: 'pi pi-wallet' },
    ],
  },
];
