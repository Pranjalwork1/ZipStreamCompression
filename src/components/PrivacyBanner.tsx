import React from 'react';
import { ShieldCheck, Cpu, Lock, Zap } from 'lucide-react';

export const PrivacyBanner: React.FC = () => {
  return (
    <div className="w-full rounded-3xl border border-black/[0.04] dark:border-white/[0.06] bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl p-5 sm:p-6 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Feature 1 */}
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700/60 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
              100% Client-Side Privacy
            </h4>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
              Files never leave your device. All optimization happens in your browser RAM.
            </p>
          </div>
        </div>

        {/* Feature 2 */}
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/60 border border-blue-300 dark:border-blue-700/60 flex items-center justify-center shrink-0 text-blue-600 dark:text-blue-400">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
              Multi-Core Acceleration
            </h4>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
              Hardware accelerated canvas, WebCodecs, and Web Audio for instantaneous encoding.
            </p>
          </div>
        </div>

        {/* Feature 3 */}
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-300 dark:border-indigo-700/60 flex items-center justify-center shrink-0 text-indigo-600 dark:text-indigo-400">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
              Zero Size Limits
            </h4>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
              Batch compress gigabytes without upload wait times or cloud file limits.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
