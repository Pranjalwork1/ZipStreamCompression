export type FileCategory = 'image' | 'pdf' | 'audio' | 'video' | 'archive' | 'other';

export type CompressionPreset = 'balanced' | 'maximum' | 'high_quality' | 'email' | 'web_optimized' | 'custom';

export type OutputFormat = 'original' | 'webp' | 'jpeg' | 'png' | 'mp3' | 'mp4' | 'pdf';

export interface CompressionSettings {
  preset: CompressionPreset;
  quality: number; // 0.1 to 1.0 (e.g. 0.75 for 75%)
  scale: number; // 0.1 to 1.0 (e.g. 0.8 for 80% resolution)
  targetFormat: OutputFormat;
  stripMetadata: boolean;
  maxTargetSizeMB?: number;
  audioBitrate?: number; // kbps, e.g. 128
  videoFps?: number; // e.g. 30, 24
}

export type FileStatus = 'pending' | 'compressing' | 'completed' | 'failed';

export interface CompressibleFile {
  id: string;
  file: File;
  name: string;
  originalSize: number;
  category: FileCategory;
  mimeType: string;
  previewUrl?: string;
  compressedBlob?: Blob;
  compressedSize?: number;
  compressedUrl?: string;
  savingsPercent?: number;
  status: FileStatus;
  progress: number;
  error?: string;
  settings: CompressionSettings;
  durationMs?: number;
}

export interface IssueReportPayload {
  category: 'file_error' | 'compression_quality' | 'slow_performance' | 'ui_bug' | 'feature_request' | 'other';
  subject: string;
  description: string;
  userName?: string;
  userEmail?: string;
  fileType?: string;
  fileSizeApprox?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  browserInfo?: string;
}
