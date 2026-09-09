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
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Customer Directory', to: '/portal/customers', icon: 'pi pi-users' },
      { label: 'Trekking', to: '/portal/trekking', icon: 'pi pi-compass' },
    ],
  },
  {
    title: 'Logistics',
    items: [
      { label: 'Products & Packaging', to: '/portal/products', icon: 'pi pi-box' },
      { label: 'Vehicle Fleet', to: '/portal/fleet', icon: 'pi pi-car' },
    ],
  },
  {
    title: 'Settings',
    items: [
      { label: 'People and Roles', to: '/portal/settings/users', icon: 'pi pi-users' },
      { label: 'Organisation', to: '/portal/settings/organisation', icon: 'pi pi-sitemap' },
    ],
  },
];
