export type WordJobState =
  | 'queued'
  | 'processing'
  | 'validating'
  | 'completed'
  | 'failed'
  | 'expired';

export interface WordConversionJobData {
  jobId: string;
  originalFileName: string;
  originalSize: number;
  inputExtension: 'docx' | 'doc';
  mimeType: string;
  inputFilePath: string;
  outputFilePath: string;
  workDir: string;
  createdAt: number;
}

export interface WordConversionJobResult {
  jobId: string;
  originalFileName: string;
  originalSize: number;
  outputFileName: string;
  outputFilePath: string;
  outputSize: number;
  pageCount: number;
  durationMs: number;
  downloadUrl: string;
  createdAt: number;
}

export interface WordJobStatusResponse {
  jobId: string;
  status: WordJobState;
  progress: number;
  message?: string;
  result?: WordConversionJobResult;
  error?: string;
}

export interface ConversionLogger {
  info(message: string, meta?: Record<string, any>): void;
  warn(message: string, meta?: Record<string, any>): void;
  error(message: string, meta?: Record<string, any>): void;
}
