import React, { useContext, useEffect } from 'react';
import { AlertContext } from '../../contexts/AlertContext';
import { FaTimes } from 'react-icons/fa';
import './AlertSystem.css';

/**
 * ConfirmationModal - Modale de confirmation pour actions critiques
 * - Bloquante (focus trap)
 * - Centrée à l'écran
 * - Accessible (role, focus management)
 */

const ConfirmationModal = () => {
  const { modal, closeConfirmation } = useContext(AlertContext);

  // Focus trap - focus sur le bouton "Annuler" par défaut
  useEffect(() => {
    if (modal) {
      // Attendre le rendu
      setTimeout(() => {
        const cancelBtn = document.querySelector('[data-confirm-cancel]');
        if (cancelBtn) {
          cancelBtn.focus();
        }
      }, 50);
    }
  }, [modal]);

  if (!modal) {
    return null;
  }

  const handleKeyDown = (e) => {
    // Échap pour fermer
    if (e.key === 'Escape') {
      e.preventDefault();
      modal.onCancel();
    }
    // Entrée pour confirmer
    if (e.key === 'Enter' && e.target.dataset.confirmConfirm) {
      e.preventDefault();
      modal.onConfirm();
    }
  };

  const modalClasses = `confirmation-modal ${modal.danger ? 'modal-danger' : ''}`;

  return (
    <>
      {/* Overlay bloquant */}
      <div
        className="modal-overlay"
        onClick={modal.onCancel}
        role="presentation"
      />

      {/* Modale */}
      <div
        className={modalClasses}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="modal-header">
          <h2 id="modal-title" className="modal-title">
            {modal.title}
          </h2>
          <button
            className="modal-close-btn"
            onClick={modal.onCancel}
            aria-label="Fermer la modale"
            type="button"
          >
            <FaTimes />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          <p id="modal-description" className="modal-description">
            {modal.description}
          </p>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button
            className="modal-btn modal-btn-cancel"
            onClick={modal.onCancel}
            type="button"
            data-confirm-cancel
          >
            {modal.cancelLabel}
          </button>
          <button
            className={`modal-btn modal-btn-confirm ${modal.danger ? 'modal-btn-danger' : ''}`}
            onClick={modal.onConfirm}
            type="button"
            data-confirm-confirm
          >
            {modal.confirmLabel}
          </button>
        </div>
      </div>
    </>
  );
};

export default ConfirmationModal;
