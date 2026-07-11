import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Plus, Search, MoreVertical, Edit2, Trash2, UserPlus, UserMinus, Loader2, FileText, AlertTriangle, CheckCircle2, Users, Calendar, DollarSign, Download, Briefcase, Upload } from 'lucide-react';
import WorkerForm from '../components/WorkerForm';
import { useAuth } from '../context/AuthContext';

const AFP_RATES = {
  MODELO: 10.58,
  HABITAT: 11.27,
  CAPITAL: 11.44,
  PROVIDA: 11.45,
  PLANVITAL: 11.16,
  CUPRUM: 11.44,
  UNO: 10.49
};

const calculateAfpDeduction = (salary, bonos, afpKey) => {
  const base = Number(salary) || 0;
  const bonus = Number(bonos) || 0;
  const imponible = base + bonus;
  const rate = AFP_RATES[afpKey?.toUpperCase()] || AFP_RATES.MODELO;
  return Math.round(imponible * (rate / 100));
};

const Workers = () => {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [salaryFilter, setSalaryFilter] = useState('ALL');
  const [actionWorker, setActionWorker] = useState(null);
  
  const [closingWorkerId, setClosingWorkerId] = useState(null);
  const [activeAssignmentsWarning, setActiveAssignmentsWarning] = useState(null);
  const [closingLoading, setClosingLoading] = useState(false);

  const [activeTab, setActiveTab] = useState('directory');
  const [vacationRequests, setVacationRequests] = useState([]);
  const [showVacationModal, setShowVacationModal] = useState(false);
  const [vacationForm, setVacationForm] = useState({
    employee_id: '',
    start_date: '',
    end_date: '',
    days_requested: ''
  });
  const [showComplianceAlertModal, setShowComplianceAlertModal] = useState(null);

  const navigate = useNavigate();
  const { canWrite, isReadOnly, role: userRole } = useAuth();

  // canManage = puede crear/editar/eliminar
  const canManage = ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'].includes(userRole);
  // canReadHR = puede ver módulo de RRHH
  const canReadHR = ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER'].includes(userRole);

  useEffect(() => {
    fetchWorkers();
    if (canReadHR) {
      fetchVacationRequests();
    }
  }, []);

  // Calcular automáticamente días hábiles solicitados (excluyendo fines de semana)
  useEffect(() => {
    if (vacationForm.start_date && vacationForm.end_date) {
      const start = new Date(vacationForm.start_date + 'T00:00:00');
      const end = new Date(vacationForm.end_date + 'T00:00:00');
      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end) {
        let count = 0;
        let curDate = new Date(start.getTime());
        while (curDate <= end) {
          const dayOfWeek = curDate.getDay();
          if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Excluir Sábado (6) y Domingo (0)
            count++;
          }
          curDate.setDate(curDate.getDate() + 1);
        }
        setVacationForm(prev => ({ ...prev, days_requested: count.toString() }));
      } else {
        setVacationForm(prev => ({ ...prev, days_requested: '' }));
      }
    }
  }, [vacationForm.start_date, vacationForm.end_date]);

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

  const fetchVacationRequests = async () => {
    try {
      const response = await api.get('/workers/vacations/requests');
      setVacationRequests(response.data);
    } catch (error) {
      console.error('Error fetching vacations:', error);
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
    if (!canReadHR) return;
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

  const handleCreateSuccess = (worker, isEdit) => {
    fetchWorkers();
    setShowModal(false);
    setSelectedWorker(null);
    if (!isEdit && worker) {
      setShowComplianceAlertModal(worker);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get('/workers/template-excel', {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'plantilla_trabajadores.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert('Error al descargar la plantilla de Excel');
    }
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);
    try {
      const res = await api.post('/workers/import-excel', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      alert(`Importación exitosa. Se registraron ${res.data.imported_count} trabajadores.${res.data.errors?.length ? `\n\nAdvertencias:\n${res.data.errors.slice(0, 5).join('\n')}` : ''}`);
      fetchWorkers();
    } catch (error) {
      alert(error.response?.data?.detail || 'Error al importar archivo Excel');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const handleApproveVacation = async (requestId) => {
    try {
      await api.patch(`/workers/vacations/request/${requestId}/approve`);
      alert('Solicitud de vacaciones aprobada con éxito. Documento para firma generado.');
      fetchVacationRequests();
      fetchWorkers();
    } catch (error) {
      alert(error.response?.data?.detail || 'Error al aprobar vacaciones.');
    }
  };

  const handleRebateVacation = async (requestId) => {
    try {
      await api.patch(`/workers/vacations/request/${requestId}/rebate`);
      alert('Rebaja de vacaciones realizada con éxito. Días disponibles actualizados.');
      fetchVacationRequests();
      fetchWorkers();
    } catch (error) {
      alert(error.response?.data?.detail || 'Error al realizar rebaja de vacaciones.');
    }
  };

  const handleUploadVacationDoc = async (requestId, file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      await api.post(`/workers/vacations/request/${requestId}/upload-document`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      alert('Documento firmado cargado correctamente.');
      fetchVacationRequests();
    } catch (error) {
      alert(error.response?.data?.detail || 'Error al cargar documento firmado.');
    }
  };

  const handleRequestVacation = async (e) => {
    e.preventDefault();
    if (!vacationForm.employee_id || !vacationForm.start_date || !vacationForm.end_date || !vacationForm.days_requested) return;
    try {
      // Send naive date strings with time parts directly to prevent local timezone shifts and pass Pydantic validation
      await api.post('/workers/vacations/request', {
        employee_id: parseInt(vacationForm.employee_id),
        start_date: `${vacationForm.start_date}T00:00:00`,
        end_date: `${vacationForm.end_date}T00:00:00`,
        days_requested: parseInt(vacationForm.days_requested)
      });
      alert('Solicitud de vacaciones creada con éxito.');
      setShowVacationModal(false);
      setVacationForm({ employee_id: '', start_date: '', end_date: '', days_requested: '' });
      fetchVacationRequests();
    } catch (error) {
      const errorMsg = error.response?.data?.detail
        ? (typeof error.response.data.detail === 'string'
            ? error.response.data.detail
            : JSON.stringify(error.response.data.detail))
        : 'Error al crear solicitud de vacaciones.';
      alert(errorMsg);
    }
  };

  const upcomingExpirations = workers.filter(w => {
    if (w.status !== 'ACTIVE' || !w.contract_end_date) return false;
    const end = new Date(w.contract_end_date);
    const now = new Date();
    const diff = end - now;
    const diffDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  }).length;

  const monthlyPayroll = workers.filter(w => w.status === 'ACTIVE').reduce((acc, curr) => acc + (curr.salary || 0), 0);

  const filteredWorkers = workers.filter(w => {
    const matchesSearch = `${w.first_name} ${w.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (w.rut && w.rut.includes(searchTerm)) ||
      w.role?.toLowerCase().includes(searchTerm.toLowerCase());
      
    if (!matchesSearch) return false;

    if (salaryFilter === 'ALL') return true;
    if (salaryFilter === 'LOW') return (w.salary || 0) < 553553;
    if (salaryFilter === 'MEDIUM') return (w.salary || 0) >= 553553 && (w.salary || 0) <= 1000000;
    if (salaryFilter === 'HIGH') return (w.salary || 0) > 1000000;
    return true;
  });

  return (
    <div className="p-4 sm:p-8">
      <header className="flex flex-col gap-4 md:gap-6 mb-6 sm:mb-10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Recursos Humanos</h1>
            <p className="text-slate-400 text-sm">Panel central de gestión de personal, contratos y asistencia.</p>
          </div>
          {canManage && (
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <button 
                onClick={handleDownloadTemplate}
                className="flex items-center gap-1.5 px-4 py-2 border border-slate-700 bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-all shadow-md"
                title="Descargar Plantilla Excel"
              >
                <Download size={14} /> Plantilla
              </button>
              
              <label 
                className="flex items-center gap-1.5 px-4 py-2 border border-slate-700 bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer"
                title="Importar desde Excel"
              >
                <Plus size={14} /> Importar Excel
                <input 
                  type="file" 
                  accept=".xlsx" 
                  onChange={handleImportExcel} 
                  className="hidden" 
                />
              </label>

              <button 
                onClick={() => { setSelectedWorker(null); setShowModal(true); }}
                className="btn-primary flex items-center space-x-2 py-2 px-4 shadow-lg shadow-blue-600/20 justify-center text-xs font-bold rounded-lg"
              >
                <UserPlus size={14} />
                <span>Añadir Empleado</span>
              </button>
            </div>
          )}
        </div>

        {/* HR Dashboard Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
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
            <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Calendar size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-400 font-medium">Contratos por Vencer (30d)</p>
              <p className="text-2xl font-bold text-white">{upcomingExpirations}</p>
            </div>
          </div>
          <div className="glass-card p-6 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-400 font-medium">Costo Mensual de Nómina</p>
              <p className="text-2xl font-bold text-white">${monthlyPayroll.toLocaleString('es-CL')}</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-slate-800/30 p-1 rounded-xl w-full sm:w-fit border border-white/5 overflow-x-auto whitespace-nowrap scrollbar-none">
          <button 
            onClick={() => setActiveTab('directory')}
            className={`px-4 sm:px-6 py-2.5 rounded-lg font-medium transition-all shrink-0 ${activeTab === 'directory' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            Directorio de Personal
          </button>
          {canReadHR && (
            <button 
              onClick={() => setActiveTab('vacations')}
              className={`px-4 sm:px-6 py-2.5 rounded-lg font-medium transition-all shrink-0 ${activeTab === 'vacations' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              Vacaciones & Permisos
            </button>
          )}
        </div>
      </header>


      {/* Bar de búsqueda y filtros */}
      {activeTab === 'directory' && (
        <div className="mb-6 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="flex flex-1 flex-col md:flex-row gap-4 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nombre o cargo..."
              className="w-full bg-slate-800/50 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <select
              value={salaryFilter}
              onChange={(e) => setSalaryFilter(e.target.value)}
              className="bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer w-full"
            >
              <option value="ALL">Todos los Sueldos</option>
              <option value="LOW">Menor a $500,000</option>
              <option value="MEDIUM">$500,000 - $1,000,000</option>
              <option value="HIGH">Mayor a $1,000,000</option>
            </select>
          </div>
        </div>
        <div className="text-sm text-slate-500">
          Mostrando {filteredWorkers.length} de {workers.length} trabajadores
        </div>
      </div>
      )}

      {activeTab === 'directory' && (
        <div className="glass-card p-0 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          {/* Desktop Table View */}
          <table className="w-full text-left min-w-[600px] hidden md:table">
            <thead>
              <tr className="border-b border-white/5 text-slate-400 text-xs sm:text-sm uppercase tracking-wider">
                <th className="px-3 sm:px-6 py-3 sm:py-4 font-semibold">Nombre</th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 font-semibold">Contrato / Cargo</th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 font-semibold">Sueldo Base</th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 font-semibold">Días Disponibles</th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 font-semibold">Estado</th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-right">Proyecto / Obra</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-3 sm:px-6 py-10 text-center">
                    <div className="flex items-center justify-center space-x-2 text-slate-400">
                      <Loader2 className="animate-spin" size={20} />
                      <span>Cargando trabajadores...</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredWorkers.map((worker) => (
                  <tr key={worker.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-3 sm:px-6 py-3 sm:py-4 font-medium flex items-center justify-between group-hover:pr-2">
                      <div>
                        <p className="font-bold text-white truncate flex items-center gap-2">
                          {worker.first_name} {worker.last_name}
                          {worker.missing_mandatory_docs && worker.missing_mandatory_docs.length > 0 && (
                            <span 
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-[10px] text-rose-400 font-bold cursor-pointer hover:bg-rose-500/20 transition-all"
                              title={`Falta documentación obligatoria: ${worker.missing_mandatory_docs.join(', ')}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate('/documents', { state: { selectWorkerId: worker.id } });
                              }}
                            >
                              <AlertTriangle size={10} /> Faltan Docs
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] text-slate-500">{worker.rut || 'Sin RUT'} · {worker.email || 'Sin Email'}</p>
                      </div>
                      {canManage && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setActionWorker(worker); }}
                          className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-slate-400 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                          title="Opciones de Personal"
                        >
                          <MoreVertical size={14} />
                        </button>
                      )}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-slate-400">
                      <div>
                        <p className="text-white text-sm font-semibold">{worker.role}</p>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block leading-tight mt-0.5">
                          {worker.contract_type?.replace('_', ' ') || 'INDEFINIDO'}
                          {(worker.afp || worker.health_system) && (
                            ` · AFP: ${worker.afp || 'MODELO'} (${AFP_RATES[worker.afp?.toUpperCase()] || AFP_RATES.MODELO}%) · SALUD: ${worker.health_system || 'FONASA'}`
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-slate-400">
                      <div className={worker.status === 'INACTIVE' ? 'opacity-50' : ''}>
                        <p className="text-white font-bold text-sm">Base: ${worker.salary?.toLocaleString('es-CL')}</p>
                        <p className="text-[10px] text-rose-400 font-medium whitespace-nowrap leading-tight mt-0.5">
                          Desc. AFP: -${calculateAfpDeduction(worker.salary, worker.bonos, worker.afp).toLocaleString('es-CL')}
                        </p>
                        {(worker.colacion || worker.movilizacion || worker.bonos) ? (
                          <p className="text-[10px] text-slate-500 font-medium whitespace-nowrap mt-0.5">
                            + Col: ${(worker.colacion || 0).toLocaleString('es-CL')} · Mov: ${(worker.movilizacion || 0).toLocaleString('es-CL')} · Bonos: ${(worker.bonos || 0).toLocaleString('es-CL')}
                          </p>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-slate-400">
                      {worker.vacation_balance !== undefined ? (
                        <div className="flex items-center gap-1.5">
                          <span className={`font-bold ${worker.vacation_balance > 30 ? 'text-amber-400 font-black' : 'text-slate-300'}`}>
                            {worker.vacation_balance} días
                          </span>
                          {worker.vacation_balance > 30 && (
                            <span 
                              className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping" 
                              title="Alerta: Acumulación de vacaciones > 30 días"
                            />
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-600 text-xs italic">N/A</span>
                      )}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center justify-center gap-1.5 w-fit ${
                        worker.status === 'ACTIVE' 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                          : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                      }`}>
                        {worker.status === 'ACTIVE' && <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />}
                        {worker.status === 'ACTIVE' ? 'ACTIVO' : 'HISTÓRICO'}
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-right">
                      {worker.active_project ? (
                        <span className="inline-flex items-center gap-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs px-2.5 py-1 rounded-xl font-bold">
                          <Briefcase size={12} /> {worker.active_project}
                        </span>
                      ) : (
                        <span className="text-slate-600 text-xs italic">Sin asignar</span>
                      )}
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

          {/* Mobile Card List View */}
          <div className="md:hidden flex flex-col gap-4 p-4">
            {loading ? (
              <div className="flex items-center justify-center space-x-2 text-slate-400 py-10">
                <Loader2 className="animate-spin" size={20} />
                <span>Cargando trabajadores...</span>
              </div>
            ) : filteredWorkers.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-slate-500">
                <Search size={40} className="mb-4 opacity-20" />
                <p>No se encontraron trabajadores con esos criterios.</p>
              </div>
            ) : (
              filteredWorkers.map((worker) => (
                <div key={worker.id} className="bg-slate-900/40 border border-white/5 rounded-xl p-4 space-y-3 relative">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-white text-base flex items-center gap-2">
                        {worker.first_name} {worker.last_name}
                        {worker.missing_mandatory_docs && worker.missing_mandatory_docs.length > 0 && (
                          <span 
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-[9px] text-rose-400 font-bold"
                            title={`Falta documentación obligatoria: ${worker.missing_mandatory_docs.join(', ')}`}
                          >
                            <AlertTriangle size={9} /> Faltan Docs
                          </span>
                        )}
                      </h4>
                      <p className="text-[10px] text-slate-500">{worker.rut || 'Sin RUT'} · {worker.email || 'Sin Email'}</p>
                    </div>
                    {canManage && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setActionWorker(worker); }}
                        className="p-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-slate-400 hover:text-white transition-all"
                        title="Opciones de Personal"
                      >
                        <MoreVertical size={16} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5 text-xs text-slate-400">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Cargo</span>
                      <span className="text-white font-semibold">{worker.role}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Tipo Contrato / Cotizaciones</span>
                      <span className="text-slate-300 font-medium uppercase text-[11px] block leading-tight mt-0.5">
                        {worker.contract_type?.replace('_', ' ') || 'INDEFINIDO'}
                        {(worker.afp || worker.health_system) && (
                          ` (${worker.afp || 'MODELO'} ${AFP_RATES[worker.afp?.toUpperCase()] || AFP_RATES.MODELO}% / ${worker.health_system || 'FONASA'})`
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Sueldo / Haberes</span>
                      <span className="text-slate-300 font-bold text-xs block">Base: ${worker.salary?.toLocaleString('es-CL')}</span>
                      <span className="text-[10px] text-rose-400 block font-medium">
                        AFP: -${calculateAfpDeduction(worker.salary, worker.bonos, worker.afp).toLocaleString('es-CL')}
                      </span>
                      {(worker.colacion || worker.movilizacion || worker.bonos) ? (
                        <span className="text-[9px] text-slate-500 block leading-tight mt-0.5">
                          + Col: ${(worker.colacion || 0).toLocaleString('es-CL')}<br />
                          + Mov: ${(worker.movilizacion || 0).toLocaleString('es-CL')}<br />
                          + Bonos: ${(worker.bonos || 0).toLocaleString('es-CL')}
                        </span>
                      ) : null}
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Días Disponibles</span>
                      <span className="text-slate-300 font-semibold">{worker.vacation_balance !== undefined ? `${worker.vacation_balance} días` : 'N/A'}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-white/5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                      worker.status === 'ACTIVE' 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                        : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                    }`}>
                      {worker.status === 'ACTIVE' ? 'ACTIVO' : 'HISTÓRICO'}
                    </span>

                    {worker.active_project ? (
                      <span className="inline-flex items-center gap-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] px-2 py-0.5 rounded-full font-bold">
                        <Briefcase size={10} /> {worker.active_project}
                      </span>
                    ) : (
                      <span className="text-slate-600 text-xs italic">Sin asignar</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    )}

    {/* Vacations view */}
    {activeTab === 'vacations' && (
      <div className="glass-card p-0 overflow-hidden shadow-2xl animate-in fade-in duration-300">
        <div className="p-4 sm:p-8 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 bg-white/[0.02]">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <Calendar size={24} className="text-amber-500" /> Solicitudes de Vacaciones
            </h3>
            <p className="text-slate-400 text-sm">Validación y procesamiento de salida de personal.</p>
          </div>
          {canManage && (
            <button 
              onClick={() => setShowVacationModal(true)}
              className="btn-primary flex items-center gap-2 py-3 px-6 shadow-lg shadow-amber-600/20 w-full md:w-auto justify-center"
            >
              <Plus size={18} /> Solicitar Vacaciones
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          {/* Desktop Table View */}
          <table className="w-full text-left min-w-[700px] hidden md:table">
            <thead>
              <tr className="border-b border-white/5 text-slate-400 text-xs sm:text-sm uppercase tracking-wider">
                <th className="px-3 sm:px-6 py-3 sm:py-4 font-semibold">Trabajador</th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 font-semibold">Período</th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 font-semibold">Días Solicitados</th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 font-semibold">Estado</th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 font-semibold">Documentos</th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {vacationRequests.map((req) => (
                <tr key={req.id} className="hover:bg-white/5 transition-colors text-slate-300 text-sm">
                  <td className="px-3 sm:px-6 py-4 font-bold text-white">
                    {req.employee ? `${req.employee.first_name} ${req.employee.last_name}` : `ID: ${req.employee_id}`}
                  </td>
                  <td className="px-3 sm:px-6 py-4">
                    {new Date(req.start_date).toLocaleDateString('es-CL')} - {new Date(req.end_date).toLocaleDateString('es-CL')}
                  </td>
                  <td className="px-3 sm:px-6 py-4 font-semibold">
                    {req.days_requested} días
                  </td>
                  <td className="px-3 sm:px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center justify-center gap-1.5 w-fit ${
                      req.status === 'REBATED' 
                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                        : req.status === 'APPROVED'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {req.status === 'PENDING_APPROVAL' && 'Pendiente Aprobación'}
                      {req.status === 'APPROVED' && 'Autorizado - Pendiente Firma/Rebaja'}
                      {req.status === 'REBATED' && 'Rebajado'}
                      {req.status === 'REJECTED' && 'Rechazado'}
                    </span>
                  </td>
                  <td className="px-3 sm:px-6 py-4">
                    <div className="flex flex-col gap-1.5">
                      {req.document_path ? (
                        <div className="flex flex-col gap-1">
                          <a 
                            href={api.defaults.baseURL ? `${api.defaults.baseURL.replace('/api/v1', '')}${req.document_path}` : req.document_path}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1 font-bold"
                          >
                            <FileText size={12} /> Ver Comprobante
                          </a>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full w-fit font-bold ${
                            req.is_signed 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {req.is_signed ? 'Firmado' : 'Pendiente Firma'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-600 text-xs italic">Sin documento disponible</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {req.status === 'PENDING_APPROVAL' && ['ADMIN', 'SUPER_ADMIN', 'HR_MANAGER'].includes(userRole) && (
                        <button
                          onClick={() => handleApproveVacation(req.id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all uppercase"
                        >
                          Autorizar
                        </button>
                      )}
                      {req.status === 'APPROVED' && (
                        <>
                          {['ADMIN', 'SUPER_ADMIN', 'HR_MANAGER'].includes(userRole) && (
                            <button
                              onClick={() => handleRebateVacation(req.id)}
                              disabled={!req.is_signed}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all uppercase ${
                                req.is_signed 
                                  ? 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer' 
                                  : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                              }`}
                              title={req.is_signed ? "Efectuar la deducción de días de vacaciones" : "Debe cargar el documento firmado primero"}
                            >
                              Procesar Rebaja
                            </button>
                          )}
                          <label className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-all uppercase cursor-pointer">
                            Cargar Firmado
                            <input 
                              type="file" 
                              accept="application/pdf,image/*" 
                              onChange={(e) => handleUploadVacationDoc(req.id, e.target.files[0])} 
                              className="hidden" 
                            />
                          </label>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {vacationRequests.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-20 text-center text-slate-500">
                    No hay solicitudes de vacaciones registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Mobile Card List View */}
          <div className="md:hidden flex flex-col gap-4 p-4">
            {vacationRequests.length === 0 ? (
              <div className="py-10 text-center text-slate-500 text-sm">
                No hay solicitudes de vacaciones registradas.
              </div>
            ) : (
              vacationRequests.map((req) => (
                <div key={req.id} className="bg-slate-900/40 border border-white/5 rounded-xl p-4 space-y-3 text-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-white">
                        {req.employee ? `${req.employee.first_name} ${req.employee.last_name}` : `ID: ${req.employee_id}`}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {new Date(req.start_date).toLocaleDateString('es-CL')} - {new Date(req.end_date).toLocaleDateString('es-CL')}
                      </p>
                    </div>
                    <span className="font-bold text-slate-300 bg-white/5 px-2.5 py-1 rounded-lg text-xs">
                      {req.days_requested} días
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-white/5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                      req.status === 'REBATED' 
                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                        : req.status === 'APPROVED'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {req.status === 'PENDING_APPROVAL' && 'Pendiente'}
                      {req.status === 'APPROVED' && 'Autorizado'}
                      {req.status === 'REBATED' && 'Rebajado'}
                      {req.status === 'REJECTED' && 'Rechazado'}
                    </span>

                    <div>
                      {req.document_path ? (
                        <div className="flex flex-col gap-1">
                          <a 
                            href={api.defaults.baseURL ? `${api.defaults.baseURL.replace('/api/v1', '')}${req.document_path}` : req.document_path}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1 font-bold"
                          >
                            <FileText size={12} /> Descargar Solicitud
                          </a>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full w-fit font-bold ${
                            req.is_signed 
                              ? 'bg-emerald-500/10 text-emerald-400' 
                              : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            {req.is_signed ? 'Firmado' : 'Pendiente Firma'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-600 text-xs italic">Sin documento</span>
                      )}
                    </div>
                  </div>

                  {/* Mobile Actions */}
                  {((req.status === 'PENDING_APPROVAL' && ['ADMIN', 'SUPER_ADMIN', 'HR_MANAGER'].includes(userRole)) || (req.status === 'APPROVED')) && (
                    <div className="flex gap-2 pt-2 border-t border-white/5 justify-end">
                      {req.status === 'PENDING_APPROVAL' && ['ADMIN', 'SUPER_ADMIN', 'HR_MANAGER'].includes(userRole) && (
                        <button
                          onClick={() => handleApproveVacation(req.id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all uppercase flex-1 text-center"
                        >
                          Autorizar
                        </button>
                      )}
                      {req.status === 'APPROVED' && (
                        <>
                          {['ADMIN', 'SUPER_ADMIN', 'HR_MANAGER'].includes(userRole) && (
                            <button
                              onClick={() => handleRebateVacation(req.id)}
                              disabled={!req.is_signed}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all uppercase flex-1 text-center ${
                                req.is_signed 
                                  ? 'bg-blue-600 hover:bg-blue-500 text-white' 
                                  : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                              }`}
                            >
                              Rebajar
                            </button>
                          )}
                          <label className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-all uppercase cursor-pointer flex-1 text-center">
                            Cargar Firmado
                            <input 
                              type="file" 
                              accept="application/pdf,image/*" 
                              onChange={(e) => handleUploadVacationDoc(req.id, e.target.files[0])} 
                              className="hidden" 
                            />
                          </label>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    )}

      {/* Modals */}
      {showVacationModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-bold text-white mb-2">Solicitar Vacaciones</h3>
            <p className="text-slate-400 mb-6 text-sm">Crea una solicitud de descanso para un trabajador.</p>
            <form onSubmit={handleRequestVacation} className="space-y-4">
              <div>
                <label className="label-neutral block mb-2">Trabajador</label>
                <select 
                  value={vacationForm.employee_id}
                  onChange={(e) => setVacationForm({ ...vacationForm, employee_id: e.target.value })}
                  className="w-full bg-slate-800/80 p-3 rounded-xl border border-white/10 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm appearance-none"
                  required
                >
                  <option value="">-- Seleccionar Trabajador --</option>
                  {workers.filter(w => w.status === 'ACTIVE').map(w => (
                    <option key={w.id} value={w.id}>
                      {w.first_name} {w.last_name} (Días disp: {w.vacation_balance})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-neutral block mb-2">Fecha Inicio</label>
                  <input 
                    type="date"
                    required
                    value={vacationForm.start_date}
                    onChange={(e) => setVacationForm({ ...vacationForm, start_date: e.target.value })}
                    className="w-full bg-slate-800/80 p-3 rounded-xl border border-white/10 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="label-neutral block mb-2">Fecha Fin</label>
                  <input 
                    type="date"
                    required
                    value={vacationForm.end_date}
                    onChange={(e) => setVacationForm({ ...vacationForm, end_date: e.target.value })}
                    className="w-full bg-slate-800/80 p-3 rounded-xl border border-white/10 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="label-neutral block mb-2">Días a Solicitar</label>
                <input 
                  type="number"
                  required
                  min="1"
                  placeholder="Días solicitados"
                  value={vacationForm.days_requested}
                  onChange={(e) => setVacationForm({ ...vacationForm, days_requested: e.target.value })}
                  className="w-full bg-slate-800/80 p-3 rounded-xl border border-white/10 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowVacationModal(false)}
                  className="flex-1 py-3 text-slate-400 hover:text-white font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-white rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all font-bold"
                >
                  Solicitar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModal && (
        <WorkerForm 
          onClose={() => { setShowModal(false); setSelectedWorker(null); }} 
          onSuccess={handleCreateSuccess}
          workerData={selectedWorker}
        />
      )}

      {actionWorker && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-sm p-8 text-center animate-in zoom-in-95 duration-200 relative">
            <h3 className="text-2xl font-bold text-white mb-1">{actionWorker.first_name} {actionWorker.last_name}</h3>
            <p className="text-slate-400 text-xs mb-6">{actionWorker.role}</p>
            
            <div className="flex flex-col gap-3 mb-6">
              <button 
                onClick={() => { navigate(`/documents`); setActionWorker(null); }}
                className="w-full py-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-xl transition-all font-bold text-sm flex items-center justify-center gap-2"
              >
                <FileText size={16} /> Carpeta Digital
              </button>
              <button 
                onClick={() => { handleEdit(actionWorker); setActionWorker(null); }}
                className="w-full py-3 bg-white/5 hover:bg-white/10 text-slate-200 border border-white/5 rounded-xl transition-all font-bold text-sm flex items-center justify-center gap-2"
              >
                <Edit2 size={16} /> Editar Datos
              </button>
              <button 
                onClick={() => { handleDownloadContract(actionWorker.id, actionWorker.rut); setActionWorker(null); }}
                className="w-full py-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-xl transition-all font-bold text-sm flex items-center justify-center gap-2"
              >
                <Download size={16} /> Descargar Contrato PDF
              </button>
              {actionWorker.status === 'ACTIVE' && (
                <button 
                  onClick={() => { initDeactivate(actionWorker.id); setActionWorker(null); }}
                  className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-all font-bold text-sm flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} /> Dar de Baja
                </button>
              )}
            </div>
            
            <button 
              onClick={() => setActionWorker(null)} 
              className="text-xs text-slate-500 hover:text-slate-300 font-bold uppercase tracking-widest mt-2"
            >
              Cerrar
            </button>
          </div>
        </div>
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

      {showComplianceAlertModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-8 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-6 text-rose-400">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">¡Trabajador Registrado!</h3>
            <p className="text-slate-300 text-sm mb-6 leading-relaxed">
              El trabajador <strong>{showComplianceAlertModal.first_name} {showComplianceAlertModal.last_name}</strong> se ha guardado correctamente.
              <br /><br />
              <span className="text-rose-400 font-bold">⚠️ Alerta de Cumplimiento:</span> Es obligatorio adjuntar su <strong>Contrato de Trabajo</strong> y <strong>Cédula de Identidad</strong> a la brevedad.
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => {
                  navigate('/documents', { state: { selectWorkerId: showComplianceAlertModal.id } });
                  setShowComplianceAlertModal(null);
                }}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-white rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all font-bold text-sm flex items-center justify-center gap-2"
              >
                <Upload size={16} /> Cargar Documentos Obligatorios Ahora
              </button>
              <button 
                onClick={() => setShowComplianceAlertModal(null)} 
                className="text-xs text-slate-500 hover:text-slate-300 font-bold uppercase tracking-widest mt-2"
              >
                Cargar más tarde
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Workers;
