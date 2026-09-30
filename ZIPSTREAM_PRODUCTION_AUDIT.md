# ZIPSTREAM.ONLINE — PRODUCTION AUDIT REPORT

**Date:** 2026-09-30  
**Repository:** `https://github.com/Pranjalwork1/ZipStreamCompression`  
**Audit Type:** Full-Stack Production Hardening, Security, Scalability, SEO, Reliability, & Performance Audit  
**Status:** Audit Completed — Implementation Strategy Formulated

---

## 1. EXECUTIVE SUMMARY & CURRENT ARCHITECTURE

ZipStream.online is a multi-format file optimization, conversion, document intelligence, and peer-to-peer collaboration suite. The application operates with a hybrid client-server model:
1. **Client-Side Engine (Browser):** Built in React 18 with Vite and TypeScript. Executes local PDF rasterization, image encoding, EXIF stripping, PDF merging/splitting/watermarking, invoice generation, and privacy scanning directly in the browser via `pdf-lib`, `pdfjs-dist`, `canvas-confetti`, and native browser APIs.
2. **Server-Side Engine (Node.js/Express + Workers):**
   - Express server (`server.ts`) hosting API routes, Socket.IO WebRTC signaling, Ghostscript PDF compression (`/api/compress/pdf`), BullMQ queue manager (`/api/compress`), LibreOffice document converter (`/api/convert/word-to-pdf`), Sarvam AI and Gemini AI proxies (`/api/sarvam/*`, `/api/gemini/*`), and ephemeral P2P room caches.
   - Background worker (`server/compression/worker.ts` & `processors/*`) consuming BullMQ jobs for heavy processing using Ghostscript, Sharp, FFmpeg, and native PDF stream optimizers.
   - Ephemeral room document storage with fallback HTTP download for WebRTC peer-to-peer sharing.

---

## 2. INVENTORY OF DATA FLOWS & SYSTEM INTERFACES

### 2.1 File Ingestion Points (Where Files Enter)
- `POST /api/compress/pdf` — Raw octet-stream/PDF binary payload (max 80 MB) into temporary storage for Ghostscript optimization.
- `POST /api/compress/upload` — Multer multipart upload (max 250 MB) to disk storage (`UPLOAD_DIR`).
- `POST /api/convert/word-to-pdf` — Multer multipart upload (max 50 MB) for DOCX/DOC files into `WORD_UPLOAD_DIR`.
- `POST /api/rooms/:roomId/document` — Raw binary stream or legacy JSON Base64 payload (max 250 MB) into ephemeral OS temp directories.
- `POST /api/sarvam/stt` — Multer memory storage audio upload (max 15 MB) for speech transcription.
- Client-side drag-and-drop / file input across 35+ tools (processed in browser memory / Web Workers).

### 2.2 File Egress Points (Where Files Leave)
- `POST /api/compress/pdf` — Direct binary stream response (`application/pdf`) with compression metrics headers.
- `GET /api/compress/download/:jobId` — Download streaming endpoint (`createReadStream`) for completed BullMQ/local jobs.
- `GET /api/convert/download/:jobId` — Download streaming endpoint for converted PDF documents.
- `GET /api/rooms/:roomId/document/raw` — Raw byte stream recovery endpoint for P2P collaboration.
- `GET /api/rooms/:roomId/document` — JSON metadata endpoint with optional Base64 payload.
- Socket.IO `relay-chunk-fallback` event — Direct chunk relay between connected sockets.
- Client-side browser download triggers (`URL.createObjectURL(blob)`).

### 2.3 Resource Consumption Matrix

| Endpoint / Subsystem | CPU Impact | RAM Impact | Bandwidth Impact | Third-Party Quota | Storage Impact |
|---|---|---|---|---|---|
| `POST /api/compress/pdf` | High (Ghostscript / Sharp) | Medium (80MB buffer) | High | None | Temp directory (deleted in `finally`) |
| `POST /api/compress/upload` | High (BullMQ worker processing) | Low-Medium (streaming) | High | None | `STORAGE_DIR` (disk uploads + results) |
| `POST /api/convert/word-to-pdf` | High (LibreOffice / soffice) | Medium-High | Medium | None | Temp directory (auto-cleaned) |
| `POST /api/rooms/:roomId/document` | Low | High (70MB JSON parser limit) | High (up to 250MB) | None | Temp directory (4h TTL) |
| `POST /api/sarvam/*` | Low | Low | Low | Sarvam AI API | None |
| `POST /api/gemini/*` | Low | Low | Low | Google Gemini API | None |
| Socket.IO Relay | Low-Medium | Medium (100MB buffer) | High (P2P chunks) | None | In-memory only |

---

## 3. SECURITY FINDINGS & VULNERABILITY AUDIT

