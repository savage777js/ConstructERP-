import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Search, Plus, Briefcase, Calendar, MapPin, ChevronRight, Loader2, User, Archive, AlertTriangle, DollarSign } from 'lucide-react';
import ProjectForm from '../components/ProjectForm';
import { useAuth } from '../context/AuthContext';

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [closingProjectId, setClosingProjectId] = useState(null);
  const [closingLoading, setClosingLoading] = useState(false);
  const navigate = useNavigate();
  const { canWrite, role: userRole } = useAuth();
  
  // Solo roles operativos pueden crear/cerrar proyectos
  const canCreate = ['SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER'].includes(userRole);
  const canClose = ['SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER'].includes(userRole);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const response = await api.get('/projects/');
      setProjects(response.data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseProject = async () => {
    if (!closingProjectId) return;
    setClosingLoading(true);
    try {
      await api.delete(`/projects/${closingProjectId}`);
      setClosingProjectId(null);
      fetchProjects();
    } catch (error) {
      alert(error.response?.data?.detail || 'Error al cerrar el proyecto');
    } finally {
      setClosingLoading(false);
    }
  };

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.client_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-8">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-10">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
            <Briefcase size={28} className="text-blue-400" />
            Gestión de Obras
          </h1>
          <p className="text-slate-400 text-sm">Control operativo, personal y recursos por proyecto.</p>
        </div>
        {canCreate && (
          <button 
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center space-x-2 w-full sm:w-auto justify-center"
          >
            <Plus size={20} />
            <span>Nueva Obra</span>
          </button>
        )}
      </header>

      <div className="mb-6 sm:mb-8 relative max-w-md w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
        <input 
          type="text" 
          placeholder="Buscar obra, código o cliente..."
          className="w-full bg-slate-800/50 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-xl"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="animate-spin mb-4" size={40} />
          <p>Cargando proyectos operativos...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredProjects.map((project) => (
            <div 
              key={project.id} 
              className={`glass-card p-6 transition-all group relative overflow-hidden ${project.status === 'INACTIVE' ? 'opacity-70 grayscale-[0.5] hover:grayscale-0 border-dashed border-slate-700' : 'hover:border-blue-500/50 cursor-pointer'}`}
            >
              <div 
                className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer"
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <ChevronRight className="text-blue-400" />
              </div>
              
              <div className="flex justify-between items-start mb-4 relative z-10">
                <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">{project.code}</span>
                <div className="flex gap-2 items-center">
                  {project.status === 'INACTIVE' ? (
                    <span className="px-2 py-1 rounded bg-slate-500/10 text-slate-400 text-[10px] font-bold uppercase border border-slate-500/20">
                      CERRADO
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase">
                      EN EJECUCIÓN
                    </span>
                  )}
                </div>
              </div>

              <div onClick={() => navigate(`/projects/${project.id}`)} className="cursor-pointer">
                <h3 className={`text-xl font-bold mb-2 transition-colors ${project.status === 'INACTIVE' ? 'text-slate-300' : 'text-white group-hover:text-blue-400'}`}>
                  {project.name}
                </h3>
                
                <p className="text-slate-400 text-sm mb-6 line-clamp-2">
                  {project.client_name || 'Sin cliente asignado'}
                </p>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <MapPin size={14} className="text-slate-500" />
                    <span>{project.address || 'Ubicación no definida'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <Calendar size={14} className="text-slate-500" />
                    <span>Inicio: {new Date(project.start_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300 text-sm font-semibold">
                    <DollarSign size={14} className="text-emerald-400 shrink-0" />
                    <span>Presupuesto: <span className="text-emerald-400 font-extrabold">${project.budget ? Number(project.budget).toLocaleString('es-CL') : '0'}</span></span>
                  </div>
                  <div className="space-y-1.5 pt-2 border-t border-white/5">
                    <div className="flex justify-between text-xs font-semibold text-slate-300">
                      <span>Avance de Obra</span>
                      <span className="text-blue-400 font-extrabold">{project.progress || 0}%</span>
                    </div>
                    <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden border border-white/5">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${project.progress || 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center text-xs relative z-10">
                <div className="flex -space-x-2">
                   <div className="w-6 h-6 rounded-full bg-slate-700 border border-slate-800 flex items-center justify-center">
                     <User size={12} className="text-slate-400" />
                   </div>
                </div>
                {canClose && project.status === 'ACTIVE' ? (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setClosingProjectId(project.id); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors border border-red-500/10 font-bold"
                  >
                    <Archive size={12} />
                    Finalizar Obra
                  </button>
                ) : (
                  <span className="text-slate-500 font-bold">{project.status === 'INACTIVE' ? 'HISTÓRICO' : 'OPERATIVO'}</span>
                )}
              </div>
            </div>
          ))}
          
          {filteredProjects.length === 0 && (
            <div className="col-span-full py-20 text-center text-slate-500 bg-white/5 rounded-2xl border border-dashed border-white/10">
                <Briefcase size={48} className="mx-auto mb-4 opacity-10" />
                <p>No se encontraron proyectos activos.</p>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <ProjectForm 
          onClose={() => setShowModal(false)} 
          onSuccess={fetchProjects}
        />
      )}

      {/* Confirmation Modal */}
      {closingProjectId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-8 text-center animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
              <Archive className="text-red-400" size={32} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Finalizar Obra</h3>
            <p className="text-slate-400 mb-6 text-sm">
              ¿Estás seguro de cerrar este proyecto? 
              <br/><br/>
              <span className="flex items-center gap-2 justify-center text-red-300 font-medium bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                <AlertTriangle size={16} /> Todos los trabajadores asignados serán liberados automáticamente.
              </span>
            </p>
            
            <div className="flex gap-4">
              <button 
                onClick={() => setClosingProjectId(null)}
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

export default Projects;
