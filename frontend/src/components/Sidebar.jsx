import { Users, LayoutDashboard, Briefcase, Bell, LogOut, BarChart, Sparkles, GitBranch, FileText, Settings, ShieldCheck, Lock, HardHat } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth, ROLE_LABELS } from '../context/AuthContext';

const ROLE_COLORS = {
  SUPER_ADMIN: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444', border: 'rgba(239,68,68,0.3)' },
  ADMIN:       { bg: 'rgba(239,68,68,0.15)', text: '#ef4444', border: 'rgba(239,68,68,0.3)' },
  MANAGEMENT:  { bg: 'rgba(99,102,241,0.15)', text: '#818cf8', border: 'rgba(99,102,241,0.3)' },
  PROJECT_MANAGER: { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
  HR_MANAGER:  { bg: 'rgba(16,185,129,0.15)', text: '#10b981', border: 'rgba(16,185,129,0.3)' },
  INVENTORY_MANAGER: { bg: 'rgba(14,165,233,0.15)', text: '#0ea5e9', border: 'rgba(14,165,233,0.3)' },
};

const Sidebar = ({ onLogout, onCloseMobile }) => {
  const { user, role, isSuperAdmin } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  useEffect(() => {
    document.documentElement.classList.remove('light');
    localStorage.setItem('theme', 'dark');
  }, []);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await api.get('/notifications/unread-count');
        setUnreadCount(response.data.count);
      } catch (error) {
        console.error('Error fetching unread count:', error);
      }
    };
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 300000);
    return () => clearInterval(interval);
  }, []);

  const currentRole = role || localStorage.getItem('userRole') || '';
  const roleColor = ROLE_COLORS[currentRole] || ROLE_COLORS.HR_MANAGER;
  const roleLabel = ROLE_LABELS[currentRole] || currentRole;

  // Definición de todos los items de navegación con los roles permitidos
  const allNavItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      roles: ['SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER', 'MANAGEMENT'],
    },
    {
      name: 'Recursos Humanos',
      path: '/workers',
      icon: Users,
      roles: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER'],
    },
    {
      name: 'Proyectos',
      path: '/projects',
      icon: Briefcase,
      roles: ['SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER', 'MANAGEMENT'],
    },
    {
      name: 'Notificaciones',
      path: '/notifications',
      icon: Bell,
      count: unreadCount,
      roles: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'MANAGEMENT'],
    },
    {
      name: 'Reportes',
      path: '/reports',
      icon: BarChart,
      roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGEMENT'],
    },
    {
      name: 'Jerarquía',
      path: '/hierarchy',
      icon: GitBranch,
      roles: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER'],
    },
    {
      name: 'Capataz AI',
      path: '/capataz',
      icon: Sparkles,
      roles: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'MANAGEMENT'],
      special: 'ai',
    },
    {
      name: 'Documentación OCR',
      path: '/documents',
      icon: FileText,
      roles: ['SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER'],
      special: 'ocr',
    },
    // Solo Super Administrador
    {
      name: 'Administración',
      path: '/admin',
      icon: ShieldCheck,
      roles: ['SUPER_ADMIN', 'ADMIN'],
      special: 'admin',
    },
  ];

  const navItems = allNavItems.map(item => ({
    ...item,
    isLocked: !item.roles.includes(currentRole),
  }));

  const getNavStyle = (item, isActive) => {
    if (item.special === 'admin') {
      return {
        background: isActive ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.05)',
        color: '#ef4444',
        border: `1px solid ${isActive ? 'rgba(239,68,68,0.4)' : 'rgba(239,68,68,0.2)'}`,
        boxShadow: isActive ? '0 0 15px rgba(239,68,68,0.1)' : 'none',
      };
    }
    if (item.special === 'ai') {
      return {
        background: isActive ? 'linear-gradient(90deg, rgba(245,158,11,0.2), rgba(251,146,60,0.2))' : 'rgba(245,158,11,0.05)',
        color: '#fb923c',
        border: `1px solid ${isActive ? 'rgba(245,158,11,0.4)' : 'rgba(245,158,11,0.3)'}`,
        boxShadow: isActive ? '0 0 15px rgba(245,158,11,0.1)' : 'none',
      };
    }
    if (item.special === 'ocr') {
      return {
        background: isActive ? 'linear-gradient(90deg, rgba(16,185,129,0.2), rgba(5,150,105,0.2))' : 'rgba(16,185,129,0.05)',
        color: '#10b981',
        border: `1px solid ${isActive ? 'rgba(16,185,129,0.4)' : 'rgba(16,185,129,0.3)'}`,
        boxShadow: isActive ? '0 0 15px rgba(16,185,129,0.1)' : 'none',
      };
    }
    return {
      background: isActive ? 'var(--primary-glow)' : 'transparent',
      color: isActive ? 'var(--primary)' : 'var(--text-muted)',
      border: isActive ? '1px solid var(--primary-glow)' : '1px solid transparent',
      boxShadow: 'none',
    };
  };

  return (
    <aside style={{
      width: '256px',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--border)',
    }}>

      {/* Brand Header */}
      <div style={{ padding: '2rem 2rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.25rem' }}>
          <div style={{
            width: '44px', height: '44px', minWidth: '44px', minHeight: '44px',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(234, 88, 12, 0.15))',
            borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.25)'
          }}>
            <HardHat size={22} style={{ color: '#f59e0b' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h2 style={{
              fontSize: '1.25rem', fontWeight: 900, letterSpacing: '-0.04em',
              background: 'linear-gradient(90deg, #f59e0b, #fb923c)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              lineHeight: 1
            }}>
              ConstructERP
            </h2>
            <span style={{ fontSize: '8px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '4px', opacity: 0.6, letterSpacing: '0.03em', lineHeight: 1.2 }}>
              Empresa: Constructora Serconind
            </span>
          </div>
        </div>
      </div>

      {/* Removed User Role Badge for better vertical space */}

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '0 1rem', display: 'flex', flexDirection: 'column', gap: '3px', overflowY: 'auto' }}>
        {navItems.map((item) => {
          const isLocked = item.isLocked;
          return (
            <NavLink
              key={item.path}
              to={isLocked ? '#' : item.path}
              onClick={(e) => {
                if (isLocked) {
                  e.preventDefault();
                  return;
                }
                if (onCloseMobile) onCloseMobile();
              }}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.7rem 1rem',
                borderRadius: '12px',
                textDecoration: 'none',
                transition: 'all 0.2s ease',
                opacity: isLocked ? 0.45 : 1,
                cursor: isLocked ? 'not-allowed' : 'pointer',
                ...getNavStyle(item, isActive && !isLocked),
              })}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <item.icon size={18} style={{ color: isLocked ? '#64748b' : 'inherit' }} />
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: isLocked ? '#64748b' : 'inherit' }}>{item.name}</span>
              </div>
              {isLocked ? (
                <Lock size={12} style={{ color: '#64748b' }} />
              ) : (
                item.count > 0 && (
                  <span style={{
                    background: '#ef4444', color: 'white', fontSize: '10px', fontWeight: 900,
                    padding: '2px 8px', borderRadius: '99px', boxShadow: '0 4px 12px rgba(239,68,68,0.2)'
                  }}>
                    {item.count > 99 ? '99+' : item.count}
                  </span>
                )
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer: Logout */}
      <div style={{ padding: '1rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <button
          onClick={onLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.6rem 1rem', borderRadius: '10px',
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)',
            color: '#ef4444', cursor: 'pointer', transition: 'all 0.2s',
            fontSize: '0.8rem', fontWeight: 700, width: '100%', textAlign: 'left',
          }}
          onMouseOver={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.18)'; }}
          onMouseOut={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
        >
          <LogOut size={16} />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
