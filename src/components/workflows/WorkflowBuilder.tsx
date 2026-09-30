import React, { useState } from 'react';
import {
  X,
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  Settings2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  WORKFLOW_MAX_STEPS,
  FRONTEND_WORKFLOW_TOOLS,
  checkChainCompatibility,
  WorkflowToolItem,
} from './workflowRegistry';
import { WorkflowItem } from '../../services/workflowApi';

interface WorkflowBuilderProps {
  initialWorkflow?: WorkflowItem | null;
  onSave: (name: string, description: string, steps: Array<{ tool_key: string; configuration: Record<string, any> }>) => Promise<void>;
  onClose: () => void;
}

export const WorkflowBuilder: React.FC<WorkflowBuilderProps> = ({
  initialWorkflow,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState(initialWorkflow?.name || '');
  const [description, setDescription] = useState(initialWorkflow?.description || '');
  const [steps, setSteps] = useState<Array<{ tool_key: string; configuration: Record<string, any> }>>(() => {
    if (initialWorkflow?.steps && initialWorkflow.steps.length > 0) {
      return initialWorkflow.steps.map((s) => ({
        tool_key: s.tool_key,
        configuration: { ...s.configuration },
      }));
    }
    return [
      { tool_key: 'merge', configuration: { addBlankSeparators: false } },
      { tool_key: 'compress', configuration: { level: 'medium' } },
    ];
  });

  const [expandedConfigIndex, setExpandedConfigIndex] = useState<number | null>(null);
  const [isAddingStep, setIsAddingStep] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Validate chain compatibility
  const getCompatibilityErrors = (): string[] => {
    const errors: string[] = [];
    let currentOutputType = 'pdf';

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const tool = FRONTEND_WORKFLOW_TOOLS[step.tool_key];
      if (!tool) continue;

      if (i > 0) {
        const compat = checkChainCompatibility(currentOutputType as any, step.tool_key);
        if (!compat.compatible) {
          errors.push(`Step ${i + 1} (${tool.label}): ${compat.error}`);
        }
      }
      currentOutputType = tool.outputType;
    }
    return errors;
  };

  const compatibilityErrors = getCompatibilityErrors();

  const handleAddStep = (toolKey: string) => {
    if (steps.length >= WORKFLOW_MAX_STEPS) return;
    const tool = FRONTEND_WORKFLOW_TOOLS[toolKey];
    if (!tool) return;

    const newSteps = [
      ...steps,
      { tool_key: toolKey, configuration: { ...tool.defaultConfig } },
    ];
    setSteps(newSteps);
    setIsAddingStep(false);
    setValidationError(null);
  };

  const handleRemoveStep = (index: number) => {
    if (steps.length <= 1) {
      setValidationError('A workflow must have at least 1 step.');
      return;
    }
    const newSteps = steps.filter((_, i) => i !== index);
    setSteps(newSteps);
    if (expandedConfigIndex === index) setExpandedConfigIndex(null);
    setValidationError(null);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newSteps = [...steps];
    const temp = newSteps[index - 1];
    newSteps[index - 1] = newSteps[index];
    newSteps[index] = temp;
    setSteps(newSteps);
    setExpandedConfigIndex(null);
  };

  const handleMoveDown = (index: number) => {
    if (index === steps.length - 1) return;
    const newSteps = [...steps];
    const temp = newSteps[index + 1];
    newSteps[index + 1] = newSteps[index];
    newSteps[index] = temp;
    setSteps(newSteps);
    setExpandedConfigIndex(null);
  };

  const handleUpdateConfig = (stepIndex: number, field: string, value: any) => {
    const newSteps = [...steps];
    newSteps[stepIndex] = {
      ...newSteps[stepIndex],
      configuration: {
        ...newSteps[stepIndex].configuration,
        [field]: value,
      },
    };
    setSteps(newSteps);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setValidationError('Please enter a workflow name.');
      return;
    }

    if (steps.length === 0) {
      setValidationError('Please add at least one step.');
      return;
    }

    if (compatibilityErrors.length > 0) {
      setValidationError(compatibilityErrors[0]);
      return;
    }

    setIsSaving(true);
    setValidationError(null);

    try {
      await onSave(name.trim(), description.trim(), steps);
      onClose();
    } catch (err: any) {
      setValidationError(err.message || 'Failed to save workflow.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-[#101935] rounded-3xl border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-black/5 dark:border-white/10">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#055EFE]/10 text-[#055EFE] dark:text-[#528BFF] text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{initialWorkflow ? 'Edit Workflow' : 'Create New Workflow'}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#0C162C] dark:text-white">
              {initialWorkflow ? 'Configure Workflow' : 'Design Workflow Pipeline'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Validation Banner */}
          {validationError && (
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs sm:text-sm font-semibold">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}

          {compatibilityErrors.length > 0 && !validationError && (
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs sm:text-sm font-semibold">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span>Incompatible Step Chain Detected:</span>
                <ul className="list-disc pl-4 space-y-0.5 text-xs">
                  {compatibilityErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Workflow Metadata */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                Workflow Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. University Submission, Monthly Invoice Prep"
                className="w-full px-4 py-3 rounded-xl border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-[#0C162C] dark:text-white font-medium text-sm focus:outline-none focus:border-[#055EFE] transition-colors"
                maxLength={120}
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                Description (Optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Merges assignments, compresses under 10MB, and stamps watermark"
                className="w-full px-4 py-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-[#0C162C] dark:text-white text-xs sm:text-sm focus:outline-none focus:border-[#055EFE] transition-colors"
                maxLength={250}
              />
            </div>
          </div>

          {/* Workflow Steps Sequence */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Pipeline Steps ({steps.length} / {WORKFLOW_MAX_STEPS})
              </span>
              <span className="text-xs text-slate-400">
                Output of each step feeds the next step
              </span>
            </div>

            <div className="space-y-2">
              {steps.map((step, idx) => {
                const tool = FRONTEND_WORKFLOW_TOOLS[step.tool_key];
                const isExpanded = expandedConfigIndex === idx;

                return (
                  <div
                    key={`${step.tool_key}-${idx}`}
                    className="rounded-2xl border border-black/10 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.04] p-4 transition-all"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-[#055EFE] text-white flex items-center justify-center font-bold text-xs">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-[#0C162C] dark:text-white">
                              {tool?.label || step.tool_key}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                              {tool?.category}
                            </span>
                          </div>
                          <span className="text-xs text-slate-400 line-clamp-1">
                            {tool?.description}
                          </span>
                        </div>
                      </div>

                      {/* Controls: Up, Down, Config, Delete */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMoveUp(idx)}
                          disabled={idx === 0}
                          title="Move up"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#0C162C] dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveDown(idx)}
                          disabled={idx === steps.length - 1}
                          title="Move down"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#0C162C] dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setExpandedConfigIndex(isExpanded ? null : idx)}
                          title="Configure parameters"
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            isExpanded
                              ? 'bg-[#055EFE]/15 text-[#055EFE]'
                              : 'text-slate-400 hover:text-[#055EFE] hover:bg-black/5 dark:hover:bg-white/5'
                          }`}
                        >
                          <Settings2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveStep(idx)}
                          title="Remove step"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Step Configuration Drawer */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/10 space-y-3 animate-in fade-in duration-150">
                        {step.tool_key === 'compress' && (
                          <div>
                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                              Compression Profile
                            </label>
                            <select
                              value={step.configuration?.level || 'medium'}
                              onChange={(e) => handleUpdateConfig(idx, 'level', e.target.value)}
                              className="w-full px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#182346] text-xs font-medium text-[#0C162C] dark:text-white focus:outline-none"
                            >
                              <option value="high">Extreme Compression (Maximum size reduction)</option>
                              <option value="medium">Recommended (Balanced quality and size)</option>
                              <option value="low">Less Compression (Near-lossless crisp quality)</option>
                            </select>
                          </div>
                        )}

                        {step.tool_key === 'watermark' && (
                          <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                                Watermark Text
                              </label>
                              <input
                                type="text"
                                value={step.configuration?.text || 'CONFIDENTIAL'}
                                onChange={(e) => handleUpdateConfig(idx, 'text', e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#182346] text-xs text-[#0C162C] dark:text-white focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                                Position
                              </label>
                              <select
                                value={step.configuration?.position || 'center'}
                                onChange={(e) => handleUpdateConfig(idx, 'position', e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#182346] text-xs text-[#0C162C] dark:text-white focus:outline-none"
                              >
                                <option value="center">Center (Diagonal)</option>
                                <option value="top">Top Header</option>
                                <option value="bottom">Bottom Footer</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                                Color
                              </label>
                              <select
                                value={step.configuration?.color || 'gray'}
                                onChange={(e) => handleUpdateConfig(idx, 'color', e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#182346] text-xs text-[#0C162C] dark:text-white focus:outline-none"
                              >
                                <option value="gray">Gray (Subtle)</option>
                                <option value="red">Red (Warning)</option>
                                <option value="blue">Blue (Official)</option>
                                <option value="black">Black</option>
                              </select>
                            </div>
                          </div>
                        )}

                        {step.tool_key === 'rotate' && (
                          <div>
                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                              Rotation Angle
                            </label>
                            <select
                              value={step.configuration?.rotationAngle || 90}
                              onChange={(e) => handleUpdateConfig(idx, 'rotationAngle', Number(e.target.value))}
                              className="w-full px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#182346] text-xs text-[#0C162C] dark:text-white focus:outline-none"
                            >
                              <option value={90}>90° Clockwise</option>
                              <option value={180}>180° Half Turn</option>
                              <option value={270}>270° Counter-Clockwise</option>
                            </select>
                          </div>
                        )}

                        {step.tool_key === 'split' && (
                          <div>
                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                              Page Ranges to Extract
                            </label>
                            <input
                              type="text"
                              value={step.configuration?.pageRanges || '1-3'}
                              onChange={(e) => handleUpdateConfig(idx, 'pageRanges', e.target.value)}
                              placeholder="e.g. 1-3, 5, 8-10"
                              className="w-full px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#182346] text-xs text-[#0C162C] dark:text-white focus:outline-none"
                            />
                          </div>
                        )}

                        {step.tool_key === 'merge' && (
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`sep-${idx}`}
                              checked={!!step.configuration?.addBlankSeparators}
                              onChange={(e) => handleUpdateConfig(idx, 'addBlankSeparators', e.target.checked)}
                              className="rounded accent-[#055EFE]"
                            />
                            <label htmlFor={`sep-${idx}`} className="text-xs font-medium text-slate-600 dark:text-slate-300">
                              Insert blank page separator between documents
                            </label>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add Step Button */}
            {steps.length < WORKFLOW_MAX_STEPS && (
              <div className="pt-2">
                {!isAddingStep ? (
                  <button
                    type="button"
                    onClick={() => setIsAddingStep(true)}
                    className="w-full py-3 rounded-2xl border-2 border-dashed border-black/15 dark:border-white/15 hover:border-[#055EFE] dark:hover:border-[#528BFF] text-xs sm:text-sm font-bold text-[#055EFE] dark:text-[#528BFF] flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Step ({steps.length}/{WORKFLOW_MAX_STEPS})</span>
                  </button>
                ) : (
                  <div className="p-4 rounded-2xl border border-[#055EFE]/30 bg-[#055EFE]/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#0C162C] dark:text-white uppercase tracking-wider">
                        Choose Next Tool to Add
                      </span>
                      <button
                        onClick={() => setIsAddingStep(false)}
                        className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {Object.values(FRONTEND_WORKFLOW_TOOLS).map((tool) => (
                        <button
                          key={tool.key}
                          type="button"
                          onClick={() => handleAddStep(tool.key)}
                          className="flex flex-col items-start p-3 rounded-xl bg-white dark:bg-[#162142] border border-black/10 dark:border-white/10 hover:border-[#055EFE] text-left transition-all cursor-pointer"
                        >
                          <span className="text-xs font-bold text-[#0C162C] dark:text-white">
                            {tool.label}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {tool.category} &bull; Outputs {tool.outputType.toUpperCase()}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-black/5 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.02]">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-black/10 dark:border-white/10 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || compatibilityErrors.length > 0}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#055EFE] hover:bg-[#044ECC] disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer"
          >
            {isSaving ? (
              <span>Saving…</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>{initialWorkflow ? 'Save Changes' : 'Save Workflow'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
