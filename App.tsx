
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

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = reader.result as string;
        const base64 = base64String.split(',')[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileSelect = async (file: File) => {
    setError(null);
    setResult(null);
    setFileMeta({
      name: file.name,
      size: file.size,
      type: file.type
    });
    
    // Aumentado para 50MB para suportar arquivos maiores conforme solicitado
    if (file.size > 50 * 1024 * 1024) {
      setError("Arquivo muito grande (Máx 50MB). Tente comprimir o arquivo ou usar um trecho menor.");
      return;
    }

    try {
      setStatus('uploading');
      // Para arquivos grandes (45MB+), esta etapa pode levar alguns segundos
      const base64 = await fileToBase64(file);
      
      setStatus('processing');
      const transcription = await transcribeFile(base64, file.type);
      
      setResult(transcription);
      setStatus('success');
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Ocorreu um erro inesperado durante a transcrição. Se o arquivo for muito longo, tente reduzir a qualidade do MP3.");
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
                Zero Fricção <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-600">Precisão Pura</span>
            </h1>
            <p className="text-lg text-zinc-400 font-medium max-w-lg mx-auto leading-relaxed">
              Envie qualquer áudio ou vídeo. Obtenha uma transcrição limpa e estruturada com resumos e rótulos de palestrantes em segundos.
            </p>
          </div>
        )}

        <div className="relative">
          {status === 'idle' && (
            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-700">
               <FilePicker onFileSelect={handleFileSelect} disabled={false} />
               
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { title: "Otimizado para 50MB", desc: "Suporta arquivos maiores de áudio e vídeo agora." },
                    { title: "Nível Militar", desc: "Usa o modelo Gemini 3 Flash mais recente para precisão." },
                    { title: "Privacidade Total", desc: "Arquivos processados em memória e nunca armazenados." }
                  ].map((feat, i) => (
                    <div key={i} className="bg-zinc-900/30 border border-zinc-800 p-5 rounded-2xl">
                      <h4 className="font-bold text-white mb-1 uppercase text-xs tracking-widest">{feat.title}</h4>
                      <p className="text-zinc-500 text-sm">{feat.desc}</p>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {(status === 'uploading' || status === 'processing') && (
            <StatusIndicator status={status} />
          )}

          {status === 'error' && (
            <div className="bg-red-500/5 border border-red-500/20 p-8 rounded-3xl text-center space-y-4 max-w-xl mx-auto">
              <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto">
                <AlertTriangle size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">Algo deu errado</h3>
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
                    Powered by Google Gemini 3 Flash. Agora otimizado para arquivos de até 50MB. Para áudios muito longos, o processamento pode levar de 30 a 60 segundos. Seus dados permanecem seguros e privados.
                </p>
            </div>
        )}
      </div>
    </Layout>
  );
};

export default App;
