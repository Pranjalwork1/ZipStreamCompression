/**
 * ZipStream AI Utilities
 * Provides input validation, text chunking, language code validation,
 * error sanitization, and structured data validation for the Sarvam AI integration.
 */

export const SUPPORTED_LANGUAGES = [
  { code: 'en-IN', name: 'English (India)', native: 'English' },
  { code: 'hi-IN', name: 'Hindi', native: 'हिन्दी' },
  { code: 'bn-IN', name: 'Bengali', native: 'বাংলা' },
  { code: 'ta-IN', name: 'Tamil', native: 'தமிழ்' },
  { code: 'te-IN', name: 'Telugu', native: 'తెలుగు' },
  { code: 'mr-IN', name: 'Marathi', native: 'मराठी' },
  { code: 'gu-IN', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'kn-IN', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml-IN', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'pa-IN', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'od-IN', name: 'Odia', native: 'ଓଡ଼ିଆ' },
  { code: 'ur-IN', name: 'Urdu', native: 'اردو' },
] as const;

export type SupportedLanguageCode = typeof SUPPORTED_LANGUAGES[number]['code'];

export const VALID_LANGUAGE_CODES: Set<string> = new Set(
  SUPPORTED_LANGUAGES.map(l => l.code)
);

export const DEFAULT_LIMITS = {
  MAX_DOCUMENT_CHARS: 50_000,
  MAX_CHAT_CHARS: 12_000,
  MAX_TTS_CHARS: 2_200,
  MAX_TRANSLATE_CHUNK_CHARS: 1_800,
  MAX_KEYTERMS: 50,
  MAX_KEYTERM_LENGTH: 64,
};

export function getMaxDocumentChars(): number {
  const envVal = Number(process.env.SARVAM_MAX_DOCUMENT_CHARS);
  return Number.isFinite(envVal) && envVal > 0 ? envVal : DEFAULT_LIMITS.MAX_DOCUMENT_CHARS;
}

export function getMaxChatChars(): number {
  const envVal = Number(process.env.SARVAM_MAX_CHAT_CHARS);
  return Number.isFinite(envVal) && envVal > 0 ? envVal : DEFAULT_LIMITS.MAX_CHAT_CHARS;
}

export function getMaxTtsChars(): number {
  const envVal = Number(process.env.SARVAM_MAX_TTS_CHARS);
  return Number.isFinite(envVal) && envVal > 0 ? envVal : DEFAULT_LIMITS.MAX_TTS_CHARS;
}

/**
 * Validates whether the given language code is supported.
 */
export function isValidLanguageCode(code: unknown): code is SupportedLanguageCode {
  return typeof code === 'string' && VALID_LANGUAGE_CODES.has(code);
}

/**
 * Normalizes input language code, falling back to default en-IN.
 */
export function normalizeLanguageCode(code: unknown, fallback: SupportedLanguageCode = 'en-IN'): SupportedLanguageCode {
  if (isValidLanguageCode(code)) return code;
  const defaultEnv = process.env.SARVAM_DEFAULT_LANGUAGE;
  if (isValidLanguageCode(defaultEnv)) return defaultEnv;
  return fallback;
}

/**
 * Splits text into sentences using standard punctuation while respecting abbreviations.
 */
export function splitSentences(text: string): string[] {
  if (!text || typeof text !== 'string') return [];
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!normalized) return [];

  // Match sentences ending in punctuation or multiple newlines
  const matches = normalized.match(/[^.!?\n]+(?:[.!?]+|\n+|$)/g);
  if (!matches) return [normalized];

  return matches
    .map(s => s.trim())
    .filter(Boolean);
}

/**
 * Chunks text while preserving sentence boundaries up to maxChars per chunk.
 * If a single sentence exceeds maxChars, it hard-splits cleanly on word boundaries.
 */
