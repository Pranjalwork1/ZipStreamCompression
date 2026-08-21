import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { CompressibleFile, CompressionSettings } from '../types';

/**
 * Compress an Image file using HTML5 Canvas
 */
export async function compressImage(
  file: File,
  settings: CompressionSettings,
  onProgress?: (p: number) => void
): Promise<{ blob: Blob; mimeType: string; extension: string }> {
  return new Promise((resolve, reject) => {
    onProgress?.(15);
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      onProgress?.(40);

      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { alpha: true });

        if (!ctx) {
          throw new Error('Canvas 2D context not available');
        }

        // Calculate scaled dimensions
        const scale = settings.scale || 1;
        const targetWidth = Math.max(1, Math.round(img.naturalWidth * scale));
        const targetHeight = Math.max(1, Math.round(img.naturalHeight * scale));

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // Apply smooth downsampling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        onProgress?.(70);

        // Determine output MIME type
        let outputMime = file.type;
        let ext = 'jpg';

        if (settings.targetFormat === 'webp') {
          outputMime = 'image/webp';
          ext = 'webp';
        } else if (settings.targetFormat === 'jpeg') {
          outputMime = 'image/jpeg';
          ext = 'jpg';
        } else if (settings.targetFormat === 'png') {
          outputMime = 'image/png';
          ext = 'png';
        } else {
          // original format or fallback
          if (file.type.includes('png')) {
            outputMime = 'image/png';
            ext = 'png';
          } else if (file.type.includes('webp')) {
            outputMime = 'image/webp';
            ext = 'webp';
          } else {
            outputMime = 'image/jpeg';
            ext = 'jpg';
          }
        }

        const quality = settings.quality ?? 0.75;

        canvas.toBlob(
          (blob) => {
            onProgress?.(100);
            if (blob) {
              // If compressed blob is somehow bigger than original and we didn't change format/dimensions, keep original
              if (blob.size > file.size && scale === 1 && settings.targetFormat === 'original') {
                resolve({ blob: file, mimeType: file.type, extension: ext });
              } else {
                resolve({ blob, mimeType: outputMime, extension: ext });
              }
            } else {
              reject(new Error('Failed to generate image blob'));
            }
          },
          outputMime,
          quality
        );
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for compression'));
    };

    img.src = objectUrl;
  });
}

/**
 * Compress a PDF file using pdf-lib
 */
export async function compressPdf(
  file: File,
  settings: CompressionSettings,
  onProgress?: (p: number) => void
): Promise<{ blob: Blob; mimeType: string; extension: string }> {
  onProgress?.(20);
  const arrayBuffer = await file.arrayBuffer();
  
  onProgress?.(45);
  // Load PDF with pdf-lib
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

  onProgress?.(65);
  // Strip metadata if requested
  if (settings.stripMetadata) {
    pdfDoc.setTitle('');
    pdfDoc.setAuthor('');
    pdfDoc.setSubject('');
    pdfDoc.setKeywords([]);
    pdfDoc.setProducer('');
    pdfDoc.setCreator('');
  }

  onProgress?.(85);
  // Save with compressed object streams
  const pdfBytes = await pdfDoc.save({
    useObjectStreams: true,
    addDefaultPage: false,
    objectsPerTick: 50,
  });

  onProgress?.(100);
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  return { blob, mimeType: 'application/pdf', extension: 'pdf' };
}

/**
 * Compress an Audio file via Web Audio API & MediaRecorder / Downsampling
 */
export async function compressAudio(
  file: File,
  settings: CompressionSettings,
  onProgress?: (p: number) => void
): Promise<{ blob: Blob; mimeType: string; extension: string }> {
  onProgress?.(20);
  
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const arrayBuffer = await file.arrayBuffer();
    onProgress?.(45);

    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    onProgress?.(70);

    // If MediaRecorder is supported for audio/webm or audio/mp4
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/ogg';

    // Downsample to 22050 or 32000 if quality is low
    const targetSampleRate = settings.quality < 0.6 ? 22050 : 44100;
    const offlineContext = new OfflineAudioContext(
      settings.quality < 0.5 ? 1 : Math.min(2, audioBuffer.numberOfChannels),
      Math.ceil(audioBuffer.duration * targetSampleRate),
      targetSampleRate
    );

    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineContext.destination);
    source.start(0);

    const renderedBuffer = await offlineContext.startRendering();
    onProgress?.(85);

    // Convert AudioBuffer to WAV
    const wavBlob = audioBufferToWav(renderedBuffer);
    onProgress?.(100);

    if (wavBlob.size < file.size) {
      return { blob: wavBlob, mimeType: 'audio/wav', extension: 'wav' };
    }
    return { blob: file, mimeType: file.type, extension: 'audio' };
  } catch (err) {
    console.warn('Audio compression fallback:', err);
    return { blob: file, mimeType: file.type, extension: 'audio' };
  }
}

