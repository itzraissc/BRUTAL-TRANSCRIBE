
import React from 'react';
import { Loader2, ShieldCheck, Zap, Scissors, CheckCircle2 } from 'lucide-react';
import { ProcessingStatus } from '../types';

interface StatusIndicatorProps {
  status: ProcessingStatus;
  progressDetail?: string;
  compact?: boolean;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, progressDetail, compact = false }) => {
  if (status === 'idle') return null;

  const steps = [
    { id: 'optimizing', label: 'Otimizando', icon: <Scissors size={14} /> },
    { id: 'uploading', label: 'Preparando', icon: <ShieldCheck size={14} /> },
    { id: 'processing', label: 'Transcrevendo', icon: <Zap size={14} /> },
  ];

  const getCurrentIndex = () => {
    if (status === 'optimizing') return 0;
    if (status === 'uploading') return 1;
    if (status === 'processing') return 2;
    if (status === 'success') return 3;
    return -1;
  };

  const currentIndex = getCurrentIndex();

  if (compact) {
    return (
      <div className="space-y-4 animate-in fade-in duration-500">
        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">
          <span>Progresso da Operação</span>
          <span className="text-violet-400">{status === 'processing' ? 'Etapa Final' : `Etapa ${currentIndex + 1}/3`}</span>
        </div>
        
        <div className="flex items-center gap-2 w-full">
            {steps.map((step, i) => (
                <React.Fragment key={step.id}>
                    <div className="flex items-center gap-2 flex-1">
                        <div className={`
                            w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-500 shrink-0
                            ${i < currentIndex ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 
                              i === currentIndex ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' : 
                              'bg-zinc-800 text-zinc-600 border border-zinc-700'}
                        `}>
                            {i < currentIndex ? <CheckCircle2 size={12} /> : step.icon}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className={`text-[9px] font-bold uppercase tracking-wider truncate ${i === currentIndex ? 'text-violet-400' : 'text-zinc-600'}`}>
                                {step.label}
                            </span>
                            {i === currentIndex && (
                                <span className="text-[8px] text-zinc-500 truncate font-medium">{progressDetail}</span>
                            )}
                        </div>
                    </div>
                    {i < steps.length - 1 && (
                        <div className={`h-[1px] w-4 rounded-full transition-colors duration-1000 ${i < currentIndex ? 'bg-emerald-500/30' : 'bg-zinc-800'}`}></div>
                    )}
                </React.Fragment>
            ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl flex flex-col items-center gap-8 max-w-xl mx-auto text-center animate-in fade-in duration-500">
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
                {status === 'optimizing' && 'Fatiando Áudio...'}
                {status === 'uploading' && 'Organizando Blocos...'}
                {status === 'processing' && 'Processando Inteligência...'}
            </h2>
            <p className="text-zinc-500 font-medium">
                {status === 'processing' && progressDetail ? progressDetail : 
                 status === 'optimizing' ? 'Dividindo arquivo em chunks seguros.' : 
                 'Garantindo integridade dos dados.'}
            </p>
        </div>

        <div className="flex items-center gap-4 w-full px-4">
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
                        <span className={`text-[9px] font-bold uppercase tracking-wider ${i === currentIndex ? 'text-violet-400' : 'text-zinc-600'}`}>
                            {step.label}
                        </span>
                    </div>
                    {i < steps.length - 1 && (
                        <div className={`h-[2px] w-4 sm:w-8 rounded-full transition-colors duration-1000 ${i < currentIndex ? 'bg-emerald-500/50' : 'bg-zinc-800'}`}></div>
                    )}
                </React.Fragment>
            ))}
        </div>
    </div>
  );
};
