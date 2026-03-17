import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Container, Spinner } from 'react-bootstrap';
import NotificationSystem from './components/NotificationSystem';
import { getDefaultRoute } from './utils/navigation';

// Layouts
import Layout from './components/Layout/Layout';
import SuperAdminLayout from './components/Layout/SuperAdminLayout';
// Lazy loaded pages
const LoginPage = lazy(() => import('./pages/Auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/Auth/RegisterPage'));
const DashboardPage = lazy(() => import('./pages/Dashboard/DashboardPage'));
const CongesPage = lazy(() => import('./pages/Conges/CongesPage'));
const CongeDetailsPage = lazy(() => import('./pages/Conges/CongeDetailsPage'));
const NouveauCongePage = lazy(() => import('./pages/Conges/NouveauCongePage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const CalendrierPage = lazy(() => import('./pages/CalendrierPage'));
const ExportsPage = lazy(() => import('./pages/ExportsPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const JoursFeriesPage = lazy(() => import('./pages/JoursFeriesPage'));
const MaintenancePage = lazy(() => import('./pages/MaintenancePage'));

// SuperAdmin pages
const SuperAdminDashboard = lazy(() => import('./pages/SuperAdmin/DashboardPage'));
const CompaniesManagement = lazy(() => import('./pages/SuperAdmin/CompaniesPage'));
const SystemSettings = lazy(() => import('./pages/SuperAdmin/SettingsPage'));
const MetricsPage = lazy(() => import('./pages/SuperAdmin/MetricsPage'));
const AuditLogs = lazy(() => import('./pages/SuperAdmin/AuditLogsPage'));

const LoadingSpinner = () => (
  <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
    <div className="text-center">
      <Spinner animation="border" variant="primary" className="mb-3" />
      <p className="text-muted">Chargement...</p>
    </div>
  </Container>
);

// Protection des routes
const ProtectedRoute = ({ roles }) => {
  const { isAuthenticated, hasRole, loading, user } = useAuth();

  if (loading) return <LoadingSpinner />;

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (roles && !hasRole(roles)) return <Navigate to={getDefaultRoute(user?.role)} replace />;

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Outlet />
    </Suspense>
  );
};

// Redirection si déjà connecté
const AuthRedirect = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) return <LoadingSpinner />;

  if (isAuthenticated) return <Navigate to={getDefaultRoute(user?.role)} replace />;

  return <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>;
};

const DashboardRedirect = () => {
  const { loading, user } = useAuth();

  if (loading) return <LoadingSpinner />;

  if (user?.role === 'super_admin') {
    return <Navigate to="/superadmin/dashboard" replace />;
  }

  return <DashboardPage />;
};

const HomeRedirect = () => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) return <LoadingSpinner />;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getDefaultRoute(user?.role)} replace />;
};

function App() {
  return (
    <AuthProvider>
      <NotificationSystem />

      <Routes>

        {/* Routes publiques */}
        <Route
          path="/login"
          element={
            <AuthRedirect>
              <LoginPage />
            </AuthRedirect>
          }
        />

        <Route
          path="/register"
          element={
            <AuthRedirect>
              <RegisterPage />
            </AuthRedirect>
          }
        />

        <Route
          path="/maintenance"
          element={
            <Suspense fallback={<LoadingSpinner />}>
              <MaintenancePage />
            </Suspense>
          }
        />

        {/* Routes protégées standard */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<DashboardRedirect />} />
            <Route path="/mes-conges" element={<CongesPage />} />
            <Route path="/conges-equipe" element={<CongesPage />} />
            <Route path="/conges" element={<CongesPage />} />
            <Route path="/conges/nouveau" element={<NouveauCongePage />} />
            <Route path="/conges/:id/edit" element={<NouveauCongePage />} />
            <Route path="/conges/:id" element={<CongeDetailsPage />} />
            <Route path="/calendrier" element={<CalendrierPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
          </Route>
        </Route>

        {/* Routes admin entreprise */}
        <Route element={<ProtectedRoute roles={['admin_entreprise']} />}>
          <Route element={<Layout />}>
            <Route path="/users" element={<UsersPage />} />
            <Route path="/exports" element={<ExportsPage />} />
            <Route path="/jours-feries" element={<JoursFeriesPage />} />
          </Route>
        </Route>

        {/* Routes SuperAdmin dédiées */}
        <Route element={<ProtectedRoute roles={['super_admin']} />}>
          <Route path="/superadmin" element={<SuperAdminLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<SuperAdminDashboard />} />
            <Route path="companies" element={<CompaniesManagement />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="leaves" element={<CongesPage />} />
            <Route path="leaves/new" element={<NouveauCongePage />} />
            <Route path="leaves/:id/edit" element={<NouveauCongePage />} />
            <Route path="leaves/:id" element={<CongeDetailsPage />} />
            <Route path="metrics" element={<MetricsPage />} />
            <Route path="exports" element={<ExportsPage />} />
            <Route path="holidays" element={<JoursFeriesPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="audit" element={<AuditLogs />} />
            <Route path="settings" element={<SystemSettings />} />
          </Route>
          <Route path="/entreprises" element={<Navigate to="/superadmin/companies" replace />} />
          <Route path="/metrics" element={<Navigate to="/superadmin/metrics" replace />} />
          <Route path="/audit" element={<Navigate to="/superadmin/audit" replace />} />
          <Route path="/settings" element={<Navigate to="/superadmin/settings" replace />} />
          <Route path="/superadmin/entreprises" element={<Navigate to="/superadmin/companies" replace />} />
        </Route>

        {/* Redirections */}
        <Route path="/" element={<HomeRedirect />} />
        <Route path="*" element={<HomeRedirect />} />

      </Routes>
    </AuthProvider>
  );
}

export default App;