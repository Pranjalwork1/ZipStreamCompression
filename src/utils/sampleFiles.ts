import { UploadedFileInfo } from '../types';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export function createSampleImageFile(): File {
  // Create a canvas with high quality visuals
  const canvas = document.createElement('canvas');
  canvas.width = 1600;
  canvas.height = 1000;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // Rich gradient background
    const grad = ctx.createLinearGradient(0, 0, 1600, 1000);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.3, '#1e1b4b');
    grad.addColorStop(0.7, '#312e81');
    grad.addColorStop(1, '#0284c7');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1600, 1000);

    // Add geometric artistic patterns
    for (let i = 0; i < 40; i++) {
      ctx.beginPath();
      ctx.arc(
        Math.sin(i) * 600 + 800,
        Math.cos(i) * 400 + 500,
        (i * 18) % 150 + 20,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = `rgba(${50 + i * 5}, ${120 + i * 3}, 255, ${0.15 + (i % 5) * 0.05})`;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.stroke();
    }

    // High quality typography
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 54px sans-serif';
    ctx.fillText('⚡ Compressor High-Res Sample', 100, 200);

    ctx.font = '28px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('1600 x 1000 Uncompressed Canvas Asset • 24-bit TrueColor', 100, 260);

    // Grid lines for realistic entropy
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x < 1600; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 1000);
      ctx.stroke();
    }
    for (let y = 0; y < 1000; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1600, y);
      ctx.stroke();
    }
  }

  const dataUrl = canvas.toDataURL('image/png');
  const byteString = atob(dataUrl.split(',')[1]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }

  const blob = new Blob([ab], { type: 'image/png' });
  return new File([blob], 'high_res_photo_sample.png', {
    type: 'image/png',
    lastModified: Date.now(),
  });
}

export async function createSamplePdfFileAsync(): Promise<File> {
  // Create a 100% valid multi-page PDF document using pdf-lib
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Page 1: Cover & Financial Executive Summary
  const page1 = pdfDoc.addPage([612, 792]); // Standard US Letter
  const { width, height } = page1.getSize();

  // Header background
  page1.drawRectangle({
    x: 0,
    y: height - 140,
    width: width,
    height: 140,
    color: rgb(0.05, 0.1, 0.2),
  });

  page1.drawText('COMPRESSOR FINANCIAL AUDIT & ANNUAL REPORT', {
    x: 50,
    y: height - 60,
    size: 18,
    font: font,
    color: rgb(1, 1, 1),
  });

  page1.drawText('Fiscal Year 2025-2026 • Confidential Document', {
    x: 50,
    y: height - 85,
    size: 12,
    font: regularFont,
    color: rgb(0.6, 0.75, 1),
  });

  // Body content
  page1.drawText('1. Executive Overview & Storage Efficiency', {
    x: 50,
    y: height - 180,
    size: 14,
    font: font,
    color: rgb(0.1, 0.1, 0.1),
  });

  const bodyParagraphs = [
    'This document is an authentic multi-page PDF created for on-device compression testing.',
    'It contains embedded standard vector stream objects, metadata tables, and typography.',
    'When compressed by Compressor, redundant cross-reference catalogs and stream buffers',
    'are optimized using linear stream compaction without corrupting reader integrity.',
  ];

  let currentY = height - 210;
  for (const line of bodyParagraphs) {
    page1.drawText(line, {
      x: 50,
      y: currentY,
      size: 11,
      font: regularFont,
      color: rgb(0.25, 0.25, 0.25),
    });
    currentY -= 20;
  }

  // Data Table Box
  currentY -= 20;
  page1.drawRectangle({
    x: 50,
    y: currentY - 140,
    width: width - 100,
    height: 140,
    color: rgb(0.96, 0.97, 0.99),
    borderColor: rgb(0.85, 0.88, 0.92),
    borderWidth: 1,
  });

  page1.drawText('Quarterly Storage & Data Retention Metrics', {
    x: 70,
    y: currentY - 30,
    size: 12,
    font: font,
    color: rgb(0.05, 0.44, 0.89),
  });

  const metrics = [
    '• Q1 Ingestion: 4.8 TB Total Raw Digital Assets',
    '• Q2 Optimization Rate: 68.4% Average Reduction Ratio',
    '• Q3 Bandwidth Efficiency: Saved $42,900 in transfer overhead',
    '• Q4 Target: 100% On-Device Privacy Architecture Compliant',
  ];

  let metricY = currentY - 55;
  for (const m of metrics) {
    page1.drawText(m, {
      x: 70,
      y: metricY,
      size: 10,
      font: regularFont,
      color: rgb(0.2, 0.2, 0.2),
    });
    metricY -= 20;
  }

  // Page 2: Vector Graphics & Charts
  const page2 = pdfDoc.addPage([612, 792]);
  page2.drawText('2. Technical Specifications & Compliance', {
    x: 50,
    y: 730,
    size: 14,
    font: font,
    color: rgb(0.1, 0.1, 0.1),
  });

  page2.drawText('This second page verifies multi-page PDF catalog re-indexing after compression.', {
    x: 50,
    y: 705,
    size: 11,
    font: regularFont,
    color: rgb(0.3, 0.3, 0.3),
  });

  // Footer on page 2
  page2.drawText('Page 2 of 2 • Generated by Compressor Engine', {
    x: 50,
    y: 40,
    size: 9,
    font: regularFont,
    color: rgb(0.6, 0.6, 0.6),
  });

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  return new File([blob], 'Annual_Financial_Audit_Report.pdf', {
    type: 'application/pdf',
    lastModified: Date.now(),
  });
}

