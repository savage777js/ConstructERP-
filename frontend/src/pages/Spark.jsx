import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import { Send, Sparkles, ShieldCheck, Zap } from 'lucide-react';
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
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isTyping) return;

    const userMessage = { role: 'user', content: inputValue };
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
            <span>Supervisor de Datos Activo</span>
          </div>
        </div>
      </header>

      {/* Chat Space */}
      <div className="spark-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`spark-msg msg-${msg.role}`}>
            {msg.content}
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
        <div ref={messagesEndRef} />
      </div>

      {/* Tech Input */}
      <footer className="spark-input-area">
        <div className="spark-input-wrapper">
          <input 
            type="text" 
            className="spark-input"
            placeholder="Introduce una instrucción para el Capataz..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            disabled={isTyping}
          />
        </div>
        <button 
          className="spark-send-btn" 
          onClick={handleSend}
          disabled={!inputValue.trim() || isTyping}
        >
          <Send size={24} />
        </button>
      </footer>
    </div>
  );
};

export default Spark;
