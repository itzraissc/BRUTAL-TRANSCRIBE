
export interface TranscriptionResult {
  text: string;
  summary: string;
  keyPoints: string[];
  speakers: string[];
  suggestedTitle: string;
  sourceUrls?: { web: { uri: string; title: string } }[];
}

export type ProcessingStatus = 'idle' | 'optimizing' | 'uploading' | 'processing' | 'success' | 'error';

export interface FileMetadata {
  name: string;
  size?: number;
  type?: string;
}

export interface QueueItem {
  id: string;
  sourceType: 'file' | 'url';
  file?: File;
  url?: string;
  status: ProcessingStatus;
  progressMsg: string;
  result: TranscriptionResult | null;
  error: string | null;
  createdAt: number;
  expanded: boolean;
}
