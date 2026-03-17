import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Alert, Spinner, Pagination, Form } from 'react-bootstrap';
import { FaBell, FaCheck, FaCheckDouble } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { notificationsService } from '../services/api';
import { InfoCardInfo, TipCard } from '../components/InfoCard';

const NotificationsPage = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadNotifications();
  }, [currentPage, itemsPerPage]);

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
    } catch (err) {
      console.error('Erreur chargement notifications:', err);
      setError('Erreur lors du chargement des notifications');
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
      setError('Erreur lors du marquage de la notification');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsService.markAllAsRead();
      await loadNotifications();
    } catch (err) {
      console.error('Erreur marquage toutes notifications:', err);
      setError('Erreur lors du marquage de toutes les notifications');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getNotificationIcon = (type) => {
    // Vous pouvez personnaliser les icônes selon le type de notification
    return <FaBell />;
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
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <div className="text-center">
          <Spinner animation="border" variant="primary" className="mb-3" />
          <p className="text-muted">Chargement des notifications...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-1">Notifications</h1>
          <p className="text-muted">Vos notifications et mises à jour</p>
        </div>
        {notifications.some(n => !n.lu) && (
          <Button
            variant="outline-success"
            onClick={handleMarkAllAsRead}
            className="d-flex align-items-center"
          >
            <FaCheckDouble className="me-2" />
            Tout marquer comme lu
          </Button>
        )}
      </div>

      <InfoCardInfo title="Comment lire vos notifications">
        <p className="mb-2">
          Cette page centralise les événements importants: validation/refus de congé,
          rappels d'actions et messages système.
        </p>
        <ul className="mb-0">
          <li>Badge "Non lu" : notification à traiter</li>
          <li>Bouton "Marquer comme lu" : nettoyage rapide</li>
          <li>"Tout marquer comme lu" : remise à zéro de la liste</li>
        </ul>
      </InfoCardInfo>

      <TipCard title="Conseil d'organisation">
        Consultez cette page au début de journée pour ne manquer aucune validation ou action prioritaire.
      </TipCard>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}

      <Card>
        <Card.Header className="d-flex justify-content-between align-items-center">
          <small className="text-muted">
            Affichage {startIndex}-{endIndex} sur {totalItems} notification(s)
          </small>
          <div className="d-flex align-items-center gap-2">
            <small className="text-muted">Par page</small>
            <Form.Select size="sm" style={{ width: 90 }} value={itemsPerPage} onChange={handleItemsPerPageChange}>
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
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`list-group-item d-flex justify-content-between align-items-start ${
                    !notification.lu ? 'bg-light' : ''
                  }`}
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
                      <small className="text-muted">
                        {formatDate(notification.createdAt)}
                      </small>
                    </div>
                  </div>
                  <div>
                    {!notification.lu && (
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="d-flex align-items-center"
                      >
                        <FaCheck className="me-1" />
                        Marquer comme lu
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card.Body>
        {totalItems > 0 && totalPages > 1 && (
          <Card.Footer className="d-flex justify-content-center">
            <Pagination className="mb-0">
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