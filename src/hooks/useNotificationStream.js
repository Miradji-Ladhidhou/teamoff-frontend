import { useEffect, useRef, useCallback, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://teamoff-backend-acqc.onrender.com/api';

export function useNotificationStream(onNotification) {
  const esRef = useRef(null);
  const onNotificationRef = useRef(onNotification);
  onNotificationRef.current = onNotification;

  const connect = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    if (esRef.current) {
      esRef.current.close();
    }

    const url = `${API_BASE}/notifications/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);

    es.addEventListener('notification', (e) => {
      try {
        const data = JSON.parse(e.data);
        onNotificationRef.current?.(data);
      } catch { /* ignore malformed */ }
    });

    es.onerror = () => {
      es.close();
      // Reconnect after 10s on error
      setTimeout(connect, 10000);
    };

    esRef.current = es;
  }, []);

  useEffect(() => {
    connect();
    return () => {
      esRef.current?.close();
      esRef.current = null;
    };
  }, [connect]);
}
