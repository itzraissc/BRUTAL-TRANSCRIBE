

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
  const [activeCount, setActiveCount] = useState(0);

  const processAudio = async (file: File): Promise<Blob[]> => {
    const isNative = file.type.includes('webm') || file.type.startsWith('audio/') || file.name.match(/\.(mp3|wav|m4a|aac|ogg|flac|webm)$/i);
    if (isNative && file.size < 0.5 * 1024 * 1024) return [file];
    
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const arrayBuffer = await file.arrayBuffer();
    
    try {
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        const CHUNK_DURATION = 60; // Otimizado: 60s reduz chamadas à API pela metade
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
            
            // Reutilizando bufferToWav (simplificado para economia de código)
            chunks.push(bufferToWav(renderedBuffer));
        }
        return chunks;
    } catch (e) {
        throw new Error("Falha ao decodificar mídia. Tente converter para MP3.");
    }
  };

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

  const handleFilesSelect = (files: File[]) => {
    // Adicionando tipagem explícita para evitar inferência incorreta de literais em sourceType e status
    const newItems: QueueItem[] = files.map(file => ({
      id: Math.random().toString(36).substring(7),
      sourceType: 'file',
      file,
      status: 'idle',
      progressMsg: 'Aguardando...',
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
    // Fix: Explicitly typing the mapped array as QueueItem[] to resolve the SetStateAction error (line 97)
    const newItems: QueueItem[] = urls.map(url => ({
      id: Math.random().toString(36).substring(7),
      sourceType: 'url',
      url,
      status: 'idle',
      progressMsg: 'Aguardando...',
      result: null,
      error: null,
      createdAt: Date.now(),
      expanded: false
    }));
    setQueue(prev => [...prev, ...newItems]);
    setUrlInput('');
  };

  useEffect(() => {
    if (activeCount < CONCURRENCY_LIMIT) {
      const next = queue.find(item => item.status === 'idle');
      if (next) processItem(next);
    }
  }, [queue, activeCount]);

  const processItem = async (item: QueueItem) => {
    setActiveCount(c => c + 1);
    updateItem(item.id, { status: 'optimizing', progressMsg: 'Iniciando...' });

    try {
      let result;
      if (item.sourceType === 'file' && item.file) {
        const chunks = await processAudio(item.file);
        updateItem(item.id, { status: 'processing', progressMsg: 'IA Transcrevendo...' });
        result = await transcribeFile(chunks, 'audio/wav', (msg) => updateItem(item.id, { progressMsg: msg }));
      } else if (item.url) {
        result = await transcribeUrl(item.url, (msg) => updateItem(item.id, { progressMsg: msg }), async (f) => {
            const chunks = await processAudio(f);
            return transcribeFile(chunks, 'audio/wav', (msg) => updateItem(item.id, { progressMsg: msg }));
        });
      }
      updateItem(item.id, { status: 'success', result, expanded: true, progressMsg: 'Pronto' });
    } catch (e: any) {
      updateItem(item.id, { status: 'error', error: e.message, progressMsg: 'Falhou' });
    } finally {
      setActiveCount(c => Math.max(0, c - 1));
    }
  };

  const updateItem = (id: string, up: Partial<QueueItem>) => setQueue(q => q.map(i => i.id === id ? {...i, ...up} : i));
  const remove = (id: string) => setQueue(q => q.filter(i => i.id !== id));

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
                  Otimizado para grandes volumes de transcrição.
                </p>
                {activeCount > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-violet-500/10 border border-violet-500/20 rounded-full">
                        <Zap size={12} className="text-violet-400 animate-pulse" />
                        <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">
                            {activeCount} Workers Ativos
                        </span>
                    </div>
                )}
            </div>
        </div>

        <div className="max-w-3xl mx-auto space-y-6">
           <div className="flex gap-2 p-2 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl focus-within:border-violet-500/50 transition-all">
                <input 
                    type="text" 
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddLink()}
                    placeholder="Cole links ou URLs aqui..."
                    className="bg-transparent border-none outline-none text-zinc-200 w-full px-4 text-sm font-medium"
                />
                <button onClick={handleAddLink} className="p-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold text-xs uppercase"><Plus size={16} /></button>
           </div>
           <FilePicker onFileSelect={handleFilesSelect} disabled={false} />
        </div>

        {queue.length > 0 && (
            <div className="max-w-4xl mx-auto space-y-3">
                {queue.map((item) => (
                    <div key={item.id} className={`bg-zinc-900 border rounded-xl overflow-hidden transition-all ${['optimizing', 'processing'].includes(item.status) ? 'border-violet-500/30' : 'border-zinc-800'}`}>
                        <div className="p-4 flex items-center gap-4">
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-zinc-200 truncate text-sm">{item.sourceType === 'file' ? item.file?.name : item.url}</h4>
                                <p className={`text-[10px] uppercase font-black tracking-widest ${item.status === 'error' ? 'text-red-500' : 'text-zinc-500'}`}>
                                    {item.status === 'error' ? item.error : item.progressMsg}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {item.status === 'success' && <button onClick={() => updateItem(item.id, {expanded: !item.expanded})} className="p-2 text-zinc-400">{item.expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</button>}
                                <button onClick={() => remove(item.id)} className="p-2 text-zinc-600 hover:text-red-500"><Trash2 size={16} /></button>
                            </div>
                        </div>
                        {['optimizing', 'processing'].includes(item.status) && (
                            <div className="px-4 pb-4 border-t border-zinc-800/50 pt-2">
                                <StatusIndicator status={item.status} progressDetail={item.progressMsg} compact />
                            </div>
                        )}
                        {item.status === 'success' && item.result && item.expanded && (
                            <div className="border-t border-zinc-800 p-6 bg-zinc-950/20">
                                <ResultDisplay result={item.result} />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        )}
      </div>
    </Layout>
  );
};

export default App;
