
import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { FilePicker } from './components/FilePicker';
import { StatusIndicator } from './components/StatusIndicator';
import { ResultDisplay } from './components/ResultDisplay';
import { transcribeFile } from './services/gemini';
import { TranscriptionResult, ProcessingStatus, FileMetadata } from './types';
import { AlertTriangle, RotateCcw, Info } from 'lucide-react';

const App: React.FC = () => {
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileMeta, setFileMeta] = useState<FileMetadata | null>(null);

  // Compressor Brutal: Transforma qualquer áudio/vídeo em Mono 16kHz WAV
  // Essencial para aceitar arquivos gigantes dentro do limite da API
  const compressAudio = async (file: File): Promise<{ base64: string, mimeType: string }> => {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const arrayBuffer = await file.arrayBuffer();
    
    // Decodifica o áudio original (vídeo ou áudio)
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    
    // Reamostragem para 16kHz (Padrão de ouro para voz humana)
    const targetSampleRate = 16000;
    const offlineCtx = new OfflineAudioContext(1, Math.ceil(audioBuffer.duration * targetSampleRate), targetSampleRate);
    
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineCtx.destination);
    source.start();
    
    const renderedBuffer = await offlineCtx.startRendering();
    
    // Converte para WAV simples de 16-bit
    const wavBlob = bufferToWav(renderedBuffer);
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve({ base64, mimeType: 'audio/wav' });
      };
      reader.readAsDataURL(wavBlob);
    });
  };

  // Helper para gerar o Header WAV (Preciso e leve)
  const bufferToWav = (buffer: AudioBuffer): Blob => {
    const length = buffer.length * 2;
    const view = new DataView(new ArrayBuffer(44 + length));
    
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
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

  const handleFileSelect = async (file: File) => {
    setError(null);
    setResult(null);
    setFileMeta({ name: file.name, size: file.size, type: file.type });
    
    // Limite brutal de 500MB
    if (file.size > 500 * 1024 * 1024) {
      setError("Arquivo excede o limite máximo de 500MB.");
      return;
    }

    try {
      setStatus('optimizing');
      // Extrai e comprime o áudio localmente (Mesmo de arquivos 500MB)
      const { base64, mimeType } = await compressAudio(file);
      
      setStatus('uploading');
      // O upload agora é minúsculo (apenas o áudio essencial)
      setStatus('processing');
      const transcription = await transcribeFile(base64, mimeType);
      
      setResult(transcription);
      setStatus('success');
    } catch (err: any) {
      console.error("Erro no fluxo:", err);
      let msg = "Erro no processamento. ";
      if (err.message.includes("decode")) msg += "O formato do arquivo pode estar corrompido ou é incompatível.";
      else msg += err.message;
      
      setError(msg);
      setStatus('error');
    }
  };

  const reset = () => {
    setStatus('idle');
    setResult(null);
    setError(null);
    setFileMeta(null);
  };

  return (
    <Layout>
      <div className="space-y-12">
        {status === 'idle' && (
          <div className="text-center space-y-6 max-w-2xl mx-auto">
            <h1 className="text-5xl sm:text-7xl font-black italic tracking-tighter leading-none uppercase">
                Brutal <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-600">500MB Ready</span>
            </h1>
            <p className="text-lg text-zinc-400 font-medium max-w-lg mx-auto leading-relaxed">
              Otimização inteligente embutida. Transcreva podcasts e reuniões gigantes sem custo de banda.
            </p>
          </div>
        )}

        <div className="relative">
          {status === 'idle' && (
            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-700">
               <FilePicker onFileSelect={handleFileSelect} disabled={false} />
               
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { title: "Limite de 500MB", desc: "Compressão local antes do upload." },
                    { title: "Grátis & Ilimitado", desc: "Uso otimizado da API Flash." },
                    { title: "Precisão 16kHz", desc: "Foco total na clareza da voz humana." }
                  ].map((feat, i) => (
                    <div key={i} className="bg-zinc-900/30 border border-zinc-800 p-5 rounded-2xl">
                      <h4 className="font-bold text-white mb-1 uppercase text-xs tracking-widest">{feat.title}</h4>
                      <p className="text-zinc-500 text-sm">{feat.desc}</p>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {status !== 'idle' && status !== 'success' && status !== 'error' && (
            <StatusIndicator status={status} />
          )}

          {status === 'error' && (
            <div className="bg-red-500/5 border border-red-500/20 p-8 rounded-3xl text-center space-y-4 max-w-xl mx-auto">
              <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto">
                <AlertTriangle size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">Falha no Processamento</h3>
                <p className="text-zinc-400 text-sm">{error}</p>
              </div>
              <button
                onClick={reset}
                className="flex items-center gap-2 mx-auto px-6 py-3 bg-white text-black font-black uppercase tracking-tight rounded-xl hover:bg-zinc-200 transition-colors"
              >
                <RotateCcw size={18} /> Tentar Novamente
              </button>
            </div>
          )}

          {status === 'success' && result && (
            <div className="space-y-8">
                <ResultDisplay result={result} />
                <div className="flex justify-center pt-8 border-t border-zinc-800">
                    <button
                        onClick={reset}
                        className="flex items-center gap-2 px-6 py-3 border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-white transition-all rounded-xl text-sm font-bold uppercase tracking-widest"
                    >
                        <RotateCcw size={16} /> Nova Transcrição
                    </button>
                </div>
            </div>
          )}
        </div>

        {status === 'idle' && (
            <div className="bg-zinc-900/20 border border-zinc-800/50 p-4 rounded-xl flex items-start gap-4 max-w-lg mx-auto">
                <Info size={20} className="text-violet-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-zinc-500 leading-tight">
                    Arquivos grandes (até 500MB) são otimizados localmente no seu navegador. Apenas os dados de voz essenciais são enviados, garantindo velocidade brutal e precisão máxima com Gemini 3 Flash.
                </p>
            </div>
        )}
      </div>
    </Layout>
  );
};

export default App;
