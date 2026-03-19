import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

const defaultAuthContext = {
  user: null,
  loading: true,
  isAuthenticated: false,
  login: async () => ({ success: false, error: 'AuthProvider indisponible' }),
  register: async () => ({ success: false, error: 'AuthProvider indisponible' }),
  logout: () => {},
  hasRole: () => false,
  isAdmin: () => false,
  isSuperAdmin: () => false,
  isManager: () => false,
  isEmploye: () => false,
  canValidateConges: () => false,
  canManageUsers: () => false,
};

const AuthContext = createContext(defaultAuthContext);

export const useAuth = () => {
  const context = useContext(AuthContext);
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Vérifier si l'utilisateur est connecté au chargement
  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (token && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Erreur lors du parsing des données utilisateur:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  // Fonction de connexion
  const login = async (credentials) => {
    try {
      const response = await authService.login(credentials);
      const { token, utilisateur: userData } = response.data;

      // Backend retourne utilisateur (pas user)
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));

      setUser(userData);
      setIsAuthenticated(true);

      return { success: true };
    } catch (error) {
      console.error('Erreur de connexion:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Erreur de connexion'
      };
    }
  };

  // Fonction d'inscription
  const register = async (data) => {
    try {
      const response = await authService.register(data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Erreur d\'inscription:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Erreur d\'inscription'
      };
    }
  };

  // Fonction de déconnexion
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
  };

  // Vérifier les permissions - utilisation directe des rôles backend
  const hasRole = (roles) => {
    if (!user?.role) return false;

    if (Array.isArray(roles)) {
      return roles.includes(user.role);
    }

    return user.role === roles;
  };

  // Vérifier si l'utilisateur est admin entreprise ou super admin
  const isAdmin = () => {
    return hasRole(['admin_entreprise', 'super_admin']);
  };

  // Vérifier si l'utilisateur est super admin
  const isSuperAdmin = () => {
    return hasRole(['super_admin']);
  };

  // Vérifier si l'utilisateur est manager ou supérieur
  const isManager = () => {
    return hasRole(['manager', 'admin_entreprise', 'super_admin']);
  };

  // Vérifier si l'utilisateur est employé
  const isEmploye = () => {
    return hasRole(['employe']);
  };

  // Vérifier si l'utilisateur peut valider des congés
  const canValidateConges = () => {
    return hasRole(['manager', 'admin_entreprise', 'super_admin']);
  };

  // Vérifier si l'utilisateur peut gérer les utilisateurs
  const canManageUsers = () => {
    return hasRole(['admin_entreprise', 'super_admin']);
  };

  // Vérifier si l'utilisateur peut gérer les entreprises
  const canManageEntreprises = () => {
    return hasRole(['super_admin']);
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    hasRole,
    isAdmin,
    isSuperAdmin,
    isManager,
    isEmploye,
    canValidateConges,
    canManageUsers,
    canManageEntreprises
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};