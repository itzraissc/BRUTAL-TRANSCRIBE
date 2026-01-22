
import React, { useState, useEffect, useRef } from 'react';
import { Layout } from './components/Layout';
import { FilePicker } from './components/FilePicker';
import { ResultDisplay } from './components/ResultDisplay';
import { StatusIndicator } from './components/StatusIndicator';
import { transcribeFile, transcribeUrl } from './services/gemini';
import { QueueItem, TranscriptionResult } from './types';
import { AlertTriangle, Info, Trash2, CheckCircle2, Loader2, ChevronDown, ChevronUp, FileAudio, Link as LinkIcon, Plus, Zap } from 'lucide-react';

const CONCURRENCY_LIMIT = 3;

const App: React.FC = () => {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [urlInput, setUrlInput] = useState('');
  // Rastreamos quantos itens estão sendo processados no momento
  const [activeCount, setActiveCount] = useState(0);

  // --- AUDIO HELPERS ---

  const bufferToWav = (buffer: AudioBuffer): Blob => {
    const length = buffer.length * 2;
    const view = new DataView(new ArrayBuffer(44 + length));
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
    };
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, 16000, true);
    view.setUint32(28, 16000 * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length, true);
    const channelData = buffer.getChannelData(0);
    let offset = 44;
    for (let i = 0; i < channelData.length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
    return new Blob([view], { type: 'audio/wav' });
  };

  const processAudio = async (file: File): Promise<Blob[]> => {
    // Suporte reforçado para WebM e outros formatos
    const isNative = file.type.includes('webm') || file.type.startsWith('audio/') || file.name.match(/\.(mp3|wav|m4a|aac|ogg|flac|webm)$/i);
    
    // Se for um arquivo pequeno e nativo, enviamos direto
    if (isNative && file.size < 0.5 * 1024 * 1024) return [file];
    
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const arrayBuffer = await file.arrayBuffer();
    
    try {
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        const CHUNK_DURATION = 25; 
        const chunks: Blob[] = [];
        const TARGET_RATE = 16000; 
        
        for (let start = 0; start < audioBuffer.duration; start += CHUNK_DURATION) {
            const end = Math.min(start + CHUNK_DURATION, audioBuffer.duration);
            const duration = end - start;
            const offlineCtx = new OfflineAudioContext(1, Math.ceil(duration * TARGET_RATE), TARGET_RATE);
            const source = offlineCtx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(offlineCtx.destination);
            source.start(0, start, duration);
            const renderedBuffer = await offlineCtx.startRendering();
            chunks.push(bufferToWav(renderedBuffer));
        }
        return chunks;
    } catch (e) {
        console.error("Falha ao decodificar áudio. O formato pode não ser suportado pelo navegador.", e);
        throw new Error("Formato de áudio/vídeo incompatível para processamento local.");
    }
  };

  const internalTranscribeFile = async (file: File, id: string): Promise<TranscriptionResult> => {
    updateItem(id, { status: 'optimizing', progressMsg: 'Otimizando Áudio...' });
    const chunks = await processAudio(file);
    updateItem(id, { status: 'uploading', progressMsg: `Enviando ${chunks.length} partes...` });
    updateItem(id, { status: 'processing', progressMsg: 'IA Analisando...' });
    return await transcribeFile(chunks, chunks[0].type || 'audio/wav', (msg) => updateItem(id, { progressMsg: msg }));
  };

  // --- QUEUE MANAGEMENT ---

  const handleFilesSelect = (files: File[]) => {
    const newItems: QueueItem[] = files.map(file => ({
      id: Math.random().toString(36).substring(7),
      sourceType: 'file',
      file,
      status: 'idle',
      progressMsg: 'Aguardando vez...',
      result: null,
      error: null,
      createdAt: Date.now(),
      expanded: false
    }));
    setQueue(prev => [...prev, ...newItems]);
  };

  const handleAddLink = () => {
    if (!urlInput.trim()) return;
    const urls = urlInput.split(/[\s,]+/).filter(u => u.startsWith('http'));
    const newItems: QueueItem[] = urls.map(url => ({
      id: Math.random().toString(36).substring(7),
      sourceType: 'url',
      url,
      status: 'idle',
      progressMsg: 'Fila de espera...',
      result: null,
      error: null,
      createdAt: Date.now(),
      expanded: false
    }));
    setQueue(prev => [...prev, ...newItems]);
    setUrlInput('');
  };

  const updateItem = (id: string, updates: Partial<QueueItem>) => {
    setQueue(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const removeFromQueue = (id: string) => {
    setQueue(prev => prev.filter(item => item.id !== id));
  };

  const toggleExpand = (id: string) => {
    setQueue(prev => prev.map(item => item.id === id ? { ...item, expanded: !item.expanded } : item));
  };

  // --- MULTI-PROCESSOR LOOP ---

  useEffect(() => {
    const spawnWorkers = async () => {
      // Se já atingimos o limite de processos ativos, não fazemos nada
      if (activeCount >= CONCURRENCY_LIMIT) return;

      // Encontrar o próximo item que está "idle"
      const nextItem = queue.find(item => item.status === 'idle');
      if (!nextItem) return;

      // Iniciar processamento
      processItem(nextItem);
    };

    spawnWorkers();
  }, [queue, activeCount]);

  const processItem = async (item: QueueItem) => {
    setActiveCount(prev => prev + 1);
    const { id, sourceType, file, url } = item;
    
    // Marcar como 'uploading' inicialmente para sinalizar atividade
    updateItem(id, { status: 'uploading', progressMsg: 'Iniciando...' });

    try {
      if (sourceType === 'file' && file) {
        const result = await internalTranscribeFile(file, id);
        updateItem(id, { status: 'success', result, expanded: true, progressMsg: 'Concluído' });
      } else if (sourceType === 'url' && url) {
        updateItem(id, { status: 'processing', progressMsg: 'Conectando ao link...' });
        const result = await transcribeUrl(
            url, 
            (msg) => updateItem(id, { progressMsg: msg }),
            (downloadedFile) => internalTranscribeFile(downloadedFile, id)
        );
        updateItem(id, { status: 'success', result, expanded: true, progressMsg: 'Concluído' });
      }
    } catch (err: any) {
      updateItem(id, { status: 'error', error: err.message || "Erro de processamento", progressMsg: 'Falha' });
    } finally {
      setActiveCount(prev => Math.max(0, prev - 1));
    }
  };

  return (
    <Layout>
      <div className="space-y-12 pb-20">
        <div className="text-center space-y-6 max-w-2xl mx-auto">
            <h1 className="text-4xl sm:text-6xl font-black italic tracking-tighter leading-none uppercase">
                Brutal <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-600">Transcribe</span>
            </h1>
            <div className="flex flex-col items-center gap-2">
                <p className="text-lg text-zinc-400 font-medium leading-relaxed">
                  Transcrição Literal Multi-Processo de Arquivos e URLs.
                </p>
                {activeCount > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-violet-500/10 border border-violet-500/20 rounded-full">
                        <Zap size={12} className="text-violet-400 animate-pulse" />
                        <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">
                            {activeCount} Processos Ativos
                        </span>
                    </div>
                )}
            </div>
        </div>

        <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
           <div className="flex gap-2 p-2 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl focus-within:border-violet-500/50 transition-all">
                <div className="flex-1 flex items-center px-4 gap-3">
                    <LinkIcon size={18} className="text-zinc-500" />
                    <input 
                        type="text" 
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddLink()}
                        placeholder="Youtube, Webm links ou URLs de áudio..."
                        className="bg-transparent border-none outline-none text-zinc-200 w-full text-sm font-medium placeholder:text-zinc-600"
                    />
                </div>
                <button 
                    onClick={handleAddLink}
                    disabled={!urlInput.trim()}
                    className="p-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:bg-zinc-800 text-white rounded-xl transition-all flex items-center gap-2 font-bold text-xs uppercase tracking-widest"
                >
                    <Plus size={16} /> Enfileirar
                </button>
           </div>

           <div className="flex items-center gap-4">
               <div className="h-px bg-zinc-800 flex-1"></div>
               <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">ou</span>
               <div className="h-px bg-zinc-800 flex-1"></div>
           </div>

           <FilePicker onFileSelect={handleFilesSelect} disabled={false} />
        </div>

        {queue.length > 0 && (
            <div className="max-w-4xl mx-auto space-y-4">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3">
                        <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Fila de Processamento</h3>
                        <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 text-[10px] font-bold rounded-full">
                            {queue.length} ITENS
                        </span>
                    </div>
                    <button onClick={() => setQueue([])} className="text-xs text-red-500 hover:text-red-400 font-medium uppercase tracking-wider">Limpar Lista</button>
                </div>

                <div className="space-y-3">
                    {queue.map((item) => (
                        <div key={item.id} className={`bg-zinc-900 border transition-all duration-300 rounded-xl overflow-hidden ${['optimizing', 'uploading', 'processing'].includes(item.status) ? 'border-violet-500/50 bg-violet-500/[0.02] shadow-[0_0_20px_rgba(124,58,237,0.05)]' : 'border-zinc-800'} ${item.status === 'error' ? 'border-red-900/50 bg-red-950/10' : ''}`}>
                            <div className="p-4 flex items-center gap-4">
                                <div className="shrink-0">
                                    {item.status === 'idle' && (
                                        <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-600">
                                            {item.sourceType === 'file' ? <FileAudio size={16} /> : <LinkIcon size={16} />}
                                        </div>
                                    )}
                                    {['optimizing', 'uploading', 'processing'].includes(item.status) && (
                                        <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                                            <Loader2 size={16} className="text-violet-500 animate-spin" />
                                        </div>
                                    )}
                                    {item.status === 'success' && <CheckCircle2 size={24} className="text-emerald-500" />}
                                    {item.status === 'error' && <AlertTriangle size={24} className="text-red-500" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <h4 className="font-bold text-zinc-200 truncate text-sm">{item.sourceType === 'file' ? item.file?.name : item.url}</h4>
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${item.sourceType === 'file' ? 'bg-zinc-800 text-zinc-500' : 'bg-violet-500/10 text-violet-400'}`}>
                                            {item.sourceType === 'file' ? `${(item.file!.size / 1024 / 1024).toFixed(1)}MB` : 'LINK'}
                                        </span>
                                    </div>
                                    <p className={`text-[10px] uppercase font-bold tracking-wider truncate ${item.status === 'error' ? 'text-red-400' : 'text-zinc-500'}`}>
                                        {item.status === 'error' ? item.error : item.progressMsg}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {item.status === 'success' && <button onClick={() => toggleExpand(item.id)} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white">{item.expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</button>}
                                    {['idle', 'error', 'success'].includes(item.status) && <button onClick={() => removeFromQueue(item.id)} className="p-2 hover:bg-red-500/10 text-zinc-600 hover:text-red-500 rounded-lg"><Trash2 size={16} /></button>}
                                </div>
                            </div>
                            
                            {['optimizing', 'uploading', 'processing'].includes(item.status) && (
                                <div className="px-4 pb-4 pt-1 border-t border-zinc-800/50">
                                    <StatusIndicator status={item.status} progressDetail={item.progressMsg} compact />
                                </div>
                            )}

                            {item.status === 'success' && item.result && item.expanded && (
                                <div className="border-t border-zinc-800 bg-zinc-950/30 p-4 sm:p-6 animate-in slide-in-from-top-2 duration-300">
                                    <ResultDisplay result={item.result} />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        )}

        {queue.length === 0 && (
            <div className="bg-zinc-900/20 border border-zinc-800/50 p-4 rounded-xl flex items-start gap-4 max-w-lg mx-auto">
                <Info size={20} className="text-violet-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-zinc-500 leading-tight">
                    O sistema processa até <strong>3 vídeos simultaneamente</strong> para máxima velocidade. Formatos aceitos: MP3, WAV, WebM, MP4 e links do YouTube.
                </p>
            </div>
        )}
      </div>
    </Layout>
  );
};

export default App;
