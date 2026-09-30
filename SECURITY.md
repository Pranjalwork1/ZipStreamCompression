# Security Policy & Architecture — ZipStream.online

At ZipStream, we take privacy and document security seriously. This document describes our security architecture, data processing models, and vulnerability disclosure process.

---

## 1. Security Architecture & Processing Models

ZipStream implements a tiered data processing architecture designed to minimize server-side file handling and eliminate unnecessary document persistence.

### Tier 1: Client-Side Browser Execution (Zero-Upload)
The vast majority of tools execute entirely within the user's browser runtime:
- **PDF Manipulation:** Merge, Split, Watermark, Invert, Reorder, Rotate.
- **Client Compression:** Browser canvas raster downsampling and dynamic EXIF stripping.
- **Image Conversion:** Image format conversions (PNG, JPEG, WebP) running in web workers.
- **Business Tools:** GST Invoicing, POS billing slip generation, QR code generation.
- **Security Scanners:** Metadata privacy auditor, SHA-256 / SHA-512 cryptographic file fingerprinting.

*Files processed under Tier 1 never leave the client device.*

### Tier 2: Isolated Server Processing
For complex operations requiring specialized system utilities (such as high-compression Ghostscript optimization and Microsoft Word-to-PDF layout fidelity):
- Processing runs in an isolated, sandboxed environment under a non-root unprivileged process.
- All operations are allocated isolated, randomly generated temporary folders (`mkdtemp`).
- Input and output documents are deleted immediately upon job completion or failure in a guaranteed `finally` block.
- Files are not permanently stored, indexed, or shared with third parties.
- Automated background daemons periodically sweep temporary storage to purge any orphaned artifacts older than two hours.

### Tier 3: Sandboxed AI Document Intelligence
- Document analysis (Q&A, summarization) queries routed to configured AI providers (Google Gemini or Sarvam AI) are handled strictly through our backend proxy.
- **Zero Client Key Exposure:** All API keys remain isolated server-side.
- Input prompt lengths, token quotas, and rate limits are strictly enforced to prevent abuse.
- Only the specific document text or user query needed for the response is submitted.

### Tier 4: Peer-to-Peer Document Collaboration
- Document sharing operates directly between peers over encrypted WebRTC data channels.
- When NAT traversal requires WebSocket fallback, all chunks are capped at 128 KB and subject to room-level bandwidth throttling.
- Access to room documents is protected by 256-bit cryptographic capability tokens; unauthorized requests receive immediate 401/403 denials without leaking document existence.
- Room sessions automatically expire after 4 hours or after 1 hour of inactivity.

---

## 2. Security Controls & Protections

- **Network Security:** Strict Content-Security-Policy (CSP), HSTS preload, X-Content-Type-Options: nosniff, X-Frame-Options: SAMEORIGIN, and Referrer-Policy.
- **CORS Protection:** Cross-origin requests in production are whitelisted strictly to `zipstream.online` and its authorized apex domains.
- **Rate Limiting:** Multi-tiered distributed rate limiters for General API, File Uploads, Compression Engine, AI Assistants, and P2P room operations.
- **Path Traversal Defense:** Strict input sanitization rejecting `../`, absolute paths, null bytes, and traversal attempts.
- **Decompression Bomb Protection:** Size, ratio, and file-count caps on archive and document extractions.

---

## 3. Reporting a Vulnerability & Responsible Disclosure

We welcome responsible security research. If you discover a vulnerability or security flaw, please report it privately:

- **Security Contact:** Pranjalsinghwork1@gmail.com
- **Subject:** `[SECURITY] ZipStream Vulnerability Report - <Summary>`

### Please Include:
1. Description of the vulnerability and attack surface.
2. Step-by-step reproduction steps or harmless proof of concept.
3. Impact assessment.

### Rules of Engagement:
- Do NOT perform destructive testing or denial-of-service against production.
- Do NOT access or modify data belonging to other users.
- Allow reasonable time for remediation before public disclosure.
