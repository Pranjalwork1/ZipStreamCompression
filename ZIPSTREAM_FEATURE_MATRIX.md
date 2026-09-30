# ZipStream Feature Matrix

This matrix categorizes all production tools and subsystems across execution runtime (Browser on-device, Sandboxed Backend, or Third-Party Provider), authentication requirements, rate limiting tiers, and automated test coverage.

| Feature / Tool | Browser | Backend | Third Party | Auth Required | Rate Limit Tier | Verified & Tested |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **PDF Compression (Client-Side)** | ✅ Yes | ❌ No | ❌ No | ❌ No | General (Client) | ✅ Verified (Vitest) |
| **PDF Compression (Ghostscript Server Engine)** | ❌ No | ✅ Yes (Worker) | ❌ No | Optional | Strict (`compression`: 20/15m) | ✅ Verified (Vitest + Regression) |
| **PDF Merge** | ✅ Yes | ❌ No | ❌ No | ❌ No | General | ✅ Verified (pdf-lib) |
| **PDF Split / Extract Pages** | ✅ Yes | ❌ No | ❌ No | ❌ No | General | ✅ Verified (pdf-lib) |
| **PDF Rotate & Reorder** | ✅ Yes | ❌ No | ❌ No | ❌ No | General | ✅ Verified (pdf-lib) |
| **Watermark PDF** | ✅ Yes | ❌ No | ❌ No | ❌ No | General | ✅ Verified (pdf-lib) |
| **Page Numbering** | ✅ Yes | ❌ No | ❌ No | ❌ No | General | ✅ Verified (pdf-lib) |
| **Protect PDF (Password Encryption)** | ✅ Yes | ❌ No | ❌ No | ❌ No | General | ✅ Verified (pdf-lib) |
| **Unlock PDF (Decrypt)** | ✅ Yes | ❌ No | ❌ No | ❌ No | General | ✅ Verified (pdf-lib) |
| **Auto-Redact PII** | ✅ Yes | ❌ No | ❌ No | ❌ No | General | ✅ Verified (Regex + Canvas) |
| **Privacy Metadata Scanner & Strip** | ✅ Yes | ❌ No | ❌ No | ❌ No | General | ✅ Verified (pdf-lib) |
| **Flatten PDF Forms** | ✅ Yes | ❌ No | ❌ No | ❌ No | General | ✅ Verified (pdf-lib) |
| **Repair PDF** | ✅ Yes | ❌ No | ❌ No | ❌ No | General | ✅ Verified (pdf-lib) |
| **Crop PDF Pages** | ✅ Yes | ❌ No | ❌ No | ❌ No | General | ✅ Verified (Canvas + pdf-lib) |
| **Resize / Scale PDF** | ✅ Yes | ❌ No | ❌ No | ❌ No | General | ✅ Verified (Canvas + pdf-lib) |
| **Grayscale / B&W PDF** | ✅ Yes | ❌ No | ❌ No | ❌ No | General | ✅ Verified (Canvas + pdf-lib) |
| **PDF to JPG / PNG / WebP Images** | ✅ Yes | ❌ No | ❌ No | ❌ No | General | ✅ Verified (pdfjs-dist) |
| **JPG / PNG / WebP to PDF** | ✅ Yes | ❌ No | ❌ No | ❌ No | General | ✅ Verified (pdf-lib) |
| **PDF to Text / Extraction** | ✅ Yes | ❌ No | ❌ No | ❌ No | General | ✅ Verified (pdfjs-dist) |
| **Searchable PDF (OCR)** | ✅ Yes | ❌ No | ❌ No | ❌ No | General | ✅ Verified (Tesseract.js Wasm) |
| **HTML / Markdown to PDF** | ✅ Yes | ❌ No | ❌ No | ❌ No | General | ✅ Verified (jsPDF + html2canvas) |
| **Word to PDF (Browser Fallback)** | ✅ Yes | ❌ No | ❌ No | ❌ No | General | ✅ Verified (mammoth.js) |
| **Word / Office to PDF (High Fidelity)** | ❌ No | ✅ Yes (Worker) | ❌ No | Optional | Strict (`upload`: 30/15m) | ✅ Verified (LibreOffice container) |
| **Camera Document Scanner** | ✅ Yes | ❌ No | ❌ No | ❌ No | General | ✅ Verified (WebRTC MediaDevices) |
| **Sign PDF & Digital Signatures** | ✅ Yes | ❌ No | ❌ No | ❌ No | General | ✅ Verified (Canvas + pdf-lib) |
| **Compare PDF (Visual & Text Diff)** | ✅ Yes | ❌ No | ❌ No | ❌ No | General | ✅ Verified (Canvas diff) |
| **Invoice Generator** | ✅ Yes | ❌ No | ❌ No | ❌ No | General | ✅ Verified (pdf-lib) |
| **Fillable PDF Form Builder** | ✅ Yes | ❌ No | ❌ No | ❌ No | General | ✅ Verified (pdf-lib interactive) |
| **AI Document Summarizer (Local Heuristic)** | ✅ Yes | ❌ No | ❌ No | ❌ No | General | ✅ Verified (NLP client heuristic) |
| **AI Document Summarizer (Cloud)** | ❌ No | ✅ Yes (Backend Proxy) | ✅ Gemini / Sarvam | Optional | Strict (`ai`: 15/15m) | ✅ Verified (Proxy + Token limits) |
| **AI Document Q&A / Chat** | ❌ No | ✅ Yes (Backend Proxy) | ✅ Gemini | Optional | Strict (`ai`: 15/15m) | ✅ Verified (Proxy + Token limits) |
| **P2P Collaboration Room (Direct WebRTC)** | ✅ Yes | ❌ Signaling Only | ❌ No | Room Secret Token | Strict (`roomCreate`: 10/1h) | ✅ Verified (WebRTC DataChannel) |
| **P2P Server Relay Fallback** | ❌ No | ✅ Yes (Socket.IO) | ❌ No | Room Secret Token | Bandwidth Capped (500MB/room) | ✅ Verified (Timing-safe token check) |
| **P2P Whiteboard / Excalidraw** | ✅ Yes | ❌ Signaling Only | ❌ No | Room Secret Token | General | ✅ Verified (Excalidraw client) |
| **TURN Credential Vending** | ❌ No | ✅ Yes (Ephemeral HMAC) | Optional Coturn | ❌ No | Tiered IP Limit | ✅ Verified (RFC 5766 HMAC) |

---

### Key Architectural Standards
1. **Privacy-First Zero Upload Guarantee:** 28 out of 35 tools execute 100% locally inside the user's browser using WebAssembly and standard HTML5 Web APIs.
2. **Safe Server Isolation:** Tools requiring server execution run inside Docker non-root containers with isolated temporary directories, process timeouts, and automatic orphan cleanup.
3. **No Frontend Secrets:** All external APIs (Gemini, Sarvam, Supabase Service Role, Coturn HMAC) are managed exclusively server-side.
