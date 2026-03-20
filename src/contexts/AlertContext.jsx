import React, { createContext, useCallback, useEffect, useState } from 'react';
import { alertService } from '../services/alertService';

/**
 * AlertContext - Centralise la gestion globale des alertes
 * Expose showSuccess, showError, showWarning, confirm
 */

export const AlertContext = createContext({
  showSuccess: () => {},
  showError: () => {},
  showInfo: () => {},
  showSuccessModal: () => {},
  showErrorModal: () => {},
  openConfirmation: () => {},
  closeConfirmation: () => {},
  modal: null,
});

export const AlertProvider = ({ children }) => {
  const [modal, setModal] = useState(null);

  // Synchroniser la modale avec le service
  useEffect(() => {
    const handleModalOpened = (modalData) => {
      setModal(modalData);
    };

    const handleModalClosed = () => {
      setModal(null);
    };

    alertService.on('modalOpened', handleModalOpened);
    alertService.on('modalClosed', handleModalClosed);

    return () => {
      alertService.off('modalOpened', handleModalOpened);
      alertService.off('modalClosed', handleModalClosed);
    };
  }, []);

  // ==================== PUBLIC API ====================

  const showSuccess = useCallback((message, duration = 4000) => {
    alertService.success(message, duration);
  }, []);

  const showError = useCallback((message, duration = 4000) => {
    alertService.error(message, duration);
  }, []);

  const showInfo = useCallback((message, duration = 4000) => {
    alertService.info(message, duration);
  }, []);

  const showSuccessModal = useCallback((message, options = {}) => {
    alertService.showSuccessModal(message, options);
  }, []);

  const showErrorModal = useCallback((message, options = {}) => {
    alertService.showErrorModal(message, options);
  }, []);

  /**
   * Ouvre une modale de confirmation (pour actions critiques)
   * WARNING ne doit JAMAIS être implémenté en toast
   */
  const openConfirmation = useCallback((config = {}) => {
    alertService.openConfirmation(config);
  }, []);

  const closeConfirmation = useCallback(() => {
    alertService.closeModal();
  }, []);

  const value = {
    // Notification functions
    showSuccess,
    showError,
    showInfo,
    showSuccessModal,
    showErrorModal,
    
    // Modal/Confirmation functions
    openConfirmation,
    closeConfirmation,
    
    // State
    modal,
  };

  return (
    <AlertContext.Provider value={value}>
      {children}
    </AlertContext.Provider>
  );
};
