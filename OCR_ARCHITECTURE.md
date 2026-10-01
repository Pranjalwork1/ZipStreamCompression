# ZipStream OCR & Searchable PDF Subsystem — Technical Architecture

## 1. System Overview
The **OCR PDF — Make PDF Searchable** feature converts scanned paper documents, photos, invoices, and image-based PDFs into fully searchable, selectable PDF documents. It works by recognizing glyphs in raster image scans and synthesizing an invisible vector text layer positioned with sub-pixel alignment over the underlying visual image.

The architecture decouples the lightweight edge orchestration layer from the heavy, CPU-bound optical character recognition runtime using Cloudflare Containers and OCRmyPDF:

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Web Browser                         │
│   • Modern drag & drop UI (/ocr-pdf)                            │
│   • Language selection (English, Hindi, French, German, Spanish)│
│   • Auto-rotate & Deskew toggles                                │
│   • Realistic staged progress indicator & download card         │
└────────────────────────────────┬────────────────────────────────┘
                                 │ POST /api/ocr (Streamed PDF buffer)
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│              Cloudflare Worker / Express API Gateway            │
│   • Rate Limiting (createRateLimiter('ocr'))                    │
│   • Strict Request & Header Sanitization                        │
│   • Magic Byte Validation (%PDF-)                               │
│   • File Size Limit (Max 50MB) & Page Cap (100 Pages)           │
│   • Language Allowlist Normalization                            │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Temporary Storage Layer                     │
│   • Cloudflare R2 Temporary Bucket (zipstream-ocr-temp)         │
│   • Ephemeral local directory fallback (/tmp/zipstream-ocr/)    │
│   • Strict 1-hour TTL & automated orphan cleanup daemon         │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│               Cloudflare Dedicated OCR Container                │
│   • Base Image: jbarlow83/ocrmypdf:v16.10.1 (Pinned)            │
│   • Engine: OCRmyPDF + Tesseract 5                              │
│   • Installed Languages: eng, hin, osd, fra, deu, spa           │
│   • Non-root User Sandbox (UID 1000)                            │
│   • Ephemeral job directory (/tmp/zipstream-ocr/job_<uuid>/)    │
│   • Hard Process Timeout (180s default, max 300s)               │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Searchable PDF Output                       │
│   • Original visual pages preserved with zero degradation       │
│   • Selectable, invisible vector text layer synthesized         │
│   • Output validation (Header check, non-zero byte size)        │
│   • IDOR-protected download capability token                    │
│   • Streamed directly to client with no-store cache headers     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Subsystems

### A. API & Orchestration Gateway (`server/ocr/`)
- **[types.ts](file:///d:/Zipstream.online%20github%20Repo%20main/ZipStreamCompression/server/ocr/types.ts):** Defines strict contracts for OCR options, supported language codes, and job life-cycles.
- **[ocrService.ts](file:///d:/Zipstream.online%20github%20Repo%20main/ZipStreamCompression/server/ocr/ocrService.ts):** Validates input streams, guards against path traversal, dispatches work to the container via internal HTTP, verifies output integrity, and handles temporary disk cleanup.
- **[api.ts](file:///d:/Zipstream.online%20github%20Repo%20main/ZipStreamCompression/server/ocr/api.ts):** Mounted at `/api/ocr` with endpoints:
  - `POST /api/ocr`: Dispatches raw PDF bytes, applies rate limits, and streams back the searchable PDF.
  - `GET /api/ocr/languages`: Returns metadata for verified language packs.
  - `GET /api/ocr/health`: Health probe reporting service readiness.
  - `GET /api/ocr/:jobId/download`: Capability-token authorized download stream with IDOR verification.

### B. Dedicated OCR Container (`workers/ocr/`)
- **[Dockerfile](file:///d:/Zipstream.online%20github%20Repo%20main/ZipStreamCompression/workers/ocr/Dockerfile):** Pinned `jbarlow83/ocrmypdf:v16.10.1` installing `tesseract-ocr-eng`, `tesseract-ocr-hin`, `tesseract-ocr-osd`, `tesseract-ocr-fra`, `tesseract-ocr-deu`, `tesseract-ocr-spa`. Runs as non-root user `1000`.
- **[server.py](file:///d:/Zipstream.online%20github%20Repo%20main/ZipStreamCompression/workers/ocr/server.py):** High-performance Python HTTP server listening on port 8080.
  - Strict parameter validation: rejects non-allowlisted language codes.
  - Invokes `ocrmypdf` via `subprocess.run` with rigid argument lists (zero shell interpolation).
  - Handles exit codes (e.g. Code 2 for password-protected/encrypted PDFs, Code 6 for documents that already have text).
  - Output validation: ensures generated file exists, is non-zero, and begins with `%PDF-`.
  - Always cleans up job workspaces in a `finally` block.

### C. Dedicated Frontend View (`src/components/OcrPdfView.tsx`)
- Direct integration into `/ocr-pdf` with breadcrumb navigation.
- **Security Indicator:** `🟡 Temporary server processing` badge with transparent explainer tooltip.
- **Options Panel:**
  - Recognition language selector with English, Hindi, bilingual English+Hindi, French, German, and Spanish.
  - Mode selector (`Auto`, `Force OCR`, `Skip text`).
  - Toggles for Auto-Deskew and Auto-Rotate Orientation.
- **Realistic Staged Progress:** Displays honest milestone indicators (*"Uploading document..."*, *"Preparing PDF..."*, *"Running OCR text recognition..."*, *"Synthesizing vector text layer..."*, *"Validating output..."*) instead of fake percentages.
- **Password-Protected PDF Recovery:** Detects encrypted files and provides a direct shortcut to `/unlock-pdf`.
- **Completion Card:** Displays file statistics, duration, and one-click download for `filename_searchable.pdf`.

---

## 3. Multilingual Support Matrix

| Language Code | Language | Script | Tesseract Package | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `eng` | English | Latin | `tesseract-ocr-eng` | Default language. High accuracy on standard documents. |
| `hin` | Hindi | Devanagari | `tesseract-ocr-hin` | Full support for Indian invoices, certificates, and books. |
| `eng+hin` | English + Hindi | Mixed | `tesseract-ocr-eng`, `hin` | Combined multi-script model for bilingual Indian records. |
| `fra` | French | Latin | `tesseract-ocr-fra` | European documents with accent marks. |
| `deu` | German | Latin | `tesseract-ocr-deu` | European documents with umlauts. |
| `spa` | Spanish | Latin | `tesseract-ocr-spa` | Spanish documents with inverted punctuation and tildes. |
| `osd` | Orientation & Script Detection | N/A | `tesseract-ocr-osd` | Required for automatic 90°/180° page rotation correction. |

---

## 4. Resource & Execution Boundaries

| Boundary Metric | Configured Value | Enforcement Location |
| :--- | :--- | :--- |
| `OCR_MAX_FILE_SIZE_MB` | 50 MB | Express Gateway & Container HTTP Handler |
| `OCR_MAX_PAGES` | 100 pages | Pre-flight PDF inspection & OCRmyPDF runtime limit |
| `OCR_TIMEOUT_MS` | 180,000 ms (3 min) | Container `subprocess.run` & Gateway AbortController |
| `OCR_JOB_TTL_MS` | 3,600,000 ms (1 hour) | Ephemeral disk cleaner daemon |
| Rate Limit | 15 requests / min / IP | `server/security/rateLimiter.ts` |
| Concurrency | 2 jobs / container instance | `--jobs 2` flag to avoid CPU core starvation |
| Cache Policy | `no-store, no-cache` | Response headers on all download streams |
