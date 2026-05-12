import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState(null);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    setUser(null);
    setPermissions([]);
    setOrganization(null);
    setLoading(false);
  }, []);

  const fetchUserData = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/auth/me');
      
      setUser(response.data.user);
      setPermissions(response.data.permissions || []);
      setOrganization(response.data.organization || null);
    } catch (error) {
      console.error('Error de autenticación:', error);
      logout();
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const hasPermission = (permissionSlug) => {
    // Super Admin bypass
    if (user?.role === 'ADMIN') return true;

    // Legacy role fallbacks
    const role = user?.role || localStorage.getItem('userRole');
    if (role === 'HR_MANAGER' || role === 'MANAGEMENT') return true;
    if (role === 'PROJECT_MANAGER' && permissionSlug === 'employees:view') return true;

    if (!permissions) return false;
    return permissions.includes(permissionSlug);
  };

  const login = (userData) => {
    setUser(userData);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      permissions, 
      organization, 
      loading, 
      login, 
      logout, 
      hasPermission 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
