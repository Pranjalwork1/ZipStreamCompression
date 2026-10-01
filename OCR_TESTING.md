# ZipStream OCR & Searchable PDF Subsystem — Testing & Verification Guide

## 1. Test Corpus & Test Suites

The OCR subsystem is covered by an automated test suite, integration tests, and visual/searchability verification procedures:

```
Automated Test Suites (Vitest)
  ├── Input & Buffer Validation (Empty, Non-PDF, Oversized)
  ├── Language Code Allowlist Normalization
  ├── OCR Mode Mapping (Auto, Force, Skip)
  ├── Output Integrity & Header Verification (%PDF-)
  └── IDOR Capability Token Enforcement
```

---

## 2. Running Automated Tests

Run the full Vitest suite:
```bash
npm test
```
Run specifically the OCR test suite:
```bash
npx vitest run server/ocr/__tests__/ocrService.test.ts
```

Expected output:
```text
 ✓ server/ocr/__tests__/ocrService.test.ts (8 tests)
   ✓ OCR Service Validation & Option Normalization (5 tests)
     ✓ should normalize default OCR options correctly
     ✓ should accept valid allowlisted languages (English, Hindi, Multilingual)
     ✓ should fallback to English for unknown or malicious language codes
     ✓ should respect custom OCR modes (force, skip)
     ✓ should expose verified supported languages catalog
   ✓ OCR Service Input & Security Validation (3 tests)
     ✓ should reject empty PDF buffers
     ✓ should reject files without valid %PDF- magic header
     ✓ should reject files exceeding the maximum size limit
```

---

## 3. End-to-End Verification Scenarios

### Test 1: Scanned English Document
1. Upload a scanned 300 DPI single-page invoice containing English text.
2. Select Language: `English (Default)`, Mode: `Auto`.
3. Verify that the output PDF opens, original visuals are intact, and words can be searched using `Ctrl+F`.
4. Highlight and copy a sentence from the PDF into a text editor to confirm text encoding.

### Test 2: Hindi & Bilingual Document (`eng+hin`)
1. Upload a scanned Indian revenue receipt or Hindi government form.
2. Select Language: `Hindi (हिन्दी)` or `English + Hindi`.
3. Verify that Devanagari Unicode characters (e.g., `रुपये`, `दिनांक`, `प्रमाणित`) are synthesized in the invisible layer and can be copied as valid UTF-8.

### Test 3: Crooked Scan with Deskew Enabled
1. Upload a scanned page tilted at an angle of 3°–5°.
2. Ensure `Auto Deskew Pages` is checked.
3. Verify that the output PDF displays straightened margins and lines without cropping text.

### Test 4: Upside-Down Scan with Auto-Rotate (OSD)
1. Upload an inverted (180° rotated) or landscape scan.
2. Ensure `Auto-Rotate Orientation` is checked.
3. Verify that Tesseract OSD detects the orientation and rights the page orientation in the output PDF.

### Test 5: Password-Protected PDF Detection
1. Upload an encrypted PDF file.
2. Verify that the UI intercepts the error, flags the document as password-protected, and provides an active link to the `/unlock-pdf` tool.

---

## 4. Protected Subsystem Regression Verification
Execute the following verification commands to guarantee that no regressions were introduced to existing tools:

```bash
# 1. Verify PDF Compression Engine
npm run test:compression

# 2. Verify Security Headers & Rate Limiters
npm run test:security

# 3. Verify Technical SEO & Canonical URLs
npm run test:seo

# 4. Verify Full Production Build & Prerenderer
npm run build
```
All four commands must exit with code 0.
