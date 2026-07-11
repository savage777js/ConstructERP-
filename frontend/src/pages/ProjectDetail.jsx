import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { 
  ArrowLeft, Briefcase, Users, Calendar, MapPin, 
  Plus, UserPlus, Info, Loader2, CheckCircle2, AlertCircle,
  Clock, ShieldCheck, HardHat, MoreVertical, Archive, AlertTriangle,
  Edit2, Settings, ClipboardList, Folder, Eye, X, Check, MessageSquare,
  DollarSign, Download
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
    role: 'Jornalero',
    end_date: ''
  });

  const [expenses, setExpenses] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [downloadingFolder, setDownloadingFolder] = useState(false);
  const [showAddMini, setShowAddMini] = useState(false);
  const [miniForm, setMiniForm] = useState({ description: '', amount: '' });

  const [newNote, setNewNote] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);
  const [selectedWorkerDocs, setSelectedWorkerDocs] = useState(null);
  const [notesForm, setNotesForm] = useState({ assignmentId: null, notes: '' });

  const userRole = localStorage.getItem('userRole');
  const canAssignWorker = ['ADMIN', 'SUPER_ADMIN', 'PROJECT_MANAGER'].includes(userRole);
  const canManageProject = ['ADMIN', 'SUPER_ADMIN', 'PROJECT_MANAGER'].includes(userRole);
  const canManageFinance = ['ADMIN', 'SUPER_ADMIN', 'PROJECT_MANAGER', 'INVENTORY_MANAGER'].includes(userRole);

  // States for adding expenses and invoices
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    category: 'MATERIALES',
    description: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    is_paid: false,
    mini_budget_id: 'otros'
  });

  const [showAddInvoice, setShowAddInvoice] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    client_name: '',
    total_amount: '',
    status: 'DRAFT',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: '',
    mini_budget_id: 'otros'
  });

  const handleOpenAddInvoice = () => {
    setInvoiceForm({
      client_name: project?.client_name || '',
      total_amount: '',
      status: 'DRAFT',
      issue_date: new Date().toISOString().split('T')[0],
      due_date: '',
      mini_budget_id: 'otros'
    });
    setShowAddInvoice(true);
  };

  const handleOpenAddExpense = () => {
    setExpenseForm({
      category: 'MATERIALES',
      description: '',
      amount: '',
      expense_date: new Date().toISOString().split('T')[0],
      is_paid: false,
      mini_budget_id: 'otros'
    });
    setShowAddExpense(true);
  };

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    if (!expenseForm.amount || !expenseForm.description) return;
    try {
      await api.post('/finance/expenses', {
        project_id: parseInt(id),
        category: expenseForm.category,
        description: expenseForm.description,
        amount: parseFloat(expenseForm.amount),
        expense_date: new Date(expenseForm.expense_date).toISOString(),
        is_paid: expenseForm.is_paid,
        mini_budget_id: expenseForm.mini_budget_id === 'otros' ? null : expenseForm.mini_budget_id
      });
      setShowAddExpense(false);
      fetchProjectData();
    } catch (error) {
      alert('Error al registrar el gasto.');
    }
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    if (!invoiceForm.total_amount || !invoiceForm.client_name) return;
    try {
      await api.post('/finance/invoices', {
        project_id: parseInt(id),
        client_name: invoiceForm.client_name,
        total_amount: parseFloat(invoiceForm.total_amount),
        status: invoiceForm.status,
        issue_date: new Date(invoiceForm.issue_date).toISOString(),
        due_date: invoiceForm.due_date ? new Date(invoiceForm.due_date).toISOString() : null,
        mini_budget_id: invoiceForm.mini_budget_id === 'otros' ? null : invoiceForm.mini_budget_id
      });
      setShowAddInvoice(false);
      fetchProjectData();
    } catch (error) {
      alert('Error al registrar la factura.');
    }
  };

  useEffect(() => {
    fetchProjectData();
  }, [id]);

  const fetchProjectData = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/projects/${id}`);
      setProject(response.data);
      
      // Fetch finances in parallel
      const expRes = await api.get(`/finance/expenses?project_id=${id}`);
      setExpenses(expRes.data);
      
      const invRes = await api.get(`/finance/invoices?project_id=${id}`);
      setInvoices(invRes.data);
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
        role: assignmentForm.role,
        end_date: assignmentForm.end_date ? new Date(assignmentForm.end_date).toISOString() : null
      });
      setShowAssignWorker(false);
      setAssignmentForm({ worker_id: '', role: 'Jornalero', end_date: '' });
      fetchProjectData();
    } catch (error) {
      alert(error.response?.data?.detail || 'Error al asignar trabajador');
    }
  };

  const handleDownloadFolder = async () => {
    setDownloadingFolder(true);
    try {
      const response = await api.get(`/projects/${id}/download-folder`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `carpeta_proyecto_${project.code || id}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert('Error al descargar la carpeta del proyecto.');
    } finally {
      setDownloadingFolder(false);
    }
  };

  const handleAddMiniBudget = async (e) => {
    e.preventDefault();
    if (!miniForm.description || !miniForm.amount) return;
    try {
      await api.post(`/projects/${id}/mini-budgets`, {
        description: miniForm.description,
        amount: parseFloat(miniForm.amount)
      });
      setMiniForm({ description: '', amount: '' });
      setShowAddMini(false);
      fetchProjectData();
    } catch (error) {
      alert('Error al añadir sub-presupuesto.');
    }
  };

  const handleDeleteMiniBudget = async (miniId) => {
    if (!confirm('¿Eliminar este sub-presupuesto?')) return;
    try {
      await api.delete(`/projects/${id}/mini-budgets/${miniId}`);
      fetchProjectData();
    } catch (error) {
      alert('Error al eliminar sub-presupuesto.');
    }
  };

  const handleUpdateInvoiceStatus = async (invoiceId, currentStatus) => {
    const nextStatus = currentStatus === 'PAID' ? 'DRAFT' : 'PAID';
    try {
      await api.patch(`/finance/invoices/${invoiceId}/status?status_in=${nextStatus}`);
      fetchProjectData();
    } catch (error) {
      alert('Error al actualizar el estado de la factura.');
    }
  };

  const handleToggleExpensePaid = async (expenseId, currentPaidStatus) => {
    try {
      await api.patch(`/finance/expenses/${expenseId}/status?is_paid=${!currentPaidStatus}`);
      fetchProjectData();
    } catch (error) {
      alert('Error al actualizar el estado de pago del gasto.');
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
    <div className="p-4 sm:p-8 pb-20 max-w-7xl mx-auto">
      <button 
        onClick={() => navigate('/projects')}
        className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors group"
      >
        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" /> 
        Volver al Panel de Obras
      </button>

      <header className="mb-6 sm:mb-10">
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
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-white mb-3 tracking-tight">{project.name}</h1>
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-slate-400">
              <p className="flex items-center gap-2">
                <MapPin size={18} className="text-blue-500/50" /> {project.address}
              </p>
              <p className="flex items-center gap-2">
                <Calendar size={18} className="text-blue-500/50" /> 
                {new Date(project.start_date).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-4">
              {canManageProject && project.status === 'ACTIVE' && (
                <>
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
                </>
              )}
              <button 
                onClick={handleDownloadFolder}
                disabled={downloadingFolder}
                className="flex items-center gap-2 text-amber-400 hover:text-amber-300 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-xl transition-all font-bold shadow-[0_0_15px_rgba(245,158,11,0.1)] disabled:opacity-50"
              >
                {downloadingFolder ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                {downloadingFolder ? 'Comprimiendo Carpeta...' : 'Descargar Carpeta de Obra'}
              </button>
            </div>
          </div>
          
          <div className="flex flex-col items-start md:items-end gap-2">
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
      <div className="flex gap-2 p-1 bg-slate-900/50 border border-white/5 rounded-2xl mb-6 sm:mb-10 w-full sm:w-fit backdrop-blur-md overflow-x-auto whitespace-nowrap scrollbar-none">
        {[
          { id: 'info', label: 'Dashboard General', icon: Info },
          { id: 'workers', label: 'Dotación de Personal', icon: Users, count: project.assignments?.filter(a => a.is_active).length || 0 },
          { id: 'budget', label: 'Presupuesto', icon: DollarSign },
          { id: 'finance', label: 'Finanzas y Gastos', icon: Briefcase },
          { id: 'history', label: 'Bitácora de Obra', icon: ClipboardList, count: project.logs?.length || 0 }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-3 px-4 sm:px-6 py-3 text-sm font-bold rounded-xl transition-all duration-300 shrink-0 ${
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
              <div className="lg:col-span-2 glass-card p-4 sm:p-6 md:p-10 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-900/10">
                <h3 className="text-2xl font-bold mb-8 text-white flex items-center gap-3">
                  <Info className="text-blue-400" /> Especificaciones Técnicas
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
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
                {/* Card de Avance del Proyecto */}
                <div className="glass-card p-4 sm:p-8 border-l-4 border-l-indigo-500 shadow-xl bg-indigo-500/5">
                  <h4 className="text-sm font-bold text-indigo-400 uppercase tracking-widest mb-4 flex justify-between items-center">
                    <span>Avance de Obra</span>
                    {canManageProject && (
                      <button 
                        onClick={() => setShowEditModal(true)}
                        className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-bold"
                      >
                        <Edit2 size={12} /> Actualizar
                      </button>
                    )}
                  </h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-4xl font-extrabold text-white">{project.progress || 0}%</p>
                        <p className="text-slate-400 text-xs mt-1">Avance registrado</p>
                      </div>
                      <HardHat size={48} className="text-indigo-500/10" />
                    </div>
                    
                    <div className="w-full bg-slate-700/50 rounded-full h-2.5 overflow-hidden border border-white/5">
                      <div 
                        className="bg-gradient-to-r from-indigo-500 to-blue-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${project.progress || 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="glass-card p-4 sm:p-8 border-l-4 border-l-blue-500 shadow-xl bg-blue-500/5">
                  <h4 className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-4">Métricas de Dotación</h4>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-4xl font-extrabold text-white">{project.assignments?.filter(a => a.is_active).length || 0}</p>
                      <p className="text-slate-400 text-xs mt-1">Trabajadores en terreno</p>
                    </div>
                    <Users size={48} className="text-blue-500/10" />
                  </div>
                </div>

                <div className="glass-card p-4 sm:p-8 border-l-4 border-l-amber-500 shadow-xl bg-amber-500/5">
                  <h4 className="text-sm font-bold text-amber-400 uppercase tracking-widest mb-4">Estado Financiero</h4>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-slate-400 text-xs">Presupuesto Base:</span>
                      <span className="text-white text-sm font-bold">${(project.budget || 0).toLocaleString('es-CL')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 text-xs">Gastos Ejecutados:</span>
                      <span className="text-white text-sm font-bold">${expenses.reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0).toLocaleString('es-CL')}</span>
                    </div>
                    <div className="flex justify-between border-t border-white/5 pt-2">
                      <span className="text-slate-400 text-xs">Utilidad Proyectada:</span>
                      {(() => {
                        const totalExpenses = expenses.reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0);
                        const budget = project.budget || 0;
                        const diff = budget - totalExpenses;
                        const pct = budget > 0 ? (diff / budget) * 100 : 0;
                        const isUnder15 = budget > 0 && totalExpenses > (budget * 0.85);
                        return (
                          <div className="text-right">
                            <span className={`text-sm font-black ${diff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              ${diff.toLocaleString('es-CL')}
                            </span>
                            <span className={`block text-[10px] font-bold ${isUnder15 ? 'text-red-400 animate-pulse' : 'text-slate-500'}`}>
                              {pct.toFixed(1)}% Margen {isUnder15 && '(Crítico < 15%)'}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'budget' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Presupuestos del proyecto */}
              <div className="lg:col-span-2 space-y-6">
                <div className="glass-card p-6 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/10">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div>
                      <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                        <DollarSign className="text-blue-400" size={24} />
                        Presupuestos del Proyecto
                      </h3>
                      <p className="text-xs text-slate-400">Distribución y desglose de partidas presupuestarias.</p>
                    </div>
                    {canManageProject && (
                      <button 
                        onClick={() => setShowAddMini(true)}
                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-600/20 flex items-center gap-1.5"
                      >
                        <Plus size={14} /> Añadir Sub-presupuesto
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {/* Presupuesto Principal */}
                    <div className="p-4 bg-slate-950/80 border border-white/5 rounded-xl flex justify-between items-center">
                      <div>
                        <p className="text-sm font-bold text-white">Presupuesto Total Autorizado</p>
                        <span className="text-[10px] text-slate-500 uppercase font-bold">Base contractual del proyecto</span>
                      </div>
                      <span className="text-lg font-black text-blue-400">${(project.budget || 0).toLocaleString('es-CL')}</span>
                    </div>

                    {/* Desglose de mini-presupuestos */}
                    {project.mini_budgets?.map(mini => (
                      <div key={mini.id} className="p-4 bg-white/5 border border-white/5 rounded-xl flex justify-between items-center group transition-all hover:bg-white/[0.08]">
                        <div>
                          <p className="text-sm font-semibold text-slate-200">{mini.description}</p>
                          <span className="text-[10px] text-slate-500">{new Date(mini.created_at).toLocaleDateString('es-CL')}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-bold text-white">${parseFloat(mini.amount).toLocaleString('es-CL')}</span>
                          {canManageProject && (
                            <button 
                              onClick={() => handleDeleteMiniBudget(mini.id)}
                              className="text-slate-500 hover:text-red-400 transition-all p-1 hover:bg-white/5 rounded"
                              title="Eliminar partida"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {(!project.mini_budgets || project.mini_budgets.length === 0) && (
                      <div className="text-center py-12 text-slate-500 bg-white/[0.01] rounded-xl border border-dashed border-white/5">
                        <DollarSign className="mx-auto mb-3 opacity-10" size={36} />
                        <p className="text-xs italic">No hay sub-presupuestos registrados en esta obra. Haz clic en "Añadir Sub-presupuesto" para comenzar a desglosar.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Lado derecho: validaciones y comparación de montos */}
              <div className="space-y-6">
                <div className="glass-card p-6 bg-white/[0.02]">
                  <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <CheckCircle2 className="text-blue-400" size={18} />
                    Validación Presupuestaria
                  </h3>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-xs">Presupuesto Total:</span>
                      <span className="text-white text-sm font-bold">${(project.budget || 0).toLocaleString('es-CL')}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-xs">Suma de Partidas:</span>
                      {(() => {
                        const totalMini = project.mini_budgets?.reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0) || 0;
                        return (
                          <span className="text-white text-sm font-bold">${totalMini.toLocaleString('es-CL')}</span>
                        );
                      })()}
                    </div>

                    <div className="border-t border-white/5 pt-4">
                      {(() => {
                        const totalMini = project.mini_budgets?.reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0) || 0;
                        const mainB = project.budget || 0;
                        const diff = mainB - totalMini;

                        if (diff === 0) {
                          return (
                            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2">
                              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                                <CheckCircle2 size={16} />
                                <span>La suma concuerda</span>
                              </div>
                              <p className="text-[11px] text-emerald-500/80 leading-normal">
                                La suma de los montos desglosados coincide exactamente con el presupuesto total del proyecto.
                              </p>
                            </div>
                          );
                        } else if (diff > 0) {
                          return (
                            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2">
                              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                                <AlertTriangle size={16} />
                                <span>Diferencia pendiente</span>
                              </div>
                              <p className="text-[11px] text-amber-500/80 leading-normal">
                                Quedan por desglosar <strong className="text-white">${diff.toLocaleString('es-CL')}</strong> para concordar con el presupuesto total.
                              </p>
                            </div>
                          );
                        } else {
                          return (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl space-y-2">
                              <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                                <AlertCircle size={16} />
                                <span>Exceso de presupuesto</span>
                              </div>
                              <p className="text-[11px] text-red-500/80 leading-normal">
                                Las partidas desglosadas exceden el presupuesto total por <strong className="text-white">${Math.abs(diff).toLocaleString('es-CL')}</strong>. Por favor, ajuste los montos.
                              </p>
                            </div>
                          );
                        }
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'finance' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Gastos registrados */}
              <div className="lg:col-span-2 space-y-6">
                <div className="glass-card p-6 bg-white/[0.02]">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <Briefcase className="text-blue-500" size={20} />
                      Detalle de Gastos de Obra
                    </h3>
                    {canManageFinance && project.status === 'ACTIVE' && (
                      <button
                        onClick={handleOpenAddExpense}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-1"
                      >
                        <Plus size={14} /> Registrar Gasto
                      </button>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    {/* Desktop Table View */}
                    <table className="w-full text-left hidden md:table">
                      <thead>
                        <tr className="bg-slate-900/50 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                          <th className="px-4 py-3">Fecha</th>
                          <th className="px-4 py-3">Categoría</th>
                          <th className="px-4 py-3">Descripción</th>
                          <th className="px-4 py-3 text-right">Monto</th>
                          <th className="px-4 py-3 text-center">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {expenses.map(exp => (
                          <tr key={exp.id} className="hover:bg-white/[0.01] transition-colors text-xs text-slate-300">
                            <td className="px-4 py-3">{new Date(exp.expense_date || exp.created_at).toLocaleDateString('es-CL')}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full font-bold uppercase text-[9px]">
                                {exp.category?.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div>
                                <p className="text-white font-medium">{exp.description}</p>
                                {(() => {
                                  const matchingMini = project.mini_budgets?.find(mb => mb.id === exp.mini_budget_id);
                                  return (
                                    <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">
                                      Partida: {matchingMini ? matchingMini.description : 'Otros / Gasto General'}
                                    </span>
                                  );
                                })()}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-white">${parseFloat(exp.amount).toLocaleString('es-CL')}</td>
                            <td className="px-4 py-3 text-center">
                              {['ADMIN', 'SUPER_ADMIN'].includes(userRole) ? (
                                <button
                                  onClick={() => handleToggleExpensePaid(exp.id, exp.is_paid)}
                                  className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase transition-all border ${
                                    exp.is_paid
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                                      : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                                  }`}
                                  title="Click para alternar estado de pago del gasto"
                                >
                                  {exp.is_paid ? 'PAGADO' : 'IMPAGO'}
                                </button>
                              ) : (
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                  exp.is_paid
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                }`}>
                                  {exp.is_paid ? 'PAGADO' : 'IMPAGO'}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Mobile Card List View */}
                    <div className="md:hidden flex flex-col gap-4">
                      {expenses.map(exp => (
                        <div key={exp.id} className="bg-slate-900/40 border border-white/5 rounded-xl p-4 space-y-2 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-bold uppercase text-[10px]">Fecha</span>
                            <span className="text-slate-200">{new Date(exp.expense_date || exp.created_at).toLocaleDateString('es-CL')}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-bold uppercase text-[10px]">Categoría</span>
                            <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full font-bold uppercase text-[9px]">
                              {exp.category?.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="flex justify-between items-start">
                            <span className="text-slate-500 font-bold uppercase text-[10px] mt-0.5">Descripción</span>
                            <div className="text-right">
                              <span className="text-slate-200 font-medium block truncate max-w-[200px]">{exp.description}</span>
                              {(() => {
                                const matchingMini = project.mini_budgets?.find(mb => mb.id === exp.mini_budget_id);
                                return (
                                  <span className="text-[9px] text-slate-500 italic block mt-0.5">
                                    Partida: {matchingMini ? matchingMini.description : 'Otros / Gasto General'}
                                  </span>
                                );
                              })()}
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-bold uppercase text-[10px]">Monto</span>
                            <span className="text-white font-bold">${parseFloat(exp.amount).toLocaleString('es-CL')}</span>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-white/5">
                            <span className="text-slate-500 font-bold uppercase text-[10px]">Estado</span>
                            {['ADMIN', 'SUPER_ADMIN'].includes(userRole) ? (
                              <button
                                onClick={() => handleToggleExpensePaid(exp.id, exp.is_paid)}
                                className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase transition-all border ${
                                  exp.is_paid
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                                }`}
                              >
                                {exp.is_paid ? 'PAGADO' : 'IMPAGO'}
                              </button>
                            ) : (
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                exp.is_paid
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
                              }`}>
                                {exp.is_paid ? 'PAGADO' : 'IMPAGO'}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {expenses.length === 0 && (
                      <div className="text-center py-10 text-slate-600 italic">No hay gastos registrados en esta obra.</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Facturas y cosas cobradas/pagadas */}
              <div className="space-y-6">
                <div className="glass-card p-6 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/20">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                      <CheckCircle2 className="text-emerald-400" size={18} />
                      Cosas que me han Pagado
                    </h3>
                    {canManageFinance && project.status === 'ACTIVE' && (
                      <button
                        onClick={handleOpenAddInvoice}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-1"
                      >
                        <Plus size={14} /> Registrar Factura
                      </button>
                    )}
                  </div>
                  
                  {/* Summary indicators */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-slate-950 p-4 rounded-xl border border-white/5">
                      <p className="text-[10px] text-slate-500 uppercase font-black">Facturado Total</p>
                      <p className="text-base font-extrabold text-white">
                        ${invoices.reduce((acc, curr) => acc + parseFloat(curr.total_amount || 0), 0).toLocaleString('es-CL')}
                      </p>
                    </div>
                    <div className="bg-emerald-950/30 p-4 rounded-xl border border-emerald-500/10">
                      <p className="text-[10px] text-emerald-500 uppercase font-black">Pagado Recibido</p>
                      <p className="text-base font-extrabold text-emerald-400">
                        ${invoices.filter(i => i.status === 'PAID').reduce((acc, curr) => acc + parseFloat(curr.total_amount || 0), 0).toLocaleString('es-CL')}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {invoices.map(inv => (
                      <div key={inv.id} className="p-4 bg-slate-950 border border-white/5 rounded-xl space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-xs font-bold text-white">{inv.client_name}</p>
                            <span className="text-[9px] text-slate-500 block">Emitido: {new Date(inv.issue_date).toLocaleDateString('es-CL')}</span>
                            {(() => {
                              const matchingMini = project.mini_budgets?.find(mb => mb.id === inv.mini_budget_id);
                              return (
                                <span className="text-[10px] text-blue-400 font-medium mt-1 block">
                                  Partida: {matchingMini ? matchingMini.description : 'Otros / Ingreso General'}
                                </span>
                              );
                            })()}
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            inv.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400 animate-pulse'
                          }`}>
                            {inv.status === 'PAID' ? 'PAGADA' : 'PENDIENTE'}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center pt-2 border-t border-white/5">
                          <span className="text-sm font-extrabold text-white">${parseFloat(inv.total_amount).toLocaleString('es-CL')}</span>
                          {['ADMIN', 'SUPER_ADMIN'].includes(userRole) && (
                            <button
                              onClick={() => handleUpdateInvoiceStatus(inv.id, inv.status)}
                              className={`px-2.5 py-1 rounded text-[10px] font-black transition-all uppercase ${
                                inv.status === 'PAID' 
                                  ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20' 
                                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                              }`}
                            >
                              {inv.status === 'PAID' ? 'Marcar Pendiente' : 'Marcar Pagada'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {invoices.length === 0 && (
                      <p className="text-center py-6 text-slate-600 text-xs italic">No hay facturas/cobros registrados en esta obra.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'workers' && (
          <div className="glass-card overflow-hidden border-white/5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-4 sm:p-8 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 bg-white/[0.02]">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                  <Users size={24} className="text-blue-400" /> Plantilla de Personal
                </h3>
                <p className="text-slate-400 text-sm">Control de nómina y roles asignados a la obra.</p>
              </div>
              {canAssignWorker && project.status === 'ACTIVE' ? (
                <button 
                  onClick={() => { fetchAvailableResources(); setShowAssignWorker(true); }}
                  className="btn-primary flex items-center gap-2 py-3 px-6 shadow-lg shadow-blue-600/20 w-full md:w-auto justify-center"
                >
                  <UserPlus size={18} /> Asignar Especialista
                </button>
              ) : (
                <span className="text-sm text-slate-500 font-bold uppercase border border-white/5 px-4 py-2 rounded-xl bg-white/[0.02] w-full md:w-auto text-center">
                  {project.status === 'INACTIVE' ? 'Obra Cerrada' : 'Solo Lectura'}
                </span>
              )}
            </div>
            
            <div className="overflow-x-auto">
              {/* Desktop Table View */}
              <table className="w-full text-left min-w-[650px] hidden md:table">
                <thead>
                  <tr className="bg-slate-900/50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                    <th className="px-3 sm:px-8 py-3 sm:py-5">Trabajador</th>
                    <th className="px-3 sm:px-8 py-3 sm:py-5">Rol en Obra</th>
                    <th className="px-3 sm:px-8 py-3 sm:py-5">Cumplimiento Legal</th>
                    <th className="px-3 sm:px-8 py-3 sm:py-5">Visto Bueno</th>
                    <th className="px-3 sm:px-8 py-3 sm:py-5">Notas Gerenciales</th>
                    <th className="px-3 sm:px-8 py-3 sm:py-5">Documentos</th>
                    <th className="px-3 sm:px-8 py-3 sm:py-5 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {project.assignments?.map(a => (
                    <tr key={a.id} className="hover:bg-white/[0.03] transition-colors group">
                      <td className="px-3 sm:px-8 py-4 sm:py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold border border-blue-500/20 shrink-0">
                            {a.worker.first_name[0]}{a.worker.last_name[0]}
                          </div>
                          <div>
                            <p className="text-white font-bold">{a.worker.first_name} {a.worker.last_name}</p>
                            <p className="text-xs text-slate-500">{a.worker.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-8 py-4 sm:py-6">
                        <span className="flex items-center gap-2 text-slate-200">
                          <HardHat size={14} className="text-blue-400 shrink-0" />
                          {a.role || 'Operario'}
                        </span>
                      </td>
                      <td className="px-3 sm:px-8 py-4 sm:py-6">
                        <div className="flex flex-col gap-1">
                          {(() => {
                            const comp = a.compliance_status || { status: 'RED', has_contract: false, has_permits: false, has_epp: false };
                            const statusColor = 
                              comp.status === 'GREEN' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                              comp.status === 'YELLOW' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                              'bg-red-500/10 text-red-400 border-red-500/20 font-bold';
                            const statusLabel = 
                              comp.status === 'GREEN' ? 'Al Día' :
                              comp.status === 'YELLOW' ? 'Pendiente' :
                              'CRÍTICO (Falta Contrato)';
                            return (
                              <>
                                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border w-fit uppercase ${statusColor}`}>
                                  {statusLabel}
                                </span>
                                <div className="flex gap-2 mt-1">
                                  <span className={`text-[9px] font-bold ${comp.has_contract ? 'text-emerald-400' : 'text-red-400'}`} title="Contrato de Trabajo o Anexo Firmado">
                                    {comp.has_contract ? '✓' : '✗'} Contrato
                                  </span>
                                  <span className={`text-[9px] font-bold ${comp.has_permits ? 'text-emerald-400' : 'text-slate-500'}`} title="Cédula, Certificados o Permisos">
                                    {comp.has_permits ? '✓' : '✗'} Permisos
                                  </span>
                                  <span className={`text-[9px] font-bold ${comp.has_epp ? 'text-emerald-400' : 'text-slate-500'}`} title="Entrega de EPP (Art. 68 Código del Trabajo)">
                                    {comp.has_epp ? '✓' : '✗'} EPP
                                  </span>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="px-3 sm:px-8 py-4 sm:py-6">
                        {a.approved_by_manager ? (
                          <span className="flex items-center gap-1 text-emerald-400 text-xs font-bold px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/10 w-fit">
                            <Check size={12} /> Visto Bueno Dado
                          </span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <span className="text-slate-500 text-xs font-semibold italic">Pendiente de Visto Bueno</span>
                            {['ADMIN', 'SUPER_ADMIN'].includes(userRole) && a.is_active && (
                              <button
                                onClick={() => handleApproveAssignment(a.id)}
                                className="px-2 py-1 bg-amber-500/10 hover:bg-amber-400 text-white rounded-lg text-[10px] font-black transition-all w-fit uppercase"
                              >
                                Otorgar Visto Bueno
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-3 sm:px-8 py-4 sm:py-6">
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
                            {['ADMIN', 'SUPER_ADMIN'].includes(userRole) && a.is_active && (
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
                      <td className="px-3 sm:px-8 py-4 sm:py-6">
                        <button 
                           onClick={() => handleViewWorkerDocs(a.worker)}
                           className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-white/5 rounded-xl text-slate-300 text-xs font-bold transition-all"
                        >
                          <Folder size={12} className="text-amber-500" /> Expediente
                        </button>
                      </td>
                      <td className="px-3 sm:px-8 py-4 sm:py-6 text-right">
                         {canAssignWorker && a.is_active && (
                           <button 
                             onClick={() => {
                               if (confirm(`¿Liberar a ${a.worker.first_name} ${a.worker.last_name} de esta obra?`)) {
                                 api.post(`/projects/${id}/unassign-worker/${a.worker.id}`).then(() => fetchProjectData());
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
                </tbody>
              </table>

              {/* Mobile Card List View */}
              <div className="md:hidden flex flex-col gap-4 p-2">
                {project.assignments?.map(a => (
                  <div key={a.id} className="bg-slate-900/40 border border-white/5 rounded-xl p-4 space-y-3 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold border border-blue-500/20 shrink-0 text-xs">
                          {a.worker.first_name[0]}{a.worker.last_name[0]}
                        </div>
                        <div>
                          <p className="text-white font-bold">{a.worker.first_name} {a.worker.last_name}</p>
                          <p className="text-[10px] text-slate-500">{a.worker.email}</p>
                        </div>
                      </div>
                      {canAssignWorker && a.is_active && (
                        <button 
                          onClick={() => {
                            if (confirm(`¿Liberar a ${a.worker.first_name} ${a.worker.last_name} de esta obra?`)) {
                              api.post(`/projects/${id}/unassign-worker/${a.worker.id}`).then(() => fetchProjectData());
                            }
                          }}
                          className="text-slate-500 hover:text-red-400 transition-colors p-1"
                          title="Liberar de Obra"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-bold uppercase text-[10px]">Rol en Obra</span>
                        <span className="flex items-center gap-1.5 text-slate-200 font-semibold">
                          <HardHat size={12} className="text-blue-400" />
                          {a.role || 'Operario'}
                        </span>
                      </div>

                      <div className="flex justify-between items-start pt-1.5 border-t border-white/5">
                        <span className="text-slate-500 font-bold uppercase text-[10px] mt-0.5">Cumplimiento Legal</span>
                        <div className="flex flex-col items-end gap-1">
                          {(() => {
                            const comp = a.compliance_status || { status: 'RED', has_contract: false, has_permits: false, has_epp: false };
                            const statusColor = 
                              comp.status === 'GREEN' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                              comp.status === 'YELLOW' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                              'bg-red-500/10 text-red-400 border-red-500/20 font-bold';
                            const statusLabel = 
                              comp.status === 'GREEN' ? 'Al Día' :
                              comp.status === 'YELLOW' ? 'Pendiente' :
                              'CRÍTICO (Sin Contrato)';
                            return (
                              <>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase ${statusColor}`}>
                                  {statusLabel}
                                </span>
                                <div className="flex gap-1.5 mt-0.5 text-[8px] font-semibold">
                                  <span className={comp.has_contract ? 'text-emerald-400' : 'text-red-400'}>
                                    Cont: {comp.has_contract ? '✓' : '✗'}
                                  </span>
                                  <span className={comp.has_permits ? 'text-emerald-400' : 'text-slate-500'}>
                                    Perm: {comp.has_permits ? '✓' : '✗'}
                                  </span>
                                  <span className={comp.has_epp ? 'text-emerald-400' : 'text-slate-500'}>
                                    EPP: {comp.has_epp ? '✓' : '✗'}
                                  </span>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-bold uppercase text-[10px]">Visto Bueno</span>
                        {a.approved_by_manager ? (
                          <span className="flex items-center gap-1 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/10 w-fit">
                            <Check size={10} /> Dado
                          </span>
                        ) : (
                          <div className="flex flex-col gap-1 items-end">
                            <span className="text-slate-500 text-[10px] font-semibold italic">Pendiente</span>
                            {['ADMIN', 'SUPER_ADMIN'].includes(userRole) && a.is_active && (
                              <button
                                onClick={() => handleApproveAssignment(a.id)}
                                className="px-2 py-0.5 bg-amber-500/10 hover:bg-amber-400 text-white rounded text-[9px] font-black transition-all uppercase"
                              >
                                Dar Visto Bueno
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-bold uppercase text-[10px]">Notas Gerenciales</span>
                        {notesForm.assignmentId === a.id ? (
                          <div className="flex gap-1.5 items-center">
                            <input 
                              type="text"
                              value={notesForm.notes}
                              onChange={(e) => setNotesForm({...notesForm, notes: e.target.value})}
                              className="bg-slate-800 border border-white/10 rounded px-2 py-0.5 text-[11px] text-white outline-none"
                              placeholder="Nota..."
                            />
                            <button 
                              onClick={() => handleSaveNotes(a.id, notesForm.notes)}
                              className="p-1 bg-emerald-600 rounded text-white"
                            >
                              <Check size={10} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-slate-300 font-medium max-w-[150px] truncate block">
                              {a.manager_notes || <span className="text-slate-600 italic">Sin notas</span>}
                            </span>
                            {['ADMIN', 'SUPER_ADMIN'].includes(userRole) && a.is_active && (
                              <button 
                                onClick={() => setNotesForm({ assignmentId: a.id, notes: a.manager_notes || '' })}
                                className="p-1 hover:bg-white/5 rounded text-slate-500 hover:text-white transition-all"
                                title="Editar Nota"
                              >
                                <MessageSquare size={10} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-white/5">
                        <span className="text-slate-500 font-bold uppercase text-[10px]">Expediente</span>
                        <button 
                           onClick={() => handleViewWorkerDocs(a.worker)}
                           className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-white/5 rounded-lg text-slate-300 text-[10px] font-bold transition-all"
                        >
                          <Folder size={10} className="text-amber-500" /> Ver Carpeta
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {(!project.assignments || project.assignments.length === 0) && (
                <div className="text-center py-20">
                  <Users size={40} className="mx-auto mb-3 text-slate-700" />
                  <p className="text-slate-500 italic">No hay personal asignado actualmente.</p>
                </div>
              )}
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
            <div className="glass-card p-4 sm:p-8">
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
                        <div className={`glass-card p-4 sm:p-5 border transition-all ${
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
             <div className="glass-card w-full max-w-xl p-5 md:p-10 relative shadow-[0_0_100px_rgba(37,99,235,0.2)]">
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

                   <div>
                     <label className="label-neutral block mb-3">Fecha Término Estimada (Vencimiento de Anexo)</label>
                     <input 
                       type="date"
                       value={assignmentForm.end_date}
                       onChange={(e) => setAssignmentForm({...assignmentForm, end_date: e.target.value})}
                       className="w-full bg-slate-800/80 p-4 rounded-xl border border-white/10 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                     />
                     <p className="text-[10px] text-slate-500 mt-1 italic">Opcional. Deja vacío si es indefinido.</p>
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
                      href={api.defaults.baseURL 
                        ? `${api.defaults.baseURL.replace('/api/v1', '')}${doc.file_path}?token=${localStorage.getItem('token')}` 
                        : `${doc.file_path}?token=${localStorage.getItem('token')}`
                      }
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

      {/* Mini Budget Modal */}
      {showAddMini && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-bold text-white mb-2">Añadir Sub-presupuesto</h3>
            <p className="text-slate-400 mb-6 text-sm">Crea una nueva partida o sub-presupuesto para esta obra.</p>
            <form onSubmit={handleAddMiniBudget} className="space-y-4">
              <div>
                <label className="label-neutral block mb-2">Descripción</label>
                <input 
                  type="text"
                  required
                  placeholder="Ej: Pintura de muros, Instalación eléctrica"
                  value={miniForm.description}
                  onChange={(e) => setMiniForm({ ...miniForm, description: e.target.value })}
                  className="w-full bg-slate-800/80 p-3 rounded-xl border border-white/10 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                />
              </div>
              <div>
                <label className="label-neutral block mb-2">Monto ($)</label>
                <input 
                  type="number"
                  required
                  min="1"
                  placeholder="Monto de la partida"
                  value={miniForm.amount}
                  onChange={(e) => setMiniForm({ ...miniForm, amount: e.target.value })}
                  className="w-full bg-slate-800/80 p-3 rounded-xl border border-white/10 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowAddMini(false)}
                  className="flex-1 py-3 text-slate-400 hover:text-white font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-white rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all font-bold"
                >
                  Añadir Partida
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Registrar Gasto Modal */}
      {showAddExpense && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-bold text-white mb-2">Registrar Gasto</h3>
            <p className="text-slate-400 mb-6 text-sm">Registra un nuevo egreso para esta obra.</p>
            <form onSubmit={handleCreateExpense} className="space-y-4">
              <div>
                <label className="label-neutral block mb-2">Categoría</label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  className="w-full bg-slate-800/80 p-3 rounded-xl border border-white/10 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm cursor-pointer"
                >
                  <option value="MATERIALES">Materiales</option>
                  <option value="MANO_DE_OBRA">Mano de Obra</option>
                  <option value="MAQUINARIA">Maquinaria / Equipos</option>
                  <option value="HERRAMIENTAS">Herramientas</option>
                  <option value="SUBCONTRATO">Subcontratos</option>
                  <option value="VARIOS">Varios</option>
                  <option value="OTROS">Otros</option>
                </select>
              </div>
              
              <div>
                <label className="label-neutral block mb-2">Presupuesto Asociado (Partida)</label>
                <select
                  value={expenseForm.mini_budget_id}
                  onChange={(e) => setExpenseForm({ ...expenseForm, mini_budget_id: e.target.value })}
                  className="w-full bg-slate-800/80 p-3 rounded-xl border border-white/10 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm cursor-pointer"
                >
                  <option value="otros">Otros / Gasto General</option>
                  {project.mini_budgets?.map(mini => (
                    <option key={mini.id} value={mini.id}>{mini.description} (${parseFloat(mini.amount).toLocaleString('es-CL')})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label-neutral block mb-2">Descripción</label>
                <input 
                  type="text"
                  required
                  placeholder="Ej: Compra de cemento, Almuerzo personal"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full bg-slate-800/80 p-3 rounded-xl border border-white/10 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                />
              </div>

              <div>
                <label className="label-neutral block mb-2">Monto ($)</label>
                <input 
                  type="number"
                  required
                  min="1"
                  placeholder="Monto del gasto"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  className="w-full bg-slate-800/80 p-3 rounded-xl border border-white/10 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                />
              </div>

              <div>
                <label className="label-neutral block mb-2">Fecha de Gasto</label>
                <input 
                  type="date"
                  required
                  value={expenseForm.expense_date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
                  className="w-full bg-slate-800/80 p-3 rounded-xl border border-white/10 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                />
              </div>

              <div className="flex items-center gap-2 py-2">
                <input 
                  type="checkbox"
                  id="expense_is_paid"
                  checked={expenseForm.is_paid}
                  onChange={(e) => setExpenseForm({ ...expenseForm, is_paid: e.target.checked })}
                  className="w-4 h-4 rounded border-white/10 bg-slate-800 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="expense_is_paid" className="text-sm text-slate-300 cursor-pointer select-none">¿Ya está pagado?</label>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowAddExpense(false)}
                  className="flex-1 py-3 text-slate-400 hover:text-white font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md transition-all font-bold"
                >
                  Registrar Gasto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Registrar Factura Modal */}
      {showAddInvoice && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-bold text-white mb-2">Registrar Factura</h3>
            <p className="text-slate-400 mb-6 text-sm">Registra una nueva factura/cobro para esta obra.</p>
            <form onSubmit={handleCreateInvoice} className="space-y-4">
              <div>
                <label className="label-neutral block mb-2">Cliente / Mandante</label>
                <input 
                  type="text"
                  required
                  placeholder="Nombre del cliente"
                  value={invoiceForm.client_name}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, client_name: e.target.value })}
                  className="w-full bg-slate-800/80 p-3 rounded-xl border border-white/10 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                />
              </div>

              <div>
                <label className="label-neutral block mb-2">Presupuesto Asociado (Partida)</label>
                <select
                  value={invoiceForm.mini_budget_id}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, mini_budget_id: e.target.value })}
                  className="w-full bg-slate-800/80 p-3 rounded-xl border border-white/10 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm cursor-pointer"
                >
                  <option value="otros">Otros / Ingreso General</option>
                  {project.mini_budgets?.map(mini => (
                    <option key={mini.id} value={mini.id}>{mini.description} (${parseFloat(mini.amount).toLocaleString('es-CL')})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label-neutral block mb-2">Monto Total ($)</label>
                <input 
                  type="number"
                  required
                  min="1"
                  placeholder="Monto de la factura"
                  value={invoiceForm.total_amount}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, total_amount: e.target.value })}
                  className="w-full bg-slate-800/80 p-3 rounded-xl border border-white/10 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                />
              </div>

              <div>
                <label className="label-neutral block mb-2">Fecha de Emisión</label>
                <input 
                  type="date"
                  required
                  value={invoiceForm.issue_date}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, issue_date: e.target.value })}
                  className="w-full bg-slate-800/80 p-3 rounded-xl border border-white/10 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                />
              </div>

              <div>
                <label className="label-neutral block mb-2">Fecha de Vencimiento</label>
                <input 
                  type="date"
                  value={invoiceForm.due_date}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, due_date: e.target.value })}
                  className="w-full bg-slate-800/80 p-3 rounded-xl border border-white/10 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                />
              </div>

              <div>
                <label className="label-neutral block mb-2">Estado Inicial</label>
                <select
                  value={invoiceForm.status}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, status: e.target.value })}
                  className="w-full bg-slate-800/80 p-3 rounded-xl border border-white/10 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm cursor-pointer"
                >
                  <option value="DRAFT">Pendiente</option>
                  <option value="PAID">Pagada</option>
                </select>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowAddInvoice(false)}
                  className="flex-1 py-3 text-slate-400 hover:text-white font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md transition-all font-bold"
                >
                  Registrar Factura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetail;