export function chunkText(text: string, maxChars: number): string[] {
  if (!text || typeof text !== 'string') return [];
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.length <= maxChars) return [trimmed];

  const sentences = splitSentences(trimmed);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if (sentence.length > maxChars) {
      // Flush any accumulated text
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      // Hard-split this long sentence by words
      const words = sentence.split(/\s+/);
      let wordChunk = '';
      for (const word of words) {
        if ((wordChunk + ' ' + word).trim().length > maxChars) {
          if (wordChunk.trim()) chunks.push(wordChunk.trim());
          wordChunk = word;
        } else {
          wordChunk = wordChunk ? `${wordChunk} ${word}` : word;
        }
      }
      if (wordChunk.trim()) currentChunk = wordChunk.trim();
    } else if ((currentChunk + ' ' + sentence).trim().length > maxChars) {
      if (currentChunk.trim()) chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Extracts and filters domain-specific terms (keyterms) from document text or custom terms.
 * Up to 50 items, each max 64 characters.
 */
export function extractKeyterms(text: string, customTerms: string[] = []): string[] {
  const result = new Set<string>();

  // Add custom terms first
  for (const term of customTerms) {
    if (typeof term === 'string') {
      const clean = term.trim().slice(0, DEFAULT_LIMITS.MAX_KEYTERM_LENGTH);
      if (clean && result.size < DEFAULT_LIMITS.MAX_KEYTERMS) {
        result.add(clean);
      }
    }
  }

  if (result.size >= DEFAULT_LIMITS.MAX_KEYTERMS || !text) {
    return Array.from(result);
  }

  // Common business / legal patterns
  const patterns = [
    /\b(?:GSTIN|GSTR-1|GSTR-3B|PAN|TAN|CIN|IFSC|NEFT|RTGS|IMPS)\b/g,
    /\b(?:Section\s+\d+[A-Z]?)\b/gi,
    /\b(?:Clause\s+\d+(?:\.\d+)?)\b/gi,
    /\b(?:HDFC|SBI|ICICI|Axis|Kotak|PNB|Bank\s+of\s+[A-Za-z]+)\b/gi,
    /\b(?:Rupees|INR|USD|EUR)\b/gi,
  ];

  for (const regex of patterns) {
    const matches = text.match(regex) || [];
    for (const match of matches) {
      const clean = match.trim().slice(0, DEFAULT_LIMITS.MAX_KEYTERM_LENGTH);
      if (clean) result.add(clean);
      if (result.size >= DEFAULT_LIMITS.MAX_KEYTERMS) break;
    }
    if (result.size >= DEFAULT_LIMITS.MAX_KEYTERMS) break;
  }

  return Array.from(result);
}

/**
 * Map error objects or status codes to controlled, safe user-facing error messages.
 * Never leaks API keys, raw tracebacks, or proprietary headers.
 */
export function mapAiError(error: any): { status: number; message: string } {
  const status = error?.status || error?.statusCode || error?.response?.status;
  const msg = String(error?.message || '').toLowerCase();

  if (status === 401 || status === 403 || msg.includes('403') || msg.includes('unauthorized') || msg.includes('forbidden') || msg.includes('authentication')) {
    return { status: 403, message: 'AI authentication is temporarily unavailable.' };
  }
  if (status === 400 || msg.includes('bad request') || msg.includes('invalid argument')) {
    return { status: 400, message: 'Invalid AI request.' };
  }
  if (status === 413 || msg.includes('too large') || msg.includes('payload too large') || msg.includes('request entity too large')) {
    return { status: 413, message: 'AI request is too large.' };
  }
  if (status === 422 || msg.includes('unprocessable') || msg.includes('validation')) {
    return { status: 422, message: 'AI input could not be processed.' };
  }
  if (status === 429 || msg.includes('rate limit') || msg.includes('too many requests')) {
    return { status: 429, message: 'AI request limit reached. Please try again shortly.' };
  }
  if (msg.includes('timeout') || msg.includes('timed out') || error?.code === 'ETIMEDOUT' || error?.code === 'ECONNABORTED') {
    return { status: 408, message: 'AI request timed out. Please try again.' };
  }
  if (status === 500 || status === 502 || status === 503 || status === 504 || msg.includes('unavailable') || msg.includes('gateway')) {
    return { status: 503, message: 'AI service is temporarily unavailable.' };
  }

  return { status: 500, message: 'AI service is temporarily unavailable.' };
}

export interface DocumentInsights {
  dates: string[];
  amounts: string[];
  people: string[];
  organizations: string[];
  actionItems: string[];
  warnings: string[];
  clauses: string[];
  contacts: string[];
}

/**
 * Validates and normalizes parsed JSON object into the strict DocumentInsights contract.
 */
export function validateDocumentInsights(data: any): DocumentInsights | null {
  if (!data || typeof data !== 'object') return null;

  const toStringArray = (val: any): string[] => {
    if (!Array.isArray(val)) return [];
    return val
      .map(item => typeof item === 'string' ? item.trim() : (item && typeof item === 'object' ? JSON.stringify(item) : ''))
      .filter(Boolean)
      .slice(0, 50);
  };

  return {
    dates: toStringArray(data.dates),
    amounts: toStringArray(data.amounts),
    people: toStringArray(data.people),
    organizations: toStringArray(data.organizations),
    actionItems: toStringArray(data.actionItems || data.action_items),
    warnings: toStringArray(data.warnings),
    clauses: toStringArray(data.clauses),
    contacts: toStringArray(data.contacts),
  };
}
