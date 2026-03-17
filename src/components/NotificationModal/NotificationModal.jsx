import React, { useContext } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaTimesCircle } from 'react-icons/fa';
import { NotificationContext } from '../../contexts/NotificationContext';
import './NotificationModal.css';

const NotificationModal = () => {
  const { notification, hideNotification } = useContext(NotificationContext);

  if (!notification) return null;

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <FaCheckCircle className="notification-icon success" />;
      case 'error':
        return <FaTimesCircle className="notification-icon error" />;
      case 'info':
        return <FaInfoCircle className="notification-icon info" />;
      case 'warning':
        return <FaExclamationCircle className="notification-icon warning" />;
      default:
        return <FaCheckCircle className="notification-icon success" />;
    }
  };

  const getTitle = (type) => {
    switch (type) {
      case 'success':
        return 'Succès';
      case 'error':
        return 'Erreur';
      case 'info':
        return 'Information';
      case 'warning':
        return 'Attention';
      default:
        return 'Notification';
    }
  };

  return (
    <Modal show={!!notification} onHide={hideNotification} centered size="sm" className={`notification-modal ${notification?.type}`}>
      <Modal.Header closeButton className={`notification-header ${notification?.type}`}>
        <div className="notification-header-content">
          {getIcon(notification?.type)}
          <span className="notification-title">{getTitle(notification?.type)}</span>
        </div>
      </Modal.Header>
      <Modal.Body className="notification-body">
        <p>{notification?.message}</p>
      </Modal.Body>
      <Modal.Footer className="notification-footer">
        <Button
          variant={notification?.type === 'error' ? 'danger' : notification?.type === 'warning' ? 'warning' : 'success'}
          onClick={hideNotification}
          className="notification-btn"
        >
          Fermer
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default NotificationModal;
