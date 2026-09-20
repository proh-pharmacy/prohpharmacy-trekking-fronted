import {
  ChartBar,
  Compass,
  CreditCard,
  MapPin,
  MapTrifold,
  Package,
  Receipt,
  SquaresFour,
  TreeStructure,
  Truck,
  UsersThree,
  type Icon,
} from '@phosphor-icons/react';

export interface NavItem {
  label: string;
  to: string;
  icon: Icon;
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
      { label: 'Overview', to: '/portal/dashboard', icon: SquaresFour },
      { label: 'Live Tracking', to: '/portal/tracking', icon: MapTrifold },
      { label: 'Customer Pins', to: '/portal/customer-pins', icon: MapPin },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Trekking', to: '/portal/trekking', icon: MapTrifold },
      { label: 'Customer Directory', to: '/portal/customers', icon: UsersThree },
      { label: 'Traccar', to: '/portal/traccar', icon: Compass },
    ],
  },
  {
    title: 'Logistics',
    items: [
      { label: 'Products & Packaging', to: '/portal/products', icon: Package },
      { label: 'Vehicle Fleet', to: '/portal/fleet', icon: Truck },
    ],
  },
  {
    title: 'Reports',
    items: [
      { label: 'Ledger Summary', to: '/portal/reports/ledger-summary', icon: Receipt },
      { label: 'Trek Performance', to: '/portal/reports/treks', icon: ChartBar },
      { label: 'Collections', to: '/portal/reports/collections', icon: CreditCard },
      { label: 'Product Delivery', to: '/portal/reports/products', icon: Package },
    ],
  },
  {
    title: 'Settings',
    items: [
      { label: 'People and Roles', to: '/portal/settings/users', icon: UsersThree },
      { label: 'Organisation', to: '/portal/settings/organisation', icon: TreeStructure },
    ],
  },
];
