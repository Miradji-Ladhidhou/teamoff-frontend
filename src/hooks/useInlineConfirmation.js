import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_TIMEOUT_MS = 8000;

export const useInlineConfirmation = (timeoutMs = DEFAULT_TIMEOUT_MS) => {
  const [pendingKey, setPendingKey] = useState(null);
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const timeoutRef = useRef(null);

  const clearConfirmation = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setPendingKey(null);
    setConfirmationMessage('');
  }, []);

  const requestConfirmation = useCallback((key, message) => {
    if (pendingKey && pendingKey === key) {
      clearConfirmation();
      return true;
    }

    setPendingKey(key);
    setConfirmationMessage(message || 'Cliquez une seconde fois pour confirmer cette action.');

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      setPendingKey(null);
      setConfirmationMessage('');
      timeoutRef.current = null;
    }, timeoutMs);

    return false;
  }, [clearConfirmation, pendingKey, timeoutMs]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    confirmationMessage,
    requestConfirmation,
    clearConfirmation,
  };
};
