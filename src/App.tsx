import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PrimeReactProvider } from 'primereact/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { AuthProvider } from './context/AuthContext';
import { AuthGuard } from './components/auth/AuthGuard';
import { GuestGuard } from './components/auth/GuestGuard';
import { ProHToaster } from './components/toast';
import { PWAInstallPrompt } from './components/pwa/PWAInstallPrompt';
import { PWAUpdatePrompt } from './components/pwa/PWAUpdatePrompt';

// ── chunk-auth ─────────────────────────────────────────────────────────
const LoginPage = lazy(() =>
  import('./pages/auth/LoginPage').then((m) => ({ default: m.LoginPage }))
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
const UsersAndRolesPage = lazy(() =>
  import('./pages/portal/settings').then((m) => ({ default: m.UsersAndRolesPage }))
);
const UserDetailsPage = lazy(() =>
  import('./pages/portal/settings').then((m) => ({ default: m.UserDetailsPage }))
);
const OrganisationPage = lazy(() =>
  import('./pages/portal/settings').then((m) => ({ default: m.OrganisationPage }))
);
const LedgerSummaryPage = lazy(() =>
  import('./pages/portal/reports/LedgerSummaryPage').then((m) => ({ default: m.LedgerSummaryPage }))
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

// ── chunk-driver ───────────────────────────────────────────────────────
const DriverPage = lazy(() =>
  import('./pages/driver/DriverPage').then((m) => ({ default: m.DriverPage }))
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
      <PrimeReactProvider>
        <ProHToaster />
        <PWAInstallPrompt />
        <PWAUpdatePrompt />
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={<LazyFallback />}>
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
                  <Route path="traccar" element={<TraccarPage />} />
                  <Route path="trekking" element={<TrekkingPage />} />
                  <Route path="trekking/:trekId" element={<TrekDetailPage />} />
                  <Route path="tracking" element={<TrackingPage />} />
                  <Route path="customer-pins" element={<CustomerPinsPage />} />
                  <Route path="customers" element={<CustomersPage />} />
                  <Route path="customers/:customerId" element={<CustomerDetailPage />} />
                  <Route path="products" element={<ProductsPage />} />
                  <Route path="fleet" element={<FleetPage />} />
                  <Route path="reports/ledger-summary" element={<LedgerSummaryPage />} />
                  <Route path="reports/treks" element={<TrekReportPage />} />
                  <Route path="reports/collections" element={<CollectionsReportPage />} />
                  <Route path="reports/products" element={<ProductsReportPage />} />
                  <Route path="settings" element={<Navigate to="/portal/settings/users" replace />} />
                  <Route path="settings/users" element={<UsersAndRolesPage />} />
                  <Route path="settings/users/:userId" element={<UserDetailsPage />} />
                  <Route path="settings/organisation" element={<OrganisationPage />} />
                </Route>

                {/* ── Driver (standalone, no auth) ── */}
                <Route path="/driver/:token" element={<DriverPage />} />
                <Route path="/treks/driver" element={<DriverPage />} />

                {/* ── Dev showcases ── */}
                <Route
                  path="/table"
                  element={
                    <AuthGuard>
                      <DataTableShowcase />
                    </AuthGuard>
                  }
                />
                <Route path="/buttons" element={<FlatButtonsShowcase />} />
                <Route path="/inputs" element={<FlatInputsShowcase />} />
                <Route path="/toasts" element={<ToastShowcase />} />
                <Route path="/toast" element={<Navigate to="/toasts" replace />} />
                <Route path="/overlays" element={<OverlayShowcase />} />
                <Route path="/modals" element={<Navigate to="/overlays" replace />} />

                {/* ── Fallback ── */}
                <Route path="/" element={<Navigate to="/portal/dashboard" replace />} />
                <Route path="*" element={<Navigate to="/portal/dashboard" replace />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </PrimeReactProvider>
    </QueryClientProvider>
  );
}
