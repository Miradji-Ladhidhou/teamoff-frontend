import axios from 'axios';
import { authService, congesService, usersService } from '../services/api';

// Mock axios
jest.mock('axios', () => {
  const client = {
    get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn(),
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
  };
  return { create: jest.fn(() => client) };
});
const api = axios.create.mock.results[0].value;

describe('API Services', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('authService', () => {
    it('should call login endpoint', async () => {
      const credentials = { email: 'test@test.com', password: 'password' };
      const mockResponse = { data: { token: 'jwt-token', user: { id: 1 } } };

      api.post.mockResolvedValueOnce(mockResponse);

      const result = await authService.login(credentials);

      expect(api.post).toHaveBeenCalledWith('/auth/login', credentials);
      expect(result).toBe(mockResponse);
    });

    it('should call register endpoint', async () => {
      const userData = {
        nom: 'Test',
        prenom: 'User',
        email: 'test@test.com',
        password: 'password'
      };
      const mockResponse = { data: { user: { id: 1 }, token: 'jwt-token' } };

      api.post.mockResolvedValueOnce(mockResponse);

      const result = await authService.register(userData);

      expect(api.post).toHaveBeenCalledWith('/auth/register', userData);
      expect(result).toBe(mockResponse);
    });

    it('should call getProfile endpoint', async () => {
      const mockResponse = { data: { id: 1, nom: 'Test', prenom: 'User' } };

      api.get.mockResolvedValueOnce(mockResponse);

      const result = await authService.getProfile();

      expect(api.get).toHaveBeenCalledWith('/me');
      expect(result).toBe(mockResponse);
    });
  });

  describe('congesService', () => {
    it('should call getAll endpoint', async () => {
      const params = { page: 1, limit: 10 };
      const mockResponse = {
        data: {
          conges: [{ id: 1, statut: 'en_attente' }],
          total: 1,
          totalPages: 1
        }
      };

      api.get.mockResolvedValueOnce(mockResponse);

      const result = await congesService.getAll(params);

      expect(api.get).toHaveBeenCalledWith('/conges', { params });
      expect(result).toBe(mockResponse);
    });

    it('should call create endpoint', async () => {
      const congeData = {
        conge_type_id: 1,
        date_debut: '2024-06-01',
        date_fin: '2024-06-05'
      };
      const mockResponse = { data: { id: 1, statut: 'en_attente' } };

      api.post.mockResolvedValueOnce(mockResponse);

      const result = await congesService.create(congeData);

      expect(api.post).toHaveBeenCalledWith('/conges/demande', congeData, { timeout: 30000 });
      expect(result).toBe(mockResponse);
    });

    it('should call update endpoint', async () => {
      const congeId = 1;
      const updateData = { statut: 'approuve' };
      const mockResponse = { data: { id: 1, statut: 'approuve' } };

      api.put.mockResolvedValueOnce(mockResponse);

      const result = await congesService.update(congeId, updateData);

      expect(api.put).toHaveBeenCalledWith(`/conges/${congeId}`, updateData);
      expect(result).toBe(mockResponse);
    });

    it('should call delete endpoint', async () => {
      const congeId = 1;
      const mockResponse = { data: { message: 'Deleted successfully' } };

      api.delete.mockResolvedValueOnce(mockResponse);

      const result = await congesService.delete(congeId);

      expect(api.delete).toHaveBeenCalledWith(`/conges/${congeId}`, { data: {} });
      expect(result).toBe(mockResponse);
    });

    it('should call getById endpoint', async () => {
      const congeId = 1;
      const mockResponse = { data: { id: 1, statut: 'en_attente' } };

      api.get.mockResolvedValueOnce(mockResponse);

      const result = await congesService.getById(congeId);

      expect(api.get).toHaveBeenCalledWith(`/conges/${congeId}`);
      expect(result).toBe(mockResponse);
    });
  });

  describe('usersService', () => {
    it('should call getAll endpoint', async () => {
      const params = { page: 1, limit: 10 };
      const mockResponse = {
        data: {
          users: [{ id: 1, nom: 'Test', prenom: 'User' }],
          total: 1,
          totalPages: 1
        }
      };

      api.get.mockResolvedValueOnce(mockResponse);

      const result = await usersService.getAll(params);

      expect(api.get).toHaveBeenCalledWith('/users', { params });
      expect(result).toBe(mockResponse);
    });

    it('should call create endpoint', async () => {
      const userData = {
        nom: 'Test',
        prenom: 'User',
        email: 'test@test.com',
        password: 'password'
      };
      const mockResponse = { data: { id: 1, nom: 'Test', prenom: 'User' } };

      api.post.mockResolvedValueOnce(mockResponse);

      const result = await usersService.create(userData);

      expect(api.post).toHaveBeenCalledWith('/users', userData);
      expect(result).toBe(mockResponse);
    });

    it('should call getById endpoint', async () => {
      const userId = 1;
      const mockResponse = { data: { id: 1, nom: 'Test', prenom: 'User' } };

      api.get.mockResolvedValueOnce(mockResponse);

      const result = await usersService.getById(userId);

      expect(api.get).toHaveBeenCalledWith(`/users/${userId}`);
      expect(result).toBe(mockResponse);
    });
  });
});