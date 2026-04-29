import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

const defaultAuthContext = {
  user: null,
  loading: true,
  isAuthenticated: false,
  login: async () => ({ success: false, error: 'AuthProvider indisponible' }),
  register: async () => ({ success: false, error: 'AuthProvider indisponible' }),
  logout: () => {},
  updateUser: () => {},
  hasRole: () => false,
  isAdmin: () => false,
  isSuperAdmin: () => false,
  isManager: () => false,
  isEmploye: () => false,
  canValidateConges: () => false,
  canManageUsers: () => false,
  canManageEntreprises: () => false,
};

const AuthContext = createContext(defaultAuthContext);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === defaultAuthContext && process.env.NODE_ENV !== 'production') {
    console.warn('useAuth() called outside of AuthProvider — all permission checks will return false.');
  }
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
        // Resync silencieux du profil complet
        authService.getProfile()
          .then((res) => {
            const fresh = res.data;
            if (fresh?.id) {
              setUser(fresh);
              localStorage.setItem('user', JSON.stringify(fresh));
            }
          })
          .catch(() => {
            // token expiré — l'intercepteur axios redirige déjà vers /login
          });
      } catch {
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
      return {
        success: false,
        error: error.response?.data?.message || 'Erreur d\'inscription'
      };
    }
  };

  // Fonction de déconnexion
  const logout = async () => {
    try {
      await authService.logout();
    } catch {
      // On nettoie quoi qu'il arrive
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const updateUser = (partialUser) => {
    setUser((prev) => {
      const next = { ...prev, ...partialUser };
      localStorage.setItem('user', JSON.stringify(next));
      return next;
    });
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
    updateUser,
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