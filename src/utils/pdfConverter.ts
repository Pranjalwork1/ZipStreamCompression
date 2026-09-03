import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import pptxgen from 'pptxgenjs';

// Ensure PDF.js worker is initialized safely
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
}

export interface ExtractedPageText {
  pageNumber: number;
  text: string;
  lines: string[];
  tables: string[][][];
}

export interface PdfConversionResult {
  title: string;
  totalPages: number;
  extractedText: string;
  markdownText: string;
  pages: ExtractedPageText[];
}

export interface JpgPageResult {
  pageNumber: number;
  dataUrl: string;
  blob: Blob;
  width: number;
  height: number;
}

export interface ExcelConversionResult {
  tableRows: string[][];
  headers: string[];
  csvContent: string;
  csvBlob: Blob;
  csvUrl: string;
  xlsBlob: Blob;
  xlsUrl: string;
  rowCount: number;
  columnCount: number;
}

export interface PptxSlideResult {
  slideNumber: number;
  title: string;
  bullets: string[];
  imageUrl: string;
}

export interface PptxConversionResult {
  pptxBlob: Blob;
  pptxUrl: string;
  slides: PptxSlideResult[];
  slideCount: number;
  zipBlob?: Blob;
  zipUrl?: string;
}

export interface EpubConversionResult {
  epubBlob: Blob;
  epubUrl: string;
  chapterCount: number;
  structuredData?: PdfConversionResult;
}

export interface WordConversionResult {
  docxBlob: Blob;
  docxUrl: string;
  docBlob: Blob;
  docUrl: string;
  structuredData?: PdfConversionResult;
}

/**
 * Extracts real text, lines, and layout structure from all pages of a PDF
 */
export async function extractPdfStructuredData(
  arrayBuffer: ArrayBuffer,
  onProgress?: (percent: number, status: string) => void
): Promise<PdfConversionResult> {
  onProgress?.(10, 'Initializing local PDF parser...');

  // Clone buffer to guarantee the caller's ArrayBuffer is never detached by PDF.js Web Worker transfer
  const bufferCopy = arrayBuffer.slice(0);

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(bufferCopy),
    useSystemFonts: true,
    cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
    cMapPacked: true,
  });

  const pdf = await loadingTask.promise;
  const totalPages = pdf.numPages;
  const pages: ExtractedPageText[] = [];
  const fullTextParts: string[] = [];
  const fullMarkdownParts: string[] = [];

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const percent = Math.round(10 + (pageNum / totalPages) * 70);
    onProgress?.(percent, `Extracting page ${pageNum} of ${totalPages}...`);

    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    // Group text items by vertical Y-coordinate to reconstruct genuine lines
    const lineGroups = new Map<number, Array<{ x: number; text: string; height: number; fontName: string }>>();
    
    for (const item of textContent.items as any[]) {
      if (!item.str || !item.str.trim()) continue;
      
      const transform = item.transform;
      const x = transform[4];
      const y = Math.round(transform[5] / 4) * 4; // Tolerance bucket
      const height = item.height || Math.abs(transform[0]) || 12;
      const fontName = item.fontName || '';
      
      if (!lineGroups.has(y)) {
        lineGroups.set(y, []);
      }
      lineGroups.get(y)!.push({ x, text: item.str, height, fontName });
    }

    // Sort lines from top (highest Y) to bottom (lowest Y)
    const sortedYKeys = Array.from(lineGroups.keys()).sort((a, b) => b - a);
    const reconstructedLines: string[] = [];
    const markdownLines: string[] = [];

    markdownLines.push(`## Page ${pageNum}\n`);

    let isPreviousTable = false;
    const detectedTableRows: string[][] = [];

    for (const y of sortedYKeys) {
      const itemsInLine = lineGroups.get(y)!.sort((a, b) => a.x - b.x);
      
      // Check if line looks like multiple columns
      if (itemsInLine.length >= 2 && itemsInLine.some(it => it.x > itemsInLine[0].x + 100)) {
        const rowCells = itemsInLine.map(it => it.text.trim()).filter(Boolean);
        if (rowCells.length >= 2) {
          detectedTableRows.push(rowCells);
          isPreviousTable = true;
        }
      } else {
        isPreviousTable = false;
      }

      // Combine text items with spacing
      let lineText = '';
      let lastX = 0;
      let isHeader = false;

      for (let i = 0; i < itemsInLine.length; i++) {
        const item = itemsInLine[i];
        if (i > 0 && item.x - lastX > 15) {
          lineText += '   '; // Tab space
        } else if (i > 0 && item.x - lastX > 4) {
          lineText += ' ';
        }
        lineText += item.text;
        lastX = item.x + (item.text.length * 5);

        if (item.height > 15 || /bold|heavy/i.test(item.fontName)) {
          isHeader = true;
        }
      }

      const trimmed = lineText.trim();
      if (trimmed) {
        reconstructedLines.push(trimmed);
        
        if (isHeader && trimmed.length < 80) {
          markdownLines.push(`### ${trimmed}\n`);
        } else if (/^[-*•]|\d+\./.test(trimmed)) {
          markdownLines.push(`- ${trimmed.replace(/^[-*•]\s*/, '')}`);
        } else {
          markdownLines.push(trimmed);
        }
      }
    }

    const pageRawText = reconstructedLines.join('\n');
    const pageMarkdown = markdownLines.join('\n');

    pages.push({
      pageNumber: pageNum,
      text: pageRawText,
      lines: reconstructedLines,
      tables: detectedTableRows.length > 0 ? [detectedTableRows] : [],
    });

    fullTextParts.push(`--- Page ${pageNum} ---\n` + pageRawText);
    fullMarkdownParts.push(pageMarkdown);
  }

  onProgress?.(90, 'Structuring layout and metadata...');

  let docTitle = 'Extracted Document';
  if (pages[0] && pages[0].lines.length > 0) {
    const candidateTitle = pages[0].lines[0];
    if (candidateTitle.length > 2 && candidateTitle.length < 90) {
      docTitle = candidateTitle;
    }
  }

  return {
    title: docTitle,
    totalPages,
    extractedText: fullTextParts.join('\n\n'),
    markdownText: fullMarkdownParts.join('\n\n'),
    pages,
  };
}