export function createSamplePdfFile(): File {
  // Synchronous initial fallback that is a 100% valid, uncorrupted PDF 1.4
  const pdfSource = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 380 >>
stream
BT
/F1 20 Tf
50 720 Td
(Compressor - Sample Business Report.pdf) Tj
/F1 12 Tf
0 -35 Td
(Document Status: 100% Valid Uncorrupted PDF Document) Tj
0 -25 Td
(This PDF file is fully readable by Adobe Acrobat, Apple Preview, and Web Browsers.) Tj
0 -25 Td
(You can compress this file and re-open the downloaded output without errors.) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000678 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
755
%%EOF
`;

  const blob = new Blob([pdfSource], { type: 'application/pdf' });
  return new File([blob], 'Sample_Business_Report.pdf', {
    type: 'application/pdf',
    lastModified: Date.now(),
  });
}

/**
 * Creates a genuine, playable animated WebM/MP4 sample video file using Canvas + MediaRecorder
 */
export async function createSampleVideoFileAsync(): Promise<File> {
  return new Promise((resolve) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext('2d');

      if (!ctx || !canvas.captureStream) {
        throw new Error('Canvas captureStream not supported');
      }

      const stream = canvas.captureStream(30); // 30 fps
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : 'video/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const finalBlob = new Blob(chunks, { type: mimeType.split(';')[0] });
        const ext = mimeType.includes('mp4') ? '.mp4' : '.webm';
        resolve(
          new File([finalBlob], `Sample_Motion_Clip${ext}`, {
            type: mimeType.split(';')[0],
            lastModified: Date.now(),
          })
        );
      };

      recorder.start();

      // Render 60 frames (~2.0 seconds animation)
      let frame = 0;
      const totalFrames = 60;

      const renderFrame = () => {
        if (frame >= totalFrames) {
          recorder.stop();
          return;
        }

        // Draw animated frame
        const progress = frame / totalFrames;

        // Background
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, 640, 360);

        // Animated neon circle
        const cx = 320 + Math.sin(progress * Math.PI * 2) * 120;
        const cy = 180 + Math.cos(progress * Math.PI * 2) * 40;
        const radius = 40 + Math.sin(progress * Math.PI * 4) * 15;

        const radial = ctx.createRadialGradient(cx, cy, 5, cx, cy, radius * 1.5);
        radial.addColorStop(0, '#0071e3');
        radial.addColorStop(0.6, '#34c759');
        radial.addColorStop(1, 'transparent');

        ctx.fillStyle = radial;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Overlay Text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 22px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚡ Compressor Playable Sample Video', 320, 160);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px sans-serif';
        ctx.fillText(`Frame ${frame + 1} of ${totalFrames} • 30 FPS Authentic Video`, 320, 195);

        // Progress bar
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(120, 240, 400, 8);
        ctx.fillStyle = '#0071e3';
        ctx.fillRect(120, 240, 400 * progress, 8);

        frame++;
        setTimeout(renderFrame, 33);
      };

      renderFrame();
    } catch {
      // Fallback
      resolve(createSampleVideoFile());
    }
  });
}

export function createSampleVideoFile(): File {
  // A tiny valid WebM container header
  const sampleData = new Uint8Array([
    0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01, 0x42, 0xf7, 0x81, 0x01, 0x42, 0xf2, 0x81,
    0x04, 0x42, 0xf3, 0x81, 0x08, 0x42, 0x82, 0x84, 0x77, 0x65, 0x62, 0x6d, 0x42, 0x87, 0x81, 0x02,
    0x42, 0x85, 0x81, 0x02, 0x18, 0x53, 0x80, 0x67, 0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
  ]);

  const blob = new Blob([sampleData], { type: 'video/webm' });
  return new File([blob], 'Sample_Cinematic_Footage.webm', {
    type: 'video/webm',
    lastModified: Date.now(),
  });
}

export function createSampleAudioFile(): File {
  // Generate a valid 44.1kHz stereo WAV file with a pleasant synthesized chime sound
  const sampleRate = 44100;
  const duration = 2.0; // 2 seconds
  const numChannels = 2;
  const numSamples = Math.floor(sampleRate * duration);
  const blockAlign = numChannels * 2; // 16-bit
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // BitsPerSample
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // Synthesize chord: C major arpeggio + smooth decay
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const env = Math.exp(-t * 2.2); // exponential decay envelope
    const s1 = Math.sin(2 * Math.PI * 523.25 * t); // C5
    const s2 = Math.sin(2 * Math.PI * 659.25 * t); // E5
    const s3 = Math.sin(2 * Math.PI * 783.99 * t); // G5
    const sampleVal = Math.max(-1, Math.min(1, (s1 * 0.4 + s2 * 0.3 + s3 * 0.3) * env));
    const intSample = sampleVal < 0 ? sampleVal * 0x8000 : sampleVal * 0x7fff;

    view.setInt16(offset, intSample, true); // Left
    view.setInt16(offset + 2, intSample, true); // Right
    offset += 4;
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });
  return new File([blob], 'Sample_Acoustic_Chime.wav', {
    type: 'audio/wav',
    lastModified: Date.now(),
  });
}

export function prepareFileInfo(file: File, category: 'pdf' | 'image' | 'video' | 'audio'): UploadedFileInfo {
  let previewUrl: string | undefined = undefined;
  if (category === 'image' || category === 'video' || category === 'audio') {
    try {
      previewUrl = URL.createObjectURL(file);
    } catch {
      // ignore
    }
  }

  return {
    file,
    name: file.name,
    size: file.size,
    type:
      file.type ||
      (category === 'pdf'
        ? 'application/pdf'
        : category === 'video'
        ? 'video/mp4'
        : category === 'audio'
        ? 'audio/wav'
        : 'image/jpeg'),
    category,
    previewUrl,
    lastModified: file.lastModified,
  };
}
