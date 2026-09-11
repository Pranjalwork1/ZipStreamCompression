import React from 'react';
import {
  Cpu,
  ShieldCheck,
  Zap,
  Lock,
  ExternalLink,
  Linkedin,
  Github,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Sparkles,
  Layers,
  FileCode2,
  Server,
  Share2,
  EyeOff,
  QrCode,
  Terminal,
  Clock,
  HardDrive,
  Users,
  Compass,
} from 'lucide-react';
import { ToolMode } from '../../types';

interface AboutViewProps {
  onBackToHome: () => void;
  onSelectTool?: (tool: ToolMode) => void;
}

export const AboutView: React.FC<AboutViewProps> = ({ onBackToHome, onSelectTool }) => {
  return (
    <div className="w-full max-w-5xl mx-auto py-6 sm:py-10 animate-in fade-in duration-300">
      {/* ─── BREADCRUMB / TOP ACTION BAR ────────────────────────────────────── */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-200/80 dark:border-white/10">
        <button
          onClick={onBackToHome}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
        >
          <span>← Back to All Tools</span>
        </button>

        <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          <span className="w-2 h-2 rounded-full bg-[#055EFE] animate-pulse"></span>
          <span>100% Client-Side Private</span>
        </div>
      </div>

      {/* ─── HERO SECTION: AccessGrid Editorial Layout with Dashed Guide Rails ─ */}
      <div className="relative pt-12 sm:pt-16 pb-12 sm:pb-16 text-center px-4">
        {/* Subtle decorative vertical dashed side guides (AccessGrid Signature) */}
        <div className="hidden md:block absolute top-0 left-4 bottom-0 w-px border-l border-dashed border-slate-300 dark:border-white/15 pointer-events-none"></div>
        <div className="hidden md:block absolute top-0 right-4 bottom-0 w-px border-r border-dashed border-slate-300 dark:border-white/15 pointer-events-none"></div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#055EFE]/10 border border-[#055EFE]/20 text-[#055EFE] text-xs font-bold uppercase tracking-wider mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>The ZipStream Mission</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#0C162C] dark:text-white max-w-3xl mx-auto leading-[1.15]">
          <span className="text-slate-400 dark:text-slate-500 font-medium">Our mission:</span>
          <br />
          Private, instant document superpowers for everyone.
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
          We believe modern document processing should run where your files already live: directly inside your browser. No cloud surveillance, zero queues, no artificial paywalls, and infinite document fidelity.
        </p>

        {/* Quick Hero CTAs */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => (onSelectTool ? onSelectTool('compress') : onBackToHome())}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#055EFE] hover:bg-[#004ACC] text-white font-semibold text-sm shadow-md shadow-[#055EFE]/20 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Start Using Tools Free</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <a
            href="https://www.linkedin.com/in/pranjal-singh-02aba0363/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-slate-100 dark:bg-white/[0.08] hover:bg-slate-200 dark:hover:bg-white/[0.12] text-slate-800 dark:text-white font-semibold text-sm transition-all cursor-pointer border border-black/5 dark:border-white/10"
          >
            <Linkedin className="w-4 h-4 text-[#0A66C2]" />
            <span>Connect on LinkedIn</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </a>
        </div>

        {/* AccessGrid-Inspired Architectural Geometric Grid Banner */}
        <div className="relative mt-12 w-full max-w-3xl mx-auto overflow-hidden rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="p-3">
              <div className="text-2xl sm:text-3xl font-black text-[#055EFE]">0 MB</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">Cloud Data Uploaded</div>
            </div>
            <div className="p-3">
              <div className="text-2xl sm:text-3xl font-black text-[#0C162C] dark:text-white">35+</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">Document Tools</div>
            </div>
            <div className="p-3">
              <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">100%</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">Client-Side Privacy</div>
            </div>
            <div className="p-3">
              <div className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400">0s</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">Server Queue Wait</div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── SECTION 1: WHAT IT TOOK TO BUILD THIS (Technical Architecture) ─── */}
      <div className="py-12 border-t border-slate-200/80 dark:border-white/10">
        <div className="max-w-3xl mb-8">
          <span className="text-xs font-bold uppercase tracking-wider text-[#055EFE]">
            Engineering Deep Dive
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0C162C] dark:text-white mt-1.5 tracking-tight">
            What was needed to build this
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
            Building desktop-class PDF &amp; document tools that run instantaneously without uploading user data required a complete reimagining of the traditional document processing pipeline.
          </p>
        </div>

        {/* 4 Architectural Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Pillar 1 */}
          <div className="p-6 rounded-2xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.08] transition-all hover:border-[#055EFE]/40 group">
            <div className="w-10 h-10 rounded-xl bg-[#055EFE]/10 text-[#055EFE] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#0C162C] dark:text-white">
              Client-Side WebAssembly Runtime
            </h3>
            <p className="mt-2 text-xs sm:text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Standard PDF operations (compression, page splitting, merging, watermarking, and rasterization) execute in isolated WebAssembly memory spaces via <strong>PDF-Lib</strong>, <strong>Web Workers</strong>, and <strong>Pica GPU scaling</strong>. Your bytes never leave your device’s RAM.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-white/[0.06] flex items-center gap-2 text-[11px] font-mono text-slate-500">
              <Terminal className="w-3.5 h-3.5 text-[#055EFE]" />
              <span>Multi-threaded WASM compilation</span>
            </div>
          </div>

          {/* Pillar 2 */}
          <div className="p-6 rounded-2xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.08] transition-all hover:border-[#055EFE]/40 group">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Server className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#0C162C] dark:text-white">
              Ephemeral Headless Micro-Engine
            </h3>
            <p className="mt-2 text-xs sm:text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed">
              For complex Word (.docx), Excel (.xlsx), and PowerPoint (.pptx) conversions where desktop typography and table indentations must achieve 100% fidelity, we engineered an isolated headless LibreOffice sandbox with ephemeral RAM storage that auto-purges files after conversion.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-white/[0.06] flex items-center gap-2 text-[11px] font-mono text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
              <span>Zero persistent disk storage</span>
            </div>
          </div>

          {/* Pillar 3 */}
          <div className="p-6 rounded-2xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.08] transition-all hover:border-[#055EFE]/40 group">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Share2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#0C162C] dark:text-white">
              Direct P2P WebRTC Data Channels
            </h3>
            <p className="mt-2 text-xs sm:text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Our P2P File Transfer creates direct, end-to-end encrypted WebRTC channels between your browser and the recipient’s device. Gigabytes of confidential documents transfer seamlessly with zero cloud intermediaries or file size limits.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-white/[0.06] flex items-center gap-2 text-[11px] font-mono text-slate-500">
              <Lock className="w-3.5 h-3.5 text-indigo-500" />
              <span>End-to-end encrypted peer stream</span>
            </div>
          </div>

          {/* Pillar 4 */}
          <div className="p-6 rounded-2xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.08] transition-all hover:border-[#055EFE]/40 group">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <EyeOff className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#0C162C] dark:text-white">
              In-Browser Privacy &amp; PII Scrubbing
            </h3>
            <p className="mt-2 text-xs sm:text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Document redaction and privacy audits inspect internal PDF metadata structures directly in JavaScript. Credit cards, SSNs, and phone numbers are automatically redacted without sending your text to any third-party AI APIs.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-white/[0.06] flex items-center gap-2 text-[11px] font-mono text-slate-500">
              <FileCode2 className="w-3.5 h-3.5 text-purple-500" />
              <span>Regex &amp; vector bounding-box scanner</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── SECTION 2: ACCESSGRID-INSPIRED CULTURAL & ENGINEERING PRINCIPLES ─── */}
      <div className="my-12 p-8 sm:p-12 rounded-3xl bg-[#0C162C] text-white relative overflow-hidden shadow-2xl border border-white/10">
        {/* Subtle decorative guide lines */}
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-80 h-80 bg-[#055EFE]/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10">
          <div className="max-w-2xl mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-[#00ff87]">
              Our Guiding Tenets
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-2 tracking-tight">
              Engineering principles we practice every single day
            </h2>
            <p className="mt-2 text-sm text-slate-300 leading-relaxed">
              Inspired by minimalist engineering cultures, we hold ourselves to rigorous standards so you never have to second-guess using ZipStream for your most critical documents.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
            {/* Principle 1 */}
            <div className="space-y-2 border-t border-white/15 pt-5">
              <div className="flex items-center gap-2.5 text-white font-bold text-sm">
                <ShieldCheck className="w-4 h-4 text-[#00ff87]" />
                <span>Privacy is a civil right, not a paid tier</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                We never store, log, or train models on your files. Document metadata, passwords, and private records belong exclusively to you.
              </p>
            </div>

            {/* Principle 2 */}
            <div className="space-y-2 border-t border-white/15 pt-5">
              <div className="flex items-center gap-2.5 text-white font-bold text-sm">
                <Zap className="w-4 h-4 text-[#055EFE]" />
                <span>Speed is respect</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Waiting 45 seconds for a remote server to upload and process a 2-page document is unacceptable. We compile directly to client-side WebAssembly for instantaneous local execution.
              </p>
            </div>

            {/* Principle 3 */}
            <div className="space-y-2 border-t border-white/15 pt-5">
              <div className="flex items-center gap-2.5 text-white font-bold text-sm">
                <HardDrive className="w-4 h-4 text-purple-400" />
                <span>Zero dark patterns or forced watermarks</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                We will never stamp your finished work with our branding or lock your files behind artificial 2-operation daily paywalls.
              </p>
            </div>

            {/* Principle 4 */}
            <div className="space-y-2 border-t border-white/15 pt-5">
              <div className="flex items-center gap-2.5 text-white font-bold text-sm">
                <Compass className="w-4 h-4 text-blue-400" />
                <span>Craftsmanship down to every single pixel</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Whether rendering a PDF preview, calibrating contrast on a scanned document, or calculating UPI QR codes, every interaction is crafted for fluid delight.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── SECTION 3: HOW WE ARE DIFFERENT (Comparison Matrix) ────────────── */}
      <div className="py-12 border-t border-slate-200/80 dark:border-white/10">
        <div className="max-w-3xl mb-8">
          <span className="text-xs font-bold uppercase tracking-wider text-[#055EFE]">
            Direct Comparison
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0C162C] dark:text-white mt-1.5 tracking-tight">
            How ZipStream is different from others
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
            Most online PDF tools are built around server uploads, artificial daily quotas, and aggressive paywalls. Here is how ZipStream stands fundamentally apart:
          </p>
        </div>

        {/* Side-by-Side Comparison Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B132B] shadow-sm">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02]">
                <th className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-300">Feature</th>
                <th className="py-3.5 px-4 font-bold text-[#055EFE]">ZipStream.online</th>
                <th className="py-3.5 px-4 font-semibold text-slate-400 dark:text-slate-500">Traditional PDF Sites (iLovePDF, Smallpdf)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
              <tr>
                <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                  Data Privacy Architecture
                </td>
                <td className="py-3.5 px-4 text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>100% Client-Side / Isolated RAM</span>
                </td>
                <td className="py-3.5 px-4 text-rose-500 dark:text-rose-400 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span>Uploaded to remote servers for hours</span>
                </td>
              </tr>

              <tr>
                <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                  Daily Usage Limits
                </td>
                <td className="py-3.5 px-4 text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Unlimited (No daily caps)</span>
                </td>
                <td className="py-3.5 px-4 text-rose-500 dark:text-rose-400 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span>Limited to 1-2 free tasks / day</span>
                </td>
              </tr>

              <tr>
                <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                  Processing Speed
                </td>
                <td className="py-3.5 px-4 text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Instant local WebAssembly execution</span>
                </td>
                <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <span>Slow upload &amp; download queues</span>
                </td>
              </tr>

              <tr>
                <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                  Document Formatting Fidelity
                </td>
                <td className="py-3.5 px-4 text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Desktop LibreOffice engine fidelity</span>
                </td>
                <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <span>Often distorted tables, displaced images</span>
                </td>
              </tr>

              <tr>
                <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                  Watermarks on Converted Output
                </td>
                <td className="py-3.5 px-4 text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Zero forced watermarks</span>
                </td>
                <td className="py-3.5 px-4 text-rose-500 dark:text-rose-400 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span>Forced branding on free tiers</span>
                </td>
              </tr>

              <tr>
                <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                  Tool Breadth
                </td>
                <td className="py-3.5 px-4 text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>35+ Tools: P2P Share, POS QR, Scanner</span>
                </td>
                <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <span>Limited only to standard PDF split/merge</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── SECTION 4: SPECIAL FEATURES & HIGHLIGHTS OF ZIPSTREAM ─────────── */}
      <div className="py-12 border-t border-slate-200/80 dark:border-white/10">
        <div className="max-w-3xl mb-8">
          <span className="text-xs font-bold uppercase tracking-wider text-[#055EFE]">
            Platform Capabilities
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0C162C] dark:text-white mt-1.5 tracking-tight">
            Special Features &amp; Highlights
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
            ZipStream isn’t just another compression utility. It is an end-to-end document workstation equipped with cutting-edge capabilities:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              title: 'Multi-Target PDF Compression',
              desc: 'Select your exact desired file size (e.g. 100 KB, 200 KB) or choose custom quality percentages with visual before/after preview.',
              tool: 'compress',
              icon: <Zap className="w-4 h-4 text-[#055EFE]" />,
            },
            {
              title: 'Batch Word to PDF Converter',
              desc: 'Convert multiple DOCX and DOC documents simultaneously with 100% preservation of fonts, tables, vector bullets, and margins.',
              tool: 'word_to_pdf',
              icon: <FileCode2 className="w-4 h-4 text-blue-500" />,
            },
            {
              title: 'Auto-Redact Sensitive PII',
              desc: 'Automatically identify and blackout credit card numbers, Aadhaar/SSN IDs, email addresses, and phone numbers before distribution.',
              tool: 'auto_redact_pii',
              icon: <EyeOff className="w-4 h-4 text-rose-500" />,
            },
            {
              title: 'Direct P2P Encrypted File Share',
              desc: 'Send multi-gigabyte files directly between devices without cloud uploads using end-to-end encrypted WebRTC peer streams.',
              tool: 'p2p_share',
              icon: <Share2 className="w-4 h-4 text-indigo-500" />,
            },
            {
              title: 'Smart Document Camera Scanner',
              desc: 'Turn physical receipts and contracts into crisp, deskewed PDFs right from your mobile camera with intelligent contrast enhancement.',
              tool: 'scan_document',
              icon: <Layers className="w-4 h-4 text-emerald-500" />,
            },
            {
              title: 'POS Quick Billing with UPI QR',
              desc: 'Generate professional thermal receipts and GST invoices with instant dynamic UPI QR codes for streamlined payments.',
              tool: 'pos_billing',
              icon: <QrCode className="w-4 h-4 text-purple-500" />,
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-white dark:bg-[#0F172A]/70 border border-slate-200/80 dark:border-white/[0.08] shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/10 shrink-0">
                    {item.icon}
                  </span>
                  <h3 className="font-bold text-sm text-[#0C162C] dark:text-white">
                    {item.title}
                  </h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {item.desc}
                </p>
              </div>

              {onSelectTool && (
                <button
                  onClick={() => onSelectTool(item.tool as ToolMode)}
                  className="mt-4 pt-3 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-xs font-semibold text-[#055EFE] hover:text-[#044ECC] transition-colors cursor-pointer"
                >
                  <span>Launch Tool</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ─── SECTION 5: CREATOR SPOTLIGHT — PRANJAL SINGH ───────────────────── */}
      <div className="my-12 p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-[#0C162C] to-[#1E293B] text-white relative overflow-hidden shadow-xl border border-white/10">
        {/* Background glow & subtle geometric lines */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-[#055EFE]/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 bg-[#0077FF]/15 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-semibold tracking-wide text-[#00ff87]">
              <span>Creator &amp; Architect</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Crafted by Pranjal Singh
            </h3>

            <p className="text-slate-300 text-sm sm:text-[15px] leading-relaxed">
              ZipStream was architected and built by <strong>Pranjal Singh</strong> to solve the chronic frustrations of slow, ad-ridden, paywalled document converters. Built with a passion for high-performance software, WebAssembly, and unconditional user privacy.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <a
                href="https://www.linkedin.com/in/pranjal-singh-02aba0363/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0A66C2] hover:bg-[#004182] text-white text-xs font-bold transition-colors shadow-sm cursor-pointer"
              >
                <Linkedin className="w-4 h-4" />
                <span>Connect on LinkedIn</span>
                <ExternalLink className="w-3.5 h-3.5 text-white/70" />
              </a>

              <a
                href="https://github.com/Pranjalwork1/ZipStreamCompression"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors border border-white/15 cursor-pointer"
              >
                <Github className="w-4 h-4" />
                <span>GitHub Repository</span>
              </a>
            </div>
          </div>

          {/* Profile Card Badge */}
          <div className="shrink-0 p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col items-center text-center w-full md:w-56">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#0077ff] to-[#055efe] flex items-center justify-center text-white text-2xl font-black shadow-md mb-3 border border-white/20">
              PS
            </div>
            <span className="font-bold text-base text-white">Pranjal Singh</span>
            <span className="text-xs text-slate-400 mt-0.5">Software Engineer</span>
            <span className="text-[11px] text-[#00ff87] font-mono mt-2 px-2 py-0.5 rounded-md bg-[#00ff87]/10 border border-[#00ff87]/20">
              Founder &amp; Builder
            </span>
          </div>
        </div>
      </div>

      {/* ─── BOTTOM CTA: BACK TO TOOLS ─────────────────────────────────────── */}
      <div className="text-center pt-8 pb-4">
        <h3 className="text-lg font-bold text-[#0C162C] dark:text-white">
          Experience the Difference Yourself
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
          Start compressing, converting, or editing your documents now with zero file uploads and 100% privacy.
        </p>
        <div className="mt-4">
          <button
            onClick={() => (onSelectTool ? onSelectTool('compress') : onBackToHome())}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-b from-[#0077ff] to-[#055efe] hover:from-[#006ee6] hover:to-[#0452e0] text-white font-bold text-sm shadow-md shadow-[#055efe]/25 transition-all cursor-pointer hover:scale-105"
          >
            <span>Explore All 35+ Tools</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
