import { useState, useEffect, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth, getDefaultRoute } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import { LogOut, User, ChevronDown } from 'lucide-react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Workers from './pages/Workers';
import Documents from './pages/Documents';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Notifications from './pages/Notifications';
import Reports from './pages/Reports';
import Capataz from './pages/Capataz';
import Hierarchy from './pages/Hierarchy';
import Admin from './pages/Admin';
import Profile from './pages/Profile';
import Can from './components/Can';

const ProtectedRoute = ({ children, requiredPermission }) => {
  const { user, loading, hasPermission } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-main)' }}>
        <div className="loader">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to={getDefaultRoute(user?.role)} />;
  }

  return children;
};

const TopHeader = ({ onOpenSidebar, sidebarCollapsed, onToggleSidebarCollapsed }) => {
  const { user, logout, roleLabel } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="flex justify-between items-center px-4 sm:px-6 py-4 bg-[var(--bg-sidebar)]/50 border-b border-[var(--border)] backdrop-blur-md sticky top-0 z-30">
      <div className="flex items-center gap-2">
        <button 
          onClick={onOpenSidebar}
          className="p-2 text-slate-400 hover:text-white transition-colors md:hidden"
          title="Abrir menú"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>

        {/* Toggle Sidebar Button for Desktop */}
        <button 
          onClick={onToggleSidebarCollapsed}
          className="hidden md:flex p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
          title={sidebarCollapsed ? "Mostrar menú lateral" : "Ocultar menú lateral"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            {sidebarCollapsed ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 9l-3 3m0 0l3 3m-3-3h7.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M12.75 15l3-3m0 0l-3-3m3 3h-7.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            )}
          </svg>
        </button>

        <span className="font-extrabold text-sm gradient-text tracking-wider uppercase md:hidden">ConstructERP</span>
        <div className="hidden md:block">
          <span className="text-slate-400 text-xs font-semibold tracking-wider uppercase">Plataforma Operativa</span>
        </div>
      </div>

      <div ref={menuRef} className="flex items-center gap-4 ml-auto relative">

        <div 
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-3 cursor-pointer p-1.5 px-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all select-none"
        >
          <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold border border-blue-500/20 text-sm">
            {user?.full_name ? user.full_name[0] : 'U'}
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-bold text-white leading-none mb-1">{user?.full_name || 'Usuario'}</span>
            <span className="text-[9px] text-slate-500 font-medium uppercase leading-none">{roleLabel || user?.role || 'Invitado'}</span>
          </div>
          <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`} />
        </div>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-slate-900 border border-white/10 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="px-3 py-2 border-b border-white/5 mb-1 sm:hidden">
              <p className="text-xs font-bold text-white">{user?.full_name}</p>
              <p className="text-[9px] text-slate-500 uppercase">{user?.role}</p>
            </div>
            <button
              onClick={() => { navigate("/profile"); setMenuOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-2 text-left text-xs text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-all font-bold mb-1"
            >
              <User size={14} />
              <span>Mi Perfil</span>
            </button>
            <button
              onClick={() => { logout(); setMenuOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-2 text-left text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all font-bold"
            >
              <LogOut size={14} />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const MainLayout = ({ children }) => {
  const { logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });

  const handleToggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebarCollapsed', String(next));
      return next;
    });
  };

  return (
    <div className="flex min-h-screen bg-[var(--bg-main)] relative overflow-x-hidden">
      {/* Sidebar Wrapper (Hidden on mobile, slide in on state toggle, visible on desktop) */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 transform transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${
          sidebarCollapsed ? 'md:-translate-x-full md:absolute md:-left-64' : 'md:translate-x-0 md:relative md:left-0'
        } md:flex`}
      >
        <Sidebar onLogout={logout} onCloseMobile={() => setSidebarOpen(false)} />
      </div>

      {/* Backdrop overlay for mobile */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col transition-all duration-300">
        <TopHeader 
          onOpenSidebar={() => setSidebarOpen(true)} 
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebarCollapsed={handleToggleSidebar}
        />

        <main className="flex-1 p-3 sm:p-4 md:p-8 relative z-10 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

function AppRoutes() {
  const { user, loading, login } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-main)' }}>
        <div className="loader">Cargando...</div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={!user ? <Login onLoginSuccess={login} /> : <Navigate to={getDefaultRoute(user?.role)} />} 
        />
        
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute requiredPermission="dashboard:view">
              <MainLayout>
                <Dashboard />
              </MainLayout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/workers" 
          element={
            <ProtectedRoute requiredPermission="employees:view">
              <MainLayout>
                <Workers />
              </MainLayout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/documents" 
          element={
            <ProtectedRoute requiredPermission="ocr:use">
              <MainLayout>
                <Documents />
              </MainLayout>
            </ProtectedRoute>
          } 
        />



        <Route 
          path="/projects" 
          element={
            <ProtectedRoute requiredPermission="projects:view">
              <MainLayout>
                <Projects />
              </MainLayout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/projects/:id" 
          element={
            <ProtectedRoute requiredPermission="projects:view">
              <MainLayout>
                <ProjectDetail />
              </MainLayout>
            </ProtectedRoute>
          } 
        />



        <Route 
          path="/notifications" 
          element={
            <ProtectedRoute>
              <MainLayout>
                <Notifications />
              </MainLayout>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/reports" 
          element={
            <ProtectedRoute requiredPermission="reports:view">
              <MainLayout>
                <Reports />
              </MainLayout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/hierarchy" 
          element={
            <ProtectedRoute requiredPermission="hierarchy:view">
              <MainLayout>
                <Hierarchy />
              </MainLayout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/capataz" 
          element={
            <ProtectedRoute>
              <MainLayout>
                <Capataz />
              </MainLayout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <MainLayout>
                <Profile />
              </MainLayout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/admin" 
          element={
            <ProtectedRoute>
              <MainLayout>
                <Admin />
              </MainLayout>
            </ProtectedRoute>
          } 
        />

        <Route path="/" element={<Navigate to={user ? getDefaultRoute(user.role) : "/login"} />} />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
