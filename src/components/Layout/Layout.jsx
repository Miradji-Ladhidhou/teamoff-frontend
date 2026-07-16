import React, { useMemo, useState, useEffect, useCallback } from 'react';
import TeamOffLogo from '../TeamOffLogo';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Navbar, Nav, Offcanvas, Button, Badge } from 'react-bootstrap';
import {
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
  FaCoins,
  FaUserCircle,
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
  balance: FaCoins,
};

const roleLabel = {
  employe: 'Employé',
  manager: 'Manager',
  admin_entreprise: 'Admin entreprise',
};


const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [showSidebar, setShowSidebar] = useState(false);
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

  const primaryItems = useMemo(() => navItems.filter((item) => item.section === 'primary'), [navItems]);
  const secondaryItems = useMemo(() => navItems.filter((item) => item.section === 'secondary'), [navItems]);
  const bottomItems = [...primaryItems.slice(0, 4), { path: '__more__', label: 'Menu', icon: 'more' }];

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  const activeTitle = useMemo(() => {
    const match = navItems.find((item) => isActive(item.path));
    return match?.label || 'TeamOff';
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
      <div
        className="sidebar-user mb-3"
        onClick={() => goTo('/my-profile', isMobile)}
        style={{ cursor: 'pointer' }}
        title="Mon profil"
      >
        <div className="sidebar-user__name">{user?.prenom} {user?.nom}</div>
        <div className="small ui-text-soft">{user?.entreprise_nom}</div>
        <Badge className="role-badge mt-1">{roleLabel[user?.role] || 'Compte'}</Badge>
      </div>

      <Nav className="flex-column mb-1">
        {primaryItems.map((item) => renderNavItem(item, isMobile))}
      </Nav>

      {secondaryItems.length > 0 && (
        <>
          <div className="sidebar-sep my-2" />
          <Nav className="flex-column mb-3">
            {secondaryItems.map((item) => renderNavItem(item, isMobile))}
          </Nav>
        </>
      )}

      <Button
        variant="outline-secondary"
        size="sm"
        className="w-100 mb-2"
        onClick={() => goTo('/my-profile', isMobile)}
      >
        <FaUserCircle className="me-2" />Mon profil
      </Button>
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
        <div className="sidebar-brand"><TeamOffLogo size="sm" variant="light" /></div>
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile offcanvas */}
      <Offcanvas show={showSidebar} onHide={() => setShowSidebar(false)}>
        <Offcanvas.Header closeButton>
          <Offcanvas.Title><TeamOffLogo size="sm" variant="light" /></Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>{renderSidebarContent(true)}</Offcanvas.Body>
      </Offcanvas>

      <div className="main-area">
        {/* Mobile topbar */}
        <div className="topbar d-lg-none">
          <TeamOffLogo size="xs" variant="light" />
          <div className="d-flex align-items-center gap-2">
            <button className="topbar-icon-btn position-relative" onClick={() => navigate('/notifications')} aria-label="Notifications">
              <FaBell size={14} style={{ color: 'var(--dk-text-soft)' }} />
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
          <div className="ms-auto d-flex align-items-center gap-2">
            <button
              className="topbar-icon-btn position-relative"
              onClick={() => navigate('/notifications')}
              aria-label="Notifications"
            >
              <FaBell size={14} style={{ color: 'var(--dk-text-soft)' }} />
              {unreadCount > 0 && (
                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.6rem' }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            <button
              className="topbar-avatar"
              onClick={() => navigate('/my-profile')}
              aria-label="Mon profil"
              title="Mon profil"
            >
              {initials}
            </button>
          </div>
        </Navbar>

        <main className="page-content role-content">
          <div className="content-container">
            <Outlet />
          </div>
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