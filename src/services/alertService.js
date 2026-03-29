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

    this.toasts = new Map(); // conservé pour compatibilité backward
    this.modal = null;
    this.modalQueue = [];
    this.activeModalTimeout = null;
    this.messageHashes = new Set(); // Trackage des messages affichés
    this.distinctList = []; // Liste des notifications distinctes
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
   * Ouvre une notification globale sous forme de modale
   * @param {string} message
   * @param {string} type - 'success' | 'error' | 'info' | 'warning'
   * @param {number|Object} optionsOrDuration - durée ms ou objet options
   * @param {string} message
   * @param {string} type - 'success' | 'error' | 'info' | 'warning'
   * @param {number} duration - durée en ms avant auto-dismiss
   * @returns {string} ID de la notification
   */
  openNotificationModal(message, type = 'info', optionsOrDuration = TOAST_DURATION) {
    if (!message || typeof message !== 'string') return null;

    const options = typeof optionsOrDuration === 'number'
      ? { autoCloseMs: optionsOrDuration }
      : (optionsOrDuration || {});

    const hash = generateMessageHash(message, type);
    if (this.messageHashes.has(hash)) {
      return null;
    }

    const id = globalThis.crypto?.randomUUID
      ? globalThis.crypto.randomUUID()
      : `modal-${Date.now()}-${Math.random()}`;

    const titles = {
      success: 'Succes',
      error: 'Erreur',
      info: 'Information',
      warning: 'Attention',
    };

    this.messageHashes.add(hash);

    const modalData = {
      id,
      kind: 'notification',
      type,
      hash,
      title: options.title || titles[type] || titles.info,
      description: message,
      confirmLabel: options.confirmLabel || 'Fermer',
      cancelLabel: null,
      showCancel: false,
      danger: type === 'error',
      dismissible: options.dismissible !== false,
      closeOnOverlay: options.closeOnOverlay !== false,
      closeOnEsc: options.closeOnEsc !== false,
      autoCloseMs: Number.isFinite(options.autoCloseMs) ? options.autoCloseMs : TOAST_DURATION,
      onConfirm: () => {
        if (typeof options.onClose === 'function') {
          options.onClose();
        }
        this.closeModal();
      },
      onCancel: () => {
        if (typeof options.onClose === 'function') {
          options.onClose();
        }
        this.closeModal();
      },
    };

    this.enqueueModal(modalData);
    return id;
  }

  /**
   * Affiche une notification de succès
   * Auto-ferme après la durée spécifiée
   */
  success(message, duration = TOAST_DURATION) {
    return this.openNotificationModal(message, 'success', duration);
  }

  /**
   * Affiche une notification d'erreur
   * Auto-ferme après la durée spécifiée
   */
  error(message, duration = TOAST_DURATION) {
    return this.openNotificationModal(message, 'error', duration);
  }

  /**
   * Affiche une notification d'information
   * Auto-ferme après la durée spécifiée
   */
  info(message, duration = TOAST_DURATION) {
    return this.openNotificationModal(message, 'info', duration);
  }

  showSuccessModal(message, options = {}) {
    return this.openNotificationModal(message, 'success', options);
  }

  showErrorModal(message, options = {}) {
    return this.openNotificationModal(message, 'error', options);
  }

  /**
   * Backward compatible: mappe les toasts vers les modales globales
   * @param {string} message
   * @param {string} type - 'success' | 'error' | 'info'
   * @param {number} duration - durée en ms avant auto-dismiss (0 = pas de dismiss)
   * @returns {string} ID du toast
   */
  addToast(message, type = 'info', duration = TOAST_DURATION) {
    return this.openNotificationModal(message, type, duration);
  }

  /**
   * Retire un toast et met à jour le tracking
   */
  removeToast(id, skipCleanup = false) {
    if (this.modal?.id === id) {
      this.closeModal();
    }
  }

  /**
   * Pause au hover - reprendre les timers
   */
  pauseToast(id) {
    if (this.modal?.id !== id || this.activeModalTimeout === null) return;
    clearTimeout(this.activeModalTimeout);
    this.activeModalTimeout = null;
  }

  /**
   * Reprendre après hover
   */
  resumeToast(id, duration = TOAST_DURATION) {
    if (this.modal?.id !== id) return;
    this.scheduleAutoClose(this.modal, duration);
  }

  /**
   * Efface tous les toasts
   */
  clearAllToasts() {
    this.modalQueue = [];
    this.closeModal();
    this.emit('toastCleared', {});
  }

  /**
   * Obtient la liste actuelle des toasts
   */
  getToasts() {
    return this.modal ? [this.modal] : [];
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

    const id = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `modal-${Date.now()}`;

    const modalData = {
      id,
      kind: 'confirmation',
      type: danger ? 'error' : 'info',
      title,
      description,
      confirmLabel,
      cancelLabel,
      showCancel: true,
      dismissible: true,
      closeOnOverlay: true,
      closeOnEsc: true,
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

    this.enqueueModal(modalData);
    return id;
  }

  enqueueModal(modalData) {
    if (this.modal) {
      this.modalQueue.push(modalData);
      return;
    }
    this.openNow(modalData);
  }

  openNow(modalData) {
    this.modal = modalData;
    this.emit('modalOpened', this.modal);
    this.scheduleAutoClose(modalData, modalData.autoCloseMs);
  }

  scheduleAutoClose(modalData, autoCloseMs) {
    if (this.activeModalTimeout) {
      clearTimeout(this.activeModalTimeout);
      this.activeModalTimeout = null;
    }

    if (modalData?.kind !== 'notification') return;
    if (!Number.isFinite(autoCloseMs) || autoCloseMs <= 0) return;

    this.activeModalTimeout = setTimeout(() => {
      if (this.modal?.id === modalData.id) {
        this.closeModal();
      }
    }, autoCloseMs);
  }

  /**
   * Ferme la modale actuelle
   */
  closeModal() {
    if (this.modal) {
      const oldModal = this.modal;
      if (oldModal.hash) {
        this.messageHashes.delete(oldModal.hash);
      }
      if (this.activeModalTimeout) {
        clearTimeout(this.activeModalTimeout);
        this.activeModalTimeout = null;
      }
      this.modal = null;
      this.emit('modalClosed', { id: oldModal.id });

      if (this.modalQueue.length > 0) {
        const nextModal = this.modalQueue.shift();
        this.openNow(nextModal);
      }
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
