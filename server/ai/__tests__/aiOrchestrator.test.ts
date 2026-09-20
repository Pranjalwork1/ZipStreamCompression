import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  localDocumentChat,
  localDocumentSummary,
  orchestrateChat,
  orchestrateSummarize,
} from '../aiOrchestrator';

describe('aiOrchestrator local fallback heuristics', () => {
  const sampleDoc = `ZipStream is a privacy-first web platform for file compression and conversion.
All core processing takes place directly in the user browser using WebAssembly.
The system includes PDF compression, Office conversion, and WebRTC P2P sharing.
Key metric: 90% size reduction on typical PDF documents.
Total word count of this sample is twenty five words.`;

  it('should answer word count questions locally', () => {
    const reply = localDocumentChat('What is the word count of this document?', sampleDoc);
    expect(reply).toContain('approximately');
    expect(reply).toContain('words');
  });

  it('should answer summary questions locally', () => {
    const reply = localDocumentChat('Give me a brief summary of the text', sampleDoc);
    expect(reply).toContain('Summary:');
    expect(reply).toContain('ZipStream');
  });

  it('should match relevant sentences based on keywords', () => {
    const reply = localDocumentChat('Tell me about WebRTC sharing and privacy', sampleDoc);
    expect(reply.toLowerCase()).toContain('webrtc');
    expect(reply).toContain('relevant document passages');
  });

  it('should generate structured summaries across all supported modes', () => {
    const executive = localDocumentSummary(sampleDoc, 'executive');
    expect(executive).toContain('Executive Summary');

    const bullets = localDocumentSummary(sampleDoc, 'bullets');
    expect(bullets).toContain('Key Highlights');

    const tldr = localDocumentSummary(sampleDoc, 'tldr');
    expect(tldr).toContain('TL;DR');

    const actions = localDocumentSummary(sampleDoc, 'action_items');
    expect(actions).toContain('Action Items');

    const faq = localDocumentSummary(sampleDoc, 'faq');
    expect(faq).toContain('FAQ');

    const metrics = localDocumentSummary(sampleDoc, 'metrics');
    expect(metrics).toContain('Key Metrics');
  });
});

describe('aiOrchestrator fallback when cloud providers are disabled', () => {
  const originalSarvamEnabled = process.env.SARVAM_ENABLED;
  const originalGeminiKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    process.env.SARVAM_ENABLED = 'false';
    delete process.env.GEMINI_API_KEY;
  });

  afterEach(() => {
    process.env.SARVAM_ENABLED = originalSarvamEnabled;
    if (originalGeminiKey) process.env.GEMINI_API_KEY = originalGeminiKey;
  });

  it('orchestrateChat should return local provider when Sarvam is disabled and Gemini is unconfigured', async () => {
    const result = await orchestrateChat({
      message: 'What is the word count?',
      documentContext: 'Testing document with five words.',
    });

    expect(result.provider).toBe('local');
    expect(result.fallbackUsed).toBe(true);
    expect(result.reply).toBeDefined();
    expect(result.reply.length).toBeGreaterThan(0);
  });

  it('orchestrateSummarize should return local provider when Sarvam is disabled and Gemini is unconfigured', async () => {
    const result = await orchestrateSummarize({
      text: 'Sample text for summarization testing.',
      type: 'executive',
    });

    expect(result.provider).toBe('local');
    expect(result.fallbackUsed).toBe(true);
    expect(result.summary).toContain('Executive Summary');
    expect(result.type).toBe('executive');
  });
});
