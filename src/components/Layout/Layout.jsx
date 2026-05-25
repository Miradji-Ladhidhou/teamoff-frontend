import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Navbar, Nav, Offcanvas, Button, Badge, Form } from 'react-bootstrap';
import {
  FaBars,
  FaSignOutAlt,
  FaHome,
  FaUsers,
  FaCalendarAlt,
  FaCalendarCheck,
  FaDownload,
  FaBell,
  FaBuilding,
  FaCog,
  FaInfoCircle,
  FaEllipsisH,
  FaThLarge,
  FaCalendarTimes,
} from 'react-icons/fa';

import { useAuth } from '../../contexts/AuthContext';
import { getNavigationForRole } from '../../utils/navigation';
import { useNotificationStream } from '../../hooks/useNotificationStream';
import AppFooter from './AppFooter';
import './Layout.css';

const iconMap = {
  home: FaHome,
  users: FaUsers,
  leave: FaCalendarCheck,
  calendar: FaCalendarAlt,
  download: FaDownload,
  bell: FaBell,
  business: FaBuilding,
  settings: FaCog,
  info: FaInfoCircle,
  holiday: FaCalendarTimes,
  more: FaEllipsisH,
};

const roleLabel = {
  employe: 'Employé',
  manager: 'Manager',
  admin_entreprise: 'Admin entreprise',
};

const topbarNotes = {
  '/dashboard': 'Consultez votre vue d ensemble',
  '/mes-conges': 'Suivez vos demandes de conges',
  '/conges-equipe': 'Validez les conges de votre equipe',
  '/conges': 'Gerez les conges de l entreprise',
  '/users': 'Administrez les comptes utilisateurs',
  '/absences': 'Suivez les absences en cours',
  '/calendrier': 'Visualisez le planning global',
  '/politique-conges': 'Parametrez regles et services',
  '/jours-feries': 'Configurez les jours speciaux',
  '/exports': 'Exportez vos donnees rapidement',
  '/notifications': 'Consultez les alertes importantes',
  '/help': 'Accedez a l aide contextuelle',
};

