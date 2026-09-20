import { describe, it, expect } from 'vitest';
import {
  splitSentences,
  chunkText,
  isValidLanguageCode,
  normalizeLanguageCode,
  extractKeyterms,
  mapAiError,
  validateDocumentInsights,
} from '../aiUtils';

describe('aiUtils text chunking and sentence boundary preservation', () => {
  it('should split text into sentences', () => {
    const text = 'This is the first sentence. Here is the second sentence! And a third one? Yes.';
    const sentences = splitSentences(text);
    expect(sentences.length).toBe(4);
    expect(sentences[0]).toContain('first sentence');
  });

  it('should chunk text respecting max characters and sentence boundaries', () => {
    const s1 = 'Sentence one is relatively short.';
    const s2 = 'Sentence two provides further relevant context for testing.';
    const s3 = 'Sentence three concludes the paragraph cleanly.';
    const text = `${s1} ${s2} ${s3}`;

    const chunks = chunkText(text, 60);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(60);
    }
    // Preserves order and content
    expect(chunks.join(' ')).toContain(s1);
    expect(chunks.join(' ')).toContain(s2);
    expect(chunks.join(' ')).toContain(s3);
  });

  it('should hard-split a single sentence exceeding the chunk limit without dropping words', () => {
    const longSentence = 'word '.repeat(50).trim();
    const chunks = chunkText(longSentence, 40);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(40);
    }
    const reassembled = chunks.join(' ');
    expect(reassembled.replace(/\s+/g, ' ')).toBe(longSentence);
  });

  it('should safely return empty array for empty inputs', () => {
    expect(chunkText('', 500)).toEqual([]);
    expect(chunkText('   ', 500)).toEqual([]);
  });
});

describe('aiUtils language validation', () => {
  it('should recognize valid Indian language codes', () => {
    expect(isValidLanguageCode('en-IN')).toBe(true);
    expect(isValidLanguageCode('hi-IN')).toBe(true);
    expect(isValidLanguageCode('ta-IN')).toBe(true);
    expect(isValidLanguageCode('te-IN')).toBe(true);
    expect(isValidLanguageCode('bn-IN')).toBe(true);
    expect(isValidLanguageCode('mr-IN')).toBe(true);
  });

  it('should reject invalid or unsupported language codes', () => {
    expect(isValidLanguageCode('fr-FR')).toBe(false);
    expect(isValidLanguageCode('invalid')).toBe(false);
    expect(isValidLanguageCode('')).toBe(false);
    expect(isValidLanguageCode(null)).toBe(false);
  });

  it('should normalize invalid codes to default fallback', () => {
    expect(normalizeLanguageCode('invalid', 'en-IN')).toBe('en-IN');
    expect(normalizeLanguageCode('hi-IN')).toBe('hi-IN');
  });
});

describe('aiUtils STT keyterms extraction', () => {
  it('should extract tax, bank, and legal terms up to 50 items', () => {
    const text = 'Please review GSTIN 27AAAAA0000A1Z5 under Section 12 for HDFC and SBI transactions in Rupees.';
    const keyterms = extractKeyterms(text, ['CustomTerm1']);

    expect(keyterms).toContain('CustomTerm1');
    expect(keyterms.some(t => t.includes('Section 12'))).toBe(true);
    expect(keyterms.some(t => t.includes('HDFC') || t.includes('SBI'))).toBe(true);
    expect(keyterms.length).toBeLessThanOrEqual(50);
  });

  it('should truncate keyterm strings to 64 characters max', () => {
    const overlyLong = 'A'.repeat(100);
    const keyterms = extractKeyterms('', [overlyLong]);
    expect(keyterms[0].length).toBeLessThanOrEqual(64);
  });
});

describe('aiUtils error mapping', () => {
  it('should map 403 or authentication errors without leaking secrets', () => {
    const mapped = mapAiError({ status: 403, message: 'Forbidden' });
    expect(mapped.status).toBe(403);
    expect(mapped.message).toBe('AI authentication is temporarily unavailable.');
  });

  it('should map 429 rate limit errors to user-friendly messages', () => {
    const mapped = mapAiError({ status: 429, message: 'Too many requests' });
    expect(mapped.status).toBe(429);
    expect(mapped.message).toBe('AI request limit reached. Please try again shortly.');
  });

  it('should map timeouts cleanly', () => {
    const mapped = mapAiError({ code: 'ETIMEDOUT', message: 'connection timed out' });
    expect(mapped.status).toBe(408);
    expect(mapped.message).toBe('AI request timed out. Please try again.');
  });

  it('should map 500/503 server errors cleanly', () => {
    const mapped = mapAiError({ status: 503, message: 'upstream service unavailable' });
    expect(mapped.status).toBe(503);
    expect(mapped.message).toBe('AI service is temporarily unavailable.');
  });
});

describe('aiUtils document insights validation', () => {
  it('should validate and normalize complete insights data', () => {
    const raw = {
      dates: ['2026-01-01', '2026-12-31'],
      amounts: ['₹50,000', '$1,200'],
      people: ['John Doe'],
      organizations: ['Acme Corp'],
      actionItems: ['Sign NDA'],
      warnings: ['Late payment penalty 2%'],
      clauses: ['Confidentiality Clause 4'],
      contacts: ['support@zipstream.online'],
    };

    const validated = validateDocumentInsights(raw);
    expect(validated).not.toBeNull();
    expect(validated?.dates).toEqual(['2026-01-01', '2026-12-31']);
    expect(validated?.amounts).toEqual(['₹50,000', '$1,200']);
    expect(validated?.actionItems).toEqual(['Sign NDA']);
  });

  it('should return null for non-object inputs', () => {
    expect(validateDocumentInsights(null)).toBeNull();
    expect(validateDocumentInsights('not json')).toBeNull();
    expect(validateDocumentInsights(123)).toBeNull();
  });

  it('should normalize missing array properties to empty arrays', () => {
    const validated = validateDocumentInsights({});
    expect(validated).not.toBeNull();
    expect(validated?.dates).toEqual([]);
    expect(validated?.amounts).toEqual([]);
    expect(validated?.warnings).toEqual([]);
  });
});
