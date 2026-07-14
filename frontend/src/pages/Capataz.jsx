import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import { 
  Send, ShieldCheck, Zap, Paperclip, FileText, 
  Loader2, AlertCircle, X, Save, Copy, Download,
  BarChart2, FileSpreadsheet, Sparkles
} from 'lucide-react';
import './Capataz.css';
import { useAuth } from '../context/AuthContext';

const Capataz = () => {
  // Estados para secuencia de inicio (Checklist de carga)
  const [startupStep, setStartupStep] = useState(0);
  const [startupComplete, setStartupComplete] = useState(false);
  const startupLogs = [
    "Analizando Recursos Humanos...",
    "✔ Trabajadores",
    "✔ Contratos",
    "✔ Asistencia",
    "✔ Proyectos",
    "✔ Licencias",
    "✔ Remuneraciones",
    "✔ Documentación",
    "✔ OCR",
    "✔ Alertas",
    "Generando recomendaciones...",
    "Análisis completado."
  ];

  // Datos del Dashboard y Chat
  const [dashboardData, setDashboardData] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [lastResponseTime, setLastResponseTime] = useState('1.1s');
  
  // OCR expense form state
  const [projects, setProjects] = useState([]);
  const [pendingExpense, setPendingExpense] = useState(null);
  const [registeringLoading, setRegisteringLoading] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    project_id: '',
    category: 'materiales',
    description: '',
    amount: 0,
    expense_date: ''
  });
  const [formError, setFormError] = useState('');
  
  // Estados para Informe Ejecutivo
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportStep, setReportStep] = useState(0);
  const reportLogs = [
    "Analizando Recursos Humanos...",
    "Analizando contratos...",
    "Consultando asistencia...",
    "Revisando proyectos...",
    "Generando indicadores...",
    "Calculando recomendaciones...",
    "Construyendo informe..."
  ];
  const [reportMarkdown, setReportMarkdown] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const { user } = useAuth();

  const [exportingReportId, setExportingReportId] = useState(null);

  const biReports = [
    { id: 'workers', title: 'Nómina de Trabajadores', desc: 'Personal contratado, RUT, cargos y salarios.' },
    { id: 'assignments', title: 'Asignaciones de Obras', desc: 'Trabajadores asignados por frente de trabajo.' },
    { id: 'projects', title: 'Estado de Proyectos', desc: 'Avances, presupuestos e hitos de obras.' },
    { id: 'notifications', title: 'Historial de Alertas', desc: 'Registro histórico de incidencias de seguridad y operativas.' },
    { id: 'contracts_expiring', title: 'Contratos por Vencer', desc: 'Personal próximo a finalizar periodo contractual.' },
  ];

  const handleExportBI = async (reportId, format) => {
    setExportingReportId(`${reportId}_${format}`);
    try {
      const response = await api.get(`/reports/${reportId}/export?format=${format}`, {
        responseType: 'blob'
      });
      
      const file = new Blob([response.data], {
        type: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const fileURL = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = fileURL;
      const ext = format === 'pdf' ? 'pdf' : 'xlsx';
      
      const titleMap = {
        workers: 'Listado_Trabajadores',
        assignments: 'Asignaciones_Obra',
        projects: 'Proyectos_Activos',
        notifications: 'Historial_Alertas',
        contracts_expiring: 'Contratos_Por_Vencer'
      };
      const reportName = titleMap[reportId] || reportId;
      link.download = `Reporte_${reportName}_${new Date().toISOString().split('T')[0]}.${ext}`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(fileURL);
    } catch (error) {
      console.error('Error al exportar reporte BI:', error);
      alert('No se pudo exportar el reporte en este momento.');
    } finally {
      setExportingReportId(null);
    }
  };

  const handleAskAIAboutReport = (reportTitle, reportId) => {
    handleSend(`Analiza el reporte "${reportTitle}" (ID: ${reportId}) del ERP y haz un análisis de la situación con anomalías y recomendaciones.`);
  };
  const canManageExpenses = ['ADMIN', 'PROJECT_MANAGER', 'INVENTORY_MANAGER', 'MANAGEMENT'].includes(user?.role);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Secuencia de inicio animada
  useEffect(() => {
    if (!startupComplete) {
      const interval = setInterval(() => {
        setStartupStep((prev) => {
          if (prev >= startupLogs.length - 1) {
            clearInterval(interval);
            setTimeout(() => {
              setStartupComplete(true);
            }, 600);
            return prev;
          }
          return prev + 1;
        });
      }, 200);
      return () => clearInterval(interval);
    }
  }, [startupComplete]);

  // Cargar datos reales de la base de datos
  const loadInitialData = async () => {
    setLoadingDashboard(true);
    try {
      const dashRes = await api.get('/ai/dashboard');
      setDashboardData(dashRes.data);
      
      // Inicializar chat con el Resumen Ejecutivo de la IA
      if (dashRes.data?.welcome_message) {
        setMessages([
          {
            role: 'bot',
            content: dashRes.data.welcome_message
          }
        ]);
      } else {
        setMessages([]);
      }

      const projRes = await api.get('/projects/');
      setProjects(projRes.data);
    } catch (error) {
      console.error('Error cargando datos del Agente AI:', error);
    } finally {
      setLoadingDashboard(false);
    }
  };

  useEffect(() => {
    if (startupComplete) {
      loadInitialData();
    }
  }, [startupComplete]);

  const handleSend = async (customMessage = null) => {
    const textToSend = customMessage || inputValue;
    if (!textToSend.trim() || isTyping) return;

    const userMessage = { role: 'user', content: textToSend };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    const startTime = performance.now();

    try {
      const response = await api.post('/ai/chat', {
        messages: [...messages, userMessage].map(m => ({
          role: m.role === 'bot' ? 'assistant' : 'user',
          content: m.content
        })),
        bot_id: 'hr_agent'
      });

      const duration = ((performance.now() - startTime) / 1000).toFixed(1);
      setLastResponseTime(`${duration}s`);

      setMessages(prev => [...prev, { 
        role: 'bot', 
        content: response.data.response,
        toolCalls: response.data.tool_calls 
      }]);
      
      if (response.data.tool_calls && response.data.tool_calls.length > 0) {
        refreshDashboardSilent();
      }
    } catch (error) {
      console.error('Error en Capataz AI:', error);
      setMessages(prev => [...prev, { 
        role: 'bot', 
        content: 'Fallo en el protocolo de comunicación. Por favor, intente nuevamente en unos instantes.' 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const refreshDashboardSilent = async () => {
    try {
      const dashRes = await api.get('/ai/dashboard');
      setDashboardData(dashRes.data);
    } catch (error) {
      console.error('Error al actualizar dashboard:', error);
    }
  };

  // Ejecución de informe ejecutivo con pasos secuenciales animados (Fase 8)
  const handleGenerateReport = () => {
    setGeneratingReport(true);
    setReportStep(0);
    setReportMarkdown(null);
  };

  // Simular los pasos del informe antes de pedirlo al backend
  useEffect(() => {
    if (generatingReport && reportStep < reportLogs.length) {
      const timer = setTimeout(() => {
        setReportStep((prev) => prev + 1);
      }, 400);
      return () => clearTimeout(timer);
    } else if (generatingReport && reportStep === reportLogs.length) {
      setReportStep((prev) => prev + 1);
      const fetchReport = async () => {
        try {
          const response = await api.post('/ai/report');
          setReportMarkdown(response.data.report);
        } catch (error) {
          console.error('Error al generar informe ejecutivo:', error);
          alert('No se pudo generar el informe en este momento.');
        } finally {
          setGeneratingReport(false);
        }
      };
      fetchReport();
    }
  }, [generatingReport, reportStep]);

  const handleCopyReport = () => {
    if (!reportMarkdown) return;
    navigator.clipboard.writeText(reportMarkdown);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleDownloadReport = async () => {
    if (!reportMarkdown) return;
    try {
      const response = await api.post('/ai/report/pdf', {
        markdown: reportMarkdown
      }, {
        responseType: 'blob'
      });
      
      const file = new Blob([response.data], { type: 'application/pdf' });
      const fileURL = URL.createObjectURL(file);
      
      const link = document.createElement('a');
      link.href = fileURL;
      link.download = `Informe_Ejecutivo_CapatazAI_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(fileURL);
    } catch (error) {
      console.error('Error al descargar el PDF:', error);
      alert('No se pudo generar el archivo PDF del informe en este momento.');
    }
  };

  // Carga de archivo para OCR
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setMessages(prev => [...prev, { role: 'user', content: `Escaneando documento OCR: ${file.name}...`, isSystem: true }]);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/documents/ocr/invoice', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const { data } = response.data;
      
      const newMessages = [
        {
          role: 'bot',
          type: 'ocr_result',
          content: `Extracción OCR completada para **${data.vendor_name}**.`,
          data: data
        }
      ];
      
      if (canManageExpenses) {
        newMessages.push({ 
          role: 'bot', 
          type: 'ocr_action',
          content: '¿Confirmar registro del gasto en la contabilidad?',
          ocrData: data
        });
      }

      setMessages(prev => [...prev, ...newMessages]);
      refreshDashboardSilent();
    } catch (error) {
      console.error('Error en OCR:', error);
      setMessages(prev => [...prev, { 
        role: 'bot', 
        content: 'Error al escanear. Verifique que el documento esté bien iluminado y legible.' 
      }]);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleStartRegister = (ocrData) => {
    setExpenseForm({
      project_id: projects[0]?.id || '',
      category: ocrData.category === 'mano_de_obra' || ocrData.category === 'materiales' || ocrData.category === 'servicios' || ocrData.category === 'otros' 
        ? ocrData.category 
        : 'materiales',
      description: ocrData.description || `Gasto OCR: Factura de ${ocrData.vendor_name}`,
      amount: ocrData.total_amount || ocrData.net_amount || 0,
      expense_date: ocrData.date || new Date().toISOString().split('T')[0]
    });
    setFormError('');
    setPendingExpense(ocrData);
  };

  const handleRegisterExpense = async (e) => {
    e.preventDefault();
    if (!expenseForm.project_id) {
      setFormError('Debe asociar el gasto a una obra.');
      return;
    }
    setRegisteringLoading(true);

    try {
      const payload = {
        project_id: parseInt(expenseForm.project_id),
        category: expenseForm.category,
        description: expenseForm.description,
        amount: parseFloat(expenseForm.amount),
        expense_date: expenseForm.expense_date ? new Date(expenseForm.expense_date).toISOString() : new Date().toISOString()
      };

      await api.post('/finance/expenses', payload);

      const projName = projects.find(p => p.id === parseInt(expenseForm.project_id))?.name || 'Obra';
      
      setMessages(prev => [...prev, {
        role: 'bot',
        content: `✅ Gasto contable guardado por $${Number(expenseForm.amount).toLocaleString('es-CL')} en la obra **${projName}**.`
      }]);

      setPendingExpense(null);
      refreshDashboardSilent();
    } catch (error) {
      setFormError('Fallo al sincronizar registro con la base de datos.');
    } finally {
      setRegisteringLoading(false);
    }
  };

  const handleExecuteAction = (actionQuery) => {
    handleSend(actionQuery);
  };

  // Parser para negrita y otros marcadores inline en la interfaz del ERP
  const parseInlineFormatting = (text) => {
    if (typeof text !== 'string') return text;
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-bold text-white">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  // Parser inteligente para transformar respuestas en tarjetas visuales ejecutivas
  const renderBotResponse = (content) => {
    const lines = content.split('\n');
    const renderedBlocks = [];
    let currentParagraphs = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      if (line.startsWith('### ') || line.startsWith('## ') || (line.startsWith('**') && line.endsWith('**'))) {
        if (currentParagraphs.length > 0) {
          renderedBlocks.push(<p className="text-sm text-slate-300 leading-relaxed mb-2" key={`p-${i}`}>{parseInlineFormatting(currentParagraphs.join(' '))}</p>);
          currentParagraphs = [];
        }
        const title = line.replace(/### |## |\*\*/g, '');
        renderedBlocks.push(
          <h4 className="text-white font-bold text-sm uppercase tracking-wider mt-3 mb-1.5 border-l-2 border-amber-500 pl-2" key={`h-${i}`}>
            {parseInlineFormatting(title)}
          </h4>
        );
      } else if (line.startsWith('• ') || line.startsWith('- ') || line.startsWith('* ')) {
        if (currentParagraphs.length > 0) {
          renderedBlocks.push(<p className="text-sm text-slate-300 leading-relaxed mb-2" key={`p-${i}`}>{parseInlineFormatting(currentParagraphs.join(' '))}</p>);
          currentParagraphs = [];
        }
        
        const itemText = line.substring(2);
        const emojiMatch = itemText.match(/^([\uD800-\uDBFF][\uDC00-\uDFFF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDE00-\uDE4F]|\uD83D[\uDE80-\uDEFC]|\uD83E[\uDD00-\uDDFF]|\u2600-\u27BF])/);
        let icon = "📋";
        let textWithoutEmoji = itemText;
        if (emojiMatch) {
          icon = emojiMatch[0];
          textWithoutEmoji = itemText.replace(icon, '').trim();
        }
        
        renderedBlocks.push(
          <div className="executive-item-card flex items-start gap-2 bg-slate-950/40 border border-white/5 p-2 rounded-lg mb-1.5 hover:border-amber-500/20 transition-all duration-200" key={`item-${i}`}>
            <span className="text-xs mt-0.5">{icon}</span>
            <div className="text-xs text-slate-200 leading-relaxed">{parseInlineFormatting(textWithoutEmoji)}</div>
          </div>
        );
      } else {
        currentParagraphs.push(line);
      }
    }
    
    if (currentParagraphs.length > 0) {
      renderedBlocks.push(<p className="text-sm text-slate-300 leading-relaxed" key={`p-end`}>{parseInlineFormatting(currentParagraphs.join(' '))}</p>);
    }
    
    return (
      <div className="executive-response-card space-y-1">
        {renderedBlocks.length > 0 ? renderedBlocks : <p className="text-sm text-slate-300">{parseInlineFormatting(content)}</p>}
      </div>
    );
  };

  // Atajos rápidos con "Generar Informe Ejecutivo" incorporado (Fase 6)
  const quickActions = [
    { label: 'Consultar Trabajadores', query: 'Muéstrame la lista de trabajadores activos y sus cargos.' },
    { label: 'Contratos', query: '¿Qué contratos laborales están próximos a vencer y qué recomiendas?' },
    { label: 'Vacaciones', query: '¿Hay solicitudes de vacaciones pendientes en el sistema?' },
    { label: 'Proyectos', query: '¿Cuál es el estado actual de los proyectos y sus presupuestos?' },
    { label: 'Dotación', query: 'Obtén las estadísticas de dotación e irregularidades de personal.' },
    { label: 'Alertas', query: 'Muéstrame las alertas y notificaciones pendientes de lectura.' },
    { label: 'OCR', query: 'Analiza las facturas y boletas pendientes de validación OCR.' },
    { label: 'Generar Informe Ejecutivo', action: 'report' },
  ];

  // Pantalla de carga animada secuencial (Checklist de entrada)
  if (!startupComplete) {
    return (
      <div className="startup-terminal-container">
        <div className="terminal-card">
          <div className="terminal-header">
            <div className="terminal-dot red"></div>
            <div className="terminal-dot yellow"></div>
            <div className="terminal-dot green"></div>
            <span className="terminal-title">ConstructERP AI - System Core Initialization</span>
          </div>
          <div className="terminal-body font-mono">
            {startupLogs.slice(0, startupStep + 1).map((log, idx) => (
              <div 
                key={idx} 
                className={`terminal-line ${log.startsWith('✔') ? 'text-emerald-400' : log.includes('completado') ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`}
              >
                {idx === startupStep && idx < startupLogs.length - 1 ? (
                  <>
                    <span className="terminal-prompt">&gt;</span> {log}
                    <span className="terminal-cursor">|</span>
                  </>
                ) : (
                  <>
                    <span className="terminal-prompt">&gt;</span> {log}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="capataz-container flex flex-col lg:flex-row">
      {/* SECCIÓN PRINCIPAL DE CHAT */}
      <main className="chat-workspace flex-1 flex flex-col overflow-hidden">
        
        {/* Listado Deslizable de Conversaciones de Chat */}
        <div className="capataz-messages flex-1 overflow-y-auto">
          {messages.map((msg, idx) => (
            <div 
              key={idx} 
              className={`capataz-msg msg-${msg.role} ${msg.type === 'ocr_result' || msg.type === 'ocr_action' ? 'ocr-msg' : ''}`}
            >
              {msg.role === 'bot' ? (
                renderBotResponse(msg.content)
              ) : (
                <p className="text-sm text-white leading-relaxed">{msg.content}</p>
              )}

              {msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className="tool-use-indicator flex items-center gap-1.5 mt-3 pt-2 border-t border-white/5 text-[9px] text-slate-500">
                  <ShieldCheck size={10} className="text-blue-400" />
                  <span>Llamadas API: {msg.toolCalls.map(t => t.tool).join(', ')}</span>
                </div>
              )}
              
              {msg.type === 'ocr_result' && (
                <div className="ocr-data-card mt-3">
                  <div className="ocr-grid">
                    <div className="ocr-item"><span>Proveedor:</span> {msg.data.vendor_name || 'N/A'}</div>
                    <div className="ocr-item"><span>RUT:</span> {msg.data.rut || 'N/A'}</div>
                    <div className="ocr-item"><span>Fecha:</span> {msg.data.date || 'N/A'}</div>
                    <div className="ocr-item"><span>Total:</span> ${Number(msg.data.total_amount).toLocaleString('es-CL')}</div>
                  </div>
                  <div className="ocr-category">
                    <FileText size={12} /> {msg.data.category}
                  </div>
                </div>
              )}

              {msg.type === 'ocr_action' && (
                <div className="flex gap-2.5 mt-3">
                  <button 
                    onClick={() => handleStartRegister(msg.ocrData)}
                    className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-white rounded-lg text-[10px] font-bold transition-all shadow-md flex items-center gap-1 uppercase tracking-wider"
                  >
                    <Save size={12} />
                    Registrar Gasto
                  </button>
                  <button 
                    onClick={() => {
                      setMessages(prev => [...prev, { role: 'bot', content: 'Gasto descartado. ¿En qué más le asisto, señor?' }]);
                    }}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg text-[10px] font-bold transition-all border border-white/5 uppercase tracking-wider"
                  >
                    Descartar
                  </button>
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="capataz-msg msg-bot flex justify-start">
              <div className="typing-indicator">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          )}
          
          {isUploading && (
            <div className="capataz-msg msg-bot">
               <div className="upload-loader text-amber-500 flex items-center gap-2">
                  <Loader2 className="animate-spin" size={16} />
                  <span className="text-[11px] font-bold font-mono">EJECUTANDO ESCANEO OCR...</span>
               </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Barra de Atajos Rápidos (Pills Horizontales) */}
        <div className="quick-actions-bar flex-shrink-0 px-4 py-2 border-t border-white/5 bg-slate-950/20 flex gap-2 overflow-x-auto scrollbar-none select-none">
          {quickActions.map((action, idx) => (
            <button 
              key={idx}
              onClick={() => action.action === 'report' ? handleGenerateReport() : handleSend(action.query)}
              disabled={isTyping || isUploading}
              className="btn-quick-shortcut-pill"
            >
              {action.label}
            </button>
          ))}
        </div>

        {/* Consola de Entrada del Chat */}
        <footer className="capataz-input-area flex-shrink-0">
          <div className="capataz-input-wrapper">
            <button 
              className="attachment-btn" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              title="Escanear Factura (OCR)"
            >
              <Paperclip size={18} />
            </button>
            <input 
              type="file" 
              hidden 
              ref={fileInputRef} 
              onChange={handleFileUpload}
              accept="image/*,.pdf,.doc,.docx"
            />
            <input 
              type="text" 
              className="capataz-input"
              placeholder="Escribe tu consulta y el Agente buscará y analizará el ERP..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              disabled={isTyping || isUploading}
            />
            <button 
              className="capataz-send-btn" 
              onClick={() => handleSend()}
              disabled={!inputValue.trim() || isTyping || isUploading}
              title="Enviar consulta"
            >
              <Send size={18} />
            </button>
          </div>
        </footer>

      </main>

      {/* PANEL DERECHO: CENTRO DE REPORTES & BI */}
      <aside className="reports-bi-panel w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-white/10 bg-slate-950/40 p-5 flex flex-col overflow-y-auto shrink-0 select-none">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/5">
          <BarChart2 className="text-amber-500" size={18} />
          <h3 className="text-sm font-black text-white uppercase tracking-wider">Centro de Reportes & BI</h3>
        </div>
        <p className="text-[11px] text-slate-400 mb-4 leading-relaxed">
          Descarga listados de datos consolidados en Excel o PDF, o solicita análisis directo a Capataz AI.
        </p>
        
        <div className="space-y-4">
          {biReports.map((report) => (
            <div key={report.id} className="bg-slate-900/60 border border-white/5 rounded-xl p-3 hover:border-amber-500/20 transition-all flex flex-col gap-2.5">
              <div>
                <h4 className="text-xs font-bold text-white mb-0.5">{report.title}</h4>
                <p className="text-[10px] text-slate-500">{report.desc}</p>
              </div>
              
              <div className="flex items-center gap-2 mt-1">
                <button
                  onClick={() => handleExportBI(report.id, 'excel')}
                  disabled={exportingReportId !== null}
                  className="flex-1 py-1.5 bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-600 hover:text-white transition-all text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 shadow-sm"
                >
                  {exportingReportId === `${report.id}_excel` ? (
                    <Loader2 className="animate-spin" size={10} />
                  ) : (
                    <FileSpreadsheet size={10} />
                  )}
                  Excel
                </button>
                
                <button
                  onClick={() => handleExportBI(report.id, 'pdf')}
                  disabled={exportingReportId !== null}
                  className="flex-1 py-1.5 bg-red-600/10 border border-red-500/20 text-red-500 rounded-lg hover:bg-red-600 hover:text-white transition-all text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 shadow-sm"
                >
                  {exportingReportId === `${report.id}_pdf` ? (
                    <Loader2 className="animate-spin" size={10} />
                  ) : (
                    <FileText size={10} />
                  )}
                  PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* MODAL: Visualización del Informe Ejecutivo */}
      {reportMarkdown && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="glass-card w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl relative p-6 border border-white/10 overflow-hidden bg-slate-950/95 rounded-2xl">
            <button 
              onClick={() => { setReportMarkdown(null); setGeneratingReport(false); }}
              className="absolute right-4 top-4 text-slate-400 hover:text-white transition-colors p-1 hover:bg-white/5 rounded-full"
            >
              <X size={24} />
            </button>

            <h2 className="text-2xl font-bold mb-4 text-white flex items-center gap-2 border-b border-white/5 pb-4">
              <FileText className="text-amber-500 animate-pulse" />
              <span>Informe Ejecutivo de Gestión Gerencial</span>
            </h2>

            <div className="flex-1 overflow-y-auto pr-2 space-y-4 font-sans text-sm text-slate-300 leading-relaxed scrollbar-thin">
              {reportMarkdown.split('\n').map((line, idx) => {
                const cleanLine = line.trim();
                if (!cleanLine) return <div key={idx} className="h-2" />;
                if (cleanLine.startsWith('# ')) {
                  return <h1 key={idx} className="text-2xl font-extrabold text-white mt-6 mb-3 tracking-tight">{parseInlineFormatting(cleanLine.substring(2))}</h1>;
                }
                if (cleanLine.startsWith('## ')) {
                  return <h2 key={idx} className="text-xl font-bold text-white mt-5 mb-2 border-b border-white/5 pb-1">{parseInlineFormatting(cleanLine.substring(3))}</h2>;
                }
                if (cleanLine.startsWith('### ')) {
                  return <h3 key={idx} className="text-lg font-semibold text-white mt-4 mb-2">{parseInlineFormatting(cleanLine.substring(4))}</h3>;
                }
                if (cleanLine.startsWith('**') && cleanLine.endsWith('**')) {
                  return <h4 key={idx} className="font-bold text-white mt-3 mb-1">{parseInlineFormatting(cleanLine.slice(2, -2))}</h4>;
                }
                if (cleanLine.startsWith('• ') || cleanLine.startsWith('- ') || cleanLine.startsWith('* ')) {
                  return <li key={idx} className="ml-6 list-disc my-1.5 text-slate-300">{parseInlineFormatting(cleanLine.substring(2))}</li>;
                }
                return <p key={idx} className="my-2 text-slate-300">{parseInlineFormatting(line)}</p>;
              })}
            </div>

            <div className="flex justify-between items-center mt-6 pt-4 border-t border-white/5">
              <div className="text-xs text-slate-500">
                Generado con datos reales · Vía OpenRouter
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleCopyReport}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all flex items-center gap-2 border border-white/10"
                >
                  <Copy size={14} />
                  <span>{copySuccess ? '¡Copiado!' : 'Copiar Texto'}</span>
                </button>
                <button
                  onClick={handleDownloadReport}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-md"
                >
                  <Download size={14} />
                  <span>Descargar (.pdf)</span>
                </button>
                <button
                  onClick={() => { setReportMarkdown(null); setGeneratingReport(false); }}
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs transition-all"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Cargando Informe Ejecutivo */}
      {generatingReport && !reportMarkdown && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-card text-left p-8 w-full max-w-md flex flex-col gap-4 bg-slate-950 border border-white/10 rounded-2xl font-mono text-xs">
            <div className="flex items-center gap-2 text-amber-500 font-bold mb-2">
              <Loader2 className="animate-spin" size={16} />
              <span>COMPILANDO INFORME ESTRATÉGICO...</span>
            </div>
            <div className="space-y-1.5 text-slate-400">
              {reportLogs.slice(0, reportStep + 1).map((log, idx) => (
                <div 
                  key={idx} 
                  className={idx < reportStep ? "text-emerald-400" : "text-amber-400 animate-pulse"}
                >
                  {idx < reportStep ? "✔" : "&gt;"} {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* OCR expense registration modal */}
      {pendingExpense && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="glass-card w-full max-w-lg shadow-2xl relative p-6 bg-slate-950 border border-white/10 rounded-2xl">
            <button 
              onClick={() => setPendingExpense(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>

            <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2 border-b border-white/5 pb-4">
              <Zap className="text-amber-400" />
              Registrar Gasto de Obra
            </h2>

            <form onSubmit={handleRegisterExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Seleccionar Obra (Proyecto)</label>
                <select
                  value={expenseForm.project_id}
                  onChange={(e) => setExpenseForm({...expenseForm, project_id: e.target.value})}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-amber-500 transition-all cursor-pointer text-sm"
                  required
                >
                  <option value="">Seleccionar obra...</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Monto ($)</label>
                  <input
                    type="number"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})}
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-amber-500 outline-none transition-all text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Categoría</label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({...expenseForm, category: e.target.value})}
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-amber-500 transition-all cursor-pointer text-sm"
                  >
                    <option value="materiales">Materiales</option>
                    <option value="mano_de_obra">Mano de Obra</option>
                    <option value="servicios">Servicios</option>
                    <option value="otros">Otros</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Fecha Gasto</label>
                <input
                  type="date"
                  value={expenseForm.expense_date}
                  onChange={(e) => setExpenseForm({...expenseForm, expense_date: e.target.value})}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-amber-500 outline-none transition-all text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Descripción</label>
                <textarea
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})}
                  rows="3"
                  className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-amber-500 outline-none transition-all resize-none text-sm"
                  required
                />
              </div>

              {formError && (
                <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg flex items-center space-x-2 text-red-400 text-sm">
                  <AlertCircle size={18} />
                  <span>{formError}</span>
                </div>
              )}

              <div className="flex justify-end space-x-4 mt-6 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setPendingExpense(null)}
                  className="px-5 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={registeringLoading}
                  className="px-6 py-2 bg-amber-500 hover:bg-amber-400 text-white rounded-lg font-bold flex items-center gap-2 text-sm"
                >
                  {registeringLoading ? 'Registrando...' : <><Save size={16} /><span>Registrar Gasto</span></>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Capataz;
