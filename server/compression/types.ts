export type FileCategory = 'pdf' | 'image' | 'video' | 'audio';

export interface CompressionJobData {
  jobId: string;
  originalFileName: string;
  originalSize: number;
  mimeType: string;
  category: FileCategory;
  inputFilePath: string;
  outputFilePath: string;
  options?: {
    level?: 'low' | 'medium' | 'high';
    targetSizeBytes?: number;
    // Format-specific overrides
    imageFormat?: 'webp' | 'jpeg';
    videoCodec?: 'libx264' | 'libx265';
    crf?: number;
    audioCodec?: 'mp3' | 'opus';
  };
  createdAt: number;
}

export interface CompressionJobResult {
  jobId: string;
  originalFileName: string;
  originalSize: number;
  compressedSize: number;
  savedBytes: number;
  reductionPercentage: number;
  outputFileName: string;
  outputFilePath: string;
  mimeType: string;
  category: FileCategory;
  downloadToken: string;
  durationMs: number;
}

export interface DetectedMime {
  mime: string;
  ext: string;
  category: FileCategory;
}
