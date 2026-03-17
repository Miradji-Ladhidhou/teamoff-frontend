import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

// Mock axios
import axios from 'axios';
jest.mock('axios');

// Test component that uses auth context
const TestComponent = () => {
  const { user, login, logout, isAuthenticated } = useAuth();

  return (
    <div>
      <div data-testid="auth-status">
        {isAuthenticated ? 'Authenticated' : 'Not authenticated'}
      </div>
      <div data-testid="user-info">
        {user ? `${user.nom} ${user.prenom}` : 'No user'}
      </div>
      <button onClick={() => login({ email: 'test@test.com', password: 'password' })}>
        Login
      </button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('should provide initial unauthenticated state', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-status')).toHaveTextContent('Not authenticated');
    expect(screen.getByTestId('user-info')).toHaveTextContent('No user');
  });

  it('should handle successful login', async () => {
    const mockUser = {
      id: 1,
      nom: 'Test',
      prenom: 'User',
      email: 'test@test.com',
      role: 'employee'
    };

    const mockResponse = {
      data: {
        user: mockUser,
        token: 'mock-jwt-token'
      }
    };

    axios.post.mockResolvedValueOnce(mockResponse);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const loginButton = screen.getByText('Login');
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@test.com',
        password: 'password'
      });
    });

    // Check if user is stored in localStorage
    expect(localStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(mockUser));
    expect(localStorage.setItem).toHaveBeenCalledWith('token', 'mock-jwt-token');
  });

  it('should handle login error', async () => {
    const errorMessage = 'Invalid credentials';
    axios.post.mockRejectedValueOnce({
      response: { data: { message: errorMessage } }
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const loginButton = screen.getByText('Login');
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalled();
    });

    // Should remain unauthenticated on error
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Not authenticated');
  });

  it('should handle logout', () => {
    // Set up authenticated state
    const mockUser = {
      id: 1,
      nom: 'Test',
      prenom: 'User',
      email: 'test@test.com',
      role: 'employee'
    };

    localStorage.getItem.mockImplementation((key) => {
      if (key === 'user') return JSON.stringify(mockUser);
      if (key === 'token') return 'mock-token';
      return null;
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const logoutButton = screen.getByText('Logout');
    fireEvent.click(logoutButton);

    expect(localStorage.removeItem).toHaveBeenCalledWith('user');
    expect(localStorage.removeItem).toHaveBeenCalledWith('token');
  });

  it('should check user roles correctly', () => {
    const TestRoleComponent = () => {
      const { hasRole } = useAuth();

      return (
        <div>
          <div data-testid="admin-role">{hasRole('admin') ? 'Has admin' : 'No admin'}</div>
          <div data-testid="employee-role">{hasRole('employee') ? 'Has employee' : 'No employee'}</div>
        </div>
      );
    };

    // Mock user with employee role
    const mockUser = {
      id: 1,
      nom: 'Test',
      prenom: 'User',
      email: 'test@test.com',
      role: 'employee'
    };

    localStorage.getItem.mockImplementation((key) => {
      if (key === 'user') return JSON.stringify(mockUser);
      if (key === 'token') return 'mock-token';
      return null;
    });

    render(
      <AuthProvider>
        <TestRoleComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('admin-role')).toHaveTextContent('No admin');
    expect(screen.getByTestId('employee-role')).toHaveTextContent('Has employee');
  });
});