/**
 * Converts PDF pages to real high-resolution JPG images with multi-page ZIP export
 */
export async function convertPdfToJpgPages(
  arrayBuffer: ArrayBuffer,
  baseName: string,
  onProgress?: (percent: number, status: string) => void
): Promise<{
  pages: JpgPageResult[];
  zipBlob?: Blob;
  zipUrl?: string;
  singleBlobUrl: string;
  singleFileName: string;
}> {
  onProgress?.(10, 'Loading PDF for high-DPI raster rendering...');

  // Clone buffer to guarantee the caller's ArrayBuffer is never detached by PDF.js Web Worker transfer
  const bufferCopy = arrayBuffer.slice(0);

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(bufferCopy),
    useSystemFonts: true,
  });

  const pdf = await loadingTask.promise;
  const totalPages = pdf.numPages;
  const results: JpgPageResult[] = [];
  const zip = new JSZip();

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const percent = Math.round(15 + (pageNum / totalPages) * 75);
    onProgress?.(percent, `Rendering high-res JPEG page ${pageNum} of ${totalPages}...`);

    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.0 }); // 2x retina scale for crisp text

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d', { alpha: false });

    if (!ctx) throw new Error('Canvas 2D context creation failed');

    // Fill white background before rendering
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: ctx,
      viewport: viewport,
      background: 'rgb(255,255,255)',
    }).promise;

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    
    // Convert to Blob
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b || new Blob()), 'image/jpeg', 0.95);
    });

    results.push({
      pageNumber: pageNum,
      dataUrl,
      blob,
      width: viewport.width,
      height: viewport.height,
    });

    // Add to ZIP
    zip.file(`${baseName}_page_${pageNum}.jpg`, blob);
  }

  onProgress?.(95, 'Packaging download bundles...');

  let zipBlob: Blob | undefined;
  let zipUrl: string | undefined;

  if (totalPages > 1) {
    zipBlob = await zip.generateAsync({ type: 'blob' });
    zipUrl = URL.createObjectURL(zipBlob);
  }

  const singleBlobUrl = results[0]?.dataUrl || '';
  const singleFileName = `${baseName}_page_1.jpg`;

  return {
    pages: results,
    zipBlob,
    zipUrl,
    singleBlobUrl,
    singleFileName,
  };
}

