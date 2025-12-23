
import { GoogleGenAI, Type } from "@google/genai";
import { TranscriptionResult } from "../types";

export const transcribeFile = async (
  fileBase64: string,
  mimeType: string
): Promise<TranscriptionResult> => {
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    throw new Error("Chave de API não configurada. Verifique as variáveis de ambiente.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const systemInstruction = `
    Você é um motor de análise linguística de ultra-performance.
    Sua missão é extrair cada palavra com fidelidade absoluta e organizar os metadados.
    
    REGRAS OBRIGATÓRIAS:
    1. Transcrição COMPLETA, literal e sem omissões em PORTUGUÊS (Brasil).
    2. Identificação precisa de palestrantes.
    3. Resumo executivo de alto nível.
    4. Lista detalhada de insights.
    5. Crie um TÍTULO CURTO e direto (máximo 5 palavras) que resuma o tema para ser usado como nome de arquivo.
    
    ESTRUTURA DE SAÍDA:
    Você deve responder EXCLUSIVAMENTE em formato JSON seguindo o schema fornecido.
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
            text: "Analise este arquivo de áudio. Transcreva-o e gere os metadados incluindo um título curto para o arquivo.",
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
              description: "A transcrição literal completa.",
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
            suggestedTitle: {
              type: Type.STRING,
              description: "Título curto e limpo de 3 a 5 palavras para o arquivo.",
            },
          },
          required: ["text", "summary", "keyPoints", "speakers", "suggestedTitle"],
        },
      },
    });

    if (!response.text) {
      throw new Error("A IA retornou uma resposta vazia.");
    }

    return JSON.parse(response.text.trim());
  } catch (error: any) {
    console.error("Erro na transcrição:", error);
    throw new Error(error.message || "Erro no motor de IA.");
  }
};
