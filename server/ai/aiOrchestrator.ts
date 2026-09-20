/**
 * AI Provider Orchestrator
 * Coordinates requests between Sarvam AI, Gemini AI, and local offline fallbacks.
 *
 * Routing Priority:
 * - When Sarvam is enabled:
 *     Sarvam -> Gemini on Sarvam failure -> Local fallback on Gemini failure
 * - When Sarvam is disabled:
 *     Gemini -> Local fallback on Gemini failure/absence
 * - When Gemini is unavailable:
 *     Local fallback
 *
 * Never exposes internal provider tracebacks or raw errors.
 */

import { GoogleGenAI } from '@google/genai';
import { isSarvamEnabled, chatWithSarvam, summarizeWithSarvam, SarvamChatParams, SarvamSummarizeParams } from './sarvam';
import { splitSentences } from './aiUtils';

export type AiProvider = 'sarvam' | 'gemini' | 'local';

export interface OrchestratedChatResult {
  provider: AiProvider;
  fallbackUsed: boolean;
  reply: string;
  languageCode?: string;
}

export interface OrchestratedSummaryResult {
  provider: AiProvider;
  fallbackUsed: boolean;
  summary: string;
  type: string;
}

let geminiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) return null;
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey: apiKey.trim(),
      httpOptions: {
        headers: {
          'User-Agent': 'zipstream-ai',
        },
      },
    });
  }
  return geminiClient;
}

/**
 * Local deterministic document Q&A heuristic (100% offline, zero API calls).
 */
export function localDocumentChat(query: string, documentContext: string): string {
  const q = (query || '').trim().toLowerCase();
  const doc = (documentContext || '').trim();

  if (!doc) {
    return 'No document content is currently available to search. Please upload a PDF to ask questions.';
  }

  // Word count query
  if (/\b(how many words|word count|length)\b/i.test(q)) {
    const wc = doc.split(/\s+/).filter(Boolean).length;
    return `This document contains approximately **${wc.toLocaleString()} words**.`;
  }

  // Summarize query
  if (/\b(summarize|summary|overview|brief|main point|key point|gist|tldr|tl;dr)\b/i.test(q)) {
    const sents = splitSentences(doc).slice(0, 5);
    return `**Summary:**\n\n${sents.join(' ')}`;
  }

  const queryWords = q
    .split(/\W+/)
    .filter(w => w.length > 2 && !/^(the|and|for|are|but|not|you|all|any|can|her|was|one|our|out|day|get|has|him|his|how|man|new|now|old|see|two|way|who|boy|did|its|let|put|say|she|too|use)\b/i.test(w));

  if (queryWords.length === 0) {
    return 'Please ask a specific question about the document topics, terms, or sections.';
  }

  const sentences = splitSentences(doc);
  const scored = sentences.map(sentence => {
    const sLower = sentence.toLowerCase();
    let score = 0;
    for (const w of queryWords) {
      if (sLower.includes(w)) score += 1;
    }
    return { sentence, score };
  });

  const matches = scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(item => item.sentence);

  if (matches.length === 0) {
    return `I searched the document for "${query}" but could not find a matching passage. Try rephrasing with specific key terms or section headings.`;
  }

  return `${matches.join(' ')}\n\n*(Extracted from relevant document passages)*`;
}

/**
 * Local deterministic document summarization (100% offline).
 */
export function localDocumentSummary(text: string, type: string = 'executive'): string {
  const sentences = splitSentences(text || '');
  const wordCount = (text || '').trim().split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  if (type === 'tldr') {
    const top3 = sentences.slice(0, 3).join(' ');
    const points = sentences.slice(3, 7).map((s, i) => `${i + 1}. ${s}`).join('\n');
    return `## ⚡ TL;DR\n\n${top3 || 'No content.'}\n\n## 🏆 Key Points\n\n${points}`;
  }

  if (type === 'bullets') {
    const items = sentences.slice(0, 8).map(s => `- ${s}`).join('\n');
    return `## 📌 Key Highlights\n\n${items || '- No content available.'}\n\n## 📊 Stats\n- **Words:** ${wordCount.toLocaleString()}  \n- **Reading time:** ~${readingTime} min`;
  }

  if (type === 'action_items') {
    const actionRe = /must|should|will|shall|need|action|deadline|agree|payment|submit|review|complete|required|ensure|provide/i;
    const actions = sentences.filter(s => actionRe.test(s)).slice(0, 6);
    const fallback = sentences.slice(0, 4);
    const list = (actions.length > 0 ? actions : fallback).map(s => `- [ ] ${s}`).join('\n');
    return `## ✅ Action Items\n\n${list}\n\n---\n*Extracted from directive terms.*`;
  }

  if (type === 'faq') {
    const pairs = sentences.slice(0, 5).map((s, i) => {
      const topic = s.split(',')[0]?.slice(0, 45) || `Section ${i + 1}`;
      return `**Q${i + 1}: What does the document say about "${topic}"?**\nA: ${s}`;
    }).join('\n\n');
    return `## ❓ FAQ\n\n${pairs}`;
  }

  if (type === 'metrics') {
    const metricRe = /\d+[%₹$]?|\$\d|₹\d|total|amount|rate|cost|fee|percent/i;
    const metricSents = sentences.filter(s => metricRe.test(s)).slice(0, 6);
    const rows = (metricSents.length > 0 ? metricSents : sentences.slice(0, 4))
      .map((s, i) => `| #${i + 1} | ${s.slice(0, 60)}… |`)
      .join('\n');
    return `## 📊 Key Metrics\n\n| # | Extracted Metric |\n|---|---|\n${rows}\n\n- **Total words:** ${wordCount.toLocaleString()}`;
  }

  // Default executive
  const intro = sentences.slice(0, 3).join(' ');
  const takeaways = sentences.slice(3, 8).map(s => `- ${s}`).join('\n');
  return `## 📋 Executive Summary\n\n${intro || 'No text content extracted.'}\n\n## 🎯 Key Takeaways\n\n${takeaways}\n\n---\n- **Words:** ${wordCount.toLocaleString()}  \n- **Reading time:** ~${readingTime} min`;
}

