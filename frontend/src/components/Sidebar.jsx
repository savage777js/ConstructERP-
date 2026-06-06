import { Users, LayoutDashboard, Briefcase, Bell, LogOut, BarChart, Sun, Moon, Sparkles, GitBranch, FileText } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ onLogout, onCloseMobile }) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const [isLight, setIsLight] = useState(localStorage.getItem('theme') === 'light');
  
  useEffect(() => {
    if (isLight) {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, [isLight]);

  const toggleTheme = () => {
    const newTheme = !isLight;
    setIsLight(newTheme);
    localStorage.setItem('theme', newTheme ? 'light' : 'dark');
  };

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

  const userRole = localStorage.getItem('userRole');

  const navItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      roles: ['ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'INVENTORY_MANAGER', 'MANAGEMENT']
    },
    {
      name: 'Recursos Humanos',
      path: '/workers',
      icon: Users,
      roles: ['ADMIN', 'HR_MANAGER', 'MANAGEMENT', 'PROJECT_MANAGER']
    },
    {
      name: 'Proyectos',
      path: '/projects',
      icon: Briefcase,
      roles: ['ADMIN', 'PROJECT_MANAGER', 'MANAGEMENT', 'HR_MANAGER', 'INVENTORY_MANAGER']
    },
    {
      name: 'Notificaciones',
      path: '/notifications',
      icon: Bell,
      count: unreadCount,
      roles: ['ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'INVENTORY_MANAGER', 'MANAGEMENT']
    },
    {
      name: 'Reportes',
      path: '/reports',
      icon: BarChart,
      roles: ['ADMIN', 'MANAGEMENT']
    },
    {
      name: 'Jerarquía',
      path: '/hierarchy',
      icon: GitBranch,
      roles: ['ADMIN', 'MANAGEMENT']
    },
    {
      name: 'Capataz AI',
      path: '/capataz',
      icon: Sparkles,
      roles: ['ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'INVENTORY_MANAGER', 'MANAGEMENT']
    },
    {
      name: 'Documentación OCR',
      path: '/documents',
      icon: FileText,
      roles: ['ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'INVENTORY_MANAGER', 'MANAGEMENT']
    },
  ].filter(item => item.roles.includes(userRole));

  return (
    <aside 
      style={{ 
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
            background: 'white', borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <img 
              src="/logo.jpg" 
              alt="Serconind Logo" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
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
            <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', tracking: '0.1em', textTransform: 'uppercase', marginTop: '4px', opacity: 0.6 }}>
              Tech Division
            </span>
          </div>
        </div>
        {user && (
          <div style={{
            marginTop: '1.25rem',
            padding: '0.4rem 0.75rem',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.02em',
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
          }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#3b82f6',
              boxShadow: `0 0 8px #3b82f6`
            }} />
            <span style={{ color: 'var(--text-muted)' }}>Usuario:</span>
            <span style={{ color: 'var(--text)' }}>
              {user.full_name}
            </span>
          </div>
        )}
      </div>

      <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, var(--border), transparent)', margin: '0 2rem 1.5rem' }} />

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '0 1rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => onCloseMobile && onCloseMobile()}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              textDecoration: 'none',
              transition: 'all 0.3s ease',
              background: item.name === 'Capataz AI' 
                ? (isActive ? 'linear-gradient(90deg, rgba(245, 158, 11, 0.2), rgba(251, 146, 60, 0.2))' : 'rgba(245, 158, 11, 0.05)')
                : item.name === 'Documentación OCR'
                  ? (isActive ? 'linear-gradient(90deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.2))' : 'rgba(16, 185, 129, 0.05)')
                  : (isActive ? 'var(--primary-glow)' : 'transparent'),
              color: item.name === 'Capataz AI' 
                ? '#fb923c' 
                : item.name === 'Documentación OCR'
                  ? '#10b981'
                  : (isActive ? 'var(--primary)' : 'var(--text-muted)'),
              border: item.name === 'Capataz AI'
                ? '1px solid rgba(245, 158, 11, 0.3)'
                : item.name === 'Documentación OCR'
                  ? '1px solid rgba(16, 185, 129, 0.3)'
                  : (isActive ? '1px solid var(--primary-glow)' : '1px solid transparent'),
              boxShadow: item.name === 'Capataz AI' && isActive 
                ? '0 0 15px rgba(245, 158, 11, 0.1)' 
                : item.name === 'Documentación OCR' && isActive
                  ? '0 0 15px rgba(16, 185, 129, 0.1)'
                  : 'none',
            })}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <item.icon size={18} />
              <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{item.name}</span>
            </div>
            {item.count > 0 && (
              <span style={{
                background: '#ef4444', color: 'white', fontSize: '10px', fontWeight: 900,
                padding: '2px 8px', borderRadius: '99px', boxShadow: '0 4px 12px rgba(239,68,68,0.2)'
              }}>
                {item.count > 99 ? '99+' : item.count}
              </span>
            )}
          </NavLink>
        ))}
      </nav>


    </aside>
  );
};

export default Sidebar;
