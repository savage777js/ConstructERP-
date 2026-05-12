import { useState, useEffect } from 'react';
import api from '../api';
import { Plus, Search, MoreVertical, Edit2, Trash2, UserPlus, UserMinus, Loader2, FileText, AlertTriangle, CheckCircle2, Users } from 'lucide-react';
import WorkerForm from '../components/WorkerForm';

const Workers = () => {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [closingWorkerId, setClosingWorkerId] = useState(null);
  const [activeAssignmentsWarning, setActiveAssignmentsWarning] = useState(null);
  const [closingLoading, setClosingLoading] = useState(false);

  const userRole = localStorage.getItem('userRole');
  const canManage = ['ADMIN', 'HR_MANAGER'].includes(userRole);

  useEffect(() => {
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/workers/');
      setWorkers(response.data);
    } catch (error) {
      console.error('Error fetching workers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (worker) => {
    if (!canManage) return;
    setSelectedWorker(worker);
    setShowModal(true);
  };

  const initDeactivate = (workerId) => {
    if (!canManage) return;
    setClosingWorkerId(workerId);
    setActiveAssignmentsWarning(null);
  };

  const handleConfirmDeactivate = async (force = false) => {
    if (!canManage || !closingWorkerId) return;
    setClosingLoading(true);
    try {
      await api.delete(`/workers/${closingWorkerId}?force=${force}`);
      setClosingWorkerId(null);
      setActiveAssignmentsWarning(null);
      fetchWorkers();
    } catch (error) {
      if (error.response?.status === 409) {
        setActiveAssignmentsWarning(error.response.data.detail);
      } else {
        alert(error.response?.data?.detail || 'Error al desactivar el trabajador');
        setClosingWorkerId(null);
      }
    } finally {
      setClosingLoading(false);
    }
  };

  const handleDownloadContract = async (workerId, rut) => {
    if (!canManage) return;
    try {
      const response = await api.get(`/workers/${workerId}/contract`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `contrato_${rut}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert('Error al descargar el contrato');
    }
  };

  const handleCreateSuccess = () => {
    fetchWorkers();
    setShowModal(false);
    setSelectedWorker(null);
  };

  const filteredWorkers = workers.filter(w => 
    `${w.first_name} ${w.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) || 
    w.rut.includes(searchTerm) ||
    w.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8">
      <header className="flex flex-col gap-6 mb-10">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Recursos Humanos</h1>
            <p className="text-slate-400">Panel central de gestión de personal, contratos y asistencia.</p>
          </div>
          {canManage && (
            <button 
              onClick={() => { setSelectedWorker(null); setShowModal(true); }}
              className="btn-primary flex items-center space-x-2"
            >
              <UserPlus size={20} />
              <span>Añadir Empleado</span>
            </button>
          )}
        </div>

        {/* HR Dashboard Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-6 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Users size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-400 font-medium">Total Personal Activo</p>
              <p className="text-2xl font-bold text-white">{workers.filter(w => w.status === 'ACTIVE').length}</p>
            </div>
          </div>
          <div className="glass-card p-6 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-400 font-medium">Roles Distintos</p>
              <p className="text-2xl font-bold text-white">{new Set(workers.filter(w => w.status === 'ACTIVE').map(w => w.role)).size}</p>
            </div>
          </div>
          <div className="glass-card p-6 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400">
              <FileText size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-400 font-medium">Contratos Históricos</p>
              <p className="text-2xl font-bold text-white">{workers.filter(w => w.status === 'INACTIVE').length}</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-slate-800/30 p-1 rounded-xl w-fit border border-white/5">
          <button className="px-6 py-2.5 rounded-lg bg-white/10 text-white font-medium shadow-sm transition-all">
            Directorio de Personal
          </button>
          <button className="px-6 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 font-medium transition-all cursor-not-allowed opacity-50" title="Próximamente">
            Asistencias
          </button>
          <button className="px-6 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 font-medium transition-all cursor-not-allowed opacity-50" title="Próximamente">
            Liquidaciones
          </button>
          <button className="px-6 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 font-medium transition-all cursor-not-allowed opacity-50" title="Próximamente">
            Capacitaciones
          </button>
        </div>
      </header>


      {/* Bar de búsqueda y filtros */}
      <div className="mb-6 flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nombre, RUT o cargo..."
            className="w-full bg-slate-800/50 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="text-sm text-slate-500">
          Mostrando {filteredWorkers.length} de {workers.length} trabajadores
        </div>
      </div>

      <div className="glass-card overflow-hidden shadow-2xl">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/5 text-slate-400 text-sm uppercase tracking-wider">
              <th className="px-6 py-4 font-semibold">Nombre</th>
              <th className="px-6 py-4 font-semibold">RUT</th>
              <th className="px-6 py-4 font-semibold">Cargo</th>
              <th className="px-6 py-4 font-semibold">Sueldo Base</th>
              <th className="px-6 py-4 font-semibold">Estado</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr>
                <td colSpan="6" className="px-6 py-10 text-center">
                  <div className="flex items-center justify-center space-x-2 text-slate-400">
                    <Loader2 className="animate-spin" size={20} />
                    <span>Cargando trabajadores...</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredWorkers.map((worker) => (
                <tr key={worker.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4 font-medium">{worker.first_name} {worker.last_name}</td>
                  <td className="px-6 py-4 text-slate-400">{worker.rut}</td>
                  <td className="px-6 py-4 text-slate-400">
                    <span className={`flex items-center gap-2 ${worker.status === 'INACTIVE' ? 'opacity-50 line-through' : ''}`}>
                       {worker.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-400">
                    <span className={`${worker.status === 'INACTIVE' ? 'opacity-50 font-mono text-xs' : ''}`}>
                       ${worker.salary?.toLocaleString('es-CL')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold border flex items-center justify-center gap-1.5 w-fit ${
                      worker.status === 'ACTIVE' 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                        : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                    }`}>
                      {worker.status === 'ACTIVE' && <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />}
                      {worker.status === 'ACTIVE' ? 'ACTIVO' : 'HISTÓRICO'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {canManage && worker.status === 'ACTIVE' && (
                        <>
                          <button 
                            onClick={() => handleDownloadContract(worker.id, worker.rut)}
                            className="p-2 hover:bg-blue-500/10 rounded-lg text-slate-400 hover:text-blue-400 transition-all shadow-lg"
                            title="Descargar Contrato"
                          >
                            <FileText size={16}/>
                          </button>
                          <button 
                            onClick={() => handleEdit(worker)}
                            className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all shadow-lg"
                            title="Editar Datos"
                          >
                            <Edit2 size={16}/>
                          </button>
                          <button 
                            onClick={() => initDeactivate(worker.id)}
                            className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400 transition-all shadow-lg"
                            title="Dar de Baja"
                          >
                            <Trash2 size={16}/>
                          </button>
                        </>
                      )}
                      
                      {canManage && worker.status === 'INACTIVE' && (
                        <button 
                          onClick={() => handleDownloadContract(worker.id, worker.rut)}
                          className="flex items-center gap-2 p-2 hover:bg-blue-500/10 rounded-lg text-slate-500 hover:text-blue-400 transition-all text-xs font-bold uppercase"
                          title="Descargar Contrato Histórico"
                        >
                          <FileText size={14}/> Contrato PDF
                        </button>
                      )}
                      
                      {!canManage && (
                        <span className="text-xs text-slate-500 uppercase font-semibold px-2">Lectura</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
            {!loading && filteredWorkers.length === 0 && (
              <tr>
                <td colSpan="6" className="px-6 py-20 text-center text-slate-500">
                  <div className="flex flex-col items-center">
                    <Search size={40} className="mb-4 opacity-20" />
                    <p>No se encontraron trabajadores con esos criterios.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {showModal && (
        <WorkerForm 
          onClose={() => { setShowModal(false); setSelectedWorker(null); }} 
          onSuccess={handleCreateSuccess}
          workerData={selectedWorker}
        />
      )}
      
      {closingWorkerId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-8 text-center animate-in zoom-in-95 duration-200">
            
            {!activeAssignmentsWarning ? (
              <>
                <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
                  <UserMinus className="text-red-400" size={32} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Dar de baja trabajador</h3>
                <p className="text-slate-400 mb-8 text-sm">
                  El trabajador será marcado como Histórico. Su contrato y registros seguirán disponibles en los archivos.
                </p>
                <div className="flex gap-4">
                  <button onClick={() => setClosingWorkerId(null)} disabled={closingLoading} className="flex-1 py-3 text-slate-400 hover:text-white font-bold transition-colors">Cancelar</button>
                  <button onClick={() => handleConfirmDeactivate(false)} disabled={closingLoading} className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl shadow-[0_0_20px_rgba(239,68,68,0.2)] transition-all font-bold flex items-center justify-center gap-2">
                    {closingLoading ? <Loader2 size={18} className="animate-spin"/> : 'Confirmar Baja'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-6">
                  <AlertTriangle className="text-amber-500" size={32} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2 text-center">Trabajador Ocupado</h3>
                
                <div className="bg-slate-900/50 rounded-xl p-5 mb-6 border border-white/5 text-left text-sm text-slate-300">
                   {activeAssignmentsWarning.message}
                   <div className="mt-3 text-amber-400 flex items-start gap-2 text-xs">
                     <AlertTriangle size={14} className="min-w-fit mt-0.5" />
                     <span>Si procedes, se cerrarán todas sus asignaciones y desaparecerá de los registros operativos de esas obras.</span>
                   </div>
                </div>

                <div className="flex gap-4">
                  <button onClick={() => { setClosingWorkerId(null); setActiveAssignmentsWarning(null); }} disabled={closingLoading} className="flex-1 py-3 text-slate-400 hover:text-white font-bold transition-colors">Abortar</button>
                  <button onClick={() => handleConfirmDeactivate(true)} disabled={closingLoading} className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl shadow-lg transition-all font-bold flex items-center justify-center gap-2">
                    {closingLoading ? <Loader2 size={18} className="animate-spin"/> : 'Forzar Liberación'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Workers;
