import { useState, useEffect } from 'react';
import api from '../api';
import { 
  BarChart2, FileText, Download, Calendar, 
  Users, Package, Briefcase, Bell, 
  Search, Filter, Loader2, ChevronRight,
  FileSpreadsheet, ArrowLeft, LayoutDashboard
} from 'lucide-react';

const Reports = () => {
  const [selectedReport, setSelectedReport] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    project_id: ''
  });

  const reportsList = [
    { 
      id: 'workers', 
      title: 'Listado de Trabajadores', 
      desc: 'Nómina completa con cargos y estado actual.', 
      icon: Users,
      color: 'blue'
    },
    { 
      id: 'assignments', 
      title: 'Asignaciones por Obra', 
      desc: 'Cruce de personal asignado a proyectos activos.', 
      icon: Briefcase,
      color: 'purple'
    },
    { 
      id: 'inventory_status', 
      title: 'Inventario Disponible', 
      desc: 'Balance total de stock en bodega central.', 
      icon: Package,
      color: 'amber'
    },
    { 
      id: 'inventory_critical', 
      title: 'Stock Crítico', 
      desc: 'Ítems que requieren reposición inmediata.', 
      icon: Package,
      color: 'red'
    },
    { 
      id: 'assigned_resources', 
      title: 'Recursos en Obra', 
      desc: 'Salida de materiales y herramientas a proyectos.', 
      icon: FileText,
      color: 'emerald',
      useDates: true
    },
    { 
      id: 'projects', 
      title: 'Proyectos Activos', 
      desc: 'Estado operativo y contractual de obras.', 
      icon: LayoutDashboard,
      color: 'indigo'
    },
    { 
      id: 'notifications', 
      title: 'Historial de Alertas', 
      desc: 'Registro de eventos críticos y notificaciones.', 
      icon: Bell,
      color: 'rose',
      useDates: true
    },
    { 
      id: 'contracts_expiring', 
      title: 'Contratos por Vencer', 
      desc: 'Personal próximo a finalizar periodo contractual.', 
      icon: Users,
      color: 'orange'
    }
  ];

  const handleFetchPreview = async (reportId) => {
    setLoading(true);
    setSelectedReport(reportsList.find(r => r.id === reportId));
    try {
      const params = new URLSearchParams();
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      if (filters.project_id) params.append('project_id', filters.project_id);

      const response = await api.get(`/reports/${reportId}?${params.toString()}`);
      setPreviewData(response.data);
    } catch (error) {
      console.error('Error fetching preview:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    if (!selectedReport) return;
    setExporting(true);
    try {
      const params = new URLSearchParams();
      params.append('format', format);
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      if (filters.project_id) params.append('project_id', filters.project_id);

      const response = await api.get(`/reports/${selectedReport.id}/export?${params.toString()}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const ext = format === 'pdf' ? 'pdf' : 'xlsx';
      link.setAttribute('download', `${selectedReport.id}_report_${new Date().getTime()}.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting:', error);
    } finally {
      setExporting(false);
    }
  };

  const getStatusColor = (status) => {
    if (status === 'ACTIVE' || status === 'EN EJECUCIÓN') return 'text-emerald-400 bg-emerald-500/10';
    if (status === 'CRITICAL' || status === 'STOCK BAJO') return 'text-red-400 bg-red-500/10';
    return 'text-slate-400 bg-slate-500/10';
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto pb-20">
      <header className="mb-10">
        <h1 className="text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
          <BarChart2 className="text-blue-500" size={36} />
          Módulo de Reportes & Business Intelligence
        </h1>
        <p className="text-slate-400 text-lg mt-2 font-medium">Análisis operativo para la toma de decisiones en SERCONIND LTDA.</p>
      </header>

      {!selectedReport ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {reportsList.map((report) => (
            <button
              key={report.id}
              onClick={() => handleFetchPreview(report.id)}
              className="glass-card p-8 text-left hover:border-blue-500/50 transition-all group relative overflow-hidden"
            >
              <div className={`p-4 rounded-2xl w-fit mb-6 transition-transform group-hover:scale-110 duration-300 bg-${report.color}-500/10 text-${report.color}-400`}>
                <report.icon size={32} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">{report.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{report.desc}</p>
              <div className="mt-8 flex items-center gap-2 text-xs font-bold text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                GENERAR VISTA PREVIA <ChevronRight size={14} />
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-left-4 duration-500">
          <button 
            onClick={() => { setSelectedReport(null); setPreviewData([]); }}
            className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors group font-bold"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            Volver a Selección de Reportes
          </button>

          <div className="glass-card mb-8">
            <div className="p-8 border-b border-white/5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 bg-white/[0.02]">
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-xl bg-blue-500/10 text-blue-400`}>
                  <selectedReport.icon size={32} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">{selectedReport.title}</h2>
                  <p className="text-slate-400 text-sm">{selectedReport.desc}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                {selectedReport.useDates && (
                  <div className="flex items-center gap-3 bg-slate-900/50 p-2 rounded-xl border border-white/5">
                    <Calendar size={18} className="text-slate-500 ml-2" />
                    <input 
                      type="date" 
                      value={filters.start_date}
                      onChange={(e) => setFilters({...filters, start_date: e.target.value})}
                      className="bg-transparent text-white text-sm outline-none cursor-pointer"
                    />
                    <span className="text-slate-600">→</span>
                    <input 
                      type="date" 
                      value={filters.end_date}
                      onChange={(e) => setFilters({...filters, end_date: e.target.value})}
                      className="bg-transparent text-white text-sm outline-none cursor-pointer"
                    />
                    <button 
                      onClick={() => handleFetchPreview(selectedReport.id)}
                      className="ml-2 p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                      title="Aplicar Filtros"
                    >
                      <Filter size={16} />
                    </button>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <button 
                    disabled={loading || previewData.length === 0}
                    onClick={async () => {
                      setLoading(true);
                      try {
                        const params = new URLSearchParams();
                        if (filters.start_date) params.append('start_date', filters.start_date);
                        if (filters.end_date) params.append('end_date', filters.end_date);
                        
                        const res = await api.post(`/reports/${selectedReport.id}/analyze?${params.toString()}`);
                        alert("ANÁLISIS DE CAPATAZ AI:\n\n" + res.data.analysis);
                      } catch (e) {
                        console.error(e);
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all font-bold shadow-lg"
                  >
                    <Sparkles size={18} />
                    IA Análisis
                  </button>
                  <button 
                    disabled={exporting}
                    onClick={() => handleExport('excel')}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 rounded-xl hover:bg-emerald-600 hover:text-white transition-all font-bold shadow-lg"
                  >
                    {exporting ? <Loader2 className="animate-spin" size={18} /> : <FileSpreadsheet size={18} />}
                    Excel
                  </button>
                  <button 
                    disabled={exporting}
                    onClick={() => handleExport('pdf')}
                    className="flex items-center gap-2 px-6 py-3 bg-red-600/10 border border-red-500/20 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all font-bold shadow-lg"
                  >
                    {exporting ? <Loader2 className="animate-spin" size={18} /> : <FileText size={18} />}
                    PDF
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="py-40 flex flex-col items-center justify-center text-slate-500">
                  <Loader2 className="animate-spin mb-4" size={32} />
                  <p>Consolidando datos operativos...</p>
                </div>
              ) : previewData.length > 0 ? (
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-900/50 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                      {Object.keys(previewData[0]).map(key => (
                        <th key={key} className="px-8 py-5 border-b border-white/5">{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {previewData.slice(0, 15).map((row, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                        {Object.entries(row).map(([key, val], i) => (
                            <td key={i} className="px-8 py-6 text-sm">
                                <span className={
                                    (key === 'Estado' || key === 'Prioridad') 
                                    ? `px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusColor(val)}`
                                    : 'text-slate-300'
                                }>
                                    {val}
                                </span>
                            </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-32 text-center text-slate-500 italic">
                  No se encontraron registros que coincidan con los criterios.
                </div>
              )}
              {previewData.length > 15 && (
                <div className="p-6 text-center border-t border-white/5 bg-slate-900/40">
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">
                    Mostrando solo las primeras 15 filas en vista previa. Descargue el reporte completo para ver todos los datos.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
