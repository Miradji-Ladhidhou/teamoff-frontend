import React, { useContext, useEffect, useCallback } from 'react';
import { AlertContext } from '../../contexts/AlertContext';
import { FaTimes } from 'react-icons/fa';
import './AlertSystem.css';

/**
 * ConfirmationModal - Modale de confirmation centrée via overlay flex.
 * La modale est à l'INTÉRIEUR de l'overlay → centrage garanti sans transform hack.
 */
const ConfirmationModal = () => {
  const { modal } = useContext(AlertContext);
  const isNotification = modal?.kind === 'notification';

  useEffect(() => {
    if (!modal) return;
    const t = setTimeout(() => {
      const btn = document.querySelector('[data-modal-primary]');
      if (btn) btn.focus();
    }, 50);
    return () => clearTimeout(t);
  }, [modal]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape' && modal.closeOnEsc !== false && modal.dismissible !== false) {
        e.preventDefault();
        modal.onCancel();
      }
      if (e.key === 'Enter' && e.target.dataset.modalPrimary) {
        e.preventDefault();
        modal.onConfirm();
      }
    },
    [modal],
  );

  if (!modal) return null;

  const modalClasses = `confirmation-modal${modal.danger ? ' modal-danger' : ''}${isNotification ? ' modal-notification' : ''}${isNotification ? ` modal-notification-${modal.type || 'info'}` : ''}`;

  const handleOverlayClick = () => {
    if (modal.closeOnOverlay === false || modal.dismissible === false) {
      return;
    }
    modal.onCancel();
  };

  return (
    /* L'overlay est le flex-container qui centre la modale */
    <div
      className="modal-overlay"
      onClick={handleOverlayClick}
      role="presentation"
    >
      <div
        className={modalClasses}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <h2 id="modal-title" className="modal-title">
            {modal.title}
          </h2>
          {modal.dismissible !== false && (
            <button
              className="modal-close-btn"
              onClick={modal.onCancel}
              aria-label="Fermer la modale"
              type="button"
            >
              <FaTimes />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="modal-body">
          <p id="modal-description" className="modal-description">
            {modal.description}
          </p>
        </div>

        {/* Footer — mobile: colonne, desktop: ligne */}
        <div className="modal-footer">
          {modal.showCancel !== false && (
            <button
              className="modal-btn modal-btn-cancel"
              onClick={modal.onCancel}
              type="button"
            >
              {modal.cancelLabel}
            </button>
          )}
          <button
            className={`modal-btn modal-btn-confirm${modal.danger ? ' modal-btn-danger' : ''}`}
            onClick={modal.onConfirm}
            type="button"
            data-modal-primary
          >
            {modal.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
