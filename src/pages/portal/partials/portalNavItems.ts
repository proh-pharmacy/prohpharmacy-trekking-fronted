import type { Permission } from '../../../lib/permissions/catalogue';
import {
  ChartBar,
  Compass,
  CreditCard,
  DownloadSimple,
  FileText,
  ArrowCounterClockwise,
  MapPin,
  MapTrifold,
  Package,
  Percent,
  Receipt,
  SquaresFour,
  TreeStructure,
  Truck,
  Warehouse,
  UsersThree,
  type Icon,
} from '@phosphor-icons/react';

export interface NavItem {
  label: string;
  to: string;
  icon: Icon;
  badge?: string | number;
  /** Any one of these permissions grants visibility to the navigation item. */
  permissions?: Permission[];
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
      { label: 'Live Tracking', to: '/portal/tracking', icon: MapTrifold, permissions: ['Tracking.ViewAll', 'Tracking.ViewAssigned', 'Tracking.ViewLive'] },
      { label: 'Customer Pins', to: '/portal/customer-pins', icon: MapPin, permissions: ['Customers.MapView'] },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Trekking', to: '/portal/trekking', icon: MapTrifold, permissions: ['Treks.ViewAll', 'Treks.ViewAssigned'] },
      { label: 'Customer Directory', to: '/portal/customers', icon: UsersThree, permissions: ['Customers.View'] },
      { label: 'Traccar', to: '/portal/traccar', icon: Compass, permissions: ['TrackingDevices.View', 'FleetDrivers.View', 'TraccarUsers.View'] },
    ],
  },
  {
    title: 'Logistics',
    items: [
      { label: 'Products & Packaging', to: '/portal/products', icon: Package, permissions: ['Products.View', 'Units.View'] },
      { label: 'Product Pricing Rules', to: '/portal/product-pricing-rules', icon: Percent, permissions: ['RegionalPricing.View', 'CustomerPricing.View'] },
      { label: 'Vehicle Fleet', to: '/portal/fleet', icon: Truck, permissions: ['Vehicles.View'] },
      { label: 'Vehicle Stock', to: '/portal/fleet/stock', icon: Warehouse, permissions: ['VehicleStock.View'] },
    ],
  },
  {
    title: 'Finance',
    items: [
      { label: 'Invoices', to: '/portal/invoices', icon: FileText, permissions: ['Invoices.View'] },
      { label: 'Refund Approvals', to: '/portal/finance/refund-approvals', icon: ArrowCounterClockwise, permissions: ['TrekReturns.View'] },
      { label: 'Customer Balances', to: '/portal/finance/customer-balances', icon: Receipt, permissions: ['Reports.View', 'Reports.ViewLedger'] },
      { label: 'Collections', to: '/portal/reports/collections', icon: CreditCard, permissions: ['Reports.View', 'Reports.ViewCollections'] },
    ],
  },
  {
    title: 'Reports',
    items: [
      { label: 'Trek Performance', to: '/portal/reports/treks', icon: ChartBar, permissions: ['Reports.View', 'Reports.ViewTreks'] },
      { label: 'Product Delivery', to: '/portal/reports/products', icon: Package, permissions: ['Reports.View', 'Reports.ViewProducts'] },
      { label: 'Export Data', to: '/portal/reports/export-data', icon: DownloadSimple, permissions: ['Reports.Export', 'Customers.Export', 'Products.Export', 'RegionalPricing.Export', 'CustomerPricing.Export'] },
    ],
  },
  {
    title: 'Settings',
    items: [
      { label: 'People and Roles', to: '/portal/settings/users', icon: UsersThree, permissions: ['Users.View', 'Staff.View', 'Roles.View'] },
      { label: 'Organisation', to: '/portal/settings/organisation', icon: TreeStructure, permissions: ['Branches.View', 'Regions.View', 'Districts.View'] },
    ],
  },
];
