import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, Outlet, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AlertProvider } from './contexts/AlertContext';
import { Container, Spinner, Button } from 'react-bootstrap';

// Alert System Components
import GlobalModalProvider from './components/AlertSystem/GlobalModalProvider';

import { getDefaultRoute } from './utils/navigation';
import AppFooter from './components/Layout/AppFooter';

// Layouts
import Layout from './components/Layout/Layout';
import SuperAdminLayout from './components/Layout/SuperAdminLayout';
// Lazy loaded pages
const LoginPage = lazy(() => import('./pages/Auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/Auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/Auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/Auth/ResetPasswordPage'));
const SetPasswordPage = lazy(() => import('./pages/Auth/SetPasswordPage'));
const NotFoundPage = lazy(() => import('./pages/NotFound/NotFoundPage'));
const DashboardPage = lazy(() => import('./pages/Dashboard/DashboardPage'));
const CongesPage = lazy(() => import('./pages/Conges/CongesPage'));
const CongeDetailsPage = lazy(() => import('./pages/Conges/CongeDetailsPage'));
const NouveauCongePage = lazy(() => import('./pages/Conges/NouveauCongePage'));
const UsersPage = lazy(() => import('./pages/Users/UsersPage'));
const CalendrierPage = lazy(() => import('./pages/Calendrier/CalendrierPage'));
const ExportsPage = lazy(() => import('./pages/Exports/ExportsPage'));
const NotificationsPage = lazy(() => import('./pages/Notifications/NotificationsPage'));
const JoursFeriesPage = lazy(() => import('./pages/JoursFeries/JoursFeriesPage'));
const PolicyServicesPage = lazy(() => import('./pages/PolicyServices/PolicyServicesPage'));
const HolidaysBlockedPage = lazy(() => import('./pages/HolidaysBlocked/HolidaysBlockedPage'));
const MaintenancePage = lazy(() => import('./pages/Maintenance/MaintenancePage'));
const LegalPage = lazy(() => import('./pages/Legal/LegalPage'));
const ContactPage = lazy(() => import('./pages/Contact/ContactPage'));
const PrivacyPage = lazy(() => import('./pages/Privacy/PrivacyPage'));
const HelpPage = lazy(() => import('./pages/Help/HelpPage'));
const MyProfilePage = lazy(() => import('./pages/MyProfile/MyProfilePage'));
const AbsencesPage = lazy(() => import('./pages/Absences/AbsencesPage'));

// SuperAdmin pages
const SuperAdminDashboard = lazy(() => import('./pages/SuperAdmin/DashboardPage'));
const CompaniesManagement = lazy(() => import('./pages/SuperAdmin/CompaniesPage'));
const SuperAdminServicesPage = lazy(() => import('./pages/SuperAdmin/ServicesPage'));
const SystemSettings = lazy(() => import('./pages/SuperAdmin/SettingsPage'));
const MetricsPage = lazy(() => import('./pages/SuperAdmin/MetricsPage'));
const AuditLogs = lazy(() => import('./pages/SuperAdmin/AuditLogsPage'));

const LoadingSpinner = () => (
  <Container className="page-loading">
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

import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
  const { pathname } = useLocation();
  React.useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
};

const PublicPageLayout = ({ children }) => {
  const location = useLocation();
  // On masque l'en-tête public sur la page /help
  const hideHeader = location.pathname === '/help';
  return (
    <div className="min-vh-100 d-flex flex-column auth-bg-simple">
      {!hideHeader && (
        <header className="border-bottom glass-header">
          <Container className="d-flex align-items-center justify-content-between py-3 gap-3">
            <Link to="/" className="text-decoration-none text-dark">
              <div>
                <div className="fw-bold fs-4 ls-logo">TeamOff</div>
                <div className="text-muted small">Gestion des conges et validations</div>
              </div>
            </Link>
            <div className="d-flex flex-wrap gap-2">
              <Button as={Link} to="/contact" variant="outline-dark" size="sm">Contact</Button>
              <Button as={Link} to="/" variant="dark" size="sm">Connexion</Button>
            </div>
          </Container>
        </header>
      )}
      <main className="flex-grow-1 py-4 py-md-5">
        {children}
      </main>
      <Container>
        <AppFooter publicMode />
      </Container>
    </div>
  );
};


