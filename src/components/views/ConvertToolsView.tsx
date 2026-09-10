import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  FileSpreadsheet,
  Presentation,
  Image as ImageIcon,
  Code,
  Volume2,
  BookOpen,
  Download,
  ArrowLeft,
  Copy,
  Check,
  Play,
  Pause,
  Upload,
  RefreshCw,
  Sparkles,
  FileCheck,
  Table,
  Layers,
  ChevronRight,
  ExternalLink,
  Archive,
  Eye,
} from 'lucide-react';
import { ToolMode } from '../../types';
import confetti from 'canvas-confetti';
import {
  extractPdfStructuredData,
  convertPdfToJpgPages,
  convertPdfToExcelData,
  convertPdfToPowerPointDeck,
  convertPdfToEpubPackage,
  convertPdfToWordDocument,
  JpgPageResult,
  ExcelConversionResult,
  PptxConversionResult,
  EpubConversionResult,
  WordConversionResult,
  PdfConversionResult,
} from '../../utils/pdfConverter';
import { downloadBlob } from '../../utils/formatters';

interface ConvertToolsViewProps {
  initialTool: ToolMode;
  onBackToHome: () => void;
}

export const ConvertToolsView: React.FC<ConvertToolsViewProps> = ({
  initialTool,
  onBackToHome,
}) => {
  const [activeSubTool, setActiveSubTool] = useState<ToolMode>(initialTool);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'raw' | 'table' | 'slides'>('preview');

  // Sync activeSubTool and clear previous file when user switches tools from menu
  useEffect(() => {
    setActiveSubTool(initialTool);
    setSelectedFile(null);
    setStructuredResult(null);
    setJpgResult(null);
    setExcelResult(null);
    setPptxResult(null);
    setEpubResult(null);
    setWordResult(null);
    setHtmlBlobUrl(null);
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsPlayingAudio(false);
    }
  }, [initialTool]);

  // Conversion Specific Results
  const [structuredResult, setStructuredResult] = useState<PdfConversionResult | null>(null);
  const [jpgResult, setJpgResult] = useState<{
    pages: JpgPageResult[];
    zipBlob?: Blob;
    zipUrl?: string;
    singleBlobUrl: string;
    singleFileName: string;
  } | null>(null);
  const [excelResult, setExcelResult] = useState<ExcelConversionResult | null>(null);
  const [pptxResult, setPptxResult] = useState<PptxConversionResult | null>(null);
  const [epubResult, setEpubResult] = useState<EpubConversionResult | null>(null);
  const [wordResult, setWordResult] = useState<WordConversionResult | null>(null);
  const [htmlBlobUrl, setHtmlBlobUrl] = useState<string | null>(null);

  // Advanced Audio Speech Synthesis
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isPausedAudio, setIsPausedAudio] = useState(false);
  const [speechRate, setSpeechRate] = useState(1);
  const [speechPitch, setSpeechPitch] = useState(1);
  const [speechVolume, setSpeechVolume] = useState(1);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [speechWords, setSpeechWords] = useState<string[]>([]);
  const synthRef = useRef<SpeechSynthesis | null>(typeof window !== 'undefined' ? window.speechSynthesis : null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load voices asynchronously
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis?.getVoices() || [];
      // Prefer natural/neural/high quality voices
      const preferred = voices.filter(v =>
        /google|microsoft|apple|neural|natural|premium/i.test(v.name)
      );
      const allVoices = preferred.length > 0 ? preferred : voices;
      setAvailableVoices(allVoices);
      if (allVoices.length > 0 && !selectedVoice) {
        // Pick first English voice by preference
        const engVoice = allVoices.find(v => v.lang.startsWith('en')) || allVoices[0];
        setSelectedVoice(engVoice);
      }
    };
    loadVoices();
    if (typeof window !== 'undefined') {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);


  const fileInputRef = useRef<HTMLInputElement>(null);

  const subTools = [
    {
      id: 'pdf_to_word' as ToolMode,
      label: 'PDF to Word',
      icon: FileText,
      desc: 'Export as editable DOCX & Word formats with preserved paragraphs and headers',
      badge: 'DOCX / DOC',
      badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    },
    {
      id: 'pdf_to_excel' as ToolMode,
      label: 'PDF to Excel',
      icon: FileSpreadsheet,
      desc: 'Detect tables, columns, and data matrices & export to CSV or XLSX',
      badge: 'CSV / XLSX',
      badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    },
    {
      id: 'pdf_to_powerpoint' as ToolMode,
      label: 'PDF to PPTX',
      icon: Presentation,
      desc: 'Convert pages to presentation slides with high-DPI visual layouts',
      badge: 'OpenXML PPTX',
      badgeColor: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    },
    {
      id: 'pdf_to_jpg' as ToolMode,
      label: 'PDF to JPG',
      icon: ImageIcon,
      desc: 'Render high-resolution 2x JPEG images with single-page and multi-page ZIP export',
      badge: 'High-Res JPG',
      badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    },
    {
      id: 'extract_text' as ToolMode,
      label: 'Extract Text',
      icon: FileCheck,
      desc: 'Extract clean plain text (.txt) and formatted Markdown (.md) with 1-click copy',
      badge: 'TXT & MD',
      badgeColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    },
    {
      id: 'pdf_to_epub' as ToolMode,
      label: 'PDF to EPUB',
      icon: BookOpen,
      desc: 'Create genuine EPUB 3.0 e-books compatible with Apple Books, Kindle & e-readers',
      badge: 'EPUB 3.0',
      badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    },
    {
      id: 'pdf_to_html' as ToolMode,
      label: 'PDF to HTML',
      icon: Code,
      desc: 'Responsive web document with standalone styles and clean structure',
      badge: 'HTML5',
      badgeColor: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
    },
    {
      id: 'pdf_to_audio' as ToolMode,
      label: 'PDF to Audio',
      icon: Volume2,
      desc: 'On-device natural speech voice synthesizer with real-time audio playback',
      badge: 'Voice Player',
      badgeColor: 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
    },
  ];

  // Stop speech if subtool changes or component unmounts
  useEffect(() => {
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    processConversion(file, activeSubTool);
  };

  const processConversion = async (file: File, tool: ToolMode) => {
    setIsProcessing(true);
    setProgress(5);
    setProgressStatus('Reading document data into memory...');

    // Reset previous states
    setStructuredResult(null);
    setJpgResult(null);
    setExcelResult(null);
    setPptxResult(null);
    setEpubResult(null);
    setWordResult(null);
    setHtmlBlobUrl(null);

    const baseName = file.name.replace(/\.[^/.]+$/, '');

    try {
      const arrayBuffer = await file.arrayBuffer();

      if (tool === 'pdf_to_excel') {
        setProgressStatus('Extracting tables & geometric column bounds...');
        const res = await convertPdfToExcelData(arrayBuffer.slice(0), baseName, (pct, msg) => {
          setProgress(pct);
          setProgressStatus(msg);
        });
        setExcelResult(res);
        setActiveTab('table');
      } else if (tool === 'pdf_to_powerpoint') {
        setProgressStatus('Creating presentation slide deck...');
        const res = await convertPdfToPowerPointDeck(arrayBuffer.slice(0), baseName, (pct, msg) => {
          setProgress(pct);
          setProgressStatus(msg);
        });
        setPptxResult(res);
        setActiveTab('slides');
      } else if (tool === 'pdf_to_jpg') {
        setProgressStatus('Rendering pages to high-definition raster matrix...');
        const res = await convertPdfToJpgPages(arrayBuffer.slice(0), baseName, (pct, msg) => {
          setProgress(pct);
          setProgressStatus(msg);
        });
        setJpgResult(res);
        setActiveTab('preview');
      } else if (tool === 'pdf_to_epub') {
        setProgressStatus('Packaging valid EPUB 3.0 eBook container...');
        const res = await convertPdfToEpubPackage(arrayBuffer.slice(0), baseName, (pct, msg) => {
          setProgress(pct);
          setProgressStatus(msg);
        });
        setEpubResult(res);
        if (res.structuredData) {
          setStructuredResult(res.structuredData);
        } else {
          const textData = await extractPdfStructuredData(arrayBuffer.slice(0));
          setStructuredResult(textData);
        }
        setActiveTab('preview');
      } else if (tool === 'pdf_to_word') {
        setProgressStatus('Structuring Word document typography & layout...');
        const res = await convertPdfToWordDocument(arrayBuffer.slice(0), baseName, (pct, msg) => {
          setProgress(pct);
          setProgressStatus(msg);
        });
        setWordResult(res);
        if (res.structuredData) {
          setStructuredResult(res.structuredData);
        } else {
          const textData = await extractPdfStructuredData(arrayBuffer.slice(0));
          setStructuredResult(textData);
        }
        setActiveTab('preview');
      } else if (tool === 'pdf_to_html') {
        setProgressStatus('Building responsive HTML5 standalone document...');
        const textData = await extractPdfStructuredData(arrayBuffer.slice(0), (pct, msg) => {
          setProgress(pct);
          setProgressStatus(msg);
        });
        setStructuredResult(textData);
        
        const htmlDoc = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${baseName}</title>
<style>
  :root { color-scheme: light dark; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    max-width: 860px;
    margin: 40px auto;
    padding: 24px;
    line-height: 1.7;
    color: #1d1d1f;
    background-color: #fafafc;
  }
  @media (prefers-color-scheme: dark) {
    body { color: #f5f5f7; background-color: #121214; }
    .page-card { background: #1c1c1e !important; border-color: #2c2c2e !important; }
  }
  .header {
    border-bottom: 2px solid #0071e3;
    padding-bottom: 16px;
    margin-bottom: 32px;
  }
  h1 { font-size: 28px; margin: 0 0 8px 0; color: #0071e3; }
  .meta { font-size: 13px; color: #86868b; }
  .page-card {
    background: #ffffff;
    border: 1px solid #e5e5ea;
    border-radius: 16px;
    padding: 28px;
    margin-bottom: 24px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  }
  h2 { font-size: 18px; color: #0071e3; margin-top: 0; }
  p { margin: 12px 0; }
  ul { padding-left: 20px; }
  li { margin-bottom: 6px; }
</style>
</head>
<body>
  <div class="header">
    <h1>${baseName}</h1>
    <div class="meta">Converted from PDF via ZipStream Client-Side Studio • ${textData.totalPages} Pages • 100% Private</div>
  </div>
  ${textData.pages.map((p, i) => `
    <div class="page-card">
      <h2>Page ${i + 1}</h2>
      ${p.lines.map(l => `<p>${l}</p>`).join('')}
    </div>
  `).join('')}
</body>
</html>`;
        const blob = new Blob([htmlDoc], { type: 'text/html;charset=utf-8;' });
        setHtmlBlobUrl(URL.createObjectURL(blob));
        setActiveTab('preview');
      } else {
        // Default extract_text and pdf_to_audio
        setProgressStatus('Extracting full structured text and markdown...');
        const textData = await extractPdfStructuredData(arrayBuffer.slice(0), (pct, msg) => {
          setProgress(pct);
          setProgressStatus(msg);
        });
        setStructuredResult(textData);
        setActiveTab('preview');
      }

      setProgress(100);
      setProgressStatus('Done!');
      confetti({ particleCount: 35, spread: 60, origin: { y: 0.8 } });
    } catch (err: any) {
      console.error('Conversion failed:', err);
      setProgressStatus(`Error: ${err.message || 'Failed to process document'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyText = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePlaySpeech = () => {
    const textToRead = structuredResult?.extractedText || '';
    if (!synthRef.current || !textToRead.trim()) return;

    synthRef.current.cancel();
    const words = textToRead.trim().split(/\s+/);
    setSpeechWords(words);
    setCurrentWordIndex(-1);

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.rate = speechRate;
    utterance.pitch = speechPitch;
    utterance.volume = speechVolume;
    if (selectedVoice) utterance.voice = selectedVoice;

    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        const spokenText = textToRead.slice(0, event.charIndex + event.charLength);
        const spokenWords = spokenText.trim().split(/\s+/);
        setCurrentWordIndex(spokenWords.length - 1);
      }
    };
    utterance.onend = () => {
      setIsPlayingAudio(false);
      setIsPausedAudio(false);
      setCurrentWordIndex(-1);
    };
    utterance.onerror = () => {
      setIsPlayingAudio(false);
      setIsPausedAudio(false);
    };
    utteranceRef.current = utterance;
    synthRef.current.speak(utterance);
    setIsPlayingAudio(true);
    setIsPausedAudio(false);
  };

  const handlePauseSpeech = () => {
    if (synthRef.current?.speaking && !synthRef.current.paused) {
      synthRef.current.pause();
      setIsPausedAudio(true);
      setIsPlayingAudio(false);
    }
  };

  const handleResumeSpeech = () => {
    if (synthRef.current?.paused) {
      synthRef.current.resume();
      setIsPausedAudio(false);
      setIsPlayingAudio(true);
    }
  };

  const handleStopSpeech = () => {
    synthRef.current?.cancel();
    setIsPlayingAudio(false);
    setIsPausedAudio(false);
    setCurrentWordIndex(-1);
  };

  // Legacy toggle kept for other tool sections that still use it
  const handleToggleSpeech = () => {
    if (isPlayingAudio) handlePauseSpeech();
    else if (isPausedAudio) handleResumeSpeech();
    else handlePlaySpeech();
  };

  const activeToolObj = subTools.find((t) => t.id === activeSubTool) || subTools[0];
  const IconComponent = activeToolObj.icon;
  const baseName = selectedFile ? selectedFile.name.replace(/\.[^/.]+$/, '') : 'document';

  return (
    <div id="convert-tools-container" className="space-y-6 max-w-5xl mx-auto w-full animate-in fade-in duration-200">
      {/* Header with back button */}
      <div className="flex items-center justify-between pb-4 border-b border-black/[0.06] dark:border-white/[0.08]">
        <button
          onClick={onBackToHome}
          className="flex items-center gap-2 text-[14px] font-semibold text-[#0071e3] dark:text-[#2997ff] hover:opacity-80 transition-opacity cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All 35+ Tools</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-[11.5px] font-semibold bg-[#0071e3]/10 dark:bg-[#2997ff]/20 text-[#0071e3] dark:text-[#2997ff]">
            100% On-Device Engine
          </span>
        </div>
      </div>

      {/* Sub-tool Category Switcher Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {subTools.map((tool) => {
          const ToolIcon = tool.icon;
          const isActive = activeSubTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => {
                if (synthRef.current) {
                  synthRef.current.cancel();
                  setIsPlayingAudio(false);
                }
                setActiveSubTool(tool.id);
                // Clean slate so user chooses their file for the selected tool cleanly
                setSelectedFile(null);
                setStructuredResult(null);
                setJpgResult(null);
                setExcelResult(null);
                setPptxResult(null);
                setEpubResult(null);
                setWordResult(null);
                setHtmlBlobUrl(null);
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-[13px] font-medium whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#0071e3] text-white shadow-sm font-semibold'
                  : 'bg-white dark:bg-[#1c1c1e] text-[#6e6e73] dark:text-[#a1a1a6] hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7] border border-black/[0.06] dark:border-white/[0.08]'
              }`}
            >
              <ToolIcon className="w-4 h-4" />
              <span>{tool.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Tool Card */}
      <div className="bg-white dark:bg-[#1c1c1e] rounded-3xl p-6 sm:p-8 border border-black/[0.08] dark:border-white/[0.1] shadow-xs space-y-6">
        {/* Tool Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#0071e3]/10 dark:bg-[#2997ff]/20 text-[#0071e3] dark:text-[#2997ff] flex items-center justify-center shrink-0">
              <IconComponent className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
                  {activeToolObj.label}
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${activeToolObj.badgeColor}`}>
                  {activeToolObj.badge}
                </span>
              </div>
              <p className="text-[14px] text-[#6e6e73] dark:text-[#8e8e93] mt-0.5">
                {activeToolObj.desc}
              </p>
            </div>
          </div>
        </div>

        {/* Upload Zone (when no file selected) */}
        {!selectedFile ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-black/[0.15] dark:border-white/[0.2] hover:border-[#0071e3] dark:hover:border-[#2997ff] rounded-2xl p-12 text-center cursor-pointer transition-colors bg-[#fafafc] dark:bg-[#242426] space-y-3.5 group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="w-14 h-14 mx-auto rounded-full bg-[#0071e3]/10 dark:bg-[#2997ff]/20 text-[#0071e3] dark:text-[#2997ff] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Upload className="w-7 h-7" />
            </div>
            <div>
              <p className="text-[16px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                Click or drop your PDF document here
              </p>
              <p className="text-[13px] text-[#86868b] dark:text-[#8e8e93] mt-1">
                Instant client-side conversion • Zero cloud uploads • Unlimited file size
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* File info bar */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-[#f5f5f7] dark:bg-[#252528] border border-black/[0.04] dark:border-white/[0.06] flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-[#0071e3] shrink-0" />
                <div>
                  <p className="text-[14px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                    {selectedFile.name}
                  </p>
                  <p className="text-[12px] text-[#86868b]">
                    {(selectedFile.size / 1024).toFixed(1)} KB • Processed 100% locally
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => processConversion(selectedFile, activeSubTool)}
                  disabled={isProcessing}
                  className="text-[12.5px] font-semibold text-[#0071e3] dark:text-[#2997ff] flex items-center gap-1 hover:underline cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                  <span>Re-convert</span>
                </button>
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setStructuredResult(null);
                    setJpgResult(null);
                    setExcelResult(null);
                    setPptxResult(null);
                    setEpubResult(null);
                    setWordResult(null);
                    setHtmlBlobUrl(null);
                  }}
                  className="text-[12.5px] font-semibold text-[#ff3b30] hover:underline cursor-pointer"
                >
                  Choose Another File
                </button>
              </div>
            </div>

            {/* Progress Bar (during processing) */}
            {isProcessing && (
              <div className="p-5 rounded-2xl bg-[#fafafc] dark:bg-[#252528] border border-black/[0.06] dark:border-white/[0.08] space-y-3">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-[#0071e3] animate-spin" />
                    {progressStatus}
                  </span>
                  <span className="font-mono text-[#0071e3] dark:text-[#2997ff] font-bold">{progress}%</span>
                </div>
                <div className="w-full h-2 bg-black/[0.06] dark:bg-white/[0.08] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#0071e3] to-[#af52de] rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 1. PDF TO EXCEL VIEW */}
            {/* ========================================================================= */}
            {activeSubTool === 'pdf_to_excel' && excelResult && (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* Download Actions Bar */}
                <div className="p-4 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h3 className="text-[14.5px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      Table Extraction Complete: {excelResult.rowCount} rows detected across {excelResult.columnCount} columns
                    </h3>
                    <p className="text-[12px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                      Formatted with native headers, numerical alignments, and clean spreadsheet rows.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={excelResult.csvUrl}
                      download={`${baseName}.csv`}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download CSV</span>
                    </a>
                    <a
                      href={excelResult.xlsUrl}
                      download={`${baseName}.xls`}
                      className="px-4 py-2 rounded-xl bg-white dark:bg-[#1c1c1e] text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[13px] font-semibold flex items-center gap-1.5 shadow-xs hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Excel (.xls)</span>
                    </a>
                  </div>
                </div>

                {/* Table Preview Grid */}
                <div className="border border-black/[0.08] dark:border-white/[0.1] rounded-2xl overflow-hidden bg-white dark:bg-[#202022] shadow-2xs">
                  <div className="px-4 py-2.5 bg-[#f5f5f7] dark:bg-[#28282b] border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between text-[12px]">
                    <span className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                      Interactive Spreadsheet Preview (First 30 Rows)
                    </span>
                    <button
                      onClick={() => handleCopyText(excelResult.csvContent)}
                      className="flex items-center gap-1 text-[#0071e3] hover:underline cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-[#34c759]" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied CSV!' : 'Copy Raw CSV'}</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto max-h-96 scrollbar-thin">
                    <table className="w-full text-left text-[12.5px] border-collapse font-mono">
                      <thead>
                        <tr className="bg-[#0071e3]/10 dark:bg-[#2997ff]/15 text-[#1d1d1f] dark:text-[#f5f5f7] border-b border-black/[0.08] dark:border-white/[0.1]">
                          {excelResult.headers.map((hdr, i) => (
                            <th key={i} className="p-2.5 font-bold whitespace-nowrap">
                              {hdr}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.06]">
                        {excelResult.tableRows.slice(0, 30).map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                            <td className="p-2.5 text-[#86868b] font-semibold whitespace-nowrap">
                              #{rIdx + 1}
                            </td>
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} className="p-2.5 text-[#1d1d1f] dark:text-[#f5f5f7] whitespace-nowrap max-w-xs truncate">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 2. PDF TO POWERPOINT VIEW */}
            {/* ========================================================================= */}
            {activeSubTool === 'pdf_to_powerpoint' && pptxResult && (
              <div className="space-y-5 animate-in fade-in duration-200">
                {/* Download Header */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-500/10 via-amber-500/10 to-orange-500/5 border border-orange-500/25 flex items-center justify-between flex-wrap gap-4 shadow-2xs">
                  <div>
                    <h3 className="text-[15px] font-bold text-orange-950 dark:text-orange-200 flex items-center gap-2">
                      <Presentation className="w-5 h-5 text-orange-600" />
                      PowerPoint Presentation Ready: {pptxResult.slideCount} Slides Created
                    </h3>
                    <p className="text-[12.5px] text-orange-800 dark:text-orange-300 mt-1">
                      Standard 16:9 widescreen presentation deck with retina slide visuals, outline bullets, and speaker notes.
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => downloadBlob(pptxResult.pptxBlob, `${baseName}.pptx`)}
                      className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-[13.5px] font-semibold flex items-center gap-2 shadow-sm transition-all hover:shadow-md cursor-pointer active:scale-98"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download {baseName}.pptx</span>
                    </button>

                    {pptxResult.zipBlob && (
                      <button
                        type="button"
                        onClick={() => downloadBlob(pptxResult.zipBlob!, `${baseName}_slides_images.zip`)}
                        className="px-4 py-2.5 rounded-xl bg-white dark:bg-[#1c1c1e] text-orange-700 dark:text-orange-300 border border-orange-500/30 text-[13px] font-semibold flex items-center gap-1.5 shadow-2xs hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-colors cursor-pointer"
                      >
                        <Archive className="w-4 h-4" />
                        <span>Download Slides (.zip)</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Slides Visual Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {pptxResult.slides.map((slide) => (
                    <div
                      key={slide.slideNumber}
                      className="rounded-2xl border border-black/[0.08] dark:border-white/[0.1] bg-[#fafafc] dark:bg-[#252528] overflow-hidden shadow-2xs hover:shadow-md transition-shadow group flex flex-col justify-between"
                    >
                      <div>
                        <div className="relative aspect-video bg-white overflow-hidden border-b border-black/[0.06] dark:border-white/[0.08]">
                          <img
                            src={slide.imageUrl}
                            alt={`Presentation slide ${slide.slideNumber} preview: ${slide.title || 'Slide'}`}
                            className="w-full h-full object-contain group-hover:scale-102 transition-transform"
                          />
                          <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-md bg-black/75 text-white text-[10.5px] font-bold backdrop-blur-xs">
                            Slide {slide.slideNumber}
                          </span>
                        </div>
                        <div className="p-3.5 space-y-1">
                          <h4 className="text-[13px] font-bold text-[#1d1d1f] dark:text-[#f5f5f7] truncate">
                            {slide.title}
                          </h4>
                          <p className="text-[11.5px] text-[#86868b] line-clamp-2 leading-relaxed">
                            {slide.bullets.join(' • ')}
                          </p>
                        </div>
                      </div>

                      <div className="p-3 pt-0 flex items-center justify-between border-t border-black/[0.04] dark:border-white/[0.06] mt-2">
                        <span className="text-[11px] text-[#86868b] font-mono">16:9 PresentationML</span>
                        <a
                          href={slide.imageUrl}
                          download={`${baseName}_slide_${slide.slideNumber}.jpg`}
                          className="text-[11.5px] font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-400 flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          <Download className="w-3 h-3" />
                          <span>Save JPG</span>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 3. PDF TO JPG VIEW */}
            {/* ========================================================================= */}
            {activeSubTool === 'pdf_to_jpg' && jpgResult && (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* Download Header */}
                <div className="p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h3 className="text-[14.5px] font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-amber-600" />
                      Rendered {jpgResult.pages.length} High-Res JPEG Page{jpgResult.pages.length > 1 ? 's' : ''} (2x Retina DPI)
                    </h3>
                    <p className="text-[12px] text-amber-800 dark:text-amber-300 mt-0.5">
                      Crystal clear raster images ready for presentations, printing, and digital sharing.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {jpgResult.zipUrl && (
                      <a
                        href={jpgResult.zipUrl}
                        download={`${baseName}_all_pages_jpg.zip`}
                        className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-[13px] font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <Archive className="w-4 h-4" />
                        <span>Download All as ZIP</span>
                      </a>
                    )}
                    <a
                      href={jpgResult.singleBlobUrl}
                      download={jpgResult.singleFileName}
                      className="px-4 py-2 rounded-xl bg-white dark:bg-[#1c1c1e] text-amber-900 dark:text-amber-200 border border-amber-500/30 text-[13px] font-semibold flex items-center gap-1.5 shadow-xs hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Page 1 JPG</span>
                    </a>
                  </div>
                </div>

                {/* Page Image Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {jpgResult.pages.map((pg) => (
                    <div
                      key={pg.pageNumber}
                      className="rounded-2xl border border-black/[0.08] dark:border-white/[0.1] bg-[#fafafc] dark:bg-[#252528] overflow-hidden shadow-2xs hover:shadow-md transition-shadow group flex flex-col justify-between"
                    >
                      <div className="relative aspect-[3/4] bg-white overflow-hidden p-2">
                        <img
                          src={pg.dataUrl}
                          alt={`Converted PDF page ${pg.pageNumber} JPEG preview (${pg.width}x${pg.height}px)`}
                          className="w-full h-full object-contain group-hover:scale-102 transition-transform"
                        />
                        <span className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-black/70 text-white text-[11px] font-bold">
                          Page {pg.pageNumber}
                        </span>
                      </div>
                      <div className="p-3 bg-white dark:bg-[#1f1f22] border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
                        <span className="text-[12px] text-[#86868b]">
                          {pg.width} × {pg.height} px
                        </span>
                        <a
                          href={pg.dataUrl}
                          download={`${baseName}_page_${pg.pageNumber}.jpg`}
                          className="px-2.5 py-1 rounded-lg bg-black/[0.05] dark:bg-white/[0.08] hover:bg-[#0071e3] hover:text-white text-[11.5px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Download className="w-3 h-3" />
                          <span>JPG</span>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 4. PDF TO EPUB VIEW */}
            {/* ========================================================================= */}
            {activeSubTool === 'pdf_to_epub' && epubResult && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="p-5 rounded-2xl bg-purple-500/10 dark:bg-purple-500/15 border border-purple-500/20 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h3 className="text-[15px] font-bold text-purple-900 dark:text-purple-200 flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-purple-600" />
                      EPUB 3.0 Digital E-Book Ready ({epubResult.chapterCount} Chapters)
                    </h3>
                    <p className="text-[12.5px] text-purple-800 dark:text-purple-300 mt-0.5">
                      Compliant standard with TOC navigation, CSS typography, and device reflow. Opens on Apple Books, Kindle & Kobo.
                    </p>
                  </div>

                  <a
                    href={epubResult.epubUrl}
                    download={`${baseName}.epub`}
                    className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-[13.5px] font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download {baseName}.epub</span>
                  </a>
                </div>

                {structuredResult && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[13px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                        Extracted E-Book Content Preview
                      </label>
                      <button
                        onClick={() => handleCopyText(structuredResult.extractedText)}
                        className="text-[12px] text-[#0071e3] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-[#34c759]" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copied ? 'Copied!' : 'Copy Text'}</span>
                      </button>
                    </div>
                    <textarea
                      value={structuredResult.extractedText}
                      readOnly
                      rows={6}
                      className="w-full p-4 rounded-2xl bg-[#fafafc] dark:bg-[#252528] border border-black/[0.08] dark:border-white/[0.1] text-[13px] font-mono leading-relaxed text-[#1d1d1f] dark:text-[#f5f5f7] resize-y"
                    />
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* 5. PDF TO WORD VIEW */}
            {/* ========================================================================= */}
            {activeSubTool === 'pdf_to_word' && wordResult && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="p-5 rounded-2xl bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/20 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h3 className="text-[15px] font-bold text-blue-900 dark:text-blue-200 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      Editable Word Documents Generated (.docx & .doc)
                    </h3>
                    <p className="text-[12.5px] text-blue-800 dark:text-blue-300 mt-0.5">
                      Preserved paragraphs, headers, and pagination ready for Microsoft Word and Google Docs.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={wordResult.docxUrl}
                      download={`${baseName}.docx`}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[13.5px] font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download .DOCX</span>
                    </a>
                    <a
                      href={wordResult.docUrl}
                      download={`${baseName}.doc`}
                      className="px-4 py-2.5 rounded-xl bg-white dark:bg-[#1c1c1e] text-blue-800 dark:text-blue-200 border border-blue-500/30 text-[13px] font-semibold flex items-center gap-1.5 shadow-xs hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download .DOC</span>
                    </a>
                  </div>
                </div>

                {structuredResult && (
                  <div className="space-y-2">
                    <label className="text-[13px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                      Extracted Document Flow
                    </label>
                    <textarea
                      value={structuredResult.extractedText}
                      readOnly
                      rows={6}
                      className="w-full p-4 rounded-2xl bg-[#fafafc] dark:bg-[#252528] border border-black/[0.08] dark:border-white/[0.1] text-[13px] font-mono leading-relaxed text-[#1d1d1f] dark:text-[#f5f5f7] resize-y"
                    />
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* 6. EXTRACT TEXT & MARKDOWN VIEW */}
            {/* ========================================================================= */}
            {activeSubTool === 'extract_text' && structuredResult && (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* Download Header */}
                <div className="p-4 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h3 className="text-[14.5px] font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-indigo-600" />
                      Clean Text & Markdown Extracted ({structuredResult.extractedText.split(/\s+/).length} words across {structuredResult.totalPages} pages)
                    </h3>
                    <p className="text-[12px] text-indigo-800 dark:text-indigo-300 mt-0.5">
                      Formatted with markdown headings, bullet items, and tabulations.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={URL.createObjectURL(new Blob([structuredResult.markdownText], { type: 'text/markdown;charset=utf-8;' }))}
                      download={`${baseName}.md`}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download .MD</span>
                    </a>
                    <a
                      href={URL.createObjectURL(new Blob([structuredResult.extractedText], { type: 'text/plain;charset=utf-8;' }))}
                      download={`${baseName}.txt`}
                      className="px-4 py-2 rounded-xl bg-white dark:bg-[#1c1c1e] text-indigo-900 dark:text-indigo-200 border border-indigo-500/30 text-[13px] font-semibold flex items-center gap-1.5 shadow-xs hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download .TXT</span>
                    </a>
                  </div>
                </div>

                {/* Tabs & Content Box */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 bg-black/[0.04] dark:bg-white/[0.06] p-1 rounded-xl">
                      <button
                        onClick={() => setActiveTab('preview')}
                        className={`px-3 py-1 rounded-lg text-[12px] font-semibold transition-colors cursor-pointer ${
                          activeTab === 'preview'
                            ? 'bg-white dark:bg-[#1c1c1e] text-[#1d1d1f] dark:text-[#f5f5f7] shadow-2xs'
                            : 'text-[#86868b] hover:text-[#1d1d1f]'
                        }`}
                      >
                        Formatted Markdown
                      </button>
                      <button
                        onClick={() => setActiveTab('raw')}
                        className={`px-3 py-1 rounded-lg text-[12px] font-semibold transition-colors cursor-pointer ${
                          activeTab === 'raw'
                            ? 'bg-white dark:bg-[#1c1c1e] text-[#1d1d1f] dark:text-[#f5f5f7] shadow-2xs'
                            : 'text-[#86868b] hover:text-[#1d1d1f]'
                        }`}
                      >
                        Plain Text
                      </button>
                    </div>

                    <button
                      onClick={() => handleCopyText(activeTab === 'preview' ? structuredResult.markdownText : structuredResult.extractedText)}
                      className="flex items-center gap-1 text-[12px] font-semibold text-[#0071e3] hover:underline cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-[#34c759]" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied to Clipboard!' : 'Copy to Clipboard'}</span>
                    </button>
                  </div>

                  <textarea
                    value={activeTab === 'preview' ? structuredResult.markdownText : structuredResult.extractedText}
                    readOnly
                    rows={8}
                    className="w-full p-4 rounded-2xl bg-[#fafafc] dark:bg-[#252528] border border-black/[0.08] dark:border-white/[0.1] text-[13px] font-mono leading-relaxed text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:ring-2 focus:ring-[#0071e3] resize-y"
                  />
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 7. PDF TO HTML VIEW */}
            {/* ========================================================================= */}
            {activeSubTool === 'pdf_to_html' && htmlBlobUrl && structuredResult && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="p-4 rounded-2xl bg-cyan-500/10 dark:bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h3 className="text-[14.5px] font-bold text-cyan-900 dark:text-cyan-200 flex items-center gap-2">
                      <Code className="w-4 h-4 text-cyan-600" />
                      Standalone Responsive HTML5 Web Document
                    </h3>
                    <p className="text-[12px] text-cyan-800 dark:text-cyan-300 mt-0.5">
                      Self-contained HTML file with embedded modern CSS and dark/light mode compatibility.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={htmlBlobUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#1c1c1e] text-cyan-900 dark:text-cyan-200 border border-cyan-500/30 text-[13px] font-semibold flex items-center gap-1.5 shadow-xs hover:bg-cyan-50 dark:hover:bg-cyan-950/30 transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Preview in New Tab</span>
                    </a>
                    <a
                      href={htmlBlobUrl}
                      download={`${baseName}.html`}
                      className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-[13px] font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download HTML</span>
                    </a>
                  </div>
                </div>

                <div className="border border-black/[0.08] dark:border-white/[0.1] rounded-2xl overflow-hidden bg-white dark:bg-[#1f1f22]">
                  <div className="px-4 py-2 bg-[#f5f5f7] dark:bg-[#28282b] border-b border-black/[0.06] dark:border-white/[0.08] text-[12px] font-semibold text-[#86868b]">
                    Live HTML Webpage Render
                  </div>
                  <iframe
                    src={htmlBlobUrl}
                    title="HTML Preview"
                    className="w-full h-80 border-0 bg-white"
                  />
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 8. PDF TO AUDIO VIEW */}
            {/* ========================================================================= */}
            {activeSubTool === 'pdf_to_audio' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                {/* Header */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-violet-500/10 border border-blue-500/20 dark:border-blue-400/20">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-9 h-9 rounded-xl bg-[#0071e3] flex items-center justify-center shrink-0 shadow-md">
                      <Volume2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">AI Natural Voice Synthesizer</h3>
                      <p className="text-[12px] text-[#86868b]">Premium on-device neural speech — no cloud, real-time playback with word tracking</p>
                    </div>
                  </div>
                </div>

                {/* Voice Selector */}
                {availableVoices.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-[12px] font-bold text-[#86868b] uppercase tracking-wide">Voice Engine</label>
                    <select
                      value={selectedVoice?.name || ''}
                      onChange={(e) => {
                        const voice = availableVoices.find(v => v.name === e.target.value);
                        if (voice) setSelectedVoice(voice);
                      }}
                      className="w-full p-3 rounded-xl bg-white dark:bg-[#1c1c1e] border border-black/[0.08] dark:border-white/[0.1] text-[13px] font-medium text-[#1d1d1f] dark:text-[#f5f5f7] cursor-pointer"
                    >
                      {availableVoices.map((v) => (
                        <option key={v.name} value={v.name}>
                          {v.name} ({v.lang})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Controls Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Rate */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[12px] font-bold text-[#86868b] uppercase tracking-wide">Speed</label>
                      <span className="text-[12px] font-mono font-bold text-[#0071e3]">{speechRate.toFixed(2)}×</span>
                    </div>
                    <input
                      type="range" min="0.5" max="2.5" step="0.05"
                      value={speechRate}
                      onChange={(e) => setSpeechRate(Number(e.target.value))}
                      className="w-full accent-[#0071e3]"
                    />
                    <div className="flex justify-between text-[10.5px] text-[#86868b]">
                      <span>0.5×</span><span>1.0×</span><span>2.5×</span>
                    </div>
                  </div>

                  {/* Pitch */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[12px] font-bold text-[#86868b] uppercase tracking-wide">Pitch</label>
                      <span className="text-[12px] font-mono font-bold text-violet-600">{speechPitch.toFixed(2)}</span>
                    </div>
                    <input
                      type="range" min="0.1" max="2" step="0.05"
                      value={speechPitch}
                      onChange={(e) => setSpeechPitch(Number(e.target.value))}
                      className="w-full accent-violet-600"
                    />
                    <div className="flex justify-between text-[10.5px] text-[#86868b]">
                      <span>Low</span><span>Normal</span><span>High</span>
                    </div>
                  </div>

                  {/* Volume */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[12px] font-bold text-[#86868b] uppercase tracking-wide">Volume</label>
                      <span className="text-[12px] font-mono font-bold text-emerald-600">{Math.round(speechVolume * 100)}%</span>
                    </div>
                    <input
                      type="range" min="0" max="1" step="0.05"
                      value={speechVolume}
                      onChange={(e) => setSpeechVolume(Number(e.target.value))}
                      className="w-full accent-emerald-600"
                    />
                    <div className="flex justify-between text-[10.5px] text-[#86868b]">
                      <span>Mute</span><span>50%</span><span>100%</span>
                    </div>
                  </div>
                </div>

                {/* Playback Controls */}
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Play */}
                  <button
                    onClick={handlePlaySpeech}
                    disabled={!structuredResult?.extractedText}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0071e3] hover:bg-[#005bc4] disabled:opacity-40 text-white font-semibold text-[13.5px] transition-colors cursor-pointer shadow-md"
                  >
                    <Play className="w-4 h-4" />
                    <span>{isPlayingAudio ? 'Playing…' : 'Play'}</span>
                  </button>

                  {/* Pause */}
                  <button
                    onClick={handlePauseSpeech}
                    disabled={!isPlayingAudio}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-semibold text-[13.5px] transition-colors cursor-pointer shadow-sm"
                  >
                    <Pause className="w-4 h-4" />
                    <span>Pause</span>
                  </button>

                  {/* Resume */}
                  <button
                    onClick={handleResumeSpeech}
                    disabled={!isPausedAudio}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-semibold text-[13.5px] transition-colors cursor-pointer shadow-sm"
                  >
                    <Play className="w-4 h-4" />
                    <span>Resume</span>
                  </button>

                  {/* Stop */}
                  <button
                    onClick={handleStopSpeech}
                    disabled={!isPlayingAudio && !isPausedAudio}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ff3b30] hover:bg-red-600 disabled:opacity-40 text-white font-semibold text-[13.5px] transition-colors cursor-pointer shadow-sm"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Stop</span>
                  </button>

                  {/* Status badge */}
                  <span className={`ml-2 px-3 py-1 rounded-full text-[11.5px] font-semibold transition-all ${
                    isPlayingAudio ? 'bg-[#0071e3]/15 text-[#0071e3] animate-pulse'
                    : isPausedAudio ? 'bg-amber-500/15 text-amber-600'
                    : 'bg-black/[0.05] dark:bg-white/[0.06] text-[#86868b]'
                  }`}>
                    {isPlayingAudio ? '▶ Playing' : isPausedAudio ? '⏸ Paused' : '◼ Stopped'}
                  </span>
                </div>

                {/* Live word-highlighted reading window */}
                {structuredResult?.extractedText && (
                  <div className="space-y-2">
                    <label className="text-[12.5px] font-bold text-[#1d1d1f] dark:text-[#f5f5f7] flex items-center gap-2">
                      <Eye className="w-4 h-4 text-[#0071e3]" />
                      Live Reading Window — Words Highlighted in Real-Time
                    </label>
                    <div className="p-4 rounded-2xl bg-white dark:bg-[#1e1e20] border border-black/[0.08] dark:border-white/[0.1] text-[13.5px] leading-loose text-[#1d1d1f] dark:text-[#f5f5f7] max-h-56 overflow-y-auto font-sans">
                      {speechWords.length > 0
                        ? speechWords.map((word, i) => (
                            <span
                              key={i}
                              className={`transition-colors duration-100 rounded-sm px-0.5 ${
                                i === currentWordIndex
                                  ? 'bg-[#0071e3] text-white font-semibold'
                                  : i < currentWordIndex
                                  ? 'text-[#86868b]'
                                  : ''
                              }`}
                            >
                              {word}{' '}
                            </span>
                          ))
                        : structuredResult.extractedText
                      }
                    </div>
                    <p className="text-[11.5px] text-[#86868b]">
                      {structuredResult.extractedText.split(/\s+/).length.toLocaleString()} words •{' '}
                      ~{Math.ceil(structuredResult.extractedText.split(/\s+/).length / (speechRate * 130))} min read at {speechRate}× speed
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