/**
 * Helper to encode AudioBuffer into a WAV Blob
 */
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const out = new DataView(new ArrayBuffer(length));
  const channels: Float32Array[] = [];
  let sample: number;
  let offset = 0;
  let pos = 0;

  function setUint16(data: number) {
    out.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number) {
    out.setUint32(pos, data, true);
    pos += 4;
  }

  // write WAVE header
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"

  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // length = 16
  setUint16(1); // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2); // block-align
  setUint16(16); // 16-bit
  setUint32(0x61746164); // "data" - chunk
  setUint32(length - pos - 4); // chunk length

  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (offset < buffer.length) {
    for (let i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      out.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([out], { type: 'audio/wav' });
}

/**
 * Compress a Video file via Canvas & MediaRecorder
 */
export async function compressVideo(
  file: File,
  settings: CompressionSettings,
  onProgress?: (p: number) => void
): Promise<{ blob: Blob; mimeType: string; extension: string }> {
  return new Promise((resolve, reject) => {
    onProgress?.(10);
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      onProgress?.(25);
      const scale = settings.scale || 0.75;
      const targetWidth = Math.max(320, Math.floor((video.videoWidth * scale) / 2) * 2);
      const targetHeight = Math.max(240, Math.floor((video.videoHeight * scale) / 2) * 2);

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        URL.revokeObjectURL(url);
        return resolve({ blob: file, mimeType: file.type, extension: 'mp4' });
      }

      const stream = canvas.captureStream(settings.videoFps || 24);
      let mimeType = 'video/webm;codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }

      const bitrate = Math.max(250000, Math.floor((settings.quality || 0.7) * 2000000));
      let recorder: MediaRecorder;

      try {
        recorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: bitrate,
        });
      } catch {
        recorder = new MediaRecorder(stream);
      }

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        URL.revokeObjectURL(url);
        onProgress?.(100);
        const compressedBlob = new Blob(chunks, { type: mimeType });
        if (compressedBlob.size < file.size) {
          resolve({ blob: compressedBlob, mimeType, extension: 'webm' });
        } else {
          resolve({ blob: file, mimeType: file.type, extension: 'mp4' });
        }
      };

      video.ontimeupdate = () => {
        if (video.duration > 0) {
          const pct = Math.min(95, 25 + Math.floor((video.currentTime / video.duration) * 70));
          onProgress?.(pct);
        }
        ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
      };

      video.onended = () => {
        setTimeout(() => recorder.stop(), 200);
      };

      recorder.start(100);
      video.play().catch((err) => {
        console.warn('Video play error during compression:', err);
        URL.revokeObjectURL(url);
        resolve({ blob: file, mimeType: file.type, extension: 'mp4' });
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load video file for processing'));
    };

    video.src = url;
  });
}

/**
 * Main dispatcher to compress any file item
 */
export async function compressFile(
  item: CompressibleFile,
  onProgress?: (progress: number) => void
): Promise<{ blob: Blob; mimeType: string; extension: string }> {
  switch (item.category) {
    case 'image':
      return compressImage(item.file, item.settings, onProgress);
    case 'pdf':
      return compressPdf(item.file, item.settings, onProgress);
    case 'audio':
      return compressAudio(item.file, item.settings, onProgress);
    case 'video':
      return compressVideo(item.file, item.settings, onProgress);
    case 'archive':
    default:
      // For general archives, return original or package into zip
      onProgress?.(100);
      return { blob: item.file, mimeType: item.file.type, extension: 'bin' };
  }
}

/**
 * Create a ZIP bundle of multiple compressed files using JSZip
 */
export async function createZipBundle(
  files: { name: string; blob: Blob }[],
  onProgress?: (p: number) => void
): Promise<Blob> {
  const zip = new JSZip();

  files.forEach(({ name, blob }) => {
    zip.file(name, blob);
  });

  return await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 },
    },
    (metadata) => {
      onProgress?.(Math.round(metadata.percent));
    }
  );
}
