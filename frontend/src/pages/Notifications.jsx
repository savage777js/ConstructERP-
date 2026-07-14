import { useState, useEffect } from 'react';
import api from '../api';
import { 
  Bell, CheckCircle2, AlertTriangle, Info, AlertOctagon, 
  Trash2, ExternalLink, Calendar, Package, Users, Loader2, DollarSign
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await api.get('/notifications/');
      // Filtrar y omitir alertas de stock / inventario y sueldos impagos
      const filtered = response.data.filter(n => n.type !== 'STOCK_ALERT' && n.type !== 'UNPAID_SALARY');
      setNotifications(filtered);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`, { is_read: true });
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'CRITICAL': return <AlertOctagon size={20} />;
      case 'WARNING': return <AlertTriangle size={20} />;
      default: return <Info size={20} />;
    }
  };

  const getBadgeColor = (type) => {
    switch (type) {
      case 'UNPAID_SALARY': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'CONTRACT_EXPIRING': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'PROJECT_ENDING': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'VACATION_ALERT': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'VACATION_REQUEST': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'VACATION_APPROVED': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'PROFITABILITY_ALERT': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'UNPAID_SALARY': return <DollarSign size={12} />;
      case 'CONTRACT_EXPIRING': return <Users size={12} />;
      case 'PROJECT_ENDING': return <Calendar size={12} />;
      case 'VACATION_ALERT': return <AlertTriangle size={12} />;
      case 'VACATION_REQUEST': return <Calendar size={12} />;
      case 'VACATION_APPROVED': return <CheckCircle2 size={12} />;
      case 'PROFITABILITY_ALERT': return <DollarSign size={12} />;
      default: return <Bell size={12} />;
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-10">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
            <Bell size={28} className="text-blue-400" />
            Centro de Notificaciones
          </h1>
          <p className="text-slate-400 text-sm">Alertas automáticas y eventos críticos del sistema.</p>
        </div>
        {notifications.some(n => !n.is_read) && (
          <button 
            onClick={markAllRead}
            className="text-sm font-bold text-blue-400 hover:text-white transition-colors flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/5 border border-blue-500/10 w-full sm:w-auto justify-center"
          >
            <CheckCircle2 size={16} /> Marcar todas como leídas
          </button>
        )}
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="animate-spin mb-4" size={40} />
          <p>Ejecutando diagnóstico inteligente...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((notif) => (
            <div 
              key={notif.id}
              className={`glass-card p-5 sm:p-6 flex items-start gap-4 sm:gap-6 transition-all rounded-2xl relative border border-white/5 hover:border-white/10 hover:bg-white/[0.02] ${
                notif.is_read ? 'opacity-55' : 
                notif.priority === 'CRITICAL' ? 'shadow-[0_0_15px_rgba(239,68,68,0.05)] border-l-4 border-l-red-500' : 
                notif.priority === 'WARNING' ? 'shadow-[0_0_15px_rgba(245,158,11,0.05)] border-l-4 border-l-amber-500' : 
                'shadow-[0_0_15px_rgba(59,130,246,0.05)] border-l-4 border-l-blue-500'
              }`}
            >
              {!notif.is_read && (
                <span className="absolute top-4 right-4 flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    notif.priority === 'CRITICAL' ? 'bg-red-400' :
                    notif.priority === 'WARNING' ? 'bg-amber-400' : 'bg-blue-400'
                  }`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${
                    notif.priority === 'CRITICAL' ? 'bg-red-500' :
                    notif.priority === 'WARNING' ? 'bg-amber-500' : 'bg-blue-500'
                  }`}></span>
                </span>
              )}
              
              <div className="pt-1 shrink-0">
                <div className={`p-3 rounded-xl ${
                  notif.priority === 'CRITICAL' ? 'bg-red-500/10 text-red-400' : 
                  notif.priority === 'WARNING' ? 'bg-amber-500/10 text-amber-400' : 
                  'bg-blue-500/10 text-blue-400'
                }`}>
                  {getPriorityIcon(notif.priority)}
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                  <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border flex items-center gap-1 uppercase tracking-wider ${getBadgeColor(notif.type)}`}>
                    {getTypeIcon(notif.type)} {
                      notif.type === 'UNPAID_SALARY' ? 'SUELDO IMPAGO' :
                      notif.type === 'CONTRACT_EXPIRING' ? 'VENCIMIENTO CONTRATO' :
                      notif.type === 'PROJECT_ENDING' ? 'TÉRMINO PROYECTO' :
                      notif.type === 'STOCK_ALERT' ? 'ALERTA BODEGA' :
                      notif.type === 'SYSTEM_INFO' ? 'INFO SISTEMA' :
                      notif.type === 'VACATION_ALERT' ? 'ALERTA VACACIONES' :
                      notif.type === 'VACATION_REQUEST' ? 'SOLICITUD VACACIONES' :
                      notif.type === 'VACATION_APPROVED' ? 'VACACIONES APROBADAS' :
                      notif.type === 'PROFITABILITY_ALERT' ? 'MARGEN CRÍTICO' :
                      notif.type.replace('_', ' ')
                    }
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {new Date(notif.created_at).toLocaleString('es-CL', {
                      year: 'numeric', month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </span>
                </div>
                
                <h3 className={`text-base sm:text-lg font-bold mb-1.5 ${notif.is_read ? 'text-slate-400 line-through' : 'text-white'}`}>
                  {notif.title}
                </h3>
                
                <p className="text-slate-400 text-sm leading-relaxed mb-4">
                  {notif.message}
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  {!notif.is_read && (
                    <button 
                      onClick={() => markAsRead(notif.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/40 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-bold transition-all"
                    >
                      <CheckCircle2 size={13} />
                      Marcar como leída
                    </button>
                  )}
                  {notif.link && (
                    <button 
                      onClick={() => navigate(notif.link)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-500/20 bg-blue-500/5 text-blue-400 hover:text-white hover:bg-blue-600/30 text-xs font-bold transition-all"
                    >
                      Ver detalle
                      <ExternalLink size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {notifications.length === 0 && (
            <div className="py-20 text-center text-slate-500 bg-white/5 rounded-2xl border border-dashed border-white/10">
                <CheckCircle2 size={48} className="mx-auto mb-4 opacity-10" />
                <p>No hay alertas activas en este momento.</p>
                <p className="text-xs mt-2 text-slate-600">El sistema se encuentra operando dentro de los parámetros normales.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Notifications;
