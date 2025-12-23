
import React from 'react';
import { Loader2, ShieldCheck, Zap } from 'lucide-react';
import { ProcessingStatus } from '../types';

interface StatusIndicatorProps {
  status: ProcessingStatus;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status }) => {
  if (status === 'idle') return null;

  const steps = [
    { id: 'uploading', label: 'Preparando Mídia', icon: <ShieldCheck size={18} /> },
    { id: 'processing', label: 'IA Gemini Transcrevendo', icon: <Zap size={18} /> },
    { id: 'success', label: 'Pronto', icon: <ShieldCheck size={18} /> },
  ];

  const getCurrentIndex = () => {
    if (status === 'uploading') return 0;
    if (status === 'processing') return 1;
    if (status === 'success') return 2;
    return -1;
  };

  const currentIndex = getCurrentIndex();

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl flex flex-col items-center gap-8 max-w-xl mx-auto text-center">
        {status !== 'success' && (
            <div className="relative">
                <div className="w-24 h-24 rounded-full border-4 border-zinc-800 border-t-violet-500 animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="animate-pulse text-zinc-600" />
                </div>
            </div>
        )}
        
        <div className="space-y-2">
            <h2 className="text-2xl font-black italic uppercase tracking-tight">
                {status === 'uploading' && 'Inalando Dados...'}
                {status === 'processing' && 'Mastigando Lexemas...'}
                {status === 'error' && 'Falha Crítica'}
            </h2>
            <p className="text-zinc-500 font-medium">
                Nosso modelo está analisando cada frequência para garantir precisão total.
            </p>
        </div>

        <div className="flex items-center gap-4 w-full">
            {steps.map((step, i) => (
                <React.Fragment key={step.id}>
                    <div className="flex flex-col items-center gap-2 flex-1">
                        <div className={`
                            w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500
                            ${i < currentIndex ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/50' : 
                              i === currentIndex ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' : 
                              'bg-zinc-800 text-zinc-600'}
                        `}>
                            {step.icon}
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${i === currentIndex ? 'text-violet-400' : 'text-zinc-600'}`}>
                            {step.label}
                        </span>
                    </div>
                    {i < steps.length - 1 && (
                        <div className={`h-[2px] w-8 rounded-full transition-colors duration-1000 ${i < currentIndex ? 'bg-emerald-500/50' : 'bg-zinc-800'}`}></div>
                    )}
                </React.Fragment>
            ))}
        </div>
    </div>
  );
};
