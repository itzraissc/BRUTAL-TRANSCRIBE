
export interface TranscriptionResult {
  text: string;
  summary: string;
  keyPoints: string[];
  speakers: string[];
}

export type ProcessingStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

export interface FileMetadata {
  name: string;
  size: number;
  type: string;
}
