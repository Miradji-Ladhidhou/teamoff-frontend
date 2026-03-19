import React, { useContext } from 'react';
import { Alert } from 'react-bootstrap';
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaTimesCircle } from 'react-icons/fa';
import { NotificationContext } from '../../contexts/NotificationContext';

const FloatingNotification = () => {
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

  const getVariant = (type) => {
    switch (type) {
      case 'error':
        return 'danger';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      default:
        return 'success';
    }
  };

  return (
    <Alert
      variant={getVariant(notification?.type)}
      className={`floating-system-alert ${notification?.type === 'success' ? 'floating-success-alert' : `floating-system-alert-${notification?.type || 'info'}`}`}
      dismissible
      onClose={hideNotification}
    >
      <div className="d-flex align-items-start gap-2">
        <span className="mt-1">{getIcon(notification?.type)}</span>
        <div>
          <div className="fw-bold mb-1">{getTitle(notification?.type)}</div>
          <div>{notification?.message}</div>
        </div>
      </div>
    </Alert>
  );
};

export default FloatingNotification;
