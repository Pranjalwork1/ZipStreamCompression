/**
 * ZipStream OCR & Searchable PDF Subsystem Types
 */

export type OcrLanguageCode = 'eng' | 'hin' | 'eng+hin' | 'hin+eng' | 'fra' | 'deu' | 'spa';

export type OcrMode = 'auto' | 'force' | 'skip';

export type OcrJobStatus =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'expired'
  | 'cancelled';

export interface OcrOptions {
  language: OcrLanguageCode;
  mode: OcrMode;
  deskew: boolean;
  rotate: boolean;
  timeoutSec?: number;
}

export interface OcrJob {
  jobId: string;
  userId?: string;
  status: OcrJobStatus;
  originalFileName: string;
  originalSize: number;
  outputSize?: number;
  pageCount?: number;
  durationSec?: number;
  language: string;
  downloadToken: string;
  createdAt: number;
  expiresAt: number;
  error?: string;
  errorCode?: string;
  outputPath?: string;
}

export interface OcrLanguageMeta {
  code: OcrLanguageCode;
  label: string;
  installed: boolean;
  script: string;
}

export const SUPPORTED_OCR_LANGUAGES: Record<OcrLanguageCode, OcrLanguageMeta> = {
  eng: { code: 'eng', label: 'English', installed: true, script: 'Latin' },
  hin: { code: 'hin', label: 'Hindi (हिन्दी)', installed: true, script: 'Devanagari' },
  'eng+hin': { code: 'eng+hin', label: 'English + Hindi', installed: true, script: 'Multilingual' },
  'hin+eng': { code: 'hin+eng', label: 'Hindi + English', installed: true, script: 'Multilingual' },
  fra: { code: 'fra', label: 'French (Français)', installed: true, script: 'Latin' },
  deu: { code: 'deu', label: 'German (Deutsch)', installed: true, script: 'Latin' },
  spa: { code: 'spa', label: 'Spanish (Español)', installed: true, script: 'Latin' },
};
