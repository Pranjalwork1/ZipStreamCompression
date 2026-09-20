/**
 * Frontend TypeScript definitions for Sarvam AI integration.
 */

export type AiProvider = 'sarvam' | 'gemini' | 'local';

export interface SarvamHealthFeatures {
  chat: boolean;
  summarize: boolean;
  translate: boolean;
  stt: boolean;
  tts: boolean;
  insights: boolean;
}

export interface SarvamHealthResponse {
  enabled: boolean;
  configured: boolean;
  features: SarvamHealthFeatures;
}

export interface AiChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  provider?: AiProvider;
  fallbackUsed?: boolean;
}

export interface AiChatRequest {
  message: string;
  documentContext?: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  languageCode?: string;
}

export interface AiChatResponse {
  provider: AiProvider;
  fallbackUsed: boolean;
  reply: string;
  languageCode?: string;
}

export type SummaryMode = 'executive' | 'bullets' | 'tldr' | 'action_items' | 'faq' | 'metrics';

export interface AiSummarizeRequest {
  text: string;
  type?: SummaryMode;
  targetLanguageCode?: string;
}

export interface AiSummarizeResponse {
  provider: AiProvider;
  fallbackUsed: boolean;
  summary: string;
  type: string;
}

export interface AiTranslateRequest {
  input: string;
  sourceLanguageCode?: string;
  targetLanguageCode: string;
}

export interface AiTranslateResponse {
  translatedText: string;
  sourceLanguageCode: string;
  targetLanguageCode: string;
}

export interface AiSttResponse {
  text: string;
  languageCode: string;
  provider: 'sarvam';
}

export interface AiTtsAudioChunk {
  base64: string;
  mimeType: string;
}

export interface AiTtsResponse {
  provider: 'sarvam';
  audio: AiTtsAudioChunk[];
}

export interface AiInsightsResponse {
  dates: string[];
  amounts: string[];
  people: string[];
  organizations: string[];
  actionItems: string[];
  warnings: string[];
  clauses: string[];
  contacts: string[];
}

export interface IndicLanguage {
  code: string;
  name: string;
  native: string;
}

export const TESTED_INDIC_LANGUAGES: IndicLanguage[] = [
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
];
