import axios from 'axios';
import { apiCache } from '../utils/cache';

// Configuration de base d'axios
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
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

// Intercepteur pour gérer les erreurs d'authentification
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expiré ou invalide
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Fonction helper pour créer des clés de cache
const createCacheKey = (method, url, params = {}) => {
  return `${method}:${url}:${JSON.stringify(params)}`;
};

// Wrapper pour les requêtes avec cache
const cachedRequest = async (method, url, config = {}) => {
  const cacheKey = createCacheKey(method, url, config.params);

  // Pour les requêtes GET, vérifier le cache
  if (method === 'get') {
    const cachedData = apiCache.get(cacheKey);
    if (cachedData) {
      return Promise.resolve({ data: cachedData });
    }
  }

  // Faire la requête
  const response = await api[method](url, config);

  // Mettre en cache les réponses GET réussies
  if (method === 'get' && response.status === 200) {
    apiCache.set(cacheKey, response.data);
  }

  return response;
};

// Services API avec cache
export const authService = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (data) => api.post('/auth/register', data),
  getProfile: () => cachedRequest('get', '/me'),
};

export const congesService = {
  getAll: (params = {}) => cachedRequest('get', '/conges', { params }),
  create: (data) => api.post('/conges/demande', data),
  update: (id, data) => api.put(`/conges/${id}`, data),
  delete: (id) => api.delete(`/conges/${id}`),
  validate: (id, data) => api.post(`/conges/${id}/validate`, data),
  reject: (id, data) => api.post(`/conges/${id}/reject`, data),
  getById: (id) => cachedRequest('get', `/conges/${id}`),
};

export const usersService = {
  getAll: (params = {}) => cachedRequest('get', '/users', { params }),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  getById: (id) => cachedRequest('get', `/users/${id}`),
};

export const entreprisesService = {
  getAll: () => cachedRequest('get', '/entreprises'),
  create: (data) => api.post('/entreprises', data),
  update: (id, data) => api.put(`/entreprises/${id}`, data),
  getById: (id) => cachedRequest('get', `/entreprises/${id}`),
};

export const quotasService = {
  getSoldes: (userId, params = {}) => cachedRequest('get', `/quotas/soldes/${userId}`, { params }),
  monthlyAccrual: (data = {}) => api.post('/quotas/monthly-accrual', data),
  getUsage: () => cachedRequest('get', '/quotas/usage'),
  init: (data) => api.post('/quotas/init', data),
};

export const calendrierService = {
  getConges: (params = {}) => cachedRequest('get', '/calendrier-conges', { params }),
  getCongesByMonth: (year, month, filters = {}) => cachedRequest('get', `/calendrier-conges/${year}/${month}`, { params: filters }),
  getJoursFeriesByMonth: (year, month) => cachedRequest('get', `/jours-feries/${year}/${month}`),
};

export const joursFeriesService = {
  getAll: (params = {}) => cachedRequest('get', '/jours-feries', { params }),
  create: (data) => api.post('/jours-feries', data),
  update: (id, data) => api.put(`/jours-feries/${id}`, data),
  delete: (id) => api.delete(`/jours-feries/${id}`),
};

export const notificationsService = {
  getAll: (params = {}) => cachedRequest('get', '/notifications', { params }),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
};

export const congeTypesService = {
  getAll: () => cachedRequest('get', '/conge-types'),
  create: (data) => api.post('/conge-types', data),
  update: (id, data) => api.put(`/conge-types/${id}`, data),
  delete: (id) => api.delete(`/conge-types/${id}`),
};