import { Router, Request, Response } from 'express';
import multer from 'multer';
import {
  isSarvamConfigured,
  isSarvamEnabled,
  translateWithSarvam,
  speechToTextWithSarvam,
  textToSpeechWithSarvam,
  extractInsightsWithSarvam,
} from './sarvam';
import { orchestrateChat, orchestrateSummarize } from './aiOrchestrator';
import { createAiRateLimiter } from './aiRateLimit';
import { getMaxChatChars, getMaxDocumentChars, extractKeyterms } from './aiUtils';

const router = Router();

// Multer in-memory storage for STT audio chunks; buffers are ephemeral and garbage collected immediately
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit (plenty for 30s of WebM/WAV/MP3)
  },
});

// Middleware to enforce no-store caching on all AI responses
router.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

/**
 * GET /api/sarvam/health
 * Safe public healthcheck. ALWAYS returns 200 OK.
 * NEVER leaks API key, auth headers, or env dumps.
 */
router.get('/health', (_req: Request, res: Response) => {
  const configured = isSarvamConfigured();
  const enabled = isSarvamEnabled();

  res.json({
    enabled,
    configured,
    features: {
      chat: enabled,
      summarize: enabled,
      translate: enabled,
      stt: enabled,
      tts: enabled,
      insights: enabled,
    },
  });
});

/**
 * POST /api/sarvam/chat
 * Multi-turn document Q&A. Routes through AI Orchestrator (Sarvam -> Gemini -> Local).
 */
router.post('/chat', createAiRateLimiter('chat'), async (req: Request, res: Response) => {
  try {
    const { message, documentContext, history, languageCode } = req.body || {};

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message text is required.' });
    }

    const maxChat = getMaxChatChars();
    if (message.length > maxChat) {
      return res.status(413).json({ error: `Message exceeds the ${maxChat} character limit.` });
    }

    const result = await orchestrateChat({
      message: message.trim(),
      documentContext: typeof documentContext === 'string' ? documentContext.slice(0, getMaxDocumentChars()) : undefined,
      history: Array.isArray(history) ? history : [],
      languageCode: typeof languageCode === 'string' ? languageCode : undefined,
    });

    return res.json(result);
  } catch (err: any) {
    const status = err?.status || 500;
    const errorMsg = err?.message || 'Failed to process document chat.';
    return res.status(status).json({ error: errorMsg });
  }
});

/**
 * POST /api/sarvam/summarize
 * Document summarization. Routes through AI Orchestrator (Sarvam -> Gemini -> Local).
 */
router.post('/summarize', createAiRateLimiter('summarize'), async (req: Request, res: Response) => {
  try {
    const { text, type = 'executive', targetLanguageCode } = req.body || {};

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Document text is required for summarization.' });
    }

    const maxDoc = getMaxDocumentChars();
    if (text.length > maxDoc * 2) {
      return res.status(413).json({ error: `Document text exceeds the ${maxDoc} character limit.` });
    }

    const result = await orchestrateSummarize({
      text: text.trim().slice(0, maxDoc),
      type,
      targetLanguageCode: typeof targetLanguageCode === 'string' ? targetLanguageCode : undefined,
    });

    return res.json(result);
  } catch (err: any) {
    const status = err?.status || 500;
    const errorMsg = err?.message || 'Failed to summarize document.';
    return res.status(status).json({ error: errorMsg });
  }
});

/**
 * POST /api/sarvam/translate
 * Multilingual translation using sarvam-translate:v1 with long-text chunking.
 */
router.post('/translate', createAiRateLimiter('translate'), async (req: Request, res: Response) => {
  try {
    if (!isSarvamEnabled()) {
      return res.status(403).json({ error: 'AI translation service is currently disabled.' });
    }

    const { input, sourceLanguageCode, targetLanguageCode } = req.body || {};

    if (!input || typeof input !== 'string' || !input.trim()) {
      return res.status(400).json({ error: 'Text input is required for translation.' });
    }

    if (!targetLanguageCode || typeof targetLanguageCode !== 'string') {
      return res.status(400).json({ error: 'Target language code is required.' });
    }

    if (input.length > 30_000) {
      return res.status(413).json({ error: 'Input text exceeds the 30,000 character limit for translation.' });
    }

    const result = await translateWithSarvam({
      input: input.trim(),
      sourceLanguageCode: typeof sourceLanguageCode === 'string' ? sourceLanguageCode : undefined,
      targetLanguageCode,
    });

    return res.json(result);
  } catch (err: any) {
    const status = err?.status || 500;
    const errorMsg = err?.message || 'Translation service temporarily unavailable.';
    return res.status(status).json({ error: errorMsg });
  }
});

