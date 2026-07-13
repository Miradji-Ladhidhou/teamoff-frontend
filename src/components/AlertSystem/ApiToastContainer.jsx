import React, { useState, useEffect } from 'react';
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaTimes } from 'react-icons/fa';
import { toastService } from '../../services/toastService';

const ICONS = {
  success: <FaCheckCircle className="toast-icon toast-icon-success" />,
  error:   <FaExclamationCircle className="toast-icon toast-icon-error" />,
  info:    <FaInfoCircle className="toast-icon toast-icon-info" />,
};

const ApiToastContainer = () => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    return toastService.subscribe(setToasts);
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast-item toast-${t.type}`}>
          <div className="toast-content">
            <div className="toast-icon-wrapper">
              {ICONS[t.type] || ICONS.info}
            </div>
            <span className="toast-message">{t.message}</span>
          </div>
          <button
            className="toast-close-btn"
            onClick={() => toastService.remove(t.id)}
            aria-label="Fermer"
            type="button"
          >
            <FaTimes />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ApiToastContainer;
