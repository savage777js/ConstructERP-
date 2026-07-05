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

export const getDefaultRoute = (role) => {
  if (role === 'HR_MANAGER') return '/workers';
  return '/dashboard';
};

// Roles que pueden escribir (crear/editar/eliminar)
const WRITE_ROLES = ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER'];
// Roles que son solo lectura
const READONLY_ROLES = ['MANAGEMENT'];
// Roles con acceso a administración del sistema
const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN'];
// Roles con acceso a RR.HH.
const HR_ROLES = ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER'];
// Roles con acceso a proyectos
const PROJECT_ROLES = ['SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER', 'MANAGEMENT'];

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

  // Session inactivity timeout (15 minutes)
  useEffect(() => {
    if (!user) return;

    const INACTIVITY_LIMIT = 15 * 60 * 1000; // 15 minutes
    let timeoutId;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        alert("Su sesión ha expirado por inactividad. Por favor, inicie sesión nuevamente.");
        logout();
      }, INACTIVITY_LIMIT);
    };

    // Events to track user activity
    const activityEvents = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'];
    
    activityEvents.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    // Start timer initially
    resetTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      activityEvents.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [user, logout]);

  const role = user?.role || localStorage.getItem('userRole') || '';

  /**
   * Verifica si el usuario actual tiene un permiso específico.
   * SUPER_ADMIN y ADMIN tienen acceso a todo.
   * MANAGEMENT es solo lectura (solo view:*).
   */
  const hasPermission = (permissionSlug) => {
    // Super Admin y Admin legacy tienen acceso absoluto
    if (ADMIN_ROLES.includes(role)) return true;

    // Gerente General solo puede ver cosas de números, estadísticas, plata (Dashboard, Proyectos, Reportes, Finanzas) y Jerarquía. No ve RR.HH. ni OCR.
    if (role === 'MANAGEMENT') {
      if (permissionSlug === 'hierarchy:view') {
        return true;
      }
      // Bloqueamos RR.HH. y OCR completamente
      if (permissionSlug.startsWith('employees:') || permissionSlug.includes('ocr') || permissionSlug.startsWith('hr:')) {
        return false;
      }
      // Solo permitimos lectura/vista
      return permissionSlug.startsWith('view:') || 
             permissionSlug.startsWith('read:') ||
             permissionSlug.endsWith(':view') ||
             permissionSlug.endsWith(':read') ||
             permissionSlug.includes(':view') ||
             permissionSlug.includes(':read') ||
             permissionSlug === 'dashboard:view' ||
             permissionSlug === 'projects:view' ||
             permissionSlug === 'reports:view' ||
             permissionSlug === 'finance:view';
    }

    // HR_MANAGER: gestión de personal, con acceso adicional a OCR, proyectos (para descarga de carpetas) y jerarquía.
    if (role === 'HR_MANAGER') {
      return permissionSlug.startsWith('employees:') || 
             permissionSlug.startsWith('notifications:') || 
             permissionSlug.startsWith('ai:') || 
             permissionSlug === 'ai:chat' ||
             permissionSlug === 'notifications:view' ||
             permissionSlug === 'ocr:use' ||
             permissionSlug === 'projects:view' ||
             permissionSlug === 'hierarchy:view';
    }

    // PROJECT_MANAGER: operativo en proyectos, finanzas, ocr, ia y vista en trabajadores
    if (role === 'PROJECT_MANAGER') {
      if (permissionSlug.startsWith('employees:')) {
        return permissionSlug === 'employees:view';
      }
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
