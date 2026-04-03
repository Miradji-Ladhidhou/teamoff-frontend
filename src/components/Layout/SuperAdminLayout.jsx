import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Navbar, Nav, Offcanvas, Button, Badge } from 'react-bootstrap';
import {
  FaBars, FaSignOutAlt, FaShieldAlt, FaHome, FaBuilding, FaUsers,
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
  const topbarNote = menuItems.find(item => isActive(item.path));
  const topbarNoteText = topbarNote
    ? (superadminTopbarNotes[topbarNote.path] || `Section ${topbarNote.label}`)
    : 'Vue globale securisee';

  const renderMenuItem = (item, closeSidebar = false) => {
    const Icon = iconMap[item.icon] || FaShieldAlt;
    const badge = item.badgeKey === 'notifications' ? unreadNotifications : null;

    return (
      <Nav.Link
        key={item.path}
        onClick={() => { navigate(item.path); closeSidebar && setShowSidebar(false); }}
        className={`mb-2 d-flex align-items-center cursor-pointer px-2 py-2 rounded ${isActive(item.path) ? 'bg-primary text-white' : ''} ${closeSidebar ? '' : 'text-white'}`}
      >
        <Icon className="me-3" size={18} />
        <span>{item.label}</span>
        {badge > 0 && <Badge bg="danger" className="ms-auto" pill>{badge}</Badge>}
      </Nav.Link>
    );
  };

  const renderSidebar = (closeSidebar = false) => (
    <Nav className="flex-column">
      {primaryItems.map(i => renderMenuItem(i, closeSidebar))}
      <div className={`text-uppercase small mt-3 mb-2 ${closeSidebar ? 'ui-text-soft' : 'ui-text-on-dark-soft'}`}>Outils</div>
      {secondaryItems.map(i => renderMenuItem(i, closeSidebar))}
    </Nav>
  );

  return (
    <div className="d-flex">
      {/* Sidebar Desktop */}
      <div className="d-none d-md-block bg-dark text-white sidebar-nav p-3">
        <div className="d-flex align-items-center mb-4"><FaShieldAlt size={24} className="text-warning me-2" /><h5 className="mb-0 text-warning">SuperAdmin</h5></div>
        <div className="mb-4"><small className="ui-text-on-dark-soft">Connecté en tant que</small><div className="fw-bold">{user?.prenom} {user?.nom}</div><Badge bg="warning" className="mt-1">SuperAdmin</Badge></div>
        {renderSidebar()}
        <hr className="my-4" />
        <Button variant="outline-light" size="sm" className="w-100" onClick={handleLogout}><FaSignOutAlt className="me-2" />Déconnexion</Button>
      </div>

      {/* Sidebar Mobile */}
      <Offcanvas show={showSidebar} onHide={() => setShowSidebar(false)} className="d-md-none">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title><FaShieldAlt size={20} className="text-warning me-2" />SuperAdmin</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <div className="mb-4"><small className="ui-text-soft">Connecté en tant que</small><div className="fw-bold">{user?.prenom} {user?.nom}</div><Badge bg="warning" className="mt-1">SuperAdmin</Badge></div>
          {renderSidebar(true)}
          <hr className="my-4" />
          <Button variant="outline-danger" size="sm" className="w-100" onClick={handleLogout}><FaSignOutAlt className="me-2" />Déconnexion</Button>
        </Offcanvas.Body>
      </Offcanvas>

      {/* Contenu principal */}
      <div className="flex-grow-1">
        <Navbar bg="light" expand="md" className="border-bottom px-3 superadmin-topbar">
          <Button variant="outline-secondary" size="sm" className="d-md-none me-2" onClick={() => setShowSidebar(true)}><FaBars /></Button>
          <Navbar.Brand className="d-none d-md-block"><FaShieldAlt className="text-warning me-2" />Panel SuperAdmin</Navbar.Brand>
          <Navbar.Collapse className="justify-content-end">
            <div className="d-flex align-items-center superadmin-topbar__meta">
              <small className="superadmin-topbar-note">{topbarNoteText}</small>
            </div>
          </Navbar.Collapse>
        </Navbar>

        <div className="superadmin-content p-4"><Outlet /></div>
        <AppFooter isSuperAdmin />
      </div>

      {/* Bottom nav mobile */}
      <nav className="mobile-bottom-nav d-md-none" role="navigation" aria-label="Navigation SuperAdmin">
        {bottomNavItems.map(item => {
          const Icon = iconMap[item.icon] || FaShieldAlt;
          const isMore = item.path === '__more__';
          const active = !isMore && isActive(item.path);
          const badge = item.badgeKey === 'notifications' ? unreadNotifications : 0;

          return (
            <button key={item.path} className={`mobile-bottom-nav__item${active ? ' active' : ''}`}
              onClick={() => isMore ? setShowSidebar(true) : navigate(item.path)} aria-label={item.label}>
              <span className="mobile-bottom-nav__icon">
                <Icon size={20} />
                {badge > 0 && <span className="mobile-bottom-nav__badge">{badge > 9 ? '9+' : badge}</span>}
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