function App() {
  return (
    <AuthProvider>
      <AlertProvider>
        {/* Global Alert System Components */}
        <GlobalModalProvider />
        <ScrollToTop />

        <Routes>

        {/* Routes publiques */}
        <Route
          path="/"
          element={
            <AuthRedirect>
              <LoginPage />
            </AuthRedirect>
          }
        />

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
          path="/forgot-password"
          element={
            <AuthRedirect>
              <ForgotPasswordPage />
            </AuthRedirect>
          }
        />

        <Route
          path="/reset-password"
          element={
            <AuthRedirect>
              <ResetPasswordPage />
            </AuthRedirect>
          }
        />

        <Route
          path="/reset-password/:token"
          element={
            <AuthRedirect>
              <ResetPasswordPage />
            </AuthRedirect>
          }
        />

        <Route
          path="/set-password"
          element={
            <Suspense fallback={<LoadingSpinner />}>
              <SetPasswordPage />
            </Suspense>
          }
        />

        <Route
          path="/legal"
          element={
            <Suspense fallback={<LoadingSpinner />}>
              <PublicPageLayout>
                <LegalPage />
              </PublicPageLayout>
            </Suspense>
          }
        />

        <Route
          path="/contact"
          element={
            <Suspense fallback={<LoadingSpinner />}>
              <PublicPageLayout>
                <ContactPage />
              </PublicPageLayout>
            </Suspense>
          }
        />

        <Route
          path="/privacy"
          element={
            <Suspense fallback={<LoadingSpinner />}>
              <PublicPageLayout>
                <PrivacyPage />
              </PublicPageLayout>
            </Suspense>
          }
        />

        <Route
          path="/help"
          element={
            <Suspense fallback={<LoadingSpinner />}>
              <PublicPageLayout>
                <HelpPage />
              </PublicPageLayout>
            </Suspense>
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

        {/* Routes protégées standard — tous les utilisateurs authentifiés */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<DashboardRedirect />} />
            <Route path="/mes-conges" element={<CongesPage />} />
            <Route path="/conges" element={<CongesPage />} />
            <Route path="/conges/nouveau" element={<NouveauCongePage />} />
            <Route path="/conges/:id/edit" element={<NouveauCongePage />} />
            <Route path="/conges/:id" element={<CongeDetailsPage />} />
            <Route path="/absences" element={<AbsencesPage />} />
            <Route path="/absences/equipe" element={<Navigate to="/absences" replace />} />
            <Route path="/calendrier" element={<CalendrierPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/my-profile" element={<MyProfilePage />} />
          </Route>
        </Route>

        {/* Vue équipe — manager et au-dessus uniquement */}
        <Route element={<ProtectedRoute roles={['manager', 'admin_entreprise', 'super_admin']} />}>
          <Route element={<Layout />}>
            <Route path="/conges-equipe" element={<CongesPage />} />
          </Route>
        </Route>

        {/* Routes admin entreprise */}
        <Route element={<ProtectedRoute roles={['admin_entreprise', 'manager']} />}>
          <Route element={<Layout />}>
            <Route path="/exports" element={<ExportsPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute roles={['admin_entreprise']} />}>
          <Route element={<Layout />}>
            <Route path="/users" element={<UsersPage />} />
            <Route path="/jours-feries" element={<HolidaysBlockedPage />} />
            <Route path="/politique-conges" element={<PolicyServicesPage />} />
            <Route path="/parametres-jours-bloques" element={<Navigate to="/jours-feries?tab=bloques" replace />} />
            <Route path="/services" element={<Navigate to="/politique-conges?tab=services" replace />} />
          </Route>
        </Route>

        {/* Routes SuperAdmin dédiées */}
        <Route element={<ProtectedRoute roles={['super_admin']} />}>
          <Route path="/superadmin" element={<SuperAdminLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<SuperAdminDashboard />} />
            <Route path="companies" element={<CompaniesManagement />} />
            <Route path="services" element={<SuperAdminServicesPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="leaves" element={<CongesPage />} />
            <Route path="leaves/new" element={<NouveauCongePage />} />
            <Route path="leaves/:id/edit" element={<NouveauCongePage />} />
            <Route path="leaves/:id" element={<CongeDetailsPage />} />
            <Route path="absences" element={<AbsencesPage />} />
            <Route path="metrics" element={<MetricsPage />} />
            <Route path="exports" element={<ExportsPage />} />
            <Route path="holidays" element={<JoursFeriesPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="audit" element={<AuditLogs />} />
            <Route path="settings" element={<SystemSettings />} />
            <Route path="legal" element={<LegalPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="privacy" element={<PrivacyPage />} />
            <Route path="help" element={<HelpPage />} />
          </Route>
          <Route path="/entreprises" element={<Navigate to="/superadmin/companies" replace />} />
          <Route path="/metrics" element={<Navigate to="/superadmin/metrics" replace />} />
          <Route path="/audit" element={<Navigate to="/superadmin/audit" replace />} />
          <Route path="/settings" element={<Navigate to="/superadmin/settings" replace />} />
          <Route path="/superadmin/entreprises" element={<Navigate to="/superadmin/companies" replace />} />
        </Route>

          {/* Redirections */}
          <Route path="*" element={
            <Suspense fallback={<LoadingSpinner />}>
              <NotFoundPage />
            </Suspense>
          } />

        </Routes>
      </AlertProvider>
    </AuthProvider>
  );
}

export default App;