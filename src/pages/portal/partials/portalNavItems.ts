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
      { label: 'Customer Pins', to: '/portal/customer-pins', icon: 'pi pi-map-marker' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Trekking', to: '/portal/trekking', icon: 'pi pi-map-marker' },
      { label: 'Customer Directory', to: '/portal/customers', icon: 'pi pi-users' },
      { label: 'Traccar', to: '/portal/traccar', icon: 'pi pi-compass' },
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