/**
 * Calls Gemini Chat endpoint.
 */
async function callGeminiChat(message: string, documentContext?: string): Promise<string> {
  const client = getGeminiClient();
  if (!client) throw new Error('Gemini API key is not configured.');

  const systemPrompt = `You are ZipStream AI document assistant.
Answer accurately and concisely based strictly on the provided document context.
If not found, clearly state that.

DOCUMENT CONTEXT:
${(documentContext || '').slice(0, 30_000)}`;

  const response = await client.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: message,
    config: {
      systemInstruction: systemPrompt,
      temperature: 0.2,
    },
  });

  return response.text || 'No response generated.';
}

/**
 * Calls Gemini Summary endpoint.
 */
async function callGeminiSummary(text: string, type: string = 'executive'): Promise<string> {
  const client = getGeminiClient();
  if (!client) throw new Error('Gemini API key is not configured.');

  const response = await client.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Create a ${type} summary of this document. Be concise and factual.\n\nDOCUMENT:\n${(text || '').slice(0, 35_000)}`,
    config: { temperature: 0.2 },
  });

  return response.text || 'No summary generated.';
}

/**
 * Orchestrates Chat Q&A across Sarvam, Gemini, and Local Fallback.
 */
export async function orchestrateChat(params: SarvamChatParams): Promise<OrchestratedChatResult> {
  const sarvamActive = isSarvamEnabled();

  if (sarvamActive) {
    try {
      const result = await chatWithSarvam(params);
      return {
        provider: 'sarvam',
        fallbackUsed: false,
        reply: result.reply,
        languageCode: result.languageCode,
      };
    } catch (sarvamErr) {
      // Fallback to Gemini
      try {
        const geminiReply = await callGeminiChat(params.message, params.documentContext);
        return {
          provider: 'gemini',
          fallbackUsed: true,
          reply: geminiReply,
        };
      } catch (geminiErr) {
        // Fallback to local
        const localReply = localDocumentChat(params.message, params.documentContext || '');
        return {
          provider: 'local',
          fallbackUsed: true,
          reply: localReply,
        };
      }
    }
  }

  // Sarvam is disabled: Gemini -> Local
  try {
    const geminiReply = await callGeminiChat(params.message, params.documentContext);
    return {
      provider: 'gemini',
      fallbackUsed: false,
      reply: geminiReply,
    };
  } catch {
    const localReply = localDocumentChat(params.message, params.documentContext || '');
    return {
      provider: 'local',
      fallbackUsed: true,
      reply: localReply,
    };
  }
}

/**
 * Orchestrates Document Summarization across Sarvam, Gemini, and Local Fallback.
 */
export async function orchestrateSummarize(params: SarvamSummarizeParams): Promise<OrchestratedSummaryResult> {
  const sarvamActive = isSarvamEnabled();
  const summaryType = params.type || 'executive';

  if (sarvamActive) {
    try {
      const result = await summarizeWithSarvam(params);
      return {
        provider: 'sarvam',
        fallbackUsed: false,
        summary: result.summary,
        type: result.type,
      };
    } catch (sarvamErr) {
      // Fallback to Gemini
      try {
        const geminiSummary = await callGeminiSummary(params.text, summaryType);
        return {
          provider: 'gemini',
          fallbackUsed: true,
          summary: geminiSummary,
          type: summaryType,
        };
      } catch {
        // Fallback to local
        const localSum = localDocumentSummary(params.text, summaryType);
        return {
          provider: 'local',
          fallbackUsed: true,
          summary: localSum,
          type: summaryType,
        };
      }
    }
  }

  // Sarvam is disabled: Gemini -> Local
  try {
    const geminiSummary = await callGeminiSummary(params.text, summaryType);
    return {
      provider: 'gemini',
      fallbackUsed: false,
      summary: geminiSummary,
      type: summaryType,
    };
  } catch {
    const localSum = localDocumentSummary(params.text, summaryType);
    return {
      provider: 'local',
      fallbackUsed: true,
      summary: localSum,
      type: summaryType,
    };
  }
}
