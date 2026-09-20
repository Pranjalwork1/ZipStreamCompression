import { Router, Request, Response } from 'express';
import {
  isSarvamConfigured,
  isSarvamEnabled,
} from './sarvam';
import { orchestrateChat, orchestrateSummarize } from './aiOrchestrator';
import { createAiRateLimiter } from './aiRateLimit';
import { getMaxChatChars, getMaxDocumentChars } from './aiUtils';

const router = Router();

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

export default router;
