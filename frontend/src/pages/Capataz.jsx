import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import { Send, Sparkles, ShieldCheck, Zap, Paperclip, FileText, Loader2, AlertCircle, X, Save } from 'lucide-react';
import './Capataz.css';

const Capataz = () => {
  const [messages, setMessages] = useState([
    { 
      role: 'bot', 
      content: '¡Sistemas en línea! Soy el Capataz AI de Serconind. Estoy aquí para supervisar tus datos y ayudarte con la gestión de trabajadores, proyectos y logística. ¿Qué reporte necesitas revisar ahora, jefe?' 
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Estados para Registro de Gasto desde OCR
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
  
  const userRole = localStorage.getItem('userRole');
  const canManageExpenses = ['ADMIN', 'PROJECT_MANAGER', 'INVENTORY_MANAGER'].includes(userRole);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Cargar proyectos para el selector
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await api.get('/projects/');
        setProjects(response.data);
      } catch (error) {
        console.error('Error fetching projects in Capataz:', error);
      }
    };
    fetchProjects();
  }, []);

  const handleSend = async (customMessage = null) => {
    const textToSend = customMessage || inputValue;
    if (!textToSend.trim() || isTyping) return;

    const userMessage = { role: 'user', content: textToSend };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      const response = await api.post('/ai/chat', {
        messages: [...messages, userMessage].map(m => ({
          role: m.role === 'bot' ? 'assistant' : 'user',
          content: m.content
        })),
        bot_id: 'erp_assistant'
      });

      setMessages(prev => [...prev, { role: 'bot', content: response.data.response }]);
    } catch (error) {
      console.error('Error en Capataz AI:', error);
      setMessages(prev => [...prev, { role: 'bot', content: 'Protocolo de comunicación interrumpido. Por favor, verifica la conexión con la red central.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setMessages(prev => [...prev, { role: 'user', content: `Analizando documento: ${file.name}...`, isSystem: true }]);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/documents/ocr/invoice', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const { data } = response.data;
      
      const botResponse = {
        role: 'bot',
        type: 'ocr_result',
        content: `He procesado la factura de **${data.vendor_name}**. Aquí tienes los datos extraídos:`,
        data: data
      };

      setMessages(prev => [...prev, botResponse]);
      
      if (canManageExpenses) {
        // Ofrecer acción con tipo interactivo ocr_action
        setMessages(prev => [...prev, { 
          role: 'bot', 
          type: 'ocr_action',
          content: '¿Deseas registrar esta factura como un gasto en el sistema?',
          ocrData: data
        }]);
      } else {
        setMessages(prev => [...prev, { 
          role: 'bot', 
          content: 'Dado que posees un rol de visualización (Gerente), no tienes permisos para registrar gastos en el sistema, pero puedes ver el análisis de arriba.'
        }]);
      }

    } catch (error) {
      console.error('Error en OCR:', error);
      setMessages(prev => [...prev, { 
        role: 'bot', 
        content: 'No pude leer el documento correctamente. Asegúrate de que sea una imagen clara de la factura.' 
      }]);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Abrir Modal de registro
  const handleStartRegister = (ocrData) => {
    setExpenseForm({
      project_id: projects[0]?.id || '',
      category: ocrData.category === 'mano_de_obra' || ocrData.category === 'materiales' || ocrData.category === 'servicios' || ocrData.category === 'otros' 
        ? ocrData.category 
        : 'materiales',
      description: ocrData.description || `Factura de ${ocrData.vendor_name}`,
      amount: ocrData.total_amount || ocrData.net_amount || 0,
      expense_date: ocrData.date || new Date().toISOString().split('T')[0]
    });
    setFormError('');
    setPendingExpense(ocrData);
  };

  // Confirmar registro de gasto
  const handleRegisterExpense = async (e) => {
    e.preventDefault();
    if (!expenseForm.project_id) {
      setFormError('Por favor selecciona una obra/proyecto.');
      return;
    }
    if (expenseForm.amount <= 0) {
      setFormError('El monto del gasto debe ser mayor a 0.');
      return;
    }

    setRegisteringLoading(true);
    setFormError('');

    try {
      const payload = {
        project_id: parseInt(expenseForm.project_id),
        category: expenseForm.category,
        description: expenseForm.description,
        amount: parseFloat(expenseForm.amount),
        expense_date: expenseForm.expense_date ? new Date(expenseForm.expense_date).toISOString() : new Date().toISOString()
      };

      await api.post('/finance/expenses', payload);

      // Notificar éxito en el chat
      const selectedProjectName = projects.find(p => p.id === parseInt(expenseForm.project_id))?.name || 'Obra';
      
      setMessages(prev => [...prev, {
        role: 'bot',
        content: `✅ ¡Listo, jefe! He registrado exitosamente el gasto de $${Number(expenseForm.amount).toLocaleString('es-CL')} en la obra **${selectedProjectName}** bajo la categoría de **${expenseForm.category.replace('_', ' ')}**.`
      }]);

      setPendingExpense(null);
    } catch (error) {
      console.error('Error registering expense:', error);
      setFormError(error.response?.data?.detail || 'Error al conectar con la base de datos central.');
    } finally {
      setRegisteringLoading(false);
    }
  };

  const analyzeFinancials = async () => {
    setIsTyping(true);
    setMessages(prev => [...prev, { role: 'user', content: 'Genera un análisis financiero de los proyectos actuales.' }]);
    
    try {
      const response = await api.post('/ai/chat', {
        messages: [{ role: 'user', content: 'Analiza la situación financiera actual de la empresa y los proyectos basándote en los datos del ERP.' }],
        bot_id: 'erp_assistant' // El backend lo derivará a DataFetcher
      });

      setMessages(prev => [...prev, { role: 'bot', content: response.data.response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'bot', content: 'Error al generar el reporte financiero.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="capataz-container">
      {/* Tech Header */}
      <header className="capataz-header">
        <div className="capataz-avatar-wrapper">
          <img src="/images/bot3.png" alt="Capataz Avatar" />
        </div>
        <div className="capataz-title-area">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h1>Capataz AI</h1>
            <Zap size={18} color="#f59e0b" fill="#f59e0b" />
          </div>
          <div className="capataz-status">
            <div className="status-dot"></div>
            <span>Inteligencia Operacional Activa</span>
          </div>
        </div>
        <div className="capataz-actions">
           <button onClick={analyzeFinancials} className="tech-action-btn">
             <Sparkles size={16} />
             <span>Análisis de Red</span>
           </button>
        </div>
      </header>

      {/* Chat Space */}
      <div className="capataz-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`capataz-msg msg-${msg.role} ${msg.type === 'ocr_result' || msg.type === 'ocr_action' ? 'ocr-msg' : ''}`}>
             {msg.content}
            
            {msg.type === 'ocr_result' && (
              <div className="ocr-data-card">
                <div className="ocr-grid">
                  <div className="ocr-item"><span>Proveedor:</span> {msg.data.vendor_name || 'N/A'}</div>
                  <div className="ocr-item"><span>RUT:</span> {msg.data.rut || 'N/A'}</div>
                  <div className="ocr-item"><span>Fecha:</span> {msg.data.date || 'N/A'}</div>
                  <div className="ocr-item"><span>Total:</span> ${Number(msg.data.total_amount).toLocaleString('es-CL')}</div>
                </div>
                <div className="ocr-category">
                  <FileText size={14} /> {msg.data.category}
                </div>
              </div>
            )}

            {msg.type === 'ocr_action' && (
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
                <button 
                  onClick={() => handleStartRegister(msg.ocrData)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-white rounded-lg text-xs font-bold transition-all shadow-md"
                >
                  Registrar Gasto
                </button>
                <button 
                  onClick={() => {
                    setMessages(prev => [...prev, { role: 'bot', content: 'Gasto descartado. ¿En qué más puedo ayudarte?' }]);
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg text-xs font-bold transition-all border border-white/5"
                >
                  Descartar
                </button>
              </div>
            )}
          </div>
        ))}
        {isTyping && (
          <div className="capataz-msg msg-bot">
            <div className="typing-indicator">
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
            </div>
          </div>
        )}
        {isUploading && (
          <div className="capataz-msg msg-bot">
             <div className="upload-loader">
                <Loader2 className="animate-spin" size={20} />
                <span>Escaneando Redes de Datos...</span>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Tech Input */}
      <footer className="capataz-input-area">
        <div className="capataz-input-wrapper">
          <button 
            className="attachment-btn" 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Paperclip size={20} />
          </button>
          <input 
            type="file" 
            hidden 
            ref={fileInputRef} 
            onChange={handleFileUpload}
            accept="image/*"
          />
          <input 
            type="text" 
            className="capataz-input"
            placeholder="Comandos de voz o texto para el Capataz..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            disabled={isTyping || isUploading}
          />
        </div>
        <button 
          className="capataz-send-btn" 
          onClick={() => handleSend()}
          disabled={!inputValue.trim() || isTyping || isUploading}
        >
          <Send size={24} />
        </button>
      </footer>

      {/* OCR expense registration modal */}
      {pendingExpense && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card w-full max-w-lg shadow-2xl relative p-6">
            <button 
              onClick={() => setPendingExpense(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>

            <h2 className="text-2xl font-bold mb-6 gradient-text flex items-center gap-2">
              <Zap className="text-amber-400" />
              Registrar Gasto de Obra
            </h2>

            <form onSubmit={handleRegisterExpense} className="space-y-4">
              {/* Obra */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Seleccionar Obra (Proyecto)</label>
                <select
                  value={expenseForm.project_id}
                  onChange={(e) => setExpenseForm({...expenseForm, project_id: e.target.value})}
                  className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                  required
                >
                  <option value="">Seleccionar obra...</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Monto */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Monto ($)</label>
                  <input
                    type="number"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})}
                    className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    required
                  />
                </div>

                {/* Categoria */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Categoría</label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({...expenseForm, category: e.target.value})}
                    className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                  >
                    <option value="materiales">Materiales</option>
                    <option value="mano_de_obra">Mano de Obra</option>
                    <option value="servicios">Servicios</option>
                    <option value="otros">Otros</option>
                  </select>
                </div>
              </div>

              {/* Fecha */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Fecha Gasto</label>
                <input
                  type="date"
                  value={expenseForm.expense_date}
                  onChange={(e) => setExpenseForm({...expenseForm, expense_date: e.target.value})}
                  className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  required
                />
              </div>

              {/* Descripcion */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Descripción</label>
                <textarea
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})}
                  rows="3"
                  className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
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
                  className="px-5 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={registeringLoading}
                  className="btn-primary flex items-center space-x-2 px-6"
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
