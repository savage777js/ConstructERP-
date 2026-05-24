import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import { Send, Sparkles, ShieldCheck, Zap, Paperclip, FileText, Loader2, AlertCircle } from 'lucide-react';
import './Spark.css';

const Spark = () => {
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
      
      // Ofrecer acción
      setMessages(prev => [...prev, { 
        role: 'bot', 
        content: '¿Deseas que registre este gasto automáticamente en el proyecto correspondiente?' 
      }]);

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

  const analyzeFinancials = async () => {
    setIsTyping(true);
    setMessages(prev => [...prev, { role: 'user', content: 'Genera un análisis financiero de los proyectos actuales.' }]);
    
    try {
      const response = await api.post('/ai/chat', {
        messages: [{ role: 'user', content: 'Analiza la situación financiera actual de la empresa y los proyectos basándote en los datos del ERP.' }],
        bot_id: 'erp_assistant' // El backend lo derivará a AIDataFetcher
      });

      setMessages(prev => [...prev, { role: 'bot', content: response.data.response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'bot', content: 'Error al generar el reporte financiero.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="spark-container">
      {/* Tech Header */}
      <header className="spark-header">
        <div className="spark-avatar-wrapper">
          <img src="/images/bot3.png" alt="Capataz Avatar" />
        </div>
        <div className="spark-title-area">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h1>Capataz AI</h1>
            <Zap size={18} color="#f59e0b" fill="#f59e0b" />
          </div>
          <div className="spark-status">
            <div className="status-dot"></div>
            <span>Inteligencia Operacional Activa</span>
          </div>
        </div>
        <div className="spark-actions">
           <button onClick={analyzeFinancials} className="tech-action-btn">
             <Sparkles size={16} />
             <span>Análisis de Red</span>
           </button>
        </div>
      </header>

      {/* Chat Space */}
      <div className="spark-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`spark-msg msg-${msg.role} ${msg.type === 'ocr_result' ? 'ocr-msg' : ''}`}>
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
          </div>
        ))}
        {isTyping && (
          <div className="spark-msg msg-bot">
            <div className="typing-indicator">
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
            </div>
          </div>
        )}
        {isUploading && (
          <div className="spark-msg msg-bot">
             <div className="upload-loader">
                <Loader2 className="animate-spin" size={20} />
                <span>Escaneando Redes de Datos...</span>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Tech Input */}
      <footer className="spark-input-area">
        <div className="spark-input-wrapper">
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
            className="spark-input"
            placeholder="Comandos de voz o texto para el Capataz..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            disabled={isTyping || isUploading}
          />
        </div>
        <button 
          className="spark-send-btn" 
          onClick={() => handleSend()}
          disabled={!inputValue.trim() || isTyping || isUploading}
        >
          <Send size={24} />
        </button>
      </footer>
    </div>
  );
};

export default Spark;
