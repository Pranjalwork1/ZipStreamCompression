# ZipStream Edit PDF — Architecture & Developer Documentation

## 1. Overview
ZipStream **Edit PDF** (`/edit-pdf`) is a high-performance, client-side, privacy-preserving PDF editing suite. It allows users to add text, insert images, draw vector shapes, highlight text, strikethrough, underline, add comments, and freehand annotate PDF documents without sending a single byte of their confidential documents to external servers.

---

## 2. Architecture & Layered Rendering Model

The editor implements a strict layered architecture:

```
┌─────────────────────────────────────────────────────────────┐
│ High-DPI PDF.js Canvas Layer (Base Document)                │
├─────────────────────────────────────────────────────────────┤
│ Interactive SVG & DOM Overlay Layer                         │
│  ├── Vector Shapes (Rectangles, Ellipses, Lines, Arrows)    │
│  ├── Translucent Highlights (Mix-blend-mode: multiply)      │
│  ├── Freehand Drawing Paths (Pointer events / Touch)        │
│  ├── Text Elements (Contenteditable / Font Styling)         │
│  ├── Image Overlays (PNG / JPG / WebP)                      │
│  └── Sticky Notes & Comments                                │
├─────────────────────────────────────────────────────────────┤
│ 8-Point Selection & Transformation Controls                 │
└─────────────────────────────────────────────────────────────┘
```

### Key Architectural Tenet: Non-Destructive Editing
ZipStream does **NOT** flatten pages into raster screenshots during editing or export.
- The original PDF pages remain intact as true vector documents.
- Annotations and overlays are drawn onto the existing document using `pdf-lib` at export time.
- Original vector text, fonts, hyperlinks, bookmarks, and embedded high-resolution graphics remain sharp and unaffected.

---

## 3. Supported Features & Object Model

Every editor annotation is modeled by an extensible `EditorElement` / `EditorObject`:

- **Text Element (`type: 'text'`):**
  - Font families: Helvetica, Times-Roman, Courier, Arial, Georgia, Monospace.
  - Font size (10px - 72px), Bold, Italic, Underline, Color, Alignment (left, center, right), and Opacity.
  - Click-to-place, inline text editing, drag to move, 8-point resize handles, duplicate, and delete.
- **Image Element (`type: 'image'`):**
  - Upload PNG, JPG, JPEG, and WebP images.
  - Proportional aspect ratio scaling, opacity control, move, and delete.
  - Automatic format normalization (converting WebP to PNG bytes via offscreen canvas for pdf-lib compatibility).
- **Vector Shapes (`type: 'shape'`):**
  - Rectangles, Circles/Ellipses, Lines, and Arrows.
  - Fill color, stroke color, stroke width (1px - 20px), and opacity.
- **Markups (`type: 'highlight'`, `'underline'`, `'strikethrough'`):**
  - Translucent marker highlighting with customizable colors and opacity.
  - Text markup lines with snapping and positioning.
- **Freehand Drawing (`type: 'draw'`):**
  - High-performance pointer events supporting mouse, trackpad, touchscreen, and stylus.
  - Touch-action optimization (`touch-action: none` on drawing surface) to prevent mobile gesture jitter.
  - Smooth SVG path rendering with stroke color, width, and opacity.
- **Sticky Notes / Comments (`type: 'comment'`):**
  - Visual note icon with clickable popover to add, edit, or delete feedback.
- **Workspace Navigation & Controls:**
  - Zoom controls: Zoom In, Zoom Out, 100% Reset, Fit Width.
  - Multi-page navigation: Next / Previous page, current page indicator.
  - Collapsible page thumbnail sidebar with lazy low-resolution page rendering.
  - Multi-level Undo & Redo stack (`HistoryManager`).
  - Keyboard shortcuts: `V` (Select), `T` (Text), `I` (Image), `S` (Shape), `H` (Highlight), `D` (Draw), `Del/Backspace` (Delete), `Ctrl+Z` (Undo), `Ctrl+Y / Ctrl+Shift+Z` (Redo), `Ctrl+C` (Copy), `Ctrl+V` (Paste).

---

## 4. Coordinate System & Geometry

Display space in web browsers and internal PDF coordinate space differ fundamentally:
1. **Screen Coordinates:** Measured in CSS pixels relative to the DOM element viewport.
2. **Editor Page Space:** Measured in 72 DPI points with $(0, 0)$ at the **top-left** corner.
3. **pdf-lib Coordinates:** Measured in 72 DPI points with $(0, 0)$ at the **bottom-left** corner.

### Coordinate Conversions (`coordinateUtils.ts`)
```ts
// Screen to Editor Page Points
x_page = screenX / displayScale;
y_page = screenY / displayScale;

// Editor Page Points to pdf-lib Coordinate Space
x_pdflib = x_page;
y_pdflib = pageHeight - (y_page + elementHeight);
```

---

## 5. Export Pipeline

```
Original PDF Bytes
       │
       ▼
PDFDocument.load(bytes) [pdf-lib]
       │
       ▼
Loop through modified pages
       ├── Embed Standard StandardFonts (Helvetica, TimesRoman, Courier)
       ├── Draw Vector Rectangles & Ellipses (page.drawRectangle, page.drawEllipse)
       ├── Draw Highlight & Markup Lines (page.drawLine with opacity & blending)
       ├── Draw Freehand SVG Paths (page.drawSvgPath)
       ├── Draw Crisp Text Overlays (page.drawText)
       └── Embed and Draw Images (doc.embedPng, doc.embedJpg)
       │
       ▼
PDFDocument.save()
       │
       ▼
Save as Blob & Trigger Client-Side Download
```

---

## 6. Privacy & Security Model

- **100% In-Browser Execution:** The PDF is decoded by PDF.js and recompiled by pdf-lib entirely on the user's CPU. Zero server round-trips.
- **Untrusted Input Sanitization:** Plain text escaping for user-supplied notes and text. No `dangerouslySetInnerHTML`.
- **Memory Safety:** Temporary image object URLs are immediately revoked with `URL.revokeObjectURL()`.
- **Encrypted PDF Handling:** Password-protected PDFs are detected gracefully upon loading with an informative alert and direct shortcut to ZipStream's `/unlock-pdf` tool.

---

## 7. Testing Instructions

### Run Unit Tests
```bash
npm test
```
All unit tests in `src/components/pdf-editor/__tests__/pdfEditor.test.ts` validate coordinate conversions, hex-to-RGB parsing, and undo/redo history management.

### Run Production Build & Prerender Verification
```bash
npm run build
```
Validates TypeScript compilation, client bundling, code splitting (`EditPdfView`), and static HTML generation for `/edit-pdf/index.html`.
