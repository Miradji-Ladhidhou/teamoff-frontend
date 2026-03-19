import React, { useContext, useEffect } from 'react';
import { NotificationContext } from '../../contexts/NotificationContext';
import { alertService } from '../../services/alertService';

/**
 * FloatingNotification - Adapter pour transformer les notifications de NotificationContext
 * vers le système centralisé AlertSystem (bottom-center)
 * 
 * Ce composant écoute le contexte old-style et mappe vers alertService
 * pour une migration progressive
 */

const FloatingNotification = () => {
  const { notification, hideNotification } = useContext(NotificationContext);

  useEffect(() => {
    // Si une nouvelle notification arrive, l'ajouter via alertService
    if (notification?.message && notification?.type) {
      // Mappe les types de notification
      const toastType = notification.type === 'success' 
        ? 'success' 
        : notification.type === 'error' 
        ? 'error' 
        : 'info';

      // Ajoute le toast via le système centralisé
      alertService.addToast(notification.message, toastType, 4000);

      // Cache la notification du contexte old-style
      hideNotification();
    }
  }, [notification, hideNotification]);

  // Ce composant n'affiche rien - tout passe par AlertSystem
  return null;
};

export default FloatingNotification;
