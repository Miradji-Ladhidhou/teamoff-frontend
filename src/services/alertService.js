/**
 * AlertService - Service centralisé et harmonisé pour la gestion des alertes
 * 
 * Fonctionnalités :
 * - Gestion des toasts (success, error, info)
 * - Gestion des modales de confirmation (critiques, bloquantes)
 * - Déduplication des messages
 * - Queue/stacking automatique
 * - Auto-dismiss pour les toasts
 */

import crypto from 'crypto';

const TOAST_DURATION = 4000; // 4 secondes

// Génère un hash du message pour déduplication
const generateMessageHash = (message, type) => {
  if (!message) return null;
  return `${type}:${message}`;
};

class AlertService {
  constructor() {
    this.listeners = {
      toastAdded: [],
      toastRemoved: [],
      toastCleared: [],
      modalOpened: [],
      modalClosed: [],
    };
    
    this.toasts = new Map(); // id => { id, message, type, hash, timestamp, timeoutId? }
    this.modal = null;
    this.messageHashes = new Set(); // Trackage des messages affichés
    this.distinctList = []; // Liste des toasts distincts
  }

  // ==================== SUBSCRIBE/EMIT ====================

  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }

  // ==================== TOAST MANAGEMENT ====================

  /**
   * Affiche un toast de succès
   */
  success(message, duration = TOAST_DURATION) {
    return this.addToast(message, 'success', duration);
  }

  /**
   * Affiche un toast d'erreur
   */
  error(message, duration = TOAST_DURATION) {
    return this.addToast(message, 'error', duration);
  }

  /**
   * Affiche un toast d'information
   */
  info(message, duration = TOAST_DURATION) {
    return this.addToast(message, 'info', duration);
  }

  /**
   * Ajoute un toast avec déduplication
   * @param {string} message
   * @param {string} type - 'success' | 'error' | 'info'
   * @param {number} duration - durée en ms avant auto-dismiss (0 = pas de dismiss)
   * @returns {string} ID du toast
   */
  addToast(message, type = 'info', duration = TOAST_DURATION) {
    if (!message || typeof message !== 'string') return null;

    // Déduplication : vérifier si le même message+type est déjà affichéconst hash = generateMessageHash(message, type);
    if (this.messageHashes.has(hash)) {
      // Éviter les doublons
      return null;
    }

    const id = crypto.randomUUID ? crypto.randomUUID() : `toast-${Date.now()}-${Math.random()}`;
    let timeoutId = null;

    const toastData = {
      id,
      message,
      type,
      hash,
      timestamp: Date.now(),
      timeoutId,
    };

    // Ajouter au tracking
    this.toasts.set(id, toastData);
    this.messageHashes.add(hash);
    this.distinctList.push(toastData);

    // Limiter à max 5 toasts pour éviter le spam
    if (this.distinctList.length > 5) {
      const oldestToast = this.distinctList.shift();
      this.removeToast(oldestToast.id, true);
    }

    // Émettre l'événement
    this.emit('toastAdded', toastData);

    // Auto-dismiss après durée spécifiée
    if (duration > 0) {
      timeoutId = setTimeout(() => {
        this.removeToast(id);
      }, duration);
      toastData.timeoutId = timeoutId;
    }

    return id;
  }

  /**
   * Retire un toast et met à jour le tracking
   */
  removeToast(id, skipCleanup = false) {
    const toastData = this.toasts.get(id);
    if (!toastData) return;

    // Clear timeout si existe
    if (toastData.timeoutId) {
      clearTimeout(toastData.timeoutId);
    }

    // Retirer du tracking
    this.toasts.delete(id);
    if (toastData.hash) {
      this.messageHashes.delete(toastData.hash);
    }
    this.distinctList = this.distinctList.filter(t => t.id !== id);

    // Émettre l'événement
    this.emit('toastRemoved', { id });
  }

  /**
   * Pause au hover - reprendre les timers
   */
  pauseToast(id) {
    const toastData = this.toasts.get(id);
    if (!toastData || !toastData.timeoutId) return;
    clearTimeout(toastData.timeoutId);
    toastData.timeoutId = null;
  }

  /**
   * Reprendre après hover
   */
  resumeToast(id, duration = TOAST_DURATION) {
    const toastData = this.toasts.get(id);
    if (!toastData) return;

    const elapsed = Date.now() - toastData.timestamp;
    const remaining = Math.max(0, duration - elapsed);

    if (remaining > 0) {
      toastData.timeoutId = setTimeout(() => {
        this.removeToast(id);
      }, remaining);
    } else {
      this.removeToast(id);
    }
  }

  /**
   * Efface tous les toasts
   */
  clearAllToasts() {
    this.toasts.forEach((toastData) => {
      if (toastData.timeoutId) {
        clearTimeout(toastData.timeoutId);
      }
    });
    this.toasts.clear();
    this.messageHashes.clear();
    this.distinctList = [];
    this.emit('toastCleared', {});
  }

  /**
   * Obtient la liste actuelle des toasts
   */
  getToasts() {
    return Array.from(this.toasts.values());
  }

  // ==================== MODAL MANAGEMENT ====================

  /**
   * Ouvre une modale de confirmation (pour actions critiques)
   * @param {Object} config - { title, description, confirmLabel, cancelLabel, onConfirm, onCancel }
   */
  openConfirmation(config = {}) {
    const {
      title = 'Confirmation',
      description = '',
      confirmLabel = 'Confirmer',
      cancelLabel = 'Annuler',
      onConfirm = () => {},
      onCancel = () => {},
      danger = false, // true = style danger (rouge)
    } = config;

    const id = crypto.randomUUID ? crypto.randomUUID() : `modal-${Date.now()}`;

    this.modal = {
      id,
      title,
      description,
      confirmLabel,
      cancelLabel,
      onConfirm: () => {
        onConfirm();
        this.closeModal();
      },
      onCancel: () => {
        onCancel();
        this.closeModal();
      },
      danger,
    };

    this.emit('modalOpened', this.modal);
    return id;
  }

  /**
   * Ferme la modale actuelle
   */
  closeModal() {
    if (this.modal) {
      const oldModal = this.modal;
      this.modal = null;
      this.emit('modalClosed', { id: oldModal.id });
    }
  }

  /**
   * Obtient la modale actuelle
   */
  getModal() {
    return this.modal;
  }

  /**
   * Vérifier s'il y a une modale ouverte
   */
  isModalOpen() {
    return this.modal !== null;
  }
}

// Instance singleton
export const alertService = new AlertService();

// Export pour confort
export default alertService;
