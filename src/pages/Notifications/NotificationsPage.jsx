import './notifications.css';
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Alert, Spinner, Pagination, Form } from 'react-bootstrap';
import { FaBell, FaCheck, FaCheckDouble } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { notificationsService } from '../../services/api';
import AccordionInfo from '../../components/AccordionInfo';
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
      const response = await notificationsService.getAll({
        page: currentPage,
        limit: itemsPerPage,
      });
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

  const getNotificationDateValue = (notification) => {
    return (
      notification?.created_at_display
      || notification?.created_at_iso
      || notification?.createdAt
      || notification?.created_at
      || null
    );
  };

  const getNotificationTimezone = (notification) => {
    const apiTimezone = typeof notification?.timezone === 'string' ? notification.timezone.trim() : '';
    if (apiTimezone) {
      return apiTimezone;
    }

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

      const tzPart = parts.find((part) => part.type === 'timeZoneName')?.value || 'UTC';
      const normalized = tzPart.replace('GMT', 'UTC').trim();
      return normalized.startsWith('UTC') ? normalized : 'UTC';
    } catch (error) {
      return 'UTC';
    }
  };

  const getTimezoneFriendlyLabel = (timezone) => {
    if (TIMEZONE_LABELS[timezone]) {
      return TIMEZONE_LABELS[timezone];
    }

    const maybeCity = timezone.split('/').pop() || timezone;
    return maybeCity.replace(/_/g, ' ');
  };

  const formatNotificationDateBlock = (notification) => {
    const dateValue = getNotificationDateValue(notification);
    if (!dateValue) {
      return {
        timeLine: '-',
        dateLine: '-',
        timezoneLine: 'Heure',
      };
    }

    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) {
      return {
        timeLine: '-',
        dateLine: '-',
        timezoneLine: 'Heure',
      };
    }

    const timezone = getNotificationTimezone(notification);
    const timeLine = new Intl.DateTimeFormat('fr-FR', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(parsed);

    const dateOnly = new Intl.DateTimeFormat('fr-FR', {
      timeZone: timezone,
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(parsed);

    const utcOffset = formatUtcOffset(parsed, timezone);
    const timezoneLabel = getTimezoneFriendlyLabel(timezone);

    return {
      timeLine,
      dateLine: `${dateOnly} (${utcOffset})`,
      timezoneLine: `Heure (${timezoneLabel})`,
    };
  };

  const formatDate = (dateValue) => {
    if (!dateValue) {
      return '-';
    }

    if (typeof dateValue === 'string') {
      if (/^\d{2}\/\d{2}\/\d{4}\s\d{2}:\d{2}(:\d{2})?$/.test(dateValue.trim())) {
        return dateValue.trim();
      }

      const match = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
      if (match) {
        const [, year, month, day, hour, minute] = match;
        return `${day}/${month}/${year} ${hour}:${minute}`;
      }
    }

    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) {
      return '-';
    }

    return parsed.toLocaleString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const getNotificationTargetUrl = (notification) => {
    const rawUrl = (notification?.url || '').trim();
    if (!rawUrl) {
      return null;
    }

    // Les notifications de congé sont stockées en /conges/:id côté backend.
    // On remappe pour le super admin vers sa route dédiée.
    if (user?.role === 'super_admin') {
      const match = rawUrl.match(/^\/conges\/([^/]+)$/);
      if (match?.[1]) {
        return `/superadmin/leaves/${match[1]}`;
      }
    }

    return rawUrl;
  };

  const handleOpenNotification = async (notification) => {
    const targetUrl = getNotificationTargetUrl(notification);
    if (!targetUrl) {
      return;
    }

    try {
      if (!notification.lu) {
        await notificationsService.markAsRead(notification.id);
      }
    } catch (err) {
      console.error('Erreur marquage notification au clic:', err);
    } finally {
      await loadNotifications();
      navigate(targetUrl);
    }
  };

  const getNotificationIcon = (type) => {
    // Vous pouvez personnaliser les icônes selon le type de notification
    return <FaBell />;
  };

  const getDemandeurFromMessage = (message) => {
    if (typeof message !== 'string') {
      return null;
    }

    const match = message.match(/Nouvelle demande de congé de\s+(.+?)\s*\(/i);
    if (!match?.[1]) {
      return null;
    }

    const fullName = match[1].trim();
    return fullName || null;
  };

  const handleItemsPerPageChange = (e) => {
    const next = Number(e.target.value);
    setItemsPerPage(next);
    setCurrentPage(1);
  };

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
      <div className="page-header">
        <div>
          <h1 className="h3 mb-1">Notifications</h1>
          <p className="text-muted">Vos notifications et mises à jour</p>
        </div>
        {notifications.some(n => !n.lu) && (
          <Button
            variant="outline-success"
            onClick={handleMarkAllAsRead}
            className="d-flex align-items-center justify-content-center"
          >
            <FaCheckDouble className="me-2" />
            Tout marquer comme lu
          </Button>
        )}
      </div>

      <AccordionInfo type="info" title="Comment lire vos notifications">
        <p className="mb-2">
          Cette page centralise les événements importants: validation/refus de congé,
          rappels d'actions et messages système.
        </p>
        <ul className="mb-0">
          <li>Badge "Non lu" : notification à traiter</li>
          <li>Bouton "Marquer comme lu" : nettoyage rapide</li>
          <li>"Tout marquer comme lu" : remise à zéro de la liste</li>
        </ul>
      </AccordionInfo>

      <AccordionInfo type="tip" title="Conseil d'organisation">
        Consultez cette page au début de journée pour ne manquer aucune validation ou action prioritaire.
      </AccordionInfo>

      

      <Card>
        <Card.Header className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2">
          <div className="d-flex align-items-center gap-2 ms-sm-auto">
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
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          {notifications.length === 0 ? (
            <div className="text-center py-5">
              <FaBell size={48} className="text-muted mb-3" />
              <h5 className="text-muted">Aucune notification</h5>
              <p className="text-muted">Vous n'avez pas encore de notifications</p>
            </div>
          ) : (
            <div className="list-group list-group-flush">
              {notifications.map((notification) => {
                const targetUrl = getNotificationTargetUrl(notification);
                const isClickable = Boolean(targetUrl);
                const demandeur = getDemandeurFromMessage(notification.message);
                const entrepriseNom = notification.entreprise_nom || user?.entreprise_nom || null;

                return (
                <div
                  key={notification.id}
                  className={`list-group-item d-flex flex-column flex-md-row justify-content-between align-items-start gap-3 ${
                    !notification.lu ? 'bg-light' : ''
                  } ${
                    isClickable ? 'cursor-pointer' : ''
                  }`}
                  onClick={() => {
                    if (isClickable) {
                      handleOpenNotification(notification);
                    }
                  }}
                  role={isClickable ? 'button' : undefined}
                  tabIndex={isClickable ? 0 : undefined}
                  onKeyDown={(event) => {
                    if (!isClickable) {
                      return;
                    }

                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleOpenNotification(notification);
                    }
                  }}
                >
                  <div className="d-flex align-items-start">
                    <div className="me-3 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center mb-1">
                        <h6 className="mb-0 me-2">{notification.title || 'Notification'}</h6>
                        {!notification.lu && <Badge bg="primary" pill>Non lu</Badge>}
                      </div>
                      <p className="mb-1 text-muted">{notification.message}</p>
                      {(demandeur || entrepriseNom) && (
                        <div className="small text-muted">
                          {demandeur && <div>Demandeur: {demandeur}</div>}
                          {entrepriseNom && <div>Entreprise: {entrepriseNom}</div>}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="w-100 d-flex justify-content-end">
                    {!notification.lu && (
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleMarkAsRead(notification.id);
                        }}
                        className="d-flex align-items-center justify-content-center w-100"
                      >
                        <FaCheck className="me-1" />
                        Marquer comme lu
                      </Button>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </Card.Body>
        {totalItems > 0 && totalPages > 1 && (
          <Card.Footer className="d-flex flex-column flex-sm-row justify-content-between align-items-center gap-2">
            <small className="text-muted">
              {startIndex}-{endIndex} sur {totalItems}
            </small>
            <Pagination className="mb-0 flex-wrap justify-content-center">
              <Pagination.First onClick={() => setCurrentPage(1)} disabled={currentPage === 1} />
              <Pagination.Prev onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1} />
              {Array.from({ length: Math.min(5, totalPages) }).map((_, index) => {
                const page = Math.max(1, currentPage - 2) + index;
                if (page > totalPages) return null;
                return (
                  <Pagination.Item
                    key={page}
                    active={page === currentPage}
                    onClick={() => setCurrentPage(page)}
                  >
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