import { useState, useEffect } from 'react';
import api from '../api';
import { Search, Plus, Package, Loader2, Edit, Trash2, Filter, AlertTriangle, ArrowUpDown } from 'lucide-react';
import InventoryForm from '../components/InventoryForm';

const Inventory = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [deletingItemId, setDeletingItemId] = useState(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  const userRole = localStorage.getItem('userRole');
  const canManage = ['ADMIN', 'INVENTORY_MANAGER'].includes(userRole);

  const categories = ['Herramientas', 'Materiales', 'EPP', 'Maquinaria', 'Consumibles', 'Otros'];

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await api.get('/inventory/');
      setItems(response.data);
    } catch (error) {
      console.error('Error fetching inventory items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!deletingItemId) return;
    setDeletingLoading(true);
    try {
      await api.delete(`/inventory/${deletingItemId}`);
      setDeletingItemId(null);
      fetchItems();
    } catch (error) {
      alert(error.response?.data?.detail || 'Error al eliminar el material');
    } finally {
      setDeletingLoading(false);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
    const matchesCategory = categoryFilter === '' || item.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const getStockStatus = (item) => {
    if (item.quantity_available <= 0) return { label: 'Sin Stock', color: 'text-red-400 bg-red-500/10' };
    if (item.quantity_available <= item.min_stock) return { label: 'Stock Crítico', color: 'text-amber-400 bg-amber-500/10' };
    return { label: 'Óptimo', color: 'text-emerald-400 bg-emerald-500/10' };
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto pb-20">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Package size={32} className="text-amber-500" />
            Inventario Central
          </h1>
          <p className="text-slate-400">Control global y existencias de materiales, EPP y herramientas de la empresa.</p>
        </div>
        {canManage && (
          <button 
            onClick={() => { setSelectedItem(null); setShowModal(true); }}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus size={20} />
            <span>Nuevo Material</span>
          </button>
        )}
      </header>

      {/* Filters Area */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nombre, SKU o descripción..."
            className="w-full bg-slate-800/50 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative w-full md:w-64">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <select
            className="w-full bg-slate-800/50 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-xl appearance-none cursor-pointer"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">Todas las Categorías</option>
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
      </div>

      {/* Table Card */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 text-slate-400">
            <Loader2 className="animate-spin mb-4" size={40} />
            <p>Sincronizando inventario...</p>
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-900/50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-white/5">
                  <th className="px-8 py-5">Código (SKU)</th>
                  <th className="px-8 py-5">Material / Activo</th>
                  <th className="px-8 py-5">Categoría</th>
                  <th className="px-8 py-5 text-center">Stock Total</th>
                  <th className="px-8 py-5 text-center">Disponible</th>
                  <th className="px-8 py-5 text-center">Mínimo</th>
                  <th className="px-8 py-5 text-center">Estado</th>
                  <th className="px-8 py-5">Ubicación</th>
                  {canManage && <th className="px-8 py-5 text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredItems.map((item) => {
                  const status = getStockStatus(item);
                  return (
                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-8 py-5 font-mono text-xs text-blue-400">{item.sku}</td>
                      <td className="px-8 py-5">
                        <div className="font-bold text-white">{item.name}</div>
                        {item.description && <div className="text-slate-500 text-xs mt-1 line-clamp-1">{item.description}</div>}
                      </td>
                      <td className="px-8 py-5 text-slate-300 text-sm">{item.category}</td>
                      <td className="px-8 py-5 text-center text-slate-300 text-sm font-bold">{item.quantity_total} {item.unit}</td>
                      <td className="px-8 py-5 text-center text-white text-sm font-black">{item.quantity_available} {item.unit}</td>
                      <td className="px-8 py-5 text-center text-slate-400 text-sm">{item.min_stock} {item.unit}</td>
                      <td className="px-8 py-5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-slate-400 text-sm">{item.location || 'N/A'}</td>
                      {canManage && (
                        <td className="px-8 py-5 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => { setSelectedItem(item); setShowModal(true); }}
                              className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors"
                              title="Editar Material"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => setDeletingItemId(item.id)}
                              className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                              title="Dar de Baja"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-32 text-center text-slate-500 bg-white/[0.01]">
            <Package size={48} className="mx-auto mb-4 opacity-10" />
            <p className="italic">No se encontraron materiales en el inventario.</p>
          </div>
        )}
      </div>

      {showModal && (
        <InventoryForm 
          onClose={() => { setShowModal(false); setSelectedItem(null); }}
          onSuccess={fetchItems}
          itemData={selectedItem}
        />
      )}

      {/* Confirmation Modal */}
      {deletingItemId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-8 text-center animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
              <Trash2 className="text-red-400" size={32} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Dar de baja material</h3>
            <p className="text-slate-400 mb-6 text-sm">
              ¿Estás seguro de que deseas retirar este material del inventario activo?
              <br/><br/>
              <span className="flex items-center gap-2 justify-center text-red-300 font-medium bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                <AlertTriangle size={16} /> Esta acción no eliminará las asignaciones históricas en las obras.
              </span>
            </p>
            
            <div className="flex gap-4">
              <button 
                onClick={() => setDeletingItemId(null)}
                disabled={deletingLoading}
                className="flex-1 py-3 text-slate-400 hover:text-white font-bold transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button 
                onClick={handleDeleteItem}
                disabled={deletingLoading}
                className="flex-1 py-3 bg-red-500 hover:bg-red-400 text-white rounded-xl shadow-[0_0_20px_rgba(239,68,68,0.3)] transition-all font-bold flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {deletingLoading ? <Loader2 size={18} className="animate-spin" /> : 'Confirmar Baja'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
