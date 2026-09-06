import type { UploadedFileInfo } from '../types';

export function prepareFileInfo(file: File, category: 'pdf' | 'image' | 'video' | 'audio'): UploadedFileInfo {
  let previewUrl: string | undefined;
  if (category !== 'pdf') {
    try { previewUrl = URL.createObjectURL(file); } catch { /* preview is optional */ }
  }
  return {
    file,
    name: file.name,
    size: file.size,
    type: file.type || (category === 'pdf' ? 'application/pdf' : category === 'video' ? 'video/mp4' : category === 'audio' ? 'audio/wav' : 'image/jpeg'),
    category,
    previewUrl,
    lastModified: file.lastModified,
  };
}
