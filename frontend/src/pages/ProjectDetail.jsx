import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { 
  ArrowLeft, Briefcase, Users, Package, Calendar, MapPin, 
  Plus, UserPlus, Box, Info, Loader2, CheckCircle2, AlertCircle,
  Clock, ShieldCheck, HardHat, MoreVertical, Archive, AlertTriangle
} from 'lucide-react';

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');
  
  // States for assignment modals
  const [showAssignWorker, setShowAssignWorker] = useState(false);
  const [showAssignItem, setShowAssignItem] = useState(false);
  const [availableWorkers, setAvailableWorkers] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  
  const [criticalStockWarning, setCriticalStockWarning] = useState(null);
  const [pendingInventoryAssignment, setPendingInventoryAssignment] = useState(null);
  
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closingLoading, setClosingLoading] = useState(false);

  const [assignmentForm, setAssignmentForm] = useState({
    worker_id: '',
    role: 'Jornalero'
  });

  const userRole = localStorage.getItem('userRole');
  const canAssignWorker = ['ADMIN', 'PROJECT_MANAGER', 'HR_MANAGER'].includes(userRole);
  const canAssignInventory = ['ADMIN', 'PROJECT_MANAGER', 'INVENTORY_MANAGER'].includes(userRole);
  const canManageProject = ['ADMIN', 'PROJECT_MANAGER'].includes(userRole);

  useEffect(() => {
    fetchProjectData();
  }, [id]);

  const fetchProjectData = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/projects/${id}`);
      setProject(response.data);
    } catch (error) {
      console.error('Error fetching project detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableResources = async () => {
    try {
      const [workersRes, invRes] = await Promise.all([
        api.get('/workers/'),
        api.get('/inventory/')
      ]);
      
      // Filtrar trabajadores que no tengan asignación ACTIVA en este proyecto
      const activeWorkerIds = project.assignments
        ? project.assignments.filter(a => a.is_active).map(a => a.worker.id)
        : [];
        
      setAvailableWorkers(workersRes.data.filter(w => !activeWorkerIds.includes(w.id) && w.status === 'ACTIVE'));
      setInventoryItems(invRes.data);
    } catch (error) {
       console.error('Error fetching available resources:', error);
    }
  };

  const handleAssignWorker = async (e) => {
    e.preventDefault();
    if (!canAssignWorker || !assignmentForm.worker_id) return;

    try {
      await api.post(`/projects/${id}/assign-worker`, { 
        worker_id: parseInt(assignmentForm.worker_id),
        role: assignmentForm.role 
      });
      setShowAssignWorker(false);
      setAssignmentForm({ worker_id: '', role: 'Jornalero' });
      fetchProjectData();
    } catch (error) {
      alert(error.response?.data?.detail || 'Error al asignar trabajador');
    }
  };

  const handleAssignInventory = async (itemId, quantity, comment, forceCritical = false) => {
    if (!canAssignInventory) return;
    try {
      await api.post(`/projects/${id}/assign-inventory`, { 
        item_id: parseInt(itemId), 
        quantity: parseInt(quantity),
        comment: comment,
        force_critical: forceCritical
      });
      setShowAssignItem(false);
      setCriticalStockWarning(null);
      setPendingInventoryAssignment(null);
      fetchProjectData();
    } catch (error) {
      if (error.response?.status === 409) {
        setCriticalStockWarning(error.response.data.detail);
        setPendingInventoryAssignment({ itemId, quantity, comment });
      } else {
        alert(error.response?.data?.detail || 'Error al asignar material');
      }
    }
  };

  const handleCloseProject = async () => {
    if (!canManageProject) return;
    setClosingLoading(true);
    try {
      await api.delete(`/projects/${id}`);
      setShowCloseModal(false);
      fetchProjectData();
    } catch (error) {
      alert(error.response?.data?.detail || 'Error al cerrar la obra');
    } finally {
      setClosingLoading(false);
    }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center text-slate-400">
      <Loader2 size={40} className="animate-spin mr-3 text-blue-500" />
      <span>Cargando núcleo operativo...</span>
    </div>
  );

  return (
    <div className="p-8 pb-20 max-w-7xl mx-auto">
      <button 
        onClick={() => navigate('/projects')}
        className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors group"
      >
        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" /> 
        Volver al Panel de Obras
      </button>

      <header className="mb-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-blue-500/10 p-2 rounded-lg">
                <Briefcase size={24} className="text-blue-400" />
              </div>
              <span className="text-sm font-bold text-blue-400/80 px-2 py-0.5 bg-blue-500/5 border border-blue-500/10 rounded uppercase tracking-widest">
                {project.code}
              </span>
            </div>
            <h1 className="text-5xl font-extrabold text-white mb-3 tracking-tight">{project.name}</h1>
            <div className="flex flex-wrap items-center gap-6 text-slate-400">
              <p className="flex items-center gap-2">
                <MapPin size={18} className="text-blue-500/50" /> {project.address}
              </p>
              <p className="flex items-center gap-2">
                <Calendar size={18} className="text-blue-500/50" /> 
                {new Date(project.start_date).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
            {canManageProject && project.status === 'ACTIVE' && (
              <button 
                onClick={() => setShowCloseModal(true)}
                className="mt-6 flex items-center gap-2 text-red-400 hover:text-red-300 bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-xl transition-all font-bold shadow-[0_0_15px_rgba(239,68,68,0.1)]"
              >
                <Archive size={16} /> Finalizar Obra Definitivamente
              </button>
            )}
          </div>
          
          <div className="flex flex-col items-end gap-2">
             <span className={`px-4 py-1.5 rounded-full text-sm font-bold border flex items-center gap-2 shadow-lg ${
               project.status === 'ACTIVE' 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/10' 
                : 'bg-slate-500/10 text-slate-400 border-slate-500/20 shadow-slate-500/10'
             }`}>
               {project.status === 'ACTIVE' && <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
               {project.status === 'ACTIVE' ? 'EN EJECUCIÓN' : 'CERRADO (HISTÓRICO)'}
             </span>
             <p className="text-xs text-slate-500 font-medium uppercase tracking-tighter">Estado de Obra</p>
          </div>
        </div>
      </header>

      {/* Tabs Menu */}
      <div className="flex gap-2 p-1 bg-slate-900/50 border border-white/5 rounded-2xl mb-10 w-fit backdrop-blur-md">
        {[
          { id: 'info', label: 'Dashboard General', icon: Info },
          { id: 'workers', label: 'Dotación de Personal', icon: Users, count: project.assignments?.filter(a => a.is_active).length || 0 },
          { id: 'inventory', label: 'Recursos en Obra', icon: Package, count: project.movements?.length || 0 }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-3 px-6 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${
              activeTab === tab.id 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
            {tab.count !== undefined && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[500px]">
        {activeTab === 'info' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 glass-card p-10 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-900/10">
                <h3 className="text-2xl font-bold mb-8 text-white flex items-center gap-3">
                  <Info className="text-blue-400" /> Especificaciones Técnicas
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-8">
                    <div>
                      <label className="label-neutral block mb-2">Cliente / Mandante</label>
                      <p className="text-xl text-white font-medium">{project.client_name || 'Sin especificar'}</p>
                    </div>
                    <div>
                      <label className="label-neutral block mb-2">Descripción General</label>
                      <p className="text-slate-300 leading-relaxed text-lg">
                        {project.description || 'No se ha proporcionado una descripción detallada para este proyecto operativo.'}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-8 bg-white/5 p-6 rounded-2xl border border-white/5">
                    <div className="grid grid-cols-1 gap-6">
                        <div className="flex items-start gap-4">
                          <div className="bg-blue-500/20 p-2 rounded-lg mt-1"><Clock size={16} className="text-blue-400" /></div>
                          <div>
                            <label className="label-neutral block mb-1">Cronograma</label>
                            <p className="text-white font-medium">Inicio: {new Date(project.start_date).toLocaleDateString('es-CL')}</p>
                            <p className="text-slate-400 text-sm">Término Est: {project.end_date ? new Date(project.end_date).toLocaleDateString('es-CL') : 'A definir'}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-4">
                          <div className="bg-emerald-500/20 p-2 rounded-lg mt-1"><ShieldCheck size={16} className="text-emerald-400" /></div>
                          <div>
                            <label className="label-neutral block mb-1">Observaciones Operativas</label>
                            <p className="text-slate-300 italic text-sm">"{project.observations || 'Sin observaciones críticas pendientes.'}"</p>
                          </div>
                        </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="glass-card p-8 border-l-4 border-l-blue-500 shadow-xl bg-blue-500/5">
                  <h4 className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-4">Métricas de Dotación</h4>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-4xl font-extrabold text-white">{project.assignments?.filter(a => a.is_active).length || 0}</p>
                      <p className="text-slate-400 text-xs mt-1">Trabajadores en terreno</p>
                    </div>
                    <Users size={48} className="text-blue-500/10" />
                  </div>
                </div>
                
                <div className="glass-card p-8 border-l-4 border-l-amber-500 shadow-xl bg-amber-500/5">
                  <h4 className="text-sm font-bold text-amber-400 uppercase tracking-widest mb-4">Stock de Recursos</h4>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-4xl font-extrabold text-white">{project.movements?.length || 0}</p>
                      <p className="text-slate-400 text-xs mt-1">Movimientos registrados</p>
                    </div>
                    <Package size={48} className="text-amber-500/10" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'workers' && (
          <div className="glass-card overflow-hidden border-white/5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-8 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 bg-white/[0.02]">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                  <Users size={24} className="text-blue-400" /> Plantilla de Personal
                </h3>
                <p className="text-slate-400 text-sm">Control de nómina y roles asignados a la obra.</p>
              </div>
              {canAssignWorker && project.status === 'ACTIVE' ? (
                <button 
                  onClick={() => { fetchAvailableResources(); setShowAssignWorker(true); }}
                  className="btn-primary flex items-center gap-2 py-3 px-6 shadow-lg shadow-blue-600/20"
                >
                  <UserPlus size={18} /> Asignar Especialista
                </button>
              ) : (
                <span className="text-sm text-slate-500 font-bold uppercase border border-white/5 px-4 py-2 rounded-xl bg-white/[0.02]">
                  {project.status === 'INACTIVE' ? 'Obra Cerrada' : 'Solo Lectura'}
                </span>
              )}
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-900/50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                    <th className="px-8 py-5">Trabajador</th>
                    <th className="px-8 py-5">RUT / ID</th>
                    <th className="px-8 py-5">Rol en Obra</th>
                    <th className="px-8 py-5">Fecha Ingreso</th>
                    <th className="px-8 py-5">Estado</th>
                    <th className="px-8 py-5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {project.assignments?.map(a => (
                    <tr key={a.id} className="hover:bg-white/[0.03] transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold border border-blue-500/20">
                            {a.worker.first_name[0]}{a.worker.last_name[0]}
                          </div>
                          <div>
                            <p className="text-white font-bold">{a.worker.first_name} {a.worker.last_name}</p>
                            <p className="text-xs text-slate-500">{a.worker.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-slate-400 font-mono text-sm">{a.worker.rut}</td>
                      <td className="px-8 py-6">
                        <span className="flex items-center gap-2 text-slate-200">
                          <HardHat size={14} className="text-blue-400" />
                          {a.role || 'Operario'}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-slate-400 text-sm">
                        {new Date(a.assigned_at).toLocaleDateString('es-CL')}
                      </td>
                      <td className="px-8 py-6">
                        {a.is_active ? (
                          <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold px-2 py-1 rounded-full bg-emerald-500/10 w-fit">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> ACTIVO
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-slate-500 text-xs font-bold px-2 py-1 rounded-full bg-white/5 w-fit">
                            FINALIZADO
                          </span>
                        )}
                      </td>
                      <td className="px-8 py-6 text-right">
                         <button className="text-slate-600 hover:text-white transition-colors">
                           <MoreVertical size={18} />
                         </button>
                      </td>
                    </tr>
                  ))}
                  {(!project.assignments || project.assignments.length === 0) && (
                    <tr>
                      <td colSpan="6" className="px-8 py-20 text-center">
                        <Users size={40} className="mx-auto mb-3 text-slate-700" />
                        <p className="text-slate-500 italic">No hay personal asignado actualmente.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="glass-card overflow-hidden border-white/5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-8 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 bg-white/[0.02]">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                  <Box size={24} className="text-amber-400" /> Consumo y Asignación de Materiales
                </h3>
                <p className="text-slate-400 text-sm">Registro histórico de salida y devolución de insumos.</p>
              </div>
              {canAssignInventory && project.status === 'ACTIVE' ? (
                <button 
                  onClick={() => { fetchAvailableResources(); setShowAssignItem(true); }}
                  className="btn-primary flex items-center gap-2 py-3 px-6 shadow-lg shadow-blue-600/20"
                >
                  <Plus size={18} /> Asignar Recurso
                </button>
              ) : (
                <span className="text-sm text-slate-500 font-bold uppercase border border-white/5 px-4 py-2 rounded-xl bg-white/[0.02]">
                  {project.status === 'INACTIVE' ? 'Obra Cerrada' : 'Solo Lectura'}
                </span>
              )}
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-900/50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                    <th className="px-8 py-5">Fecha Operación</th>
                    <th className="px-8 py-5">Tipo</th>
                    <th className="px-8 py-5">Insumo / Activo</th>
                    <th className="px-8 py-5 text-center">Cantidad</th>
                    <th className="px-8 py-5">Comentarios de Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {project.movements?.map(m => (
                    <tr key={m.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="px-8 py-6 text-slate-400 font-mono text-sm">
                        {new Date(m.date).toLocaleDateString('es-CL')}
                        <span className="block text-[10px] text-slate-600">{new Date(m.date).toLocaleTimeString('es-CL')}</span>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-2.5 py-1 rounded text-[10px] font-black tracking-tighter uppercase ${
                            m.type === 'ASSIGN' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                            {m.type === 'ASSIGN' ? 'SALIDA A OBRA' : 'RETORNO'}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-white font-bold">
                        {m.item?.name || `Material #${m.item_id}`}
                        {m.item?.sku && <span className="block text-xs font-normal text-slate-500">{m.item.sku}</span>}
                      </td>
                      <td className="px-8 py-6 text-center text-white font-mono text-lg">
                        {m.quantity}
                        <span className="text-[10px] text-slate-500 ml-1">{m.item?.unit}</span>
                      </td>
                      <td className="px-8 py-6 text-slate-400 text-sm italic max-w-xs truncate">
                        {m.comment || 'N/A'}
                      </td>
                    </tr>
                  ))}
                  {(!project.movements || project.movements.length === 0) && (
                    <tr>
                      <td colSpan="5" className="px-8 py-20 text-center">
                        <Box size={40} className="mx-auto mb-3 text-slate-700" />
                        <p className="text-slate-500 italic">No se registran movimientos de inventario vinculados.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Assignment Modal (Workers) */}
      {showAssignWorker && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4 overflow-y-auto pt-20">
             <div className="glass-card w-full max-w-xl p-10 relative shadow-[0_0_100px_rgba(37,99,235,0.2)]">
                 <button onClick={() => setShowAssignWorker(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors">
                   <ArrowLeft size={24} />
                 </button>
                 
                 <div className="mb-8">
                   <h3 className="text-3xl font-extrabold text-white mb-2">Asignar Especialista</h3>
                   <p className="text-slate-400">Seleccione el trabajador y defina su rol en este frente de trabajo.</p>
                 </div>

                 <form onSubmit={handleAssignWorker} className="space-y-6">
                   <div>
                     <label className="label-neutral block mb-3">Trabajador Disponible</label>
                     <select 
                       value={assignmentForm.worker_id}
                       onChange={(e) => setAssignmentForm({...assignmentForm, worker_id: e.target.value})}
                       className="w-full bg-slate-800/80 p-4 rounded-xl border border-white/10 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none"
                       required
                     >
                       <option value="">-- Buscar en nómina central --</option>
                       {availableWorkers.map(w => (
                         <option key={w.id} value={w.id}>{w.first_name} {w.last_name} ({w.role})</option>
                       ))}
                     </select>
                   </div>

                   <div>
                     <label className="label-neutral block mb-3">Rol Específico en Proyecto</label>
                     <input 
                       type="text"
                       placeholder="Ej: Capataz de Redes, Soldador HDPE, etc."
                       value={assignmentForm.role}
                       onChange={(e) => setAssignmentForm({...assignmentForm, role: e.target.value})}
                       className="w-full bg-slate-800/80 p-4 rounded-xl border border-white/10 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                       required
                     />
                   </div>

                   <div className="pt-6 flex gap-4">
                     <button type="button" onClick={() => setShowAssignWorker(false)} className="flex-1 py-4 text-slate-400 font-bold hover:text-white transition-colors">Cancelar</button>
                     <button type="submit" className="flex-1 btn-primary py-4 font-bold shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2">
                       <ShieldCheck size={18} /> Confirmar Asignación
                     </button>
                   </div>
                 </form>
             </div>
        </div>
      )}

      {/* Assignment Modal (Inventory) */}
      {showAssignItem && !criticalStockWarning && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4 overflow-y-auto pt-20">
             <div className="glass-card w-full max-w-xl p-10 relative">
                 <button onClick={() => setShowAssignItem(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors">
                   <ArrowLeft size={24} />
                 </button>

                 <div className="mb-8">
                   <h3 className="text-3xl font-extrabold text-white mb-2">Despacho de Recursos</h3>
                   <p className="text-slate-400">Salida de materiales o herramientas desde bodega a obra.</p>
                 </div>

                 <form onSubmit={(e) => {
                     e.preventDefault();
                     const formData = new FormData(e.target);
                     handleAssignInventory(formData.get('item_id'), formData.get('qty'), formData.get('comment'));
                 }} className="space-y-6">
                    <div>
                      <label className="label-neutral block mb-3">Insumo / Material Planificado</label>
                      <select name="item_id" className="w-full bg-slate-800/80 p-4 rounded-xl border border-white/10 text-white appearance-none focus:ring-2 focus:ring-amber-500 outline-none transition-all" required>
                          <option value="">-- Seleccionar de inventario central --</option>
                          {inventoryItems.map(i => (
                              <option key={i.id} value={i.id}>{i.name} (Stock: {i.quantity_available} {i.unit})</option>
                          ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="label-neutral block mb-3">Cantidad a Despachar</label>
                        <input name="qty" type="number" step="0.01" min="0.01" placeholder="0.00" className="w-full bg-slate-800/80 p-4 rounded-xl border border-white/10 text-white focus:ring-2 focus:ring-amber-500 outline-none transition-all" required />
                      </div>
                      <div>
                        <label className="label-neutral block mb-3">Centro de Costo / Glosa</label>
                        <input name="comment" type="text" placeholder="Obs. opcionales..." className="w-full bg-slate-800/80 p-4 rounded-xl border border-white/10 text-white focus:ring-2 focus:ring-amber-500 outline-none transition-all" />
                      </div>
                    </div>

                    <div className="pt-6 flex gap-4">
                        <button type="button" onClick={() => setShowAssignItem(false)} className="flex-1 py-4 text-slate-400 font-bold">Cancelar</button>
                        <button type="submit" className="flex-1 bg-amber-600 hover:bg-amber-500 text-white rounded-xl py-4 font-bold transition-all shadow-xl shadow-amber-600/20 flex items-center justify-center gap-2">
                          <Package size={18} /> Registrar Salida
                        </button>
                    </div>
                 </form>
             </div>
        </div>
      )}

      {/* Critical Stock Warning Modal */}
      {criticalStockWarning && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[110] flex items-center justify-center p-4">
             <div className="glass-card w-full max-w-md p-8 relative border border-amber-500/30 shadow-[0_0_50px_rgba(245,158,11,0.15)]">
                 <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-6">
                   <AlertTriangle className="text-amber-500" size={32} />
                 </div>
                 
                 <h3 className="text-2xl font-bold text-white mb-2 text-center">Advertencia de Stock Crítico</h3>
                 <p className="text-slate-400 text-center mb-6 text-sm">
                   Esta operación dejará el inventario central bajo el límite de seguridad establecido.
                 </p>
                 
                 <div className="bg-slate-900/50 rounded-xl p-5 mb-8 border border-white/5 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400">Stock Actual en Bodega:</span>
                      <span className="text-white font-mono font-bold">{criticalStockWarning.current}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-amber-500 font-medium">
                      <span>Cantidad Solicitada:</span>
                      <span className="font-mono">-{criticalStockWarning.request}</span>
                    </div>
                    <div className="border-t border-white/10 pt-3 flex justify-between items-center font-bold">
                      <span className="text-white">Stock Resultante:</span>
                      <span className="text-red-400 font-mono text-lg">{criticalStockWarning.resulting}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs mt-2 opacity-60">
                      <span className="text-slate-400">Límite Crítico (Min):</span>
                      <span className="text-amber-500 font-mono">{criticalStockWarning.min_stock}</span>
                    </div>
                 </div>

                 <div className="flex gap-4">
                     <button 
                       type="button" 
                       onClick={() => {
                         setCriticalStockWarning(null);
                         setPendingInventoryAssignment(null);
                       }} 
                       className="flex-1 py-3 text-slate-400 font-bold hover:text-white transition-colors"
                     >
                       Rechazar Operación
                     </button>
                     <button 
                       type="button" 
                       onClick={() => handleAssignInventory(
                         pendingInventoryAssignment.itemId,
                         pendingInventoryAssignment.quantity,
                         pendingInventoryAssignment.comment,
                         true
                       )}
                       className="flex-1 bg-amber-600 hover:bg-amber-500 text-white rounded-xl py-3 font-bold transition-all shadow-lg flex items-center justify-center gap-2"
                     >
                       Forzar Despacho
                     </button>
                 </div>
             </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-8 text-center animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
              <Archive className="text-red-400" size={32} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Cierre de Obra</h3>
            <p className="text-slate-400 mb-6 text-sm">
              ¿Estás seguro de finalizar definitivamente "{project.name}"? 
              <br/><br/>
              <span className="flex items-center gap-2 justify-center text-red-300 font-medium bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                <AlertTriangle size={16} /> Todos los trabajadores asignados serán liberados para nuevas asignaciones.
              </span>
            </p>
            
            <div className="flex gap-4">
              <button 
                onClick={() => setShowCloseModal(false)}
                disabled={closingLoading}
                className="flex-1 py-3 text-slate-400 hover:text-white font-bold transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button 
                onClick={handleCloseProject}
                disabled={closingLoading}
                className="flex-1 py-3 bg-red-500 hover:bg-red-400 text-white rounded-xl shadow-[0_0_20px_rgba(239,68,68,0.3)] transition-all font-bold flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {closingLoading ? <Loader2 size={18} className="animate-spin" /> : 'Confirmar Cierre'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetail;
