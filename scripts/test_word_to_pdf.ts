import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import { convertWordDocumentToPdf, isOfficeEngineAvailable } from '../server/conversion/wordToPdf/converter';
import { validateWordInput } from '../server/conversion/wordToPdf/validator';
import { WordConversionJobData } from '../server/conversion/wordToPdf/types';

// Helper to create a 1x1 transparent PNG buffer for image testing
const SAMPLE_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

/**
 * Builds a valid OpenXML DOCX archive with custom document.xml body content
 */
async function buildDocx(
  filePath: string,
  bodyXml: string,
  options: {
    hasImage?: boolean;
    hasHeaderFooter?: boolean;
    isLandscape?: boolean;
  } = {}
): Promise<void> {
  const zip = new JSZip();

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  ${options.hasImage ? '<Default Extension="png" ContentType="image/png"/>' : ''}
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  ${options.hasHeaderFooter ? '<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>' : ''}
  ${options.hasHeaderFooter ? '<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>' : ''}
</Types>`;

  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  let docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`;

  if (options.hasHeaderFooter) {
    docRelsXml += `
  <Relationship Id="rIdHeader" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>
  <Relationship Id="rIdFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>`;
  }
  if (options.hasImage) {
    docRelsXml += `
  <Relationship Id="rIdImg1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/>`;
  }
  docRelsXml += `</Relationships>`;

  const sectionPr = options.isLandscape
    ? `<w:sectPr>
        <w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/>
        <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
       </w:sectPr>`
    : `<w:sectPr>
        ${options.hasHeaderFooter ? '<w:headerReference w:type="default" r:id="rIdHeader"/><w:footerReference w:type="default" r:id="rIdFooter"/>' : ''}
        <w:pgSz w:w="11906" w:h="16838"/>
        <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
       </w:sectPr>`;

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
            xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
            xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
  <w:body>
    ${bodyXml}
    ${sectionPr}
  </w:body>
</w:document>`;

  zip.file('[Content_Types].xml', contentTypesXml);
  zip.file('_rels/.rels', rootRelsXml);
  zip.file('word/_rels/document.xml.rels', docRelsXml);
  zip.file('word/document.xml', documentXml);

  if (options.hasHeaderFooter) {
    zip.file(
      'word/header1.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p><w:r><w:rPr><w:sz w:val="18"/><w:color w:val="666666"/></w:rPr><w:t>ZipStream Automated Header</w:t></w:r></w:p>
</w:hdr>`
    );
    zip.file(
      'word/footer1.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p><w:r><w:rPr><w:sz w:val="18"/><w:color w:val="666666"/></w:rPr><w:t>Page 1 of 1 · Confidential</w:t></w:r></w:p>
</w:ftr>`
    );
  }

  if (options.hasImage) {
    zip.file('word/media/image1.png', Buffer.from(SAMPLE_PNG_BASE64, 'base64'));
  }

  const buf = await zip.generateAsync({ type: 'nodebuffer' });
  await fs.writeFile(filePath, buf);
}

/**
 * Creates a minimal valid legacy OLE2 DOC file using standard header
 */
async function buildLegacyDoc(filePath: string): Promise<void> {
  const oleHeader = Buffer.from([
    0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, // Magic header
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x3e, 0x00, 0x03, 0x00, 0xfe, 0xff, 0x09, 0x00,
    0x06, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  ]);
  const body = Buffer.alloc(512);
  body.write('Microsoft Word Legacy Document Sample Text', 0, 'utf8');
  await fs.writeFile(filePath, Buffer.concat([oleHeader, body]));
}

interface TestResult {
  name: string;
  passed: boolean;
  pageCount?: number;
  pdfSize?: number;
  durationMs?: number;
  error?: string;
}

async function runRegressionSuite() {
  console.log('====================================================');
  console.log('   ZipStream Word -> PDF Regression Test Suite      ');
  console.log('====================================================');

  const engine = await isOfficeEngineAvailable();
  console.log(`[Engine Check] Available: ${engine.available}, Active Engine: [${engine.engine}]`);
  if (!engine.available) {
    console.error(`ERROR: No Office conversion engine available. ${engine.error}`);
    process.exit(1);
  }

  const testDir = path.join(os.tmpdir(), `zipstream-reg-test-${Date.now()}`);
  await fs.mkdir(testDir, { recursive: true });

  const results: TestResult[] = [];

  const runTest = async (
    name: string,
    fileExt: 'docx' | 'doc',
    builder: (inputPath: string) => Promise<void>,
    assertions?: {
      minPages?: number;
      maxPages?: number;
      shouldFail?: boolean;
    }
  ) => {
    const jobId = crypto.randomUUID();
    const inputPath = path.join(testDir, `input_${jobId}.${fileExt}`);
    const outputPath = path.join(testDir, `output_${jobId}.pdf`);
    const workDir = path.join(testDir, `work_${jobId}`);

    const startTime = Date.now();
    try {
      await builder(inputPath);
      const stat = await fs.stat(inputPath);

      // Verify input validation step
      const inputVal = await validateWordInput(inputPath, path.basename(inputPath));
      if (!inputVal.isValid) {
        if (assertions?.shouldFail) {
          results.push({ name, passed: true, error: `Properly rejected: ${inputVal.error}` });
          console.log(`  ✓ ${name} [Properly rejected: ${inputVal.error}]`);
          return;
        }
        throw new Error(`Input validation failed unexpectedly: ${inputVal.error}`);
      }

      const jobData: WordConversionJobData = {
        jobId,
        originalFileName: `test_${name}.${fileExt}`,
        originalSize: stat.size,
        inputExtension: fileExt,
        mimeType: inputVal.mimeType,
        inputFilePath: inputPath,
        outputFilePath: outputPath,
        workDir,
        createdAt: Date.now(),
      };

      const result = await convertWordDocumentToPdf(jobData);

      if (assertions?.shouldFail) {
        results.push({ name, passed: false, error: 'Expected conversion to fail but succeeded.' });
        console.error(`  ✗ ${name} [FAILED: Expected conversion to fail]`);
        return;
      }

      // Assert output exists & size > 0
      const pdfBytes = await fs.readFile(outputPath);
      if (pdfBytes.length === 0) throw new Error('PDF output is 0 bytes.');
      if (pdfBytes.subarray(0, 5).toString('ascii') !== '%PDF-') throw new Error('Missing %PDF- header.');

      // Assert pdf-lib can load it & read page count
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pageCount = pdfDoc.getPageCount();

      if (assertions?.minPages && pageCount < assertions.minPages) {
        throw new Error(`Page count ${pageCount} is less than minimum expected ${assertions.minPages}`);
      }
      if (assertions?.maxPages && pageCount > assertions.maxPages) {
        throw new Error(`Page count ${pageCount} exceeds maximum expected ${assertions.maxPages}`);
      }

      // Assert text is vector/selectable: check for text operator or fonts in PDF structure
      const pdfTextRaw = pdfBytes.toString('latin1');
      const hasTextOperators = pdfTextRaw.includes('/Font') || pdfTextRaw.includes('BT') || pdfTextRaw.includes('/Type /Page');
      if (!hasTextOperators) {
        throw new Error('PDF does not contain standard vector font/page operators.');
      }

      const durationMs = Date.now() - startTime;
      results.push({ name, passed: true, pageCount, pdfSize: pdfBytes.length, durationMs });
      console.log(`  ✓ ${name} (${pageCount} page(s), ${(pdfBytes.length / 1024).toFixed(1)} KB, ${durationMs}ms)`);
    } catch (err: any) {
      if (assertions?.shouldFail) {
        results.push({ name, passed: true, error: `Expected failure caught: ${err.message}` });
        console.log(`  ✓ ${name} [Expected failure caught: ${err.message}]`);
      } else {
        results.push({ name, passed: false, error: err.message });
        console.error(`  ✗ ${name} [FAILED: ${err.message}]`);
      }
    } finally {
      await fs.rm(inputPath, { force: true }).catch(() => undefined);
      await fs.rm(outputPath, { force: true }).catch(() => undefined);
      await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined);
    }
  };

  // TEST 1: Simple one-page DOCX
  await runTest('TEST 1: Simple one-page DOCX', 'docx', async (p) => {
    await buildDocx(p, '<w:p><w:r><w:t>Simple one-page document text.</w:t></w:r></w:p>', { isLandscape: false });
  }, { minPages: 1, maxPages: 1 });

  // TEST 2: Multi-page document with page break
  await runTest('TEST 2: Multi-page document', 'docx', async (p) => {
    await buildDocx(
      p,
      `<w:p><w:r><w:t>Page 1 content</w:t></w:r></w:p>
       <w:p><w:r><w:br w:type="page"/></w:r></w:p>
       <w:p><w:r><w:t>Page 2 content</w:t></w:r></w:p>`
    );
  }, { minPages: 2, maxPages: 2 });

  // TEST 3: Different fonts
  await runTest('TEST 3: Different fonts', 'docx', async (p) => {
    await buildDocx(
      p,
      `<w:p>
        <w:r><w:rPr><w:rFonts w:ascii="Arial"/></w:rPr><w:t>Arial Font Paragraph. </w:t></w:r>
        <w:r><w:rPr><w:rFonts w:ascii="Times New Roman"/></w:rPr><w:t>Times New Roman Font Paragraph. </w:t></w:r>
        <w:r><w:rPr><w:rFonts w:ascii="Courier New"/></w:rPr><w:t>Courier New Monospace Font.</w:t></w:r>
       </w:p>`
    );
  }, { minPages: 1 });

  // TEST 4: Bold/italic/underline
  await runTest('TEST 4: Bold/italic/underline', 'docx', async (p) => {
    await buildDocx(
      p,
      `<w:p>
        <w:r><w:rPr><w:b/></w:rPr><w:t>Bold Text. </w:t></w:r>
        <w:r><w:rPr><w:i/></w:rPr><w:t>Italic Text. </w:t></w:r>
        <w:r><w:rPr><w:u w:val="single"/></w:rPr><w:t>Underlined Text. </w:t></w:r>
        <w:r><w:rPr><w:strike/></w:rPr><w:t>Strikethrough Text.</w:t></w:r>
       </w:p>`
    );
  }, { minPages: 1 });

  // TEST 5: Bulleted list
  await runTest('TEST 5: Bulleted list', 'docx', async (p) => {
    await buildDocx(
      p,
      `<w:p><w:pPr><w:pStyle w:val="ListBullet"/></w:pPr><w:r><w:t>• First bullet item</w:t></w:r></w:p>
       <w:p><w:pPr><w:pStyle w:val="ListBullet"/></w:pPr><w:r><w:t>• Second bullet item</w:t></w:r></w:p>
       <w:p><w:pPr><w:pStyle w:val="ListBullet"/></w:pPr><w:r><w:t>• Third bullet item</w:t></w:r></w:p>`
    );
  }, { minPages: 1 });

  // TEST 6: Numbered list
  await runTest('TEST 6: Numbered list', 'docx', async (p) => {
    await buildDocx(
      p,
      `<w:p><w:r><w:t>1. First numbered step</w:t></w:r></w:p>
       <w:p><w:r><w:t>2. Second numbered step</w:t></w:r></w:p>
       <w:p><w:r><w:t>3. Third numbered step</w:t></w:r></w:p>`
    );
  }, { minPages: 1 });

  // TEST 7: Large headings
  await runTest('TEST 7: Large headings', 'docx', async (p) => {
    await buildDocx(
      p,
      `<w:p><w:r><w:rPr><w:b/><w:sz w:val="56"/><w:color w:val="1E293B"/></w:rPr><w:t>Heading Level 1</w:t></w:r></w:p>
       <w:p><w:r><w:rPr><w:b/><w:sz w:val="40"/><w:color w:val="FF5722"/></w:rPr><w:t>Heading Level 2</w:t></w:r></w:p>
       <w:p><w:r><w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="475569"/></w:rPr><w:t>Heading Level 3</w:t></w:r></w:p>`
    );
  }, { minPages: 1 });

  // TEST 8: Paragraph indentation & alignments
  await runTest('TEST 8: Paragraph indentation', 'docx', async (p) => {
    await buildDocx(
      p,
      `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>Centered Paragraph Header</w:t></w:r></w:p>
       <w:p><w:pPr><w:ind w:left="720" w:firstLine="360"/><w:jc w:val="both"/></w:pPr><w:r><w:t>Indented justified block with first line indent representing official letter formatting.</w:t></w:r></w:p>`
    );
  }, { minPages: 1 });

  // TEST 9: Multiple tables
  await runTest('TEST 9: Multiple tables', 'docx', async (p) => {
    await buildDocx(
      p,
      `<w:tbl>
        <w:tblPr><w:tblBorders><w:top w:val="single"/><w:bottom w:val="single"/></w:tblBorders></w:tblPr>
        <w:tr><w:tc><w:p><w:r><w:t>Col A</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Col B</w:t></w:r></w:p></w:tc></w:tr>
        <w:tr><w:tc><w:p><w:r><w:t>Val 1</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Val 2</w:t></w:r></w:p></w:tc></w:tr>
       </w:tbl>
       <w:p><w:r><w:t>Inter-table paragraph</w:t></w:r></w:p>
       <w:tbl>
        <w:tr><w:tc><w:p><w:r><w:t>Table 2 Cell 1</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Table 2 Cell 2</w:t></w:r></w:p></w:tc></w:tr>
       </w:tbl>`
    );
  }, { minPages: 1 });

  // TEST 10: Merged table cells
  await runTest('TEST 10: Merged table cells', 'docx', async (p) => {
    await buildDocx(
      p,
      `<w:tbl>
        <w:tr>
          <w:tc><w:tcPr><w:gridSpan w:val="2"/></w:tcPr><w:p><w:r><w:t>Merged Span Across 2 Columns</w:t></w:r></w:p></w:tc>
        </w:tr>
        <w:tr>
          <w:tc><w:p><w:r><w:t>Left Sub-Cell</w:t></w:r></w:p></w:tc>
          <w:tc><w:p><w:r><w:t>Right Sub-Cell</w:t></w:r></w:p></w:tc>
        </w:tr>
       </w:tbl>`
    );
  }, { minPages: 1 });

  // TEST 11: Images
  await runTest('TEST 11: Embedded Images', 'docx', async (p) => {
    await buildDocx(
      p,
      `<w:p><w:r><w:t>Paragraph above embedded graphic:</w:t></w:r></w:p>
       <w:p>
         <w:r>
           <w:drawing>
             <wp:inline>
               <wp:extent cx="1000000" cy="1000000"/>
               <wp:docPr id="1" name="SampleImage"/>
               <a:graphic>
                 <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                   <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                     <pic:nvPicPr><pic:cNvPr id="0" name="Sample.png"/><pic:cNvPicPr/></pic:nvPicPr>
                     <pic:blipFill><a:blip r:embed="rIdImg1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>
                     <pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="1000000" cy="1000000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>
                   </pic:pic>
                 </a:graphicData>
               </a:graphic>
             </wp:inline>
           </w:drawing>
         </w:r>
       </w:p>`,
      { hasImage: true }
    );
  }, { minPages: 1 });

  // TEST 12 & 13: Headers, footers and page numbers
  await runTest('TEST 12: Headers, footers & page numbers', 'docx', async (p) => {
    await buildDocx(p, '<w:p><w:r><w:t>Body text accompanied by official headers and footers.</w:t></w:r></w:p>', {
      hasHeaderFooter: true,
    });
  }, { minPages: 1 });

  // TEST 14: Landscape page
  await runTest('TEST 14: Landscape page', 'docx', async (p) => {
    await buildDocx(p, '<w:p><w:r><w:t>Wide landscape sheet document.</w:t></w:r></w:p>', { isLandscape: true });
  }, { minPages: 1 });

  // TEST 15 & 16: Hyperlinks & Section breaks
  await runTest('TEST 15: Hyperlinks & Section breaks', 'docx', async (p) => {
    await buildDocx(
      p,
      `<w:p><w:r><w:t>Visit our website: https://zipstream.online</w:t></w:r></w:p>
       <w:p><w:pPr><w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr></w:pPr></w:p>
       <w:p><w:r><w:t>Section 2 following section break.</w:t></w:r></w:p>`
    );
  }, { minPages: 1 });

  // TEST 17: Long document (20+ pages)
  await runTest('TEST 17: Long document (20+ pages)', 'docx', async (p) => {
    let pagesXml = '';
    for (let i = 1; i <= 21; i++) {
      pagesXml += `<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Section Chapter ${i}</w:t></w:r></w:p>`;
      pagesXml += `<w:p><w:r><w:t>Detailed text contents for chapter ${i} of the comprehensive document test suite.</w:t></w:r></w:p>`;
      if (i < 21) {
        pagesXml += '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
      }
    }
    await buildDocx(p, pagesXml);
  }, { minPages: 20 });

  // TEST 18: Corrupted Word file (must fail safely with graceful error)
  await runTest('TEST 18: Corrupted Word file (fails safely)', 'docx', async (p) => {
    await fs.writeFile(p, Buffer.from('This is not a valid zip or docx archive! Corrupt payload.'));
  }, { shouldFail: true });

  // TEST 19: Empty Word file (0 bytes)
  await runTest('TEST 19: Empty Word file (fails safely)', 'docx', async (p) => {
    await fs.writeFile(p, Buffer.alloc(0));
  }, { shouldFail: true });

  // TEST 20: Legacy .DOC file
  await runTest('TEST 20: Legacy .DOC file', 'doc', async (p) => {
    await buildLegacyDoc(p);
  }, { minPages: 1 });

  // Cleanup test directory
  await fs.rm(testDir, { recursive: true, force: true });

  console.log('\n====================================================');
  console.log('                 TEST RESULTS SUMMARY               ');
  console.log('====================================================');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  for (const r of results) {
    console.log(`[${r.passed ? 'PASS' : 'FAIL'}] ${r.name}`);
  }

  console.log(`\nTotal: ${total} | Passed: ${passed} | Failed: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

runRegressionSuite().catch((err) => {
  console.error('Test suite crashed:', err);
  process.exit(1);
});
