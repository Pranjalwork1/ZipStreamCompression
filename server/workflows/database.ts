/**
 * ZipStream Workflow Database — Supabase-First Data Access Layer
 *
 * Primary storage: Supabase PostgreSQL (when SUPABASE_URL + SUPABASE_KEY are set).
 * Fallback storage: Atomic local JSON files (zero config needed).
 *
 * Auto-Cleanup / TTL:
 * - When Supabase is connected, workflows that have had ZERO runs for more than
 *   WORKFLOW_TTL_DAYS days (default: 30) are permanently deleted automatically.
 * - A cleanup sweep runs once every 60 minutes in the background.
 * - This ensures Supabase stays clean without any manual intervention.
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface WorkflowRecord {
  id: string;
  user_id: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  steps?: WorkflowStepRecord[];
}

export interface WorkflowStepRecord {
  id: string;
  workflow_id: string;
  step_order: number;
  tool_key: string;
  configuration: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface WorkflowRunRecord {
  id: string;
  workflow_id: string;
  user_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  input_count: number;
  output_filename?: string;
  error_step?: number;
  error_message_safe?: string;
  created_at: string;
}

class WorkflowDatabase {
  // ─── Local storage (fallback) ─────────────────────────────────────────────
  private dbDir: string;
  private workflowsFile: string;
  private stepsFile: string;
  private runsFile: string;
  private lock: Promise<void> = Promise.resolve();

  // ─── Supabase ─────────────────────────────────────────────────────────────
  private supabase: SupabaseClient | null = null;

  // ─── TTL Configuration ────────────────────────────────────────────────────
  /** Number of inactive days before a workflow without any run is auto-deleted */
  private readonly ttlDays: number;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // ── Local fallback setup ──────────────────────────────────────────────────
    const baseStorage = process.env.STORAGE_DIR || path.join(os.tmpdir(), 'zipstream-storage');
    this.dbDir = path.join(baseStorage, 'workflows_data');
    this.workflowsFile = path.join(this.dbDir, 'workflows.json');
    this.stepsFile = path.join(this.dbDir, 'workflow_steps.json');
    this.runsFile = path.join(this.dbDir, 'workflow_runs.json');

    // ── TTL ───────────────────────────────────────────────────────────────────
    this.ttlDays = parseInt(process.env.WORKFLOW_TTL_DAYS || '30', 10);

    // ── Supabase setup ────────────────────────────────────────────────────────
    const supabaseUrl = process.env.SUPABASE_URL?.trim();
    const supabaseKey = (
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_KEY ||
      process.env.SUPABASE_ANON_KEY
    )?.trim();

    if (supabaseUrl && supabaseKey) {
      try {
        this.supabase = createClient(supabaseUrl, supabaseKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        });
        console.log('[WorkflowDB] ✅ Supabase connected. TTL =', this.ttlDays, 'days of inactivity.');

        // Kick off first cleanup 10 seconds after startup, then every 60 minutes
        setTimeout(() => this._cleanupInactiveWorkflows(), 10_000);
        this.cleanupTimer = setInterval(() => this._cleanupInactiveWorkflows(), 60 * 60 * 1_000);
      } catch (err) {
        console.warn('[WorkflowDB] ⚠️  Supabase init failed, using local file storage:', err);
        this.supabase = null;
      }
    } else {
      console.log('[WorkflowDB] No Supabase credentials found — using local file storage fallback.');
    }

    this.initDirs();
  }

  // ─── TTL Auto-Cleanup (Supabase only) ─────────────────────────────────────

  /**
   * Deletes workflows from Supabase that:
   * - Have had NO runs at all, AND
   * - Were last updated more than `ttlDays` ago (user hasn't touched them).
   *
   * Workflows that have been run at least once are kept forever (user values them).
   */
  private async _cleanupInactiveWorkflows(): Promise<void> {
    if (!this.supabase) return;

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.ttlDays);
      const cutoffISO = cutoffDate.toISOString();

      // Find workflow IDs that have at least one run (we keep these)
      const { data: activeRunWorkflows } = await this.supabase
        .from('workflow_runs')
        .select('workflow_id');

      const activeIds: string[] = (activeRunWorkflows || [])
        .map((r: any) => r.workflow_id)
        .filter(Boolean);

      // Soft-delete workflows that have:
      // 1. Never been run (not in activeIds), AND
      // 2. Have not been updated for TTL days (user abandoned them)
      let query = this.supabase
        .from('workflows')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('is_active', true)
        .lt('updated_at', cutoffISO);

      if (activeIds.length > 0) {
        query = query.not('id', 'in', `(${activeIds.map((id) => `"${id}"`).join(',')})`);
      }

      const { error, count } = await query;

      if (error) {
        console.error('[WorkflowDB] TTL cleanup error:', error.message);
      } else if (count && count > 0) {
        console.log(`[WorkflowDB] 🧹 TTL cleanup: soft-deleted ${count} inactive workflow(s) older than ${this.ttlDays} days.`);
      }
    } catch (err) {
      console.error('[WorkflowDB] TTL cleanup exception:', err);
    }
  }

  // ─── Local fallback helpers ────────────────────────────────────────────────

  private async initDirs() {
    try {
      await fs.mkdir(this.dbDir, { recursive: true });
      if (!(await this._fileExists(this.workflowsFile))) await fs.writeFile(this.workflowsFile, '[]', 'utf-8');
      if (!(await this._fileExists(this.stepsFile))) await fs.writeFile(this.stepsFile, '[]', 'utf-8');
      if (!(await this._fileExists(this.runsFile))) await fs.writeFile(this.runsFile, '[]', 'utf-8');
    } catch { /* ignored */ }
  }

  private async _fileExists(filePath: string): Promise<boolean> {
    try { await fs.access(filePath); return true; } catch { return false; }
  }

  private async _readJson<T>(filePath: string): Promise<T[]> {
    try { return JSON.parse(await fs.readFile(filePath, 'utf-8') || '[]'); } catch { return []; }
  }

  private async _writeJsonAtomic<T>(filePath: string, data: T[]): Promise<void> {
    const tmp = `${filePath}.${crypto.randomBytes(6).toString('hex')}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf-8');
    await fs.rename(tmp, filePath);
  }

  private async _withLock<T>(fn: () => Promise<T>): Promise<T> {
    const prev = this.lock;
    let release!: () => void;
    this.lock = new Promise<void>((r) => (release = r));
    await prev;
    try { return await fn(); } finally { release(); }
  }

  // ─── Public API — Workflows ────────────────────────────────────────────────

  public async listWorkflows(userId: string): Promise<WorkflowRecord[]> {
    if (this.supabase) {
      try {
        const { data: workflows, error: wfErr } = await this.supabase
          .from('workflows')
          .select('*')
          .eq('user_id', userId)
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (wfErr) throw wfErr;
        if (!workflows?.length) return [];

        const ids = workflows.map((w: any) => w.id);
        const { data: steps, error: stepsErr } = await this.supabase
          .from('workflow_steps')
          .select('*')
          .in('workflow_id', ids)
          .order('step_order', { ascending: true });

        if (stepsErr) throw stepsErr;

        return workflows.map((w: any) => ({
          ...w,
          steps: (steps || []).filter((s: any) => s.workflow_id === w.id),
        }));
      } catch (err) {
        console.error('[WorkflowDB] listWorkflows Supabase error (falling back):', err);
      }
    }

    // ── Local fallback ────────────────────────────────────────────────────────
    await this.initDirs();
    const workflows = await this._readJson<WorkflowRecord>(this.workflowsFile);
    const steps = await this._readJson<WorkflowStepRecord>(this.stepsFile);
    return workflows
      .filter((w) => w.user_id === userId && w.is_active)
      .map((w) => ({
        ...w,
        steps: steps.filter((s) => s.workflow_id === w.id).sort((a, b) => a.step_order - b.step_order),
      }));
  }

  public async getWorkflow(id: string, userId: string): Promise<WorkflowRecord | null> {
    if (this.supabase) {
      try {
        const { data: wf, error: wfErr } = await this.supabase
          .from('workflows')
          .select('*')
          .eq('id', id)
          .eq('user_id', userId)
          .eq('is_active', true)
          .maybeSingle();

        if (wfErr) throw wfErr;
        if (!wf) return null;

        const { data: steps, error: stepsErr } = await this.supabase
          .from('workflow_steps')
          .select('*')
          .eq('workflow_id', id)
          .order('step_order', { ascending: true });

        if (stepsErr) throw stepsErr;
        return { ...wf, steps: steps || [] };
      } catch (err) {
        console.error('[WorkflowDB] getWorkflow Supabase error (falling back):', err);
      }
    }

    await this.initDirs();
    const workflows = await this._readJson<WorkflowRecord>(this.workflowsFile);
    const wf = workflows.find((w) => w.id === id && w.user_id === userId && w.is_active);
    if (!wf) return null;
    const steps = await this._readJson<WorkflowStepRecord>(this.stepsFile);
    return {
      ...wf,
      steps: steps.filter((s) => s.workflow_id === id).sort((a, b) => a.step_order - b.step_order),
    };
  }

  public async createWorkflow(
    userId: string,
    name: string,
    description: string,
    stepsData: Array<{ tool_key: string; configuration: Record<string, any> }>
  ): Promise<WorkflowRecord> {
    const workflowId = crypto.randomUUID();
    const now = new Date().toISOString();

    if (this.supabase) {
      try {
        const { data: wf, error: wfErr } = await this.supabase
          .from('workflows')
          .insert({
            id: workflowId,
            user_id: userId,
            name: name.trim(),
            description: (description || '').trim(),
            is_active: true,
          })
          .select('*')
          .single();

        if (wfErr) throw wfErr;

        const stepsToInsert = stepsData.map((s, idx) => ({
          id: crypto.randomUUID(),
          workflow_id: workflowId,
          step_order: idx + 1,
          tool_key: s.tool_key,
          configuration: s.configuration || {},
        }));

        const { data: insertedSteps, error: stepsErr } = await this.supabase
          .from('workflow_steps')
          .insert(stepsToInsert)
          .select('*')
          .order('step_order', { ascending: true });

        if (stepsErr) throw stepsErr;
        return { ...wf, steps: insertedSteps || [] };
      } catch (err) {
        console.error('[WorkflowDB] createWorkflow Supabase error (falling back):', err);
      }
    }

    return this._withLock(async () => {
      await this.initDirs();
      const workflows = await this._readJson<WorkflowRecord>(this.workflowsFile);
      const steps = await this._readJson<WorkflowStepRecord>(this.stepsFile);

      const newWorkflow: WorkflowRecord = {
        id: workflowId,
        user_id: userId,
        name: name.trim(),
        description: (description || '').trim(),
        is_active: true,
        created_at: now,
        updated_at: now,
      };
      const newSteps: WorkflowStepRecord[] = stepsData.map((s, idx) => ({
        id: crypto.randomUUID(),
        workflow_id: workflowId,
        step_order: idx + 1,
        tool_key: s.tool_key,
        configuration: s.configuration || {},
        created_at: now,
        updated_at: now,
      }));

      workflows.push(newWorkflow);
      steps.push(...newSteps);
      await this._writeJsonAtomic(this.workflowsFile, workflows);
      await this._writeJsonAtomic(this.stepsFile, steps);
      return { ...newWorkflow, steps: newSteps };
    });
  }

  public async updateWorkflow(
    id: string,
    userId: string,
    name: string,
    description: string,
    stepsData: Array<{ tool_key: string; configuration: Record<string, any> }>
  ): Promise<WorkflowRecord | null> {
    const now = new Date().toISOString();

    if (this.supabase) {
      try {
        const { data: wf, error: wfErr } = await this.supabase
          .from('workflows')
          .update({ name: name.trim(), description: (description || '').trim(), updated_at: now })
          .eq('id', id)
          .eq('user_id', userId)
          .eq('is_active', true)
          .select('*')
          .maybeSingle();

        if (wfErr) throw wfErr;
        if (!wf) return null;

        // Replace all steps atomically
        await this.supabase.from('workflow_steps').delete().eq('workflow_id', id);

        const newSteps = stepsData.map((s, idx) => ({
          id: crypto.randomUUID(),
          workflow_id: id,
          step_order: idx + 1,
          tool_key: s.tool_key,
          configuration: s.configuration || {},
        }));

        const { data: insertedSteps, error: stepsErr } = await this.supabase
          .from('workflow_steps')
          .insert(newSteps)
          .select('*')
          .order('step_order', { ascending: true });

        if (stepsErr) throw stepsErr;
        return { ...wf, steps: insertedSteps || [] };
      } catch (err) {
        console.error('[WorkflowDB] updateWorkflow Supabase error (falling back):', err);
      }
    }

    return this._withLock(async () => {
      await this.initDirs();
      const workflows = await this._readJson<WorkflowRecord>(this.workflowsFile);
      const steps = await this._readJson<WorkflowStepRecord>(this.stepsFile);
      const idx = workflows.findIndex((w) => w.id === id && w.user_id === userId && w.is_active);
      if (idx === -1) return null;
      workflows[idx].name = name.trim();
      workflows[idx].description = (description || '').trim();
      workflows[idx].updated_at = now;
      const remaining = steps.filter((s) => s.workflow_id !== id);
      const updated: WorkflowStepRecord[] = stepsData.map((s, i) => ({
        id: crypto.randomUUID(),
        workflow_id: id,
        step_order: i + 1,
        tool_key: s.tool_key,
        configuration: s.configuration || {},
        created_at: now,
        updated_at: now,
      }));
      remaining.push(...updated);
      await this._writeJsonAtomic(this.workflowsFile, workflows);
      await this._writeJsonAtomic(this.stepsFile, remaining);
      return { ...workflows[idx], steps: updated };
    });
  }

  public async deleteWorkflow(id: string, userId: string): Promise<boolean> {
    if (this.supabase) {
      try {
        const { error } = await this.supabase
          .from('workflows')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('user_id', userId);

        if (!error) return true;
      } catch (err) {
        console.error('[WorkflowDB] deleteWorkflow Supabase error (falling back):', err);
      }
    }

    return this._withLock(async () => {
      await this.initDirs();
      const workflows = await this._readJson<WorkflowRecord>(this.workflowsFile);
      const idx = workflows.findIndex((w) => w.id === id && w.user_id === userId && w.is_active);
      if (idx === -1) return false;
      workflows[idx].is_active = false;
      workflows[idx].updated_at = new Date().toISOString();
      await this._writeJsonAtomic(this.workflowsFile, workflows);
      return true;
    });
  }

  public async duplicateWorkflow(id: string, userId: string): Promise<WorkflowRecord | null> {
    const original = await this.getWorkflow(id, userId);
    if (!original) return null;
    return this.createWorkflow(
      userId,
      `${original.name} Copy`,
      original.description,
      (original.steps || []).map((s) => ({ tool_key: s.tool_key, configuration: s.configuration }))
    );
  }

  // ─── Public API — Execution Runs ──────────────────────────────────────────

  public async createRun(workflowId: string, userId: string, inputCount: number): Promise<WorkflowRunRecord> {
    const runId = crypto.randomUUID();
    const now = new Date().toISOString();

    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('workflow_runs')
          .insert({ id: runId, workflow_id: workflowId, user_id: userId, status: 'processing', started_at: now, input_count: inputCount })
          .select('*')
          .single();

        if (!error && data) {
          // Also touch the parent workflow's updated_at so TTL resets on use
          await this.supabase
            .from('workflows')
            .update({ updated_at: now })
            .eq('id', workflowId)
            .eq('user_id', userId);

          return data;
        }
      } catch (err) {
        console.error('[WorkflowDB] createRun Supabase error (falling back):', err);
      }
    }

    return this._withLock(async () => {
      await this.initDirs();
      const runs = await this._readJson<WorkflowRunRecord>(this.runsFile);
      const newRun: WorkflowRunRecord = {
        id: runId, workflow_id: workflowId, user_id: userId,
        status: 'processing', started_at: now, input_count: inputCount, created_at: now,
      };
      runs.push(newRun);
      await this._writeJsonAtomic(this.runsFile, runs);
      return newRun;
    });
  }

  public async completeRun(runId: string, outputFilename: string, durationMs: number): Promise<void> {
    const completedAt = new Date().toISOString();
    if (this.supabase) {
      try {
        await this.supabase
          .from('workflow_runs')
          .update({ status: 'completed', completed_at: completedAt, duration_ms: durationMs, output_filename: outputFilename })
          .eq('id', runId);
        return;
      } catch (err) {
        console.error('[WorkflowDB] completeRun Supabase error (falling back):', err);
      }
    }

    await this._withLock(async () => {
      await this.initDirs();
      const runs = await this._readJson<WorkflowRunRecord>(this.runsFile);
      const run = runs.find((r) => r.id === runId);
      if (run) {
        run.status = 'completed'; run.completed_at = completedAt;
        run.duration_ms = durationMs; run.output_filename = outputFilename;
        await this._writeJsonAtomic(this.runsFile, runs);
      }
    });
  }

  public async failRun(runId: string, errorStep: number, errorMessageSafe: string): Promise<void> {
    const failedAt = new Date().toISOString();
    if (this.supabase) {
      try {
        await this.supabase
          .from('workflow_runs')
          .update({ status: 'failed', completed_at: failedAt, error_step: errorStep, error_message_safe: errorMessageSafe })
          .eq('id', runId);
        return;
      } catch (err) {
        console.error('[WorkflowDB] failRun Supabase error (falling back):', err);
      }
    }

    await this._withLock(async () => {
      await this.initDirs();
      const runs = await this._readJson<WorkflowRunRecord>(this.runsFile);
      const run = runs.find((r) => r.id === runId);
      if (run) {
        run.status = 'failed'; run.completed_at = failedAt;
        run.error_step = errorStep; run.error_message_safe = errorMessageSafe;
        await this._writeJsonAtomic(this.runsFile, runs);
      }
    });
  }
}

export const workflowDb = new WorkflowDatabase();