/**
 * POST /api/sarvam/stt
 * Speech to text using Saaras v4 REST endpoint (max 30s audio).
 */
router.post('/stt', createAiRateLimiter('stt'), upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!isSarvamEnabled()) {
      return res.status(403).json({ error: 'AI speech-to-text service is currently disabled.' });
    }

    const file = req.file;
    if (!file || !file.buffer || file.buffer.length === 0) {
      return res.status(400).json({ error: 'No audio data received.' });
    }

    if (file.buffer.length > 10 * 1024 * 1024) {
      return res.status(413).json({ error: 'Audio file exceeds the maximum 10MB limit.' });
    }

    let parsedKeyterms: string[] | undefined = undefined;
    const rawKeyterms = req.body?.keyterms;
    if (typeof rawKeyterms === 'string') {
      try {
        const json = JSON.parse(rawKeyterms);
        if (Array.isArray(json)) parsedKeyterms = json;
      } catch {
        parsedKeyterms = rawKeyterms.split(',').map(s => s.trim()).filter(Boolean);
      }
    } else if (Array.isArray(rawKeyterms)) {
      parsedKeyterms = rawKeyterms;
    }

    const docContext = typeof req.body?.documentContext === 'string' ? req.body.documentContext : '';
    const keyterms = extractKeyterms(docContext, parsedKeyterms);

    const result = await speechToTextWithSarvam({
      audioBuffer: file.buffer,
      mimeType: file.mimetype || 'audio/webm',
      languageCode: req.body?.language_code || req.body?.languageCode,
      keyterms,
    });

    return res.json(result);
  } catch (err: any) {
    const status = err?.status || 500;
    const errorMsg = err?.message || 'Failed to transcribe audio.';
    return res.status(status).json({ error: errorMsg });
  }
});

/**
 * POST /api/sarvam/tts
 * Text to speech using Bulbul v3 with sequential chunking.
 */
router.post('/tts', createAiRateLimiter('tts'), async (req: Request, res: Response) => {
  try {
    if (!isSarvamEnabled()) {
      return res.status(403).json({ error: 'AI text-to-speech service is currently disabled.' });
    }

    const { text, languageCode, speaker, pace, codec } = req.body || {};

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Text is required for speech synthesis.' });
    }

    if (text.length > 15_000) {
      return res.status(413).json({ error: 'Text exceeds the 15,000 character limit for speech synthesis.' });
    }

    const result = await textToSpeechWithSarvam({
      text: text.trim(),
      languageCode: typeof languageCode === 'string' ? languageCode : undefined,
      speaker: typeof speaker === 'string' ? speaker : undefined,
      pace: typeof pace === 'number' ? pace : 1.0,
      codec: typeof codec === 'string' ? codec : 'mp3',
    });

    return res.json(result);
  } catch (err: any) {
    const status = err?.status || 500;
    const errorMsg = err?.message || 'Failed to synthesize speech.';
    return res.status(status).json({ error: errorMsg });
  }
});

/**
 * POST /api/sarvam/insights
 * Extracts structured intelligence (dates, amounts, people, orgs, actions, warnings, clauses, contacts)
 */
router.post('/insights', createAiRateLimiter('insights'), async (req: Request, res: Response) => {
  try {
    if (!isSarvamEnabled()) {
      return res.status(403).json({ error: 'AI document insights service is currently disabled.' });
    }

    const { documentContext } = req.body || {};

    if (!documentContext || typeof documentContext !== 'string' || !documentContext.trim()) {
      return res.status(400).json({ error: 'Document context is required.' });
    }

    const maxDoc = getMaxDocumentChars();
    const insights = await extractInsightsWithSarvam(documentContext.slice(0, maxDoc));

    return res.json(insights);
  } catch (err: any) {
    const status = err?.status || 500;
    const errorMsg = err?.message || 'Failed to extract document insights.';
    return res.status(status).json({ error: errorMsg });
  }
});

export default router;
