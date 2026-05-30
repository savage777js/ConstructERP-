import { useState, useEffect } from 'react';
import api from '../api';
import { 
  Folder, FileText, Upload, Trash2, Eye, Cpu, 
  CheckCircle2, User, Loader2, AlertCircle, RefreshCw, Sparkles, Download
} from 'lucide-react';

const Documents = () => {
  const [workers, setWorkers] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loadingWorkers, setLoadingWorkers] = useState(true);
  const [loadingDocs, setLoadingDocs] = useState(false);
  
  // Upload Form
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    category: 'Contrato',
    file: null
  });

  // OCR state
  const [ocrRunning, setOcrRunning] = useState(null); // Doc ID currently scanning
  const [ocrResult, setOcrResult] = useState(null); // Extracted OCR content to display

  useEffect(() => {
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    setLoadingWorkers(true);
    try {
      const response = await api.get('/workers/');
      const activeWorkers = response.data.filter(w => w.status === 'ACTIVE');
      setWorkers(activeWorkers);
      if (activeWorkers.length > 0) {
        setSelectedWorker(activeWorkers[0]);
        fetchWorkerDocuments(activeWorkers[0].id);
      }
    } catch (error) {
      console.error('Error fetching workers:', error);
    } finally {
      setLoadingWorkers(false);
    }
  };

  const fetchWorkerDocuments = async (workerId) => {
    setLoadingDocs(true);
    try {
      const response = await api.get(`/documents/employee/${workerId}`);
      setDocuments(response.data);
    } catch (error) {
      console.error('Error fetching worker documents:', error);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleSelectWorker = (worker) => {
    setSelectedWorker(worker);
    setUploadForm({ title: '', category: 'Contrato', file: null });
    setOcrResult(null);
    fetchWorkerDocuments(worker.id);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadForm(prev => ({
        ...prev,
        file: file,
        title: prev.title || file.name.split('.')[0]
      }));
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedWorker || !uploadForm.file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('employee_id', selectedWorker.id);
      formData.append('category', uploadForm.category);
      formData.append('title', uploadForm.title);
      formData.append('file', uploadForm.file);

      await api.post('/documents/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setUploadForm({ title: '', category: 'Contrato', file: null });
      fetchWorkerDocuments(selectedWorker.id);
      alert('Documento cargado correctamente');
    } catch (error) {
      alert(error.response?.data?.detail || 'Error al cargar el documento');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDoc = async (docId) => {
    if (!confirm('¿Estás seguro de eliminar este documento?')) return;

    try {
      await api.delete(`/documents/${docId}`);
      setDocuments(documents.filter(d => d.id !== docId));
      if (ocrResult?.id === docId) setOcrResult(null);
    } catch (error) {
      alert('Error al eliminar documento');
    }
  };

  const handleRunOCR = async (doc) => {
    setOcrRunning(doc.id);
    setOcrResult(null);
    try {
      const response = await api.post(`/documents/${doc.id}/ocr`);
      setOcrResult({
        id: doc.id,
        title: doc.title,
        raw_text: response.data.data.raw_text,
        structured: response.data.data
      });
      // Refresh documents to update OCR status
      fetchWorkerDocuments(selectedWorker.id);
    } catch (error) {
      alert(error.response?.data?.detail || 'El escaneo OCR falló. Intente con una imagen (JPG/PNG) más nítida.');
    } finally {
      setOcrRunning(null);
    }
  };

  const handleDownloadContract = async () => {
    if (!selectedWorker) return;
    try {
      const response = await api.get(`/workers/${selectedWorker.id}/contract`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `contrato_${selectedWorker.rut || 'empleado'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert('Error al descargar el contrato generado por el sistema.');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto pb-20">
      <header className="mb-10">
        <h1 className="text-4xl font-extrabold text-white flex items-center gap-3">
          <Folder className="text-amber-500" size={36} />
          Carpetas de Personal y Escaneo OCR
        </h1>
        <p className="text-slate-400 mt-2">
          Gestión documental inteligente para el personal de Serconind. Carga de contratos, licencias y escaneo de credenciales.
        </p>
      </header>

      {loadingWorkers ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="animate-spin text-amber-500 mb-4" size={40} />
          <p>Cargando plantilla de trabajadores...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Workers List */}
          <div className="lg:col-span-4 glass-card p-6 h-[650px] flex flex-col">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <User size={18} className="text-amber-400" />
              Trabajadores Activos
            </h2>
            <div className="overflow-y-auto flex-1 space-y-2 pr-2">
              {workers.map(w => (
                <button
                  key={w.id}
                  onClick={() => handleSelectWorker(w)}
                  className={`w-full text-left p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                    selectedWorker?.id === w.id
                      ? 'bg-amber-500/10 border-amber-500/30 text-white font-semibold'
                      : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/[0.08] hover:text-white'
                  }`}
                >
                  <div>
                    <p className="text-sm truncate">{w.first_name} {w.last_name}</p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{w.role}</p>
                  </div>
                  {w.age && (
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md font-mono">
                      {w.age} años
                    </span>
                  )}
                </button>
              ))}
              {workers.length === 0 && (
                <p className="text-slate-500 text-center py-10 italic">No hay trabajadores registrados.</p>
              )}
            </div>
          </div>

          {/* Right Column: Worker Folder Details & Documents */}
          <div className="lg:col-span-8 space-y-8">
            {selectedWorker ? (
              <>
                {/* Worker Profile Header */}
                <div className="glass-card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div>
                    <span className="text-xs font-black uppercase text-amber-500 tracking-wider">Carpeta Digital</span>
                    <h2 className="text-3xl font-extrabold text-white mt-1">
                      {selectedWorker.first_name} {selectedWorker.last_name}
                    </h2>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-2">
                      <span className="bg-slate-800 px-2.5 py-1 rounded-lg">RUT: {selectedWorker.rut || 'No definido'}</span>
                      {selectedWorker.age && <span className="bg-slate-800 px-2.5 py-1 rounded-lg">Edad: {selectedWorker.age} años</span>}
                      <span className="bg-slate-800 px-2.5 py-1 rounded-lg">Cargo: {selectedWorker.role}</span>
                    </div>
                  </div>
                  
                  <button 
                    onClick={handleDownloadContract}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-bold border border-blue-500/20 rounded-xl transition-all text-xs"
                  >
                    <Download size={14} /> Descargar Contrato Sistema
                  </button>
                </div>

                {/* Upload New Document Form */}
                <div className="glass-card p-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Upload size={18} className="text-amber-500" />
                    Cargar Nuevo Documento
                  </h3>
                  <form onSubmit={handleUploadSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase">Nombre/Título</label>
                      <input 
                        type="text"
                        placeholder="Ej: Licencia Conducir Clase B"
                        value={uploadForm.title}
                        onChange={(e) => setUploadForm({...uploadForm, title: e.target.value})}
                        className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-amber-500 transition-all text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase">Categoría</label>
                      <select 
                        value={uploadForm.category}
                        onChange={(e) => setUploadForm({...uploadForm, category: e.target.value})}
                        className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-amber-500 transition-all text-sm cursor-pointer"
                        required
                      >
                        <option value="Contrato">Contrato de Trabajo</option>
                        <option value="Licencia">Licencia de Conducir</option>
                        <option value="Cédula">Cédula de Identidad</option>
                        <option value="Certificado">Certificado de Antecedentes / Afiliación</option>
                        <option value="Otros">Otros Documentos</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <input 
                          type="file"
                          id="file-upload"
                          className="hidden"
                          onChange={handleFileChange}
                          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                          required
                        />
                        <label 
                          htmlFor="file-upload"
                          className="flex items-center justify-center gap-2 w-full bg-slate-800/50 hover:bg-slate-800/80 border border-dashed border-white/15 rounded-xl px-4 py-2.5 text-slate-300 text-sm cursor-pointer transition-all truncate"
                        >
                          {uploadForm.file ? uploadForm.file.name : 'Seleccionar Archivo'}
                        </label>
                      </div>
                      <button
                        type="submit"
                        disabled={uploading}
                        className="btn-primary py-2.5 px-6 font-bold shadow-lg shadow-amber-500/10 text-sm flex items-center justify-center"
                      >
                        {uploading ? <Loader2 size={16} className="animate-spin" /> : 'Subir'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Documents Grid / Folder List */}
                <div className="glass-card p-6">
                  <h3 className="text-lg font-bold text-white mb-6">Archivos Vigentes</h3>
                  
                  {loadingDocs ? (
                    <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
                      <Loader2 className="animate-spin text-amber-500" size={20} />
                      <span>Cargando archivadores...</span>
                    </div>
                  ) : documents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {documents.map(doc => {
                        const isImage = doc.file_path.toLowerCase().match(/\.(jpg|jpeg|png)$/);
                        return (
                          <div key={doc.id} className="border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] p-5 rounded-2xl flex flex-col justify-between transition-all group">
                            <div>
                              <div className="flex justify-between items-start mb-3">
                                <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] font-black uppercase tracking-wider">
                                  {doc.category}
                                </span>
                                <button 
                                  onClick={() => handleDeleteDoc(doc.id)}
                                  className="p-1.5 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-lg transition-all"
                                  title="Eliminar documento"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                              <h4 className="text-md font-bold text-white mb-1 truncate">{doc.title}</h4>
                              <p className="text-slate-500 text-[10px] font-mono">Cargado el: {new Date(doc.created_at).toLocaleDateString('es-CL')}</p>
                            </div>

                            <div className="flex gap-2 mt-5 pt-3 border-t border-white/5">
                              <a 
                                href={api.defaults.baseURL ? `${api.defaults.baseURL.replace('/api/v1', '')}${doc.file_path}` : doc.file_path}
                                target="_blank"
                                rel="noreferrer"
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-all text-xs"
                              >
                                <Eye size={12} /> Ver Original
                              </a>
                              {isImage && (
                                <button 
                                  onClick={() => handleRunOCR(doc)}
                                  disabled={ocrRunning === doc.id}
                                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-bold border border-amber-500/20 transition-all text-xs disabled:opacity-50"
                                >
                                  {ocrRunning === doc.id ? (
                                    <>
                                      <Loader2 size={12} className="animate-spin" /> Escaneando...
                                    </>
                                  ) : (
                                    <>
                                      <Cpu size={12} /> Escaneo OCR
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-16 text-slate-500 bg-white/[0.01] border border-dashed border-white/5 rounded-2xl">
                      <FileText size={40} className="mx-auto mb-3 opacity-10" />
                      <p className="text-sm">La carpeta del trabajador está vacía.</p>
                      <p className="text-xs text-slate-600 mt-1">Cargue un archivo (Contrato, RUT o Licencia) para iniciar.</p>
                    </div>
                  )}
                </div>

                {/* OCR Results Visualizer Panel */}
                {ocrResult && (
                  <div className="glass-card p-6 border-l-4 border-l-amber-500 bg-amber-500/5 animate-in slide-in-from-bottom-4 duration-300">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Sparkles size={18} className="text-amber-400" />
                        Resultados de Lectura Inteligente (OCR): {ocrResult.title}
                      </h3>
                      <button 
                        onClick={() => setOcrResult(null)}
                        className="text-xs text-slate-500 hover:text-white"
                      >
                        Ocultar lectura
                      </button>
                    </div>
                    
                    <div className="bg-slate-950/80 rounded-xl p-4 border border-white/5 max-h-60 overflow-y-auto text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap">
                      {ocrResult.raw_text || JSON.stringify(ocrResult.structured, null, 2)}
                    </div>
                    
                    <div className="mt-3 flex items-center gap-2 text-xs text-amber-500 font-medium">
                      <CheckCircle2 size={14} />
                      <span>Extracción de datos completada mediante Gemma-4. Los campos de la ficha se pueden contrastar arriba.</span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="glass-card p-12 text-center text-slate-500 h-[650px] flex flex-col justify-center items-center">
                <Folder size={64} className="mb-4 opacity-10 text-amber-500" />
                <h3 className="text-xl font-bold text-white mb-2">Ningún Trabajador Seleccionado</h3>
                <p className="text-sm max-w-sm">Selecciona un trabajador en el panel izquierdo para gestionar su expediente digital.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Documents;
