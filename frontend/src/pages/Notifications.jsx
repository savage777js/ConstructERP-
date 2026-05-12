import { useState, useEffect } from 'react';
import api from '../api';
import { 
  Bell, CheckCircle2, AlertTriangle, Info, AlertOctagon, 
  Trash2, ExternalLink, Calendar, Package, Users, Loader2 
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
      setNotifications(response.data);
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
      case 'CRITICAL': return <AlertOctagon className="text-red-500" size={24} />;
      case 'WARNING': return <AlertTriangle className="text-amber-500" size={24} />;
      default: return <Info className="text-blue-500" size={24} />;
    }
  };

  const getBadgeColor = (type) => {
    switch (type) {
      case 'STOCK_ALERT': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'CONTRACT_EXPIRING': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'PROJECT_ENDING': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'STOCK_ALERT': return <Package size={14} />;
      case 'CONTRACT_EXPIRING': return <Users size={14} />;
      case 'PROJECT_ENDING': return <Calendar size={14} />;
      default: return <Bell size={14} />;
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Bell size={32} className="text-blue-400" />
            Centro de Notificaciones
          </h1>
          <p className="text-slate-400">Alertas automáticas y eventos críticos del sistema.</p>
        </div>
        {notifications.some(n => !n.is_read) && (
          <button 
            onClick={markAllRead}
            className="text-sm font-bold text-blue-400 hover:text-white transition-colors flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/5 border border-blue-500/10"
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
              className={`glass-card p-6 flex items-start gap-6 transition-all border-l-4 ${
                notif.is_read ? 'opacity-60 border-l-slate-700' : 
                notif.priority === 'CRITICAL' ? 'border-l-red-500 bg-red-500/5' : 
                notif.priority === 'WARNING' ? 'border-l-amber-500 bg-amber-500/5' : 
                'border-l-blue-500 bg-blue-500/5'
              }`}
            >
              <div className="pt-1">
                {getPriorityIcon(notif.priority)}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 uppercase ${getBadgeColor(notif.type)}`}>
                    {getTypeIcon(notif.type)} {notif.type.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    {new Date(notif.created_at).toLocaleString('es-CL')}
                  </span>
                </div>
                
                <h3 className={`text-lg font-bold mb-1 ${notif.is_read ? 'text-slate-300' : 'text-white'}`}>
                  {notif.title}
                </h3>
                
                <p className="text-slate-400 text-sm leading-relaxed mb-4">
                  {notif.message}
                </p>

                <div className="flex items-center gap-4">
                  {!notif.is_read && (
                    <button 
                      onClick={() => markAsRead(notif.id)}
                      className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Marcar como leída
                    </button>
                  )}
                  {notif.link && (
                    <button 
                      onClick={() => navigate(notif.link)}
                      className="text-xs font-bold text-slate-300 hover:text-white transition-colors flex items-center gap-1"
                    >
                      Ver detalle <ExternalLink size={12} />
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
