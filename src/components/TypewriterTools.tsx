import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ToolMode, FileCategory } from '../types';

export interface TypewriterToolItem {
  phrase: string;
  toolId: ToolMode;
  targetCategory?: FileCategory;
  category: 'Essentials' | 'Conversion' | 'Security' | 'AI & OCR' | 'Collaboration' | 'Business';
}

/**
 * Curated list of verified, working tools currently available in ZipStream.
 * Organized by category to ensure comprehensive showcase without inventing missing features.
 */
export const TYPEWRITER_TOOLS: TypewriterToolItem[] = [
  // 1. PDF Essentials
  { phrase: 'Compress PDFs', toolId: 'compress', targetCategory: 'pdf', category: 'Essentials' },
  { phrase: 'Merge PDFs', toolId: 'merge_pdf', targetCategory: 'pdf', category: 'Essentials' },
  { phrase: 'Split PDFs', toolId: 'split_pdf', targetCategory: 'pdf', category: 'Essentials' },
  { phrase: 'Repair Corrupted PDFs', toolId: 'repair_pdf', targetCategory: 'pdf', category: 'Essentials' },
  { phrase: 'Compare Two PDFs', toolId: 'compare_pdfs', targetCategory: 'pdf', category: 'Essentials' },

  // 2. Conversion
  { phrase: 'Convert PDFs to Word', toolId: 'pdf_to_word', targetCategory: 'pdf', category: 'Conversion' },
  { phrase: 'Convert PDFs to Excel', toolId: 'pdf_to_excel', targetCategory: 'pdf', category: 'Conversion' },
  { phrase: 'Convert PDFs to PowerPoint', toolId: 'pdf_to_powerpoint', targetCategory: 'pdf', category: 'Conversion' },
  { phrase: 'Convert PDFs to JPG', toolId: 'pdf_to_jpg', targetCategory: 'pdf', category: 'Conversion' },
  { phrase: 'Convert Images to PDF', toolId: 'images_to_pdf', targetCategory: 'image', category: 'Conversion' },
  { phrase: 'Extract Text from PDFs', toolId: 'extract_text', targetCategory: 'pdf', category: 'Conversion' },

  // 3. Security & Privacy
  { phrase: 'Protect PDFs with Passwords', toolId: 'encrypt_pdf', targetCategory: 'pdf', category: 'Security' },
  { phrase: 'Unlock Encrypted PDFs', toolId: 'unlock_pdf', targetCategory: 'pdf', category: 'Security' },
  { phrase: 'Watermark PDFs', toolId: 'watermark_pdf', targetCategory: 'pdf', category: 'Security' },
  { phrase: 'Redact Sensitive Information', toolId: 'auto_redact_pii', targetCategory: 'pdf', category: 'Security' },
  { phrase: 'Strip Hidden Metadata', toolId: 'privacy_scanner', targetCategory: 'pdf', category: 'Security' },

  // 4. Document Intelligence
  { phrase: 'OCR Scanned Documents', toolId: 'searchable_pdf', targetCategory: 'pdf', category: 'AI & OCR' },
  { phrase: 'Summarize Documents with AI', toolId: 'ai_summarize', targetCategory: 'pdf', category: 'AI & OCR' },
  { phrase: 'Chat Directly with PDFs', toolId: 'chat_pdf', targetCategory: 'pdf', category: 'AI & OCR' },

  // 5. File & Collaboration Tools
  { phrase: 'Share Files Privately (P2P)', toolId: 'p2p_share', category: 'Collaboration' },
  { phrase: 'Collaborate in Real Time', toolId: 'collab_whiteboard', category: 'Collaboration' },

  // 6. Business Tools
  { phrase: 'Generate Professional Invoices', toolId: 'gst_invoice', category: 'Business' },
  { phrase: 'Scan Documents with Camera', toolId: 'scan_document', category: 'Business' },
];

export interface TypewriterToolsProps {
  onSelectTool?: (tool: ToolMode, targetCategory?: FileCategory) => void;
  className?: string;
  typingSpeed?: number;
  deletingSpeed?: number;
  pauseAfterComplete?: number;
  pauseBeforeNext?: number;
}