/**
 * Converts PDF into structured Excel spreadsheets (CSV + XML SpreadsheetML .xls)
 */
export async function convertPdfToExcelData(
  arrayBuffer: ArrayBuffer,
  baseName: string,
  onProgress?: (percent: number, status: string) => void
): Promise<ExcelConversionResult> {
  const structuredData = await extractPdfStructuredData(arrayBuffer.slice(0), onProgress);
  onProgress?.(85, 'Parsing tabular matrices & numeric cells...');

  const tableRows: string[][] = [];
  let maxCols = 1;

  for (const page of structuredData.pages) {
    for (const line of page.lines) {
      // Split on multiple spaces (tabs / column gaps) or comma / pipe
      let columns: string[] = [];
      if (line.includes('\t')) {
        columns = line.split('\t').map(c => c.trim()).filter(Boolean);
      } else if (line.includes('|')) {
        columns = line.split('|').map(c => c.trim()).filter(Boolean);
      } else {
        // Split by 2 or more spaces
        columns = line.split(/\s{2,}/).map(c => c.trim()).filter(Boolean);
      }

      if (columns.length > 0) {
        if (columns.length > maxCols) maxCols = columns.length;
        tableRows.push(columns);
      }
    }
  }

  // Ensure consistent columns
  if (maxCols < 3) maxCols = 3;
  const headers = ['Row ID', 'Section / Description', 'Primary Values', 'Category / Details', 'Metrics'].slice(0, maxCols);
  while (headers.length < maxCols) {
    headers.push(`Column ${headers.length + 1}`);
  }

  // Build CSV
  const csvLines: string[] = [];
  csvLines.push(headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','));

  for (let idx = 0; idx < tableRows.length; idx++) {
    const row = tableRows[idx];
    const paddedRow: string[] = [`Item ${idx + 1}`];
    for (let c = 0; c < maxCols - 1; c++) {
      paddedRow.push(row[c] || '');
    }
    csvLines.push(paddedRow.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','));
  }

  const csvContent = csvLines.join('\r\n');
  const csvBlob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const csvUrl = URL.createObjectURL(csvBlob);

  // Build XML SpreadsheetML (.xls) with clean styling
  const xmlRows = tableRows.map((r, i) => {
    const cells = [
      `<Cell ss:StyleID="idCol"><Data ss:Type="String">#${i + 1}</Data></Cell>`,
      ...r.map(c => {
        const isNum = !isNaN(Number(c.replace(/[$,]/g, ''))) && c.trim() !== '';
        const type = isNum ? 'Number' : 'String';
        const val = isNum ? c.replace(/[$,]/g, '') : c.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `<Cell><Data ss:Type="${type}">${val}</Data></Cell>`;
      })
    ].join('');
    return `<Row>${cells}</Row>`;
  }).join('');

  const xlsXml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0071E3"/>
   </Borders>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#0071E3" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="idCol">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#888888"/>
   <Alignment ss:Horizontal="Center"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="${baseName.slice(0, 30)}">
  <Table ss:DefaultColumnWidth="120">
   <Column ss:Width="60"/>
   <Column ss:Width="200"/>
   <Column ss:Width="160"/>
   <Column ss:Width="160"/>
   <Row ss:Height="24">
    ${headers.map(h => `<Cell ss:StyleID="Header"><Data ss:Type="String">${h}</Data></Cell>`).join('')}
   </Row>
   ${xmlRows}
  </Table>
 </Worksheet>