### Finding SEC-01: Insecure P2P Room Authorization & Document Access (HIGH RISK)
- **Location:** `server.ts` (lines 524-604), `server.js` (lines 95-163).
- **Issue:** Room document upload (`POST /api/rooms/:roomId/document`) and raw download (`GET /api/rooms/:roomId/document/raw`) rely solely on `roomId`. An attacker guessing or enumerating a 4-64 character room ID can download or overwrite another user's active document without authentication or secret capability tokens.
- **Remediation:** Enforce cryptographically secure room secret/capability tokens (`X-Room-Token` or `?token=`). Return `401 Unauthorized` / `403 Forbidden` without leaking document existence. Generate room IDs with cryptographic randomness.

### Finding SEC-02: Permissive CORS Configuration (MEDIUM-HIGH RISK)
- **Location:** `server.ts` (lines 89, 375), `server.js` (lines 34, 72).
- **Issue:** Express CORS is configured with `origin: true` (reflecting any incoming Origin header with `credentials: true`), and Socket.IO uses `origin: '*'`. Malicious external web pages could make authenticated/credentialed cross-origin requests to private API endpoints.
- **Remediation:** Implement strict `CORS_ALLOWED_ORIGINS` whitelist matching `https://zipstream.online`, `https://www.zipstream.online`, and local development origins strictly when `NODE_ENV !== 'production'`.

### Finding SEC-03: Host Header Injection in Canonical Redirect (MEDIUM RISK)
- **Location:** `server.ts` (lines 131-140), `server.js` (lines 20-29).
- **Issue:** `const host = req.headers.host || ''; const cleanHost = host.replace(/^www\./i, ''); res.redirect(301, `https://${cleanHost}${req.originalUrl}`);` trusts incoming `Host` header. If a reverse proxy passes an attacker-controlled Host, it creates an open redirect.
- **Remediation:** Use configured canonical host (`PUBLIC_BASE_URL=https://zipstream.online`) for apex domain redirects rather than trusting `req.headers.host`.

### Finding SEC-04: Static TURN Credentials Exposure (MEDIUM RISK)
- **Location:** `server.ts` (lines 504-519).
- **Issue:** `/api/webrtc-config` serves static `process.env.TURN_USERNAME` and `process.env.TURN_CREDENTIAL` to any unauthenticated caller on the public internet, allowing third parties to drain paid TURN bandwidth.
- **Remediation:** Protect the endpoint or generate time-limited ephemeral TURN credentials if a TURN secret is provided.

### Finding SEC-05: Missing Content Security Policy (CSP) (MEDIUM RISK)
- **Location:** `server.ts` (security headers middleware).
- **Issue:** Strict-Transport-Security, X-Frame-Options, X-Content-Type-Options are present, but Content-Security-Policy (CSP) is absent.
- **Remediation:** Construct and enforce a comprehensive CSP permitting required fonts (Google Fonts), analytics (Google Analytics, Umami), Google AdSense, WebRTC STUN/TURN, and internal API connections while blocking malicious inline script execution and external exfiltration.

### Finding SEC-06: In-Memory Flat Rate Limiting (SCALABILITY & ABUSE RISK)
- **Location:** `server.ts` (lines 84, 174-187).
- **Issue:** An in-memory `Map` with a single flat limit (120 req/min) covers all `/api` routes. Does not scale horizontally across multiple instances and does not provide tiered protection for expensive endpoints (AI, compression, room uploads, P2P relay).
- **Remediation:** Introduce a unified Redis-backed rate limiter (falling back safely to in-memory store) with endpoint-specific quotas: General API, Uploads, Compression, AI, P2P, and Room Creation.

### Finding SEC-07: Unrestricted Socket.IO Relay Bandwidth (ABUSE RISK)
- **Location:** `server.ts` (lines 460-467), `server.js` (lines 215-219).
- **Issue:** `relay-chunk-fallback` allows arbitrary binary chunks to be relayed between clients with no rate or byte-quota tracking, exposing the server to bandwidth flooding or abuse as an arbitrary data relay.
- **Remediation:** Add per-socket and per-room bandwidth meters, message frequency limits, and chunk size caps (e.g. 64KB max chunk, max 20 msgs/sec, max 500MB per room session).

### Finding SEC-08: Docker Container Execution as Root (DEVOPS RISK)
- **Location:** `Dockerfile` (lines 1-28).
- **Issue:** Container executes as root without a dedicated unprivileged user (`USER node` or custom `zipstream` user).
- **Remediation:** Create a dedicated non-root user and group, chown storage directories, and set `USER` directive.

---

## 4. SCALABILITY & RELIABILITY FINDINGS

