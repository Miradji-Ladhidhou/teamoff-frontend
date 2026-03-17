import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    let user;
    try {
      user = JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      user = {};
    }

    const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5500';
    const socket = io(baseUrl, {
      auth: { token },
      transports: ['websocket'],
      upgrade: true,
      autoConnect: false,
    });
    socketRef.current = socket;
    const connectTimer = window.setTimeout(() => {
      socket.connect();
    }, 0);

    const addNotification = (type, message, data) => {
      setNotifications(prev => [
        ...prev,
        {
          id: crypto?.randomUUID?.() || Date.now(),
          type,
          message,
          data,
          timestamp: new Date()
        }
      ]);
    };

    // Listeners
    const events = {
      connect: () => setIsConnected(true),
      disconnect: () => setIsConnected(false),
      'connect_error': (err) => {
        console.warn('Socket connect_error:', err);
        setIsConnected(false);
      },
      'connect_timeout': (timeout) => {
        console.warn('Socket connect_timeout:', timeout);
        setIsConnected(false);
      },
      'conge-created': (data) => addNotification('conge-created', `Nouvelle demande de congé de ${data.user?.prenom || ''} ${data.user?.nom || ''}`, data),
      'conge-validated': (data) => addNotification('conge-validated', 'Votre demande de congé a été approuvée', data),
      'conge-rejected': (data) => addNotification('conge-rejected', 'Votre demande de congé a été rejetée', data),
      'conge-status-changed': (data) => {
        const actionText = data.action === 'validated' ? 'approuvée' : 'rejetée';
        addNotification('conge-status-changed', `Une demande de congé a été ${actionText}`, data);
      },
      'conge-deleted': (data) => addNotification('conge-deleted', 'Une demande de congé a été supprimée', data)
    };

    Object.entries(events).forEach(([event, handler]) => socket.on(event, handler));

    // Rejoindre la salle entreprise
    if (user?.entreprise_id) {
      socket.emit('join-room', `company-${user.entreprise_id}`);
    }

    return () => {
      window.clearTimeout(connectTimer);
      Object.entries(events).forEach(([event, handler]) => socket.off(event, handler));
      if (socket.connected || socket.active) {
        socket.disconnect();
      }
    };
  }, []);

  const clearNotifications = () => setNotifications([]);
  const removeNotification = (id) => setNotifications(prev => prev.filter(n => n.id !== id));

  return { isConnected, notifications, clearNotifications, removeNotification };
};

export default useSocket;