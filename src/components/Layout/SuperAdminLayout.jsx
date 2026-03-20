import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Navbar, Nav, Offcanvas, Button, Badge } from 'react-bootstrap';
import { FaBars, FaSignOutAlt, FaShieldAlt, FaHome, FaBuilding, FaUsers, FaCalendarCheck, FaChartLine, FaDownload, FaCalendarTimes, FaBell, FaHistory, FaCog, FaEllipsisH } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { notificationsService } from '../../services/api';
import { getNavigationForRole } from '../../utils/navigation';
import AppFooter from './AppFooter';
import './Layout.css';

const NOTIFICATIONS_UPDATED_EVENT = 'teamoff:notifications-updated';

const SuperAdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showSidebar, setShowSidebar] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const menuItems = getNavigationForRole('super_admin');
  const primaryItems = menuItems.filter((item) => item.section === 'primary');
  const secondaryItems = menuItems.filter((item) => item.section === 'secondary');

  const iconMap = {
    home: FaHome,
    shield: FaShieldAlt,
    business: FaBuilding,
    users: FaUsers,
    leave: FaCalendarCheck,
    chart: FaChartLine,
    download: FaDownload,
    holiday: FaCalendarTimes,
    bell: FaBell,
    audit: FaHistory,
    settings: FaCog,
    more: FaEllipsisH
  };

  // Bottom nav mobile : 4 premiers primaires + "Plus"
  const bottomNavItems = [
    ...primaryItems.slice(0, 4),
    { path: '__more__', label: 'Plus', icon: 'more', section: 'bottom' }
  ];

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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const renderMenuItem = (item, closeSidebar = false) => {
    const Icon = iconMap[item.icon] || FaShieldAlt;
    const badgeValue = item.badgeKey === 'notifications' ? unreadNotifications : null;

    return (
      <Nav.Link
        key={item.path}
        onClick={() => {
          navigate(item.path);
          if (closeSidebar) {
            setShowSidebar(false);
          }
        }}
        className={`mb-2 d-flex align-items-center ${
          isActive(item.path) ? 'bg-primary text-white rounded px-2 py-2' : 'px-2 py-2'
        } ${closeSidebar ? '' : 'text-white'}`}
        style={{ cursor: 'pointer' }}
      >
        <Icon className="me-3" size={18} />
        <span>{item.label}</span>
        {badgeValue > 0 && (
          <Badge bg="danger" className="ms-auto" pill>
            {badgeValue}
          </Badge>
        )}
      </Nav.Link>
    );
  };

  return (
    <div className="d-flex">
      {/* Sidebar pour desktop */}
      <div className="d-none d-md-block bg-dark text-white" style={{ width: '250px', minHeight: '100dvh' }}>
        <div className="p-3">
          <div className="d-flex align-items-center mb-4">
            <FaShieldAlt size={24} className="text-warning me-2" />
            <h5 className="mb-0 text-warning">SuperAdmin</h5>
          </div>

          <div className="mb-4">
            <small className="ui-text-on-dark-soft">Connecté en tant que</small>
            <div className="fw-bold">{user?.prenom} {user?.nom}</div>
            <Badge bg="warning" className="mt-1">SuperAdmin</Badge>
          </div>

          <Nav className="flex-column">
            {primaryItems.map((item) => renderMenuItem(item))}
            <div className="text-uppercase small ui-text-on-dark-soft mt-3 mb-2">Outils</div>
            {secondaryItems.map((item) => renderMenuItem(item))}
          </Nav>

          <hr className="my-4" />

          <Button
            variant="outline-light"
            size="sm"
            onClick={handleLogout}
            className="w-100"
          >
            <FaSignOutAlt className="me-2" />
            Déconnexion
          </Button>
        </div>
      </div>

      {/* Sidebar mobile */}
      <Offcanvas show={showSidebar} onHide={() => setShowSidebar(false)} className="d-md-none">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>
            <FaShieldAlt size={20} className="text-warning me-2" />
            SuperAdmin
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <div className="mb-4">
            <small className="ui-text-soft">Connecté en tant que</small>
            <div className="fw-bold">{user?.prenom} {user?.nom}</div>
            <Badge bg="warning" className="mt-1">SuperAdmin</Badge>
          </div>

          <Nav className="flex-column">
            {primaryItems.map((item) => renderMenuItem(item, true))}
            <div className="text-uppercase small ui-text-soft mt-3 mb-2">Outils</div>
            {secondaryItems.map((item) => renderMenuItem(item, true))}
          </Nav>

          <hr className="my-4" />

          <Button
            variant="outline-danger"
            size="sm"
            onClick={handleLogout}
            className="w-100"
          >
            <FaSignOutAlt className="me-2" />
            Déconnexion
          </Button>
        </Offcanvas.Body>
      </Offcanvas>

      {/* Contenu principal */}
      <div className="flex-grow-1">
        {/* Navbar supérieure */}
        <Navbar bg="light" expand="md" className="border-bottom px-3">
          <Button
            variant="outline-secondary"
            size="sm"
            className="d-md-none me-2"
            onClick={() => setShowSidebar(true)}
          >
            <FaBars />
          </Button>

          <Navbar.Brand className="d-none d-md-block">
            <FaShieldAlt className="text-warning me-2" />
            Panel SuperAdmin
          </Navbar.Brand>

          <Navbar.Collapse className="justify-content-end">
            <div className="d-flex align-items-center">
              <small className="ui-text-soft">
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

        {/* Contenu de la page */}
        <div style={{ padding: '1.25rem' }} className="superadmin-content">
          <Outlet />
        </div>
        <AppFooter isSuperAdmin />
      </div>

      {/* Bottom Navigation Mobile */}
      <nav className="mobile-bottom-nav d-md-none" role="navigation" aria-label="Navigation SuperAdmin">
        {bottomNavItems.map((item) => {
          const Icon = iconMap[item.icon] || FaShieldAlt;
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

export default SuperAdminLayout;