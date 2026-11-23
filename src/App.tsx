import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { PrimeReactProvider } from 'primereact/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthGuard } from './components/auth/AuthGuard';
import { PermissionGuard } from './components/auth/PermissionGuard';
import { GuestGuard } from './components/auth/GuestGuard';
import { ProHToaster } from './components/toast';
import { PWAInstallPrompt } from './components/pwa/PWAInstallPrompt';
import { PWAUpdatePrompt } from './components/pwa/PWAUpdatePrompt';
import { useIsPWA } from './hooks/usePWA';
import { useAuth } from './context';

function PwaSessionRedirect() {
  const isPWA = useIsPWA();
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isPWA || isAuthenticated || !['/', '/portal', '/portal/dashboard'].includes(location.pathname)) return;
    try {
      const session = JSON.parse(localStorage.getItem('portalSession') || 'null') as { driverToken?: string } | null;
      if (session?.driverToken) {
        navigate(`/treks/driver/treks?token=${encodeURIComponent(session.driverToken)}`, { replace: true });
      }
    } catch {
      localStorage.removeItem('portalSession');
    }
  }, [isPWA, isAuthenticated, location.pathname, navigate]);

  return null;
}

// ── chunk-auth ─────────────────────────────────────────────────────────
const LoginPage = lazy(() =>
  import('./pages/auth/LoginPage').then((m) => ({ default: m.LoginPage }))
);
const ResetPasswordPage = lazy(() =>
  import('./pages/auth/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage }))
);

// ── chunk-portal (all sidebar pages bundled together) ──────────────────
const PortalLayout = lazy(() =>
  import('./pages/portal/layout').then((m) => ({ default: m.PortalLayout }))
);
const DashboardPage = lazy(() =>
  import('./pages/portal/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage }))
);
const CustomersPage = lazy(() =>
  import('./pages/portal/customers/CustomersPage').then((m) => ({ default: m.CustomersPage }))
);
const CustomerDetailPage = lazy(() =>
  import('./pages/portal/customers/CustomerDetailPage').then((m) => ({ default: m.CustomerDetailPage }))
);
const CustomerPinsPage = lazy(() =>
  import('./pages/portal/customers/CustomerPinsPage').then((m) => ({ default: m.CustomerPinsPage }))
);
const ProductsPage = lazy(() =>
  import('./pages/portal/products').then((m) => ({ default: m.ProductsPage }))
);
const ProductPricingRulesPage = lazy(() =>
  import('./pages/portal/pricing-rules').then((m) => ({ default: m.ProductPricingRulesPage }))
);
const CreateTrekPage = lazy(() => import('./pages/portal/trekking/CreateTrekPage'));
const TrekkingPage = lazy(() =>
  import('./pages/portal/trekking').then((m) => ({ default: m.TrekkingPage }))
);
const TrekDetailPage = lazy(() =>
  import('./pages/portal/trekking').then((m) => ({ default: m.TrekDetailPage }))
);
const TrackingPage = lazy(() =>
  import('./pages/portal/tracking').then((m) => ({ default: m.TrackingPage }))
);
const TraccarPage = lazy(() =>
  import('./pages/portal/traccar').then((m) => ({ default: m.TraccarPage }))
);
const FleetPage = lazy(() =>
  import('./pages/portal/fleet').then((m) => ({ default: m.FleetPage }))
);
const VehicleStockOverviewPage = lazy(() =>
  import('./pages/portal/fleet').then((m) => ({ default: m.VehicleStockOverviewPage }))
);
const VehicleStockPage = lazy(() =>
  import('./pages/portal/fleet').then((m) => ({ default: m.VehicleStockPage }))
);
const UsersAndRolesPage = lazy(() =>
  import('./pages/portal/settings').then((m) => ({ default: m.UsersAndRolesPage }))
);
const UserDetailsPage = lazy(() =>
  import('./pages/portal/settings').then((m) => ({ default: m.UserDetailsPage }))
);
const OrganisationPage = lazy(() =>
  import('./pages/portal/settings').then((m) => ({ default: m.OrganisationPage }))
);
const CustomerBalancesPage = lazy(() =>
  import('./pages/portal/finance/CustomerBalancesPage').then((m) => ({ default: m.CustomerBalancesPage }))
);
const RefundApprovalsPage = lazy(() =>
  import('./pages/portal/finance/RefundApprovalsPage').then((m) => ({ default: m.RefundApprovalsPage }))
);
const TrekReportPage = lazy(() =>
  import('./pages/portal/reports/TrekReportPage').then((m) => ({ default: m.TrekReportPage }))
);
const CollectionsReportPage = lazy(() =>
  import('./pages/portal/reports/CollectionsReportPage').then((m) => ({ default: m.CollectionsReportPage }))
);
const ProductsReportPage = lazy(() =>
  import('./pages/portal/reports/ProductsReportPage').then((m) => ({ default: m.ProductsReportPage }))
);
const DataExportPage = lazy(() =>
  import('./pages/portal/reports/DataExportPage').then((m) => ({ default: m.DataExportPage }))
);
const InvoicesPage = lazy(() =>
  import('./pages/portal/invoices').then((m) => ({ default: m.InvoicesPage }))
);
const InvoiceDetailPage = lazy(() =>
  import('./pages/portal/invoices').then((m) => ({ default: m.InvoiceDetailPage }))
);
const InvoicePrintPage = lazy(() =>
  import('./pages/portal/invoices').then((m) => ({ default: m.InvoicePrintPage }))
);

// ── chunk-driver ───────────────────────────────────────────────────────
const DriverPage = lazy(() =>
  import('./pages/driver/DriverPage').then((m) => ({ default: m.DriverPage }))
);
const InvoicePreviewPage = lazy(() =>
  import('./pages/driver/InvoicePreviewPage').then((m) => ({ default: m.InvoicePreviewPage }))
);
const ReceiptPreviewPage = lazy(() =>
  import('./pages/driver/ReceiptPreviewPage').then((m) => ({ default: m.ReceiptPreviewPage }))
);

// ── chunk-preview (dev showcases) ─────────────────────────────────────
const DataTableShowcase = lazy(() =>
  import('./pages/preview/DataTableShowcase').then((m) => ({ default: m.DataTableShowcase }))
);
const FlatButtonsShowcase = lazy(() =>
  import('./pages/preview/FlatButtonsShowcase').then((m) => ({ default: m.FlatButtonsShowcase }))
);
const FlatInputsShowcase = lazy(() =>
  import('./pages/preview/FlatInputsShowcase').then((m) => ({ default: m.FlatInputsShowcase }))
);
const ToastShowcase = lazy(() =>
  import('./pages/preview/ToastShowcase').then((m) => ({ default: m.ToastShowcase }))
);
const OverlayShowcase = lazy(() =>
  import('./pages/preview/OverlayShowcase').then((m) => ({ default: m.OverlayShowcase }))
);

// ── Suspense fallback ──────────────────────────────────────────────────
const LazyFallback = () => (
  <div className="min-h-screen w-full flex items-center justify-center bg-portal-canvas">
    <img
      src="/images/prohpharmacy_icon_white.png"
      alt=""
      className="w-12 h-12 object-contain animate-pulse"
    />
  </div>
);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <PrimeReactProvider>
          <ProHToaster />
        <PWAInstallPrompt />
        <PWAUpdatePrompt />
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={<LazyFallback />}>
              <PwaSessionRedirect />
              <Routes>
                {/* ── Auth ── */}
                <Route
                  path="/login"
                  element={
                    <GuestGuard>
                      <LoginPage />
                    </GuestGuard>
                  }
                />
                <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
                <Route path="/invoice/print/:invoiceNumber" element={<AuthGuard><PermissionGuard permissions={['Invoices.ViewDetails']}><InvoicePrintPage /></PermissionGuard></AuthGuard>} />

                {/* ── Portal (all sidebar pages) ── */}
                <Route
                  path="/portal"
                  element={
                    <AuthGuard>
                      <PortalLayout />
                    </AuthGuard>
                  }
                >
                  <Route index element={<Navigate to="/portal/dashboard" replace />} />
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="traccar" element={<PermissionGuard permissions={['TrackingDevices.View', 'FleetDrivers.View', 'TraccarUsers.View']}><TraccarPage /></PermissionGuard>} />
                  <Route path="trekking" element={<PermissionGuard permissions={['Treks.ViewAll', 'Treks.ViewAssigned']}><TrekkingPage /></PermissionGuard>} />
                  <Route path="trekking/new" element={<PermissionGuard permissions={['Treks.Create']}><CreateTrekPage /></PermissionGuard>} />
                  <Route path="trekking/:trekId" element={<PermissionGuard permissions={['Treks.ViewDetails']}><TrekDetailPage /></PermissionGuard>} />
                  <Route path="tracking" element={<PermissionGuard permissions={['Tracking.ViewAll', 'Tracking.ViewAssigned', 'Tracking.ViewLive']}><TrackingPage /></PermissionGuard>} />
                  <Route path="customer-pins" element={<PermissionGuard permissions={['Customers.MapView']}><CustomerPinsPage /></PermissionGuard>} />
                  <Route path="customers" element={<PermissionGuard permissions={['Customers.View']}><CustomersPage /></PermissionGuard>} />
                  <Route path="customers/:customerId" element={<PermissionGuard permissions={['Customers.ViewDetails']}><CustomerDetailPage /></PermissionGuard>} />
                  <Route path="products" element={<PermissionGuard permissions={['Products.View', 'Units.View']}><ProductsPage /></PermissionGuard>} />
                  <Route path="product-pricing-rules" element={<PermissionGuard permissions={['RegionalPricing.View', 'CustomerPricing.View']}><ProductPricingRulesPage /></PermissionGuard>} />
                  <Route path="product" element={<Navigate to="/portal/products" replace />} />
                  <Route path="fleet" element={<PermissionGuard permissions={['Vehicles.View']}><FleetPage /></PermissionGuard>} />
                  <Route path="fleet/stock" element={<PermissionGuard permissions={['VehicleStock.View']}><VehicleStockOverviewPage /></PermissionGuard>} />
                  <Route path="fleet/vehicles/:vehicleId/stock" element={<PermissionGuard permissions={['VehicleStock.View', 'VehicleStock.ViewLedger']}><VehicleStockPage /></PermissionGuard>} />
                  <Route path="invoices" element={<PermissionGuard permissions={['Invoices.View']}><InvoicesPage /></PermissionGuard>} />
                  <Route path="invoices/:invoiceNumber" element={<PermissionGuard permissions={['Invoices.ViewDetails']}><InvoiceDetailPage /></PermissionGuard>} />
                  <Route path="finance/refund-approvals" element={<PermissionGuard permissions={['TrekReturns.View']}><RefundApprovalsPage /></PermissionGuard>} />
                  <Route path="finance/customer-balances" element={<PermissionGuard permissions={['Reports.View', 'Reports.ViewLedger']}><CustomerBalancesPage /></PermissionGuard>} />
                  <Route path="reports/ledger-summary" element={<Navigate to="/portal/finance/customer-balances" replace />} />
                  <Route path="reports/treks" element={<PermissionGuard permissions={['Reports.View', 'Reports.ViewTreks']}><TrekReportPage /></PermissionGuard>} />
                  <Route path="reports/collections" element={<PermissionGuard permissions={['Reports.View', 'Reports.ViewCollections']}><CollectionsReportPage /></PermissionGuard>} />
                  <Route path="reports/products" element={<PermissionGuard permissions={['Reports.View', 'Reports.ViewProducts']}><ProductsReportPage /></PermissionGuard>} />
                  <Route path="reports/export-data" element={<PermissionGuard permissions={['Reports.Export', 'Customers.Export', 'Products.Export', 'RegionalPricing.Export', 'CustomerPricing.Export']}><DataExportPage /></PermissionGuard>} />
                  <Route path="settings" element={<Navigate to="/portal/settings/users" replace />} />
                  <Route path="settings/users" element={<PermissionGuard permissions={['Users.View', 'Staff.View', 'Roles.View']}><UsersAndRolesPage /></PermissionGuard>} />
                  <Route path="settings/users/:userId" element={<PermissionGuard permissions={['Users.ViewDetails']}><UserDetailsPage /></PermissionGuard>} />
                  <Route path="settings/organisation" element={<PermissionGuard permissions={['Branches.View', 'Regions.View', 'Districts.View']}><OrganisationPage /></PermissionGuard>} />
                </Route>

                {/* ── Driver (standalone, no auth) ── */}
                <Route path="/driver/:token" element={<DriverPage />} />
                <Route path="/treks/driver" element={<DriverPage />} />
                <Route path="/treks/driver/:section" element={<DriverPage />} />
                <Route path="/invoice/preview" element={<InvoicePreviewPage />} />
                <Route path="/receipt/preview" element={<ReceiptPreviewPage />} />

                {/* ── Dev showcases ── */}
                <Route path="/table" element={<DataTableShowcase />} />
                <Route path="/portal-preview" element={<PortalLayout />}>
                  <Route index element={<DataTableShowcase />} />
                </Route>
                <Route path="/buttons" element={<FlatButtonsShowcase />} />
                <Route path="/inputs" element={<FlatInputsShowcase />} />
                <Route path="/toasts" element={<ToastShowcase />} />
                <Route path="/toast" element={<Navigate to="/toasts" replace />} />
                <Route path="/overlays" element={<OverlayShowcase />} />
                <Route path="/modals" element={<Navigate to="/overlays" replace />} />
                <Route path="/tracking" element={<Navigate to="/portal/tracking" replace />} />

                {/* ── Fallback ── */}
                <Route path="/" element={<Navigate to="/portal/dashboard" replace />} />
                <Route path="*" element={<Navigate to="/portal/dashboard" replace />} />
              </Routes>
            </Suspense>
          </AuthProvider>
          </BrowserRouter>
        </PrimeReactProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
