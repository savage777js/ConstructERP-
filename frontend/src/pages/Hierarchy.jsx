import { useState, useEffect } from 'react';
import api from '../api';
import { 
  GitBranch, Users, Shield, Briefcase, Network, HardHat, Mail, Phone, 
  MapPin, Calendar, DollarSign, Search, Award, Info, Loader2, ArrowRight, X, ChevronDown, ChevronRight
} from 'lucide-react';

const Hierarchy = () => {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [expandedLevels, setExpandedLevels] = useState({
    1: true,
    2: true,
    3: true,
    4: true
  });

  useEffect(() => {
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/workers/');
      // Filter active workers for hierarchy view
      setWorkers(response.data.filter(w => w.status === 'ACTIVE'));
    } catch (error) {
      console.error('Error fetching workers for hierarchy:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWorkerRank = (role = "") => {
    const r = role.toLowerCase();
    if (r.includes('gerente') || r.includes('director') || r.includes('ceo') || r.includes('general')) return 1;
    if (r.includes('ingenier') || r.includes('civil') || r.includes('admin') || r.includes('oficina') || r.includes('prevencion') || r.includes('compras')) return 2;
    if (r.includes('topograf') || r.includes('capataz') || r.includes('supervis') || r.includes('jefe')) return 3;
    return 4; // Field workers / Operarios
  };

  const getRankConfig = (rank) => {
    switch (rank) {
      case 1:
        return {
          title: 'Alta Gerencia',
          color: 'from-amber-500 to-orange-600',
          badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          bgGlow: 'rgba(245, 158, 11, 0.05)'
        };
      case 2:
        return {
          title: 'Oficina Técnica / Administración',
          color: 'from-blue-500 to-indigo-600',
          badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
          bgGlow: 'rgba(14, 165, 233, 0.05)'
        };
      case 3:
        return {
          title: 'Jefatura de Obra / Supervisión',
          color: 'from-purple-500 to-violet-600',
          badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
          bgGlow: 'rgba(139, 92, 246, 0.05)'
        };
      case 4:
      default:
        return {
          title: 'Personal Operativo / Terreno',
          color: 'from-emerald-500 to-teal-600',
          badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          bgGlow: 'rgba(16, 185, 129, 0.05)'
        };
    }
  };

  // Group workers by rank
  const groupedWorkers = {
    1: [],
    2: [],
    3: [],
    4: []
  };

  // Add a virtual Gerente General if no rank 1 worker exists
  const hasRank1 = workers.some(w => getWorkerRank(w.role) === 1);
  
  workers.forEach(w => {
    const rank = getWorkerRank(w.role);
    groupedWorkers[rank].push(w);
  });

  // If no rank 1 found, push a default "Gerente General" placeholder card (tied to gerente@serconind.cl context)
  const virtualGerente = {
    id: 'virtual-ceo',
    first_name: 'Gerente',
    last_name: 'General',
    role: 'Gerente General',
    rut: '10.222.333-K',
    email: 'gerente@serconind.cl',
    phone: '+56 9 8765 4321',
    address: 'Av. Las Condes 12450, Santiago',
    salary: 4500000,
    isVirtual: true
  };

  if (!hasRank1) {
    groupedWorkers[1].push(virtualGerente);
  }

  const toggleLevel = (level) => {
    setExpandedLevels(prev => ({ ...prev, [level]: !prev[level] }));
  };

  const matchesSearch = (w) => {
    if (!searchTerm) return true;
    const name = `${w.first_name} ${w.last_name}`.toLowerCase();
    const role = (w.role || '').toLowerCase();
    const rut = w.rut.toLowerCase();
    const search = searchTerm.toLowerCase();
    return name.includes(search) || role.includes(search) || rut.includes(search);
  };

  return (
    <div className="p-8 pb-20 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-extrabold text-white flex items-center gap-3 tracking-tight">
            <GitBranch size={36} className="text-amber-500 animate-pulse" />
            Jerarquía de la Empresa
          </h1>
          <p className="text-slate-400 mt-2">
            Organigrama operativo, líneas de reportes y frentes de trabajo activos.
          </p>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nombre, RUT o cargo..."
            className="w-full bg-slate-800/40 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-amber-500/50 transition-all shadow-xl backdrop-blur-md"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')} 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 text-slate-400">
          <Loader2 className="animate-spin text-amber-500 mb-4" size={44} />
          <p className="font-semibold text-lg">Cargando jerarquía corporativa...</p>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Main Org Tree View */}
          <div className="flex-1 w-full space-y-12">
            {[1, 2, 3, 4].map((level) => {
              const config = getRankConfig(level);
              const list = groupedWorkers[level];
              const visibleList = list.filter(matchesSearch);

              if (list.length === 0) return null;

              return (
                <div key={level} className="relative">
                  {/* Visual Connector Line between levels */}
                  {level > 1 && (
                    <div className="absolute -top-12 left-8 w-0.5 h-12 bg-gradient-to-b from-white/5 to-white/15" />
                  )}

                  {/* Level Header Accordion */}
                  <div 
                    onClick={() => toggleLevel(level)}
                    className="flex items-center gap-3 mb-6 cursor-pointer group bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 px-5 py-3.5 rounded-2xl w-fit transition-all"
                  >
                    {expandedLevels[level] ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
                    <h2 className="text-md font-bold text-slate-300 uppercase tracking-widest group-hover:text-white transition-colors">
                      {config.title}
                    </h2>
                    <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg text-xs text-slate-400 font-mono">
                      {visibleList.length}
                    </span>
                  </div>

                  {/* Level Cards Grid */}
                  {expandedLevels[level] && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
                      {list.map((worker) => {
                        const isMatch = matchesSearch(worker);
                        const isSelected = selectedWorker?.id === worker.id;
                        
                        return (
                          <div 
                            key={worker.id}
                            onClick={() => setSelectedWorker(worker)}
                            style={{
                              background: isSelected ? 'rgba(245, 158, 11, 0.08)' : 'var(--glass)',
                              borderColor: isSelected ? 'rgba(245, 158, 11, 0.4)' : (isMatch && searchTerm ? 'rgba(245, 158, 11, 0.25)' : 'var(--border)')
                            }}
                            className={`glass-card p-6 rounded-2xl cursor-pointer transition-all duration-300 relative overflow-hidden group hover:scale-[1.02] ${
                              !isMatch ? 'opacity-30 hover:opacity-50' : ''
                            } ${isMatch && searchTerm ? 'ring-2 ring-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.1)]' : ''}`}
                          >
                            {/* Accent Glow Background */}
                            <div 
                              className="absolute -top-12 -right-12 w-28 h-28 rounded-full filter blur-2xl opacity-10 transition-opacity group-hover:opacity-20"
                              style={{ background: `linear-gradient(135deg, ${config.bgGlow}, transparent)` }}
                            />

                            <div className="flex items-start gap-4">
                              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${config.color} text-slate-950 flex items-center justify-center font-extrabold text-md shadow-lg`}>
                                {worker.first_name[0]}{worker.last_name[0]}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="text-md font-bold text-white truncate group-hover:text-amber-400 transition-colors">
                                  {worker.first_name} {worker.last_name}
                                </h3>
                                <p className="text-slate-400 text-xs mt-0.5 truncate font-medium">{worker.role}</p>
                                
                                <span className={`inline-block mt-3 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg border ${config.badgeClass}`}>
                                  Nivel {level}
                                </span>
                              </div>
                            </div>

                            {/* Hover indicators */}
                            <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 text-xs text-amber-500 font-bold">
                              <span>Ficha</span>
                              <ArrowRight size={12} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Detailed Worker Profile Sidebar */}
          {selectedWorker && (
            <div className="w-full lg:w-96 bg-slate-900/80 border border-white/5 rounded-3xl p-8 backdrop-blur-xl lg:sticky lg:top-8 animate-in slide-in-from-right-4 duration-300 shadow-2xl relative overflow-hidden">
              {/* Glowing Background Accent */}
              <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full bg-amber-500/5 filter blur-3xl" />
              
              <button 
                onClick={() => setSelectedWorker(null)}
                className="absolute top-6 right-6 text-slate-400 hover:text-white p-1 hover:bg-white/5 rounded-lg transition-all"
              >
                <X size={20} />
              </button>

              <div className="text-center pb-8 border-b border-white/5">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-slate-950 flex items-center justify-center font-black text-2xl shadow-xl shadow-amber-500/10 mx-auto mb-4">
                  {selectedWorker.first_name[0]}{selectedWorker.last_name[0]}
                </div>
                <h3 className="text-xl font-bold text-white">{selectedWorker.first_name} {selectedWorker.last_name}</h3>
                <p className="text-amber-400 text-sm font-semibold mt-1">{selectedWorker.role}</p>
                {selectedWorker.isVirtual && (
                  <span className="inline-block mt-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Soporte ERP
                  </span>
                )}
              </div>

              <div className="py-8 space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Información de Contacto</h4>
                  <div className="space-y-3.5">
                    <div className="flex items-center gap-3 text-slate-300 text-sm">
                      <Mail size={16} className="text-slate-500" />
                      <span className="truncate">{selectedWorker.email || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-300 text-sm">
                      <Phone size={16} className="text-slate-500" />
                      <span>{selectedWorker.phone || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-300 text-sm">
                      <MapPin size={16} className="text-slate-500" />
                      <span className="truncate">{selectedWorker.address || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Detalle Organizacional</h4>
                  <div className="space-y-3.5">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400 flex items-center gap-2"><Shield size={14} className="text-slate-500" /> RUT / Identificador</span>
                      <span className="text-white font-mono font-medium">{selectedWorker.rut}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400 flex items-center gap-2"><DollarSign size={14} className="text-slate-500" /> Sueldo Base</span>
                      <span className="text-white font-semibold">
                        ${selectedWorker.salary?.toLocaleString('es-CL')}
                      </span>
                    </div>
                    {!selectedWorker.isVirtual && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400 flex items-center gap-2"><Calendar size={14} className="text-slate-500" /> Contrato Desde</span>
                        <span className="text-white font-medium">
                          {selectedWorker.hire_date ? new Date(selectedWorker.hire_date).toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex gap-3 items-start">
                <Info size={16} className="text-slate-400 mt-0.5 min-w-[16px]" />
                <p className="text-slate-400 text-xs leading-relaxed">
                  Este perfil y su posición en el organigrama corresponden a la información de contratación registrada en el departamento de Recursos Humanos.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Hierarchy;
