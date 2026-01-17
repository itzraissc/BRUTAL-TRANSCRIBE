
import React, { useState } from 'react';
import { TranscriptionResult } from '../types';
import { Copy, Check, Download, List, FileText, User, FileType, File } from 'lucide-react';
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
    return title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") 
      .replace(/[^a-z0-9]/g, "-") 
      .replace(/-+/g, "-") 
      .replace(/^-|-$/g, "");
  };

  const baseFilename = sanitizeFilename(result.suggestedTitle || 'transcricao-brutal');

  // --- DOWNLOAD TXT ---
  const downloadTxt = () => {
    const filename = baseFilename + ".txt";
    const content = `TÍTULO: ${result.suggestedTitle}\n\nRESUMO:\n${result.summary}\n\nPONTOS CHAVE:\n${result.keyPoints.join('\n')}\n\nPARTICIPANTES:\n${result.speakers.join(', ')}\n\nTRANSCRIÇÃO:\n${result.text}`;
    
    const element = document.createElement("a");
    const file = new Blob([content], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // --- DOWNLOAD PDF ---
  const downloadPdf = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const maxLineWidth = pageWidth - (margin * 2);
    let yCursor = 20;

    const addText = (text: string, fontSize: number, isBold: boolean = false, isTitle: boolean = false) => {
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", isBold ? "bold" : "normal");
      
      const lines = doc.splitTextToSize(text, maxLineWidth);
      
      // Check page break
      if (yCursor + (lines.length * fontSize * 0.4) > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        yCursor = 20;
      }
      
      if (isTitle) doc.setTextColor(124, 58, 237); // Violet color
      else doc.setTextColor(0, 0, 0);

      doc.text(lines, margin, yCursor);
      yCursor += (lines.length * fontSize * 0.4) + (isTitle ? 10 : 5);
      
      // Reset color
      doc.setTextColor(0, 0, 0);
    };

    // Header
    addText("BRUTAL TRANSCRIBE REPORT", 10, true);
    yCursor += 5;

    // Content
    addText(result.suggestedTitle, 18, true, true);
    
    addText("RESUMO EXECUTIVO", 12, true);
    addText(result.summary, 10);
    yCursor += 5;

    addText("INSIGHTS & PONTOS CHAVE", 12, true);
    result.keyPoints.forEach(point => {
        addText(`• ${point}`, 10);
    });
    yCursor += 5;

    if (result.speakers.length > 0) {
        addText("PARTICIPANTES", 12, true);
        addText(result.speakers.join(", "), 10);
        yCursor += 5;
    }

    addText("TRANSCRIÇÃO COMPLETA", 12, true);
    addText(result.text, 10);

    doc.save(`${baseFilename}.pdf`);
  };

  // --- DOWNLOAD DOCX ---
  const downloadDocx = async () => {
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              text: result.suggestedTitle,
              heading: HeadingLevel.TITLE,
              alignment: AlignmentType.CENTER,
              spacing: { after: 300 }
            }),
            new Paragraph({
              text: "RESUMO EXECUTIVO",
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 200, after: 100 }
            }),
            new Paragraph({
              children: [new TextRun(result.summary)],
              spacing: { after: 200 }
            }),
            new Paragraph({
              text: "INSIGHTS PRINCIPAIS",
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 200, after: 100 }
            }),
            ...result.keyPoints.map(point => 
                new Paragraph({
                    text: point,
                    bullet: { level: 0 }
                })
            ),
            new Paragraph({
              text: "TRANSCRIÇÃO COMPLETA",
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 300, after: 100 }
            }),
            new Paragraph({
              children: [new TextRun(result.text)],
              spacing: { after: 200 }
            }),
            new Paragraph({
               text: "Gerado por BrutalTranscribe",
               alignment: AlignmentType.CENTER,
               spacing: { before: 500 },
               style: "Subtitle" 
            })
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    const element = document.createElement("a");
    element.href = URL.createObjectURL(blob);
    element.download = `${baseFilename}.docx`;
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
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={copyToClipboard}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 transition-colors rounded-lg text-sm font-semibold text-zinc-300"
          >
            {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
            {copied ? 'Copiado' : 'Copiar Texto'}
          </button>
          
          <div className="h-8 w-px bg-zinc-800 hidden sm:block"></div>

          <div className="flex gap-2">
            <button
                onClick={downloadTxt}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 hover:text-white transition-colors rounded-lg text-xs font-bold uppercase text-zinc-400 border border-zinc-700"
                title="Baixar Texto Simples (.txt)"
            >
                <FileText size={14} /> TXT
            </button>
            <button
                onClick={downloadPdf}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-400 transition-colors rounded-lg text-xs font-bold uppercase text-zinc-400 border border-zinc-700"
                title="Baixar Documento PDF (.pdf)"
            >
                <File size={14} /> PDF
            </button>
            <button
                onClick={downloadDocx}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-blue-500/10 hover:border-blue-500/50 hover:text-blue-400 transition-colors rounded-lg text-xs font-bold uppercase text-zinc-400 border border-zinc-700"
                title="Baixar Microsoft Word (.docx)"
            >
                <FileType size={14} /> DOCX
            </button>
          </div>
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
