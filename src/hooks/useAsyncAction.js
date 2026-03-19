import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_SPINNER_DELAY_MS = 500;
const DEFAULT_MIN_SPINNER_VISIBLE_MS = 300;

const wait = (durationMs) => new Promise((resolve) => {
  window.setTimeout(resolve, Math.max(0, durationMs));
});

export const useAsyncAction = ({
  spinnerDelayMs = DEFAULT_SPINNER_DELAY_MS,
  minSpinnerVisibleMs = DEFAULT_MIN_SPINNER_VISIBLE_MS,
} = {}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);

  const isRunningRef = useRef(false);
  const spinnerDelayTimerRef = useRef(null);
  const spinnerShownAtRef = useRef(null);

  const clearTimers = useCallback(() => {
    if (spinnerDelayTimerRef.current) {
      window.clearTimeout(spinnerDelayTimerRef.current);
      spinnerDelayTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  const run = useCallback(async (action) => {
    if (isRunningRef.current) {
      return undefined;
    }

    isRunningRef.current = true;
    setIsRunning(true);
    setShowSpinner(false);
    spinnerShownAtRef.current = null;

    spinnerDelayTimerRef.current = window.setTimeout(() => {
      spinnerShownAtRef.current = Date.now();
      setShowSpinner(true);
      spinnerDelayTimerRef.current = null;
    }, spinnerDelayMs);

    try {
      return await action();
    } finally {
      clearTimers();

      if (spinnerShownAtRef.current) {
        const elapsedSinceSpinner = Date.now() - spinnerShownAtRef.current;
        const remainingSpinnerMs = minSpinnerVisibleMs - elapsedSinceSpinner;
        if (remainingSpinnerMs > 0) {
          await wait(remainingSpinnerMs);
        }
      }

      setShowSpinner(false);
      spinnerShownAtRef.current = null;
      setIsRunning(false);
      isRunningRef.current = false;
    }
  }, [clearTimers, minSpinnerVisibleMs, spinnerDelayMs]);

  return {
    isRunning,
    showSpinner,
    run,
  };
};

export default useAsyncAction;
