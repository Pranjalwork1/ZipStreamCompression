# ZipStream Edit PDF — Implementation & Audit Notes

## 1. Project Audit & Reusable Components

| Category | Available in Codebase | Reuse Strategy |
|---|---|---|
| **PDF Rendering** | `pdfjs-dist@3.11.174` (Worker initialized at `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`) | Direct reuse for rendering high-DPI canvas layers per page, page navigation, and thumbnail rendering. |
| **PDF Manipulation** | `pdf-lib@1.17.1` (`PDFDocument`, `StandardFonts`, `rgb`, `degrees`, `PDFPage`) | Direct reuse for non-destructive export. Original PDF remains untouched; text, shapes, highlights, drawings, and images are stamped as native PDF primitives/layers. |
| **DropZone & Upload** | `src/components/DropZone.tsx`, `src/utils/fileInfo.ts` | Reused for drag-and-drop file ingestion, file format validation, and initial upload UI. |
| **Icons & UI** | `lucide-react@0.546.0` | Comprehensive suite of tool icons: Type, Image, Square, Circle, Minus, ArrowRight, Highlighter, PenTool, Eraser, Undo, Redo, ZoomIn, ZoomOut, Maximize, Trash2, Copy, Layers, Download, Check. |
| **Feedback & Polish** | `canvas-confetti@1.9.4` | Used for export celebration feedback. |
| **Theme & Design System** | TailwindCSS + dark mode CSS variables (`nomu-dot-grid`, `dark:bg-[#0B132B]`, `#055EFE` brand blue, `#00ff87` mint) | Consistent with ZipStream's storefront aesthetic across light and dark modes. |
| **Routing & SEO** | `src/App.tsx`, `scripts/prerender_seo.ts`, `src/components/ToolLandingPage.tsx` | Seamless integration into `/edit-pdf` route, prerendered static HTML, sitemap XML, JSON-LD, OpenGraph, and canonical URLs. |
| **Analytics** | `src/utils/analytics.ts` (`trackEvent`) | Non-sensitive privacy-safe telemetry (`edit_pdf_opened`, `edit_pdf_exported`, `edit_pdf_tool_used`). |

---

## 2. Proposed Editor Architecture

The editor uses a **non-destructive, layered architecture**:

```
┌───────────────────────────────────────────────────────────┐
│                      PDF Page Viewport                    │
│                                                           │
│  Layer 1: HTML5 Canvas (Base PDF.js rendered page)         │
│           - High-DPI scaled (devicePixelRatio support)     │
│           - Read-only rasterization of original PDF vector │
│                                                           │
│  Layer 2: Interactive SVG & DOM Editor Overlay             │
│           - Freehand paths (smooth bezier/polyline)       │
│           - Shapes (rectangles, circles, lines, arrows)    │
│           - Highlights (translucent blend-mode rectangles) │
│           - Text elements (rich formatted, inline editable)│
│           - Image elements (PNG/JPG/WebP, aspect-locked)   │
│           - Notes / Comments (collapsible marker pins)     │
│                                                           │
│  Layer 3: Selection & Transformation Controls             │
│           - Bounding box, resize handles, rotation knob    │
│           - Drag-to-move, context action pills            │
└───────────────────────────────────────────────────────────┘
```

### Coordinate Conversion Layer:
1. **Screen Coordinates (CSS Pixels)**: Pointer events on the viewport DOM.
2. **Editor Coordinates (Normalized Page Space)**: Scaled by current zoom & DPR relative to page dimensions:
   $$x_{page} = \frac{x_{screen} - offset_x}{scale}$$
   $$y_{page} = \frac{y_{screen} - offset_y}{scale}$$
3. **PDF Point Coordinates (72 DPI)**:
   In `pdf-lib`, page coordinate origin $(0,0)$ is at the **bottom-left** of the page:
   $$x_{pdf} = x_{page}$$
   $$y_{pdf} = pageHeight_{pdf} - (y_{page} + height_{page})$$

---

## 3. Files to Create

