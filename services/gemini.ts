
import { GoogleGenAI, Type } from "@google/genai";
import { TranscriptionResult } from "../types";

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- SYSTEM INSTRUCTIONS ---
const SYSTEM_PROMPT = `Você é um TRANSCRITOR BRUTAL. 
Sua única missão é converter áudio/vídeo em texto LITERAL. 
REGRAS:
1. NUNCA resuma durante a transcrição.
2. SEMPRE inclua marcações de tempo no formato [MM:SS] a cada mudança de assunto ou a cada 30 segundos.
3. Mantenha gírias, hesitações (hmmm, ah) e erros de fala se forem relevantes para o contexto.
4. Identifique palestrantes como "P1:", "P2:" se houver mais de um.
5. Se o conteúdo for muito longo, priorize a fidelidade absoluta das palavras.`;

// --- FILE TRANSCRIPTION (CHUNKS) ---

async function transcribeChunk(blob: Blob, mimeType: string, index: number, total: number): Promise<string> {
  const base64Data = await blobToBase64(blob);
  const startTime = (index - 1) * 25; // 25s chunks
  const timeLabel = `[${Math.floor(startTime/60).toString().padStart(2, '0')}:${(startTime%60).toString().padStart(2, '0')}]`;

  let retries = 5;
  let delay = 2000;

  while (retries > 0) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType: mimeType } },
            { text: `Transcreva este áudio literalmente. Comece com a marcação ${timeLabel}. Não ignore nenhuma palavra.` }
          ]
        },
        config: { 
            systemInstruction: SYSTEM_PROMPT,
            responseMimeType: "text/plain" 
        }
      });
      return response.text || "";
    } catch (e: any) {
      console.warn(`Chunk ${index} failed, retrying...`, e);
      retries--;
      if (retries === 0) return `\n${timeLabel} [Falha na captura deste trecho]\n`;
      await new Promise(r => setTimeout(r, delay + Math.random() * 1000));
      delay = Math.min(delay * 2, 32000);
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
  for (let i = 0; i < audioBlobs.length; i++) {
    onProgress?.(`Extraindo: ${Math.round(((i + 1) / audioBlobs.length) * 100)}% (Parte ${i + 1}/${audioBlobs.length})`);
    if (i > 0) await new Promise(r => setTimeout(r, 800)); // Rate limit safety
    const partText = await transcribeChunk(audioBlobs[i], mimeType, i + 1, audioBlobs.length);
    fullTranscriptParts.push(partText);
  }
  const fullText = fullTranscriptParts.join("\n");
  return analyzeText(fullText, onProgress);
};

// --- URL TRANSCRIPTION ---

export const transcribeUrl = async (
  url: string,
  onProgress?: (msg: string) => void,
  processLocalFile?: (file: File) => Promise<TranscriptionResult>
): Promise<TranscriptionResult> => {
  
  const isDirectMedia = /\.(mp3|wav|m4a|mp4|mov|ogg|flac|webm)$/i.test(url.split('?')[0]);
  if (isDirectMedia && processLocalFile) {
    onProgress?.("Baixando mídia direta para precisão de 100%...");
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      const file = new File([blob], url.split('/').pop() || 'media', { type: blob.type });
      return await processLocalFile(file);
    } catch (e) { console.warn("Fetch local falhou, usando Search..."); }
  }

  const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
  onProgress?.(isYouTube ? "Infiltrando no YouTube para coletar legendas literais..." : "Mapeando conteúdo da URL...");
  
  try {
    const prompt = isYouTube 
      ? `Acesse o vídeo: ${url}. 
         Sua missão é a extração TOTAL das legendas (SRT/VTT). 
         Eu preciso do texto LITERAL com os TIMESTAMPS originais. 
         Não resuma. Se o vídeo for longo, forneça a transcrição organizada por blocos de tempo [MM:SS]. 
         Retorne o texto completo falado no vídeo.`
      : `URL: ${url}. Extraia a transcrição palavra por palavra de qualquer mídia ou texto longo presente. Inclua timestamps [MM:SS] se houver áudio.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        tools: [{ googleSearch: {} }],
      },
    });

    const fullText = response.text || "";
    if (fullText.length < 150) throw new Error("Conteúdo insuficiente para transcrição literal.");

    onProgress?.("Estruturando dados finais...");
    return await analyzeText(fullText, onProgress);
  } catch (error: any) {
    throw new Error("Não foi possível extrair a transcrição literal deste link. Tente baixar o vídeo e fazer o upload do arquivo para precisão total.");
  }
};

async function analyzeText(text: string, onProgress?: (msg: string) => void): Promise<TranscriptionResult> {
  onProgress?.("Gerando Inteligência Brutal...");
  
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      summary: { type: Type.STRING },
      keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
      speakers: { type: Type.ARRAY, items: { type: Type.STRING } },
      suggestedTitle: { type: Type.STRING },
    },
    required: ["summary", "keyPoints", "speakers", "suggestedTitle"],
  };

  const analysisResponse = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts: [{ text: `TEXTO:\n${text}` }] },
    config: {
      systemInstruction: "Analise esta transcrição brutal. Crie um título foda, um resumo denso, pontos de impacto e identifique quem falou.",
      responseMimeType: "application/json",
      responseSchema: responseSchema,
    },
  });

  const metadata = JSON.parse(analysisResponse.text || "{}");
  return {
    text: text,
    summary: metadata.summary,
    keyPoints: metadata.keyPoints,
    speakers: metadata.speakers,
    suggestedTitle: metadata.suggestedTitle,
  };
}
