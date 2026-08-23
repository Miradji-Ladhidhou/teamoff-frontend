import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
// En dessous de ce seuil, une nouvelle activité n'a pas besoin de relancer le minuteur — évite
// des dizaines de clearTimeout/setTimeout par seconde sur un mousemove continu.
const RESET_THROTTLE_MS = 5000;

/**
 * Déconnecte l'utilisateur après `timeoutMs` sans la moindre interaction (souris, clavier,
 * scroll, tactile). Appelle logout() du AuthContext, qui bascule isAuthenticated à false —
 * ProtectedRoute (App.jsx) redirige alors vers /login au prochain rendu, pas besoin de
 * naviguer explicitement ici.
 */
export function useInactivityLogout(timeoutMs) {
  const { logout } = useAuth();
  const lastResetRef = useRef(0);
  // logout() n'est pas mémoïsé dans AuthContext (nouvelle référence à chaque rendu) — passer
  // par un ref évite de redémarrer le minuteur à chaque rendu de AuthProvider sans rapport avec
  // une vraie interaction utilisateur.
  const logoutRef = useRef(logout);
  logoutRef.current = logout;

  useEffect(() => {
    let timeoutId;

    function fireLogout() {
      logoutRef.current();
    }

    function resetTimer() {
      const now = Date.now();
      if (now - lastResetRef.current < RESET_THROTTLE_MS) return;
      lastResetRef.current = now;
      clearTimeout(timeoutId);
      timeoutId = setTimeout(fireLogout, timeoutMs);
    }

    timeoutId = setTimeout(fireLogout, timeoutMs);
    ACTIVITY_EVENTS.forEach((event) => document.addEventListener(event, resetTimer, { passive: true }));

    return () => {
      clearTimeout(timeoutId);
      ACTIVITY_EVENTS.forEach((event) => document.removeEventListener(event, resetTimer));
    };
  }, [timeoutMs]);
}