const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [showSidebar, setShowSidebar] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [search, setSearch] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  const handleNewNotification = useCallback(() => {
    setUnreadCount((c) => c + 1);
  }, []);

  useNotificationStream(handleNewNotification);

  // Reset unread count when user visits notifications page
  useEffect(() => {
    if (location.pathname === '/notifications') {
      setUnreadCount(0);
    }
  }, [location.pathname]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const navItems = useMemo(() => getNavigationForRole(user?.role) || [], [user?.role]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return navItems;
    return navItems.filter((item) => item.label.toLowerCase().includes(q));
  }, [navItems, search]);

  const primaryItems = filteredItems.filter((item) => item.section === 'primary');
  const secondaryItems = filteredItems.filter((item) => item.section === 'secondary');
  const bottomItems = [...navItems.filter((item) => item.section === 'primary').slice(0, 3), { path: '__more__', label: 'Plus', icon: 'more' }];

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  const activeTitle = useMemo(() => {
    const match = navItems.find((item) => isActive(item.path));
    return match?.label || 'TeamOff';
  }, [navItems, location.pathname]);

  const topbarNote = useMemo(() => {
    const activeItem = navItems.find((item) => isActive(item.path));
    if (!activeItem) return 'Navigation simple';
    return topbarNotes[activeItem.path] || `Section ${activeItem.label}`;
  }, [navItems, location.pathname]);

  const goTo = (path, closeSidebar = false) => {
    navigate(path);
    if (closeSidebar) setShowSidebar(false);
  };

  const renderNavItem = (item, closeSidebar = false) => {
    const Icon = iconMap[item.icon] || FaThLarge;
    return (
      <Nav.Link
        key={item.path}
        onClick={() => goTo(item.path, closeSidebar)}
        className={`role-nav-link d-flex align-items-center gap-2 mb-1 ${isActive(item.path) ? 'active' : ''}`}
      >
        <Icon size={14} />
        <span>{item.label}</span>
      </Nav.Link>
    );
  };

  const renderSidebarContent = (isMobile = false) => (
    <>
      <div className="mb-3">
        <div className="fw-bold">{user?.prenom} {user?.nom}</div>
        <small className="ui-text-soft">{user?.entreprise_nom}</small>
        <div className="mt-2">
          <Badge className="role-badge">{roleLabel[user?.role] || 'Compte'}</Badge>
        </div>
      </div>

      <Form.Control
        type="search"
        className="mb-3"
        placeholder="Rechercher une page..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className={`role-section-title mb-2 ${isMobile ? 'ui-text-soft' : ''}`}>Essentiel</div>
      <Nav className="flex-column mb-2">
        {primaryItems.map((item) => renderNavItem(item, isMobile))}
      </Nav>

      <div className="d-grid mb-2">
        <Button
          variant={showAdvanced ? 'secondary' : 'outline-secondary'}
          size="sm"
          onClick={() => setShowAdvanced((prev) => !prev)}
        >
          {showAdvanced ? 'Masquer options avancées' : 'Afficher options avancées'}
        </Button>
      </div>

      {(showAdvanced || search.trim()) && (
        <>
          <div className={`role-section-title mb-2 mt-2 ${isMobile ? 'ui-text-soft' : ''}`}>Options</div>
          <Nav className="flex-column mb-3">
            {secondaryItems.map((item) => renderNavItem(item, isMobile))}
          </Nav>
        </>
      )}

      <Button variant="outline-danger" size="sm" className="w-100" onClick={logout}>
        <FaSignOutAlt className="me-2" />Déconnexion
      </Button>
    </>
  );

  const initials = [user?.prenom?.[0], user?.nom?.[0]].filter(Boolean).join('').toUpperCase() || '?';

  return (
    <div className={`app-shell role-shell role-${user?.role || 'employe'}`}>
      {/* Desktop sidebar (≥992px) */}
      <aside className="sidebar role-sidebar flex-column p-3">
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile offcanvas */}
      <Offcanvas show={showSidebar} onHide={() => setShowSidebar(false)}>
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Navigation</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>{renderSidebarContent(true)}</Offcanvas.Body>
      </Offcanvas>

      <div className="main-area">
        {/* Mobile topbar */}
        <div className="topbar d-lg-none">
          <span className="topbar-logo">Team<span>Off</span></span>
          <div className="d-flex align-items-center gap-2">
            <button className="topbar-icon-btn position-relative" onClick={() => navigate('/notifications')} aria-label="Notifications">
              <FaBell size={14} style={{ color: 'rgba(241,241,243,0.7)' }} />
              {unreadCount > 0 && (
                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.6rem' }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            <button className="topbar-avatar" onClick={() => setShowSidebar(true)} aria-label="Menu">
              {initials}
            </button>
          </div>
        </div>

        {/* Desktop topbar */}
        <Navbar className="role-topbar desktop-topbar d-none d-lg-flex px-3">
          <Navbar.Brand className="mb-0">{activeTitle}</Navbar.Brand>
          <span className="role-topbar-note ms-auto">{topbarNote}</span>
        </Navbar>

        <main className="page-content role-content">
          <Outlet />
        </main>

        <AppFooter />
      </div>

      {/* Mobile bottom nav */}
      <nav className="bottom-nav" role="navigation" aria-label="Navigation mobile">
        {bottomItems.map((item) => {
          const isMore = item.path === '__more__';
          const Icon = iconMap[item.icon] || FaThLarge;
          const active = !isMore && isActive(item.path);

          return (
            <button
              key={item.path}
              className={`nav-item${active ? ' active' : ''}`}
              onClick={() => (isMore ? setShowSidebar(true) : navigate(item.path))}
              aria-label={item.label}
            >
              <span className="nav-icon"><Icon size={18} /></span>
              <span className="nav-label">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default Layout;