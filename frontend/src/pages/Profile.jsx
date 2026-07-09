import { useState } from 'react';
import { useAuth, ROLE_LABELS } from '../context/AuthContext';
import api from '../api';
import { 
  User, 
  Mail, 
  Lock, 
  KeyRound, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  Building2,
  FileText
} from 'lucide-react';

export default function Profile() {
  const { user, roleLabel } = useAuth();
  
  // Form states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Visibility states
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  // Request feedback states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Validations
    if (!isSuperAdmin && !currentPassword) {
      setErrorMsg('Debes ingresar tu contraseña actual por seguridad.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Las contraseñas nuevas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.put('/auth/me/password', {
        current_password: isSuperAdmin ? null : currentPassword,
        new_password: newPassword
      });

      setSuccessMsg(response.data.message || 'Contraseña actualizada exitosamente.');
      // Clear inputs
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error(err);
      setErrorMsg(
        err.response?.data?.detail || 
        'Ocurrió un error al actualizar la contraseña. Por favor intenta de nuevo.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Mi Perfil</h1>
        <p className="text-slate-400 text-sm mt-1">Gestiona tu información de cuenta y configuraciones de seguridad.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[var(--bg-sidebar)]/40 border border-white/5 rounded-2xl p-6 backdrop-blur-md relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -z-10" />
            
            <div className="flex flex-col items-center text-center space-y-4">
              {/* Profile Avatar */}
              <div className="relative group">
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-3xl shadow-xl shadow-blue-500/10 border-2 border-white/10 group-hover:scale-105 transition-transform duration-300">
                  {user?.full_name ? user.full_name[0].toUpperCase() : 'U'}
                </div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center text-blue-400" title="Cuenta Activa">
                  <ShieldCheck size={18} />
                </div>
              </div>

              {/* User Identity Details */}
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white leading-tight">{user?.full_name || 'Usuario del Sistema'}</h3>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {ROLE_LABELS[user?.role] || roleLabel || user?.role || 'Miembro'}
                </span>
              </div>
            </div>

            {/* Profile Fields List */}
            <div className="mt-8 space-y-4 border-t border-white/5 pt-6 text-sm">
              
              <div className="flex items-center gap-3 text-slate-300">
                <div className="p-2 rounded-lg bg-white/5 border border-white/5 text-slate-400">
                  <Mail size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Correo Electrónico</p>
                  <p className="text-xs font-semibold text-white truncate">{user?.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-slate-300">
                <div className="p-2 rounded-lg bg-white/5 border border-white/5 text-slate-400">
                  <FileText size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">RUT / Identificación</p>
                  <p className="text-xs font-semibold text-white">{user?.rut || 'No especificado'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-slate-300">
                <div className="p-2 rounded-lg bg-white/5 border border-white/5 text-slate-400">
                  <Building2 size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Organización / Empresa</p>
                  <p className="text-xs font-semibold text-white">Constructora Serconind SpA</p>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Right Side: Security / Password Change Form */}
        <div className="lg:col-span-2">
          <div className="bg-[var(--bg-sidebar)]/40 border border-white/5 rounded-2xl p-6 sm:p-8 backdrop-blur-md relative">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
              <KeyRound size={20} className="text-blue-400" />
              Seguridad de la Cuenta
            </h2>
            <p className="text-slate-400 text-xs mb-6">Actualiza tu contraseña para mantener tu cuenta segura.</p>

            {/* Error Message */}
            {errorMsg && (
              <div className="flex items-start gap-3 p-4 mb-6 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-xs leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200">
                <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                <p>{errorMsg}</p>
              </div>
            )}

            {/* Success Message */}
            {successMsg && (
              <div className="flex items-start gap-3 p-4 mb-6 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 text-xs leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                <p>{successMsg}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Current Password Field (Only displayed/required if NOT SUPER_ADMIN) */}
              {!isSuperAdmin ? (
                <div className="space-y-2">
                  <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    Contraseña Actual
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                      <Lock size={16} />
                    </span>
                    <input 
                      type={showCurrent ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-12 py-3 bg-slate-950/40 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/25 transition-all text-sm font-medium"
                      required
                    />
                    <button 
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                      title={showCurrent ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/15 mb-6 text-xs text-blue-300 flex items-start gap-3">
                  <ShieldCheck size={18} className="text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold mb-0.5">Acceso Especial de Super Administrador</p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">Como Super Administrador, puedes actualizar tu propia contraseña directamente sin necesidad de introducir tu contraseña actual.</p>
                  </div>
                </div>
              )}

              {/* Grid for New Password Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* New Password */}
                <div className="space-y-2">
                  <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    Nueva Contraseña
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                      <Lock size={16} />
                    </span>
                    <input 
                      type={showNew ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-12 py-3 bg-slate-950/40 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/25 transition-all text-sm font-medium"
                      required
                    />
                    <button 
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                      title={showNew ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500">Mínimo 6 caracteres.</p>
                </div>

                {/* Confirm New Password */}
                <div className="space-y-2">
                  <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    Confirmar Nueva Contraseña
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                      <Lock size={16} />
                    </span>
                    <input 
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-12 py-3 bg-slate-950/40 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/25 transition-all text-sm font-medium"
                      required
                    />
                    <button 
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                      title={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-4 border-t border-white/5">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all"
                >
                  {loading ? 'Actualizando...' : 'Guardar Cambios'}
                </button>
              </div>

            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
