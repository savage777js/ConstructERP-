import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth, ROLE_LABELS } from '../context/AuthContext';
import {
  Users, ShieldCheck, Plus, Edit2, RefreshCw, ToggleLeft, ToggleRight,
  Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, X, UserPlus, Lock
} from 'lucide-react';

const ROLE_OPTIONS = [
  { value: 'SUPER_ADMIN', label: 'Super Administrador', desc: 'Acceso total al sistema' },
  { value: 'MANAGEMENT', label: 'Gerente General', desc: 'Solo lectura, supervisión' },
  { value: 'PROJECT_MANAGER', label: 'Encargado de Proyecto', desc: 'Gestión operativa completa' },
  { value: 'HR_MANAGER', label: 'Recursos Humanos', desc: 'Gestión de personal' },
];

const ROLE_COLORS = {
  SUPER_ADMIN: 'bg-red-500/15 text-red-400 border-red-500/30',
  ADMIN: 'bg-red-500/15 text-red-400 border-red-500/30',
  MANAGEMENT: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  PROJECT_MANAGER: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  HR_MANAGER: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  INVENTORY_MANAGER: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
};

const emptyForm = {
  full_name: '',
  email: '',
  password: '',
  role: 'PROJECT_MANAGER',
  rut: '',
};

const Admin = () => {
  const { isSuperAdmin, user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null); // null = crear nuevo
  const [form, setForm] = useState(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isSuperAdmin()) return;
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/auth/users');
      setUsers(res.data);
    } catch (e) {
      setError('No se pudo cargar la lista de usuarios.');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditUser(null);
    setForm(emptyForm);
    setError('');
    setShowModal(true);
  };

  const openEdit = (u) => {
    setEditUser(u);
    setForm({
      full_name: u.full_name || '',
      email: u.email || '',
      password: '',
      role: u.role || 'PROJECT_MANAGER',
      rut: u.rut || '',
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (editUser) {
        const payload = { ...form };
        if (!payload.password) delete payload.password;
        await api.put(`/auth/users/${editUser.id}`, payload);
        setSuccess('Usuario actualizado correctamente.');
      } else {
        if (!form.password) { setError('La contraseña es obligatoria para nuevos usuarios.'); setSubmitting(false); return; }
        await api.post('/auth/register', form);
        setSuccess('Usuario creado correctamente.');
      }
      setShowModal(false);
      fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al guardar el usuario.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (userId) => {
    setTogglingId(userId);
    try {
      await api.patch(`/auth/users/${userId}/toggle-active`);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al cambiar estado del usuario.');
    } finally {
      setTogglingId(null);
    }
  };

  if (!isSuperAdmin()) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
        <ShieldCheck size={48} className="text-red-500/50" />
        <p className="text-lg font-semibold">Acceso Restringido</p>
        <p className="text-sm">Solo el Super Administrador puede acceder a esta sección.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">

      {/* Header */}
      <header className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center">
              <ShieldCheck size={20} className="text-red-400" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Administración del Sistema</h1>
          </div>
          <p className="text-slate-400 text-sm ml-13">Gestión de usuarios, roles y permisos de ConstructERP.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-red-600/20"
        >
          <UserPlus size={16} />
          Crear Usuario
        </button>
      </header>

      {/* Feedback banners */}
      {success && (
        <div className="mb-4 flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-xl text-sm font-semibold">
          <CheckCircle2 size={16} />
          {success}
        </div>
      )}
      {error && !showModal && (
        <div className="mb-4 flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm font-semibold">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {ROLE_OPTIONS.map(opt => {
          const count = users.filter(u => u.role === opt.value || (opt.value === 'SUPER_ADMIN' && u.role === 'ADMIN')).length;
          return (
            <div key={opt.value} className={`glass-card p-4 rounded-2xl border ${ROLE_COLORS[opt.value]}`}>
              <p className="text-xs font-bold uppercase tracking-wider opacity-80">{opt.label}</p>
              <p className="text-3xl font-black mt-1">{count}</p>
              <p className="text-xs opacity-60 mt-0.5">{opt.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Users table */}
      <div className="glass-card overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center">
          <h2 className="font-bold text-white flex items-center gap-2">
            <Users size={18} className="text-slate-400" />
            Usuarios del Sistema
          </h2>
          <button
            onClick={fetchUsers}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
            title="Actualizar"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 text-slate-400 text-xs uppercase tracking-wider">
                <th className="px-6 py-3 font-semibold">Usuario</th>
                <th className="px-6 py-3 font-semibold">Rol</th>
                <th className="px-6 py-3 font-semibold">RUT</th>
                <th className="px-6 py-3 font-semibold">Estado</th>
                <th className="px-6 py-3 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-slate-400">
                      <Loader2 size={20} className="animate-spin" />
                      <span>Cargando usuarios...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                    No hay usuarios registrados.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  const roleColor = ROLE_COLORS[u.role] || 'bg-slate-500/15 text-slate-400 border-slate-500/30';
                  const roleName = ROLE_LABELS[u.role] || u.role;
                  return (
                    <tr key={u.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4">
                        <p className="font-bold text-white">{u.full_name || '—'}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{u.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${roleColor}`}>
                          {roleName}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-sm font-mono">
                        {u.rut || <span className="italic text-slate-600">—</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center w-fit gap-1.5 ${
                          u.is_active
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                        }`}>
                          {u.is_active && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                          {u.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(u)}
                            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                            title="Editar usuario"
                          >
                            <Edit2 size={14} />
                          </button>
                          {!isSelf && (
                            <button
                              onClick={() => handleToggle(u.id)}
                              disabled={togglingId === u.id}
                              className={`p-2 rounded-lg transition-all ${
                                u.is_active
                                  ? 'text-red-400 hover:bg-red-500/10'
                                  : 'text-emerald-400 hover:bg-emerald-500/10'
                              }`}
                              title={u.is_active ? 'Desactivar usuario' : 'Activar usuario'}
                            >
                              {togglingId === u.id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : u.is_active ? (
                                <ToggleLeft size={14} />
                              ) : (
                                <ToggleRight size={14} />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Crear / Editar Usuario */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-slate-950 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {editUser ? <Edit2 size={18} className="text-amber-400" /> : <UserPlus size={18} className="text-red-400" />}
                {editUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-all">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Nombre */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Nombre Completo</label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={e => setForm({ ...form, full_name: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:ring-2 focus:ring-red-500/50 transition-all"
                  placeholder="Nombre Apellido"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Correo Electrónico</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:ring-2 focus:ring-red-500/50 transition-all"
                  placeholder="usuario@empresa.cl"
                  required
                />
              </div>

              {/* RUT */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">RUT (opcional)</label>
                <input
                  type="text"
                  value={form.rut}
                  onChange={e => setForm({ ...form, rut: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:ring-2 focus:ring-red-500/50 transition-all font-mono"
                  placeholder="12.345.678-9"
                />
              </div>

              {/* Rol */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Rol del Sistema</label>
                <select
                  value={form.role}
                  onChange={e => setForm({ ...form, role: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:ring-2 focus:ring-red-500/50 transition-all cursor-pointer"
                >
                  {ROLE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label} — {opt.desc}</option>
                  ))}
                </select>
              </div>

              {/* Contraseña */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  {editUser ? 'Nueva Contraseña (dejar vacío para no cambiar)' : 'Contraseña'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 pr-12 text-white text-sm outline-none focus:ring-2 focus:ring-red-500/50 transition-all"
                    placeholder={editUser ? '••••••••' : 'Mínimo 8 caracteres'}
                    required={!editUser}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-2.5 rounded-xl text-sm">
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl text-sm transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-red-600/20 disabled:opacity-60"
                >
                  {submitting ? (
                    <><Loader2 size={14} className="animate-spin" /> Guardando...</>
                  ) : editUser ? (
                    <><Edit2 size={14} /> Guardar Cambios</>
                  ) : (
                    <><UserPlus size={14} /> Crear Usuario</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
