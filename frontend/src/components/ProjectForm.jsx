import { useState } from 'react';
import { X, Save, AlertCircle, Briefcase } from 'lucide-react';
import api from '../api';

const ProjectForm = ({ onClose, onSuccess, projectData = null }) => {
  const isEdit = !!projectData;
  const [formData, setFormData] = useState({
    name: projectData?.name || '',
    code: projectData?.code || '',
    client_name: projectData?.client_name || '',
    address: projectData?.address || '',
    description: projectData?.description || '',
    start_date: projectData?.start_date ? new Date(projectData.start_date).toISOString().split('T')[0] : '',
    end_date: projectData?.end_date ? new Date(projectData.end_date).toISOString().split('T')[0] : '',
    status: projectData?.status || 'ACTIVE',
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const newErrors = {};
    if (!formData.name) newErrors.name = 'El nombre de la obra es obligatorio';
    if (!formData.code) newErrors.code = 'El código de obra es obligatorio';
    if (!formData.start_date) newErrors.start_date = 'La fecha de inicio es obligatoria';
    
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
        start_date: new Date(formData.start_date).toISOString(),
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
      };

      if (isEdit) {
        await api.put(`/projects/${projectData.id}`, payload);
      } else {
        await api.post('/projects/', payload);
      }
      
      onSuccess();
      onClose();
    } catch (err) {
      setErrors({ api: err.response?.data?.detail || 'Error al guardar el proyecto' });
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

        <h2 className="text-2xl font-bold mb-6 gradient-text flex items-center gap-2">
          <Briefcase className="text-blue-400" />
          {isEdit ? 'Editar Proyecto' : 'Nueva Obra / Proyecto'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nombre */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-2">Nombre del Proyecto</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full bg-slate-800/50 border ${errors.name ? 'border-red-500' : 'border-white/10'} rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all`}
                placeholder="Ej: Montaje Industrial SERCONIND v2"
              />
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
            </div>

            {/* Código y Cliente */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Código de Obra</label>
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={handleChange}
                className={`w-full bg-slate-800/50 border ${errors.code ? 'border-red-500' : 'border-white/10'} rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all`}
                placeholder="Ej: OBRA-2024-001"
              />
              {errors.code && <p className="text-red-400 text-xs mt-1">{errors.code}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Cliente</label>
              <input
                type="text"
                name="client_name"
                value={formData.client_name}
                onChange={handleChange}
                className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="Ej: Minera Escondida"
              />
            </div>

            {/* Fechas */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Fecha Inicio</label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                className={`w-full bg-slate-800/50 border ${errors.start_date ? 'border-red-500' : 'border-white/10'} rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
              />
              {errors.start_date && <p className="text-red-400 text-xs mt-1">{errors.start_date}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Fecha Término Est.</label>
              <input
                type="date"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            {/* Ubicación */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-2">Ubicación / Dirección</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
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
              {submitting ? 'Guardando...' : <><Save size={18} /><span>{isEdit ? 'Actualizar Proyecto' : 'Crear Proyecto'}</span></>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectForm;
