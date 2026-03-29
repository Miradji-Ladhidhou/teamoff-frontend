import React, { useContext } from 'react';
import { AlertContext } from '../../contexts/AlertContext';
import { alertService } from '../../services/alertService';
import { FaCheckCircle, FaTimesCircle, FaInfoCircle, FaTimes } from 'react-icons/fa';
import './AlertSystem.css';

/**
 * ToastContainer - Affiche les toasts flottants centrés
 * Position: center
 * Animations: fade + slide
 * Stack: vertical avec espacement
 */

const getToastIcon = (type) => {
  switch (type) {
    case 'success':
      return <FaCheckCircle className="toast-icon toast-icon-success" />;
    case 'error':
      return <FaTimesCircle className="toast-icon toast-icon-error" />;
    case 'info':
      return <FaInfoCircle className="toast-icon toast-icon-info" />;
    default:
      return <FaInfoCircle className="toast-icon toast-icon-info" />;
  }
};

const getToastStyles = (type) => {
  const baseClasses = 'toast-item';
  const typeClass = `toast-${type}`;
  return `${baseClasses} ${typeClass}`;
};

const Toast = ({ toastData, onRemove, onPause, onResume }) => {
  const { id, message, type } = toastData;

  const handleMouseEnter = () => {
    onPause(id);
  };

  const handleMouseLeave = () => {
    onResume(id);
  };

  const handleClose = () => {
    onRemove(id);
  };

  return (
    <div
      className={getToastStyles(type)}
      role="alert"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      aria-live="polite"
    >
      <div className="toast-content">
        <div className="toast-icon-wrapper">
          {getToastIcon(type)}
        </div>
        <div className="toast-message">
          {message}
        </div>
        <button
          className="toast-close-btn"
          onClick={handleClose}
          aria-label="Fermer l'alerte"
          type="button"
        >
          <FaTimes />
        </button>
      </div>
    </div>
  );
};

const ToastContainer = () => {
  const { toasts } = useContext(AlertContext);

  const handleRemoveToast = (id) => {
    alertService.removeToast(id);
  };

  const handlePauseToast = (id) => {
    alertService.pauseToast(id);
  };

  const handleResumeToast = (id) => {
    alertService.resumeToast(id);
  };

  if (!toasts || toasts.length === 0) {
    return null;
  }

  return (
    <div className="toast-container" role="region" aria-label="Notifications">
      {toasts.map((toastData) => (
        <Toast
          key={toastData.id}
          toastData={toastData}
          onRemove={handleRemoveToast}
          onPause={handlePauseToast}
          onResume={handleResumeToast}
        />
      ))}
    </div>
  );
};

export default ToastContainer;
