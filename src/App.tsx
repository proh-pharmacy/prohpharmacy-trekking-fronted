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
import { FlatButtonsShowcase } from './pages/preview/FlatButtonsShowcase';
import { DataTableShowcase } from './pages/preview/DataTableShowcase';
import { FlatInputsShowcase } from './pages/preview/FlatInputsShowcase';
import { ToastShowcase } from './pages/preview/ToastShowcase';
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

