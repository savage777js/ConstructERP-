import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
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
    return <Navigate to="/dashboard" />;
  }

  return children;
};

const MainLayout = ({ children }) => {
  const { logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[var(--bg-main)] relative overflow-x-hidden">
      {/* Sidebar Wrapper (Hidden on mobile, slide in on state toggle, visible on desktop) */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 transform md:relative md:translate-x-0 transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
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
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Sticky Mobile Header */}
        <header className="flex md:hidden items-center justify-between p-4 bg-[var(--bg-sidebar)] border-b border-[var(--border)] sticky top-0 z-30">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-slate-400 hover:text-white transition-colors"
            title="Abrir menú"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <span className="font-extrabold text-sm gradient-text tracking-wider uppercase">ConstructERP</span>
          <div className="w-8" />
        </header>

        <main className="flex-1 p-4 md:p-8 relative z-10 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

function AppRoutes() {
  const { user, login } = useAuth();

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={!user ? <Login onLoginSuccess={login} /> : <Navigate to="/dashboard" />} 
        />
        
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
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
            <ProtectedRoute>
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
            <ProtectedRoute>
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

        <Route path="/" element={<Navigate to="/dashboard" />} />
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
