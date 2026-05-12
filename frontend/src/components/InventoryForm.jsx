import { useState } from 'react';
import { X, Save, AlertCircle, Package } from 'lucide-react';
import api from '../api';

const InventoryForm = ({ onClose, onSuccess, itemData = null }) => {
  const isEdit = !!itemData;
  const [formData, setFormData] = useState({
    name: itemData?.name || '',
    sku: itemData?.sku || '',
    category: itemData?.category || '',
    description: itemData?.description || '',
    unit: itemData?.unit || 'un',
    quantity_total: itemData?.quantity_total || 0,
    quantity_available: itemData?.quantity_available || 0,
    min_stock: itemData?.min_stock || 0,
    location: itemData?.location || '',
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const categories = ['Herramientas', 'Materiales', 'EPP', 'Maquinaria', 'Consumibles', 'Otros'];
  const units = ['un', 'kg', 'm', 'm2', 'm3', 'lt', 'set'];

  const validate = () => {
    const newErrors = {};
    if (!formData.name) newErrors.name = 'El nombre es obligatorio';
    if (!formData.sku) newErrors.sku = 'El código SKU es obligatorio';
    if (!formData.unit) newErrors.unit = 'La unidad es obligatoria';
    if (formData.quantity_total < 0) newErrors.quantity_total = 'El stock no puede ser negativo';
    
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
        quantity_total: parseInt(formData.quantity_total),
        quantity_available: isEdit ? parseInt(formData.quantity_available) : parseInt(formData.quantity_total),
        min_stock: parseInt(formData.min_stock),
      };

      if (isEdit) {
        await api.put(`/inventory/${itemData.id}`, payload);
      } else {
        await api.post('/inventory/', payload);
      }
      
      onSuccess();
      onClose();
    } catch (err) {
      setErrors({ api: err.response?.data?.detail || 'Error al guardar el material' });
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
          <Package className="text-blue-400" />
          {isEdit ? 'Editar Material' : 'Nuevo Material / Herramienta'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nombre */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-2">Nombre del Material</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full bg-slate-800/50 border ${errors.name ? 'border-red-500' : 'border-white/10'} rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all`}
                placeholder="Ej: Pala punta huevo Mango Fibra"
              />
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
            </div>

            {/* SKU */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Código Interno (SKU)</label>
              <input
                type="text"
                name="sku"
                value={formData.sku}
                onChange={handleChange}
                className={`w-full bg-slate-800/50 border ${errors.sku ? 'border-red-500' : 'border-white/10'} rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all`}
                placeholder="Ej: HER-001"
              />
              {errors.sku && <p className="text-red-400 text-xs mt-1">{errors.sku}</p>}
            </div>

            {/* Categoría */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Categoría</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              >
                <option value="">Seleccionar categoría</option>
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>

            {/* Stock Actual */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Stock Inicial</label>
              <input
                type="number"
                name="quantity_total"
                value={formData.quantity_total}
                onChange={handleChange}
                disabled={isEdit}
                className={`w-full bg-slate-800/50 border ${errors.quantity_total ? 'border-red-500' : 'border-white/10'} rounded-lg px-4 py-2 text-white outline-none transition-all ${isEdit ? 'opacity-50 cursor-not-allowed' : 'focus:ring-2 focus:ring-blue-500'}`}
              />
              {errors.quantity_total && <p className="text-red-400 text-xs mt-1">{errors.quantity_total}</p>}
            </div>

            {/* Stock Mínimo */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Stock Crítico (Mínimo)</label>
              <input
                type="number"
                name="min_stock"
                value={formData.min_stock}
                onChange={handleChange}
                className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            {/* Unidad de Medida */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Unidad</label>
              <select
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              >
                {units.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>

            {/* Ubicación */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Ubicación Física</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="Ej: Estante B2"
              />
            </div>

            {/* Descripción */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-2">Descripción / Notas</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="2"
                className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
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
              {submitting ? 'Guardando...' : <><Save size={18} /><span>{isEdit ? 'Actualizar Material' : 'Registrar Material'}</span></>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InventoryForm;
