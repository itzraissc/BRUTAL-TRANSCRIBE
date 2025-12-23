
export interface TranscriptionResult {
  text: string;
  summary: string;
  keyPoints: string[];
  speakers: string[];
  suggestedTitle: string;
}

export type ProcessingStatus = 'idle' | 'optimizing' | 'uploading' | 'processing' | 'success' | 'error';

export interface FileMetadata {
  name: string;
  size: number;
  type: string;
}
