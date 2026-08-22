export type FileCategory = 'all' | 'pdf' | 'image' | 'video' | 'audio';

export type ToolMode =
  | 'compress'
  | 'merge_pdf'
  | 'scan_document'
  | 'images_to_pdf'
  | 'split_pdf'
  | 'watermark_pdf';

export type CompressionLevel = 'low' | 'medium' | 'high';

export type CompressionPreset = 'custom' | 'web' | 'email' | 'social' | 'archive' | 'max_quality';

export interface UploadedFileInfo {
  file: File;
  name: string;
  size: number; // in bytes
  type: string;
  category: 'pdf' | 'image' | 'video' | 'audio';
  previewUrl?: string;
  lastModified: number;
}

export interface CompressionSettings {
  level: CompressionLevel;
  preset?: CompressionPreset;
  outputFormat: string; // 'original' | 'image/webp' | 'image/jpeg' | 'image/png' | 'audio/mp3' | 'audio/wav'
  scalePercent: number; // 50 to 100
  removeMetadata: boolean;
  targetSizeBytes?: number; // Target exact file size limit in bytes (e.g. 4MB -> 4 * 1024 * 1024)
  targetDpi?: number; // for pdf (72, 96, 120, 150, 200, 300)
  imageQuality?: number; // 20 to 100 (e.g. 40, 65, 85)
  pdfMode?: 'raster_downsample' | 'lossless_stream'; // default raster_downsample for real size reduction
  grayscale?: boolean; // convert color pages/scans to grayscale for massive reduction
  audioBitrate?: number; // in kbps (e.g. 64, 96, 128, 192)
}

export interface BatchItem {
  id: string;
  fileInfo: UploadedFileInfo;
  settings?: CompressionSettings;
  status: 'pending' | 'processing' | 'compressing' | 'completed' | 'error';
  progress: number;
  result?: CompressionResult;
  error?: string;
}

export interface CompressionStageInfo {
  title: string;
  detail: string;
  progressRange: [number, number];
}

export interface CompressionResult {
  id: string;
  originalFile: UploadedFileInfo;
  compressedBlob: Blob;
  compressedSize: number;
  compressedName: string;
  savedBytes: number;
  savedPercentage: number;
  reductionRatio: string;
  processingTimeSec: number;
  compressedPreviewUrl?: string;
  settings: CompressionSettings;
  timestamp: number;
  pdfPageCount?: number;
}

export interface IssueReport {
  id: string;
  category: 'compression_bug' | 'file_error' | 'performance' | 'ui_glitch' | 'feature_request' | 'other';
  subject: string;
  description: string;
  userEmail?: string;
  userName?: string;
  fileType?: string;
  fileSizeApprox?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  browserInfo: string;
  createdAt: number;
  status: 'submitted' | 'acknowledged';
}

/* --- Merge PDF Types --- */
export interface MergePdfItem {
  id: string;
  file: File;
  name: string;
  size: number;
  pageCount: number;
}

/* --- Document Scanner Types --- */
export type ScanFilterMode = 'auto_enhance' | 'clean_bw' | 'grayscale' | 'original';

export interface ScannedPage {
  id: string;
  dataUrl: string;
  blob: Blob;
  width: number;
  height: number;
  rotation: number; // 0, 90, 180, 270
  filter: ScanFilterMode;
  originalDataUrl: string;
}

/* --- Images to PDF Types --- */
export interface ImageToPdfItem {
  id: string;
  file: File;
  dataUrl: string;
  name: string;
  size: number;
  width: number;
  height: number;
}

export interface ImageToPdfSettings {
  orientation: 'portrait' | 'landscape' | 'fit';
  pageSize: 'a4' | 'letter' | 'fit';
  margin: 'none' | 'small' | 'large';
  quality: number;
}

/* --- Split PDF Types --- */
export interface SplitPdfSettings {
  mode: 'ranges' | 'all_pages';
  pageRanges: string; // e.g. "1-3, 5, 7-9"
}

/* --- Watermark PDF Types --- */
export interface WatermarkPdfSettings {
  text: string;
  opacity: number; // 0.1 to 1.0
  fontSize: number; // 24 to 72
  rotationDegrees: number; // 0, 45, -45, 90
  color: 'gray' | 'red' | 'blue' | 'black';
  position: 'center' | 'bottom' | 'top';
}

/* --- Search Command Palette Types --- */
export interface SearchToolItem {
  id: ToolMode;
  name: string;
  category: 'PDF Tools' | 'Compression' | 'Scanning & Conversion';
  description: string;
  badge?: string;
  keywords: string[];
  iconName: string;
  targetCategory?: FileCategory;
}

