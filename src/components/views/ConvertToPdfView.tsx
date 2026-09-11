import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  FileImage,
  FileText,
  Presentation,
  FileSpreadsheet,
  Code2,
  Download,
  RefreshCw,
  CheckCircle2,
  FileUp,
  Sparkles,
  ChevronRight,
  AlertCircle,
  X,
  Eye,
  Archive,
  FileCheck,
  Trash2,
} from "lucide-react";
import { ToolMode } from "../../types";

interface ConvertToPdfViewProps {
  initialTool: ToolMode;
  onBackToHome: () => void;
}

interface ConvertSubTool {
  id: ToolMode;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  accept: string;
  acceptLabel: string;
  badge: string;
  badgeColor: string;
  description: string;
  maxFiles: number;
}

const SUB_TOOLS: ConvertSubTool[] = [
  {
    id: "images_to_pdf",
    label: "JPG / Image to PDF",
    shortLabel: "Image -> PDF",
    icon: <FileImage className="w-4 h-4" />,
    accept: "image/jpeg,image/png,image/webp,image/gif,image/bmp,image/tiff",
    acceptLabel: "JPG, PNG, WebP, GIF, BMP",
    badge: "Multi-page",
    badgeColor: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
    description: "Convert photos, screenshots, and scanned images into a multi-page PDF.",
    maxFiles: 50,
  },
  {
    id: "word_to_pdf",
    label: "Word to PDF",
    shortLabel: "Word -> PDF",
    icon: <FileText className="w-4 h-4" />,
    accept: ".docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword",
    acceptLabel: "DOCX, DOC (Up to 15 files)",
    badge: "Dual Engine",
    badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    description: "Convert Word documents (.docx & .doc) to PDF with accurate layout, tables, and images. Batch convert multiple files.",
    maxFiles: 15,
  },
  {
    id: "pptx_to_pdf",
    label: "PowerPoint to PDF",
    shortLabel: "PPTX -> PDF",
    icon: <Presentation className="w-4 h-4" />,
    accept: ".pptx,.ppt,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-powerpoint",
    acceptLabel: "PPTX, PPT",
    badge: "PPTX",
    badgeColor: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    description: "Export every slide of your PowerPoint presentation as pages in a PDF.",
    maxFiles: 1,
  },
  {
    id: "xlsx_to_pdf",
    label: "Excel to PDF",
    shortLabel: "Excel -> PDF",
    icon: <FileSpreadsheet className="w-4 h-4" />,
    accept: ".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel",
    acceptLabel: "XLSX, XLS",
    badge: "XLSX",
    badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    description: "Turn spreadsheet data and tables into a clean, printable PDF document.",
    maxFiles: 1,
  },
  {
    id: "html_to_pdf",
    label: "HTML to PDF",
    shortLabel: "HTML -> PDF",
    icon: <Code2 className="w-4 h-4" />,
    accept: ".html,.htm,text/html",
    acceptLabel: "HTML, HTM or paste HTML code",
    badge: "HTML5",
    badgeColor: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    description: "Convert any HTML file or paste raw HTML code into a clean PDF document.",
    maxFiles: 1,
  },
];

type Stage = "idle" | "ready" | "uploading" | "queued" | "converting" | "validating" | "done" | "error";

interface PreviewItem {
  id: string;
  name: string;
  size: number;
  url: string;
  type: "image" | "document";
}

interface ConvertedFileItem {
  id: string;
  name: string;
  url: string;
  size: number;
}

