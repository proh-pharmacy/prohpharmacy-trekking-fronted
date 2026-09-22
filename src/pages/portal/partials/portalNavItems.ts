import {
  ChartBar,
  Compass,
  CreditCard,
  MapPin,
  MapTrifold,
  Package,
  Percent,
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
  /** Any one of these permissions grants visibility to the navigation item. */
  permissions?: string[];
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
      { label: 'Live Tracking', to: '/portal/tracking', icon: MapTrifold, permissions: ['Tracking.ViewAll', 'Tracking.ViewBranch', 'Tracking.View'] },
      { label: 'Customer Pins', to: '/portal/customer-pins', icon: MapPin, permissions: ['Customers.View', 'Customers.Register', 'CustomerKyc.View'] },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Trekking', to: '/portal/trekking', icon: MapTrifold, permissions: ['Treks.ViewAll', 'Treks.View'] },
      { label: 'Customer Directory', to: '/portal/customers', icon: UsersThree, permissions: ['Customers.View', 'Customers.Register', 'CustomerKyc.View'] },
      { label: 'Traccar', to: '/portal/traccar', icon: Compass, permissions: ['TrackingDevices.View', 'TrackingDevices.Manage', 'Tracking.ViewAll'] },
    ],
  },
  {
    title: 'Logistics',
    items: [
      { label: 'Products & Packaging', to: '/portal/products', icon: Package, permissions: ['Products.View', 'Products.Manage', 'Units.View'] },
      { label: 'Product Pricing Rules', to: '/portal/product-pricing-rules', icon: Percent, permissions: ['Products.View', 'Products.Manage', 'Units.View'] },
      { label: 'Vehicle Fleet', to: '/portal/fleet', icon: Truck, permissions: ['Vehicles.View', 'Vehicles.Manage'] },
    ],
  },
  {
    title: 'Reports',
    items: [
      { label: 'Ledger Summary', to: '/portal/reports/ledger-summary', icon: Receipt, permissions: ['Reports.View', 'Reports.ViewLedger', 'Reports.Export'] },
      { label: 'Trek Performance', to: '/portal/reports/treks', icon: ChartBar, permissions: ['Reports.View', 'Reports.ViewTreks', 'Reports.Export'] },
      { label: 'Collections', to: '/portal/reports/collections', icon: CreditCard, permissions: ['Reports.View', 'Reports.ViewCollections', 'Reports.Export'] },
      { label: 'Product Delivery', to: '/portal/reports/products', icon: Package, permissions: ['Reports.View', 'Reports.ViewProducts', 'Reports.Export'] },
    ],
  },
  {
    title: 'Settings',
    items: [
      { label: 'People and Roles', to: '/portal/settings/users', icon: UsersThree, permissions: ['Users.View', 'Staff.View', 'Roles.Manage'] },
      { label: 'Organisation', to: '/portal/settings/organisation', icon: TreeStructure, permissions: ['Branches.View', 'Branches.Manage', 'Regions.View', 'Districts.View'] },
    ],
  },
];
