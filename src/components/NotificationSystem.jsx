import React, { useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import useSocket from '../hooks/useSocket';

const NotificationSystem = () => {
  const { notifications, removeNotification } = useSocket();

  useEffect(() => {
    notifications.forEach(notification => {
      let toastType = 'info';

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

      toast(notification.message, {
        type: toastType,
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        onClose: () => removeNotification(notification.id)
      });
    });
  }, [notifications, removeNotification]);

  return (
    <ToastContainer
      position="top-right"
      autoClose={5000}
      hideProgressBar={false}
      newestOnTop={false}
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
    />
  );
};

export default NotificationSystem;