</Workbook>`;

  const xlsBlob = new Blob([xlsXml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const xlsUrl = URL.createObjectURL(xlsBlob);

  onProgress?.(100, 'Excel spreadsheet ready for download!');

  return {
    tableRows,
    headers,
    csvContent,
    csvBlob,
    csvUrl,
    xlsBlob,
    xlsUrl,
    rowCount: tableRows.length,
    columnCount: maxCols,
  };
}

/**
 * Converts PDF into real PowerPoint slide deck (.pptx) using standard PresentationML via pptxgenjs
 */
export async function convertPdfToPowerPointDeck(
  arrayBuffer: ArrayBuffer,
  baseName: string,
  onProgress?: (percent: number, status: string) => void
): Promise<PptxConversionResult> {
  onProgress?.(15, 'Extracting document layout and high-DPI visuals...');
  const structuredData = await extractPdfStructuredData(arrayBuffer.slice(0), onProgress);

  onProgress?.(50, 'Rendering high-definition presentation slide visuals...');
  const jpgData = await convertPdfToJpgPages(arrayBuffer.slice(0), baseName, (pct, status) => {
    onProgress?.(50 + Math.round(pct * 0.3), status);
  });

  onProgress?.(85, 'Assembling PowerPoint presentation package (.pptx)...');

  const PptxClass = typeof pptxgen === 'function' ? pptxgen : (pptxgen as any)?.default || pptxgen;
  const pres = new PptxClass();
  pres.layout = 'LAYOUT_16x9';
  pres.title = structuredData.title || baseName;
  pres.company = 'ZipStream Studio';
  pres.author = 'ZipStream Private Tools';

  const slides: PptxSlideResult[] = [];

  for (let i = 0; i < jpgData.pages.length; i++) {
    const pageImg = jpgData.pages[i];
    const pageText = structuredData.pages[i];

    const slide = pres.addSlide();
    slide.background = { color: 'FFFFFF' };

    // Embed crisp retina render of the page visually centered on 16:9 slide
    slide.addImage({
      data: pageImg.dataUrl,
      x: 0.5,
      y: 0.35,
      w: 9.0,
      h: 5.0,
      sizing: { type: 'contain', w: 9.0, h: 5.0 },
    });

    const slideTitle = pageText?.lines[0] || `Slide ${i + 1}`;
    const slideBullets = pageText?.lines.slice(1, 6) || [`Document Page ${i + 1}`];

    if (pageText?.text) {
      slide.addNotes(pageText.text.slice(0, 3000));
    }

    slides.push({
      slideNumber: i + 1,
      title: slideTitle,
      bullets: slideBullets,
      imageUrl: pageImg.dataUrl,
    });
  }

  let rawOutput: any;
  try {
    rawOutput = await pres.write({ outputType: 'blob', compression: true });
  } catch (writeErr) {
    console.warn('PPTX write with compression failed, retrying standard blob:', writeErr);
    rawOutput = await pres.write({ outputType: 'blob' });
  }

  const pptxBlob =
    rawOutput instanceof Blob
      ? new Blob([rawOutput], {
          type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        })
      : new Blob([rawOutput], {
          type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        });
  const pptxUrl = URL.createObjectURL(pptxBlob);

  onProgress?.(100, 'PowerPoint presentation ready for download!');

  return {
    pptxBlob,
    pptxUrl,
    slides,
    slideCount: slides.length,
    zipBlob: jpgData.zipBlob,
    zipUrl: jpgData.zipUrl,
  };
}

/**
 * Converts PDF into valid, compliant EPUB 3.0 eBook package
 */
export async function convertPdfToEpubPackage(
  arrayBuffer: ArrayBuffer,
  baseName: string,
  onProgress?: (percent: number, status: string) => void
): Promise<EpubConversionResult> {
  const structuredData = await extractPdfStructuredData(arrayBuffer.slice(0), onProgress);
  onProgress?.(80, 'Packaging EPUB 3.0 eBook container...');

  const zip = new JSZip();

  // 1. mimetype (MUST be first file in EPUB, stored without compression)
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  // 2. META-INF/container.xml
  zip.file('META-INF/container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

  // 3. OEBPS/style.css
  zip.file('OEBPS/style.css', `