1. `src/components/pdf-editor/types.ts`: Structured object model for all editor elements (Text, Image, Shape, Highlight, Underline, Strikethrough, Draw, Note).
2. `src/components/pdf-editor/coordinateUtils.ts`: Precise translation between Screen, Editor Page, and PDF Points.
3. `src/components/pdf-editor/HistoryManager.ts`: Undo/Redo stack with immutable state snapshots.
4. `src/components/pdf-editor/PdfViewer.ts` / `PdfPageRenderer.tsx`: Viewport renderer using PDF.js with zoom, pan, and virtualization.
5. `src/components/pdf-editor/PageThumbnails.tsx`: Sidebar thumbnail preview for multi-page documents.
6. `src/components/pdf-editor/EditorToolbar.tsx`: Top & mobile toolbars with tools (Select, Text, Image, Shape, Highlight, Draw, Underline, Strike, Note, Eraser, Undo, Redo, Zoom).
7. `src/components/pdf-editor/PropertiesPanel.tsx`: Contextual floating property bar (Font, Size, Color, Fill, Stroke, Opacity, Alignment).
8. `src/components/pdf-editor/SelectionBox.tsx`: Drag, resize handles (8 points), and rotate handle with boundary clamping.
9. `src/components/pdf-editor/pdfExportService.ts`: Native `pdf-lib` exporter preserving original PDF vector & layout fidelity.
10. `src/components/pdf-editor/EditPdfView.tsx`: Main editor container component integrating upload dropzone, workspace, and export dialog.
11. `EDIT_PDF_README.md`: Documentation on architecture, tools, export, and usage.
12. `EDIT_PDF_IMPLEMENTATION_REPORT.md`: Final completion report.

---

## 4. Files to Change

1. `src/types.ts`: Add `'edit_pdf'` to `ToolMode` union.
2. `src/App.tsx`: Register `/edit-pdf` route, lazy load `EditPdfView`, update `TOOL_PATHS`, `TOOL_METADATA`, `toolFromPath`, and SEO title/description.
3. `src/components/Navbar.tsx`: Add "Edit PDF" to the Tools flyout and mobile menu.
4. `src/components/HomePage.tsx`: Add "Edit PDF" card to `HOME_TOOLS` (Organize & Edit) and `TOOL_CANONICAL_PATHS`.
5. `src/components/SearchCommandPalette.tsx`: Add "Edit PDF" to `ALL_TOOLS` with keywords (`edit pdf`, `annotate`, `pdf editor`, `add text to pdf`).
6. `src/components/PdfToolsDirectory.tsx`: Add "Edit PDF" to `PDF_TOOL_CATEGORIES`.
7. `src/components/ToolLandingPage.tsx`: Add `/edit-pdf` metadata and related links.
8. `scripts/prerender_seo.ts`: Add `/edit-pdf` route for static prerendering, full FAQ schema, and sitemap generation.

---

## 5. Dependencies Assessment

- **Existing Dependencies (Ready to Use)**:
  - `pdfjs-dist@3.11.174` ✅
  - `pdf-lib@1.17.1` ✅
  - `lucide-react@0.546.0` ✅
  - `canvas-confetti@1.9.4` ✅
  - `react@18.3.1` & `react-dom@18.3.1` ✅
- **New Dependencies Required**: **NONE**. The existing libraries completely cover PDF rendering, vector manipulation, and UI needs. No unnecessary canvas heavyweight libraries (Fabric/Konva) needed.

---

## 6. Compatibility & Security Safeguards

- **Protected Subsystems**: Compression engine, Ghostscript server workers, and P2P rooms remain 100% untouched.
- **Client-Side Privacy**: 100% in-browser processing. Document bytes never leave user's browser during edit or export.
- **Encrypted PDF Handling**: Catches encrypted/password-protected files gracefully and provides a clean action button directing users to the existing `/unlock-pdf` tool.
- **Object URL Hygiene**: All created `blob:` URLs for previews and exported files are explicitly revoked on unmount/replacement.
- **Memory Safety**: Clean canvas context management, thumbnail downscaling, and page cancellation tokens to prevent memory leaks on large 50+ page PDFs.
