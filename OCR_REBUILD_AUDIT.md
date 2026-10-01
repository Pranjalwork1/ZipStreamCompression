# ZipStream.online — OCR / Searchable PDF Rebuild Audit

**Document Date:** October 2026  
**Auditor:** Senior Full-Stack, Cloudflare Workers & Container Systems Engineer  
**Status:** Audit Completed — Architecture Approved for Implementation  

---

## 1. Overview & Objective
This audit reviews the current state of optical character recognition (OCR) and searchable PDF functionality across ZipStream.online. The objective is to replace the superficial client-side text extractor with a robust, production-grade **OCR PDF — Make PDF Searchable** subsystem powered by:
```text
Cloudflare Worker (API / Orchestration / Rate Limiting / Validation)
        ↓
Temporary Storage (R2 / Isolated ephemeral disk)
        ↓
Cloudflare Container (Isolated Execution Sandbox)
        ↓
OCRmyPDF (Pinned Engine) + Tesseract (Multilingual: English, Hindi, etc.)
        ↓
Searchable PDF (Original Visuals + Selectable Vector Text Layer)
```

**Absolute Guiding Rule:** The existing PDF compression engine (`server/compression/`), Ghostscript profiles, PDF conversion tools, authentication, P2P networking, AI services, and UI theme must remain **100% untouched and functional**.

---

## 2. Current Architecture & Codebase Discovery

| Component Area | Current Implementation State | Finding / Audit Assessment |
| :--- | :--- | :--- |
| **Frontend Route** | `/ocr-pdf` | Configured in `TOOL_CANONICAL_PATHS`, `TOOL_PATHS`, `prerender_seo.ts`, and `server/seo/meta.ts`. |
| **Frontend UI Component** | Sub-tab in `src/components/views/AiToolsView.tsx` | Currently labelled *"Client-Side Searchable Text Indexer"*. Only renders an extracted text string from `pdfjs-dist` in a read-only monospace scroll box. Does **not** produce or download a searchable PDF. |
| **Backend / Worker Endpoint** | *None* | No `/api/ocr` or `/api/searchable-pdf` endpoint exists on Express (`server.ts`) or Cloudflare Workers. |
| **OCR Engine / Libraries** | *None* | `tesseract.js` is cited in marketing documentation (`ZIPSTREAM_FEATURE_MATRIX.md`), but was never installed or imported. No server-side OCR engine exists. |
| **PDF Validation** | Frontend MIME check only | In-memory `ArrayBuffer` type check. Server has `isValidPdfBuffer` in `server/security/validation.ts` (`%PDF-` header check), but not wired to OCR. |
| **Languages Supported** | *None* | No language picker, no trained data models. |
| **Deskew / Auto-Rotate** | *None* | Scanned documents with tilted or upside-down pages remain uncorrected. |
| **Output / Download Flow** | *None* | Users cannot download a searchable PDF. |
| **Cloudflare Configuration** | Static SPA in `wrangler.jsonc` | Only sets `assets: { directory: "./dist" }` and `compatibility_date: "2026-09-26"`. No container bindings, R2 buckets, or job queues. |
| **Storage Model** | None for OCR | Temp directories used by Ghostscript and Word-to-PDF (`/data/storage/` in Docker), but no OCR pipeline. |
| **Tool Registry & Discovery** | Registered across site | Present in `HomePage.tsx` Bento Grid, `TypewriterTools.tsx`, `SearchCommandPalette.tsx` (⌘K), `PdfToolsDirectory.tsx`, and `Navbar.tsx`. |

---

## 3. Current Limitations & Deficiencies
1. **Not a Searchable PDF Creator:** The existing tool merely pulls readable text streams if the PDF already contains selectable text. On scanned paper, images, receipts, or contracts, it displays *"No text extracted"*.
2. **No Vector Text Layer Injection:** Does not invoke OCR to synthesize an invisible text layer behind the original scanned image.
3. **No Multilingual Recognition:** Zero support for Hindi (`hin`), English (`eng`), or combined multi-script documents.
4. **No Orientation / Deskew Rectification:** Scanned pages with skew or incorrect rotation cannot be corrected.
5. **No Cloudflare Worker / Container Integration:** Heavy OCR tasks cannot run in standard lightweight edge workers without a dedicated container sandbox.

---

## 4. Proposed Target Architecture

```text
                             User Browser
                                  │
                   ┌──────────────┴──────────────┐
                   │ Drop Scanned PDF            │
                   │ Select Language (eng, hin)  │
                   │ Options (Deskew, Rotate)    │
                   └──────────────┬──────────────┘
                                  │ POST /api/ocr (Multipart/Stream)
                                  ▼
                 Cloudflare Worker / Express API Gateway
                   ├── Rate Limiter (IP / User / Concurrency)
                   ├── Strict Header & Magic Byte Validation (%PDF-)
                   ├── File Size (Max 50MB) & Page Cap (Max 100 pages)
                   └── Issue Ephemeral Job ID (UUIDv4)
                                  │
                                  ▼
                     Temporary Storage Layer (R2)
                   ├── Input Bucket: `ocr-temp/inputs/<jobId>.pdf`
                   └── Auto-deletion lifecycle (1 hour TTL)
                                  │
                                  ▼
             Cloudflare Container Runner (Dedicated Sandbox)
                   ├── Image: `jbarlow83/ocrmypdf:v16.10.1` (Pinned)
                   ├── Tesseract 5 with `tessdata`: `eng`, `hin`, `osd`
                   ├── Non-root runtime user (`appuser` / `node`)
                   ├── Hard execution timeout (300s) & Memory Capping
                   └── Safe CLI Invocation (execFile argument arrays, NO shell concat)
                                  │
                                  ▼
                    OCRmyPDF + Tesseract Pipeline
                   ├── Language allowlist mapping (e.g. `English + Hindi` -> `eng+hin`)
                   ├── `--deskew` (Deskew scanned pages)
                   ├── `--rotate-pages` (Tesseract OSD page orientation)
                   ├── `--skip-text` / `--force-ocr` modes
                   └── Generates original image + invisible searchable text layer
                                  │
                                  ▼
                     Output Validation & Staging
                   ├── Verify PDF header, non-zero bytes, readable stream
                   ├── Confirm text layer injected successfully
                   └── Stage to: `ocr-temp/outputs/<jobId>_searchable.pdf`
                                  │
                                  ▼
                         User Download & Cleanup
                   ├── Stream searchable PDF to client
                   └── Automatic cleanup of temporary files
```

