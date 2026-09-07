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
                <Route
                  path="trekking"
                  element={
                    <GenericModulePage
                      title="Trekking Missions & Dispatches"
                      description="Active medication transit routes, emergency dispatches, and cold-chain deliveries."
                      icon="pi pi-compass"
                    />
                  }
                />
                <Route
                  path="tracking"
                  element={
                    <GenericModulePage
                      title="Live Fleet Telemetry"
                      description="Real-time GPS tracking and transit checkpoint verification."
                      icon="pi pi-map"
                    />
                  }
                />
                <Route
                  path="staff"
                  element={
                    <GenericModulePage
                      title="Staff Directory"
                      description="Personnel records, roles, branch assignments, and invitations."
                      icon="pi pi-users"
                    />
                  }
                />
                <Route
                  path="roster"
                  element={
                    <GenericModulePage
                      title="Duty Roster & Shifts"
                      description="Shift rotation scheduling, slot allocation, and staffing constraints."
                      icon="pi pi-calendar"
                    />
                  }
                />
                <Route
                  path="attendance"
                  element={
                    <GenericModulePage
                      title="Attendance & Face Verification"
                      description="Mobile check-in logs, biometric face enrollment, and trusted device challenges."
                      icon="pi pi-check-square"
                    />
                  }
                />
                <Route
                  path="products"
                  element={
                    <GenericModulePage
                      title="Medication Stock & Products"
                      description="Pharmaceutical inventory, cold-chain temperature thresholds, and batch tracking."
                      icon="pi pi-box"
                    />
                  }
                />
                <Route
                  path="customers"
                  element={
                    <GenericModulePage
                      title="Health Clinics & Destinations"
                      description="Destination pharmacies, rural health clinics, and partner post directories."
                      icon="pi pi-building"
                    />
                  }
                />
                <Route
                  path="fleet"
                  element={
                    <GenericModulePage
                      title="Vehicle & Motorbike Fleet"
                      description="Motorbike and van maintenance status, cold-box readiness, and fuel logs."
                      icon="pi pi-car"
                    />
                  }
                />
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
                <Route
                  path="settings"
                  element={
                    <GenericModulePage
                      title="Access Control & Permissions"
                      description="Role-based permissions matrix, security policies, and user invitations."
                      icon="pi pi-shield"
                    />
                  }
                />
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

