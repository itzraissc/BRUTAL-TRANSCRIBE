
import React, { useState } from 'react';
import { TranscriptionResult } from '../types';
import { Copy, Check, Download, List, FileText, User, FileType, File, Clock } from 'lucide-react';
import { jsPDF } from "jspdf";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";

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
    return title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  };

  const baseFilename = sanitizeFilename(result.suggestedTitle || 'transcricao-brutal');

  const downloadTxt = () => {
    const content = `TÍTULO: ${result.suggestedTitle}\n\nTRANSCRIÇÃO LITERAL:\n${result.text}`;
    const element = document.createElement("a");
    const file = new Blob([content], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = baseFilename + ".txt";
    element.click();
  };

  // Renderiza o texto com timestamps destacados
  const renderTranscription = () => {
    return result.text.split('\n').map((line, i) => {
      const timestampMatch = line.match(/^(\[\d{2}:\d{2}\])/);
      if (timestampMatch) {
        const ts = timestampMatch[1];
        const rest = line.replace(ts, '');
        return (
          <p key={i} className="mb-4 flex gap-4 items-start group">
            <span className="shrink-0 font-mono text-violet-500 font-bold text-xs bg-violet-500/10 px-2 py-1 rounded border border-violet-500/20 group-hover:bg-violet-500/20 transition-colors">
              {ts}
            </span>
            <span className="text-zinc-300 leading-relaxed text-sm pt-0.5">{rest}</span>
          </p>
        );
      }
      return line.trim() ? <p key={i} className="text-zinc-300 leading-relaxed mb-4 text-sm ml-16">{line}</p> : null;
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-violet-500/10 text-violet-400 text-[10px] font-bold uppercase rounded border border-violet-500/20">
              Literal & Sincronizado
            </span>
            <h2 className="text-xl font-black text-white italic truncate max-w-md uppercase">
               {result.suggestedTitle}
            </h2>
          </div>
          <p className="text-zinc-500 text-sm flex items-center gap-2">
            <Clock size={14} /> Transcrição completa com marcações de tempo
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button onClick={copyToClipboard} className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 transition-colors rounded-lg text-sm font-semibold text-zinc-300">
            {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
          <button onClick={downloadTxt} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400" title="Baixar TXT">
            <Download size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <section className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">Resumo Executivo</h3>
            <p className="text-zinc-300 leading-relaxed text-sm italic">"{result.summary}"</p>
          </section>

          <section className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">Insights</h3>
            <ul className="space-y-3">
              {result.keyPoints.map((point, i) => (
                <li key={i} className="flex gap-3 text-sm text-zinc-400">
                  <span className="text-violet-500 font-bold">•</span> {point}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="lg:col-span-2 h-[600px] flex flex-col bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Script Word-for-Word</span>
            <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <div className="w-2 h-2 rounded-full bg-zinc-700"></div>
                <div className="w-2 h-2 rounded-full bg-zinc-700"></div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-8 bg-zinc-950/20 custom-scrollbar">
             {renderTranscription()}
          </div>
        </div>
      </div>
    </div>
  );
};
