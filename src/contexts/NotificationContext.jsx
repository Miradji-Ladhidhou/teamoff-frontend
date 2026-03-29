import React, { createContext, useState, useCallback, useEffect } from 'react';
import { registerApiNotificationHandler } from '../services/api';
import {
  isNotificationDisabledForCurrentRoute,
  setNotificationDisabledRoutes,
  getNotificationDisabledRoutes,
} from '../utils/notificationRules';

const defaultNotificationContext = {
  notification: null,
  showNotification: () => {},
  hideNotification: () => {},
  configureDisabledRoutes: () => {},
  getDisabledRoutes: () => [],
};

export const NotificationContext = createContext(defaultNotificationContext);

export const NotificationProvider = ({ children }) => {
  const [notification, setNotification] = useState(null);

  const showNotification = useCallback(
    (message, type = 'success', duration = 4000) => {
      if (isNotificationDisabledForCurrentRoute()) return;

      setNotification({ message, type });

      if (duration > 0) {
        setTimeout(() => {
          setNotification(null);
        }, duration);
      }
    },
    []
  );

  const hideNotification = useCallback(() => {
    setNotification(null);
  }, []);

  const configureDisabledRoutes = useCallback((routes = []) => {
    setNotificationDisabledRoutes(routes);
  }, []);

  const getDisabledRoutes = useCallback(() => getNotificationDisabledRoutes(), []);

  useEffect(() => {
    registerApiNotificationHandler(({ message, type = 'success', duration = 4000 }) => {
      showNotification(message, type, duration);
    });

    return () => {
      registerApiNotificationHandler(null);
    };
  }, [showNotification]);

  useEffect(() => {
    const handleInvalid = (event) => {
      if (!(event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLTextAreaElement)) {
        return;
      }

      const target = event.target;
      const labelText = target.labels?.[0]?.textContent?.trim();
      const fieldName = labelText || target.getAttribute('placeholder') || target.name || 'Ce champ';
      const nativeMessage = target.validationMessage || 'Veuillez vérifier les informations saisies';

      showNotification(`${fieldName}: ${nativeMessage}`, 'warning', 4000);
    };

    document.addEventListener('invalid', handleInvalid, true);

    return () => {
      document.removeEventListener('invalid', handleInvalid, true);
    };
  }, [showNotification]);

  return (
    <NotificationContext.Provider
      value={{
        showNotification,
        hideNotification,
        notification,
        configureDisabledRoutes,
        getDisabledRoutes,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