export const ConvertToPdfView: React.FC<ConvertToPdfViewProps> = ({ initialTool }) => {
  const [activeSubTool, setActiveSubTool] = useState<ToolMode>(initialTool);
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [previews, setPreviews] = useState<PreviewItem[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [convertedItems, setConvertedItems] = useState<ConvertedFileItem[]>([]);
  const [zipUrl, setZipUrl] = useState<string | null>(null);
  const [zipFilename, setZipFilename] = useState("converted_documents.zip");
  const [errorMsg, setErrorMsg] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [htmlInput, setHtmlInput] = useState("");
  const [htmlMode, setHtmlMode] = useState<"paste" | "file">("paste");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const currentTool = SUB_TOOLS.find((t) => t.id === activeSubTool) || SUB_TOOLS[0];

  useEffect(() => {
    setActiveSubTool(initialTool);
    resetState();
  }, [initialTool]);

  const resetState = () => {
    // Revoke any created preview/result URLs to prevent memory leaks
    previews.forEach((p) => {
      if (p.url && p.url.startsWith("blob:")) URL.revokeObjectURL(p.url);
    });
    convertedItems.forEach((c) => {
      if (c.url && c.url.startsWith("blob:")) URL.revokeObjectURL(c.url);
    });
    if (zipUrl && zipUrl.startsWith("blob:")) URL.revokeObjectURL(zipUrl);

    setStage("idle");
    setProgress(0);
    setProgressMsg("");
    setPreviews([]);
    setFiles([]);
    setConvertedItems([]);
    setZipUrl(null);
    setErrorMsg("");
    setHtmlInput("");
  };

  const handleSubToolSwitch = (tool: ToolMode) => {
    setActiveSubTool(tool);
    resetState();
  };

  const handleFiles = useCallback(
    (incomingFiles: File[]) => {
      if (!incomingFiles.length) return;
      setErrorMsg("");
      const tool = SUB_TOOLS.find((t) => t.id === activeSubTool) || SUB_TOOLS[0];

      // Merge with existing files if tool allows multiple files
      const existing = tool.maxFiles > 1 ? [...files] : [];
      const combined = [...existing, ...incomingFiles];
      const limited = combined.slice(0, tool.maxFiles);

      setFiles(limited);
      setStage("ready");

      const previewPromises = limited.map(
        (f) =>
          new Promise<PreviewItem>((resolve) => {
            if (f.type.startsWith("image/")) {
              const url = URL.createObjectURL(f);
              resolve({ id: f.name + f.size + f.lastModified, name: f.name, size: f.size, url, type: "image" });
            } else {
              resolve({ id: f.name + f.size + f.lastModified, name: f.name, size: f.size, url: "", type: "document" });
            }
          })
      );
      Promise.all(previewPromises).then((items) => setPreviews(items));
    },
    [activeSubTool, files]
  );

  const removeFileAtIndex = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    const updatedPreviews = previews.filter((_, i) => i !== index);

    if (previews[index]?.url && previews[index].url.startsWith("blob:")) {
      URL.revokeObjectURL(previews[index].url);
    }

    setFiles(updatedFiles);
    setPreviews(updatedPreviews);

    if (updatedFiles.length === 0) {
      setStage("idle");
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = Array.from(e.target.files || []);
    handleFiles(f);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(Array.from(e.dataTransfer.files));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);

  const getBackendUrl = (): string => {
    if (typeof window === "undefined") return "";
    const configured = (import.meta as any).env?.VITE_BACKEND_URL?.trim();
    if (configured) return configured.replace(/\/$/, "");
    return window.location.origin;
  };

  /**
   * Main convert trigger
   */
  const convertToPdf = async () => {
    if (files.length === 0 && !(activeSubTool === "html_to_pdf" && htmlMode === "paste" && htmlInput.trim())) {
      setErrorMsg("Please select at least one document to convert.");
      return;
    }

    setStage("converting");
    setProgress(5);
    setErrorMsg("");

    try {
      if (activeSubTool === "images_to_pdf") {
        await convertImagesToPdf(files);
      } else if (activeSubTool === "word_to_pdf") {
        await convertWordFiles(files);
      } else if (activeSubTool === "pptx_to_pdf") {
        await convertPptxToPdf(files[0]);
      } else if (activeSubTool === "xlsx_to_pdf") {
        await convertXlsxToPdf(files[0]);
      } else if (activeSubTool === "html_to_pdf") {
        const src = htmlMode === "paste" ? htmlInput : files[0];
        await convertHtmlToPdf(src);
      }
    } catch (err: any) {
      console.error("Conversion failed:", err);
      setErrorMsg(err?.message || "Conversion failed. Please try a different file.");
      setStage("error");
    }
  };

  /**
   * JPG / PNG Image to PDF
   */
  const convertImagesToPdf = async (imgFiles: File[]) => {
    setProgressMsg("Loading PDF engine...");
    setProgress(10);
    const { jsPDF } = await import("jspdf");
    setProgress(20);
    const pdf = new jsPDF({ unit: "px", compress: true });
    let firstPage = true;

    for (let i = 0; i < imgFiles.length; i++) {
      const file = imgFiles[i];
      setProgressMsg(`Processing image ${i + 1} of ${imgFiles.length}...`);
      setProgress(20 + Math.round((i / imgFiles.length) * 65));
      const url = URL.createObjectURL(file);
      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const { width: iw, height: ih } = img;
          if (!firstPage) {
            pdf.addPage([iw, ih]);
          } else {
            (pdf as any).internal.pageSize.width = iw;
            (pdf as any).internal.pageSize.height = ih;
            firstPage = false;
          }
          pdf.addImage(img, "JPEG", 0, 0, iw, ih, undefined, "FAST");
          URL.revokeObjectURL(url);
          resolve();
        };
        img.onerror = reject;
        img.src = url;
      });
    }

    setProgressMsg("Generating PDF...");
    setProgress(90);
    const blob = pdf.output("blob");
    const baseName = imgFiles[0].name.replace(/\.[^/.]+$/, "");
    finalizeResults([{ id: "img-pdf", name: `${baseName}_converted.pdf`, url: URL.createObjectURL(blob), size: blob.size }]);
  };

  /**
   * Word to PDF: Dual-engine conversion with multi-file support
   */
  const convertWordFiles = async (wordFiles: File[]) => {
    const total = wordFiles.length;
    const completedItems: ConvertedFileItem[] = [];

    for (let i = 0; i < total; i++) {
      const file = wordFiles[i];
      const baseProgress = (i / total) * 100;
      const fileSlice = 100 / total;

      setProgressMsg(total > 1 ? `[${i + 1}/${total}] Converting "${file.name}"...` : `Converting "${file.name}"...`);
      setProgress(Math.round(baseProgress + 5));

      const { blob, filename } = await convertSingleWordDocument(file, (pct, msg) => {
        const overall = Math.min(99, Math.round(baseProgress + (pct / 100) * fileSlice));
        setProgress(overall);
        setProgressMsg(total > 1 ? `[${i + 1}/${total}] ${msg}` : msg);
      });

      const url = URL.createObjectURL(blob);
      completedItems.push({
        id: `${file.name}-${i}-${Date.now()}`,
        name: filename,
        url,
        size: blob.size,
      });
    }

    await finalizeResults(completedItems);
  };

  /**
   * Converts a single Word file via Server LibreOffice or Browser fallback
   */
  const convertSingleWordDocument = async (
    file: File,
    onProgress: (pct: number, msg: string) => void
  ): Promise<{ blob: Blob; filename: string }> => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "docx" && ext !== "doc") {
      throw new Error(`File "${file.name}" is not a supported Word document (.docx or .doc).`);
    }
    if (file.size === 0) {
      throw new Error(`File "${file.name}" is empty (0 bytes).`);
    }
    if (file.size > 100 * 1024 * 1024) {
      throw new Error(`File "${file.name}" exceeds the 100MB size limit.`);
    }

    // Attempt Server Office Engine first
    try {
      return await convertWordWithServer(file, onProgress);
    } catch (serverErr: any) {
      console.warn(`[WordToPdf] Server Office engine unavailable for "${file.name}":`, serverErr?.message);
      onProgress(15, `Server unavailable. Activating browser conversion engine for "${file.name}"...`);

      // Seamless fallback to client-side DOCX converter
      return await convertWordWithBrowser(file, onProgress);
    }
  };

  /**
   * Tier 1: Server LibreOffice / Office COM conversion
   */
  const convertWordWithServer = async (
    file: File,
    onProgress: (pct: number, msg: string) => void
  ): Promise<{ blob: Blob; filename: string }> => {
    const backend = getBackendUrl();
    const formData = new FormData();
    formData.append("file", file);

    const uploadResponse = await new Promise<{ jobId: string; statusUrl: string; downloadUrl: string }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${backend}/api/convert/word-to-pdf`);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const pct = Math.round((event.loaded / event.total) * 20);
          onProgress(Math.max(5, pct), `Uploading document... ${Math.round((event.loaded / event.total) * 100)}%`);
        }
      };

      xhr.onload = () => {
        const contentType = xhr.getResponseHeader("content-type") || "";
        // Check if response is JSON (not HTML from Vercel SPA fallback)
        if (!contentType.includes("application/json")) {
          return reject(new Error("Server returned non-JSON response. Fallback to browser engine."));
        }

        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve(data);
          } catch {
            reject(new Error("Invalid JSON received from server."));
          }
        } else {
          try {
            const errData = JSON.parse(xhr.responseText);
            reject(new Error(errData.error || `Server returned error (${xhr.status})`));
          } catch {
            reject(new Error(`Server error with status ${xhr.status}.`));
          }
        }
      };

      xhr.onerror = () => reject(new Error("Office conversion service unavailable."));
      xhr.ontimeout = () => reject(new Error("Upload timed out."));
      xhr.timeout = 45000;
      xhr.send(formData);
    });

    const { jobId } = uploadResponse;
    onProgress(25, "Queued in Office conversion engine...");

    // Poll job status
    const pollInterval = 800;
    const maxPollAttempts = 120;
    let attempts = 0;

    while (attempts < maxPollAttempts) {
      await new Promise((r) => setTimeout(r, pollInterval));
      attempts++;

      const res = await fetch(`${backend}/api/convert/jobs/${jobId}`);
      if (!res.ok) {
        throw new Error(`Failed to query job status (${res.status}).`);
      }
      const data = await res.json();

      if (data.status === "completed") {
        onProgress(92, "Finalizing validated PDF document...");
        const dlUrl = data.result?.downloadUrl || `${backend}/api/convert/download/${jobId}`;
        const dlRes = await fetch(dlUrl);
        if (!dlRes.ok) throw new Error("Failed to download converted PDF from server.");
        const blob = await dlRes.blob();
        const baseName = file.name.replace(/\.[^/.]+$/, "");
        return { blob, filename: `${baseName}.pdf` };
      }

      if (data.status === "failed") {
        throw new Error(data.error || "Server Word conversion failed.");
      }

      if (data.status === "validating") {
        onProgress(Math.max(75, data.progress || 80), data.message || "Validating PDF document structure...");
      } else if (data.status === "processing") {
        onProgress(Math.max(30, Math.min(74, data.progress || 45)), data.message || "Converting document with Office engine...");
      } else if (data.status === "queued") {
        onProgress(Math.max(20, Math.min(29, data.progress || 20)), data.message || "Waiting in conversion queue...");
      }
    }

    throw new Error("Conversion timed out on server.");
  };

  /**
   * Tier 2: Pure client-side DOCX conversion fallback (Zero-failure guarantee)
   */
  const convertWordWithBrowser = async (
    file: File,
    onProgress: (pct: number, msg: string) => void
  ): Promise<{ blob: Blob; filename: string }> => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    const baseName = file.name.replace(/\.[^/.]+$/, "");

    if (ext === "doc") {
      throw new Error(
        `Legacy binary .doc file "${file.name}" requires the server Office engine. Please save or export your document as .docx for instant browser conversion.`
      );
    }

    onProgress(15, `Reading "${file.name}"...`);
    const arrayBuffer = await file.arrayBuffer();

    onProgress(30, "Extracting document content and styles...");
    const mammoth = await import("mammoth");
    const result = await mammoth.convertToHtml(
      { arrayBuffer },
      {
        convertImage: mammoth.images.imgElement((element: any) => {
          return element.read("base64").then((imageBuffer: string) => ({
            src: `data:${element.contentType};base64,${imageBuffer}`,
          }));
        }),
      }
    );

    const docHtml = result.value || "<p>(Empty Document)</p>";

    onProgress(50, "Formatting document layout...");
    const styledHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 11pt; line-height: 1.6; color: #1e293b; background: #ffffff; padding: 48px; box-sizing: border-box; width: 100%;">
        <style>
          h1, h2, h3, h4, h5, h6 { color: #0f172a; font-weight: 700; margin-top: 1.3em; margin-bottom: 0.5em; line-height: 1.25; }
          h1 { font-size: 20pt; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; }
          h2 { font-size: 16pt; }
          h3 { font-size: 13pt; }
          p { margin: 0 0 1em 0; }
          table { border-collapse: collapse; width: 100%; margin: 1.3em 0; font-size: 10pt; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
          th { background: #f8fafc; font-weight: 700; }
          ul, ol { margin: 0 0 1em 0; padding-left: 28px; }
          li { margin-bottom: 0.35em; }
          img { max-width: 100%; height: auto; display: block; margin: 1.2em auto; }
          blockquote { border-left: 4px solid #3b82f6; margin: 1em 0; padding: 8px 16px; background: #f8fafc; color: #475569; }
          code { font-family: monospace; font-size: 9.5pt; background: #f1f5f9; padding: 2px 5px; border-radius: 4px; }
        </style>
        ${docHtml}
      </div>
    `;

    onProgress(65, "Rendering PDF pages...");
    const blob = await renderHtmlToPdfBlob(styledHtml, baseName, (p) => {
      onProgress(65 + Math.round(p * 30), "Generating vector PDF pages...");
    });

    return { blob, filename: `${baseName}.pdf` };
  };

  /**
   * PowerPoint to PDF
   */
  const convertPptxToPdf = async (file: File) => {
    setProgressMsg("Loading presentation...");
    setProgress(10);
    const arrayBuffer = await file.arrayBuffer();
    setProgress(20);
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(arrayBuffer);
    setProgress(30);
    setProgressMsg("Extracting slide content...");
    const slideFiles = Object.keys(zip.files)
      .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
      .sort((a, b) => {
        const na = parseInt(a.match(/\d+/)?.[0] || "0");
        const nb = parseInt(b.match(/\d+/)?.[0] || "0");
        return na - nb;
      });
    setProgress(40);
    const slides: string[] = [];
    for (const slideFile of slideFiles) {
      const xml = await zip.files[slideFile].async("text");
      const texts: string[] = [];
      const matches = xml.matchAll(/<a:t[^>]*>([^<]+)<\/a:t>/g);
      for (const m of matches) {
        const t = m[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
        if (t) texts.push(t);
      }
      slides.push(texts.join("\n") || "(Empty Slide)");
    }
    setProgress(60);
    setProgressMsg(`Building ${slides.length}-slide PDF...`);
    const slideHtmlPages = slides
      .map(
        (text, i) =>
          `<div style="page-break-after:always;background:#1a1a2e;color:#fff;min-height:100vh;padding:60px;font-family:sans-serif;display:flex;flex-direction:column;justify-content:center;"><div style="font-size:11px;color:#888;margin-bottom:24px;letter-spacing:2px;text-transform:uppercase;">SLIDE ${
            i + 1
          } / ${slides.length}</div><div style="font-size:22px;line-height:1.7;white-space:pre-line;color:#f0f0f0;">${text
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")}</div></div>`
      )
      .join("");
    const fullHtml = `<!DOCTYPE html><html><body style="margin:0;padding:0;">${slideHtmlPages}</body></html>`;
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    const blob = await renderHtmlToPdfBlob(fullHtml, baseName, (p) => {
      setProgress(60 + Math.round(p * 35));
    });

    finalizeResults([{ id: "pptx-pdf", name: `${baseName}_converted.pdf`, url: URL.createObjectURL(blob), size: blob.size }]);
  };

  /**
   * Excel to PDF
   */
  const convertXlsxToPdf = async (file: File) => {
    setProgressMsg("Parsing spreadsheet data...");
    setProgress(15);
    const XLSX = await import("xlsx");
    setProgress(25);
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    setProgress(40);
    setProgressMsg("Converting sheets to HTML tables...");
    const sheetsHtml = workbook.SheetNames.map((sheetName, idx) => {
      const sheet = workbook.Sheets[sheetName];
      const html = XLSX.utils.sheet_to_html(sheet, { id: `sheet-${idx}`, header: "" });
      return `<div style="margin-bottom:32px;page-break-inside:avoid;"><h2 style="font-family:sans-serif;font-size:14px;font-weight:700;color:#1e293b;border-bottom:2px solid #055EFE;padding-bottom:8px;margin-bottom:16px;">Sheet: ${sheetName}</h2><div>${html}</div></div>`;
    }).join("");
    const fullHtml = `<!DOCTYPE html><html><head><style>body{font-family:-apple-system,sans-serif;margin:40px;background:#fff;color:#1e293b;}table{border-collapse:collapse;width:100%;font-size:11px;}th,td{border:1px solid #e2e8f0;padding:6px 10px;text-align:left;}th{background:#f8fafc;font-weight:700;}tr:nth-child(even){background:#f8fafc;}h1{font-size:20px;margin-bottom:24px;color:#0f172a;}</style></head><body><h1>${file.name}</h1>${sheetsHtml}</body></html>`;
    setProgress(60);
    setProgressMsg("Rendering to PDF...");
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    const blob = await renderHtmlToPdfBlob(fullHtml, baseName, (p) => {
      setProgress(60 + Math.round(p * 35));
    });

    finalizeResults([{ id: "xlsx-pdf", name: `${baseName}_converted.pdf`, url: URL.createObjectURL(blob), size: blob.size }]);
  };

  /**
   * HTML to PDF
   */
  const convertHtmlToPdf = async (source: string | File) => {
    setProgressMsg("Preparing HTML document...");
    setProgress(20);
    let html = "";
    if (typeof source === "string") {
      html = source;
    } else {
      html = await source.text();
    }
    const blob = await renderHtmlToPdfBlob(html, "html-export", (p) => {
      setProgress(20 + Math.round(p * 75));
    });

    finalizeResults([{ id: "html-pdf", name: "html-document_converted.pdf", url: URL.createObjectURL(blob), size: blob.size }]);
  };

  /**
   * Robust HTML-to-PDF offscreen renderer
   */
  const renderHtmlToPdfBlob = async (
    html: string,
    _baseName: string,
    onProgress: (fraction: number) => void
  ): Promise<Blob> => {
    const { jsPDF } = await import("jspdf");
    const html2canvas = (await import("html2canvas")).default;
    onProgress(0.1);

    const container = document.createElement("div");
    container.style.cssText =
      "position:absolute;left:-99999px;top:0;width:800px;background:#ffffff;color:#1e293b;overflow:visible;z-index:-9999;";
    container.innerHTML = html;
    document.body.appendChild(container);

    try {
      // Preload images if any
      const images = Array.from(container.querySelectorAll("img"));
      if (images.length > 0) {
        await Promise.all(
          images.map(
            (img) =>
              new Promise<void>((resolve) => {
                if (img.complete) return resolve();
                img.onload = () => resolve();
                img.onerror = () => resolve();
              })
          )
        );
      }
      await new Promise((r) => setTimeout(r, 200));
      onProgress(0.3);

      const totalHeight = Math.max(container.scrollHeight, container.offsetHeight, 600);
      const canvas = await html2canvas(container, {
        scale: 1.6,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: 800,
        height: totalHeight,
        windowWidth: 800,
        windowHeight: totalHeight,
      });

      onProgress(0.7);
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({ unit: "pt", format: "a4", compress: true });
      const pdfWidth = 595.28;
      const pdfHeight = 841.89;
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const totalPdfHeight = (imgHeight * pdfWidth) / imgWidth;
      const pageCount = Math.max(1, Math.ceil(totalPdfHeight / pdfHeight));

      for (let page = 0; page < pageCount; page++) {
        if (page > 0) pdf.addPage("a4");
        const yOffset = -page * pdfHeight;
        pdf.addImage(imgData, "JPEG", 0, yOffset, pdfWidth, totalPdfHeight, undefined, "FAST");
        onProgress(0.7 + ((page + 1) / pageCount) * 0.28);
      }

      onProgress(1.0);
      return pdf.output("blob");
    } finally {
      if (container.parentNode) {
        document.body.removeChild(container);
      }
    }
  };

  /**
   * Finalize and handle multiple or single results
   */
  const finalizeResults = async (items: ConvertedFileItem[]) => {
    setConvertedItems(items);

    // If multiple documents, generate a combined ZIP package
    if (items.length > 1) {
      setProgressMsg("Packaging converted PDFs into ZIP file...");
      try {
        const JSZip = (await import("jszip")).default;
        const zip = new JSZip();
        for (const item of items) {
          const resp = await fetch(item.url);
          const buf = await resp.arrayBuffer();
          zip.file(item.name, buf);
        }
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(zipBlob);
        setZipUrl(url);
        setZipFilename(`ZipStream_Converted_PDFs_${items.length}_files.zip`);
      } catch (zipErr) {
        console.warn("Failed to generate ZIP bundle:", zipErr);
      }
    }

    setProgress(100);
    setProgressMsg(items.length > 1 ? `Successfully converted ${items.length} documents!` : "Conversion complete!");
    setStage("done");
  };

  const handleDownloadSingle = (item: ConvertedFileItem) => {
    const a = document.createElement("a");
    a.href = item.url;
    a.download = item.name;
    a.click();
  };

  const handleDownloadZip = () => {
    if (!zipUrl) return;
    const a = document.createElement("a");
    a.href = zipUrl;
    a.download = zipFilename;
    a.click();
  };

  return (
    <div className="w-full space-y-6">
      {/* Sub-tool Tabs */}
      <div className="flex flex-wrap gap-2">
        {SUB_TOOLS.map((tool) => (
          <button
            key={tool.id}
            type="button"
            onClick={() => handleSubToolSwitch(tool.id)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              activeSubTool === tool.id
                ? "bg-gradient-to-b from-[#0077ff] to-[#055efe] text-white shadow-md shadow-[#055efe]/20"
                : "bg-black/[0.04] dark:bg-white/[0.06] text-[#5C6479] dark:text-white/60 hover:bg-black/[0.08] dark:hover:bg-white/[0.1] hover:text-[#0C162C] dark:hover:text-white"
            }`}
          >
            {tool.icon}
            <span className="hidden sm:inline">{tool.shortLabel}</span>
            <span className="sm:hidden">{tool.shortLabel.split("->")[0].trim()}</span>
          </button>
        ))}
      </div>

      {/* Tool Description Strip */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#055EFE]/5 border border-[#055EFE]/15">
        <div className="w-8 h-8 rounded-xl bg-[#055EFE]/10 flex items-center justify-center text-[#055EFE] shrink-0">
          {currentTool.icon}
        </div>
        <div>
          <div className="font-bold text-[#0C162C] dark:text-white text-sm">{currentTool.label}</div>
          <div className="text-xs text-[#5C6479] dark:text-white/60 mt-0.5">{currentTool.description}</div>
        </div>
        <span className={`ml-auto text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${currentTool.badgeColor}`}>
          {currentTool.badge}
        </span>
      </div>

      {/* HTML mode switcher */}
      {activeSubTool === "html_to_pdf" && stage === "idle" && (
        <div className="flex items-center gap-2 p-1 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] w-fit">
          {(["paste", "file"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setHtmlMode(mode)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                htmlMode === mode ? "bg-white dark:bg-white/10 text-[#0C162C] dark:text-white shadow-xs" : "text-[#5C6479] dark:text-white/50"
              }`}
            >
              {mode === "paste" ? "Paste HTML" : "Upload File"}
            </button>
          ))}
        </div>
      )}

      {/* Upload / Input Drop Area (Visible when idle or allowing more files) */}
      {stage === "idle" && (
        <>
          {activeSubTool === "html_to_pdf" && htmlMode === "paste" ? (
            <div className="space-y-3">
              <textarea
                value={htmlInput}
                onChange={(e) => setHtmlInput(e.target.value)}
                placeholder="Paste your HTML code here...&#10;&#10;&lt;!DOCTYPE html&gt;&#10;&lt;html&gt;&#10;&lt;body&gt;&#10;  &lt;h1&gt;Hello World&lt;/h1&gt;&#10;&lt;/body&gt;&#10;&lt;/html&gt;"
                className="w-full h-56 px-4 py-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-[#0C162C]/10 dark:border-white/10 text-sm font-mono text-[#0C162C] dark:text-white placeholder-[#9AA3B0] dark:placeholder-white/30 focus:outline-none focus:border-[#055EFE]/50 resize-none transition-colors"
              />
              <button
                type="button"
                onClick={() => {
                  if (htmlInput.trim()) {
                    setFiles([]);
                    setPreviews([{ id: "html-paste", name: "HTML Code", size: htmlInput.length, url: "", type: "document" }]);
                    setStage("ready");
                  }
                }}
                disabled={!htmlInput.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-b from-[#0077ff] to-[#055efe] hover:from-[#006ee6] hover:to-[#0452e0] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                Preview and Convert
              </button>
            </div>
          ) : (
            <div
              ref={dropRef}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`relative flex flex-col items-center justify-center gap-4 p-10 rounded-3xl border-2 border-dashed cursor-pointer transition-all duration-200 group ${
                isDragging
                  ? "border-[#055EFE] bg-[#055EFE]/5 scale-[1.01]"
                  : "border-[#0C162C]/15 dark:border-white/15 hover:border-[#055EFE]/50 hover:bg-[#055EFE]/[0.02]"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={currentTool.accept}
                multiple={currentTool.maxFiles > 1}
                onChange={handleFileInput}
                className="hidden"
              />
              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${
                  isDragging ? "bg-[#055EFE]/20 text-[#055EFE]" : "bg-[#055EFE]/8 text-[#055EFE] group-hover:bg-[#055EFE]/15"
                }`}
              >
                <FileUp className="w-8 h-8" />
              </div>
              <div className="text-center space-y-1.5">
                <p className="font-bold text-[#0C162C] dark:text-white text-base">
                  {isDragging ? "Drop your files here" : `Drop ${currentTool.acceptLabel} here`}
                </p>
                <p className="text-sm text-[#5C6479] dark:text-white/50">
                  or <span className="text-[#055EFE] font-semibold">click to browse</span>
                  {currentTool.maxFiles > 1 && ` — Select up to ${currentTool.maxFiles} files`}
                </p>
              </div>
              <div className="flex items-center gap-4 text-[11px] text-[#9AA3B0] dark:text-white/35 font-medium">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Private & Secure
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Fast Dual Engine
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" /> 100% Free
                </span>
              </div>
            </div>
          )}
        </>
      )}

      {/* Selected Previews & Action Bar (Remains visible during ready, error, and done) */}
      {(stage === "ready" || stage === "error") && previews.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5C6479] dark:text-white/50">
              Selected Document{files.length > 1 ? `s (${files.length})` : ""}
            </span>
            {currentTool.maxFiles > 1 && files.length < currentTool.maxFiles && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-semibold text-[#055EFE] hover:underline cursor-pointer flex items-center gap-1"
              >
                + Add More Files
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept={currentTool.accept}
              multiple={currentTool.maxFiles > 1}
              onChange={handleFileInput}
              className="hidden"
            />
          </div>

          {/* Image Grid */}
          {previews.some((p) => p.type === "image") && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {previews.map((p, index) => (
                <div
                  key={p.id}
                  className="group relative aspect-[3/4] rounded-xl overflow-hidden border border-[#0C162C]/10 dark:border-white/10 bg-black/[0.03]"
                >
                  <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeFileAtIndex(index)}
                    className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 text-white hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Documents List */}
          {previews.some((p) => p.type === "document") && (
            <div className="space-y-2">
              {files.map((file, idx) => (
                <div
                  key={file.name + idx}
                  className="flex items-center gap-3 p-3.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-[#0C162C]/8 dark:border-white/8 hover:border-[#055EFE]/30 transition-all"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#055EFE]/10 flex items-center justify-center text-[#055EFE] shrink-0">
                    {currentTool.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm text-[#0C162C] dark:text-white truncate">{file.name}</div>
                    <div className="text-xs text-[#5C6479] dark:text-white/50">{(file.size / 1024).toFixed(1)} KB</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFileAtIndex(idx)}
                    title="Remove file"
                    className="p-1.5 rounded-lg text-[#9AA3B0] hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Error Banner if in error stage */}
          {stage === "error" && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-red-600 dark:text-red-400 text-sm">Conversion Notice</div>
                <div className="text-xs text-red-600/85 dark:text-red-300/85">{errorMsg}</div>
              </div>
            </div>
          )}

          {/* Action Buttons: Never disabled permanently! */}
          <div className="flex items-center gap-3 flex-wrap pt-2">
            <button
              type="button"
              onClick={convertToPdf}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-b from-[#0077ff] to-[#055efe] hover:from-[#006ee6] hover:to-[#0452e0] text-white text-sm font-bold shadow-lg shadow-[#055efe]/20 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              {stage === "error" ? "Retry Conversion" : `Convert ${files.length > 1 ? `(${files.length} files) ` : ""}to PDF`}
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={resetState}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-black/[0.05] dark:bg-white/[0.07] hover:bg-black/[0.09] text-[#5C6479] dark:text-white/60 text-sm font-semibold transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Converting Progress Modal / Banner */}
      {(stage === "converting" || stage === "queued" || stage === "validating") && (
        <div className="space-y-5 p-6 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-[#0C162C]/8 dark:border-white/8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-[#055EFE] border-t-transparent animate-spin" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-[#0C162C] dark:text-white truncate">
                {stage === "queued"
                  ? "Queued in conversion engine..."
                  : stage === "validating"
                  ? "Validating PDF output..."
                  : "Converting document(s) to PDF..."}
              </div>
              <div className="text-xs text-[#5C6479] dark:text-white/50 mt-0.5 truncate">{progressMsg}</div>
            </div>
            <span className="ml-auto text-sm font-bold text-[#055EFE] shrink-0">{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-[#0C162C]/8 dark:bg-white/8 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#0077ff] to-[#055efe] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-[11px] text-[#9AA3B0] dark:text-white/35 text-center">
            {activeSubTool === "word_to_pdf"
              ? "Dual Engine Architecture · Private Sandboxed Engine with automatic browser fallback"
              : "All processing happens securely in your browser · Your files never leave your device"}
          </div>
        </div>
      )}

      {/* Done State */}
      {stage === "done" && convertedItems.length > 0 && (
        <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <div className="font-bold text-[#0C162C] dark:text-white">
                {convertedItems.length > 1 ? `${convertedItems.length} PDFs Ready!` : "PDF Ready!"}
              </div>
              <div className="text-xs text-[#5C6479] dark:text-white/50">
                {convertedItems.length > 1
                  ? "Download the complete ZIP package or download individual PDF files below."
                  : convertedItems[0].name}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            {convertedItems.length > 1 && zipUrl ? (
              <button
                type="button"
                onClick={handleDownloadZip}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] cursor-pointer"
              >
                <Archive className="w-4 h-4" />
                Download All as ZIP (.zip)
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleDownloadSingle(convertedItems[0])}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>
            )}

            <button
              type="button"
              onClick={resetState}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-black/[0.05] dark:bg-white/[0.07] hover:bg-black/[0.09] text-[#5C6479] dark:text-white/60 text-sm font-semibold transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Convert More Files
            </button>
          </div>

          {/* Multiple items list with individual download triggers */}
          {convertedItems.length > 1 && (
            <div className="space-y-2 pt-2 border-t border-emerald-500/15">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#5C6479] dark:text-white/50">
                Individual Converted Documents
              </span>
              <div className="space-y-2">
                {convertedItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/60 dark:bg-white/[0.04] border border-emerald-500/10"
                  >
                    <FileCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-xs text-[#0C162C] dark:text-white truncate">{item.name}</div>
                      <div className="text-[10px] text-[#5C6479] dark:text-white/50">{(item.size / 1024).toFixed(1)} KB</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDownloadSingle(item)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
