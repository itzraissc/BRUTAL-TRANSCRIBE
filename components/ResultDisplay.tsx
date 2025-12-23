
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

  const downloadTxt = () => {
    const content = `RESUMO:\n${result.summary}\n\nPONTOS CHAVE:\n${result.keyPoints.join('\n')}\n\nTRANSCRIÇÃO:\n${result.text}`;
    const element = document.createElement("a");
    const file = new Blob([content], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = "transcricao.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-white">Processamento Concluído</h2>
          <p className="text-zinc-500">Transcrição gerada por IA com alta precisão</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 transition-colors rounded-lg text-sm font-semibold"
          >
            {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
            {copied ? 'Copiado' : 'Copiar Texto'}
          </button>
          <button
            onClick={downloadTxt}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 transition-colors rounded-lg text-sm font-semibold"
          >
            <Download size={16} />
            Baixar TXT
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
                Palestrantes Detectados
              </h3>
              <div className="flex flex-wrap gap-2">
                {result.speakers.map((speaker, i) => (
                  <span key={i} className="px-3 py-1 bg-zinc-800 rounded-md text-xs font-medium text-zinc-300">
                    {speaker}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="lg:col-span-2">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="flex border-b border-zinc-800">
              <button
                onClick={() => setActiveTab('transcription')}
                className={`px-6 py-4 text-sm font-bold transition-colors ${activeTab === 'transcription' ? 'text-violet-400 bg-zinc-800/50 border-b-2 border-violet-500' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                TRANSCRIÇÃO COMPLETA
              </button>
            </div>
            <div className="p-8 max-h-[600px] overflow-y-auto">
               <div className="prose prose-invert prose-zinc max-w-none">
                  {result.text.split('\n').map((para, i) => (
                    para.trim() && <p key={i} className="text-zinc-300 leading-relaxed mb-4">{para}</p>
                  ))}
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
