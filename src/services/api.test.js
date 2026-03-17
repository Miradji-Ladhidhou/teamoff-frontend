import axios from 'axios';
import { authService, congesService, usersService } from '../services/api';

// Mock axios
jest.mock('axios');

describe('API Services', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('authService', () => {
    it('should call login endpoint', async () => {
      const credentials = { email: 'test@test.com', password: 'password' };
      const mockResponse = { data: { token: 'jwt-token', user: { id: 1 } } };

      axios.post.mockResolvedValueOnce(mockResponse);

      const result = await authService.login(credentials);

      expect(axios.post).toHaveBeenCalledWith('/auth/login', credentials);
      expect(result).toEqual(mockResponse.data);
    });

    it('should call register endpoint', async () => {
      const userData = {
        nom: 'Test',
        prenom: 'User',
        email: 'test@test.com',
        password: 'password'
      };
      const mockResponse = { data: { user: { id: 1 }, token: 'jwt-token' } };

      axios.post.mockResolvedValueOnce(mockResponse);

      const result = await authService.register(userData);

      expect(axios.post).toHaveBeenCalledWith('/auth/register', userData);
      expect(result).toEqual(mockResponse.data);
    });

    it('should call getProfile endpoint', async () => {
      const mockResponse = { data: { id: 1, nom: 'Test', prenom: 'User' } };

      axios.get.mockResolvedValueOnce(mockResponse);

      const result = await authService.getProfile();

      expect(axios.get).toHaveBeenCalledWith('/me');
      expect(result).toEqual(mockResponse.data);
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

      axios.get.mockResolvedValueOnce(mockResponse);

      const result = await congesService.getAll(params);

      expect(axios.get).toHaveBeenCalledWith('/conges', { params });
      expect(result).toEqual(mockResponse.data);
    });

    it('should call create endpoint', async () => {
      const congeData = {
        conge_type_id: 1,
        date_debut: '2024-06-01',
        date_fin: '2024-06-05'
      };
      const mockResponse = { data: { id: 1, statut: 'en_attente' } };

      axios.post.mockResolvedValueOnce(mockResponse);

      const result = await congesService.create(congeData);

      expect(axios.post).toHaveBeenCalledWith('/conges/demande', congeData);
      expect(result).toEqual(mockResponse.data);
    });

    it('should call update endpoint', async () => {
      const congeId = 1;
      const updateData = { statut: 'approuve' };
      const mockResponse = { data: { id: 1, statut: 'approuve' } };

      axios.put.mockResolvedValueOnce(mockResponse);

      const result = await congesService.update(congeId, updateData);

      expect(axios.put).toHaveBeenCalledWith(`/conges/${congeId}`, updateData);
      expect(result).toEqual(mockResponse.data);
    });

    it('should call delete endpoint', async () => {
      const congeId = 1;
      const mockResponse = { data: { message: 'Deleted successfully' } };

      axios.delete.mockResolvedValueOnce(mockResponse);

      const result = await congesService.delete(congeId);

      expect(axios.delete).toHaveBeenCalledWith(`/conges/${congeId}`);
      expect(result).toEqual(mockResponse.data);
    });

    it('should call getById endpoint', async () => {
      const congeId = 1;
      const mockResponse = { data: { id: 1, statut: 'en_attente' } };

      axios.get.mockResolvedValueOnce(mockResponse);

      const result = await congesService.getById(congeId);

      expect(axios.get).toHaveBeenCalledWith(`/conges/${congeId}`);
      expect(result).toEqual(mockResponse.data);
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

      axios.get.mockResolvedValueOnce(mockResponse);

      const result = await usersService.getAll(params);

      expect(axios.get).toHaveBeenCalledWith('/users', { params });
      expect(result).toEqual(mockResponse.data);
    });

    it('should call create endpoint', async () => {
      const userData = {
        nom: 'Test',
        prenom: 'User',
        email: 'test@test.com',
        password: 'password'
      };
      const mockResponse = { data: { id: 1, nom: 'Test', prenom: 'User' } };

      axios.post.mockResolvedValueOnce(mockResponse);

      const result = await usersService.create(userData);

      expect(axios.post).toHaveBeenCalledWith('/users', userData);
      expect(result).toEqual(mockResponse.data);
    });

    it('should call getById endpoint', async () => {
      const userId = 1;
      const mockResponse = { data: { id: 1, nom: 'Test', prenom: 'User' } };

      axios.get.mockResolvedValueOnce(mockResponse);

      const result = await usersService.getById(userId);

      expect(axios.get).toHaveBeenCalledWith(`/users/${userId}`);
      expect(result).toEqual(mockResponse.data);
    });
  });
});