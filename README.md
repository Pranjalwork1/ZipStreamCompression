<div align="center">

```
███████╗██╗██████╗ ███████╗████████╗██████╗ ███████╗ █████╗ ███╗   ███╗
╚══███╔╝██║██╔══██╗██╔════╝╚══██╔══╝██╔══██╗██╔════╝██╔══██╗████╗ ████║
  ███╔╝ ██║██████╔╝███████╗   ██║   ██████╔╝█████╗  ███████║██╔████╔██║
 ███╔╝  ██║██╔═══╝ ╚════██║   ██║   ██╔══██╗██╔══╝  ██╔══██║██║╚██╔╝██║
███████╗██║██║     ███████║   ██║   ██║  ██║███████╗██║  ██║██║ ╚═╝ ██║
╚══════╝╚═╝╚═╝     ╚══════╝   ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝
```

### ⚡ The Privacy-First PDF & File Tools Suite — 100% Free, No Upload, No Limits

[![Live Site](https://img.shields.io/badge/🌐_Live_Site-zipstream.online-FF5722?style=for-the-badge&logoColor=white)](https://zipstream.online)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-Apache_2.0-green?style=for-the-badge)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen?style=for-the-badge)](CONTRIBUTING.md)

<br/>

> *"Your files never leave your device. Period."*

<br/>

**[🚀 Try it Live](https://zipstream.online)** · **[📖 Docs](#-architecture)** · **[🐛 Report Bug](https://zipstream.online#report)** · **[✨ Request Feature](https://zipstream.online#report)**

</div>

---

## 🧭 Table of Contents

- [✨ What is ZipStream?](#-what-is-zipstream)
- [🛠️ Tools Catalog](#️-tools-catalog)
- [🏗️ Architecture](#️-architecture)
- [⚡ Quick Start](#-quick-start)
- [🔧 Development Setup](#-development-setup)
- [🚀 Deployment](#-deployment)
- [🌍 Environment Variables](#-environment-variables)
- [🧪 Production Smoke Tests](#-production-smoke-tests)
- [📦 Tech Stack](#-tech-stack)
- [🔐 Privacy & Security](#-privacy--security)
- [🤝 Contributing](#-contributing)
- [👤 Author](#-author)

---

## ✨ What is ZipStream?

**ZipStream** is a blazing-fast, privacy-first, browser-based suite of **30+ PDF and file tools** — built with the philosophy that your documents should never leave your device.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   📄 PDF Tools      🔒 Security & Privacy    🤖 AI Tools       │
│   📦 Compress       🔐 Password Protect      💬 Chat with PDF  │
│   📎 Merge          🔓 Unlock PDF            📝 AI Summarizer  │
│   ✂️  Split          🕵️  Auto-Redact PII       🔍 OCR Search    │
│   🖼️  Scan           🛡️  Privacy Scanner       📊 Compare Docs  │
│                                                                 │
│   🔄 Convert from PDF      📄 Convert to PDF                   │
│   → Word / Excel / PPT     Word → PDF / Excel → PDF            │
│   → JPG / HTML / EPUB      JPG → PDF / HTML → PDF              │
│   → Audio / Text           PowerPoint → PDF                    │
│                                                                 │
│   💼 Business              🤝 Collaborate                      │
│   🧾 GST Invoice           🔗 P2P File Share                   │
│   🧾 POS Billing           🖊️  Collab Whiteboard               │
│   📊 GST Filing Prep                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Why ZipStream?

| Feature | ZipStream | Others |
|---------|-----------|--------|
| Files uploaded to cloud | ❌ Never | ✅ Always |
| Free forever | ✅ Yes | ⚠️ Freemium |
| Sign-up required | ❌ No | ✅ Often |
| File size limits | ❌ None | ✅ Always |
| Works offline (PWA) | ✅ Yes | ❌ No |
| Open source | ✅ Yes | ❌ Rarely |
| Browser-based processing | ✅ 100% | ⚠️ Partial |

---

## 🛠️ Tools Catalog

### 📄 PDF Core Tools

| Tool | URL | Description |
|------|-----|-------------|
| **Compress PDF** | `/compress-pdf` | Ghostscript-powered compression with adaptive profiles — never inflates |
| **Merge PDF** | `/merge-pdf` | Drag-and-drop reordering; combine unlimited PDFs |
| **Split PDF** | `/split-pdf` | Extract page ranges (`1-3, 5, 7-9`) or burst all pages to ZIP |
| **Images to PDF** | `/images-to-pdf` | Multi-image to multi-page PDF with orientation & margin controls |
| **Scan Document** | `/scan-document` | Live camera scanner with perspective correction & contrast enhancement |
| **Watermark PDF** | `/watermark-pdf` | Custom text watermarks with opacity, rotation, color & position |

### 🔄 Convert PDF → Other

| Tool | URL | Output |
|------|-----|--------|
| **PDF to Word** | `/pdf-to-word` | `.docx` — formatted paragraphs and headers |
| **PDF to Excel** | `/pdf-to-excel` | `.csv` / `.xlsx` — geometric column detection |
| **PDF to PowerPoint** | `/pdf-to-powerpoint` | `.pptx` — high-DPI slide deck |
| **PDF to JPG** | `/pdf-to-jpg` | High-res JPG images, single or ZIP bundle |
| **PDF to HTML** | `/pdf-to-html` | Responsive HTML5 standalone document |
| **PDF to Audio** | `/pdf-to-audio` | On-device speech synthesis with voice selection |
| **PDF to EPUB** | `/pdf-to-epub` | EPUB 3.0 compatible with Kindle & Apple Books |
| **Extract Text** | `/extract-text` | Plain text `.txt` + Markdown `.md` with 1-click copy |

### 📄 Convert to PDF

| Tool | URL | Input |
|------|-----|-------|
| **JPG to PDF** | `/jpg-to-pdf` | JPG, PNG, WebP, GIF, BMP → Multi-page PDF |
| **Word to PDF** | `/word-to-pdf` | DOCX, DOC → PDF (mammoth.js + html2canvas) |
| **PowerPoint to PDF** | `/powerpoint-to-pdf` | PPTX, PPT → PDF (slide-by-slide extraction) |
| **Excel to PDF** | `/excel-to-pdf` | XLSX, XLS → PDF (SheetJS table render) |
| **HTML to PDF** | `/html-to-pdf` | HTML file or paste code → PDF |

### 🔐 Security & Privacy

| Tool | URL | Description |
|------|-----|-------------|
| **Protect PDF** | `/protect-pdf` | AES-256 password encryption with granular permissions |
| **Unlock PDF** | `/unlock-pdf` | Remove password protection from authorized PDFs |
| **Auto-Redact PII** | `/redact-pdf` | AI-powered blackout of SSNs, emails, credit cards, phones |
| **Privacy Scanner** | `/privacy-scanner` | Audit & strip author tags, GPS coords, and hidden metadata |
| **File Fingerprint** | `/file-fingerprint` | SHA-256 & SHA-512 cryptographic integrity hashes |

### 🤖 AI-Powered Tools

| Tool | URL | Description |
|------|-----|-------------|
| **Chat with PDF** | `/chat-pdf` | Gemini AI-powered document Q&A and clause extraction |
| **AI Summarizer** | `/summarize-pdf` | Executive briefings, bullet points, and TL;DR summaries |
| **Searchable PDF (OCR)** | `/ocr-pdf` | Add a searchable text layer to scanned documents |
| **Compare PDFs** | `/compare-pdf` | Side-by-side visual diff slider with discrepancy highlighting |
| **Repair PDF** | `/repair-pdf` | Rebuild broken xref tables, headers, and stream objects |

### 💼 Business Tools

| Tool | URL | Description |
|------|-----|-------------|
| **GST Tax Invoice** | `/gst-invoice` | Professional Indian GST invoices with CGST/SGST/IGST breakdown |
| **POS Billing Slip** | `/pos-billing` | Thermal receipt generator with dynamic UPI QR payment code |
| **GST Filing Prep** | `/gst-filing-prep` | GSTR-1 and GSTR-3B monthly sales aggregator with export |

### 🤝 Collaborate & Share

| Tool | URL | Description |
|------|-----|-------------|
| **P2P File Share** | `/p2p-share` | Browser-to-browser WebRTC streaming — zero cloud, QR pairing, SHA-256 verified |
| **Collab Whiteboard** | `/collaborative-whiteboard` | Real-time Excalidraw canvas for sketches, diagrams, and annotations |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        BROWSER (Client)                          │
│                                                                  │
│  ┌──────────┐  ┌────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │ React 18 │  │  Vite 6    │  │  PDF.js      │  │ Gemini AI │ │
│  │ (SPA)    │  │  (Build)   │  │  pdf-lib     │  │ (Chat/OCR)│ │
│  └──────────┘  └────────────┘  └──────────────┘  └───────────┘ │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  Client-Side Engines                     │   │
│  │  mammoth.js  │  SheetJS  │  jsPDF  │  html2canvas        │   │
│  │  JSZip       │  pptxgenjs│  pdf-lib│  WebSpeech API      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                               │
                    WebSocket / WebRTC
                               │
┌──────────────────────────────────────────────────────────────────┐
│                     BACKEND (Railway / Node)                     │
│                                                                  │
│  ┌────────────────┐  ┌─────────────────┐  ┌──────────────────┐  │
│  │ Express + API  │  │  Socket.IO       │  │   Ghostscript    │  │
│  │ (PDF compress) │  │  (P2P signaling) │  │  (PDF engine)    │  │
│  └────────────────┘  └─────────────────┘  └──────────────────┘  │
│                                                                  │
│  ┌────────────────┐  ┌─────────────────┐                        │
│  │ Sharp (images) │  │  BullMQ + Redis  │                       │
│  │ FFmpeg (video) │  │  (Job queuing)   │                       │
│  └────────────────┘  └─────────────────┘                        │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Data Flow Philosophy

```
User's File → Browser Memory → Client-Side Processing → Download
                    ↑                                       ↑
             Never touches                           Stays on your
             the internet                               device
```

> **Exception**: Ghostscript PDF compression and P2P sharing use the Railway backend transiently. Files are never stored — only streamed. The tool clearly discloses its processing method.

---

## ⚡ Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/Pranjalwork1/ZipStreamCompression.git
cd ZipStreamCompression

# 2. Install dependencies
npm install

# 3. Copy environment variables
cp .env.example .env
# Edit .env with your values

# 4. Start development server
npm run dev
```

The app will be available at **`http://localhost:5173`** (Vite dev server).

---

## 🔧 Development Setup

### Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | `≥ 20` | LTS recommended |
| npm | `≥ 10` | Comes with Node |
| Ghostscript | Latest | For server-side PDF compression |
| Redis | `≥ 7` | Optional — for BullMQ job queuing |

### Project Structure

```
ZipStreamCompression/
├── src/
│   ├── components/
│   │   ├── views/
│   │   │   ├── ConvertToPdfView.tsx      # New: Word/Excel/PPT/HTML → PDF
│   │   │   ├── ConvertToolsView.tsx      # PDF → Word/Excel/JPG/etc
│   │   │   ├── SecurityToolsView.tsx     # Encrypt/Unlock/Redact
│   │   │   ├── AiToolsView.tsx           # Chat/Summarize/OCR/Compare
│   │   │   ├── BusinessToolsView.tsx     # GST Invoice/POS/Filing
│   │   │   └── CollaborateToolsView.tsx  # P2P Share/Whiteboard
│   │   ├── HomePage.tsx                  # Landing page + tool grid
│   │   ├── Navbar.tsx                    # Navigation bar
│   │   ├── DropZone.tsx                  # File upload zone
│   │   ├── SearchCommandPalette.tsx      # Ctrl+K search (30+ tools)
│   │   ├── MergePdfView.tsx              # Merge tool UI
│   │   ├── SplitPdfView.tsx              # Split tool UI
│   │   ├── WatermarkPdfView.tsx          # Watermark tool UI
│   │   ├── ScanDocumentView.tsx          # Camera scanner
│   │   ├── ImagesToPdfView.tsx           # Images → PDF
│   │   ├── ToolLandingPage.tsx           # SEO wrapper + tool info pages
│   │   └── ...
│   ├── utils/
│   │   ├── compressionEngine.ts          # Client-side compression logic
│   │   ├── pdfConverter.ts               # PDF conversion utilities
│   │   ├── formatters.ts                 # File category detection
│   │   └── fileInfo.ts                   # File metadata helpers
│   ├── App.tsx                           # Root — routing, state, layout
│   ├── types.ts                          # TypeScript type definitions
│   └── main.tsx                          # React entry point
├── server/                               # Node.js + Express backend
├── public/                               # Static assets, PWA manifest
├── Dockerfile                            # Production container
├── docker-compose.yml                    # Local full-stack environment
├── vite.config.ts                        # Vite bundler configuration
└── package.json
```

### Available Scripts

```bash
npm run dev          # Start Vite dev server (frontend)
npm run build        # Production build (frontend + server bundles)
npm run start        # Start production server
npm run lint         # TypeScript type check
npm run preview      # Preview production build locally
```

### Running Full Stack Locally (Docker)

```bash
# Start all services (frontend + backend + Redis)
docker compose up --build

# Services:
# Frontend  → http://localhost:5173
# Backend   → http://localhost:3000
# Redis     → localhost:6379
```

---

## 🚀 Deployment

### Frontend → Vercel

```bash
# Deploy to production
git checkout main
git pull origin main
git add .
git commit -m "feat: your change description"
git push origin main
# Vercel auto-deploys on push to main
```

### Backend → Railway

Railway auto-deploys from the **Dockerfile**:

```dockerfile
# Installs Ghostscript, Node.js, and runs the Express server
FROM node:20-slim
RUN apt-get install -y ghostscript
COPY . .
RUN npm install && npm run build
CMD ["npm", "start"]
```

### Manual Deploy via Railway CLI

```bash
railway up
```

---

## 🌍 Environment Variables

### Frontend (Vercel)

Create a `.env` file or set in Vercel dashboard:

```bash
# Required
VITE_BACKEND_URL=https://your-railway-domain.up.railway.app
VITE_PUBLIC_APP_URL=https://zipstream.online

# Optional — Gemini AI features (Chat PDF, Summarizer, OCR)
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

### Backend (Railway)

Set directly in Railway's environment panel (never commit these):

```bash
# Server
NODE_ENV=production
PORT=3000

# AI
GEMINI_API_KEY=your_gemini_api_key_here

# WebRTC TURN Server (highly recommended for mobile/restrictive networks)
TURN_URL=turn:your-turn-server:3478
TURN_USERNAME=your_turn_username
TURN_CREDENTIAL=your_turn_credential

# P2P Room Cache
MAX_ROOM_DOCUMENT_BYTES=262144000   # 250 MB default

# Redis (optional — for BullMQ job queues)
REDIS_URL=redis://your-redis-host:6379
```

> 💡 **TURN servers** are optional but strongly recommended for P2P sharing to work reliably behind corporate firewalls, NAT, and mobile data networks.

---

## 🧪 Production Smoke Tests

Run these after every significant deploy:

```
✅ Test 1 — PDF Compression
   → Visit /compress-pdf
   → Upload a real multi-page, image-heavy PDF (> 2MB)
   → Verify the downloaded file is smaller and renders correctly

✅ Test 2 — Office File Compression
   → Upload .docx, .pptx, .xlsx
   → Verify each compresses without corruption

✅ Test 3 — Convert to PDF
   → Upload a .docx → download as PDF, check text preserved
   → Upload a .xlsx → download as PDF, check table rendered
   → Upload a .pptx → download as PDF, check slides present
   → Paste HTML code → download as PDF, check content visible
   → Upload JPG(s) → download as multi-page PDF

✅ Test 4 — P2P File Sharing
   → Open /p2p-share on desktop, copy the /room/<id> URL
   → Open on a mobile device (different network preferred)
   → Scan the QR code with the phone camera
   → Verify file transfers and SHA-256 hash matches

✅ Test 5 — Search Palette
   → Press Ctrl+K
   → Type "word to pdf" → verify new tool appears
   → Type "excel to pdf" → verify tool appears
   → Select a tool → verify navigation works

✅ Test 6 — AI Tools (requires GEMINI_API_KEY)
   → Visit /chat-pdf, upload a PDF, ask a question
   → Visit /summarize-pdf, generate a summary

✅ Test 7 — Browser Back/Forward
   → Navigate through 3+ tools
   → Press browser back → verify correct tool loads
   → Press browser forward → verify correct tool loads
```

---

## 📦 Tech Stack

### Frontend

| Library | Version | Purpose |
|---------|---------|---------|
| React | 18.3 | UI framework |
| TypeScript | 5.8 | Type safety |
| Vite | 6.2 | Build tool & dev server |
| TailwindCSS | 4.x | Utility-first CSS |
| Lucide React | 0.546 | Icon library |
| PDF.js | 3.11 | PDF rendering & text extraction |
| pdf-lib | 1.17 | PDF generation & manipulation |
| jsPDF | latest | Client-side PDF creation |
| html2canvas | latest | DOM → Canvas capture |
| mammoth.js | latest | DOCX → HTML conversion |
| SheetJS (xlsx) | latest | Excel parsing & rendering |
| JSZip | 3.10 | ZIP file handling (PPTX parsing) |
| pptxgenjs | 4.0 | PowerPoint generation |
| Excalidraw | 0.18 | Collaborative whiteboard canvas |
| canvas-confetti | 1.9 | Success celebration effect |
| Motion | 12.x | Animation library |

### Backend

| Library | Version | Purpose |
|---------|---------|---------|
| Express | 4.21 | HTTP server & API |
| Socket.IO | 4.8 | WebSocket for P2P signaling |
| Sharp | 0.35 | Server-side image processing |
| Ghostscript | latest | Production PDF compression |
| FFmpeg | latest | Audio/video compression |
| BullMQ | 6.3 | Job queue management |
| Redis (ioredis) | 6.0 | Queue storage & pub/sub |
| Multer | 2.3 | File upload handling |
| QRCode | 1.5 | QR code generation for P2P |

### Infrastructure

| Service | Purpose |
|---------|---------|
| **Vercel** | Frontend hosting & CDN |
| **Railway** | Node.js backend + Ghostscript |
| **Docker** | Containerized deployment |
| **Google Analytics** | Privacy-respecting usage analytics |

---

## 🔐 Privacy & Security

ZipStream is built with a **zero-trust, privacy-first** model:

```
📁 Your Files                    🌐 The Internet
     │                                   │
     ▼                                   ✗
 Browser Memory ─────────────────────────
     │
     ▼ (processed locally)
 Output File
     │
     ▼
 Your Downloads Folder
```

### What we guarantee:

- ✅ **No file storage** — Files are never persisted on any server
- ✅ **No accounts** — Zero sign-up, zero login, zero tracking of your files
- ✅ **Client-side processing** — All PDF/image/audio tools run in your browser using WebAssembly and HTML5 Canvas
- ✅ **Open source** — Every line of processing logic is auditable
- ✅ **HTTPS always** — All connections are TLS encrypted
- ✅ **P2P encryption** — WebRTC data channels are end-to-end encrypted
- ✅ **SHA-256 verification** — P2P transferred files are hash-verified before delivery

### Tool transparency labels:

Each tool on ZipStream clearly discloses whether it processes files:
- 🟢 **In your browser** — Pure client-side (most tools)
- 🟡 **Via server (transient)** — Ghostscript compression, P2P signaling (never stored)

---

## 🤝 Contributing

We welcome contributions from the community! Here's how to get started:

### Reporting Bugs

Use the in-app **"Report an Issue"** button at the bottom of every page, or open a GitHub issue.

### Submitting Pull Requests

```bash
# 1. Fork the repository
# 2. Create your feature branch
git checkout -b feat/your-amazing-feature

# 3. Make your changes
# 4. Ensure TypeScript passes
npm run lint

# 5. Test the build
npm run build

# 6. Commit with conventional commit messages
git commit -m "feat: add your amazing feature"

# 7. Push and open a PR
git push origin feat/your-amazing-feature
```

### Commit Convention

```
feat:     New feature
fix:      Bug fix
perf:     Performance improvement
refactor: Code restructuring (no feature/fix)
docs:     Documentation only
style:    Formatting, no logic change
chore:    Build system, dependencies
```

### Code Style

- **TypeScript** — strict mode enabled, no `any` without justification
- **Components** — functional components only, hooks-based
- **Naming** — `PascalCase` for components, `camelCase` for functions/variables
- **CSS** — TailwindCSS utility classes; no inline styles unless dynamic

---

## 🙏 Acknowledgements

- [**PDF.js**](https://mozilla.github.io/pdf.js/) — Mozilla's incredible PDF rendering engine
- [**pdf-lib**](https://pdf-lib.js.org/) — Pure JavaScript PDF creation and modification
- [**Excalidraw**](https://excalidraw.com/) — Open source collaborative canvas
- [**Lucide**](https://lucide.dev/) — Beautiful, consistent icon set
- [**Ghostscript**](https://www.ghostscript.com/) — Industry-standard PostScript & PDF interpreter

---

## 👤 Author

<div align="center">

**Pranjal Singh**

*Founder & Developer of ZipStream*

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Pranjal_Singh-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/pranjal-singh-02aba0363/)
[![Twitter / X](https://img.shields.io/badge/X_(Twitter)-@Pranjalwork-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/Pranjalwork)
[![Instagram](https://img.shields.io/badge/Instagram-@officialpranjal1111-E4405F?style=for-the-badge&logo=instagram&logoColor=white)](https://www.instagram.com/officialpranjal1111)
[![YouTube](https://img.shields.io/badge/YouTube-Decoding_Pranjal_Singh-FF0000?style=for-the-badge&logo=youtube&logoColor=white)](https://www.youtube.com/@DecodingPranjalSingh)
[![Email](https://img.shields.io/badge/Email-Pranjalsinghwork1@gmail.com-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:Pranjalsinghwork1@gmail.com)

</div>

---

## 📄 License

```
Copyright 2024-2026 Pranjal Singh (ZipStream)

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

---

<div align="center">

**Built with ❤️ in Greater Noida, India 🇮🇳**

*If ZipStream saved you time, consider giving it a ⭐ on GitHub!*

[![Star on GitHub](https://img.shields.io/github/stars/Pranjalwork1/ZipStreamCompression?style=social)](https://github.com/Pranjalwork1/ZipStreamCompression)

</div>
