// Export Statistiques CSV
export const exportStatistiquesCSV = (params = {}) => api.get('/exports/statistiques/csv', {
  params,
  responseType: 'blob'
});
import axios from 'axios';
import {
  isNotificationDisabledForCurrentRoute,
  setNotificationDisabledRoutes,
  getNotificationDisabledRoutes,
} from '../utils/notificationRules';

let apiNotificationHandler = null;

export const registerApiNotificationHandler = (handler) => {
  apiNotificationHandler = typeof handler === 'function' ? handler : null;
};

export const configureApiNotificationDisabledRoutes = (routes = []) => {
  setNotificationDisabledRoutes(routes);
};

export const getApiNotificationDisabledRoutes = () => getNotificationDisabledRoutes();

const MUTATING_METHODS = new Set(['post', 'put', 'patch', 'delete']);

const MESSAGE_REPLACEMENTS = [
  [/\bsucces\b/gi, 'succès'],
  [/\bcree\b/gi, 'créé'],
  [/\bcreee\b/gi, 'créée'],
  [/\bsupprime\b/gi, 'supprimé'],
  [/\bdesactive\b/gi, 'désactivé'],
  [/\bactive\b/gi, 'activé'],
  [/\bdonnees\b/gi, 'données'],
  [/\ba\b jour/gi, 'à jour'],
  [/\breessayer\b/gi, 'réessayer'],
  [/\bconges\b/gi, 'congés'],
];

const normalizeNotificationMessage = (message, type = 'info') => {
  if (!message || typeof message !== 'string') return message;

  let normalized = message.trim();
  if (!normalized) return normalized;

  MESSAGE_REPLACEMENTS.forEach(([pattern, replacement]) => {
    normalized = normalized.replace(pattern, replacement);
  });

  normalized = normalized.charAt(0).toUpperCase() + normalized.slice(1);

  if (!/[.!?]$/.test(normalized)) {
    normalized += type === 'error' ? '.' : '.';
  }

  return normalized;
};

const shouldNotify = (config = {}) => {
  if (isNotificationDisabledForCurrentRoute()) return false;

  const method = (config.method || '').toLowerCase();
  if (!MUTATING_METHODS.has(method)) return false;

  const url = config.url || '';
  if (url.includes('/auth/login')) return false;
  return true;
};

const emitApiNotification = (message, type = 'success', duration = 4000) => {
  if (!apiNotificationHandler || !message) return;
  apiNotificationHandler({ message: normalizeNotificationMessage(message, type), type, duration });
};

// Configuration de base d'axios
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5500/api',
  timeout: 10000,
});

// Intercepteur pour ajouter le token JWT automatiquement
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les erreurs d'authentification et de maintenance
let isRefreshing = false;
let refreshQueue = [];

function processRefreshQueue(error, token = null) {
  refreshQueue.forEach((cb) => (error ? cb.reject(error) : cb.resolve(token)));
  refreshQueue = [];
}

api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const requestUrl = error.config?.url || '';
    const isLoginRequest = requestUrl.includes('/auth/login');
    const isRefreshRequest = requestUrl.includes('/auth/refresh');

    if (error.response?.status === 401 && !isLoginRequest && !isRefreshRequest) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then((token) => {
          error.config.headers.Authorization = `Bearer ${token}`;
          return api(error.config);
        });
      }

      isRefreshing = true;
      try {
        const res = await api.post('/auth/refresh', {}, { withCredentials: true });
        const newToken = res.data?.token;
        if (newToken) {
          localStorage.setItem('token', newToken);
          api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
          processRefreshQueue(null, newToken);
          error.config.headers.Authorization = `Bearer ${newToken}`;
          return api(error.config);
        }
      } catch {
        processRefreshQueue(new Error('Session expirée'));
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    const isMaintenance = error.response?.status === 503
      && error.response?.data?.error === 'MAINTENANCE_MODE';

    if (isMaintenance) {
      const message = encodeURIComponent(
        error.response?.data?.message || 'Application en maintenance. Veuillez reessayer plus tard.'
      );
      window.location.href = `/maintenance?message=${message}`;
    }

    // Notifications flottantes désactivées : les erreurs sont gérées par les alertes centrales des pages

    return Promise.reject(error);
  }
);

