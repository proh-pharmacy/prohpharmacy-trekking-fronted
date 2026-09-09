import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PrimeReactProvider } from 'primereact/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { AuthProvider } from './context/AuthContext';
import { AuthGuard } from './components/auth/AuthGuard';
import { GuestGuard } from './components/auth/GuestGuard';
import { LoginPage } from './pages/auth/LoginPage';
import { PortalLayout } from './pages/portal/layout';
import { DashboardPage } from './pages/portal/dashboard/DashboardPage';
import { GenericModulePage } from './pages/portal/GenericModulePage';
import { ProductsPage } from './pages/portal/products';
import { CustomersPage } from './pages/portal/customers/CustomersPage';
import { CustomerPinsPage } from './pages/portal/customers/CustomerPinsPage';
import { FleetPage } from './pages/portal/fleet';
import { TrekkingPage } from './pages/portal/trekking';
import { TrackingPage } from './pages/portal/tracking';
import { UsersAndRolesPage, UserDetailsPage, OrganisationPage } from './pages/portal/settings';
import { FlatButtonsShowcase } from './pages/preview/FlatButtonsShowcase';
import { DataTableShowcase } from './pages/preview/DataTableShowcase';
import { FlatInputsShowcase } from './pages/preview/FlatInputsShowcase';
import { ToastShowcase } from './pages/preview/ToastShowcase';
import { OverlayShowcase } from './pages/preview/OverlayShowcase';
import { ProHToaster } from './components/toast';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PrimeReactProvider>
        <ProHToaster />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Guest-only routes */}
              <Route
                path="/login"
                element={
                  <GuestGuard>
                    <LoginPage />
                  </GuestGuard>
                }
              />

              {/* Authenticated Portal Routes with Mother Layout */}
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
                <Route path="trekking" element={<TrekkingPage />} />
                <Route path="tracking" element={<TrackingPage />} />
                <Route path="customer-pins" element={<CustomerPinsPage />} />
                <Route path="customers" element={<CustomersPage />} />
                <Route path="products" element={<ProductsPage />} />

                <Route path="fleet" element={<FleetPage />} />
                <Route
                  path="ledger"
                  element={
                    <GenericModulePage
                      title="Financial Ledger & Collections"
                      description="Cash and digital delivery settlements, invoice payments, and audit logs."
                      icon="pi pi-wallet"
                    />
                  }
                />
                <Route
                  path="reports"
                  element={
                    <GenericModulePage
                      title="Operational Reports & Audits"
                      description="Performance analytics, incident reports, and system change logs."
                      icon="pi pi-chart-line"
                    />
                  }
                />
                <Route path="settings" element={<Navigate to="/portal/settings/users" replace />} />
                <Route path="settings/users" element={<UsersAndRolesPage />} />
                <Route path="settings/users/:userId" element={<UserDetailsPage />} />
                <Route path="settings/organisation" element={<OrganisationPage />} />
              </Route>


              {/* Authenticated Standalone Routes */}
              <Route
                path="/table"
                element={
                  <AuthGuard>
                    <DataTableShowcase />
                  </AuthGuard>
                }
              />

              {/* Development Component Showcase Previews */}
              <Route path="/buttons" element={<FlatButtonsShowcase />} />
              <Route path="/inputs" element={<FlatInputsShowcase />} />
              <Route path="/toasts" element={<ToastShowcase />} />
              <Route path="/toast" element={<Navigate to="/toasts" replace />} />
              <Route path="/overlays" element={<OverlayShowcase />} />
              <Route path="/modals" element={<Navigate to="/overlays" replace />} />

              {/* Fallback redirects */}
              <Route path="/" element={<Navigate to="/portal/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/portal/dashboard" replace />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </PrimeReactProvider>
    </QueryClientProvider>
  );
}

