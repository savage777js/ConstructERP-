import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Workers from './pages/Workers';
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
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-main)', position: 'relative' }}>
      <Sidebar onLogout={logout} />
      <main style={{ marginLeft: '256px', flex: 1, position: 'relative', zIndex: 10, padding: '2rem' }}>
        {children}
      </main>
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
