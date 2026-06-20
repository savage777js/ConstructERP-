import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api';

const AuthContext = createContext(null);

// Mapeo de roles a nombres legibles en español
export const ROLE_LABELS = {
  SUPER_ADMIN: 'Super Administrador',
  ADMIN: 'Super Administrador',
  MANAGEMENT: 'Gerente General',
  PROJECT_MANAGER: 'Encargado de Proyecto',
  HR_MANAGER: 'Recursos Humanos',
  INVENTORY_MANAGER: 'Inventario',
};

// Roles que pueden escribir (crear/editar/eliminar)
const WRITE_ROLES = ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER'];
// Roles que son solo lectura
const READONLY_ROLES = ['MANAGEMENT'];
// Roles con acceso a administración del sistema
const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN'];
// Roles con acceso a RR.HH.
const HR_ROLES = ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'MANAGEMENT'];
// Roles con acceso a proyectos
const PROJECT_ROLES = ['SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER', 'HR_MANAGER', 'MANAGEMENT'];

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

  const role = user?.role || localStorage.getItem('userRole') || '';

  /**
   * Verifica si el usuario actual tiene un permiso específico.
   * SUPER_ADMIN y ADMIN tienen acceso a todo.
   * MANAGEMENT es solo lectura (solo view:*).
   */
  const hasPermission = (permissionSlug) => {
    // Super Admin y Admin legacy tienen acceso absoluto
    if (ADMIN_ROLES.includes(role)) return true;

    // Gerente General solo puede ver — nunca crear, editar o eliminar
    if (role === 'MANAGEMENT') {
      return permissionSlug.startsWith('view:') || permissionSlug.startsWith('read:');
    }

    // HR_MANAGER: gestión de personal, sin acceso a inventario ni configuraciones
    if (role === 'HR_MANAGER') {
      const blocked = ['inventory:manage', 'system:config', 'users:manage', 'integrations:manage'];
      if (blocked.some(b => permissionSlug.startsWith(b))) return false;
      return true;
    }

    // PROJECT_MANAGER: operativo completo en proyectos, workers, expenses, ocr
    if (role === 'PROJECT_MANAGER') {
      return true;
    }

    if (!permissions) return false;
    return permissions.includes(permissionSlug);
  };

  /** Verifica si el rol puede crear/editar/eliminar registros */
  const canWrite = () => WRITE_ROLES.includes(role);

  /** Verifica si el rol es solo lectura */
  const isReadOnly = () => READONLY_ROLES.includes(role);

  /** Verifica si el rol puede administrar el sistema (usuarios, configuración) */
  const isSuperAdmin = () => ADMIN_ROLES.includes(role);

  /** Verifica si puede acceder a módulo de RR.HH. */
  const canAccessHR = () => HR_ROLES.includes(role);

  /** Verifica si puede acceder a módulo de proyectos */
  const canAccessProjects = () => PROJECT_ROLES.includes(role);

  /** Nombre legible del rol actual */
  const roleLabel = ROLE_LABELS[role] || role;

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
      hasPermission,
      canWrite,
      isReadOnly,
      isSuperAdmin,
      canAccessHR,
      canAccessProjects,
      roleLabel,
      role,
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
