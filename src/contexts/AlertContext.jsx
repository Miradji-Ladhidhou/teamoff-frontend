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
  openConfirmation: () => {},
  closeConfirmation: () => {},
  toasts: [],
  modal: null,
});

export const AlertProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [modal, setModal] = useState(null);

  // Synchroniser les toasts avec le service
  useEffect(() => {
    const handleToastAdded = (toastData) => {
      setToasts(current => [...current, toastData]);
    };

    const handleToastRemoved = ({ id }) => {
      setToasts(current => current.filter(t => t.id !== id));
    };

    const handleToastCleared = () => {
      setToasts([]);
    };

    alertService.on('toastAdded', handleToastAdded);
    alertService.on('toastRemoved', handleToastRemoved);
    alertService.on('toastCleared', handleToastCleared);

    return () => {
      alertService.off('toastAdded', handleToastAdded);
      alertService.off('toastRemoved', handleToastRemoved);
      alertService.off('toastCleared', handleToastCleared);
    };
  }, []);

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
    // Toast functions
    showSuccess,
    showError,
    showInfo,
    
    // Modal/Confirmation functions
    openConfirmation,
    closeConfirmation,
    
    // State
    toasts,
    modal,
  };

  return (
    <AlertContext.Provider value={value}>
      {children}
    </AlertContext.Provider>
  );
};
