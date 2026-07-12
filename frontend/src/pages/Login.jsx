import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { LogIn, Loader2, Eye, EyeOff, ShieldCheck, HardHat, Building2, BarChart3, Phone, Mail, X, HelpCircle, QrCode } from 'lucide-react';

const Login = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showQR, setShowQR] = useState(false);
  
  // Limpiar basura solo cuando se entra a la página de login por primera vez
  useEffect(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      params.append('username', email);
      params.append('password', password);

      const response = await api.post('/auth/login', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      const { access_token, user } = response.data;
      
      if (!access_token || !user) {
        throw new Error('El servidor no devolvió los datos esperados');
      }

      localStorage.setItem('token', access_token);
      localStorage.setItem('userRole', user.role);

      onLoginSuccess(user);
      
      // Redirección client-side usando React Router para evitar 404 en Render
      setTimeout(() => {
        navigate('/dashboard');
      }, 100);
    } catch (err) {
      console.error('❌ Error en Login:', err.response?.data || err.message);
      setError('Credenciales incorrectas o error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: HardHat,    label: 'Gestión de Obras',    desc: 'Control total de proyectos en ejecución' },
    { icon: Building2,  label: 'RRHH Integrado',      desc: 'Nómina, contratos y dotación de personal' },
    { icon: BarChart3,  label: 'Reportes Ejecutivos', desc: 'KPIs y métricas en tiempo real' },
    { icon: ShieldCheck,label: 'Control de Acceso',   desc: 'Roles y permisos por área operativa' },
  ];

  return (
    <div className="login-root">

      {/* ── Panel Izquierdo: Branding ── */}
      <div className="login-brand-panel">
        <div className="brand-grid" />
        <div className="brand-orb brand-orb-1" />
        <div className="brand-orb brand-orb-2" />
        <div className="brand-orb brand-orb-3" />
        <div className="brand-strip" />

        <div className="brand-content">

          {/* Logo */}
          <div className="brand-logo-wrap" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="orangeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#ea580c" />
                </linearGradient>
              </defs>
              <path d="M50 12L88 34V78L50 100L12 78V34L50 12Z" stroke="url(#orangeGrad)" strokeWidth="6" strokeLinejoin="round" />
              <path d="M12 34L50 56L88 34" stroke="url(#orangeGrad)" strokeWidth="4" strokeLinejoin="round" />
              <path d="M50 56V100" stroke="url(#orangeGrad)" strokeWidth="4" strokeLinejoin="round" />
              <path d="M50 12L50 56" stroke="url(#orangeGrad)" strokeWidth="3" strokeDasharray="3 3" />
              <path d="M12 78L50 56" stroke="url(#orangeGrad)" strokeWidth="3" strokeDasharray="3 3" />
              <path d="M88 78L50 56" stroke="url(#orangeGrad)" strokeWidth="3" strokeDasharray="3 3" />
            </svg>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="brand-logo-text" style={{ fontSize: '1.45rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.03em', lineHeight: 1 }}>
                Construct<span style={{ color: '#fb923c' }}>ERP</span>
              </span>
              <span style={{ fontSize: '0.625rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginTop: '4px' }}>
                SERCONIND LTDA.
              </span>
            </div>
          </div>

          {/* Headline */}
          <div className="brand-headline">
            <h1>
              Gestión de Obras<br />
              <span className="brand-headline-accent">Inteligente</span>
            </h1>
            <p className="brand-subtitle">
              Plataforma integral para el control operativo, financiero
              y de recursos humanos de proyectos de construcción.
            </p>

            {/* Módulos */}
            <div className="brand-features">
              {features.map(({ icon: Icon, label, desc }) => (
                <div key={label} className="brand-feature-item">
                  <div className="brand-feature-icon">
                    <Icon size={17} />
                  </div>
                  <div>
                    <p className="brand-feature-label">{label}</p>
                    <p className="brand-feature-desc">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pie del panel */}
          <p className="brand-footer">
            © 2026 SERCONIND LTDA. &nbsp;·&nbsp; Sistema ERP Modular v2.1
          </p>
        </div>
      </div>

      {/* ── Panel Derecho: Formulario ── */}
      <div className="login-form-panel">
        <div className="form-orb" />

        <div className="login-form-card">

          {/* Header */}
          <div className="form-header">
            <div className="form-header-badge">
              <ShieldCheck size={13} />
              <span>Acceso Corporativo Seguro</span>
            </div>
            <h2 className="form-title">Iniciar Sesión</h2>
            <p className="form-subtitle">
              Ingresa tus credenciales para acceder al sistema
            </p>
            <div className="form-title-line" />
          </div>

          {/* Error */}
          {error && (
            <div className="form-error-box">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="form-body">

            {/* Email */}
            <div className="form-field">
              <label className="form-label">Correo Electrónico</label>
              <div className="form-input-wrap">
                <svg className="form-input-icon" width="17" height="17"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="username"
                  className="form-input"
                  placeholder="usuario@serconind.cl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Password */}
            <div className="form-field">
              <label className="form-label">Contraseña</label>
              <div className="form-input-wrap">
                <svg className="form-input-icon" width="17" height="17"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  className="form-input form-input-password"
                  placeholder="••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="form-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              className={`form-submit-btn ${loading ? 'form-submit-btn--loading' : ''}`}
            >
              {loading ? (
                <>
                  <Loader2 size={17} className="spin-icon" />
                  <span>Autenticando...</span>
                </>
              ) : (
                <>
                  <LogIn size={17} />
                  <span>Ingresar al Sistema</span>
                </>
              )}
            </button>
          </form>

          {/* Footer ayuda */}
          <div className="form-help-text">
            <span>¿Problemas de acceso? Contacte al</span>
            <span 
              className="form-help-link" 
              onClick={() => setShowSupportModal(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setShowSupportModal(true); }}
            >
              Administrador del Sistema
            </span>
          </div>
        </div>

        <p className="form-panel-footer">
          © 2026 SERCONIND LTDA. Todos los derechos reservados.
        </p>
      </div>

      {/* Modal de Soporte */}
      {showSupportModal && (
        <div className="support-modal-overlay" onClick={() => setShowSupportModal(false)}>
          <div className="support-modal-card" onClick={(e) => e.stopPropagation()}>
            <button 
              className="support-modal-close" 
              onClick={() => setShowSupportModal(false)}
              aria-label="Cerrar modal de soporte"
            >
              <X size={18} />
            </button>
            <div className="support-modal-header">
              <div className="support-modal-icon">
                <HelpCircle size={22} />
              </div>
              <h3>Soporte Técnico</h3>
              <p>¿Tienes problemas para ingresar al sistema? Ponte en contacto con nosotros.</p>
            </div>
            <div className="support-modal-body">
              <div className="support-contact-item">
                <Phone size={18} className="support-item-icon" />
                <div className="support-item-content">
                  <span className="support-item-label">Teléfono de Soporte</span>
                  <a href="tel:+56912345678" className="support-item-value">+56 9 1234 5678</a>
                </div>
              </div>
              <div className="support-contact-item">
                <Mail size={18} className="support-item-icon" />
                <div className="support-item-content">
                  <span className="support-item-label">Correo Electrónico</span>
                  <a href="mailto:soporte.constructERP@gmail.com" className="support-item-value">soporte.constructERP@gmail.com</a>
                </div>
              </div>
            </div>
            <div className="support-modal-footer">
              <button className="support-modal-btn" onClick={() => setShowSupportModal(false)}>
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Código QR Flotante para Evaluadores (Acceso Móvil) */}
      <div className="login-qr-floating">
        {showQR && (
          <div className="qr-dropdown-card">
            <h4>Acceso Móvil Docentes</h4>
            <p>Escanea este código con tu celular para evaluar el diseño responsivo en tiempo real.</p>
            <div className="qr-code-img-container">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(window.location.origin)}`} 
                alt="Código QR de Acceso Móvil" 
              />
            </div>
            <span className="qr-url">{window.location.origin}</span>
          </div>
        )}
        <button 
          type="button"
          onClick={() => setShowQR(!showQR)} 
          className="qr-trigger-btn"
          title="Acceso Móvil para Evaluadores"
        >
          <QrCode size={18} />
          <span>Acceso Móvil</span>
        </button>
      </div>
    </div>
  );
};

export default Login;
