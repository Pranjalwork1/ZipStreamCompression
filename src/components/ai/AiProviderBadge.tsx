import React from 'react';
import { Sparkles, Bot, Laptop, ShieldCheck } from 'lucide-react';
import { AiProvider } from '../../types/sarvam';

interface AiProviderBadgeProps {
  provider?: AiProvider;
  fallbackUsed?: boolean;
  className?: string;
}

export const AiProviderBadge: React.FC<AiProviderBadgeProps> = ({
  provider = 'local',
  fallbackUsed = false,
  className = '',
}) => {
  if (provider === 'sarvam') {
    return (
      <span
        title="Powered by Sarvam AI (Indic Document Intelligence)"
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/50 ${className}`}
      >
        <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
        Sarvam AI
      </span>
    );
  }

  if (provider === 'gemini') {
    return (
      <span
        title={fallbackUsed ? "Fallback to Gemini AI" : "Powered by Gemini AI"}
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/50 ${className}`}
      >
        <Bot className="w-3 h-3 text-blue-600 dark:text-blue-400" />
        Gemini AI{fallbackUsed ? ' (Fallback)' : ''}
      </span>
    );
  }

  return (
    <span
      title="Running 100% locally on-device without cloud AI"
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 ${className}`}
    >
      <Laptop className="w-3 h-3 text-slate-500" />
      Local Engine{fallbackUsed ? ' (Fallback)' : ''}
    </span>
  );
};
