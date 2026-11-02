import './notifications.css';
import React, { useState, useEffect } from 'react';
import { Container, Button, Spinner, Form } from 'react-bootstrap';
import { FaBell, FaCheck, FaCheckDouble } from 'react-icons/fa';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { notificationsService } from '../../services/api';
import { useAlert } from '../../hooks/useAlert';
import NotificationSettings from './NotificationSettings';

const NOTIFICATIONS_UPDATED_EVENT = 'teamoff:notifications-updated';

const TIMEZONE_LABELS = {
  'Indian/Reunion': 'La Réunion',
  'Europe/Paris': 'Paris',
  'Africa/Abidjan': 'Abidjan',
  'Africa/Casablanca': 'Casablanca',
  'America/Montreal': 'Montréal',
  UTC: 'UTC',
};

const isLeaveNotification = (n) =>
  (n.type || '').toLowerCase().includes('cong')
  || (n.message || '').toLowerCase().includes('congé')
  || (n.url || '').includes('/conges');

const NotificationsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const alert = useAlert();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [filterChip, setFilterChip] = useState('all');
  const [markingAll, setMarkingAll] = useState(false);
  const canConfigure = ['admin_entreprise', 'super_admin'].includes(user?.role);
  const [searchParams, setSearchParams] = useSearchParams();
  const section = canConfigure && searchParams.get('section') === 'settings' ? 'settings' : 'inbox';
  const setSection = value => setSearchParams(current => {
    const next = new URLSearchParams(current);
    if (value === 'settings') next.set('section', 'settings');
    else next.delete('section');
    return next;
  });

  useEffect(() => {
    loadNotifications();
  }, [currentPage, itemsPerPage]);

  const broadcastUnreadCount = (unreadCount) => {
    window.dispatchEvent(new CustomEvent(NOTIFICATIONS_UPDATED_EVENT, {
      detail: { unreadCount: Math.max(0, Number(unreadCount) || 0) }
    }));
  };

  const syncUnreadCount = async () => {
    const response = await notificationsService.getAll({ non_lu: 'true', page: 1, limit: 1 });
    const totalUnread = Number(response.data?.pagination?.total);
    broadcastUnreadCount(Number.isFinite(totalUnread) ? totalUnread : 0);
  };

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await notificationsService.getAll({ page: currentPage, limit: itemsPerPage });
      const items = Array.isArray(response.data?.items) ? response.data.items : [];
      const pagination = response.data?.pagination || {};
      setNotifications(items);
      setTotalItems(Number(pagination.total) || items.length);
      setTotalPages(Number(pagination.totalPages) || 1);
      await syncUnreadCount();
    } catch (err) {
      console.error('Erreur chargement notifications:', err);
      alert.error('Erreur lors du chargement des notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationsService.markAsRead(notificationId);
      await loadNotifications();
    } catch (err) {
      console.error('Erreur marquage notification:', err);
      alert.error('Erreur lors du marquage de la notification');
    }
  };

  const handleMarkAllAsRead = async () => {
    if (markingAll) return;
    setMarkingAll(true);
    try {
      await notificationsService.markAllAsRead();
      await loadNotifications();
    } catch (err) {
      console.error('Erreur marquage toutes notifications:', err);
      alert.error('Erreur lors du marquage de toutes les notifications');
    } finally {
      setMarkingAll(false);
    }
  };

  const getNotificationDateValue = (notification) =>
    notification?.created_at_display
    || notification?.created_at_iso
    || notification?.createdAt
    || notification?.created_at
    || null;

  const getNotificationTimezone = (notification) => {
    const apiTimezone = typeof notification?.timezone === 'string' ? notification.timezone.trim() : '';
    if (apiTimezone) return apiTimezone;
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof browserTimezone === 'string' && browserTimezone.trim() ? browserTimezone.trim() : 'UTC';
  };

  const formatUtcOffset = (date, timezone) => {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        timeZoneName: 'shortOffset',
        hour: '2-digit',
      }).formatToParts(date);
      const tzPart = parts.find((p) => p.type === 'timeZoneName')?.value || 'UTC';
      const normalized = tzPart.replace('GMT', 'UTC').trim();
      return normalized.startsWith('UTC') ? normalized : 'UTC';
    } catch {
      return 'UTC';
    }
  };

  const getTimezoneFriendlyLabel = (timezone) => {
    if (TIMEZONE_LABELS[timezone]) return TIMEZONE_LABELS[timezone];
    const maybeCity = timezone.split('/').pop() || timezone;
    return maybeCity.replace(/_/g, ' ');
  };

  const formatNotificationDate = (notification) => {
    const dateValue = getNotificationDateValue(notification);
    if (!dateValue) return '-';
    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) return '-';
    const timezone = getNotificationTimezone(notification);
    const timeLine = new Intl.DateTimeFormat('fr-FR', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false }).format(parsed);
    const dateOnly = new Intl.DateTimeFormat('fr-FR', { timeZone: timezone, day: '2-digit', month: 'long' }).format(parsed);
    const utcOffset = formatUtcOffset(parsed, timezone);
    const tzLabel = getTimezoneFriendlyLabel(timezone);
    return `${dateOnly} · ${timeLine} (${utcOffset} ${tzLabel})`;
  };

  const getNotificationTargetUrl = (notification) => {
    const rawUrl = (notification?.url || '').trim();
    if (!rawUrl) return null;
    if (user?.role === 'super_admin') {
      const match = rawUrl.match(/^\/conges\/([^/]+)$/);
      if (match?.[1]) return `/superadmin/leaves/${match[1]}`;
    }
    return rawUrl;
  };

  const handleOpenNotification = (notification) => {
    const targetUrl = getNotificationTargetUrl(notification);
    if (!targetUrl) return;
    if (!notification.lu) {
      notificationsService.markAsRead(notification.id).catch(console.error);
      setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, lu: true } : n));
      syncUnreadCount().catch(console.error);
    }
    navigate(targetUrl);
  };

  const getDemandeurFromMessage = (message) => {
    if (typeof message !== 'string') return null;
    const match = message.match(/Nouvelle demande de congé de\s+(.+?)\s*\(/i);
    return match?.[1]?.trim() || null;
  };

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const filterChips = [
    { value: 'all',    label: 'Toutes' },
    { value: 'unread', label: 'Non lues' },
    { value: 'leave',  label: 'Congés' },
    { value: 'system', label: 'Système' },
  ];

  const displayedNotifications = notifications.filter((n) => {
    if (filterChip === 'unread') return !n.lu;
    if (filterChip === 'leave')  return isLeaveNotification(n);
    if (filterChip === 'system') return !isLeaveNotification(n);
    return true;
  });

  const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <Container fluid="sm">
      <div className="page-title-bar">
        <h1 className="section-title-bar__text mb-0">Action et notifications</h1>
        {section === 'inbox' && notifications.some(n => !n.lu) && (
          <Button variant="link" size="sm" onClick={handleMarkAllAsRead} disabled={markingAll} className="section-title-bar__action p-0 d-flex align-items-center gap-1">
            <FaCheckDouble size={14} /> Tout marquer comme lu
          </Button>
        )}
      </div>

      <p className="text-muted">Retrouvez ici les informations et demandes qui vous concernent.</p>
      {canConfigure && (
        <nav className="notif-section-nav" aria-label="Sections des notifications">
          <Button variant={section === 'inbox' ? 'primary' : 'outline-secondary'} aria-pressed={section === 'inbox'}
            aria-controls="notifications-inbox" onClick={() => setSection('inbox')}>Mes notifications</Button>
          <Button variant={section === 'settings' ? 'primary' : 'outline-secondary'} aria-pressed={section === 'settings'}
            aria-controls="notifications-settings" onClick={() => setSection('settings')}>Action et notifications</Button>
        </nav>
      )}
      {canConfigure && (
        <div id="notifications-settings" hidden={section !== 'settings'}>
          <NotificationSettings />
        </div>
      )}
      <section id="notifications-inbox" aria-label="Mes notifications" hidden={canConfigure && section !== 'inbox'}>
      {loading ? (
        <div className="text-center py-4" role="status">
          <Spinner animation="border" variant="primary" className="mb-3" />
          <p className="text-muted">Chargement des notifications...</p>
        </div>
      ) : <>

      {/* Filter chips */}
      <div className="chips-row pb-0 mb-3">
        {filterChips.map((chip) => (
          <button
            key={chip.value}
            type="button"
            aria-pressed={filterChip === chip.value}
            className={`chip${filterChip === chip.value ? ' active' : ''}`}
            onClick={() => { setFilterChip(chip.value); setCurrentPage(1); }}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <div className="notif-list-header">
        <small className="text-muted">Par page</small>
        <Form.Select aria-label="Notifications par page" size="sm" className="notifications-items-per-page" value={itemsPerPage} onChange={handleItemsPerPageChange}>
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={20}>20</option>
        </Form.Select>
      </div>

      <div className="notif-list-wrap">
          {displayedNotifications.length === 0 ? (
            <div className="notif-empty">
              <FaBell size={36} className="mb-3" style={{ opacity: 0.3 }} />
              <div style={{ fontSize: '14px', fontWeight: 600 }}>Aucune notification</div>
              <div style={{ fontSize: '12px', marginTop: 4 }}>
                {filterChip === 'all' ? "Vous n'avez pas encore de notifications" : 'Aucune notification dans cette catégorie'}
              </div>
            </div>
          ) : (
            <div className="list-group list-group-flush">
              {displayedNotifications.map((notification) => {
                const targetUrl = getNotificationTargetUrl(notification);
                const isClickable = Boolean(targetUrl);
                const demandeur = getDemandeurFromMessage(notification.message);
                const entrepriseNom = notification.entreprise_nom || user?.entreprise_nom || null;

                return (
                  <div
                    key={notification.id}
                    className={`list-group-item${isClickable ? ' cursor-pointer' : ''}`}
                    style={!notification.lu ? { background: 'var(--notif-unread-bg, rgba(13,110,253,0.06))' } : undefined}
                    onClick={() => isClickable && handleOpenNotification(notification)}
                    role={isClickable ? 'button' : undefined}
                    tabIndex={isClickable ? 0 : undefined}
                    onKeyDown={(e) => {
                      if (e.target !== e.currentTarget) return;
                      if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        handleOpenNotification(notification);
                      }
                    }}
                  >
                    <div className="d-flex align-items-start gap-3">
                      {/* Icône 32px cercle */}
                      <div className="notif-icon-wrap flex-shrink-0">
                        <FaBell size={14} />
                      </div>

                      {/* Contenu */}
                      <div className="flex-grow-1">
                        <div className="d-flex justify-content-between align-items-start gap-2 mb-1">
                          <div className="notif-item-title">
                            {notification.title || 'Notification'}
                          </div>
                          <div className="d-flex align-items-center gap-2 flex-shrink-0">
                            {!notification.lu && <span className="badge info">Non lu</span>}
                            {!notification.lu && (
                              <Button
                                variant="link"
                                size="sm"
                                className="notif-read-action p-0"
                                title="Marquer comme lu"
                                aria-label={`Marquer comme lu : ${notification.title || 'Notification'}`}
                                style={{ color: 'var(--accent-blue, var(--dk-accent))' }}
                                onClick={(e) => { e.stopPropagation(); handleMarkAsRead(notification.id); }}
                              >
                                <FaCheck size={11} />
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="notif-item-message">
                          {notification.message}
                        </div>

                        {(demandeur || entrepriseNom) && (
                          <div className="notif-item-meta">
                            {demandeur && <span>De : {demandeur}</span>}
                            {demandeur && entrepriseNom && <span className="mx-1">·</span>}
                            {entrepriseNom && <span>{entrepriseNom}</span>}
                          </div>
                        )}

                        <div className="notif-item-meta">
                          {formatNotificationDate(notification)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {totalItems > 0 && totalPages > 1 && (
          <div className="notif-pager">
            <small className="text-muted">{startIndex}–{endIndex} sur {totalItems}</small>
            <div className="d-flex gap-1">
              <Button size="sm" variant="outline-secondary" disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>‹ Préc.</Button>
              <Button size="sm" variant="outline-secondary" disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage + 1)}>Suiv. ›</Button>
            </div>
          </div>
        )}
      </>}
      </section>
    </Container>
  );
};

export default NotificationsPage;
