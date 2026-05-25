import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Nav, Offcanvas, Button, Badge } from 'react-bootstrap';
import {
  FaSignOutAlt, FaShieldAlt, FaHome, FaBuilding, FaUsers,
  FaCalendarCheck, FaChartLine, FaDownload, FaCalendarTimes,
  FaBell, FaHistory, FaCog, FaEllipsisH, FaCalendarAlt
} from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { notificationsService } from '../../services/api';
import { getNavigationForRole } from '../../utils/navigation';
import AppFooter from './AppFooter';
import './Layout.css';

const NOTIFICATIONS_UPDATED_EVENT = 'teamoff:notifications-updated';

const iconMap = {
  home: FaHome, shield: FaShieldAlt, business: FaBuilding, users: FaUsers,
  leave: FaCalendarCheck, calendar: FaCalendarAlt, chart: FaChartLine,
  download: FaDownload, holiday: FaCalendarTimes, bell: FaBell,
  audit: FaHistory, settings: FaCog, more: FaEllipsisH
};

const superadminTopbarNotes = {
  '/superadmin/dashboard': 'Surveillez la sante de la plateforme',
  '/superadmin/companies': 'Administrez les entreprises clientes',
  '/superadmin/services': 'Pilotez le catalogue de services',
  '/superadmin/users': 'Controlez comptes et droits d acces',
  '/superadmin/leaves': 'Suivez les conges inter-entreprises',
  '/superadmin/absences': 'Analysez les absences globales',
  '/superadmin/metrics': 'Consultez les indicateurs cles',
  '/superadmin/exports': 'Generez des exports consolides',
  '/superadmin/holidays': 'Parametrez les jours feries globaux',
  '/superadmin/notifications': 'Supervisez les notifications systeme',
  '/superadmin/audit': 'Tracez les actions sensibles',
  '/superadmin/settings': 'Ajustez les reglages plateforme',
  '/help': 'Accedez a la documentation',
};

const SuperAdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showSidebar, setShowSidebar] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const menuItems = getNavigationForRole('super_admin');
  const primaryItems = menuItems.filter(i => i.section === 'primary');
  const secondaryItems = menuItems.filter(i => i.section === 'secondary');
  const bottomNavItems = [...primaryItems.slice(0, 4), { path: '__more__', label: 'Plus', icon: 'more', section: 'bottom' }];

  const initials = [user?.prenom?.[0], user?.nom?.[0]].filter(Boolean).join('').toUpperCase() || '?';

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await notificationsService.getAll({ non_lu: 'true', page: 1, limit: 1 });
        setUnreadNotifications(Number(res.data?.pagination?.total) || 0);
      } catch (err) { console.error(err); }
    };

    const handleUpdate = e => {
      const count = Number(e?.detail?.unreadCount);
      if (Number.isFinite(count)) setUnreadNotifications(Math.max(0, count));
      else fetchUnread();
    };

    if (user) fetchUnread();
    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, handleUpdate);
  }, [user]);

  const handleLogout = () => { logout(); navigate('/login'); };
  const isActive = path => location.pathname === path || location.pathname.startsWith(`${path}/`);
  const activeItem = menuItems.find(item => isActive(item.path));
  const topbarNoteText = activeItem
    ? (superadminTopbarNotes[activeItem.path] || `Section ${activeItem.label}`)
    : 'Vue globale securisee';

  const renderSidebarContent = (closeSidebar = false) => (
    <>
      <div className="mb-3">
        <div className="fw-bold" style={{ color: 'var(--dk-text)' }}>{user?.prenom} {user?.nom}</div>
        <small style={{ color: 'var(--dk-text-muted)' }}>SuperAdmin</small>
        <div className="mt-2">
          <span className="status-badge status-badge--info" style={{ fontSize: '0.7rem' }}>SuperAdmin</span>
        </div>
      </div>

      <div className="sidebar-section-label">Essentiel</div>
      <Nav className="flex-column mb-2">
        {primaryItems.map(item => {
          const Icon = iconMap[item.icon] || FaShieldAlt;
          const badge = item.badgeKey === 'notifications' ? unreadNotifications : null;
          return (
            <Nav.Link
              key={item.path}
              onClick={() => { navigate(item.path); closeSidebar && setShowSidebar(false); }}
              className={`sidebar-link role-nav-link d-flex align-items-center gap-2 mb-1${isActive(item.path) ? ' active' : ''}`}
            >
              <Icon size={14} />
              <span>{item.label}</span>
              {badge > 0 && <Badge bg="danger" className="ms-auto" pill>{badge > 9 ? '9+' : badge}</Badge>}
            </Nav.Link>
          );
        })}
      </Nav>

      <div className="sidebar-section-label">Outils</div>
      <Nav className="flex-column mb-3">
        {secondaryItems.map(item => {
          const Icon = iconMap[item.icon] || FaShieldAlt;
          return (
            <Nav.Link
              key={item.path}
              onClick={() => { navigate(item.path); closeSidebar && setShowSidebar(false); }}
              className={`sidebar-link role-nav-link d-flex align-items-center gap-2 mb-1${isActive(item.path) ? ' active' : ''}`}
            >
              <Icon size={14} />
              <span>{item.label}</span>
            </Nav.Link>
          );
        })}
      </Nav>

      <Button variant="outline-danger" size="sm" className="w-100" onClick={handleLogout}>
        <FaSignOutAlt className="me-2" />Déconnexion
      </Button>
    </>
  );

  return (
    <div className="app-shell role-shell role-super_admin">
      {/* Desktop sidebar */}
      <aside className="sidebar role-sidebar flex-column p-3">
        <div className="sidebar-logo mb-2">
          <FaShieldAlt style={{ color: 'var(--accent-purple, #a78bfa)', marginRight: 8 }} size={16} />
          Team<span>Off</span>
        </div>
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile offcanvas */}
      <Offcanvas show={showSidebar} onHide={() => setShowSidebar(false)}>
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>
            <FaShieldAlt size={18} style={{ color: '#a78bfa', marginRight: 8 }} />SuperAdmin
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>{renderSidebarContent(true)}</Offcanvas.Body>
      </Offcanvas>

      <div className="main-area">
        {/* Mobile topbar */}
        <div className="topbar d-lg-none">
          <span className="topbar-logo">Team<span>Off</span></span>
          <div className="d-flex align-items-center gap-2">
            <button className="topbar-icon-btn" onClick={() => navigate('/superadmin/notifications')} aria-label="Notifications" style={{ position: 'relative' }}>
              <FaBell size={14} style={{ color: 'rgba(241,241,243,0.7)' }} />
              {unreadNotifications > 0 && <span className="nav-badge" />}
            </button>
            <button className="topbar-avatar" onClick={() => setShowSidebar(true)} aria-label="Menu">
              {initials}
            </button>
          </div>
        </div>

        {/* Desktop topbar */}
        <div className="role-topbar desktop-topbar d-none d-lg-flex align-items-center px-3" style={{ gap: '0.5rem' }}>
          <FaShieldAlt size={16} style={{ color: '#a78bfa', flexShrink: 0 }} />
          <span style={{ fontWeight: 700, color: 'var(--dk-text)', fontSize: '0.95rem' }}>Panel SuperAdmin</span>
          <span className="role-topbar-note ms-auto">{topbarNoteText}</span>
        </div>

        <main className="page-content role-content superadmin-content">
          <Outlet />
        </main>

        <AppFooter isSuperAdmin />
      </div>

      {/* Mobile bottom nav */}
      <nav className="bottom-nav" role="navigation" aria-label="Navigation SuperAdmin">
        {bottomNavItems.map(item => {
          const Icon = iconMap[item.icon] || FaShieldAlt;
          const isMore = item.path === '__more__';
          const active = !isMore && isActive(item.path);
          const badge = item.badgeKey === 'notifications' ? unreadNotifications : 0;

          return (
            <button key={item.path}
              className={`nav-item${active ? ' active' : ''}`}
              onClick={() => isMore ? setShowSidebar(true) : navigate(item.path)}
              aria-label={item.label}
            >
              <span className="nav-icon" style={{ position: 'relative' }}>
                <Icon size={18} />
                {badge > 0 && <span className="nav-badge" />}
              </span>
              <span className="nav-label">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default SuperAdminLayout;