// Services API
export const authService = {
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  register: (data) => api.post('/auth/register', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  setPassword: (data) => api.post('/auth/set-password', data),
  changePassword: (data) => api.post('/auth/change-password', data),
  getProfile: () => api.get('/me'),
  updateProfile: (data) => api.put('/me', data),
};

export const systemService = {
  health: () => api.get('/health'),
};

export const congesService = {
  getAll: (params = {}) => api.get('/conges', { params }),
  checkOverlap: (data) => api.post('/conges/check-overlap', data),
  getValidationOverlap: (id) => api.get(`/conges/${id}/validation-overlap`),
  create: (data) => api.post('/conges/demande', data, { timeout: 30000 }),
  update: (id, data) => api.put(`/conges/${id}`, data),
  delete: (id, data = {}) => api.delete(`/conges/${id}`, { data }),
  validate: (id, data = {}) => api.post(`/conges/${id}/validate`, data),
  reject: (id, data = {}) => api.post(`/conges/${id}/reject`, data),
  getById: (id) => api.get(`/conges/${id}`),
  getHistory: (id) => api.get(`/conges/${id}/history`),
};

export const usersService = {
  getAll: (params = {}) => api.get('/users', { params }),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  updateRole: (id, role) => api.put(`/users/${id}/role`, { role }),
  delete: (id) => api.delete(`/users/${id}`),
  getById: (id) => api.get(`/users/${id}`),
  importCSV: (file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/users/import/csv', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  resendInvitation: (id) => api.post(`/users/${id}/resend-invitation`),
  setDelegate: (id, delegue_id) => api.put(`/users/${id}/delegate`, { delegue_id }),
};

export const entreprisesService = {
  getAll: () => api.get('/entreprises'),
  create: (data) => api.post('/entreprises', data),
  update: (id, data) => api.put(`/entreprises/${id}`, data),
  getById: (id) => api.get(`/entreprises/${id}`),
  getPolitique: (id) => api.get(`/entreprises/${id}/politique`),
  getBlockedDays: (id) => api.get(`/entreprises/${id}/blocked-days`),
  getPublicPolicy: (id) => api.get(`/entreprises/${id}/blocked-days`),
  updatePolitique: (id, politique) => api.put(`/entreprises/${id}/politique`, { politique_conges: politique }),
  getParametres: (id) => api.get(`/entreprises/${id}/parametres`),
  updateParametres: (id, data) => api.put(`/entreprises/${id}/parametres`, { parametres: data }),
  getServices: (id) => api.get(`/entreprises/${id}/services`),
  createService: (id, data) => api.post(`/entreprises/${id}/services`, data),
  updateService: (id, serviceName, data) => api.put(`/entreprises/${id}/services/${encodeURIComponent(serviceName)}`, data),
  deleteService: (id, serviceName) => api.delete(`/entreprises/${id}/services/${encodeURIComponent(serviceName)}`),
  delete: (id) => api.delete(`/entreprises/${id}`),
  updateStatus: (id, statut) => api.patch(`/entreprises/${id}/statut`, { statut }),
};

export const quotasService = {
  getSolde: (userId, congeTypeId) => api.get(`/quotas/solde/${userId}/${congeTypeId}`),
  getSoldes: (userId, params = {}) => api.get(`/quotas/soldes/${userId}`, { params }),
  getUserCounters: (userId, params = {}) => api.get(`/quotas/counters/${userId}`, { params }),
  upsertUserCounter: (userId, data) => api.post(`/quotas/counters/${userId}`, data),
  deleteUserCounter: (counterId) => api.delete(`/quotas/counters/${counterId}`),
  monthlyAccrual: (data = {}) => api.post('/quotas/monthly-accrual', data),
  recalculateProrata: (data = {}) => api.post('/quotas/recalculate-prorata', data),
  getUsage: () => api.get('/quotas/usage'),
  init: (data) => api.post('/quotas/init', data),
};

export const calendrierService = {
  getConges: (params = {}) => api.get('/calendrier-conges', { params }),
  getCongesByMonth: (year, month, filters = {}) => api.get(`/calendrier-conges/${year}/${month}`, { params: filters }),
  getJoursFeriesByMonth: (year, month) => api.get(`/jours-feries/${year}/${month}`),
};

export const joursFeriesService = {
  getAll: (params = {}) => api.get('/jours-feries', { params }),
  getById: (id, params = {}) => api.get(`/jours-feries/${id}`, { params }),
  create: (data) => api.post('/jours-feries', data),
  update: (id, data) => api.put(`/jours-feries/${id}`, data),
  delete: (id, params = {}) => api.delete(`/jours-feries/${id}`, { params }),
  importNational: (year, data = {}, params = {}) => api.post(`/jours-feries/import/${year}`, data, { params }),
  getTemplates: (params = {}) => api.get('/jours-feries/templates', { params }),
  createTemplate: (data = {}, params = {}) => api.post('/jours-feries/templates', data, { params }),
  exportTemplateCSV: (id) => api.get(`/jours-feries/templates/${id}/export/csv`, { responseType: 'blob' }),
  importTemplateCSV: (data = {}, params = {}) => api.post('/jours-feries/templates/import/csv', data, { params }),
  applyTemplate: (id, data = {}, params = {}) => api.post(`/jours-feries/templates/${id}/apply`, data, { params }),
};

export const notificationsService = {
  getAll: (params = {}) => {
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const normalizedTimezone = typeof browserTimezone === 'string' ? browserTimezone.trim() : '';
    const finalParams = normalizedTimezone
      ? { ...params, timezone: params.timezone || normalizedTimezone }
      : params;

    return api.get('/notifications', { params: finalParams });
  },
  markAsRead: (id) => api.put(`/notifications/${id}/lue`),
  markAllAsRead: () => api.put('/notifications/lire-tout'),
};

export const congeTypesService = {
  getAll: (params = {}) => api.get('/conge-types', { params }),
  getById: (id, params = {}) => api.get(`/conge-types/${id}`, { params }),
  create: (data) => api.post('/conge-types', data),
  update: (id, data) => api.put(`/conge-types/${id}`, data),
  delete: (id) => api.delete(`/conge-types/${id}`),
};

export const exportsService = {
  preview: (params = {}) => api.get('/exports/preview', { params }),
  exportData: (params = {}) => {
    const { type, format, ...queryParams } = params;
    return api.get(`/exports/${type}/${format}`, {
      params: queryParams,
      responseType: 'blob'
    });
  },
  exportCongesCSV: (params = {}) => api.get('/exports/conges/csv', {
    params,
    responseType: 'blob'
  }),
  exportCongesPDF: (params = {}) => api.get('/exports/conges/pdf', {
    params,
    responseType: 'blob'
  }),
  exportAbsencesCSV: (params = {}) => api.get('/exports/absences/csv', {
    params,
    responseType: 'blob'
  }),
  exportAbsencesPDF: (params = {}) => api.get('/exports/absences/pdf', {
    params,
    responseType: 'blob'
  }),
  exportArretsMaladieCSV: (params = {}) => api.get('/exports/arrets-maladie/csv', {
    params,
    responseType: 'blob'
  }),
  exportArretsMaladiePDF: (params = {}) => api.get('/exports/arrets-maladie/pdf', {
    params,
    responseType: 'blob'
  }),
  exportUtilisateursCSV: () => api.get('/exports/utilisateurs/csv', {
    responseType: 'blob'
  }),
  exportEntreprisesCSV: () => api.get('/exports/entreprises/csv', {
    responseType: 'blob'
  }),
  exportAuditCSV: (params = {}) => api.get('/exports/audit/csv', {
    params,
    responseType: 'blob'
  }),
  exportUsagePDF: () => api.get('/exports/usage/pdf', {
    responseType: 'blob'
  }),
  exportStatistiquesCSV: (params = {}) => api.get('/exports/statistiques/csv', {
    params,
    responseType: 'blob'
  }),
};

export const metricsService = {
  getMetrics: () => api.get('/metrics'),
};

export const auditService = {
  getAll: (params = {}) => api.get('/audit', { params }),
};

export const settingsService = {
  getAll: () => api.get('/settings'),
  getHistory: (params = {}) => api.get('/settings/history', { params }),
  exportHistoryCSV: () => api.get('/settings/history/csv', { responseType: 'blob' }),
  updateAll: (data) => api.put('/settings', data),
  updateSection: (section, data) => api.put(`/settings/sections/${section}`, data),
  getSystemInfo: () => api.get('/settings/system-info'),
  runBackup: () => api.post('/settings/actions/backup'),
  downloadBackup: (filename) => api.get(`/settings/backups/${filename}`, { responseType: 'blob' }),
  runRestart: () => api.post('/settings/actions/restart'),
  setMaintenance: (enabled, maintenanceMessage) => api.post('/settings/actions/maintenance', { enabled, maintenanceMessage }),
  sendTestEmail: (to) => api.post('/settings/actions/test-email', { to }),
};

export const absencesService = {
  getAll: (params = {}) => api.get('/absences', { params }),
  create: (formData) => api.post('/absences', formData),
  update: (id, data) => api.patch(`/absences/${id}`, data),
};

// Exporter l'instance axios personnalisée pour les imports nommés
export { api };