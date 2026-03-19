import React, { useEffect } from 'react';
import useSocket from '../hooks/useSocket';
import { alertService } from '../services/alertService';

/**
 * NotificationSystem - Affiche les notifications temps réel via WebSocket
 * Utilise le système centralisé AlertSystem avec positionnement bottom-center
 * 
 * Mappe les types de notifications aux types de toast standardisés
 */

const NotificationSystem = () => {
  const { notifications, removeNotification } = useSocket();

  useEffect(() => {
    notifications.forEach((notification) => {
      let toastType = 'info';

      // Mappe les types de notifications aux types de toast
      switch (notification.type) {
        case 'conge-validated':
          toastType = 'success';
          break;
        case 'conge-rejected':
          toastType = 'error';
          break;
        case 'conge-created':
        case 'conge-status-changed':
        case 'conge-deleted':
          toastType = 'info';
          break;
        default:
          toastType = 'info';
      }

      // Ajoute le toast via le service centralisé
      alertService.addToast(notification.message, toastType, 4000);
      
      // Notifie le socket que la notification a été affichée
      removeNotification(notification.id);
    });
  }, [notifications, removeNotification]);

  // Ce composant n'affiche rien directement
  // Les toasts sont affichés par ToastContainer
  return null;
};

export default NotificationSystem;