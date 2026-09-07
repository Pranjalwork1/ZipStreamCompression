import type { UploadedFileInfo } from '../types';

export function prepareFileInfo(file: File, category: 'pdf' | 'image' | 'video' | 'audio' | 'document'): UploadedFileInfo {
  let previewUrl: string | undefined;
  if (category !== 'pdf') {
    try { previewUrl = URL.createObjectURL(file); } catch { /* preview is optional */ }
  }
  return {
    file,
    name: file.name,
    size: file.size,
    type: file.type || (category === 'pdf' ? 'application/pdf' : category === 'video' ? 'video/mp4' : category === 'audio' ? 'audio/wav' : category === 'document' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'image/jpeg'),
    category,
    previewUrl,
    lastModified: file.lastModified,
  };
}
