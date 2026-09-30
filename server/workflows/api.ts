/**
 * Workflow API Endpoints
 *
 * RESTful API controller for creating, reading, updating, deleting,
 * duplicating, and executing automated multi-step PDF workflows.
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import crypto from 'crypto';
import { workflowDb } from './database';
import { workflowAuthMiddleware, signSessionToken, verifySessionToken } from './authMiddleware';
import { validateWorkflowDefinition } from './validationService';
import { executeWorkflow, getWorkflowDownload } from './executionService';
import { WORKFLOW_TOOLS } from './toolRegistry';

const router = Router();

// Multer temporary upload directory for workflow runs
const WORKFLOW_TEMP_UPLOADS = path.join(process.env.STORAGE_DIR || path.join(os.tmpdir(), 'zipstream-storage'), 'workflow_uploads');
void fs.mkdir(WORKFLOW_TEMP_UPLOADS, { recursive: true }).catch(() => undefined);

const upload = multer({
  dest: WORKFLOW_TEMP_UPLOADS,
  limits: {
    fileSize: (Number(process.env.MAX_UPLOAD_MB) || 250) * 1024 * 1024,
    files: 10,
  },
});

// ─── 1. Instant / Guest Session Initialization ──────────────────────────────
router.get('/session', (req: Request, res: Response) => {
  // Check if caller already has a valid token
  const authHeader = req.headers.authorization;
  let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (!token) {
    const sessionHeader = req.headers['x-zipstream-session'];
    if (typeof sessionHeader === 'string') token = sessionHeader.trim();
  }

  if (token) {
    const existingUserId = verifySessionToken(token);
    if (existingUserId) {
      return res.json({
        success: true,
        userId: existingUserId,
        token,
      });
    }
  }

  // Generate a new secure random user ID and sign a session token
  const newUserId = `usr_${crypto.randomBytes(12).toString('hex')}`;
  const newToken = signSessionToken(newUserId);

  return res.json({
    success: true,
    userId: newUserId,
    token: newToken,
  });
});

// ─── 2. Prebuilt Workflow Templates ─────────────────────────────────────────
router.get('/templates', (_req: Request, res: Response) => {
  const templates = [
    {
      id: 'template_submission_ready',
      name: 'University & Exam Submission',
      description: 'Merge all coursework, compress file size for portal limits, and stamp watermark.',
      steps: [
        { tool_key: 'merge', configuration: { addBlankSeparators: false } },
        { tool_key: 'compress', configuration: { level: 'medium' } },
        { tool_key: 'watermark', configuration: { text: 'SUBMITTED', position: 'center', opacity: 0.25 } },
      ],
    },
    {
      id: 'template_confidential_archive',
      name: 'Confidential Client Archive',
      description: 'Rotate skewed scans, compress, stamp confidential banner, and encrypt with password.',
      steps: [
        { tool_key: 'rotate', configuration: { rotationAngle: 90 } },
        { tool_key: 'compress', configuration: { level: 'medium' } },
        { tool_key: 'watermark', configuration: { text: 'CONFIDENTIAL', position: 'top', color: 'red' } },
        { tool_key: 'protect', configuration: { userPassword: '' } },
      ],
    },
    {
      id: 'template_combine_and_compress',
      name: 'Combine & Compress',
      description: 'Merge separate chapter files into one document and reduce total file size.',
      steps: [
        { tool_key: 'merge', configuration: { addBlankSeparators: false } },
        { tool_key: 'compress', configuration: { level: 'high' } },
      ],
    },
    {
      id: 'template_email_ready',
      name: 'Email & WhatsApp Ready',
      description: 'Split needed pages and compress to under 5 MB for easy email attachments.',
      steps: [
        { tool_key: 'split', configuration: { pageRanges: '1-5' } },
        { tool_key: 'compress', configuration: { level: 'high' } },
      ],
    },
  ];

  res.json({ success: true, templates });
});

// ─── 3. Available Tools Registry for Workflows ──────────────────────────────
router.get('/tools', (_req: Request, res: Response) => {
  res.json({
    success: true,
    tools: Object.values(WORKFLOW_TOOLS),
  });
});

// ─── All remaining routes require authenticated/session user ────────────────
router.use(workflowAuthMiddleware);

// ─── 4. List Workflows ──────────────────────────────────────────────────────
router.get('/', async (req: Request, res: Response) => {
  try {
    const workflows = await workflowDb.listWorkflows(req.userId!);
    res.json({ success: true, workflows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message || 'Failed to list workflows.' } });
  }
});

// ─── 5. Create Workflow ─────────────────────────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, description, steps } = req.body;
    const validation = validateWorkflowDefinition(name, steps);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: validation.errors[0],
          details: validation.errors,
        },
      });
    }

    const workflow = await workflowDb.createWorkflow(req.userId!, name, description, steps);
    res.status(201).json({ success: true, workflow });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message || 'Failed to create workflow.' } });
  }
});

// ─── 6. Get Workflow by ID ──────────────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const workflow = await workflowDb.getWorkflow(req.params.id, req.userId!);
    if (!workflow) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Workflow not found.' } });
    }
    res.json({ success: true, workflow });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message || 'Failed to load workflow.' } });
  }
});

// ─── 7. Update Workflow ─────────────────────────────────────────────────────
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { name, description, steps } = req.body;
    const validation = validateWorkflowDefinition(name, steps);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: validation.errors[0],
          details: validation.errors,
        },
      });
    }

    const updated = await workflowDb.updateWorkflow(req.params.id, req.userId!, name, description, steps);
    if (!updated) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Workflow not found.' } });
    }
    res.json({ success: true, workflow: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message || 'Failed to update workflow.' } });
  }
});

// ─── 8. Delete Workflow ─────────────────────────────────────────────────────
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await workflowDb.deleteWorkflow(req.params.id, req.userId!);
    if (!deleted) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Workflow not found.' } });
    }
    res.json({ success: true, message: 'Workflow deleted.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message || 'Failed to delete workflow.' } });
  }
});

// ─── 9. Duplicate Workflow ──────────────────────────────────────────────────
router.post('/:id/duplicate', async (req: Request, res: Response) => {
  try {
    const duplicate = await workflowDb.duplicateWorkflow(req.params.id, req.userId!);
    if (!duplicate) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Workflow not found.' } });
    }
    res.status(201).json({ success: true, workflow: duplicate });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message || 'Failed to duplicate workflow.' } });
  }
});

// ─── 10. Run Workflow ───────────────────────────────────────────────────────
router.post('/:id/run', upload.array('files', 10), async (req: Request, res: Response) => {
  const files = (req.files as Express.Multer.File[]) || [];

  if (files.length === 0) {
    return res.status(400).json({
      success: false,
      error: { code: 'NO_FILES', message: 'Please upload at least one PDF file to run this workflow.' },
    });
  }

  try {
    const workflow = await workflowDb.getWorkflow(req.params.id, req.userId!);
    if (!workflow) {
      // Clean up uploaded files if workflow not found
      for (const file of files) await fs.rm(file.path, { force: true }).catch(() => undefined);
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Workflow not found.' } });
    }

    // Execute pipeline
    const inputFilesData = files.map((f) => ({
      path: f.path,
      originalname: f.originalname,
      size: f.size,
    }));

    const result = await executeWorkflow(workflow, inputFilesData);

    // Delete original raw uploads once processed
    for (const file of files) await fs.rm(file.path, { force: true }).catch(() => undefined);

    if (!result.success) {
      return res.status(422).json({
        success: false,
        error: result.error || { code: 'WORKFLOW_FAILED', message: 'Execution stopped.' },
      });
    }

    res.json({
      success: true,
      runId: result.runId,
      outputFileName: result.outputFileName,
      downloadToken: result.downloadToken,
      downloadUrl: `/api/workflows/download/${result.downloadToken}`,
      durationMs: result.durationMs,
      stepsCompleted: result.stepsCompleted,
    });
  } catch (err: any) {
    for (const file of files) await fs.rm(file.path, { force: true }).catch(() => undefined);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message || 'Workflow execution failed.' },
    });
  }
});

// ─── 11. Download Completed Result ──────────────────────────────────────────
router.get('/download/:token', async (req: Request, res: Response) => {
  const token = req.params.token;
  const item = getWorkflowDownload(token);

  if (!item) {
    return res.status(404).json({
      success: false,
      error: { code: 'EXPIRED_OR_NOT_FOUND', message: 'Download token is invalid or has expired.' },
    });
  }

  try {
    const stat = await fs.stat(item.filePath);
    res.set({
      'Content-Type': item.mimeType,
      'Content-Disposition': `attachment; filename="${item.fileName}"`,
      'Content-Length': stat.size,
      'Cache-Control': 'no-store',
    });

    const stream = createReadStream(item.filePath);
    stream.pipe(res);
  } catch {
    res.status(404).json({
      success: false,
      error: { code: 'FILE_NOT_FOUND', message: 'Processed file could not be read.' },
    });
  }
});

export default router;