---

## 5. Files to Be Replaced, Created & Preserved

### What Will Be Preserved (100% Protected Subsystem)
- `server/compression/*`: All Ghostscript compression profiles, worker pools, BullMQ queue, and optimization heuristics.
- `server/conversion/wordToPdf/*`: LibreOffice DOCX/DOC converter.
- `server/ai/*`: Sarvam AI and Gemini integrations (kept separate from OCR).
- `src/components/pdf-editor/*`: The newly created client-side PDF Editor.
- `server/security/*`: Rate limiters, CORS, security headers, orphan cleanup daemons.

### What Will Be Replaced
- `src/components/views/AiToolsView.tsx` (the minimal text-extractor sub-tool under `activeSubTool === 'searchable_pdf'`) will be replaced with a full-fledged, dedicated **OCR PDF — Make PDF Searchable** view component: `src/components/views/OcrPdfView.tsx`.
- `src/App.tsx` routing for `activeTool === 'searchable_pdf'` will cleanly route to the dedicated `OcrPdfView`.

### What Will Be Newly Added
1. **Container & Worker Subsystem:**
   - `workers/ocr/Dockerfile`: Custom pinned OCRmyPDF container image with Tesseract multilingual packages (`tesseract-ocr-eng`, `tesseract-ocr-hin`, `tesseract-ocr-osd`), non-root user execution, and minimal image layers.
   - `server/ocr/types.ts`: TypeScript contracts for OCR options, job statuses, language packs, and API payloads.
   - `server/ocr/ocrService.ts`: Core orchestration service handling input validation, temporary file isolation, safe argument array execution, output verification, and cleanup.
   - `server/ocr/api.ts`: Express / Cloudflare Worker API router exposing `POST /api/ocr`, `GET /api/ocr/:jobId`, and `GET /api/ocr/:jobId/download`.
2. **Cloudflare & Wrangler Configuration:**
   - Extended `wrangler.jsonc` with R2 temporary bucket bindings and Container service definitions.
3. **Frontend Dedicated View:**
   - `src/components/views/OcrPdfView.tsx`: Accessible, responsive UI featuring drag-and-drop upload, language selection (English, Hindi, English+Hindi, etc.), deskew and auto-rotate toggles, realistic staged progress ("Uploading", "Preparing PDF", "Running OCR", "Building Searchable PDF", "Finalizing"), temporary server processing indicator 🟡, and searchable PDF download card.
4. **Automated Verification & Tests:**
   - `server/ocr/__tests__/ocrService.test.ts`: Vitest test suite testing request validation, magic byte checks, language allowlist mapping, output validation, and error recovery.

---

## 6. Risks & Mitigation Strategies

| Risk Identified | Severity | Mitigation Strategy |
| :--- | :--- | :--- |
| **Command Injection via user inputs** | Critical | **Never** use shell string concatenation or `exec`. Use `execFile` with rigid argument arrays, strict language code allowlists, and server-generated UUID file paths. |
| **Heavy CPU/Memory starvation from massive scans** | High | Enforce `OCR_MAX_FILE_SIZE_MB` (50MB) and `OCR_MAX_PAGES` (100 pages) before running OCR. Apply a 300-second hard execution timeout per job. |
| **Privilege escalation in container** | High | Run container as non-root user (`appuser` with UID 1000). Set root filesystem to read-only where possible, isolating writes to `/tmp/zipstream-ocr/<jobId>/`. |
| **Accidental regressions in existing compression engine** | Critical | Zero modifications to `server/compression/` or Ghostscript. Run `npm test` and `test:compression` regression gate after every modification. |
| **Public caching of private OCR documents** | High | Set `Cache-Control: private, no-store, no-cache, must-revalidate` and `Content-Disposition: attachment` on all OCR download streams. |

---

## 7. Migration & Rollout Strategy
1. **Phase 1 (Container & Server Core):** Build the container definition, OCR service, and Express/Worker endpoints. Implement local fallback so development and tests run seamlessly in all environments.
2. **Phase 2 (Frontend View):** Build `OcrPdfView.tsx` with high-contrast accessibility, transparent server-processing indicator, and staged progress bar.
3. **Phase 3 (Routing & Discovery Integration):** Integrate `/ocr-pdf` into `App.tsx`, `HomePage.tsx`, `Navbar.tsx`, `SearchCommandPalette.tsx`, and `prerender_seo.ts`.
4. **Phase 4 (Security & Regression Testing):** Execute test corpus (English, Hindi, rotated pages, deskew, corrupted files) and run the compression regression suite.
5. **Phase 5 (Documentation & Reports):** Produce `OCR_ARCHITECTURE.md`, `OCR_CLOUDFLARE_DEPLOYMENT.md`, `OCR_SECURITY.md`, `OCR_TESTING.md`, and `OCR_REBUILD_FINAL_REPORT.md`.
