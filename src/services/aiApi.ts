/**
 * ZipStream Frontend AI API Client
 *
 * CRITICAL SECURITY CONSTRAINTS:
 * - Directs all traffic exclusively to ZipStream's Express backend at /api/sarvam/*
 * - Contains ZERO API keys or third-party credential headers
 * - Never communicates with third-party AI endpoints directly from the browser
 */

import {
  SarvamHealthResponse,
  AiChatRequest,
  AiChatResponse,
  AiSummarizeRequest,
  AiSummarizeResponse,
  AiTranslateRequest,
  AiTranslateResponse,
  AiSttResponse,
  AiTtsResponse,
  AiInsightsResponse,
} from '../types/sarvam';

export function getBackendUrl(): string {
  const configured = (import.meta as any).env?.VITE_BACKEND_URL?.trim();
  if (configured) {
    return configured.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
}

/**
 * Checks backend Sarvam configuration and feature availability.
 * Always returns a response without throwing to ensure UI resilience.
 */
export async function sarvamHealth(): Promise<SarvamHealthResponse> {
  try {
    const res = await fetch(`${getBackendUrl()}/api/sarvam/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      return {
        enabled: false,
        configured: false,
        features: { chat: false, summarize: false, translate: false, stt: false, tts: false, insights: false },
      };
    }

    return await res.json();
  } catch (err) {
    console.warn('[AI API] Health check unavailable; defaulting to offline mode:', err);
    return {
      enabled: false,
      configured: false,
      features: { chat: false, summarize: false, translate: false, stt: false, tts: false, insights: false },
    };
  }
}

/**
 * Multi-turn document chat through AI Orchestrator (Sarvam -> Gemini -> Local).
 */
export async function sarvamChat(params: AiChatRequest): Promise<AiChatResponse> {
  const res = await fetch(`${getBackendUrl()}/api/sarvam/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `AI Chat request failed with status ${res.status}`);
  }

  return await res.json();
}

/**
 * Structured document summarization through AI Orchestrator (Sarvam -> Gemini -> Local).
 */
export async function sarvamSummarize(params: AiSummarizeRequest): Promise<AiSummarizeResponse> {
  const res = await fetch(`${getBackendUrl()}/api/sarvam/summarize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `AI Summarize request failed with status ${res.status}`);
  }

  return await res.json();
}

/**
 * Multilingual document translation using sarvam-translate:v1 with chunking.
 */
export async function sarvamTranslate(params: AiTranslateRequest): Promise<AiTranslateResponse> {
  const res = await fetch(`${getBackendUrl()}/api/sarvam/translate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Translation failed with status ${res.status}`);
  }

  return await res.json();
}

/**
 * Speech to text transcription via Saaras v4 (max 30s audio recording).
 */
export async function sarvamSpeechToText(
  audioBlob: Blob,
  languageCode?: string,
  keyterms?: string[],
  documentContext?: string
): Promise<AiSttResponse> {
  const formData = new FormData();
  formData.append('file', audioBlob, 'speech.webm');
  if (languageCode) formData.append('languageCode', languageCode);
  if (keyterms && keyterms.length > 0) formData.append('keyterms', JSON.stringify(keyterms));
  if (documentContext) formData.append('documentContext', documentContext.slice(0, 10_000));

  const res = await fetch(`${getBackendUrl()}/api/sarvam/stt`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Speech-to-text failed with status ${res.status}`);
  }

  return await res.json();
}

/**
 * Text to speech synthesis via Bulbul v3.
 */
export async function sarvamTextToSpeech(params: {
  text: string;
  languageCode?: string;
  speaker?: string;
  pace?: number;
  codec?: string;
}): Promise<AiTtsResponse> {
  const res = await fetch(`${getBackendUrl()}/api/sarvam/tts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Speech synthesis failed with status ${res.status}`);
  }

  return await res.json();
}

/**
 * Extracts structured intelligence and entities from document text.
 */
export async function sarvamInsights(documentContext: string): Promise<AiInsightsResponse> {
  const res = await fetch(`${getBackendUrl()}/api/sarvam/insights`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ documentContext }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Document insights extraction failed with status ${res.status}`);
  }

  return await res.json();
}
