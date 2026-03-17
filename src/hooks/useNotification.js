import { useContext } from 'react';
import { NotificationContext } from '../contexts/NotificationContext';

export const useNotification = () => {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error('useNotification doit être utilisé dans un NotificationProvider');
  }

  return {
    success: (message, duration = 4000) => context.showNotification(message, 'success', duration),
    error: (message, duration = 4000) => context.showNotification(message, 'error', duration),
    info: (message, duration = 4000) => context.showNotification(message, 'info', duration),
    warning: (message, duration = 4000) => context.showNotification(message, 'warning', duration),
    hide: context.hideNotification,
    setDisabledRoutes: context.configureDisabledRoutes,
    getDisabledRoutes: context.getDisabledRoutes,
  };
};
