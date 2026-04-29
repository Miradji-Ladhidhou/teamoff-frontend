import { useEffect, useRef, useCallback } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';

const API_BASE = import.meta.env.VITE_API_URL || 'https://teamoff-backend-acqc.onrender.com/api';

export function useNotificationStream(onNotification) {
  const abortRef = useRef(null);
  const onNotificationRef = useRef(onNotification);
  onNotificationRef.current = onNotification;

  const connect = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    fetchEventSource(`${API_BASE}/notifications/stream`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: abortRef.current.signal,
      onmessage(ev) {
        if (ev.event !== 'notification') return;
        try {
          const data = JSON.parse(ev.data);
          onNotificationRef.current?.(data);
        } catch { /* ignore malformed */ }
      },
      onerror() {
        // fetchEventSource reconnecte automatiquement — on laisse faire
      },
    }).catch(() => {});
  }, []);

  useEffect(() => {
    connect();
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, [connect]);
}
