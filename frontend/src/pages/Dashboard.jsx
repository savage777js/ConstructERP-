import { useState, useEffect } from 'react';
import api from '../api';
import { 
  Users, Briefcase, Bell, 
  AlertTriangle, ArrowRight,
  HardHat, Loader2, RefreshCw, Folder, FileText
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import KPICard from '../components/KPICard';

const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [summaryRes, chartRes] = await Promise.all([
        api.get('/dashboard/summary'),
        api.get('/dashboard/charts')
      ]);
      setSummary(summaryRes.data);
      setChartData(chartRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const COLORS = ['#f59e0b', '#0ea5e9', '#6366f1', '#ef4444', '#10b981'];

  if (loading) return (
    <div className="flex h-screen items-center justify-center text-slate-400">
      <Loader2 size={40} className="animate-spin mr-3 text-blue-500" />
      <span>Consolidando indicadores ejecutivos...</span>
    </div>
  );

  if (!summary || !chartData) return (
    <div className="flex h-screen items-center justify-center flex-col text-slate-400 p-8">
      <AlertTriangle size={60} className="text-red-500 mb-4" />
      <h2 className="text-2xl font-bold text-white mb-2">Error de conexión</h2>
      <p className="text-center mb-6">No se pudieron obtener los datos. Verifica que el backend esté corriendo y disponible.</p>
      <button 
        onClick={fetchDashboardData}
        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
      >
        <RefreshCw size={18} /> Reintentar
      </button>
    </div>
  );

  const userRole = localStorage.getItem('userRole');
  const isGerenteOrAdmin = ['ADMIN', 'MANAGEMENT'].includes(userRole);

  const translatedAlertsData = chartData?.alerts_priority?.map(item => {
    let nameEs = item.name;
    if (item.name === 'CRITICAL') nameEs = 'CRÍTICA';
    else if (item.name === 'WARNING') nameEs = 'ADVERTENCIA';
    else if (item.name === 'INFO') nameEs = 'INFORMATIVA';
    return { ...item, name: nameEs };
  }) || [];

  return (
    <div className="p-4 sm:p-8 max-w-[1600px] mx-auto pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6 mb-6 sm:mb-12">
        <div className="relative">
          <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-12 bg-[var(--primary)] rounded-full blur-[2px]" />
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tighter flex items-center gap-4">
            CENTRAL <span className="gradient-text">OPERATIVA</span>
          </h1>
          <p className="text-[var(--text-muted)] text-sm font-bold tracking-[0.2em] uppercase mt-1 opacity-70">
            Control de Gestión · Serconind Ltda.
          </p>
        </div>
        <button 
          onClick={fetchDashboardData}
          className="group flex items-center gap-3 px-6 py-3 bg-[var(--primary-glow)] border border-[var(--primary-glow)] rounded-2xl text-[var(--primary)] hover:bg-[var(--primary)] hover:text-black transition-all duration-500 font-black text-sm tracking-widest uppercase"
        >
          <RefreshCw size={16} className="group-hover:rotate-180 transition-transform duration-700" />
          Sincronizar Nodo
        </button>
      </header>
      

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-8 mb-6 sm:mb-12">
        <KPICard 
          title="Trabajadores Activos" 
          value={summary.workers.total} 
          subtitle={
            isGerenteOrAdmin ? (
              <div className="space-y-1 text-left">
                <div>{summary.workers.expiring} contratos por vencer</div>
                <div className="text-blue-400 font-bold mt-1.5">Sueldos: ${Number(summary.workers.total_salary || 0).toLocaleString('es-CL')}</div>
              </div>
            ) : (
              `${summary.workers.expiring} contratos por vencer`
            )
          }
          icon={Users} 
          color="blue"
          trend={summary.workers.expiring > 0 ? "down" : "up"}
          trendValue={summary.workers.expiring > 0 ? "Alerta RRHH" : "Estable"}
        />
        <KPICard 
          title="Obras en Ejecución" 
          value={summary.projects.total} 
          subtitle={
            isGerenteOrAdmin ? (
              <div className="space-y-1 text-left">
                <div>{summary.projects.ending} próximas a finalizar</div>
                <div className="text-purple-400 font-bold mt-1.5">Presupuesto: ${Number(summary.projects.total_budget || 0).toLocaleString('es-CL')}</div>
                <div className="text-emerald-400 font-bold">Utilidad Proy: ${Number(summary.projects.projected_utility || 0).toLocaleString('es-CL')}</div>
              </div>
            ) : (
              `${summary.projects.ending} próximas a finalizar`
            )
          }
          icon={Briefcase} 
          color="purple"
        />
        <KPICard 
          title="Alertas Pendientes" 
          value={summary.notifications.unread} 
          subtitle="Acciones requeridas"
          icon={Bell} 
          color={summary.notifications.unread > 0 ? "red" : "emerald"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
        {/* Chart 1: Workers per Project */}
        <div className="lg:col-span-2 glass-card p-4 sm:p-8 min-h-[350px] sm:min-h-[450px]">
          <h3 className="text-xl font-bold text-white mb-6 sm:mb-8 flex items-center gap-2">
            <HardHat className="text-blue-400" size={20} /> Dotación de Personal por Proyecto
          </h3>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.workers_project}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', color: 'var(--text-main)', backdropFilter: 'blur(10px)' }} 
                  itemStyle={{ color: 'var(--primary)' }}
                />
                <Bar dataKey="workers" fill="var(--accent-blue)" radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Alerts breakdown */}
        <div className="glass-card p-4 sm:p-8 min-h-[350px] sm:min-h-[450px]">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="text-amber-500" size={20} /> Distribución de Alertas
          </h3>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={translatedAlertsData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={6}
                  dataKey="value"
                >
                  {translatedAlertsData.map((entry, index) => {
                    let cellColor = '#6366f1';
                    if (entry.name === 'CRÍTICA') cellColor = '#ef4444';
                    else if (entry.name === 'ADVERTENCIA') cellColor = '#f59e0b';
                    else if (entry.name === 'INFORMATIVA') cellColor = '#0ea5e9';
                    return <Cell key={`cell-${index}`} fill={cellColor} stroke="rgba(0,0,0,0)" />;
                  })}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text-main)' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* Guía explicativa de prioridades */}
          <div className="mt-4 pt-4 border-t border-white/5 space-y-3.5 text-xs">
            <div className="flex items-start gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 mt-1 flex-shrink-0" />
              <div>
                <span className="font-bold text-white uppercase text-[10px] tracking-wider">CRÍTICA (Peligro):</span>
                <p className="text-slate-400 mt-0.5 leading-relaxed">Requiere acción inmediata (ej: contratos vencidos o remuneraciones pendientes).</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 mt-1 flex-shrink-0" />
              <div>
                <span className="font-bold text-white uppercase text-[10px] tracking-wider">ADVERTENCIA (Aviso):</span>
                <p className="text-slate-400 mt-0.5 leading-relaxed">Incidentes medios o sucesos próximos a vencer (ej: contratos por expirar en 30 días).</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400 mt-1 flex-shrink-0" />
              <div>
                <span className="font-bold text-white uppercase text-[10px] tracking-wider">INFORMATIVA:</span>
                <p className="text-slate-400 mt-0.5 leading-relaxed">Avisos generales del sistema sin riesgo de operación (ej: carga exitosa de documentos OCR).</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Access Grid */}
        {(() => {
          const baseActions = localStorage.getItem('userRole') === 'ADMIN' ? [
            { name: 'Recursos Humanos', icon: Users, path: '/workers', color: 'bg-blue-500/10 text-blue-400' },
            { name: 'Capataz AI', icon: HardHat, path: '/capataz', color: 'bg-amber-500/10 text-amber-400' },
            { name: 'Reportes Generales', icon: FileText, path: '/reports', color: 'bg-indigo-500/10 text-indigo-400' },
            { name: 'Expedientes & OCR', icon: Folder, path: '/documents', color: 'bg-emerald-500/10 text-emerald-400' },
            { name: 'Centro de Alertas', icon: Bell, path: '/notifications', color: 'bg-red-500/10 text-red-400' }
          ] : [
            { name: 'Gestión RRHH', icon: Users, path: '/workers', color: 'bg-blue-500/10 text-blue-400', roles: ['ADMIN', 'HR_MANAGER', 'MANAGEMENT', 'PROJECT_MANAGER'] },
            { name: 'Control de Obras', icon: Briefcase, path: '/projects', color: 'bg-purple-500/10 text-purple-400', roles: ['ADMIN', 'PROJECT_MANAGER', 'MANAGEMENT', 'HR_MANAGER', 'INVENTORY_MANAGER'] },
            { name: 'Centro de Alertas', icon: Bell, path: '/notifications', color: 'bg-red-500/10 text-red-400', roles: ['ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'INVENTORY_MANAGER', 'MANAGEMENT'] }
          ].filter(item => {
            const role = localStorage.getItem('userRole');
            return role && item.roles.includes(role);
          });

          const gridColsClass = baseActions.length === 5 
            ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5" 
            : baseActions.length === 3 
            ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3" 
            : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";

          return (
            <div className={`lg:col-span-3 grid ${gridColsClass} gap-4 sm:gap-6 mt-4`}>
              {baseActions.map((item) => (
                <button
                  key={item.name}
                  onClick={() => navigate(item.path)}
                  className="flex items-center justify-between p-6 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/[0.08] transition-all group shadow-xl"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${item.color}`}>
                      <item.icon size={24} />
                    </div>
                    <span className="font-bold text-slate-100">{item.name}</span>
                  </div>
                  <ArrowRight className="text-slate-600 group-hover:text-white group-hover:translate-x-1 transition-all" size={20} />
                </button>
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default Dashboard;
