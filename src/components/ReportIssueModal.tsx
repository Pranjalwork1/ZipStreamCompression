import React, { useState } from 'react';
import {
  X,
  Send,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  Mail,
  Bug,
  Sparkles,
  HelpCircle,
  FileWarning,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';
import { IssueReport, UploadedFileInfo } from '../types';

interface ReportIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeFile?: UploadedFileInfo | null;
}

const DEVELOPER_EMAIL = 'pranjal.25gcebai026@galgotiacollege.edu';

export const ReportIssueModal: React.FC<ReportIssueModalProps> = ({
  isOpen,
  onClose,
  activeFile,
}) => {
  const [category, setCategory] = useState<IssueReport['category']>('file_error');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [severity, setSeverity] = useState<IssueReport['severity']>('medium');
  const [includeSystemInfo, setIncludeSystemInfo] = useState(true);
  const [includeActiveFileInfo, setIncludeActiveFileInfo] = useState(!!activeFile);

  const [submittedReport, setSubmittedReport] = useState<IssueReport | null>(null);
  const [telegramStatus, setTelegramStatus] = useState<{
    delivered: boolean;
    configured: boolean;
  }>({ delivered: false, configured: false });
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const getSystemInfo = () => {
    return `${navigator.userAgent} | Screen: ${window.screen.width}x${window.screen.height} | Platform: ${navigator.platform || 'Web'}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      setErrorMsg('Please enter a brief subject for your issue.');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Please describe what happened or what you observed.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    const newReport: IssueReport = {
      id: `ISSUE-${Math.floor(1000 + Math.random() * 9000)}`,
      category,
      subject: subject.trim(),
      description: description.trim(),
      userEmail: userEmail.trim() || undefined,
      userName: userName.trim() || undefined,
      fileType: includeActiveFileInfo && activeFile ? activeFile.type : undefined,
      fileSizeApprox: includeActiveFileInfo && activeFile ? `${(activeFile.size / 1024).toFixed(1)} KB` : undefined,
      severity,
      browserInfo: includeSystemInfo ? getSystemInfo() : 'Not provided',
      createdAt: Date.now(),
      status: 'submitted',
    };

    // 1. Save to local storage for user history
    try {
      const existing = JSON.parse(localStorage.getItem('compressor_reported_issues') || '[]');
      existing.unshift(newReport);
      localStorage.setItem('compressor_reported_issues', JSON.stringify(existing.slice(0, 20)));
    } catch {
      // ignore storage errors
    }

    // 2. Dispatch to backend Express endpoint to relay to Telegram Bot
    try {
      const res = await fetch('/api/report-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReport),
      });

      if (res.ok) {
        const data = await res.json();
        setTelegramStatus({
          delivered: Boolean(data.telegramDelivered),
          configured: Boolean(data.telegramConfigured),
        });
      }
    } catch (err) {
      console.warn('Backend Telegram dispatch endpoint unreachable:', err);
    } finally {
      setIsSubmitting(false);
      setSubmittedReport(newReport);
    }
  };

  const generateReportSummary = (report: IssueReport) => {
    return `🚨 COMPRESSOR ISSUE REPORT [${report.id}]
Ticket: ${report.id}
Category: ${report.category}
Severity: ${report.severity.toUpperCase()}
Reported By: ${report.userName || 'Anonymous'} ${report.userEmail ? `(${report.userEmail})` : ''}
Date: ${new Date(report.createdAt).toLocaleString()}

Subject: ${report.subject}

Description:
${report.description}

${report.fileType ? `File Type: ${report.fileType}` : ''}
${report.fileSizeApprox ? `File Size: ${report.fileSizeApprox}` : ''}
Diagnostics: ${report.browserInfo}`;
  };

  const handleOpenTelegramDirect = (report: IssueReport) => {
    const text = encodeURIComponent(generateReportSummary(report));
    window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${text}`, '_blank');
  };

  const handleOpenMailClient = (report: IssueReport) => {
    const mailSubject = encodeURIComponent(`[Compressor Issue ${report.id}] ${report.subject}`);
    const mailBody = encodeURIComponent(generateReportSummary(report));
    window.location.href = `mailto:${DEVELOPER_EMAIL}?subject=${mailSubject}&body=${mailBody}`;
  };

  const handleCopyReport = (report: IssueReport) => {
    const text = generateReportSummary(report);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleResetForm = () => {
    setSubmittedReport(null);
    setSubject('');
    setDescription('');
    setErrorMsg('');
  };

  return (
    <div
      id="report-issue-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="report-issue-modal-dialog"
        className="w-full max-w-lg bg-white dark:bg-[#1c1c1e] rounded-[24px] border border-black/[0.08] dark:border-white/[0.12] shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 transition-colors"
      >
        {/* macOS Sheet Header */}
        <div className="px-6 py-4.5 border-b border-black/[0.06] dark:border-white/[0.08] bg-[#fafafc] dark:bg-[#252528] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#ff3b30]/10 text-[#ff3b30] flex items-center justify-center">
              <Bug className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                Report an Issue
              </h3>
              <p className="text-[11px] text-[#86868b] dark:text-[#8e8e93]">
                Instant Telegram & direct developer dispatch
              </p>
            </div>
          </div>

          <button
            id="close-report-modal-btn"
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-black/[0.05] dark:bg-white/[0.08] hover:bg-black/[0.1] dark:hover:bg-white/[0.15] text-[#6e6e73] dark:text-[#a1a1a6] hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7] flex items-center justify-center transition-colors focus:outline-none cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-[13px]">
          {submittedReport ? (
            /* Success & Telegram Delivery Confirmation View */
            <div className="py-3 space-y-4 text-center">
              <div className="w-13 h-13 rounded-full bg-[#34c759]/10 text-[#34c759] mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 stroke-[2.5]" />
              </div>

              <div className="space-y-1">
                <h4 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                  Issue Registered
                </h4>
                <p className="text-[13px] text-[#86868b] dark:text-[#8e8e93]">
                  Ticket <span className="font-mono font-medium text-[#1d1d1f] dark:text-[#f5f5f7] bg-black/[0.05] dark:bg-white/[0.08] px-1.5 py-0.5 rounded">{submittedReport.id}</span>
                </p>
              </div>

              {/* Realtime Telegram Status Indicator */}
              {telegramStatus.delivered ? (
                <div className="p-3 rounded-2xl bg-[#0071e3]/10 dark:bg-[#2997ff]/20 border border-[#0071e3]/20 dark:border-[#2997ff]/30 text-[#0071e3] dark:text-[#2997ff] text-[12px] flex items-center justify-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#0071e3] dark:text-[#2997ff]" />
                  <span className="font-medium">Direct Telegram bot alert delivered successfully!</span>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-[#fafafc] dark:bg-[#252528] border border-black/[0.06] dark:border-white/[0.08] text-[#6e6e73] dark:text-[#a1a1a6] text-[12px] space-y-1 text-left">
                  <div className="flex items-center gap-1.5 text-[#1d1d1f] dark:text-[#f5f5f7] font-medium">
                    <MessageSquare className="w-3.5 h-3.5 text-[#0071e3] dark:text-[#2997ff]" />
                    <span>Telegram Bot Dispatch Ready</span>
                  </div>
                  <p className="text-[11px] text-[#86868b] dark:text-[#8e8e93]">
                    To enable instant automated bot delivery to your Telegram, configure <code className="bg-black/[0.05] dark:bg-white/[0.08] px-1 py-0.5 rounded text-[#1d1d1f] dark:text-[#f5f5f7]">TELEGRAM_BOT_TOKEN</code> and <code className="bg-black/[0.05] dark:bg-white/[0.08] px-1 py-0.5 rounded text-[#1d1d1f] dark:text-[#f5f5f7]">TELEGRAM_CHAT_ID</code> in settings. You can also send or copy the full report below.
                  </p>
                </div>
              )}

              {/* Report Summary Card */}
              <div className="p-4 rounded-2xl bg-[#fafafc] dark:bg-[#252528] border border-black/[0.06] dark:border-white/[0.08] text-left text-[12px] space-y-2">
                <div className="flex justify-between text-[#86868b] dark:text-[#8e8e93]">
                  <span>Subject:</span>
                  <span className="font-medium text-[#1d1d1f] dark:text-[#f5f5f7] truncate max-w-[240px]">{submittedReport.subject}</span>
                </div>
                <div className="flex justify-between text-[#86868b] dark:text-[#8e8e93]">
                  <span>Description:</span>
                  <span className="font-medium text-[#1d1d1f] dark:text-[#f5f5f7] truncate max-w-[240px]">{submittedReport.description}</span>
                </div>
                <div className="flex justify-between text-[#86868b] dark:text-[#8e8e93]">
                  <span>Category:</span>
                  <span className="font-medium text-[#1d1d1f] dark:text-[#f5f5f7] capitalize">{submittedReport.category.replace('_', ' ')}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  id="telegram-direct-share-btn"
                  onClick={() => handleOpenTelegramDirect(submittedReport)}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] active:bg-[#0062c4] text-white font-medium text-[13px] shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Send Whole Description on Telegram</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    id="copy-report-text-btn"
                    onClick={() => handleCopyReport(submittedReport)}
                    className="py-2 px-3 rounded-xl bg-[#f5f5f7] dark:bg-[#2c2c2e] hover:bg-[#e8e8ed] dark:hover:bg-[#3a3a3c] text-[#1d1d1f] dark:text-[#f5f5f7] font-medium text-[12px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#34c759]" />
                        <span className="text-[#34c759]">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[#86868b] dark:text-[#8e8e93]" />
                        <span>Copy Report</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    id="send-email-direct-btn"
                    onClick={() => handleOpenMailClient(submittedReport)}
                    className="py-2 px-3 rounded-xl bg-[#f5f5f7] dark:bg-[#2c2c2e] hover:bg-[#e8e8ed] dark:hover:bg-[#3a3a3c] text-[#1d1d1f] dark:text-[#f5f5f7] font-medium text-[12px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5 text-[#86868b] dark:text-[#8e8e93]" />
                    <span>Email Developer</span>
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="text-[12px] text-[#0071e3] dark:text-[#2997ff] hover:underline cursor-pointer"
                >
                  Report Another Issue
                </button>
                <span className="text-[#86868b] dark:text-[#8e8e93]">•</span>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-[12px] text-[#86868b] dark:text-[#8e8e93] hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7] cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            /* Input Form View */
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-[#ff3b30]/10 border border-[#ff3b30]/20 text-[#ff3b30] text-[12px] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Issue Type Category */}
              <div>
                <label className="block text-[#1d1d1f] dark:text-[#f5f5f7] font-medium mb-1.5">
                  Issue Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'file_error', label: 'File Error', icon: FileWarning },
                    { id: 'compression_bug', label: 'Quality / Bug', icon: Bug },
                    { id: 'performance', label: 'Performance', icon: Sparkles },
                    { id: 'ui_glitch', label: 'UI Glitch', icon: AlertCircle },
                    { id: 'feature_request', label: 'Idea / Feature', icon: HelpCircle },
                    { id: 'other', label: 'Other', icon: Mail },
                  ].map((item) => {
                    const isSelected = category === item.id;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setCategory(item.id as any)}
                        className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#f0f6ff] dark:bg-[#182635] border-[#0071e3] dark:border-[#2997ff] text-[#0071e3] dark:text-[#2997ff] font-medium'
                            : 'bg-white dark:bg-[#252528] border-black/[0.08] dark:border-white/[0.08] text-[#6e6e73] dark:text-[#a1a1a6] hover:bg-[#fafafc] dark:hover:bg-[#2c2c2e]'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-[#0071e3] dark:text-[#2997ff]' : 'text-[#86868b] dark:text-[#8e8e93]'}`} />
                        <span className="text-[12px] truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Subject */}
              <div>
                <label htmlFor="issue-subject-input" className="block text-[#1d1d1f] dark:text-[#f5f5f7] font-medium mb-1">
                  Subject / Summary *
                </label>
                <input
                  id="issue-subject-input"
                  type="text"
                  placeholder="e.g. PDF compression failed or output quality is low"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#252528] border border-black/[0.12] dark:border-white/[0.12] text-[#1d1d1f] dark:text-[#f5f5f7] placeholder:text-[#86868b] dark:placeholder:text-[#8e8e93] focus:outline-none focus:ring-2 focus:ring-[#0071e3] dark:focus:ring-[#2997ff] transition-all"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="issue-description-input" className="block text-[#1d1d1f] dark:text-[#f5f5f7] font-medium mb-1">
                  Whole Description of Issue *
                </label>
                <textarea
                  id="issue-description-input"
                  rows={4}
                  placeholder="Write the full description of what happened, file details, steps taken, or anything else you'd like to share..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#252528] border border-black/[0.12] dark:border-white/[0.12] text-[#1d1d1f] dark:text-[#f5f5f7] placeholder:text-[#86868b] dark:placeholder:text-[#8e8e93] focus:outline-none focus:ring-2 focus:ring-[#0071e3] dark:focus:ring-[#2997ff] transition-all resize-none"
                  required
                />
              </div>

              {/* Contact info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="user-name-input" className="block text-[#1d1d1f] dark:text-[#f5f5f7] font-medium mb-1">
                    Your Name / Telegram Handle (Optional)
                  </label>
                  <input
                    id="user-name-input"
                    type="text"
                    placeholder="e.g. @username or Alex"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#252528] border border-black/[0.12] dark:border-white/[0.12] text-[#1d1d1f] dark:text-[#f5f5f7] placeholder:text-[#86868b] dark:placeholder:text-[#8e8e93] focus:outline-none focus:ring-2 focus:ring-[#0071e3] dark:focus:ring-[#2997ff] transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="user-email-input" className="block text-[#1d1d1f] dark:text-[#f5f5f7] font-medium mb-1">
                    Your Email (Optional)
                  </label>
                  <input
                    id="user-email-input"
                    type="email"
                    placeholder="For response & updates"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#252528] border border-black/[0.12] dark:border-white/[0.12] text-[#1d1d1f] dark:text-[#f5f5f7] placeholder:text-[#86868b] dark:placeholder:text-[#8e8e93] focus:outline-none focus:ring-2 focus:ring-[#0071e3] dark:focus:ring-[#2997ff] transition-all"
                  />
                </div>
              </div>

              {/* Severity & Context Checkboxes */}
              <div className="pt-1 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[#1d1d1f] dark:text-[#f5f5f7] font-medium text-[12px]">
                    Impact Severity:
                  </label>
                  <div className="flex items-center gap-1">
                    {(['low', 'medium', 'high'] as const).map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setSeverity(lvl)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium capitalize transition-colors cursor-pointer ${
                          severity === lvl
                            ? lvl === 'high'
                              ? 'bg-[#ff3b30] text-white'
                              : 'bg-[#0071e3] dark:bg-[#2997ff] text-white'
                            : 'bg-black/[0.05] dark:bg-white/[0.08] text-[#6e6e73] dark:text-[#a1a1a6] hover:bg-black/[0.08] dark:hover:bg-white/[0.12]'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                {activeFile && (
                  <label className="flex items-center gap-2 cursor-pointer text-[#6e6e73] dark:text-[#a1a1a6] text-[12px]">
                    <input
                      type="checkbox"
                      checked={includeActiveFileInfo}
                      onChange={(e) => setIncludeActiveFileInfo(e.target.checked)}
                      className="rounded accent-[#0071e3]"
                    />
                    <span>Attach active file details ({activeFile.name})</span>
                  </label>
                )}

                <label className="flex items-center gap-2 cursor-pointer text-[#6e6e73] dark:text-[#a1a1a6] text-[12px]">
                  <input
                    type="checkbox"
                    checked={includeSystemInfo}
                    onChange={(e) => setIncludeSystemInfo(e.target.checked)}
                    className="rounded accent-[#0071e3]"
                  />
                  <span>Include browser diagnostic details</span>
                </label>
              </div>

              {/* Submit Button */}
              <div className="pt-3 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between gap-3">
                <p className="text-[11px] text-[#86868b] dark:text-[#8e8e93]">
                  Sends to <strong className="text-[#1d1d1f] dark:text-[#f5f5f7] font-medium">Telegram Bot</strong>
                </p>

                <button
                  type="submit"
                  id="submit-report-issue-btn"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] active:bg-[#0062c4] text-white font-medium text-[13px] shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Sending…' : 'Submit to Telegram'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