body {
  font-family: -apple-system, BlinkMacSystemFont, "Georgia", "Times New Roman", serif;
  line-height: 1.7;
  color: #1d1d1f;
  background-color: #ffffff;
  padding: 5% 8%;
  margin: 0 auto;
  max-width: 700px;
}
h1 {
  font-size: 2em;
  font-weight: bold;
  border-bottom: 2px solid #0071e3;
  padding-bottom: 0.3em;
  margin-top: 1.5em;
  color: #111111;
}
h2 {
  font-size: 1.5em;
  color: #0071e3;
  margin-top: 1.2em;
}
h3 {
  font-size: 1.2em;
  color: #333333;
}
p {
  margin: 1em 0;
  text-align: justify;
}
ul, ol {
  margin: 1em 0;
  padding-left: 2em;
}
li {
  margin-bottom: 0.5em;
}
.page-badge {
  display: inline-block;
  font-size: 0.8em;
  color: #888888;
  border-top: 1px solid #eeeeee;
  padding-top: 10px;
  margin-top: 30px;
}
`);

  // 4. Chapter files for each page
  const manifestItems: string[] = [];
  const spineItems: string[] = [];
  const tocNavItems: string[] = [];
  const ncxNavPoints: string[] = [];

  for (let i = 0; i < structuredData.pages.length; i++) {
    const page = structuredData.pages[i];
    const chapterId = `chapter_${i + 1}`;
    const fileName = `${chapterId}.xhtml`;

    manifestItems.push(`<item id="${chapterId}" href="${fileName}" media-type="application/xhtml+xml"/>`);
    spineItems.push(`<itemref idref="${chapterId}"/>`);
    
    const pageTitle = page.lines[0] || `Section ${i + 1}`;
    tocNavItems.push(`<li><a href="${fileName}">Page ${i + 1}: ${pageTitle.slice(0, 40)}</a></li>`);
    ncxNavPoints.push(`
    <navPoint id="np_${i + 1}" playOrder="${i + 1}">
      <navLabel><text>Page ${i + 1}: ${pageTitle.slice(0, 40)}</text></navLabel>
      <content src="${fileName}"/>
    </navPoint>`);

    const paragraphsHtml = page.lines.map(line => {
      if (/^[-*•]/.test(line)) {
        return `<li>${line.replace(/^[-*•]\s*/, '')}</li>`;
      }
      return `<p>${line}</p>`;
    }).join('\n');

    const chapterHtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en">
<head>
  <meta charset="utf-8"/>
  <title>${baseName} - Page ${i + 1}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <h1>Page ${i + 1}</h1>
  <div class="content">
    ${paragraphsHtml}
  </div>
  <div class="page-badge">Generated with ZipStream Private Document Studio</div>
</body>
</html>`;

    zip.file(`OEBPS/${fileName}`, chapterHtml);
  }

  // 5. OEBPS/nav.xhtml
  zip.file('OEBPS/nav.xhtml', `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Table of Contents</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Table of Contents</h1>
    <ol>
      ${tocNavItems.join('\n      ')}
    </ol>
  </nav>
</body>
</html>`);

  // 6. OEBPS/toc.ncx (for EPUB 2 backward compatibility)
  zip.file('OEBPS/toc.ncx', `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:zipstream-${Date.now()}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="${structuredData.totalPages}"/>
    <meta name="dtb:maxPageNumber" content="${structuredData.totalPages}"/>
  </head>
  <docTitle><text>${baseName}</text></docTitle>
  <navMap>
    ${ncxNavPoints.join('\n')}
  </navMap>
</ncx>`);

  // 7. OEBPS/content.opf
  zip.file('OEBPS/content.opf', `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="pub-id" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="pub-id">urn:uuid:zipstream-${Date.now()}</dc:identifier>
    <dc:title>${baseName}</dc:title>
    <dc:language>en</dc:language>
    <dc:creator>ZipStream Studio</dc:creator>
    <dc:publisher>ZipStream Client-Side Engine</dc:publisher>
    <dc:date>${new Date().toISOString().slice(0, 10)}</dc:date>
    <meta property="dcterms:modified">${new Date().toISOString().slice(0, 19)}Z</meta>
  </metadata>
  <manifest>
    <item id="style" href="style.css" media-type="text/css"/>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    ${manifestItems.join('\n    ')}
  </manifest>
  <spine toc="ncx">
    ${spineItems.join('\n    ')}
  </spine>
</package>`);

  const epubBlob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/epub+zip',
  });

  const epubUrl = URL.createObjectURL(epubBlob);
  onProgress?.(100, 'EPUB eBook created successfully!');

  return {
    epubBlob,
    epubUrl,
    chapterCount: structuredData.totalPages,
    structuredData,
  };
}

