import { useState } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import api from '../api';

const WorkerForm = ({ onClose, onSuccess, workerData = null }) => {
  const isEdit = !!workerData;
  const [formData, setFormData] = useState({
    first_name: workerData?.first_name || '',
    last_name: workerData?.last_name || '',
    rut: workerData?.rut || '',
    role: workerData?.role || '',
    salary: workerData?.salary || '',
    hire_date: workerData?.hire_date ? new Date(workerData.hire_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    email: workerData?.email || '',
    phone: workerData?.phone || '',
    contract_end_date: workerData?.contract_end_date ? new Date(workerData.contract_end_date).toISOString().split('T')[0] : '',
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const newErrors = {};
    if (!formData.first_name) newErrors.first_name = 'El nombre es obligatorio';
    if (!formData.last_name) newErrors.last_name = 'El apellido es obligatorio';
    if (!formData.rut) newErrors.rut = 'El RUT es obligatorio';
    if (!formData.role) newErrors.role = 'El cargo es obligatorio';
    if (!formData.salary || formData.salary < 0) newErrors.salary = 'Ingrese un sueldo válido';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        salary: parseInt(formData.salary),
        hire_date: new Date(formData.hire_date).toISOString(),
      };

      if (isEdit) {
        await api.put(`/workers/${workerData.id}`, payload);
      } else {
        await api.post('/workers/', payload);
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
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card w-full max-w-2xl shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        <h2 className="text-2xl font-bold mb-6 gradient-text">Registrar Nuevo Trabajador</h2>

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
              <label className="block text-sm font-medium text-slate-300 mb-2">RUT</label>
              <input
                type="text"
                name="rut"
                value={formData.rut}
                onChange={handleChange}
                className={`w-full bg-slate-800/50 border ${errors.rut ? 'border-red-500' : 'border-white/10'} rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all`}
                placeholder="12.345.678-9"
              />
              {errors.rut && <p className="text-red-400 text-xs mt-1">{errors.rut}</p>}
            </div>

            {/* Cargo */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Cargo / Rol</label>
              <input
                type="text"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className={`w-full bg-slate-800/50 border ${errors.role ? 'border-red-500' : 'border-white/10'} rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all`}
                placeholder="Ej: Maestro Albañil"
              />
              {errors.role && <p className="text-red-400 text-xs mt-1">{errors.role}</p>}
            </div>

            {/* Sueldo */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Sueldo Base ($)</label>
              <input
                type="number"
                name="salary"
                value={formData.salary}
                onChange={handleChange}
                className={`w-full bg-slate-800/50 border ${errors.salary ? 'border-red-500' : 'border-white/10'} rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all`}
                placeholder="Ej: 850000"
              />
              {errors.salary && <p className="text-red-400 text-xs mt-1">{errors.salary}</p>}
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
