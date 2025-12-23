
import { GoogleGenAI, Type } from "@google/genai";
import { TranscriptionResult } from "../types";

const API_KEY = process.env.API_KEY || "";

export const transcribeFile = async (
  fileBase64: string,
  mimeType: string
): Promise<TranscriptionResult> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  const systemInstruction = `
    Você é um motor de análise linguística de ultra-performance, otimizado para arquivos longos e complexos.
    Sua missão é extrair cada palavra com fidelidade absoluta, independentemente da duração do arquivo.
    
    REGRAS OBRIGATÓRIAS:
    1. Transcrição COMPLETA, literal e sem omissões em PORTUGUÊS (Brasil).
    2. Identificação precisa de palestrantes (Palestrante 1, Palestrante 2, etc).
    3. Resumo executivo de alto nível focado nos pontos centrais da conversa.
    4. Lista detalhada de insights e decisões tomadas durante o áudio.
    
    ESTRUTURA DE SAÍDA:
    Você deve responder EXCLUSIVAMENTE em formato JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              data: fileBase64,
              mimeType: mimeType,
            },
          },
          {
            text: "Analise este arquivo de mídia por completo. Forneça a transcrição na íntegra, um resumo e os pontos principais em português brasileiro.",
          },
        ],
      },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: {
              type: Type.STRING,
              description: "A transcrição literal completa, organizada por parágrafos.",
            },
            summary: {
              type: Type.STRING,
              description: "Resumo executivo do conteúdo.",
            },
            keyPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Tópicos principais e insights.",
            },
            speakers: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Identificação dos participantes.",
            },
          },
          required: ["text", "summary", "keyPoints", "speakers"],
        },
      },
    });

    const jsonStr = response.text || "";
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Erro na transcrição:", error);
    throw new Error("Erro no motor de IA. Isso pode acontecer se o arquivo for muito pesado para a memória do navegador ou se houver instabilidade na API.");
  }
};