/**
 * Converts PDF into Word (.docx OpenXML and rich .doc)
 */
export async function convertPdfToWordDocument(
  arrayBuffer: ArrayBuffer,
  baseName: string,
  onProgress?: (percent: number, status: string) => void
): Promise<WordConversionResult> {
  const structuredData = await extractPdfStructuredData(arrayBuffer.slice(0), onProgress);
  onProgress?.(80, 'Packaging Word document format (.docx & .doc)...');

  const zip = new JSZip();

  // OpenXML Docx Packaging
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);

  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

  const paragraphsXml = structuredData.pages.map((p, pageIdx) => {
    const pageHeader = `<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="32"/><w:color w:val="0071E3"/></w:rPr><w:t>Page ${pageIdx + 1}</w:t></w:r></w:p>`;
    const lines = p.lines.map(line => {
      const isHeading = line.length < 60 && (line.toUpperCase() === line || /^[A-Z0-9\s]{3,}$/.test(line));
      const sz = isHeading ? '28' : '24';
      const b = isHeading ? '<w:b/>' : '';
      return `<w:p><w:r><w:rPr>${b}<w:sz w:val="${sz}"/></w:rPr><w:t xml:space="preserve">${line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</w:t></w:r></w:p>`;
    }).join('');
    return pageHeader + lines;
  }).join('<w:p><w:r><w:br w:type="page"/></w:r></w:p>');

  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:rPr><w:b/><w:sz w:val="40"/><w:color w:val="1D1D1F"/></w:rPr><w:t>${baseName}</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:i/><w:sz w:val="20"/><w:color w:val="86868B"/></w:rPr><w:t>Converted with ZipStream On-Device Document Studio</w:t></w:r></w:p>
    <w:p/>
    ${paragraphsXml}
  </w:body>
</w:document>`);

  const docxBlob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  const docxUrl = URL.createObjectURL(docxBlob);

  // Also build styled HTML .doc format for universal desktop compatibility
  const wordHtml = `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset="utf-8">
<title>${baseName}</title>
<style>
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #1d1d1f; margin: 1in; }
  h1 { font-size: 20pt; color: #0071e3; margin-bottom: 4px; }
  h2 { font-size: 14pt; color: #333333; margin-top: 24px; border-bottom: 1px solid #e5e5e5; padding-bottom: 4px; }
  p { margin: 8px 0; }
  .page-break { page-break-before: always; }
</style>
</head>
<body>
  <h1>${baseName}</h1>
  <p style="color:#86868b;font-size:9.5pt;">Converted via ZipStream On-Device Engine</p>
  <hr/>
  ${structuredData.pages.map((p, i) => `
    <div ${i > 0 ? 'class="page-break"' : ''}>
      <h2>Page ${i + 1}</h2>
      ${p.lines.map(l => `<p>${l}</p>`).join('')}
    </div>
  `).join('')}
</body>
</html>`;

  const docBlob = new Blob(['\uFEFF' + wordHtml], { type: 'application/msword' });
  const docUrl = URL.createObjectURL(docBlob);

  onProgress?.(100, 'Word documents generated successfully!');

  return {
    docxBlob,
    docxUrl,
    docBlob,
    docUrl,
    structuredData,
  };
}
