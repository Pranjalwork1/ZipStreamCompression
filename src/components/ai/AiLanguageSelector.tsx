import React from 'react';
import { Globe } from 'lucide-react';
import { TESTED_INDIC_LANGUAGES } from '../../types/sarvam';

interface AiLanguageSelectorProps {
  selectedLanguage: string;
  onLanguageChange: (languageCode: string) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
}

export const AiLanguageSelector: React.FC<AiLanguageSelectorProps> = ({
  selectedLanguage,
  onLanguageChange,
  disabled = false,
  className = '',
  label,
}) => {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {label && (
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
          {label}
        </span>
      )}
      <div className="relative inline-flex items-center">
        <Globe className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none" />
        <select
          value={selectedLanguage}
          onChange={(e) => onLanguageChange(e.target.value)}
          disabled={disabled}
          aria-label="Select AI Language"
          className="text-xs font-medium pl-8 pr-7 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed appearance-none"
        >
          {TESTED_INDIC_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name} — {lang.native}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute right-2 text-slate-400 text-[10px]">
          ▼
        </div>
      </div>
    </div>
  );
};
