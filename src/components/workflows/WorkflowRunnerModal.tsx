import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Download,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Loader2,
  Clock,
  Layers,
} from 'lucide-react';
import { WorkflowItem, workflowApi, RunWorkflowResponse } from '../../services/workflowApi';
import { FRONTEND_WORKFLOW_TOOLS } from './workflowRegistry';
import confetti from 'canvas-confetti';

interface WorkflowRunnerModalProps {
  workflow: WorkflowItem;
  onClose: () => void;
  onEditWorkflow?: (workflow: WorkflowItem) => void;
}

export const WorkflowRunnerModal: React.FC<WorkflowRunnerModalProps> = ({
  workflow,
  onClose,
  onEditWorkflow,
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [stepStatusText, setStepStatusText] = useState('Uploading documents…');
  const [result, setResult] = useState<RunWorkflowResponse | null>(null);
  const [errorState, setErrorState] = useState<{ step?: number; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const steps = workflow.steps || [];
  const firstStep = steps[0];
  const allowsMultipleFiles = firstStep?.tool_key === 'merge';

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files).filter((f) =>
      f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );

    if (droppedFiles.length > 0) {
      setFiles(allowsMultipleFiles ? droppedFiles : [droppedFiles[0]]);
      setErrorState(null);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = Array.from(e.target.files);
      setFiles(allowsMultipleFiles ? selected : [selected[0]]);
      setErrorState(null);
    }
  };

  const handleStartWorkflow = async () => {
    if (files.length === 0) return;
    setIsRunning(true);
    setErrorState(null);
    setResult(null);
    setActiveStepIndex(0);
    setStepStatusText('Uploading input documents…');

    try {
      // Simulate live visual progress milestones while backend pipeline processes
      const progressTimer = setInterval(() => {
        setActiveStepIndex((prev) => {
          if (prev < steps.length) {
            const nextIdx = prev + 1;
            const currentTool = FRONTEND_WORKFLOW_TOOLS[steps[nextIdx - 1]?.tool_key];
            setStepStatusText(`Executing ${currentTool?.label || 'step'}…`);
            return nextIdx;
          }
          return prev;
        });
      }, 700);

      const response = await workflowApi.runWorkflow(workflow.id, files);
      clearInterval(progressTimer);

      setActiveStepIndex(steps.length + 1);
      setResult(response);
      setIsRunning(false);

      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
        });
      } catch {
        // ignore
      }
    } catch (err: any) {
      setIsRunning(false);
      setErrorState({
        step: activeStepIndex || 1,
        message: err.message || 'Workflow execution was interrupted.',
      });
    }
  };

  const handleDownloadResult = () => {
    if (!result?.downloadUrl) return;
    const a = document.createElement('a');
    a.href = result.downloadUrl;
    a.download = result.outputFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl flex flex-col bg-white dark:bg-[#101935] rounded-3xl border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-black/5 dark:border-white/10">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#055EFE]/10 text-[#055EFE] dark:text-[#528BFF] text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Automated Execution</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#0C162C] dark:text-white">
              {workflow.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isRunning}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-6">
          {/* SUCCESS STATE */}
          {result ? (
            <div className="text-center py-6 space-y-6 animate-in fade-in duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center mx-auto text-2xl">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-extrabold text-[#0C162C] dark:text-white">
                  Workflow Completed!
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  Processed {files.length} document{files.length > 1 ? 's' : ''} through all {steps.length} steps in {(result.durationMs / 1000).toFixed(1)}s.
                </p>
              </div>

              {/* Pipeline summary pill */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                {steps.map((s, idx) => (
                  <React.Fragment key={idx}>
                    <span className="px-2.5 py-1 rounded-lg bg-black/5 dark:bg-white/10">
                      {FRONTEND_WORKFLOW_TOOLS[s.tool_key]?.label || s.tool_key}
                    </span>
                    {idx < steps.length - 1 && <span className="text-slate-400">→</span>}
                  </React.Fragment>
                ))}
              </div>

              {/* Download CTA Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleDownloadResult}
                  className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full bg-[#055EFE] hover:bg-[#044ECC] text-white font-bold text-sm shadow-lg shadow-[#055EFE]/25 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download {result.outputFileName}</span>
                </button>
              </div>
            </div>
          ) : isRunning ? (
            /* RUNNING / PROGRESS STATE */
            <div className="py-6 space-y-6 animate-in fade-in duration-200">
              <div className="space-y-2 text-center">
                <h3 className="text-lg font-bold text-[#0C162C] dark:text-white flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 text-[#055EFE] animate-spin" />
                  <span>Running Automated Workflow…</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {stepStatusText}
                </p>
              </div>

              {/* Step Checklist */}
              <div className="space-y-2.5 max-w-md mx-auto">
                {/* Upload Milestone */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-black/5 dark:bg-white/5 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="text-slate-700 dark:text-slate-200">Upload {files.length} document{files.length > 1 ? 's' : ''}</span>
                </div>

                {steps.map((step, idx) => {
                  const tool = FRONTEND_WORKFLOW_TOOLS[step.tool_key];
                  const isDone = activeStepIndex > idx + 1;
                  const isCurrent = activeStepIndex === idx + 1;

                  return (
                    <div
                      key={idx}
                      className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition-all ${
                        isDone
                          ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300'
                          : isCurrent
                          ? 'border-[#055EFE]/30 bg-[#055EFE]/10 text-[#055EFE] dark:text-[#528BFF]'
                          : 'border-black/5 dark:border-white/5 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        ) : isCurrent ? (
                          <Loader2 className="w-4 h-4 text-[#055EFE] animate-spin shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600 shrink-0" />
                        )}
                        <span>{tool?.label || step.tool_key}</span>
                      </div>
                      <span className="text-[10px] uppercase font-bold tracking-wider">
                        {isDone ? 'Completed' : isCurrent ? 'Processing…' : 'Queued'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* UPLOAD & START STATE */
            <div className="space-y-6">
              {/* Failure Alert (if previous run failed) */}
              {errorState && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs sm:text-sm space-y-2">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Workflow halted at Step {errorState.step}</span>
                  </div>
                  <p className="text-xs leading-relaxed font-normal opacity-90">
                    {errorState.message} Your original files were not modified.
                  </p>
                </div>
              )}

              {/* Pipeline Overview */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Execution Pipeline ({steps.length} Steps)
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {steps.map((s, idx) => (
                    <React.Fragment key={idx}>
                      <span className="px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs font-bold text-[#0C162C] dark:text-white">
                        {idx + 1}. {FRONTEND_WORKFLOW_TOOLS[s.tool_key]?.label || s.tool_key}
                      </span>
                      {idx < steps.length - 1 && <span className="text-slate-400 text-xs">→</span>}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Single File Upload Dropzone */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  multiple={allowsMultipleFiles}
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-[#055EFE] bg-[#055EFE]/5 scale-[0.99]'
                      : files.length > 0
                      ? 'border-emerald-500/40 bg-emerald-500/5'
                      : 'border-black/15 dark:border-white/15 hover:border-[#055EFE] dark:hover:border-[#528BFF]'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#055EFE]/10 text-[#055EFE] flex items-center justify-center mx-auto">
                      <Upload className="w-6 h-6" />
                    </div>
                    {files.length > 0 ? (
                      <div className="space-y-1">
                        <span className="text-sm font-bold text-[#0C162C] dark:text-white block">
                          {files.length} document{files.length > 1 ? 's' : ''} selected
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 block">
                          {files.map((f) => f.name).join(', ')}
                        </span>
                        <span className="text-[11px] text-[#055EFE] font-bold block pt-1">
                          Click or drop to replace
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <span className="text-sm font-bold text-[#0C162C] dark:text-white block">
                          Drop PDF {allowsMultipleFiles ? 'documents' : 'document'} here
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 block">
                          {allowsMultipleFiles
                            ? 'Upload multiple PDFs to merge and process'
                            : 'Upload your document once — intermediate steps run automatically'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-black/5 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.02]">
          {result ? (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl border border-black/10 dark:border-white/10 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              Close
            </button>
          ) : (
            <>
              {onEditWorkflow && !isRunning && (
                <button
                  type="button"
                  onClick={() => onEditWorkflow(workflow)}
                  className="text-xs font-bold text-slate-500 hover:text-[#055EFE] transition-colors cursor-pointer"
                >
                  Edit Workflow Steps
                </button>
              )}

              <div className="flex items-center gap-3 ml-auto">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isRunning}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleStartWorkflow}
                  disabled={files.length === 0 || isRunning}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#055EFE] hover:bg-[#044ECC] disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing…</span>
                    </>
                  ) : errorState ? (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      <span>Retry Workflow</span>
                    </>
                  ) : (
                    <>
                      <span>Run Workflow</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
