import axios from 'axios';

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
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expiré ou invalide
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    const isMaintenance = error.response?.status === 503
      && error.response?.data?.error === 'MAINTENANCE_MODE';

    if (isMaintenance) {
      const message = encodeURIComponent(
        error.response?.data?.message || 'Application en maintenance. Veuillez reessayer plus tard.'
      );
      window.location.href = `/maintenance?message=${message}`;
    }

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
  changePassword: (data) => api.post('/auth/change-password', data),
  getProfile: () => api.get('/me'),
};

export const systemService = {
  health: () => api.get('/health'),
};

export const congesService = {
  getAll: (params = {}) => api.get('/conges', { params }),
  create: (data) => api.post('/conges/demande', data),
  update: (id, data) => api.put(`/conges/${id}`, data),
  delete: (id) => api.delete(`/conges/${id}`),
  validate: (id, data = {}) => api.post(`/conges/${id}/validate`, data),
  reject: (id, data = {}) => api.post(`/conges/${id}/reject`, data),
  getById: (id) => api.get(`/conges/${id}`),
};

export const usersService = {
  getAll: (params = {}) => api.get('/users', { params }),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  updateRole: (id, role) => api.put(`/users/${id}/role`, { role }),
  delete: (id) => api.delete(`/users/${id}`),
  getById: (id) => api.get(`/users/${id}`),
};

export const entreprisesService = {
  getAll: () => api.get('/entreprises'),
  create: (data) => api.post('/entreprises', data),
  update: (id, data) => api.put(`/entreprises/${id}`, data),
  getById: (id) => api.get(`/entreprises/${id}`),
  getPolitique: (id) => api.get(`/entreprises/${id}/politique`),
  updatePolitique: (id, politique) => api.put(`/entreprises/${id}/politique`, { politique_conges: politique }),
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
  getAll: (params = {}) => api.get('/notifications', { params }),
  markAsRead: (id) => api.put(`/notifications/${id}/lue`),
  markAllAsRead: () => api.put('/notifications/lire-tout'),
};

export const congeTypesService = {
  getAll: () => api.get('/conge-types'),
  getById: (id) => api.get(`/conge-types/${id}`),
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