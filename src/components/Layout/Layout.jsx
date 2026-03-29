import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Navbar, Nav, Offcanvas, Button, Badge } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import {
  FaBars,
  FaSignOutAlt,
  FaShieldAlt,
  FaHome,
  FaBuilding,
  FaUsers,
  FaCalendarCheck,
  FaChartLine,
  FaDownload,
  FaCalendarTimes,
  FaBell,
  FaHistory,
  FaCog,
  FaCalendarAlt,
  FaUser,
  FaEllipsisH
} from 'react-icons/fa';
import { notificationsService } from '../../services/api';
import { getDefaultRoute, getNavigationForRole } from '../../utils/navigation';
import AppFooter from './AppFooter';
import './Layout.css';

const NOTIFICATIONS_UPDATED_EVENT = 'teamoff:notifications-updated';


const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showSidebar, setShowSidebar] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Scroll en haut à chaque changement de page
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const response = await notificationsService.getAll({ non_lu: 'true', page: 1, limit: 1 });
        const total = Number(response.data?.pagination?.total);
        setUnreadNotifications(Number.isFinite(total) ? total : 0);
      } catch (error) {
        console.error('Erreur chargement notifications:', error);
      }
    };

    const handleNotificationsUpdated = (event) => {
      const unreadCount = Number(event?.detail?.unreadCount);
      if (Number.isFinite(unreadCount)) {
        setUnreadNotifications(Math.max(0, unreadCount));
        return;
      }

      loadUnreadCount();
    };

    if (user) {
      loadUnreadCount();
    }

    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, handleNotificationsUpdated);

    return () => {
      window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, handleNotificationsUpdated);
    };
  }, [user]);

  const navigationItems = getNavigationForRole(user?.role);
  const primaryItems = navigationItems.filter((item) => item.section === 'primary');
  const secondaryItems = navigationItems.filter((item) => item.section === 'secondary');
  const iconComponentMap = {
    shield: FaShieldAlt,
    home: FaHome,
    leave: FaCalendarCheck,
    calendar: FaCalendarAlt,
    users: FaUsers,
    download: FaDownload,
    business: FaBuilding,
    holiday: FaCalendarTimes,
    bell: FaBell,
    chart: FaChartLine,
    audit: FaHistory,
    settings: FaCog,
    user: FaUser,
    more: FaEllipsisH
  };

  // Bottom nav : 4 premiers items primaires + "Plus" si items secondaires
  const bottomNavItems = [
    ...primaryItems.slice(0, 4),
    ...(secondaryItems.length > 0 || primaryItems.length > 4
      ? [{ path: '__more__', label: 'Plus', icon: 'more', section: 'bottom' }]
      : [])
  ];

  const roleMeta = {
    admin_entreprise: { label: 'Administrateur entreprise', className: 'role-admin_entreprise' },
    manager: { label: 'Manager', className: 'role-manager' },
    employe: { label: 'Employe', className: 'role-employe' },
    super_admin: { label: 'SuperAdmin', className: 'role-super_admin' }
  };

  const currentRoleMeta = roleMeta[user?.role] || { label: 'Utilisateur', className: 'role-employe' };

  const entrepriseLabel = user?.entreprise_nom
    ? user.entreprise_nom
    : 'Entreprise non renseignee';

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const renderNavItem = (item, closeSidebar = false) => {
    const Icon = iconComponentMap[item.icon] || FaHome;
    const badgeValue = item.badgeKey === 'notifications' ? unreadNotifications : 0;

    return (
      <Nav.Link
        key={item.path}
        onClick={() => {
          navigate(item.path);
          if (closeSidebar) {
            setShowSidebar(false);
          }
        }}
        className={`role-nav-link mb-2 d-flex align-items-center cursor-pointer ${isActive(item.path) ? 'active' : ''}`}
      >
        <Icon className="me-3" size={17} />
        <span>{item.label}</span>
        {badgeValue > 0 && (
          <Badge bg="danger" className="ms-2" pill>
            {badgeValue}
          </Badge>
        )}
      </Nav.Link>
    );
  };

  return (
    <div className={`role-shell ${currentRoleMeta.className}`}>
      {/* Sidebar desktop */}
      <div className="d-none d-md-block role-sidebar">
        <div className="p-3">          <div className="d-flex align-items-center mb-4">
            <FaShieldAlt size={24} className="me-2 role-brand-icon" />
            <h5 className="mb-0 role-brand-title">TeamOff</h5>
          </div>

          <div className="mb-4 role-user-box">
            <small className="role-user-label">Connecte en tant que</small>
            <div className="fw-bold">{user?.prenom} {user?.nom}</div>
            <small className="d-block role-user-label">{entrepriseLabel}</small>
            <Badge className="mt-1 role-badge">{currentRoleMeta.label}</Badge>
          </div>

          <Nav className="flex-column">
            {primaryItems.map((item) => renderNavItem(item))}
            {secondaryItems.length > 0 && <div className="role-section-title mt-3 mb-2">Outils</div>}
            {secondaryItems.map((item) => renderNavItem(item))}
          </Nav>

          <hr className="my-4 role-divider" />

          <Button 
            variant="outline-light" 
            size="sm" 
            onClick={() => navigate('/my-profile')}
            className="w-100 mb-2"
          >
            <FaUser className="me-2" />
            Mes informations
          </Button>

          <Button variant="outline-light" size="sm" onClick={handleLogout} className="w-100">
            <FaSignOutAlt className="me-2" />
            Deconnexion
          </Button>
        </div>
      </div>

      {/* Sidebar mobile */}
      <Offcanvas show={showSidebar} onHide={() => setShowSidebar(false)} className="d-md-none">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>
            <FaShieldAlt size={20} className="me-2 role-brand-icon" />
            TeamOff
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <div className="mb-4">
            <small className="ui-text-soft">Connecte en tant que</small>
            <div className="fw-bold">{user?.prenom} {user?.nom}</div>
            <small className="d-block ui-text-soft">{entrepriseLabel}</small>
            <Badge className="mt-1 role-badge">{currentRoleMeta.label}</Badge>
          </div>

          <Nav className="flex-column">
            {primaryItems.map((item) => renderNavItem(item, true))}
            {secondaryItems.length > 0 && <div className="role-section-title mt-3 mb-2">Outils</div>}
            {secondaryItems.map((item) => renderNavItem(item, true))}
          </Nav>

          <hr className="my-4" />
          <Button 
            variant="outline-info" 
            size="sm" 
            onClick={() => navigate('/my-profile')}
            className="w-100 mb-2"
          >
            <FaUser className="me-2" />
            Mes informations
          </Button>

          <Button variant="outline-danger" size="sm" onClick={handleLogout} className="w-100">
            <FaSignOutAlt className="me-2" />
            Deconnexion
          </Button>
        </Offcanvas.Body>
      </Offcanvas>

      {/* Contenu */}
      <div className="flex-grow-1">
        <Navbar bg="light" expand="md" className="border-bottom px-3 role-topbar">
          <Button
            variant="outline-secondary"
            size="sm"
            className="d-md-none me-2"
            onClick={() => setShowSidebar(true)}
            aria-label="Menu"
          >
            <FaBars />
          </Button>

          <Navbar.Brand
            className="role-topbar-brand cursor-pointer"
            onClick={() => navigate(getDefaultRoute(user?.role))}
          >
            <FaShieldAlt className="me-2 role-brand-icon d-none d-md-inline" />
            <span className="d-none d-md-inline">Espace {currentRoleMeta.label}</span>
            <span className="d-md-none fw-bold fs-6">TeamOff</span>
          </Navbar.Brand>

          <Navbar.Collapse className="justify-content-end">
            <div className="d-flex align-items-center">
              <small className="ui-text-soft d-none d-sm-inline">
                {new Date().toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </small>
            </div>
          </Navbar.Collapse>
        </Navbar>

        <main className="role-content">
          <Outlet />
        </main>
        <AppFooter />
      </div>

      {/* Bottom Navigation Mobile */}
      <nav className="mobile-bottom-nav d-md-none" role="navigation" aria-label="Navigation principale">
        {bottomNavItems.map((item) => {
          const Icon = iconComponentMap[item.icon] || FaHome;
          const isMore = item.path === '__more__';
          const active = !isMore && isActive(item.path);
          const badgeValue = item.badgeKey === 'notifications' ? unreadNotifications : 0;

          return (
            <button
              key={item.path}
              className={`mobile-bottom-nav__item${active ? ' active' : ''}`}
              onClick={() => {
                if (isMore) {
                  setShowSidebar(true);
                } else {
                  navigate(item.path);
                }
              }}
              aria-label={item.label}
            >
              <span className="mobile-bottom-nav__icon">
                <Icon size={20} />
                {badgeValue > 0 && (
                  <span className="mobile-bottom-nav__badge">{badgeValue > 9 ? '9+' : badgeValue}</span>
                )}
              </span>
              <span className="mobile-bottom-nav__label">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default Layout;