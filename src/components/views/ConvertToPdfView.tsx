import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  FileImage,
  FileText,
  Presentation,
  FileSpreadsheet,
  Code2,
  Upload,
  Download,
  RefreshCw,
  CheckCircle2,
  ArrowLeft,
  FileUp,
  Sparkles,
  Globe,
  ChevronRight,
  AlertCircle,
  X,
  Eye,
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
    acceptLabel: "DOCX, DOC",
    badge: "Office Engine",
    badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    description: "Convert Microsoft Word documents (.docx and .doc) to PDF with full layout fidelity, vector text, tables, and images.",
    maxFiles: 1,
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

type Stage = "idle" | "uploading" | "queued" | "converting" | "validating" | "done" | "error";

interface PreviewItem {
  id: string;
  name: string;
  url: string;
  type: "image" | "document";
}

export const ConvertToPdfView: React.FC<ConvertToPdfViewProps> = ({ initialTool, onBackToHome }) => {
  const [activeSubTool, setActiveSubTool] = useState<ToolMode>(initialTool);
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [previews, setPreviews] = useState<PreviewItem[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfFilename, setPdfFilename] = useState("converted.pdf");
  const [errorMsg, setErrorMsg] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [htmlInput, setHtmlInput] = useState("");
  const [htmlMode, setHtmlMode] = useState<"paste" | "file">("paste");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const currentTool = SUB_TOOLS.find(t => t.id === activeSubTool) || SUB_TOOLS[0];

  useEffect(() => {
    setActiveSubTool(initialTool);
    resetState();
  }, [initialTool]);

  const resetState = () => {
    setStage("idle");
    setProgress(0);
    setProgressMsg("");
    setPreviews([]);
    setFiles([]);
    setPdfUrl(null);
    setErrorMsg("");
    setHtmlInput("");
  };

  const handleSubToolSwitch = (tool: ToolMode) => {
    setActiveSubTool(tool);
    resetState();
  };

  const handleFiles = useCallback((incomingFiles: File[]) => {
    if (!incomingFiles.length) return;
    setErrorMsg("");
    const tool = SUB_TOOLS.find(t => t.id === activeSubTool) || SUB_TOOLS[0];
    const limited = incomingFiles.slice(0, tool.maxFiles);
    setFiles(limited);
    setStage("uploading");
    const previewPromises = limited.map(f => new Promise<PreviewItem>(resolve => {
      if (f.type.startsWith("image/")) {
        const url = URL.createObjectURL(f);
        resolve({ id: f.name + f.size, name: f.name, url, type: "image" });
      } else {
        resolve({ id: f.name + f.size, name: f.name, url: "", type: "document" });
      }
    }));
    Promise.all(previewPromises).then(items => setPreviews(items));
  }, [activeSubTool]);

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

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  const convertToPdf = async () => {
    setStage("converting");
    setProgress(5);
    setErrorMsg("");
    try {
      if (activeSubTool === "images_to_pdf") await convertImagesToPdf(files);
      else if (activeSubTool === "word_to_pdf") await convertWordToPdf(files[0]);
      else if (activeSubTool === "pptx_to_pdf") await convertPptxToPdf(files[0]);
      else if (activeSubTool === "xlsx_to_pdf") await convertXlsxToPdf(files[0]);
      else if (activeSubTool === "html_to_pdf") {
        const src = htmlMode === "paste" ? htmlInput : files[0];
        await convertHtmlToPdf(src);
      }
    } catch (err: any) {
      console.error("Conversion failed:", err);
      setErrorMsg(err?.message || "Conversion failed. Please try a different file.");
      setStage("error");
    }
  };

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
    finalize(blob, `${baseName}_converted.pdf`);
  };

  const convertWordToPdf = async (file: File) => {
    // 1. Client-side pre-flight checks
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "docx" && ext !== "doc") {
      throw new Error("Unsupported Word document. Only Microsoft Word (.docx and .doc) files are supported.");
    }
    if (file.size === 0) {
      throw new Error("The selected Word file is empty (0 bytes).");
    }
    if (file.size > 100 * 1024 * 1024) {
      throw new Error("Document exceeds the maximum file size limit of 100MB.");
    }

    setStage("uploading");
    setProgress(5);
    setProgressMsg("Uploading document to conversion engine...");

    // 2. Upload file via XMLHttpRequest to monitor real progress
    const formData = new FormData();
    formData.append("file", file);

    const uploadResponse = await new Promise<{ jobId: string; statusUrl: string; downloadUrl: string }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/convert/word-to-pdf");

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const pct = Math.round((event.loaded / event.total) * 15);
          setProgress(Math.max(5, pct));
          setProgressMsg(`Uploading document... ${Math.round((event.loaded / event.total) * 100)}%`);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve(data);
          } catch {
            reject(new Error("Invalid response received from conversion server."));
          }
        } else {
          try {
            const errData = JSON.parse(xhr.responseText);
            reject(new Error(errData.error || `Server returned error (${xhr.status})`));
          } catch {
            reject(new Error(`Upload failed with status code ${xhr.status}.`));
          }
        }
      };

      xhr.onerror = () => reject(new Error("Word conversion service unavailable. Could not connect to server."));
      xhr.ontimeout = () => reject(new Error("Upload timed out. Please check your connection."));
      xhr.timeout = 120000;

      xhr.send(formData);
    });

    const { jobId } = uploadResponse;
    setStage("queued");
    setProgress(20);
    setProgressMsg("Queued in Office conversion engine...");

    // 3. Poll /api/convert/jobs/:jobId
    const pollInterval = 800;
    const maxPollAttempts = 150; // 2 minutes maximum
    let attempts = 0;

    while (attempts < maxPollAttempts) {
      await new Promise((r) => setTimeout(r, pollInterval));
      attempts++;

      const res = await fetch(`/api/convert/jobs/${jobId}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error("Conversion job expired or was cancelled.");
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to query conversion status.");
      }

      const data = await res.json();

      if (data.status === "completed") {
        setStage("validating");
        setProgress(95);
        setProgressMsg("Finalizing validated PDF document...");

        const dlRes = await fetch(data.result?.downloadUrl || `/api/convert/download/${jobId}`);
        if (!dlRes.ok) throw new Error("Failed to download validated PDF from server.");
        const blob = await dlRes.blob();

        const baseName = file.name.replace(/\.[^/.]+$/, "");
        finalize(blob, `${baseName}.pdf`);
        return;
      }

      if (data.status === "failed") {
        throw new Error(data.error || "Word document conversion failed.");
      }

      if (data.status === "validating") {
        setStage("validating");
        setProgress(Math.max(75, data.progress || 80));
        setProgressMsg(data.message || "Validating PDF document structure...");
      } else if (data.status === "processing") {
        setStage("converting");
        setProgress(Math.max(25, Math.min(74, data.progress || 45)));
        setProgressMsg(data.message || "Converting document with Office engine...");
      } else if (data.status === "queued") {
        setStage("queued");
        setProgress(Math.max(15, Math.min(24, data.progress || 20)));
        setProgressMsg(data.message || "Waiting in conversion queue...");
      }
    }

    throw new Error("Conversion timed out. Please try again.");
  };

  const convertPptxToPdf = async (file: File) => {
    setProgressMsg("Loading presentation...");
    setProgress(10);
    const arrayBuffer = await file.arrayBuffer();
    setProgress(20);
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(arrayBuffer);
    setProgress(30);
    setProgressMsg("Extracting slide content...");
    const slideFiles = Object.keys(zip.files).filter(name =>
      /^ppt\/slides\/slide\d+\.xml$/.test(name)
    ).sort((a, b) => {
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
        const t = m[1].replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").trim();
        if (t) texts.push(t);
      }
      slides.push(texts.join("\n") || "(Empty Slide)");
    }
    setProgress(60);
    setProgressMsg(`Building ${slides.length}-slide PDF...`);
    const slideHtmlPages = slides.map((text, i) => `<div style="page-break-after:always;background:#1a1a2e;color:#fff;min-height:100vh;padding:60px;font-family:sans-serif;display:flex;flex-direction:column;justify-content:center;"><div style="font-size:11px;color:#888;margin-bottom:24px;letter-spacing:2px;text-transform:uppercase;">SLIDE ${i + 1} / ${slides.length}</div><div style="font-size:22px;line-height:1.7;white-space:pre-line;color:#f0f0f0;">${text.replace(/</g,"&lt;").replace(/>/g,"&gt;")}</div></div>`).join("");
    const fullHtml = `<!DOCTYPE html><html><body style="margin:0;padding:0;">${slideHtmlPages}</body></html>`;
    await renderHtmlToPdfBlob(fullHtml, file.name.replace(/\.[^/.]+$/, ""), (p) => {
      setProgress(60 + Math.round(p * 35));
    });
  };

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
      return `<div style="margin-bottom:32px;page-break-inside:avoid;"><h2 style="font-family:sans-serif;font-size:14px;font-weight:700;color:#1e293b;border-bottom:2px solid #FF5722;padding-bottom:8px;margin-bottom:16px;">Sheet: ${sheetName}</h2><div>${html}</div></div>`;
    }).join("");
    const fullHtml = `<!DOCTYPE html><html><head><style>body{font-family:-apple-system,sans-serif;margin:40px;background:#fff;color:#1e293b;}table{border-collapse:collapse;width:100%;font-size:11px;}th,td{border:1px solid #e2e8f0;padding:6px 10px;text-align:left;}th{background:#f8fafc;font-weight:700;}tr:nth-child(even){background:#f8fafc;}h1{font-size:20px;margin-bottom:24px;color:#0f172a;}</style></head><body><h1>${file.name}</h1>${sheetsHtml}</body></html>`;
    setProgress(60);
    setProgressMsg("Rendering to PDF...");
    await renderHtmlToPdfBlob(fullHtml, file.name.replace(/\.[^/.]+$/, ""), (p) => {
      setProgress(60 + Math.round(p * 35));
    });
  };

  const convertHtmlToPdf = async (source: string | File) => {
    setProgressMsg("Preparing HTML document...");
    setProgress(20);
    let html = "";
    if (typeof source === "string") {
      html = source;
    } else {
      html = await source.text();
    }
    await renderHtmlToPdfBlob(html, "html-export", (p) => {
      setProgress(20 + Math.round(p * 75));
    });
  };

  const renderHtmlToPdfBlob = async (
    html: string,
    baseName: string,
    onProgress: (fraction: number) => void
  ) => {
    const { jsPDF } = await import("jspdf");
    const html2canvas = (await import("html2canvas")).default;
    onProgress(0.1);
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;left:-9999px;top:-9999px;width:900px;height:600px;border:none;visibility:hidden;";
    document.body.appendChild(iframe);
    await new Promise<void>(resolve => {
      iframe.onload = () => resolve();
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) { doc.open(); doc.write(html); doc.close(); }
      setTimeout(resolve, 2000);
    });
    onProgress(0.3);
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    const bodyEl = iframeDoc?.body;
    if (!bodyEl) throw new Error("Failed to render HTML document");
    await new Promise(r => setTimeout(r, 600));
    onProgress(0.4);
    const canvas = await html2canvas(bodyEl, {
      scale: 1.5,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
      width: 900,
    });
    document.body.removeChild(iframe);
    onProgress(0.7);
    const imgData = canvas.toDataURL("image/jpeg", 0.92);
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const pdfWidth = 595;
    const ratio = pdfWidth / imgWidth;
    const totalPdfHeight = imgHeight * ratio;
    const pdfHeight = 842;
    const pageCount = Math.max(1, Math.ceil(totalPdfHeight / pdfHeight));
    const pdf = new jsPDF({ unit: "pt", format: "a4", compress: true });
    for (let page = 0; page < pageCount; page++) {
      if (page > 0) pdf.addPage();
      const yOffset = -page * pdfHeight;
      pdf.addImage(imgData, "JPEG", 0, yOffset, pdfWidth, imgHeight * ratio, undefined, "FAST");
      onProgress(0.7 + (page / pageCount) * 0.28);
    }
    onProgress(0.99);
    const blob = pdf.output("blob");
    finalize(blob, `${baseName}_converted.pdf`);
  };

  const finalize = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    setPdfUrl(url);
    setPdfFilename(filename);
    setProgress(100);
    setProgressMsg("Conversion complete!");
    setStage("done");
  };

  const handleDownload = () => {
    if (!pdfUrl) return;
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = pdfFilename;
    a.click();
  };

  return (
    <div className="w-full space-y-6">
      {/* Sub-tool Tabs */}
      <div className="flex flex-wrap gap-2">
        {SUB_TOOLS.map(tool => (
          <button
            key={tool.id}
            type="button"
            onClick={() => handleSubToolSwitch(tool.id)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${activeSubTool === tool.id ? "bg-[#FF5722] text-white shadow-md shadow-[#FF5722]/20" : "bg-black/[0.04] dark:bg-white/[0.06] text-[#5C6479] dark:text-white/60 hover:bg-black/[0.08] dark:hover:bg-white/[0.1] hover:text-[#0C162C] dark:hover:text-white"}`}
          >
            {tool.icon}
            <span className="hidden sm:inline">{tool.shortLabel}</span>
            <span className="sm:hidden">{tool.shortLabel.split("->")[0].trim()}</span>
          </button>
        ))}
      </div>

      {/* Tool Description Strip */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#FF5722]/5 border border-[#FF5722]/15">
        <div className="w-8 h-8 rounded-xl bg-[#FF5722]/10 flex items-center justify-center text-[#FF5722] shrink-0">
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
          {(["paste", "file"] as const).map(mode => (
            <button key={mode} type="button" onClick={() => setHtmlMode(mode)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${htmlMode === mode ? "bg-white dark:bg-white/10 text-[#0C162C] dark:text-white shadow-xs" : "text-[#5C6479] dark:text-white/50"}`}>
              {mode === "paste" ? "Paste HTML" : "Upload File"}
            </button>
          ))}
        </div>
      )}

      {/* Upload / Input Area */}
      {stage === "idle" && (
        <>
          {activeSubTool === "html_to_pdf" && htmlMode === "paste" ? (
            <div className="space-y-3">
              <textarea
                value={htmlInput}
                onChange={e => setHtmlInput(e.target.value)}
                placeholder="Paste your HTML code here...&#10;&#10;&lt;!DOCTYPE html&gt;&#10;&lt;html&gt;&#10;&lt;body&gt;&#10;  &lt;h1&gt;Hello World&lt;/h1&gt;&#10;&lt;/body&gt;&#10;&lt;/html&gt;"
                className="w-full h-56 px-4 py-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-[#0C162C]/10 dark:border-white/10 text-sm font-mono text-[#0C162C] dark:text-white placeholder-[#9AA3B0] dark:placeholder-white/30 focus:outline-none focus:border-[#FF5722]/50 resize-none transition-colors"
              />
              <button type="button"
                onClick={() => { if (htmlInput.trim()) { setFiles([]); setPreviews([{ id: "html-paste", name: "HTML Code", url: "", type: "document" }]); setStage("uploading"); } }}
                disabled={!htmlInput.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF5722] hover:bg-[#f4511e] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors cursor-pointer">
                <Eye className="w-4 h-4" />
                Preview and Convert
              </button>
            </div>
          ) : (
            <div ref={dropRef} onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`relative flex flex-col items-center justify-center gap-4 p-10 rounded-3xl border-2 border-dashed cursor-pointer transition-all duration-200 group ${isDragging ? "border-[#FF5722] bg-[#FF5722]/5 scale-[1.01]" : "border-[#0C162C]/15 dark:border-white/15 hover:border-[#FF5722]/50 hover:bg-[#FF5722]/[0.02]"}`}>
              <input ref={fileInputRef} type="file" accept={currentTool.accept}
                multiple={currentTool.maxFiles > 1} onChange={handleFileInput} className="hidden" />
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${isDragging ? "bg-[#FF5722]/20 text-[#FF5722]" : "bg-[#FF5722]/8 text-[#FF5722] group-hover:bg-[#FF5722]/15"}`}>
                <FileUp className="w-8 h-8" />
              </div>
              <div className="text-center space-y-1.5">
                <p className="font-bold text-[#0C162C] dark:text-white text-base">
                  {isDragging ? "Drop your file here" : `Drop ${currentTool.acceptLabel} here`}
                </p>
                <p className="text-sm text-[#5C6479] dark:text-white/50">
                  or <span className="text-[#FF5722] font-semibold">click to browse</span>
                  {currentTool.maxFiles > 1 && ` - Up to ${currentTool.maxFiles} files`}
                </p>
              </div>
              <div className="flex items-center gap-4 text-[11px] text-[#9AA3B0] dark:text-white/35 font-medium">
                <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Private Sandbox</span>
                <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> {activeSubTool === "word_to_pdf" ? "Auto-Deleted" : "No Upload"}</span>
                <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> 100% Free</span>
              </div>
            </div>
          )}
        </>
      )}

      {/* Previews */}
      {(stage === "uploading" || stage === "done") && previews.length > 0 && (
        <div className="space-y-4">
          {previews.some(p => p.type === "image") && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {previews.map(p => (
                p.type === "image" ? (
                  <div key={p.id} className="group relative aspect-[3/4] rounded-xl overflow-hidden border border-[#0C162C]/10 dark:border-white/10 bg-black/[0.03]">
                    <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div key={p.id} className="aspect-[3/4] rounded-xl border border-[#0C162C]/10 dark:border-white/10 bg-[#FF5722]/5 flex flex-col items-center justify-center gap-2 p-3">
                    {currentTool.icon}
                    <span className="text-[10px] text-center text-[#5C6479] dark:text-white/50 truncate w-full">{p.name}</span>
                  </div>
                )
              ))}
            </div>
          )}
          {previews.every(p => p.type === "document") && (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-[#0C162C]/8 dark:border-white/8">
              <div className="w-10 h-10 rounded-xl bg-[#FF5722]/10 flex items-center justify-center text-[#FF5722]">
                {currentTool.icon}
              </div>
              <div>
                <div className="font-semibold text-sm text-[#0C162C] dark:text-white">{files[0]?.name || "HTML document"}</div>
                <div className="text-xs text-[#5C6479] dark:text-white/50">{files[0] ? `${(files[0].size / 1024).toFixed(1)} KB` : "Pasted HTML code"}</div>
              </div>
              <span className={`ml-auto text-xs font-bold px-2.5 py-1 rounded-full ${currentTool.badgeColor}`}>{currentTool.badge}</span>
            </div>
          )}
          {stage === "uploading" && (
            <div className="flex items-center gap-3 flex-wrap">
              <button type="button" onClick={convertToPdf}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#FF5722] hover:bg-[#f4511e] text-white text-sm font-bold shadow-lg shadow-[#FF5722]/20 transition-all hover:scale-[1.02] cursor-pointer">
                <Sparkles className="w-4 h-4" />
                Convert to PDF
                <ChevronRight className="w-4 h-4" />
              </button>
              <button type="button" onClick={resetState}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-black/[0.05] dark:bg-white/[0.07] hover:bg-black/[0.09] text-[#5C6479] dark:text-white/60 text-sm font-semibold transition-colors cursor-pointer">
                <X className="w-4 h-4" />
                Clear
              </button>
            </div>
          )}
        </div>
      )}

      {/* Converting Progress */}
      {(stage === "converting" || stage === "queued" || stage === "validating") && (
        <div className="space-y-5 p-6 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-[#0C162C]/8 dark:border-white/8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-[#FF5722] border-t-transparent animate-spin" />
            <div>
              <div className="text-sm font-bold text-[#0C162C] dark:text-white">
                {stage === "queued" ? "Queued in conversion engine..." : stage === "validating" ? "Validating PDF output..." : "Converting to PDF..."}
              </div>
              <div className="text-xs text-[#5C6479] dark:text-white/50 mt-0.5">{progressMsg}</div>
            </div>
            <span className="ml-auto text-sm font-bold text-[#FF5722]">{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-[#0C162C]/8 dark:bg-white/8 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-[#FF5722] to-[#FF9A76] transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <div className="text-[11px] text-[#9AA3B0] dark:text-white/35 text-center">
            {activeSubTool === "word_to_pdf"
              ? "Private Sandboxed Worker · Document is processed in an isolated container and automatically deleted after conversion"
              : "All processing happens in your browser · Your files never leave your device"}
          </div>
        </div>
      )}

      {/* Done */}
      {stage === "done" && pdfUrl && (
        <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <div className="font-bold text-[#0C162C] dark:text-white">PDF Ready!</div>
              <div className="text-xs text-[#5C6479] dark:text-white/50">{pdfFilename}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button type="button" onClick={handleDownload}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] cursor-pointer">
              <Download className="w-4 h-4" />
              Download PDF
            </button>
            <button type="button" onClick={resetState}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-black/[0.05] dark:bg-white/[0.07] hover:bg-black/[0.09] text-[#5C6479] dark:text-white/60 text-sm font-semibold transition-colors cursor-pointer">
              <RefreshCw className="w-4 h-4" />
              Convert Another
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {stage === "error" && (
        <div className="p-5 rounded-2xl bg-red-500/5 border border-red-500/20 space-y-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <div>
              <div className="font-bold text-[#0C162C] dark:text-white text-sm">Conversion failed</div>
              <div className="text-xs text-[#5C6479] dark:text-white/50 mt-0.5">{errorMsg}</div>
            </div>
          </div>
          <button type="button" onClick={resetState}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black/[0.05] dark:bg-white/[0.07] text-[#5C6479] dark:text-white/60 text-sm font-semibold cursor-pointer hover:bg-black/[0.09] transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
            Try Again
          </button>
        </div>
      )}
    </div>
  );
};
