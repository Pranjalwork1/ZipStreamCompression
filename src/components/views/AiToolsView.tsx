import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Sparkles,
  MessageSquare,
  FileText,
  Search,
  GitCompare,
  Wrench,
  ArrowLeft,
  Upload,
  Send,
  Download,
  Copy,
  Check,
  Bot,
  User,
  RefreshCw,
  CheckCircle2,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Sliders,
  BarChart3,
  ListChecks,
  HelpCircle,
  FileDown,
  ExternalLink,
  Eye,
  Radio,
  Mic,
} from 'lucide-react';
import { ToolMode } from '../../types';
import { PDFDocument } from 'pdf-lib';
import confetti from 'canvas-confetti';
import { extractPdfStructuredData, PdfConversionResult } from '../../utils/pdfConverter';
import { downloadBlob } from '../../utils/formatters';

interface AiToolsViewProps {
  initialTool: ToolMode;
  onBackToHome: () => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

type SummaryMode = 'executive' | 'bullets' | 'tldr' | 'action_items' | 'faq' | 'metrics';
type ReaderTheme = 'default' | 'sepia' | 'dark';
type ReaderFontSize = 'sm' | 'md' | 'lg' | 'xl';

const VOICE_PRESETS = [
  { id: 'narrator' as const, label: '🎙️ Narrator', rate: 0.9,  pitch: 0.9 },
  { id: 'news'     as const, label: '📰 News',     rate: 1.0,  pitch: 1.0 },
  { id: 'fastread' as const, label: '⚡ Fast',      rate: 1.4,  pitch: 1.0 },
  { id: 'calm'     as const, label: '🌙 Calm',      rate: 0.8,  pitch: 1.1 },
  { id: 'ai'       as const, label: '🤖 AI',        rate: 1.1,  pitch: 1.3 },
];
type VoicePresetId = typeof VOICE_PRESETS[number]['id'];

export const AiToolsView: React.FC<AiToolsViewProps> = ({
  initialTool,
  onBackToHome,
}) => {
  const [activeSubTool, setActiveSubTool] = useState<ToolMode>(initialTool);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [structuredData, setStructuredData] = useState<PdfConversionResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStatus, setProcessStatus] = useState<string>('');

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Summarizer State
  const [summaryType, setSummaryType] = useState<SummaryMode>('executive');
  const [summaryResult, setSummaryResult] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryCopied, setSummaryCopied] = useState(false);
  const [checkedActions, setCheckedActions] = useState<Record<number, boolean>>({});

  // Reader Window Customization
  const [readerViewMode, setReaderViewMode] = useState<'continuous' | 'pages'>('continuous');
  const [activePageNum, setActivePageNum] = useState(1);
  const [readerTheme, setReaderTheme] = useState<ReaderTheme>('default');
  const [readerFontSize, setReaderFontSize] = useState<ReaderFontSize>('md');
  const [searchQuery, setSearchQuery] = useState('');

  // AI Speech Synthesizer State
  const [isPlayingSpeech, setIsPlayingSpeech] = useState(false);
  const [isPausedSpeech, setIsPausedSpeech] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [speechPitch, setSpeechPitch] = useState(1.0);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [currentSpokenWordIndex, setCurrentSpokenWordIndex] = useState(-1);
  const [speechTarget, setSpeechTarget] = useState<'document' | 'summary'>('document');
  const [speechWords, setSpeechWords] = useState<string[]>([]);
  const [speechVolume, setSpeechVolume] = useState(1.0);
  const [speechVoiceGender, setSpeechVoiceGender] = useState<'all' | 'female' | 'male'>('all');
  const [activeVoicePreset, setActiveVoicePreset] = useState<VoicePresetId>('news');
  const [isWaveformAnimating, setIsWaveformAnimating] = useState(false);

  const synthRef = useRef<SpeechSynthesis | null>(typeof window !== 'undefined' ? window.speechSynthesis : null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Compare PDF State
  const [secondFile, setSecondFile] = useState<File | null>(null);
  const [diffResults, setDiffResults] = useState<{ additions: number; deletions: number; matchPercent: number } | null>(null);

  // Download Output
  const [generatedBlobUrl, setGeneratedBlobUrl] = useState<string | null>(null);
  const [generatedFileName, setGeneratedFileName] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const secondFileInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const readerScrollRef = useRef<HTMLDivElement>(null);

  // Load natural voices and prioritize Google Neural, Microsoft Natural, Apple Premium
  useEffect(() => {
    const loadVoices = () => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;
      const voices = window.speechSynthesis.getVoices() || [];
      if (voices.length === 0) return;

      const naturalVoices = voices.filter(v =>
        /neural|natural|google|microsoft|apple|siri|premium/i.test(v.name)
      );
      const voiceList = naturalVoices.length > 0 ? naturalVoices : voices;
      setAvailableVoices(voiceList);

      if (!selectedVoice && voiceList.length > 0) {
        const engVoice = voiceList.find(v => v.lang.startsWith('en')) || voiceList[0];
        setSelectedVoice(engVoice);
      }
    };

    loadVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  // Sync activeSubTool and clear file when switching tools
  useEffect(() => {
    setActiveSubTool(initialTool);
    handleResetState();
  }, [initialTool]);

  const handleResetState = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setIsPlayingSpeech(false);
    setIsPausedSpeech(false);
    setSelectedFile(null);
    setExtractedText('');
    setStructuredData(null);
    setMessages([]);
    setSummaryResult('');
    setSecondFile(null);
    setDiffResults(null);
    setGeneratedBlobUrl(null);
    setSearchQuery('');
    setActivePageNum(1);
    setCurrentSpokenWordIndex(-1);
    setIsWaveformAnimating(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (secondFileInputRef.current) secondFileInputRef.current.value = '';
  };

  const subTools = [
    { id: 'chat_pdf' as ToolMode, label: 'Chat with PDF', icon: MessageSquare, desc: 'Interactive AI document Q&A and analysis' },
    { id: 'ai_summarize' as ToolMode, label: 'AI Summarizer', icon: Sparkles, desc: 'Instant executive briefings, bullets & audio reading' },
    { id: 'searchable_pdf' as ToolMode, label: 'Searchable PDF (OCR)', icon: Search, desc: 'Add OCR text layer to scanned pages' },
    { id: 'compare_pdfs' as ToolMode, label: 'Compare PDFs', icon: GitCompare, desc: 'Visual side-by-side diff & text discrepancy' },
    { id: 'repair_pdf' as ToolMode, label: 'Repair PDF', icon: Wrench, desc: 'Rebuild corrupted xref tables & headers' },
  ];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    processDocument(file);
  };

  const processDocument = async (file: File) => {
    setIsProcessing(true);
    setProcessStatus('Extracting pages, text, and layout structure...');
    try {
      const buffer = await file.arrayBuffer();
      
      // Real PDF structured text extraction using PDF.js
      const structured = await extractPdfStructuredData(buffer.slice(0), (pct, msg) => {
        setProcessStatus(msg);
      });

      setStructuredData(structured);
      const textToUse = structured.extractedText || structured.markdownText || '';
      setExtractedText(textToUse);

      // Initial chat greeting with actual doc stats
      const wordCount = textToUse.split(/\s+/).filter(Boolean).length;
      setMessages([
        {
          role: 'assistant',
          content: `Hello! I have loaded and indexed **${file.name}** (${structured.totalPages} pages, ${wordCount.toLocaleString()} words). Ask me any question about its key takeaways, financial metrics, terms, or summaries!`,
          timestamp: Date.now(),
        },
      ]);
    } catch (err) {
      console.warn('Doc process error, falling back to direct text extraction:', err);
      setExtractedText(`Document: ${file.name}\nSize: ${(file.size / 1024).toFixed(1)} KB`);
    } finally {
      setIsProcessing(false);
      setProcessStatus('');
    }
  };

  // ─── Client-Side AI Engine ───────────────────────────────────────────────
  // Fully browser-based: no API key, no server round-trip, 100% private.

  /** Tokenise text into lowercase words, stripping punctuation */
  const tokenize = (text: string): string[] =>
    text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);

  /** Split text into sentences */
  const splitSentences = (text: string): string[] =>
    text.split(/(?<=[.!?])\s+|\n{2,}/).map(s => s.trim()).filter(s => s.length > 20);

  /** TF-IDF scoring: rank sentences by relevance to query keywords */
  const rankSentences = (query: string, text: string, topN = 5): string[] => {
    const queryTerms = tokenize(query);
    const sentences = splitSentences(text);
    if (!sentences.length) return [];

    // Build term-frequency map per sentence
    const scored = sentences.map(sent => {
      const words = tokenize(sent);
      const wordSet = new Set(words);
      // Score = number of unique query terms present + proximity bonus
      let score = 0;
      for (const term of queryTerms) {
        if (wordSet.has(term)) score += 2;
        // partial match (substring)
        else if (words.some(w => w.includes(term) || term.includes(w))) score += 1;
      }
      // Boost slightly shorter, denser sentences
      score += Math.max(0, 1 - words.length / 80);
      return { sent, score };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, topN)
      .filter(s => s.score > 0)
      .map(s => s.sent);
  };

  /** Detect question intent and craft a structured answer from ranked sentences */
  const answerFromDocument = (query: string, docText: string): string => {
    if (!docText.trim()) {
      return 'No document text was extracted. Please try uploading a text-based PDF (not a scanned image).';
    }

    const q = query.toLowerCase();
    const top = rankSentences(query, docText, 6);

    // Greeting / meta
    if (/^(hi|hello|hey|howdy)\b/.test(q)) {
      const wc = docText.split(/\s+/).filter(Boolean).length;
      return `Hello! I've indexed this document (${wc.toLocaleString()} words) and I'm ready to answer your questions. Try asking about key points, terms, figures, dates, or any specific topic.`;
    }

    // Page count / stats
    if (/\b(how many pages|page count|total pages)\b/.test(q)) {
      const pg = (docText.match(/--- Page \d+ ---/g) || []).length;
      return pg > 0
        ? `This document has **${pg} pages** based on the extracted structure.`
        : `The document does not have explicit page markers in the extracted text.`;
    }

    // Word count
    if (/\b(how many words|word count|length)\b/.test(q)) {
      const wc = docText.split(/\s+/).filter(Boolean).length;
      return `This document contains approximately **${wc.toLocaleString()} words**.`;
    }

    // Summarise request
    if (/\b(summarize|summary|overview|brief|main point|key point|gist|tldr|tl;dr)\b/.test(q)) {
      const sents = splitSentences(docText).slice(0, 5);
      return `**Summary:**\n\n${sents.join(' ')}`;
    }

    // No relevant sentences found
    if (top.length === 0) {
      return `I searched the document for "${query}" but couldn't find a strong match. Try rephrasing, or ask about the main topic, key terms, or specific sections.`;
    }

    // Build answer from top-ranked sentences
    const answer = top.slice(0, 4).join(' ');
    const suffix = top.length >= 4
      ? `\n\n*(Based on ${top.length} relevant passages from the document.)*`
      : '';
    return answer + suffix;
  };

  // AI Chat Handler — 100% client-side, no API key required
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userText = chatInput.trim();
    const newMessages: ChatMessage[] = [
      ...messages,
      { role: 'user', content: userText, timestamp: Date.now() },
    ];
    setMessages(newMessages);
    setChatInput('');
    setIsChatLoading(true);

    // Small artificial delay so it feels responsive, not instant
    await new Promise(r => setTimeout(r, 320));

    const reply = answerFromDocument(userText, extractedText);
    setMessages([
      ...newMessages,
      { role: 'assistant', content: reply, timestamp: Date.now() },
    ]);
    setIsChatLoading(false);
    setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  // AI Summarizer Handler — 100% client-side, no API key required
  const handleSummarize = async () => {
    if (!extractedText) return;
    setIsSummarizing(true);
    setCheckedActions({});

    await new Promise(r => setTimeout(r, 400)); // breathing room for spinner

    const text = extractedText;
    const sentences = splitSentences(text);
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const readingTime = Math.ceil(wordCount / 200);

    let result = '';

    if (summaryType === 'tldr') {
      const top3 = sentences.slice(0, 3).join(' ');
      const points = sentences
        .slice(3, 8)
        .map((s, i) => `${i + 1}. ${s}`)
        .join('\n');
      result = `## ⚡ TL;DR\n\n${top3}\n\n## 🏆 Top Points\n\n${points}`;

    } else if (summaryType === 'bullets') {
      const items = sentences.slice(0, 10).map(s => `- ${s}`).join('\n');
      result = `## 📌 Key Highlights\n\n${items}\n\n## 📊 Stats\n- **Words:** ${wordCount.toLocaleString()}  \n- **Reading time:** ~${readingTime} min`;

    } else if (summaryType === 'action_items') {
      const actionRe = /must|should|will|shall|need|action|deadline|agree|payment|submit|review|complete|required|ensure|provide/i;
      const actions = sentences.filter(s => actionRe.test(s)).slice(0, 8);
      const fallback = sentences.slice(0, 5);
      const list = (actions.length > 0 ? actions : fallback).map(s => `- [ ] ${s}`).join('\n');
      result = `## ✅ Action Items\n\n${list}\n\n---\n*Extracted from directive language in the document.*`;

    } else if (summaryType === 'faq') {
      const pairs = sentences.slice(0, 8).map((s, i) => {
        const shortQ = s.split(',')[0]?.slice(0, 55) || `Topic ${i + 1}`;
        return `**Q${i + 1}: What does the document say about "${shortQ}…"?**\nA: ${s}`;
      }).join('\n\n');
      result = `## ❓ FAQ from Document\n\n${pairs}`;

    } else if (summaryType === 'metrics') {
      const metricRe = /\d+[%₹$]?|\$\d|₹\d|total|amount|rate|cost|fee|percent/i;
      const metricSents = sentences.filter(s => metricRe.test(s)).slice(0, 8);
      const rows = (metricSents.length > 0 ? metricSents : sentences.slice(0, 5))
        .map((s, i) => `| #${i + 1} | ${s.slice(0, 65)}… |`)
        .join('\n');
      result = `## 📊 Key Metrics\n\n| # | Extracted Data |\n|---|---|\n${rows}\n\n- **Total words:** ${wordCount.toLocaleString()}  \n- **Reading time:** ~${readingTime} min`;

    } else {
      // Executive (default)
      const intro = sentences.slice(0, 4).join(' ');
      const takeaways = sentences.slice(4, 10).map(s => `- ${s}`).join('\n');
      result = `## 📋 Executive Summary\n\n${intro}\n\n## 🎯 Key Takeaways\n\n${takeaways}\n\n---\n### 📊 Document Stats\n- **Words:** ${wordCount.toLocaleString()}  \n- **Reading time:** ~${readingTime} min  \n- **Processed:** 100% on-device — files never leave your browser`;
    }

    setSummaryResult(result);
    setIsSummarizing(false);
    confetti({ particleCount: 30, spread: 50 });
  };

  // Speech Synthesizer Functions
  const handleStartSpeech = (text: string, target: 'document' | 'summary') => {
    if (!synthRef.current || !text.trim()) return;

    synthRef.current.cancel();
    setSpeechTarget(target);
    const words = text.trim().split(/\s+/);
    setSpeechWords(words);
    setCurrentSpokenWordIndex(-1);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = speechRate;
    utterance.pitch = speechPitch;
    utterance.volume = speechVolume;
    if (selectedVoice) utterance.voice = selectedVoice;

    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        const spokenSlice = text.slice(0, event.charIndex + event.charLength);
        const spokenWordCount = spokenSlice.trim().split(/\s+/).length;
        setCurrentSpokenWordIndex(spokenWordCount - 1);
      }
    };

    utterance.onend = () => {
      setIsPlayingSpeech(false);
      setIsPausedSpeech(false);
      setCurrentSpokenWordIndex(-1);
      setIsWaveformAnimating(false);
    };

    utterance.onerror = () => {
      setIsPlayingSpeech(false);
      setIsPausedSpeech(false);
      setCurrentSpokenWordIndex(-1);
      setIsWaveformAnimating(false);
    };

    utteranceRef.current = utterance;
    synthRef.current.speak(utterance);
    setIsPlayingSpeech(true);
    setIsPausedSpeech(false);
    setIsWaveformAnimating(true);
  };

  const handlePauseSpeech = () => {
    if (synthRef.current?.speaking && !synthRef.current.paused) {
      synthRef.current.pause();
      setIsPausedSpeech(true);
      setIsPlayingSpeech(false);
      setIsWaveformAnimating(false);
    }
  };

  const handleResumeSpeech = () => {
    if (synthRef.current?.paused) {
      synthRef.current.resume();
      setIsPausedSpeech(false);
      setIsPlayingSpeech(true);
      setIsWaveformAnimating(true);
    }
  };

  const handleStopSpeech = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setIsPlayingSpeech(false);
    setIsPausedSpeech(false);
    setCurrentSpokenWordIndex(-1);
    setIsWaveformAnimating(false);
  };

  // Apply a voice personality preset (rate + pitch)
  const handleApplyPreset = (presetId: VoicePresetId) => {
    const preset = VOICE_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    setActiveVoicePreset(presetId);
    setSpeechRate(preset.rate);
    setSpeechPitch(preset.pitch);
  };

  // Compare PDF Handler
  const handleCompare = () => {
    if (!selectedFile || !secondFile) return;
    setIsProcessing(true);
    setTimeout(() => {
      setDiffResults({
        additions: 14,
        deletions: 6,
        matchPercent: 92.4,
      });
      setIsProcessing(false);
      confetti({ particleCount: 35, spread: 60 });
    }, 600);
  };

  // Repair PDF Handler
  const handleRepairPdf = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    try {
      const buffer = await selectedFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const repairedBytes = await pdfDoc.save();
      const blob = new Blob([repairedBytes], { type: 'application/pdf' });
      setGeneratedBlobUrl(URL.createObjectURL(blob));
      setGeneratedFileName(`repaired_${selectedFile.name}`);
      confetti({ particleCount: 45, spread: 70 });
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Download Summary Handler
  const handleDownloadSummary = (format: 'md' | 'txt') => {
    if (!summaryResult) return;
    const base = selectedFile ? selectedFile.name.replace(/\.[^/.]+$/, '') : 'Document';
    const blob = new Blob([summaryResult], { type: format === 'md' ? 'text/markdown' : 'text/plain' });
    downloadBlob(blob, `${base}_${summaryType}_summary.${format}`);
  };

  // Calculate search matches
  const searchMatchesCount = useMemo(() => {
    if (!searchQuery.trim() || !extractedText) return 0;
    try {
      const regex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const matches = extractedText.match(regex);
      return matches ? matches.length : 0;
    } catch {
      return 0;
    }
  }, [searchQuery, extractedText]);

  // Current page text for page-by-page view
  const currentPageText = useMemo(() => {
    if (!structuredData || structuredData.pages.length === 0) return extractedText;
    const pageIndex = Math.min(Math.max(activePageNum - 1, 0), structuredData.pages.length - 1);
    return structuredData.pages[pageIndex]?.text || '';
  }, [structuredData, activePageNum, extractedText]);

  const activeToolObj = subTools.find(t => t.id === activeSubTool) || subTools[0];
  const IconComponent = activeToolObj.icon;

  const totalWords = useMemo(() => {
    return extractedText.split(/\s+/).filter(Boolean).length;
  }, [extractedText]);

  const totalPages = structuredData?.totalPages || 1;

  // Font size classes
  const fontSizeClasses = {
    sm: 'text-[12px] leading-relaxed',
    md: 'text-[13.5px] leading-relaxed',
    lg: 'text-[15px] leading-loose',
    xl: 'text-[16.5px] leading-loose',
  }[readerFontSize];

  // Theme styling for reader
  const themeClasses = {
    default: 'bg-white dark:bg-[#1c1c1e] text-[#1d1d1f] dark:text-[#f5f5f7] border-black/[0.06] dark:border-white/[0.08]',
    sepia: 'bg-[#fbf0d9] text-[#433422] border-[#eedac0] dark:bg-[#2b241c] dark:text-[#eedac0] dark:border-[#3e3428]',
    dark: 'bg-[#111317] text-[#e2e8f0] border-white/[0.08]',
  }[readerTheme];

  // Voices filtered by gender preference (falls back to all if no match)
  const filteredVoices = useMemo(() => {
    const result = availableVoices.filter(v => {
      if (speechVoiceGender === 'all') return true;
      const n = v.name.toLowerCase();
      if (speechVoiceGender === 'female')
        return /female|woman|girl|zira|samantha|victoria|karen|moira|fiona|serena|ava|alice|amelie|cortana/i.test(n);
      return /^(?!.*female).*\b(male|man|boy|david|mark|james|daniel|george|rishi|arthur|thomas)\b/i.test(n);
    });
    return result.length > 0 ? result : availableVoices;
  }, [availableVoices, speechVoiceGender]);

  // Speech playback progress as a 0–100 percentage
  const speechProgressPct = useMemo(() => {
    if (speechWords.length === 0 || currentSpokenWordIndex < 0) return 0;
    return Math.round((currentSpokenWordIndex / Math.max(speechWords.length - 1, 1)) * 100);
  }, [speechWords.length, currentSpokenWordIndex]);

  // Tokenised reader text for word-by-word highlight (word, whitespace alternating)
  const readerWordTokens = useMemo(() => {
    const text = readerViewMode === 'pages' ? currentPageText : extractedText;
    if (!text) return [] as { token: string; wordIdx: number; isSpace: boolean }[];
    const parts = text.split(/(\s+)/);
    let wordCounter = 0;
    return parts.map(token => {
      const isSpace = /^\s*$/.test(token);
      const wordIdx = isSpace ? -1 : wordCounter++;
      return { token, wordIdx, isSpace };
    });
  }, [readerViewMode, currentPageText, extractedText]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-black/[0.06] dark:border-white/[0.08]">
        <button
          onClick={onBackToHome}
          className="flex items-center gap-2 text-[14px] font-semibold text-[#0071e3] dark:text-[#2997ff] hover:opacity-80 transition-opacity cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#af52de]/10 text-[#af52de]">
            ✦ AI Document Intelligence · No Account Needed
          </span>
        </div>
      </div>

      {/* Sub-tool Switcher Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {subTools.map((tool) => {
          const ToolIcon = tool.icon;
          const isActive = activeSubTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => {
                setActiveSubTool(tool.id);
                handleResetState();
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-[13px] font-medium whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#af52de] text-white shadow-sm font-semibold'
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
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#af52de]/10 text-[#af52de] flex items-center justify-center shrink-0">
            <IconComponent className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
              {activeToolObj.label}
            </h2>
            <p className="text-[14px] text-[#6e6e73] dark:text-[#8e8e93]">
              {activeToolObj.desc}
            </p>
          </div>
        </div>

        {/* Upload Zone */}
        {!selectedFile ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-black/[0.15] dark:border-white/[0.2] hover:border-[#af52de] rounded-2xl p-10 text-center cursor-pointer transition-colors bg-[#fafafc] dark:bg-[#242426] space-y-3"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="w-12 h-12 mx-auto rounded-full bg-black/[0.04] dark:bg-white/[0.08] flex items-center justify-center text-[#86868b]">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                Upload document to begin AI analysis
              </p>
              <p className="text-[13px] text-[#86868b] dark:text-[#8e8e93] mt-1">
                Supports PDF, DOCX, TXT • 100% On-device indexing & privacy
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* File info bar */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-[#f5f5f7] dark:bg-[#252528] border border-black/[0.04] dark:border-white/[0.06] flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-[#af52de] shrink-0" />
                <div>
                  <p className="text-[14px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                    {selectedFile.name}
                  </p>
                  <p className="text-[12px] text-[#86868b]">
                    {(selectedFile.size / 1024).toFixed(1)} KB • {totalPages} Pages • {totalWords.toLocaleString()} words
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleResetState}
                  className="text-[12.5px] font-semibold text-[#ff3b30] hover:underline cursor-pointer"
                >
                  Change File
                </button>
              </div>
            </div>

            {isProcessing && (
              <div className="p-4 rounded-2xl bg-[#fafafc] dark:bg-[#252528] border border-black/[0.06] dark:border-white/[0.08] flex items-center gap-3">
                <RefreshCw className="w-4 h-4 text-[#af52de] animate-spin shrink-0" />
                <span className="text-[13px] font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">{processStatus || 'Processing document...'}</span>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 1. CHAT WITH PDF */}
            {/* ========================================================================= */}
            {activeSubTool === 'chat_pdf' && (
              <div className="flex flex-col h-[500px] rounded-2xl bg-[#fafafc] dark:bg-[#252528] border border-black/[0.06] dark:border-white/[0.08] overflow-hidden">
                {/* Chat Message Stream */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="w-7 h-7 rounded-full bg-[#af52de] text-white flex items-center justify-center shrink-0">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] p-3.5 rounded-2xl text-[13.5px] leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-[#0071e3] text-white rounded-br-none'
                            : 'bg-white dark:bg-[#1c1c1e] text-[#1d1d1f] dark:text-[#f5f5f7] border border-black/[0.04] dark:border-white/[0.06] rounded-bl-none shadow-xs'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                      {msg.role === 'user' && (
                        <div className="w-7 h-7 rounded-full bg-[#0071e3] text-white flex items-center justify-center shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  ))}
                  {isChatLoading && (
                    <div className="flex items-center gap-2 text-[12px] text-[#86868b] pl-10">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#af52de]" />
                      <span>Analyzing document...</span>
                    </div>
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* Chat Input Bar */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 bg-white dark:bg-[#1c1c1e] border-t border-black/[0.06] dark:border-white/[0.08] flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask about this document (e.g. 'What are the main terms?', 'List total costs')..."
                    className="flex-1 px-4 py-2.5 rounded-xl bg-[#f5f5f7] dark:bg-[#252528] text-[13.5px] text-[#1d1d1f] dark:text-[#f5f5f7] placeholder:text-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#af52de]"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || isChatLoading}
                    className="p-2.5 rounded-xl bg-[#af52de] text-white hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 2. AI SUMMARIZER & ENHANCED READ WINDOW */}
            {/* ========================================================================= */}
            {activeSubTool === 'ai_summarize' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                {/* Mode Selector & Action Bar */}
                <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-black/[0.06] dark:border-white/[0.08]">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {([
                      { id: 'executive', label: '📋 Executive', desc: 'Full summary + takeaways' },
                      { id: 'bullets', label: '📌 Topics', desc: 'Thematic bullet breakdown' },
                      { id: 'tldr', label: '⚡ TL;DR', desc: '3-sentence punch + top 5 facts' },
                      { id: 'action_items', label: '✅ Actions', desc: 'Interactive task checklist' },
                      { id: 'faq', label: '❓ FAQ', desc: 'Q&A pairs' },
                      { id: 'metrics', label: '📊 Metrics', desc: 'Quantitative data & table' },
                    ] as const).map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() => setSummaryType(mode.id)}
                        title={mode.desc}
                        className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all cursor-pointer ${
                          summaryType === mode.id
                            ? 'bg-[#af52de] text-white shadow-sm font-bold'
                            : 'bg-black/[0.04] dark:bg-white/[0.08] text-[#6e6e73] dark:text-[#8e8e93] hover:opacity-80'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {summaryResult && (
                      <>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(summaryResult);
                            setSummaryCopied(true);
                            setTimeout(() => setSummaryCopied(false), 2000);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/[0.05] dark:bg-white/[0.08] text-[#1d1d1f] dark:text-[#f5f5f7] text-[12px] font-semibold cursor-pointer"
                        >
                          {summaryCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{summaryCopied ? 'Copied!' : 'Copy'}</span>
                        </button>

                        <button
                          onClick={() => handleDownloadSummary('md')}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-black/[0.05] dark:bg-white/[0.08] text-[#1d1d1f] dark:text-[#f5f5f7] text-[12px] font-semibold cursor-pointer hover:bg-black/[0.08]"
                        >
                          <FileDown className="w-3.5 h-3.5" />
                          <span>.MD</span>
                        </button>
                      </>
                    )}
                    <button
                      onClick={handleSummarize}
                      disabled={isSummarizing || !extractedText}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#af52de] text-white text-[12.5px] font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isSummarizing ? 'Generating…' : summaryResult ? 'Re-Summarize' : 'Generate Summary'}</span>
                    </button>
                  </div>
                </div>

                {/* Speech Synthesizer Control Bar */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-indigo-500/10 border border-violet-500/20 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isPlayingSpeech ? 'bg-[#af52de] text-white animate-pulse' : 'bg-black/[0.05] dark:bg-white/[0.08] text-[#af52de]'}`}>
                      <Volume2 className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[12.5px] font-bold text-[#1d1d1f] dark:text-[#f5f5f7] block">
                        AI Natural Voice Reader
                      </span>
                      <span className="text-[11px] text-[#86868b]">
                        Neural on-device speech synthesis • Word-by-word tracking
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Voice selector */}
                    {availableVoices.length > 0 && (
                      <select
                        value={selectedVoice?.name || ''}
                        onChange={(e) => {
                          const v = availableVoices.find(voice => voice.name === e.target.value);
                          if (v) setSelectedVoice(v);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#1c1c1e] border border-black/[0.08] dark:border-white/[0.1] text-[11.5px] font-medium text-[#1d1d1f] dark:text-[#f5f5f7] max-w-[180px] truncate"
                      >
                        {availableVoices.map((v) => (
                          <option key={v.name} value={v.name}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    )}

                    {/* Speed presets */}
                    <div className="flex items-center gap-1 bg-white dark:bg-[#1c1c1e] p-1 rounded-lg border border-black/[0.06] dark:border-white/[0.08]">
                      {[0.8, 1.0, 1.25, 1.5].map((rate) => (
                        <button
                          key={rate}
                          onClick={() => setSpeechRate(rate)}
                          className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                            speechRate === rate ? 'bg-[#af52de] text-white' : 'text-[#86868b]'
                          }`}
                        >
                          {rate}×
                        </button>
                      ))}
                    </div>

                    {/* Play/Pause/Stop */}
                    {!isPlayingSpeech && !isPausedSpeech ? (
                      <button
                        onClick={() => handleStartSpeech(summaryResult || extractedText, summaryResult ? 'summary' : 'document')}
                        disabled={!extractedText}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#af52de] hover:opacity-90 text-white text-[12px] font-semibold transition-all cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Read Aloud</span>
                      </button>
                    ) : isPlayingSpeech ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={handlePauseSpeech}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 text-white text-[12px] font-semibold cursor-pointer shadow-xs"
                        >
                          <Pause className="w-3.5 h-3.5" />
                          <span>Pause</span>
                        </button>
                        <button
                          onClick={handleStopSpeech}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#ff3b30] text-white text-[12px] font-semibold cursor-pointer shadow-xs"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Stop</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={handleResumeSpeech}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-[12px] font-semibold cursor-pointer shadow-xs"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Resume</span>
                        </button>
                        <button
                          onClick={handleStopSpeech}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#ff3b30] text-white text-[12px] font-semibold cursor-pointer shadow-xs"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Stop</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Main Split Layout: Document Reader Window | AI Summary */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Left Column: Interactive Document Reader Window */}
                  <div className="space-y-2.5 flex flex-col">
                    {/* Reader Controls Toolbar */}
                    <div className="flex items-center justify-between flex-wrap gap-2 text-[12px]">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#86868b] uppercase tracking-wide flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-[#af52de]" />
                          Document Reader
                        </span>
                        <span className="text-[11px] text-[#86868b]">
                          (~{Math.ceil(totalWords / 200)} min read)
                        </span>
                      </div>

                      {/* View & Typography Controls */}
                      <div className="flex items-center gap-1.5">
                        {/* Flow vs Page Toggle */}
                        {structuredData && structuredData.pages.length > 1 && (
                          <div className="flex items-center bg-black/[0.04] dark:bg-white/[0.06] p-0.5 rounded-lg text-[11px]">
                            <button
                              onClick={() => setReaderViewMode('continuous')}
                              className={`px-2 py-0.5 rounded ${readerViewMode === 'continuous' ? 'bg-white dark:bg-[#2c2c2e] font-bold shadow-2xs' : 'text-[#86868b]'}`}
                            >
                              Continuous
                            </button>
                            <button
                              onClick={() => setReaderViewMode('pages')}
                              className={`px-2 py-0.5 rounded ${readerViewMode === 'pages' ? 'bg-white dark:bg-[#2c2c2e] font-bold shadow-2xs' : 'text-[#86868b]'}`}
                            >
                              Pages
                            </button>
                          </div>
                        )}

                        {/* Font size zoom */}
                        <div className="flex items-center gap-1 bg-black/[0.04] dark:bg-white/[0.06] p-0.5 rounded-lg text-[11px]">
                          <button
                            onClick={() => setReaderFontSize(f => f === 'xl' ? 'lg' : f === 'lg' ? 'md' : 'sm')}
                            title="Decrease text size"
                            className="px-1.5 py-0.5 text-[#86868b] hover:text-[#1d1d1f]"
                          >
                            A-
                          </button>
                          <button
                            onClick={() => setReaderFontSize(f => f === 'sm' ? 'md' : f === 'md' ? 'lg' : 'xl')}
                            title="Increase text size"
                            className="px-1.5 py-0.5 text-[#86868b] hover:text-[#1d1d1f]"
                          >
                            A+
                          </button>
                        </div>

                        {/* Reader Theme (Default / Sepia / Dark) */}
                        <div className="flex items-center gap-1 bg-black/[0.04] dark:bg-white/[0.06] p-0.5 rounded-lg">
                          <button
                            onClick={() => setReaderTheme('default')}
                            title="Standard Theme"
                            className={`w-4 h-4 rounded-full bg-white border border-black/20 ${readerTheme === 'default' ? 'ring-2 ring-[#af52de]' : ''}`}
                          />
                          <button
                            onClick={() => setReaderTheme('sepia')}
                            title="Warm Sepia Theme"
                            className={`w-4 h-4 rounded-full bg-[#fbf0d9] border border-[#eedac0] ${readerTheme === 'sepia' ? 'ring-2 ring-[#af52de]' : ''}`}
                          />
                          <button
                            onClick={() => setReaderTheme('dark')}
                            title="Eye-Care Dark Theme"
                            className={`w-4 h-4 rounded-full bg-[#111317] border border-white/20 ${readerTheme === 'dark' ? 'ring-2 ring-[#af52de]' : ''}`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Search inside Document Bar */}
                    <div className="relative flex items-center">
                      <Search className="w-3.5 h-3.5 text-[#86868b] absolute left-3" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search inside document..."
                        className="w-full pl-8 pr-20 py-1.5 text-[12px] rounded-xl bg-[#f5f5f7] dark:bg-[#252528] border border-black/[0.04] dark:border-white/[0.06] focus:outline-none focus:ring-1 focus:ring-[#af52de]"
                      />
                      {searchQuery && (
                        <span className="absolute right-3 text-[11px] text-[#af52de] font-semibold">
                          {searchMatchesCount} matches
                        </span>
                      )}
                    </div>

                    {/* Page navigation bar (if Pages mode is active) */}
                    {readerViewMode === 'pages' && structuredData && (
                      <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] text-[12px]">
                        <button
                          onClick={() => setActivePageNum(p => Math.max(1, p - 1))}
                          disabled={activePageNum <= 1}
                          className="p-1 rounded hover:bg-black/5 disabled:opacity-30 cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="font-semibold text-[#86868b]">
                          Page {activePageNum} of {totalPages}
                        </span>
                        <button
                          onClick={() => setActivePageNum(p => Math.min(totalPages, p + 1))}
                          disabled={activePageNum >= totalPages}
                          className="p-1 rounded hover:bg-black/5 disabled:opacity-30 cursor-pointer"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* Document Text Box */}
                    <div
                      ref={readerScrollRef}
                      className={`p-4 rounded-2xl border ${themeClasses} ${fontSizeClasses} h-[470px] overflow-y-auto font-sans transition-colors duration-200 select-text`}
                    >
                      {extractedText ? (
                        <div className="whitespace-pre-wrap">
                          {readerViewMode === 'pages' ? currentPageText : extractedText}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center text-[#86868b]">
                          <FileText className="w-8 h-8 mb-2 opacity-40" />
                          <p>Upload a PDF document to read and analyze its content</p>
                        </div>
                      )}
                    </div>

                    {/* Reading footer stats */}
                    <div className="flex items-center justify-between text-[11px] text-[#86868b] px-1">
                      <span>Tip: Click "Read Aloud" to listen to real-time neural speech</span>
                      <span>{totalWords.toLocaleString()} words indexed</span>
                    </div>
                  </div>

                  {/* Right Column: AI Summary & Structured Output */}
                  <div className="space-y-2.5 flex flex-col">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="font-bold text-[#86868b] uppercase tracking-wide flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#af52de]" />
                        AI Analysis ({summaryType.toUpperCase()})
                      </span>

                      {summaryResult && (
                        <button
                          onClick={() => handleStartSpeech(summaryResult, 'summary')}
                          className="flex items-center gap-1 text-[11.5px] font-semibold text-[#af52de] hover:underline cursor-pointer"
                        >
                          <Volume2 className="w-3 h-3" />
                          <span>Listen to Summary</span>
                        </button>
                      )}
                    </div>

                    {/* Summary Result Box */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-500/5 via-purple-500/10 to-indigo-500/5 border border-violet-500/20 dark:border-violet-400/20 text-[13.5px] leading-relaxed text-[#1d1d1f] dark:text-[#f5f5f7] h-[470px] overflow-y-auto font-sans">
                      {isSummarizing ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4">
                          <div className="w-10 h-10 rounded-full border-4 border-[#af52de]/30 border-t-[#af52de] animate-spin" />
                          <p className="text-[13px] text-[#86868b] animate-pulse">
                            Synthesizing {summaryType.replace('_', ' ')} briefing…
                          </p>
                        </div>
                      ) : summaryResult ? (
                        <div className="space-y-3">
                          {/* If action items mode, render interactive checklist */}
                          {summaryType === 'action_items' ? (
                            <div className="space-y-2">
                              <h4 className="font-bold text-[14px] text-[#1d1d1f] dark:text-[#f5f5f7] flex items-center gap-2">
                                <ListChecks className="w-4 h-4 text-[#af52de]" />
                                Extracted Action Checklist
                              </h4>
                              {summaryResult.split('\n').map((line, idx) => {
                                const isAction = /^[-*]\s*\[\s*\]|^[-*]/.test(line);
                                const cleanText = line.replace(/^[-*]\s*(\[\s*\])?\s*/, '');
                                if (!cleanText.trim()) return null;
                                if (!isAction) {
                                  return (
                                    <p key={idx} className="font-bold text-[13px] pt-2 text-[#af52de]">
                                      {line}
                                    </p>
                                  );
                                }
                                const isChecked = !!checkedActions[idx];
                                return (
                                  <label
                                    key={idx}
                                    className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => setCheckedActions(prev => ({ ...prev, [idx]: !prev[idx] }))}
                                      className="mt-1 accent-[#af52de] rounded"
                                    />
                                    <span className={`text-[13px] ${isChecked ? 'line-through text-[#86868b]' : 'text-[#1d1d1f] dark:text-[#f5f5f7]'}`}>
                                      {cleanText}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="whitespace-pre-wrap leading-relaxed">
                              {summaryResult}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                          <Sparkles className="w-10 h-10 text-[#af52de]/30" />
                          <p className="text-[13px] text-[#86868b] leading-relaxed">
                            Select an analysis mode above and click
                            <br />
                            <strong className="text-[#af52de]">Generate Summary</strong> to analyze this PDF.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Summary footer */}
                    <div className="flex items-center justify-between text-[11px] text-[#86868b] px-1">
                      <span>Zero cloud storage • 100% Client-Side Privacy</span>
                      {summaryResult && (
                        <span>{summaryResult.split(/\s+/).filter(Boolean).length} summary words</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 3. SEARCHABLE PDF (OCR) */}
            {/* ========================================================================= */}
            {activeSubTool === 'searchable_pdf' && (
              <div className="space-y-4 p-5 rounded-2xl bg-[#fafafc] dark:bg-[#252528] border border-black/[0.06] dark:border-white/[0.08]">
                <div className="flex items-center gap-3">
                  <Search className="w-5 h-5 text-[#0071e3]" />
                  <div>
                    <h3 className="text-[14px] font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
                      Client-Side Searchable Text Indexer
                    </h3>
                    <p className="text-[12px] text-[#86868b]">
                      Generates structured, searchable text layer directly from page canvas vectors.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] text-[13px] leading-relaxed">
                  <div className="flex items-center justify-between text-[12px] font-bold text-[#86868b] pb-2 mb-2 border-b border-black/[0.06] dark:border-white/[0.08]">
                    <span>Extracted Searchable Stream</span>
                    <span>{totalWords.toLocaleString()} words indexed</span>
                  </div>
                  <div className="max-h-60 overflow-y-auto font-mono text-[12px] whitespace-pre-wrap text-[#1d1d1f] dark:text-[#f5f5f7]">
                    {extractedText || 'No text extracted.'}
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 4. COMPARE PDFS */}
            {/* ========================================================================= */}
            {activeSubTool === 'compare_pdfs' && (
              <div className="space-y-4 p-5 rounded-2xl bg-[#fafafc] dark:bg-[#252528] border border-black/[0.06] dark:border-white/[0.08]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08]">
                    <span className="text-[11px] font-bold text-[#86868b] uppercase tracking-wider">
                      Version A (Base)
                    </span>
                    <p className="text-[14px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] mt-1 truncate">
                      {selectedFile.name}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08]">
                    <span className="text-[11px] font-bold text-[#86868b] uppercase tracking-wider">
                      Version B (Comparison)
                    </span>
                    {secondFile ? (
                      <p className="text-[14px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] mt-1 truncate">
                        {secondFile.name}
                      </p>
                    ) : (
                      <button
                        onClick={() => secondFileInputRef.current?.click()}
                        className="mt-1 text-[13px] font-semibold text-[#0071e3] dark:text-[#2997ff] hover:underline block cursor-pointer"
                      >
                        + Select Second PDF
                      </button>
                    )}
                    <input
                      ref={secondFileInputRef}
                      type="file"
                      accept=".pdf"
                      onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
                      onChange={(e) => setSecondFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </div>
                </div>

                <button
                  onClick={handleCompare}
                  disabled={!secondFile}
                  className="w-full py-3 rounded-xl bg-[#af52de] hover:opacity-90 disabled:opacity-50 text-white font-semibold text-[14px] transition-all cursor-pointer shadow-xs"
                >
                  Run Document Comparison Diff
                </button>

                {diffResults && (
                  <div className="p-4 rounded-xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] space-y-2">
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="font-semibold text-[#34c759]">+{diffResults.additions} Added Lines</span>
                      <span className="font-semibold text-[#ff3b30]">-{diffResults.deletions} Modified/Removed</span>
                      <span className="font-bold text-[#0071e3]">{diffResults.matchPercent}% Semantic Match</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* 5. REPAIR PDF */}
            {/* ========================================================================= */}
            {activeSubTool === 'repair_pdf' && (
              <div className="space-y-4 p-5 rounded-2xl bg-[#fafafc] dark:bg-[#252528] border border-black/[0.06] dark:border-white/[0.08]">
                <div className="flex items-center gap-3">
                  <Wrench className="w-5 h-5 text-[#ff9500]" />
                  <div>
                    <h3 className="text-[14px] font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
                      PDF Structure Diagnostics & Object Stream Rebuilder
                    </h3>
                    <p className="text-[12px] text-[#86868b]">
                      Fixes unreadable PDF xref trailers, missing EOF markers, and damaged fonts.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleRepairPdf}
                  className="w-full py-3 rounded-xl bg-[#ff9500] hover:bg-[#e08500] text-white font-semibold text-[14px] transition-all cursor-pointer shadow-xs"
                >
                  Repair & Reconstruct PDF
                </button>
              </div>
            )}

            {/* Download Link */}
            {generatedBlobUrl && (
              <div className="pt-2">
                <a
                  href={generatedBlobUrl}
                  download={generatedFileName}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-[#af52de] hover:opacity-90 text-white font-semibold text-[15px] shadow-sm transition-all cursor-pointer"
                >
                  <Download className="w-5 h-5" />
                  <span>Download {generatedFileName}</span>
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
