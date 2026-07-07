import { useState } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import api from '../api';

const PREDEFINED_ROLES = [
  'JORNALERO',
  'CAPATAZ',
  'ALBAÑIL',
  'CARPINTERO',
  'ELECTRICISTA',
  'PLOMERO',
  'SOLDADOR',
  'BODEGUERO',
  'ADMINISTRATIVO',
  'GUARDIA',
  'OTRO'
];

const WorkerForm = ({ onClose, onSuccess, workerData = null }) => {
  const isEdit = !!workerData;
  
  // Determine initial role select & custom role values
  const initialRole = workerData?.role || 'JORNALERO';
  const isPredefined = PREDEFINED_ROLES.includes(initialRole);
  const [roleSelect, setRoleSelect] = useState(isPredefined ? initialRole : 'OTRO');
  const [customRole, setCustomRole] = useState(isPredefined ? '' : initialRole);

  const [formData, setFormData] = useState({
    first_name: workerData?.first_name || '',
    last_name: workerData?.last_name || '',
    rut: workerData?.rut || '',
    age: workerData?.age || '',
    salary: workerData?.salary !== undefined ? workerData.salary : 553553,
    hire_date: workerData?.hire_date ? new Date(workerData.hire_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    email: workerData?.email || '',
    phone: workerData?.phone || '',
    contract_end_date: workerData?.contract_end_date ? new Date(workerData.contract_end_date).toISOString().split('T')[0] : '',
    contract_type: workerData?.contract_type || 'INDEFINIDO',
    afp: workerData?.afp || 'MODELO',
    health_system: workerData?.health_system || 'FONASA',
    colacion: workerData?.colacion !== undefined ? workerData.colacion : 0,
    movilizacion: workerData?.movilizacion !== undefined ? workerData.movilizacion : 0,
    bonos: workerData?.bonos !== undefined ? workerData.bonos : 0,
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const newErrors = {};
    if (!formData.first_name) newErrors.first_name = 'El nombre es obligatorio';
    if (!formData.last_name) newErrors.last_name = 'El apellido es obligatorio';
    
    const finalRole = roleSelect === 'OTRO' ? customRole : roleSelect;
    if (!finalRole.trim()) newErrors.role = 'El cargo es obligatorio';
    
    if (formData.salary === undefined || formData.salary === '' || formData.salary < 553553) {
      newErrors.salary = 'El sueldo mínimo es $553.553';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const finalRole = roleSelect === 'OTRO' ? customRole : roleSelect;
      const payload = {
        ...formData,
        role: finalRole,
        salary: parseInt(formData.salary),
        age: formData.age ? parseInt(formData.age) : null,
        rut: formData.rut || null,
        hire_date: new Date(formData.hire_date).toISOString(),
        contract_end_date: formData.contract_end_date ? new Date(formData.contract_end_date).toISOString() : null,
        contract_type: formData.contract_type,
        colacion: parseInt(formData.colacion) || 0,
        movilizacion: parseInt(formData.movilizacion) || 0,
        bonos: parseInt(formData.bonos) || 0,
      };

      if (isEdit) {
        await api.put(`/workers/${workerData.id}`, payload);
      } else {
        await api.post('/workers', payload);
      }
      
      onSuccess();
      onClose();
    } catch (err) {
      setErrors({ api: err.response?.data?.detail || 'Error al guardar el trabajador' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'contract_type' && value === 'INDEFINIDO') {
        updated.contract_end_date = '';
      }
      return updated;
    });
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="glass-card w-full max-w-2xl shadow-2xl relative my-8">
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        <h2 className="text-2xl font-bold mb-6 gradient-text">
          {isEdit ? 'Editar Trabajador' : 'Registrar Nuevo Trabajador'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nombres */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Nombres</label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                className={`w-full bg-slate-800/50 border ${errors.first_name ? 'border-red-500' : 'border-white/10'} rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all`}
                placeholder="Ej: Juan Andrés"
              />
              {errors.first_name && <p className="text-red-400 text-xs mt-1">{errors.first_name}</p>}
            </div>

            {/* Apellidos */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Apellidos</label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                className={`w-full bg-slate-800/50 border ${errors.last_name ? 'border-red-500' : 'border-white/10'} rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all`}
                placeholder="Ej: Pérez González"
              />
              {errors.last_name && <p className="text-red-400 text-xs mt-1">{errors.last_name}</p>}
            </div>

            {/* RUT */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">RUT (Opcional)</label>
              <input
                type="text"
                name="rut"
                value={formData.rut}
                onChange={handleChange}
                className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="12.345.678-9"
              />
            </div>

            {/* Edad */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Edad</label>
              <input
                type="number"
                name="age"
                value={formData.age}
                onChange={handleChange}
                className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="Ej: 35"
                min="18"
                max="100"
              />
            </div>

            {/* Cargo */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Cargo / Rol</label>
              <select
                value={roleSelect}
                onChange={(e) => {
                  setRoleSelect(e.target.value);
                  if (errors.role) setErrors(prev => ({ ...prev, role: null }));
                }}
                className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer"
              >
                {PREDEFINED_ROLES.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Custom Cargo (if OTRO is selected) */}
            {roleSelect === 'OTRO' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Especificar Cargo</label>
                <input
                  type="text"
                  value={customRole}
                  onChange={(e) => {
                    setCustomRole(e.target.value);
                    if (errors.role) setErrors(prev => ({ ...prev, role: null }));
                  }}
                  className={`w-full bg-slate-800/50 border ${errors.role ? 'border-red-500' : 'border-white/10'} rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all`}
                  placeholder="Ej: Pintor, Yesero"
                />
                {errors.role && <p className="text-red-400 text-xs mt-1">{errors.role}</p>}
              </div>
            )}

            {/* Sueldo */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Sueldo Base ($)</label>
              <input
                type="number"
                name="salary"
                value={formData.salary}
                onChange={handleChange}
                min="553553"
                className={`w-full bg-slate-800/50 border ${errors.salary ? 'border-red-500' : 'border-white/10'} rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all`}
                placeholder="Ej: 850000"
              />
              {errors.salary && <p className="text-red-400 text-xs mt-1">{errors.salary}</p>}
            </div>

            {/* Correo Electrónico */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Correo Electrónico</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="ejemplo@correo.com"
              />
            </div>

            {/* Teléfono */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Teléfono</label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="+56912345678"
              />
            </div>

            {/* Tipo de Contrato */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Tipo de Contrato</label>
              <select
                name="contract_type"
                value={formData.contract_type}
                onChange={handleChange}
                className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer"
              >
                <option value="INDEFINIDO">Indefinido</option>
                <option value="PLAZO_FIJO">Plazo Fijo</option>
              </select>
            </div>

            {/* Fecha de Ingreso */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Fecha de Ingreso</label>
              <input
                type="date"
                name="hire_date"
                value={formData.hire_date}
                onChange={handleChange}
                className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            {/* Fecha de Vencimiento Contrato */}
            {formData.contract_type === 'PLAZO_FIJO' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 font-bold flex items-center gap-2">
                  <AlertCircle size={14} className="text-amber-500" /> Vencimiento Contrato
                </label>
                <input
                  type="date"
                  name="contract_end_date"
                  value={formData.contract_end_date}
                  onChange={handleChange}
                  className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                />
                <p className="text-[10px] text-slate-500 mt-1 italic">Habilita alertas automáticas de RRHH.</p>
              </div>
            )}

            {/* AFP (Cotizaciones) */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">AFP (Previsión)</label>
              <select
                name="afp"
                value={formData.afp}
                onChange={handleChange}
                className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer"
              >
                <option value="MODELO">AFP Modelo</option>
                <option value="HABITAT">AFP Habitat</option>
                <option value="CAPITAL">AFP Capital</option>
                <option value="PROVIDA">AFP Provida</option>
                <option value="PLANVITAL">AFP PlanVital</option>
                <option value="CUPRUM">AFP Cuprum</option>
                <option value="UNO">AFP Uno</option>
              </select>
            </div>

            {/* Sistema de Salud */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Sistema de Salud</label>
              <select
                name="health_system"
                value={formData.health_system}
                onChange={handleChange}
                className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer"
              >
                <option value="FONASA">FONASA</option>
                <option value="ISAPRE">ISAPRE</option>
              </select>
            </div>

            {/* Asignación de Colación */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Asignación de Colación ($)</label>
              <input
                type="number"
                name="colacion"
                value={formData.colacion}
                onChange={handleChange}
                min="0"
                className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="Ej: 50000"
              />
            </div>

            {/* Asignación de Movilización */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Asignación de Movilización ($)</label>
              <input
                type="number"
                name="movilizacion"
                value={formData.movilizacion}
                onChange={handleChange}
                min="0"
                className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="Ej: 50000"
              />
            </div>

            {/* Otros Bonos Imponibles */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Otros Bonos / Bonificaciones ($)</label>
              <input
                type="number"
                name="bonos"
                value={formData.bonos}
                onChange={handleChange}
                min="0"
                className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="Ej: 80000"
              />
            </div>
          </div>

          {errors.api && (
            <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg flex items-center space-x-2 text-red-400 text-sm">
              <AlertCircle size={18} />
              <span>{errors.api}</span>
            </div>
          )}

          <div className="flex justify-end space-x-4 mt-8 pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary flex items-center space-x-2 px-8"
            >
              {submitting ? 'Guardando...' : <><Save size={18} /><span>Guardar Trabajador</span></>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WorkerForm;
