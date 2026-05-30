import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { 
  ArrowLeft, Briefcase, Users, Calendar, MapPin, 
  Plus, UserPlus, Info, Loader2, CheckCircle2, AlertCircle,
  Clock, ShieldCheck, HardHat, MoreVertical, Archive, AlertTriangle,
  Edit2, Settings, ClipboardList, Folder, Eye, X, Check, MessageSquare
} from 'lucide-react';
import ProjectForm from '../components/ProjectForm';

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');
  
  // States for assignment modals
  const [showAssignWorker, setShowAssignWorker] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [availableWorkers, setAvailableWorkers] = useState([]);
  
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closingLoading, setClosingLoading] = useState(false);

  const [assignmentForm, setAssignmentForm] = useState({
    worker_id: '',
    role: 'Jornalero'
  });

  const [newNote, setNewNote] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);
  const [selectedWorkerDocs, setSelectedWorkerDocs] = useState(null);
  const [notesForm, setNotesForm] = useState({ assignmentId: null, notes: '' });

  const userRole = localStorage.getItem('userRole');
  const canAssignWorker = ['ADMIN', 'PROJECT_MANAGER', 'HR_MANAGER'].includes(userRole);
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
      const workersRes = await api.get('/workers/');
      
      // Filtrar trabajadores que no tengan asignación ACTIVA en este proyecto
      const activeWorkerIds = project.assignments
        ? project.assignments.filter(a => a.is_active).map(a => a.worker.id)
        : [];
        
      setAvailableWorkers(workersRes.data.filter(w => !activeWorkerIds.includes(w.id) && w.status === 'ACTIVE'));
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

  const handleCreateNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setSubmittingNote(true);
    try {
      await api.post(`/projects/${id}/logs`, { content: newNote });
      setNewNote('');
      fetchProjectData();
    } catch (error) {
      alert('Error al guardar nota de avance');
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleViewWorkerDocs = async (worker) => {
    try {
      const response = await api.get(`/documents/employee/${worker.id}`);
      setSelectedWorkerDocs({ worker, docs: response.data });
    } catch (error) {
      alert('Error al cargar la documentación del trabajador');
    }
  };

  const handleApproveAssignment = async (assignmentId) => {
    try {
      await api.patch(`/projects/${id}/assignments/${assignmentId}/approve`);
      fetchProjectData();
    } catch (error) {
      alert(error.response?.data?.detail || 'Error al otorgar visto bueno');
    }
  };

  const handleSaveNotes = async (assignmentId, notes) => {
    try {
      await api.patch(`/projects/${id}/assignments/${assignmentId}/notes`, { notes });
      setNotesForm({ assignmentId: null, notes: '' });
      fetchProjectData();
    } catch (error) {
      alert(error.response?.data?.detail || 'Error al guardar la nota');
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

  const sortedLogs = project.logs ? [...project.logs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) : [];

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
              <div className="mt-6 flex flex-wrap gap-4">
                <button 
                  onClick={() => setShowEditModal(true)}
                  className="flex items-center gap-2 text-blue-400 hover:text-blue-300 bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-xl transition-all font-bold shadow-[0_0_15px_rgba(59,130,246,0.1)]"
                >
                  <Edit2 size={16} /> Editar Especificaciones
                </button>
                <button 
                  onClick={() => setShowCloseModal(true)}
                  className="flex items-center gap-2 text-red-400 hover:text-red-300 bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-xl transition-all font-bold shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                >
                  <Archive size={16} /> Finalizar Obra Definitivamente
                </button>
              </div>
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
          { id: 'history', label: 'Bitácora de Obra', icon: ClipboardList, count: project.logs?.length || 0 }
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
                    <th className="px-8 py-5">Rol en Obra</th>
                    <th className="px-8 py-5">Visto Bueno</th>
                    <th className="px-8 py-5">Notas Gerenciales</th>
                    <th className="px-8 py-5">Documentos</th>
                    <th className="px-8 py-5 text-right"></th>
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
                      <td className="px-8 py-6">
                        <span className="flex items-center gap-2 text-slate-200">
                          <HardHat size={14} className="text-blue-400" />
                          {a.role || 'Operario'}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        {a.approved_by_manager ? (
                          <span className="flex items-center gap-1 text-emerald-400 text-xs font-bold px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/10 w-fit">
                            <Check size={12} /> Visto Bueno Dado
                          </span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <span className="text-slate-500 text-xs font-semibold italic">Pendiente de Visto Bueno</span>
                            {['ADMIN', 'MANAGEMENT'].includes(userRole) && a.is_active && (
                              <button
                                onClick={() => handleApproveAssignment(a.id)}
                                className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-lg text-[10px] font-black transition-all w-fit uppercase"
                              >
                                Otorgar Visto Bueno
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-8 py-6">
                        {notesForm.assignmentId === a.id ? (
                          <div className="flex gap-2 items-center">
                            <input 
                              type="text"
                              value={notesForm.notes}
                              onChange={(e) => setNotesForm({...notesForm, notes: e.target.value})}
                              className="bg-slate-800 border border-white/10 rounded px-2 py-1 text-xs text-white outline-none"
                              placeholder="Nota gerencial..."
                            />
                            <button 
                              onClick={() => handleSaveNotes(a.id, notesForm.notes)}
                              className="p-1 bg-emerald-600 rounded text-white"
                            >
                              <Check size={12} />
                            </button>
                            <button 
                              onClick={() => setNotesForm({ assignmentId: null, notes: '' })}
                              className="p-1 bg-slate-800 rounded text-slate-400"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-300 font-medium max-w-[200px] truncate block">
                              {a.manager_notes || <span className="text-slate-600 italic">Sin notas</span>}
                            </span>
                            {['ADMIN', 'MANAGEMENT'].includes(userRole) && a.is_active && (
                              <button 
                                onClick={() => setNotesForm({ assignmentId: a.id, notes: a.manager_notes || '' })}
                                className="p-1 hover:bg-white/5 rounded text-slate-500 hover:text-white transition-all"
                                title="Editar Nota"
                              >
                                <MessageSquare size={12} />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-8 py-6">
                        <button 
                          onClick={() => handleViewWorkerDocs(a.worker)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-white/5 rounded-xl text-slate-300 text-xs font-bold transition-all"
                        >
                          <Folder size={12} className="text-amber-500" /> Expediente
                        </button>
                      </td>
                      <td className="px-8 py-6 text-right">
                         {canAssignWorker && a.is_active && (
                           <button 
                             onClick={() => {
                               if (confirm(`¿Dar de baja a ${a.worker.first_name} ${a.worker.last_name} de esta obra?`)) {
                                 api.delete(`/workers/${a.worker.id}?force=true`).then(() => fetchProjectData());
                               }
                             }}
                             className="text-slate-600 hover:text-red-400 transition-colors"
                             title="Liberar de Obra"
                           >
                             <X size={16} />
                           </button>
                         )}
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

        {activeTab === 'history' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Form to leave progress note */}
            {project.status === 'ACTIVE' && (
              <div className="glass-card p-6 bg-white/[0.02]">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <ClipboardList className="text-blue-400" size={20} />
                  Dejar Nota de Avance
                </h3>
                <form onSubmit={handleCreateNote} className="space-y-4">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Describe el avance del día, novedades, problemas detectados o hitos alcanzados..."
                    rows={4}
                    className="w-full bg-slate-800/50 border border-white/10 rounded-xl p-4 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none text-sm leading-relaxed"
                    required
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingNote}
                      className="btn-primary py-2.5 px-6 font-bold shadow-lg shadow-blue-600/20 text-sm flex items-center gap-2"
                    >
                      {submittingNote ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                      Publicar en Bitácora
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Logs Timeline */}
            <div className="glass-card p-8">
              <h3 className="text-xl font-bold text-white mb-6">Línea de Tiempo y Bitácora</h3>
              
              <div className="relative border-l border-white/10 pl-6 ml-4 space-y-8">
                {sortedLogs.length > 0 ? (
                  sortedLogs.map((log) => {
                    const isSystem = log.log_type === 'SYSTEM';
                    return (
                      <div key={log.id} className="relative group">
                        {/* Dot icon */}
                        <div className={`absolute -left-[37px] top-1 w-6 h-6 rounded-full flex items-center justify-center border text-xs shadow-lg transition-transform group-hover:scale-110 ${
                          isSystem 
                            ? 'bg-blue-950 border-blue-500/30 text-blue-400' 
                            : 'bg-emerald-950 border-emerald-500/30 text-emerald-400'
                        }`}>
                          {isSystem ? <Settings size={12} /> : <Users size={12} />}
                        </div>

                        {/* Card body */}
                        <div className={`glass-card p-5 border transition-all ${
                          isSystem 
                            ? 'bg-blue-500/5 border-blue-500/10 hover:border-blue-500/20' 
                            : 'bg-emerald-500/5 border-emerald-500/10 hover:border-emerald-500/20'
                        }`}>
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                              isSystem ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'
                            }`}>
                              {isSystem ? 'REGISTRO DE CAMBIOS' : 'NOTA DE AVANCE'}
                            </span>
                            <span className="text-xs text-slate-500 font-mono">
                              {new Date(log.created_at).toLocaleString('es-CL')}
                            </span>
                          </div>

                          <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                            {log.content}
                          </div>

                          {log.user ? (
                            <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2 text-xs text-slate-500">
                              <span className="font-bold text-slate-400">Autor: {log.user.full_name} (RUT: {log.user.rut || 'S/R'})</span>
                              <span>·</span>
                              <span className="capitalize">{log.user.role.toLowerCase().replace('_', ' ')}</span>
                            </div>
                          ) : (
                            <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2 text-xs text-slate-500">
                              <span className="font-bold text-slate-400">Autor: Sistema</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-10 text-slate-500 italic">
                    No se registran notas ni actividades en la bitácora de esta obra.
                  </div>
                )}
              </div>
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

      {/* Worker Document Viewer Modal */}
      {selectedWorkerDocs && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-lg p-8 relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setSelectedWorkerDocs(null)} 
              className="absolute top-6 right-6 text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>
            <h3 className="text-2xl font-bold text-white mb-2">Expediente de Personal</h3>
            <p className="text-sm text-slate-400 mb-6">
              Visualizando documentos vigentes para <strong>{selectedWorkerDocs.worker.first_name} {selectedWorkerDocs.worker.last_name}</strong>
            </p>
            
            <div className="space-y-3 max-h-[300px] overflow-y-auto mb-6 pr-2">
              {selectedWorkerDocs.docs.length > 0 ? (
                selectedWorkerDocs.docs.map(doc => (
                  <div key={doc.id} className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-white">{doc.title}</p>
                      <span className="text-[10px] text-slate-500 font-semibold uppercase">{doc.category}</span>
                    </div>
                    <a 
                      href={api.defaults.baseURL ? `${api.defaults.baseURL.replace('/api/v1', '')}${doc.file_path}` : doc.file_path}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-all text-center"
                    >
                      Ver Archivo
                    </a>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-center py-6 italic text-sm">El trabajador no registra documentos cargados en su carpeta.</p>
              )}
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => { navigate('/documents'); setSelectedWorkerDocs(null); }}
                className="flex-1 py-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-xl transition-all font-bold text-xs text-center"
              >
                Ir a Cargar Documentos
              </button>
              <button 
                onClick={() => setSelectedWorkerDocs(null)} 
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-slate-400 rounded-xl transition-all font-bold text-xs"
              >
                Cerrar Ventana
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {showEditModal && (
        <ProjectForm 
          projectData={project}
          onClose={() => setShowEditModal(false)}
          onSuccess={fetchProjectData}
        />
      )}
    </div>
  );
};

export default ProjectDetail;
