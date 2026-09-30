import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Plus,
  Play,
  Pencil,
  Copy,
  Trash2,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Shield,
  Workflow as WorkflowIcon,
  HelpCircle,
  FileText,
  ChevronRight,
  Filter,
  Search,
} from 'lucide-react';
import {
  workflowApi,
  WorkflowItem,
  WorkflowTemplateItem,
} from '../../services/workflowApi';
import { FRONTEND_WORKFLOW_TOOLS } from './workflowRegistry';
import { WorkflowBuilder } from './WorkflowBuilder';
import { WorkflowRunnerModal } from './WorkflowRunnerModal';

interface WorkflowsViewProps {
  onBackToHome: () => void;
}

export const WorkflowsView: React.FC<WorkflowsViewProps> = ({ onBackToHome }) => {
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [templates, setTemplates] = useState<WorkflowTemplateItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active tab
  const [activeTab, setActiveTab] = useState<'my_workflows' | 'templates'>('my_workflows');

  // Modals state
  const [isBuilderOpen, setIsBuilderOpen] = useState<boolean>(false);
  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowItem | null>(null);
  const [runningWorkflow, setRunningWorkflow] = useState<WorkflowItem | null>(null);
  const [deletingWorkflow, setDeletingWorkflow] = useState<WorkflowItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Search filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // Load workflows and templates
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [wfList, tmplList] = await Promise.all([
        workflowApi.listWorkflows().catch((e) => {
          console.error('Error fetching workflows:', e);
          return [] as WorkflowItem[];
        }),
        workflowApi.getTemplates().catch((e) => {
          console.error('Error fetching templates:', e);
          return [] as WorkflowTemplateItem[];
        }),
      ]);
      setWorkflows(wfList);
      setTemplates(tmplList);
    } catch (err: any) {
      setError(err?.message || 'Failed to load workflows. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Show transient toast
  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 3500);
  };

  // Duplicate workflow
  const handleDuplicate = async (workflow: WorkflowItem) => {
    try {
      const cloned = await workflowApi.duplicateWorkflow(workflow.id);
      setWorkflows((prev) => [cloned, ...prev]);
      showToast(`Duplicated "${workflow.name}" successfully!`);
    } catch (err: any) {
      showToast(err?.message || 'Failed to duplicate workflow.', 'info');
    }
  };

  // Delete workflow
  const confirmDelete = async () => {
    if (!deletingWorkflow) return;
    setIsDeleting(true);
    try {
      await workflowApi.deleteWorkflow(deletingWorkflow.id);
      setWorkflows((prev) => prev.filter((w) => w.id !== deletingWorkflow.id));
      showToast(`Deleted "${deletingWorkflow.name}".`);
      setDeletingWorkflow(null);
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete workflow.', 'info');
    } finally {
      setIsDeleting(false);
    }
  };

  // Save workflow from builder
  const handleSaveWorkflow = async (
    name: string,
    description: string,
    steps: Array<{ tool_key: string; configuration: Record<string, any> }>
  ) => {
    if (editingWorkflow) {
      const updated = await workflowApi.updateWorkflow(editingWorkflow.id, name, description, steps);
      setWorkflows((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
      showToast(`Updated "${name}" successfully.`);
    } else {
      const created = await workflowApi.createWorkflow(name, description, steps);
      setWorkflows((prev) => [created, ...prev]);
      showToast(`Created workflow "${name}"!`);
      setActiveTab('my_workflows');
    }
    setIsBuilderOpen(false);
    setEditingWorkflow(null);
  };

  // Use prebuilt template
  const handleUseTemplate = async (template: WorkflowTemplateItem) => {
    try {
      const created = await workflowApi.createWorkflow(template.name, template.description, template.steps);
      setWorkflows((prev) => [created, ...prev]);
      showToast(`Added "${template.name}" to My Workflows!`);
      setActiveTab('my_workflows');
    } catch (err: any) {
      showToast(err?.message || 'Could not instantiate template.', 'info');
    }
  };

  const filteredWorkflows = workflows.filter((w) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      w.name.toLowerCase().includes(query) ||
      (w.description && w.description.toLowerCase().includes(query)) ||
      w.steps.some((s) => s.tool_key.toLowerCase().includes(query))
    );
  });

  return (
    <div className="w-full max-w-5xl mx-auto py-6 sm:py-10 animate-in fade-in duration-300">
      {/* ─── TOAST NOTIFICATION ───────────────────────────────────────── */}
      {notification && (
        <div className="fixed top-20 right-6 z-50 animate-in slide-in-from-top-4 fade-in duration-200">
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#0C162C] dark:bg-white text-white dark:text-[#0C162C] shadow-2xl border border-white/10 dark:border-black/10">
            <CheckCircle2 className="w-4 h-4 text-[#00ff87] dark:text-[#055EFE] shrink-0" />
            <span className="text-xs font-semibold">{notification.message}</span>
          </div>
        </div>
      )}

      {/* ─── TOP ACTION BAR / BACK BUTTON ─────────────────────────────── */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-200/80 dark:border-white/10">
        <button
          onClick={onBackToHome}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
        >
          <span>← Back to All Tools</span>
        </button>

        <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          <span className="w-2 h-2 rounded-full bg-[#055EFE] animate-pulse"></span>
          <span>Automated Pipeline Engine</span>
        </div>
      </div>

      {/* ─── HERO HEADER ──────────────────────────────────────────────── */}
      <div className="relative pt-8 sm:pt-12 pb-8 sm:pb-12 text-center px-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#055EFE]/10 border border-[#055EFE]/20 text-[#055EFE] text-xs font-bold uppercase tracking-wider mb-4">
          <WorkflowIcon className="w-3.5 h-3.5" />
          <span>Multi-Tool Automation</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-[#0C162C] dark:text-white tracking-tight">
          Workflows
        </h1>

        <p className="mt-3 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
          Automate your PDF tasks with one reusable workflow.
        </p>
        <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-400 mt-1 max-w-xl mx-auto">
          Upload your files once. ZipStream executes each tool sequentially without intermediate downloads.
        </p>

        {/* Primary CTA */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            id="create-workflow-header-btn"
            onClick={() => {
              setEditingWorkflow(null);
              setIsBuilderOpen(true);
            }}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-b from-[#0077ff] to-[#055efe] hover:from-[#006ee6] hover:to-[#0452e0] text-white font-bold text-sm shadow-md shadow-[#055efe]/25 hover:shadow-lg hover:shadow-[#055efe]/35 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create workflow</span>
          </button>

          <button
            onClick={() => setActiveTab('templates')}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-slate-100 dark:bg-white/[0.08] hover:bg-slate-200/80 dark:hover:bg-white/[0.12] text-slate-700 dark:text-slate-200 font-semibold text-sm transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Browse Templates</span>
          </button>
        </div>
      </div>

      {/* ─── TABS & CONTROLS ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pb-4 border-b border-slate-200/80 dark:border-white/10">
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/[0.06] p-1 rounded-2xl w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('my_workflows')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'my_workflows'
                ? 'bg-white dark:bg-[#131E3A] text-[#0C162C] dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <span>My Workflows</span>
            <span className="px-1.5 py-0.2 rounded-full bg-[#055EFE]/10 text-[#055EFE] text-[10px] font-black">
              {workflows.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('templates')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'templates'
                ? 'bg-white dark:bg-[#131E3A] text-[#0C162C] dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>Prebuilt Templates</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-black">
              {templates.length}
            </span>
          </button>
        </div>

        {activeTab === 'my_workflows' && workflows.length > 0 && (
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search workflows…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-slate-100/80 dark:bg-white/[0.06] border border-transparent focus:border-[#055EFE]/50 text-slate-800 dark:text-white placeholder-slate-400 outline-none transition-all"
            />
          </div>
        )}
      </div>

      {/* ─── MAIN CONTENT AREA ────────────────────────────────────────── */}
      {isLoading ? (
        <div className="py-20 text-center space-y-4">
          <div className="inline-block animate-spin text-[#055EFE]">
            <WorkflowIcon className="w-8 h-8" />
          </div>
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            Loading your workflows…
          </p>
        </div>
      ) : error ? (
        <div className="py-12 px-6 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-center my-6 space-y-3">
          <AlertCircle className="w-6 h-6 text-rose-500 mx-auto" />
          <p className="text-sm font-bold text-rose-700 dark:text-rose-300">{error}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : activeTab === 'my_workflows' ? (
        /* ─── TAB: MY WORKFLOWS ─────────────────────────────────────── */
        <div className="py-6 space-y-6">
          {workflows.length === 0 ? (
            /* Empty State (Specification Section 30) */
            <div className="p-8 sm:p-12 rounded-3xl bg-slate-50 dark:bg-white/[0.02] border border-dashed border-slate-300 dark:border-white/10 text-center space-y-6 my-4">
              <div className="w-16 h-16 rounded-2xl bg-[#055EFE]/10 border border-[#055EFE]/20 flex items-center justify-center text-[#055EFE] mx-auto shadow-inner">
                <WorkflowIcon className="w-8 h-8" />
              </div>

              <div className="space-y-2 max-w-md mx-auto">
                <h3 className="text-xl sm:text-2xl font-black text-[#0C162C] dark:text-white">
                  Automate your PDF work
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Create your first workflow and combine multiple PDF tasks into one reusable action.
                </p>
              </div>

              {/* Visual Pipeline Example */}
              <div className="inline-flex flex-wrap items-center justify-center gap-2 p-3 rounded-2xl bg-white dark:bg-[#0B132B] border border-slate-200/80 dark:border-white/10 shadow-sm max-w-full">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold">
                  <span>Merge</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                  <span>Compress</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-bold">
                  <span>Watermark</span>
                </div>
              </div>

              <div>
                <button
                  id="create-first-workflow-btn"
                  onClick={() => {
                    setEditingWorkflow(null);
                    setIsBuilderOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-b from-[#0077ff] to-[#055efe] hover:from-[#006ee6] hover:to-[#0452e0] text-white font-bold text-sm shadow-md shadow-[#055efe]/25 hover:shadow-lg transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create your first workflow</span>
                </button>
              </div>

              {/* Starter template hints */}
              {templates.length > 0 && (
                <div className="pt-6 border-t border-slate-200/70 dark:border-white/10">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-3">
                    Or start with a prebuilt template:
                  </span>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {templates.slice(0, 3).map((tmpl) => (
                      <button
                        key={tmpl.id}
                        onClick={() => handleUseTemplate(tmpl)}
                        className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#131E3A] border border-slate-200/80 dark:border-white/10 hover:border-[#055EFE]/50 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors shadow-2xs"
                      >
                        ⚡ {tmpl.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : filteredWorkflows.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">
              No workflows found matching "{searchQuery}".
            </div>
          ) : (
            /* Workflow Cards Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredWorkflows.map((wf) => (
                <div
                  key={wf.id}
                  className="flex flex-col justify-between p-5 rounded-3xl bg-white dark:bg-[#0B132B] border border-slate-200/90 dark:border-white/10 shadow-sm hover:shadow-md transition-all hover:border-[#055EFE]/40 group"
                >
                  {/* Card Header */}
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-base font-extrabold text-[#0C162C] dark:text-white group-hover:text-[#055EFE] transition-colors">
                          {wf.name}
                        </h4>
                        {wf.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                            {wf.description}
                          </p>
                        )}
                      </div>

                      <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/[0.08] text-[11px] font-bold text-slate-600 dark:text-slate-300 shrink-0">
                        {wf.steps.length} {wf.steps.length === 1 ? 'step' : 'steps'}
                      </span>
                    </div>

                    {/* Step Visual Chain */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/[0.06]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                        Pipeline Steps
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {wf.steps.map((st, idx) => {
                          const toolInfo = FRONTEND_WORKFLOW_TOOLS[st.tool_key];
                          return (
                            <React.Fragment key={st.id || idx}>
                              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100/80 dark:bg-white/[0.06] text-[11.5px] font-medium text-slate-700 dark:text-slate-200">
                                <span>{toolInfo?.icon || '⚙️'}</span>
                                <span>{toolInfo?.label || st.tool_key}</span>
                              </div>
                              {idx < wf.steps.length - 1 && (
                                <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="mt-5 pt-3 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
                    {/* Primary Run Action */}
                    <button
                      onClick={() => setRunningWorkflow(wf)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-b from-[#0077ff] to-[#055efe] hover:from-[#006ee6] hover:to-[#0452e0] text-white font-bold text-xs shadow-sm shadow-[#055efe]/20 transition-all cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Run</span>
                    </button>

                    {/* Secondary Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingWorkflow(wf);
                          setIsBuilderOpen(true);
                        }}
                        title="Edit workflow"
                        className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDuplicate(wf)}
                        title="Duplicate workflow"
                        className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setDeletingWorkflow(wf)}
                        title="Delete workflow"
                        className="p-2 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ─── TAB: PREBUILT TEMPLATES ────────────────────────────────── */
        <div className="py-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((tmpl) => (
              <div
                key={tmpl.id}
                className="flex flex-col justify-between p-5 rounded-3xl bg-white dark:bg-[#0B132B] border border-slate-200/90 dark:border-white/10 shadow-sm hover:shadow-md transition-all hover:border-amber-500/40"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-1.5 text-amber-500 font-bold text-xs uppercase tracking-wider mb-1">
                        <Sparkles className="w-3 h-3" />
                        <span>Curated Template</span>
                      </div>
                      <h4 className="text-base font-extrabold text-[#0C162C] dark:text-white">
                        {tmpl.name}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {tmpl.description}
                      </p>
                    </div>

                    <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-bold shrink-0">
                      {tmpl.steps.length} steps
                    </span>
                  </div>

                  {/* Template Steps */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/[0.06]">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {tmpl.steps.map((st, idx) => {
                        const toolInfo = FRONTEND_WORKFLOW_TOOLS[st.tool_key];
                        return (
                          <React.Fragment key={idx}>
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100/80 dark:bg-white/[0.06] text-[11.5px] font-medium text-slate-700 dark:text-slate-200">
                              <span>{toolInfo?.icon || '⚙️'}</span>
                              <span>{toolInfo?.label || st.tool_key}</span>
                            </div>
                            {idx < tmpl.steps.length - 1 && (
                              <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Instantly clones to your dashboard
                  </span>
                  <button
                    onClick={() => handleUseTemplate(tmpl)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs hover:bg-[#055EFE] dark:hover:bg-[#055EFE] dark:hover:text-white transition-all cursor-pointer"
                  >
                    <span>Use Template</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── PUBLIC INFORMATIONAL / SEO SECTION (Specification Section 50) ─── */}
      <section className="mt-16 pt-12 border-t border-slate-200/80 dark:border-white/10 space-y-12">
        {/* Section 1: What is a Workflow */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <WorkflowIcon className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-[#0C162C] dark:text-white">
              Single-Upload Pipeline
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Upload your PDF documents once. The ZipStream workflow engine pipes the output of each tool directly into the next step on our isolated backend pipeline without forcing manual re-uploads.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-[#0C162C] dark:text-white">
              Ephemeral Security
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              All intermediate files generated between steps are stored in ephemeral scratch directories and deleted immediately upon workflow completion. Zero permanent data leakage.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-[#0C162C] dark:text-white">
              Strict Chain Compatibility
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              The workflow validator proactively checks input and output MIME types across tools (e.g. PDF to Word, Watermarking, Compression) to guarantee your chain runs reliably before starting.
            </p>
          </div>
        </div>

        {/* Section 2: How It Works */}
        <div className="p-8 rounded-3xl bg-white dark:bg-[#0B132B] border border-slate-200/90 dark:border-white/10 shadow-sm space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-xs font-bold text-[#055EFE] uppercase tracking-wider">
              Step-by-Step Architecture
            </span>
            <h2 className="text-2xl font-black text-[#0C162C] dark:text-white">
              How Automated PDF Workflows Work
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Transform multi-step document chores into a repeatable 1-click execution.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-4">
            {[
              {
                step: '1',
                title: 'Design Pipeline',
                desc: 'Pick up to 4 tools from our registry (Merge, Compress, Watermark, Convert).',
              },
              {
                step: '2',
                title: 'Configure Once',
                desc: 'Set compression levels, watermark text, rotation angles, or passwords.',
              },
              {
                step: '3',
                title: 'Upload Once',
                desc: 'Drop your source files. The backend orchestrator handles all intermediate handoffs.',
              },
              {
                step: '4',
                title: 'Download Final',
                desc: 'Receive the final processed document in seconds. Intermediate data is destroyed.',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06] text-center space-y-2"
              >
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#055EFE] text-white text-xs font-bold">
                  {item.step}
                </span>
                <h4 className="text-sm font-bold text-[#0C162C] dark:text-white">
                  {item.title}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: FAQ */}
        <div className="space-y-4">
          <h3 className="text-lg font-extrabold text-[#0C162C] dark:text-white text-center">
            Frequently Asked Questions
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10 space-y-2">
              <h4 className="text-xs font-bold text-[#0C162C] dark:text-white flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-[#055EFE]" />
                How many steps can I chain together?
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                You can chain up to 4 sequential tools in a single workflow. This covers virtually all standard business and academic document preparation pipelines while keeping execution fast and predictable.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10 space-y-2">
              <h4 className="text-xs font-bold text-[#0C162C] dark:text-white flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-[#055EFE]" />
                Are my intermediate files saved?
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                No. Intermediate files exist only inside an isolated memory/scratch directory during the active run. They are purged immediately upon completion or if an error occurs.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10 space-y-2">
              <h4 className="text-xs font-bold text-[#0C162C] dark:text-white flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-[#055EFE]" />
                Can I run multi-file workflows like Merge?
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Yes! When Merge PDF is the first step of your workflow, you can upload multiple PDF files simultaneously. They will be merged first, and the merged document will continue to the subsequent steps.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10 space-y-2">
              <h4 className="text-xs font-bold text-[#0C162C] dark:text-white flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-[#055EFE]" />
                Can I edit or duplicate my workflows?
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Yes. Any saved workflow can be renamed, reordered, reconfigured, duplicated with a single click, or deleted permanently at any time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── MODAL: WORKFLOW BUILDER ──────────────────────────────────── */}
      {isBuilderOpen && (
        <WorkflowBuilder
          initialWorkflow={editingWorkflow}
          onSave={handleSaveWorkflow}
          onClose={() => {
            setIsBuilderOpen(false);
            setEditingWorkflow(null);
          }}
        />
      )}

      {/* ─── MODAL: WORKFLOW RUNNER ──────────────────────────────────── */}
      {runningWorkflow && (
        <WorkflowRunnerModal
          workflow={runningWorkflow}
          onClose={() => setRunningWorkflow(null)}
          onEditWorkflow={(wf) => {
            setRunningWorkflow(null);
            setEditingWorkflow(wf);
            setIsBuilderOpen(true);
          }}
        />
      )}

      {/* ─── MODAL: DELETE CONFIRMATION (Specification Section 28) ────── */}
      {deletingWorkflow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-[#0B132B] rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#0C162C] dark:text-white">
                  Delete "{deletingWorkflow.name}"?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  This workflow will be permanently removed.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-white/[0.03] p-3 rounded-2xl border border-slate-200/60 dark:border-white/10">
              Are you sure? You won't be able to recover this workflow once deleted. Any runs in progress will finish normally.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingWorkflow(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer shadow-sm shadow-rose-600/25 flex items-center gap-1.5"
              >
                {isDeleting ? 'Deleting…' : 'Delete workflow'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