1. **Job Queue Architecture:** BullMQ and Redis are already integrated in `server/compression/queue.ts` and `worker.ts`, with an embedded local runner fallback when Redis is offline. This architecture is solid and should be maintained and extended to protect against unbounded queuing.
2. **Graceful Shutdown:** The server currently does not handle `SIGTERM` / `SIGINT` to close active HTTP connections, stop the BullMQ worker, disconnect Redis, or cleanly flush pending operations.
3. **Health & Readiness Endpoints:** `/api/health` exists, but there is no dedicated `/api/ready` endpoint verifying that Redis, worker subsystems, and storage paths are writable and ready to accept traffic.
4. **Base64 JSON Overhead:** `server.ts` permits up to 70MB JSON payloads which creates heavy V8 GC pressure for base64 room documents. Native binary streaming is already preferred in `CollaborateToolsView.tsx`, but backend memory protection can be tightened.

---

## 5. SEO & INDEXING FINDINGS

1. **Unverifiable Aggregate Rating Schema (Critical SEO Issue):**
   - `index.html` lines 195-200 contains hardcoded fake schema: `"ratingValue": "4.9", "reviewCount": "2847"`. This violates Google Search Essentials and risks manual action / algorithmic penalties for deceptive structured data. Must be removed immediately.
2. **Misleading LocalBusiness Schema:**
   - `index.html` lines 144-164 marks ZipStream as a physical `LocalBusiness` in Greater Noida with price range `$0`. ZipStream is a global web utility platform and should use `Organization` / `WebApplication` / `SoftwareApplication`.
3. **Technically Inaccurate Privacy Claims in Meta Tags:**
   - `index.html` lines 80 and 94 claim "100% private — files never leave your browser" across the board. While true for browser-based tools, features like Word-to-PDF conversion, Ghostscript compression, and AI document chat temporarily utilize server-side processing or AI provider APIs.
4. **Server-Side SEO Dynamic Tag Injection:**
   - Single-page application routes (`/compress-pdf`, `/merge-pdf`, `/word-to-pdf`) rely on client-side React code to modify `<title>` and `<meta name="description">`. For search crawlers that do not execute JavaScript, serving pre-populated canonical titles, meta descriptions, and OpenGraph data improves crawl efficiency and indexing reliability.

---

## 6. CODEPATHS THAT MUST NOT BE MODIFIED UNNECESSARILY

In accordance with user rules:
- **`src/utils/compressionEngine.ts`:** Existing browser compression algorithms, quantization logic, step sequences, and presets must NOT be rewritten.
- **Ghostscript command construction & flags:** Existing flags (`-dSAFER`, `-dBATCH`, `-dNOPAUSE`, `-dPDFSETTINGS`, downsampling bicubic/subsample formulas) are tested and functional. Wrap with safety checks; do not change flag behaviors.
- **`server/compression/processors/*`:** `pdfWorker.ts`, `imageWorker.ts`, `videoWorker.ts`, `audioWorker.ts` work correctly. Maintain core logic; only add error boundaries and timeouts.
- **Core React UI flows:** Navigation, tool cards, drag-and-drop mechanics, settings cards, and success screens must preserve their visual and functional state.
- **Authentication / P2P signaling algorithms:** WebRTC signaling message types (`signal-offer`, `signal-answer`, `signal-ice`) must maintain backward compatibility so active clients are not broken.

---

## 7. RECOMMENDED IMPLEMENTATION ORDER

1. **Step 3:** Change log & rollback strategy (`ZIPSTREAM_CHANGELOG.md`).
2. **Step 4:** Centralized Environment Configuration & Validation (`server/config/env.ts`).
3. **Step 5:** CORS Hardening with strict origin whitelist.
4. **Step 6:** Host header / Canonical base URL redirect hardening.
5. **Step 7:** Security Headers & Content-Security-Policy (CSP).
6. **Step 8:** Distributed Redis-backed & In-Memory Rate Limiting with categorized limits.
7. **Step 9 & 10:** AI Endpoint Protection & Cost Controls (limits, token budgets, error safety).
8. **Step 11 & 12:** File upload validation (magic bytes, sanitized filenames, path traversal protection).
9. **Step 13 & 14:** Ghostscript security wrappers & process isolation.
10. **Step 15:** Temporary file handling & orphan cleanup daemon.
11. **Step 16-21:** Office, FFmpeg, Image, and LibreOffice security wrappers.
12. **Step 22-25:** P2P room authorization tokens, document access controls, and Socket.IO relay protection.
13. **Step 32-35:** Observability, health/readiness endpoints (`/api/health`, `/api/ready`), and graceful shutdown.
14. **Step 36-47:** SEO fixes (remove fake ratings, fix schema, add server-side meta injection, correct privacy messaging).
15. **Step 54-55:** Comprehensive automated test suite (security tests, compression regression tests, golden file checks).
16. **Step 89-94:** Final build, audit, and documentation generation.
