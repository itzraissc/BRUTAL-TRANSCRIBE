
import React, { useState } from 'react';
import { TranscriptionResult } from '../types';
import { Copy, Check, Download, List, FileText, User } from 'lucide-react';

interface ResultDisplayProps {
  result: TranscriptionResult;
}

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ result }) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'transcription' | 'summary'>('transcription');

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sanitizeFilename = (title: string) => {
    return title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove acentos
      .replace(/[^a-z0-9]/g, "-") // Substitui caracteres especiais por hífens
      .replace(/-+/g, "-") // Remove hífens duplicados
      .replace(/^-|-$/g, ""); // Remove hífens no início ou fim
  };

  const downloadTxt = () => {
    const filename = sanitizeFilename(result.suggestedTitle || 'transcricao-brutal') + ".txt";
    const content = `TÍTULO: ${result.suggestedTitle}\n\nRESUMO:\n${result.summary}\n\nPONTOS CHAVE:\n${result.keyPoints.join('\n')}\n\nTRANSCRIÇÃO:\n${result.text}`;
    
    const element = document.createElement("a");
    const file = new Blob([content], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-violet-500/10 text-violet-400 text-[10px] font-bold uppercase rounded border border-violet-500/20">
              Título Sugerido
            </span>
            <h2 className="text-xl font-black text-white italic truncate max-w-md">
               {result.suggestedTitle}
            </h2>
          </div>
          <p className="text-zinc-500 text-sm">Transcrição concluída com precisão absoluta</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 transition-colors rounded-lg text-sm font-semibold"
          >
            {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
          <button
            onClick={downloadTxt}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 shadow-lg shadow-violet-600/20 transition-all active:scale-95 rounded-lg text-sm font-bold uppercase tracking-tight"
          >
            <Download size={16} />
            Download TXT
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <section className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
            <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <FileText size={16} className="text-violet-500" />
              Resumo Executivo
            </h3>
            <p className="text-zinc-300 leading-relaxed text-sm">
              {result.summary}
            </p>
          </section>

          <section className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
            <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <List size={16} className="text-violet-500" />
              Insights Principais
            </h3>
            <ul className="space-y-3">
              {result.keyPoints.map((point, i) => (
                <li key={i} className="flex gap-3 text-sm text-zinc-300">
                  <span className="flex-shrink-0 w-5 h-5 bg-violet-500/10 text-violet-500 rounded flex items-center justify-center text-[10px] font-bold">
                    {i + 1}
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          </section>

          {result.speakers.length > 0 && (
            <section className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
              <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <User size={16} className="text-violet-500" />
                Palestrantes
              </h3>
              <div className="flex flex-wrap gap-2">
                {result.speakers.map((speaker, i) => (
                  <span key={i} className="px-3 py-1 bg-zinc-800 rounded-md text-xs font-medium text-zinc-300 border border-zinc-700">
                    {speaker}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="lg:col-span-2">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col h-full min-h-[500px]">
            <div className="flex border-b border-zinc-800 bg-zinc-900/50">
              <button
                onClick={() => setActiveTab('transcription')}
                className={`px-6 py-4 text-xs font-black tracking-widest transition-colors ${activeTab === 'transcription' ? 'text-violet-400 bg-violet-500/5 border-b-2 border-violet-500' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                TRANSCRIÇÃO COMPLETA
              </button>
            </div>
            <div className="p-8 overflow-y-auto flex-1 bg-zinc-950/30">
               <div className="prose prose-invert prose-zinc max-w-none">
                  {result.text.split('\n').map((para, i) => (
                    para.trim() && <p key={i} className="text-zinc-300 leading-relaxed mb-4 text-sm">{para}</p>
                  ))}
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