export const TypewriterTools: React.FC<TypewriterToolsProps> = ({
  onSelectTool,
  className = '',
  typingSpeed = 70,
  deletingSpeed = 38,
  pauseAfterComplete = 1800,
  pauseBeforeNext = 380,
}) => {
  const [toolIndex, setToolIndex] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const currentTool = TYPEWRITER_TOOLS[toolIndex];
  const fullText = currentTool.phrase;
  const displayedText = useMemo(() => fullText.slice(0, charCount), [fullText, charCount]);

  // Check for reduced motion preference
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const listener = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    } else {
      mediaQuery.addListener(listener);
      return () => mediaQuery.removeListener(listener);
    }
  }, []);

  // Main typewriter animation timer
  useEffect(() => {
    // If reduced motion is preferred, rotate slowly without char-by-char animation
    if (prefersReducedMotion) {
      const timer = setTimeout(() => {
        setToolIndex((prev) => (prev + 1) % TYPEWRITER_TOOLS.length);
      }, 4000);
      return () => clearTimeout(timer);
    }

    if (isPaused) return;

    let timeoutId: NodeJS.Timeout;

    if (!isDeleting) {
      // Typing phase
      if (charCount < fullText.length) {
        timeoutId = setTimeout(() => {
          setCharCount((prev) => prev + 1);
        }, typingSpeed);
      } else {
        // Finished typing full phrase, pause before deleting
        timeoutId = setTimeout(() => {
          setIsDeleting(true);
        }, pauseAfterComplete);
      }
    } else {
      // Deleting phase
      if (charCount > 0) {
        timeoutId = setTimeout(() => {
          setCharCount((prev) => prev - 1);
        }, deletingSpeed);
      } else {
        // Finished deleting, move to next tool phrase
        timeoutId = setTimeout(() => {
          setIsDeleting(false);
          setToolIndex((prev) => (prev + 1) % TYPEWRITER_TOOLS.length);
        }, pauseBeforeNext);
      }
    }

    return () => clearTimeout(timeoutId);
  }, [
    charCount,
    isDeleting,
    isPaused,
    fullText,
    prefersReducedMotion,
    typingSpeed,
    deletingSpeed,
    pauseAfterComplete,
    pauseBeforeNext,
  ]);

  const handleClick = useCallback(() => {
    if (onSelectTool && currentTool) {
      onSelectTool(currentTool.toolId, currentTool.targetCategory);
    }
  }, [onSelectTool, currentTool]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    },
    [handleClick]
  );

  return (
    <span
      className={`inline-flex items-center justify-center relative cursor-pointer group transition-transform ${className}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role={onSelectTool ? 'button' : undefined}
      tabIndex={onSelectTool ? 0 : undefined}
      title={onSelectTool ? `Click to launch ${currentTool.phrase}` : undefined}
      aria-label={`Featured tool: ${currentTool.phrase}`}
    >
      {/* Screen reader only announcement for accessible SEO discovery */}
      <span className="sr-only">
        Featured ZipStream document capability: {currentTool.phrase}. We offer complete tools to compress, merge, split, convert to Word, Excel, and JPG, encrypt, OCR, and collaborate.
      </span>

      {/* Visible animated text */}
      <span
        className="font-extrabold tracking-tight text-[#055EFE] dark:text-[#528BFF] border-b-2 border-transparent group-hover:border-[#055EFE]/40 transition-colors"
        aria-hidden="true"
      >
        {prefersReducedMotion ? fullText : displayedText}
      </span>

      {/* Smooth blinking cursor (hidden when reduced motion is preferred) */}
      {!prefersReducedMotion && (
        <span
          className="inline-block w-[3px] sm:w-[4px] h-[0.85em] ml-1 bg-[#055EFE] dark:bg-[#528BFF] rounded-xs animate-typewriter-cursor select-none align-middle"
          aria-hidden="true"
        />
      )}
    </span>
  );
};
