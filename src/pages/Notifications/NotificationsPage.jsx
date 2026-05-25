import './notifications.css';
import React, { useState, useEffect } from 'react';
import { Container, Card, Button, Spinner, Pagination, Form } from 'react-bootstrap';
import { FaBell, FaCheck, FaCheckDouble } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { notificationsService } from '../../services/api';
import { useAlert } from '../../hooks/useAlert';

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
    try {
      await notificationsService.markAllAsRead();
      await loadNotifications();
    } catch (err) {
      console.error('Erreur marquage toutes notifications:', err);
      alert.error('Erreur lors du marquage de toutes les notifications');
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

  const handleOpenNotification = async (notification) => {
    const targetUrl = getNotificationTargetUrl(notification);
    if (!targetUrl) return;
    try {
      if (!notification.lu) await notificationsService.markAsRead(notification.id);
    } catch (err) {
      console.error('Erreur marquage notification au clic:', err);
    } finally {
      await loadNotifications();
      navigate(targetUrl);
    }
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

  if (loading) {
    return (
      <Container fluid="sm" className="page-loading">
        <div className="text-center">
          <Spinner animation="border" variant="primary" className="mb-3" />
          <p className="text-muted">Chargement des notifications...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid="sm">
      <div className="page-title-bar">
        <span className="section-title-bar__text">Notifications</span>
        {notifications.some(n => !n.lu) && (
          <Button variant="link" size="sm" onClick={handleMarkAllAsRead} className="section-title-bar__action p-0 d-flex align-items-center gap-1">
            <FaCheckDouble size={12} /> Tout lire
          </Button>
        )}
      </div>

      {/* Filter chips */}
      <div className="chips-row pb-0 mb-3">
        {filterChips.map((chip) => (
          <button
            key={chip.value}
            type="button"
            className={`chip${filterChip === chip.value ? ' active' : ''}`}
            onClick={() => setFilterChip(chip.value)}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <Card>
        <Card.Header className="d-flex flex-wrap justify-content-end align-items-center gap-2">
          <small className="text-muted">Par page</small>
          <Form.Select
            size="sm"
            className="notifications-items-per-page"
            value={itemsPerPage}
            onChange={handleItemsPerPageChange}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
          </Form.Select>
        </Card.Header>

        <Card.Body className="p-0">
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
                    className={`list-group-item${!notification.lu ? ' bg-light' : ''}${isClickable ? ' cursor-pointer' : ''}`}
                    onClick={() => isClickable && handleOpenNotification(notification)}
                    role={isClickable ? 'button' : undefined}
                    tabIndex={isClickable ? 0 : undefined}
                    onKeyDown={(e) => {
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
                          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text, var(--dk-text))' }}>
                            {notification.title || 'Notification'}
                          </div>
                          <div className="d-flex align-items-center gap-2 flex-shrink-0">
                            {!notification.lu && <span className="badge info">Non lu</span>}
                            {!notification.lu && (
                              <Button
                                variant="link"
                                size="sm"
                                className="p-0"
                                title="Marquer comme lu"
                                style={{ color: 'var(--accent-blue, var(--dk-accent))' }}
                                onClick={(e) => { e.stopPropagation(); handleMarkAsRead(notification.id); }}
                              >
                                <FaCheck size={11} />
                              </Button>
                            )}
                          </div>
                        </div>

                        <div style={{ fontSize: '10px', color: 'var(--text-soft, var(--dk-text-soft))', marginBottom: 3 }}>
                          {notification.message}
                        </div>

                        {(demandeur || entrepriseNom) && (
                          <div style={{ fontSize: '9px', color: 'var(--text-muted, var(--dk-text-muted))', marginBottom: 3 }}>
                            {demandeur && <span>De : {demandeur}</span>}
                            {demandeur && entrepriseNom && <span className="mx-1">·</span>}
                            {entrepriseNom && <span>{entrepriseNom}</span>}
                          </div>
                        )}

                        <div style={{ fontSize: '9px', color: 'var(--text-muted, var(--dk-text-muted))' }}>
                          {formatNotificationDate(notification)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card.Body>

        {totalItems > 0 && totalPages > 1 && (
          <Card.Footer className="d-flex flex-column flex-sm-row justify-content-between align-items-center gap-2">
            <small className="text-muted">{startIndex}–{endIndex} sur {totalItems}</small>
            <Pagination className="mb-0 flex-wrap justify-content-center">
              <Pagination.First onClick={() => setCurrentPage(1)} disabled={currentPage === 1} />
              <Pagination.Prev onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1} />
              {Array.from({ length: Math.min(5, totalPages) }).map((_, index) => {
                const page = Math.max(1, currentPage - 2) + index;
                if (page > totalPages) return null;
                return (
                  <Pagination.Item key={page} active={page === currentPage} onClick={() => setCurrentPage(page)}>
                    {page}
                  </Pagination.Item>
                );
              })}
              <Pagination.Next onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages} />
              <Pagination.Last onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} />
            </Pagination>
          </Card.Footer>
        )}
      </Card>
    </Container>
  );
};

export default NotificationsPage;
