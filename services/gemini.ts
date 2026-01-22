

import { GoogleGenAI, Type } from "@google/genai";
import { TranscriptionResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Prompt otimizado: Instruções densas em menos tokens
const SYSTEM_PROMPT = `Transcritor Literal. Regras: 1. Texto 100% fiel; 2. Timestamps [MM:SS] a cada ~30s ou troca de assunto; 3. Identifique falas (P1, P2); 4. Sem resumos.`;

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

async function transcribeChunk(blob: Blob, mimeType: string, startTimeSeconds: number): Promise<string> {
  const base64Data = await blobToBase64(blob);
  const timeLabel = `[${Math.floor(startTimeSeconds/60).toString().padStart(2, '0')}:${(startTimeSeconds%60).toString().padStart(2, '0')}]`;

  let retries = 3;
  let backoff = 3000;

  while (retries > 0) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType } },
            { text: `Transcreva literalmente a partir de ${timeLabel}.` }
          ]
        },
        config: { 
            systemInstruction: SYSTEM_PROMPT,
            responseMimeType: "text/plain" 
        }
      });
      return response.text || "";
    } catch (e: any) {
      // Se for erro de quota (429), espera mais tempo
      const isQuota = e.message?.includes('429') || e.message?.includes('quota');
      console.warn(`Erro no chunk (${isQuota ? 'Quota' : 'Rede'}). Retentando...`);
      
      retries--;
      if (retries === 0) return `\n${timeLabel} [Falha: Limite de API atingido]\n`;
      
      await new Promise(r => setTimeout(r, isQuota ? backoff * 2 : backoff));
      backoff *= 2;
    }
  }
  return "";
}

export const transcribeFile = async (
  audioBlobs: Blob[],
  mimeType: string,
  onProgress?: (msg: string) => void
): Promise<TranscriptionResult> => {
  const fullTranscriptParts: string[] = [];
  const CHUNK_SIZE_SEC = 60; // Aumentado para 60s para economizar tokens/chamadas

  for (let i = 0; i < audioBlobs.length; i++) {
    const progress = Math.round(((i + 1) / audioBlobs.length) * 100);
    onProgress?.(`IA: ${progress}% (${i + 1}/${audioBlobs.length})`);
    
    // Pequeno delay entre partes para não estourar o Rate Limit por segundo
    if (i > 0) await new Promise(r => setTimeout(r, 1200)); 
    
    const startTime = i * CHUNK_SIZE_SEC;
    const partText = await transcribeChunk(audioBlobs[i], mimeType, startTime);
    fullTranscriptParts.push(partText);
  }
  
  return analyzeText(fullTranscriptParts.join("\n"), onProgress);
};

export const transcribeUrl = async (
  url: string,
  onProgress?: (msg: string) => void,
  processLocalFile?: (file: File) => Promise<TranscriptionResult>
): Promise<TranscriptionResult> => {
  
  const isDirectMedia = /\.(mp3|wav|m4a|mp4|mov|ogg|flac|webm)$/i.test(url.split('?')[0]);
  if (isDirectMedia && processLocalFile) {
    onProgress?.("Baixando mídia...");
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      return await processLocalFile(new File([blob], "media", { type: blob.type }));
    } catch (e) { /* fallback para search */ }
  }

  const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
  onProgress?.(isYouTube ? "Lendo legendas do YouTube..." : "Analisando URL...");
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Extraia transcrição literal com timestamps de: ${url}`,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        tools: [{ googleSearch: {} }],
      },
    });

    // Extracting grounding metadata for Google Search results as per guidelines
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const sourceUrls = groundingChunks
      ?.filter((c: any) => c.web)
      .map((c: any) => ({
        web: {
          uri: c.web.uri,
          title: c.web.title || c.web.uri
        }
      }));

    const result = await analyzeText(response.text || "", onProgress);
    return { 
      ...result, 
      sourceUrls: (sourceUrls && sourceUrls.length > 0) ? sourceUrls : undefined 
    };
  } catch (error: any) {
    throw new Error("Erro na extração via link. Tente o upload do arquivo.");
  }
};

async function analyzeText(text: string, onProgress?: (msg: string) => void): Promise<TranscriptionResult> {
  if (!text) throw new Error("Transcrição vazia.");
  onProgress?.("Finalizando...");
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts: [{ text: `TEXTO:\n${text}` }] },
    config: {
      systemInstruction: "Gere JSON: {suggestedTitle, summary, keyPoints: [], speakers: []}",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
          speakers: { type: Type.ARRAY, items: { type: Type.STRING } },
          suggestedTitle: { type: Type.STRING },
        },
        required: ["summary", "keyPoints", "speakers", "suggestedTitle"],
      },
    },
  });

  const metadata = JSON.parse(response.text || "{}");
  return { text, ...metadata };
}
