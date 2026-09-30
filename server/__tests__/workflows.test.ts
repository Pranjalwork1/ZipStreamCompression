import { describe, it, expect, beforeEach } from 'vitest';
import { validateWorkflowDefinition } from '../workflows/validationService';
import { workflowDb } from '../workflows/database';
import { isStepChainCompatible, WORKFLOW_MAX_STEPS } from '../workflows/toolRegistry';
import { executeWorkflow, getWorkflowDownload } from '../workflows/executionService';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('ZipStream Workflows System Test Suite', () => {
  const userA = 'user_test_alpha_1';
  const userB = 'user_test_beta_2';

  // ─── 1. Validation & Compatibility ─────────────────────────────────────────
  describe('Workflow Definition Validation', () => {
    it('should reject an empty or missing workflow name', () => {
      const res = validateWorkflowDefinition('', [{ tool_key: 'compress' }]);
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('Workflow name is required.');
    });

    it('should reject a workflow with zero steps', () => {
      const res = validateWorkflowDefinition('Test Workflow', []);
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('A workflow must contain at least one step.');
    });

    it('should reject workflows exceeding the maximum step limit (4 steps)', () => {
      const steps = [
        { tool_key: 'merge' },
        { tool_key: 'rotate' },
        { tool_key: 'compress' },
        { tool_key: 'watermark' },
        { tool_key: 'protect' },
      ];
      const res = validateWorkflowDefinition('Over Limit', steps);
      expect(res.valid).toBe(false);
      expect(res.errors[0]).toContain(`maximum of ${WORKFLOW_MAX_STEPS} steps`);
    });

    it('should reject unknown tool keys', () => {
      const res = validateWorkflowDefinition('Invalid Tool', [{ tool_key: 'unknown_magic_tool' }]);
      expect(res.valid).toBe(false);
      expect(res.errors[0]).toContain('not recognized');
    });

    it('should validate chain compatibility correctly', () => {
      // PDF -> PDF (Valid)
      const validChain = isStepChainCompatible('pdf', 'compress');
      expect(validChain.compatible).toBe(true);

      // PDF -> DOCX (Valid)
      const validConvert = isStepChainCompatible('pdf', 'pdf_to_word');
      expect(validConvert.compatible).toBe(true);

      // DOCX -> Compress PDF (Invalid! Compress requires PDF)
      const invalidChain = isStepChainCompatible('docx', 'compress');
      expect(invalidChain.compatible).toBe(false);
      expect(invalidChain.error).toContain('requires pdf input');
    });
  });

  // ─── 2. Database CRUD & Multi-Tenant Security Isolation ───────────────────
  describe('Database Persistence & User Ownership Security', () => {
    let createdWorkflowId: string;

    it('should create and persist a workflow for user A', async () => {
      const workflow = await workflowDb.createWorkflow(userA, 'University Submission', 'Merge and compress', [
        { tool_key: 'merge', configuration: { addBlankSeparators: false } },
        { tool_key: 'compress', configuration: { level: 'medium' } },
      ]);

      expect(workflow.id).toBeDefined();
      expect(workflow.user_id).toBe(userA);
      expect(workflow.steps?.length).toBe(2);
      expect(workflow.steps?.[0].step_order).toBe(1);
      expect(workflow.steps?.[1].step_order).toBe(2);
      createdWorkflowId = workflow.id;
    });

    it('user A should be able to read their own workflow', async () => {
      const workflow = await workflowDb.getWorkflow(createdWorkflowId, userA);
      expect(workflow).not.toBeNull();
      expect(workflow?.name).toBe('University Submission');
    });

    it('user B MUST NOT be able to read user A workflow (Strict Isolation)', async () => {
      const forbidden = await workflowDb.getWorkflow(createdWorkflowId, userB);
      expect(forbidden).toBeNull();
    });

    it('user B MUST NOT be able to update user A workflow', async () => {
      const updated = await workflowDb.updateWorkflow(createdWorkflowId, userB, 'Hacked Name', '', [
        { tool_key: 'compress', configuration: {} },
      ]);
      expect(updated).toBeNull();
    });

    it('user B MUST NOT be able to delete user A workflow', async () => {
      const deleted = await workflowDb.deleteWorkflow(createdWorkflowId, userB);
      expect(deleted).toBe(false);
    });

    it('user A can duplicate their own workflow as "<Name> Copy"', async () => {
      const duplicate = await workflowDb.duplicateWorkflow(createdWorkflowId, userA);
      expect(duplicate).not.toBeNull();
      expect(duplicate?.name).toBe('University Submission Copy');
      expect(duplicate?.steps?.length).toBe(2);
      expect(duplicate?.id).not.toBe(createdWorkflowId);
    });

    it('user A can delete their own workflow', async () => {
      const deleted = await workflowDb.deleteWorkflow(createdWorkflowId, userA);
      expect(deleted).toBe(true);

      const check = await workflowDb.getWorkflow(createdWorkflowId, userA);
      expect(check).toBeNull();
    });
  });

  // ─── 3. End-to-End Pipeline Execution ──────────────────────────────────────
  describe('Workflow Pipeline Execution Engine', () => {
    let testPdfPathA: string;
    let testPdfPathB: string;

    beforeEach(async () => {
      // Create minimal valid PDFs for testing
      const pdfA = await PDFDocument.create();
      const pageA = pdfA.addPage([400, 600]);
      pageA.drawText('Document A - Page 1');
      const bytesA = await pdfA.save();

      const pdfB = await PDFDocument.create();
      const pageB = pdfB.addPage([400, 600]);
      pageB.drawText('Document B - Page 1');
      const bytesB = await pdfB.save();

      const tmpDir = os.tmpdir();
      testPdfPathA = path.join(tmpDir, `test_doc_a_${Date.now()}.pdf`);
      testPdfPathB = path.join(tmpDir, `test_doc_b_${Date.now()}.pdf`);

      await fs.writeFile(testPdfPathA, bytesA);
      await fs.writeFile(testPdfPathB, bytesB);
    });

    it('should execute a 4-step pipeline: Merge -> Rotate -> Compress -> Watermark', async () => {
      const workflow = await workflowDb.createWorkflow(userA, 'Full Quad Pipeline', 'Test 4 steps', [
        { tool_key: 'merge', configuration: { addBlankSeparators: false } },
        { tool_key: 'rotate', configuration: { rotationAngle: 90 } },
        { tool_key: 'compress', configuration: { level: 'medium' } },
        { tool_key: 'watermark', configuration: { text: 'OFFICIAL', opacity: 0.3 } },
      ]);

      const inputFiles = [
        { path: testPdfPathA, originalname: 'coursework_part1.pdf', size: 1024 },
        { path: testPdfPathB, originalname: 'coursework_part2.pdf', size: 1024 },
      ];

      const result = await executeWorkflow(workflow, inputFiles);

      expect(result.success).toBe(true);
      expect(result.stepsCompleted).toBe(4);
      expect(result.downloadToken).toBeDefined();
      expect(result.outputFileName).toContain('full_quad_pipeline.pdf');

      // Verify that the final generated file exists and is valid PDF
      const downloadItem = getWorkflowDownload(result.downloadToken!);
      expect(downloadItem).toBeDefined();

      const outputBytes = await fs.readFile(downloadItem!.filePath);
      const outputPdf = await PDFDocument.load(outputBytes);
      expect(outputPdf.getPageCount()).toBe(2); // 1 page from Doc A + 1 page from Doc B
      expect(outputPdf.getPage(0).getRotation().angle).toBe(90); // Rotated 90 degrees
    });

    it('should handle conversion pipeline: Compress -> PDF to Word', async () => {
      const workflow = await workflowDb.createWorkflow(userA, 'Word Converter Pipeline', 'Convert to docx', [
        { tool_key: 'compress', configuration: { level: 'low' } },
        { tool_key: 'pdf_to_word', configuration: { format: 'docx' } },
      ]);

      const inputFiles = [
        { path: testPdfPathA, originalname: 'contract.pdf', size: 1024 },
      ];

      const result = await executeWorkflow(workflow, inputFiles);
      expect(result.success).toBe(true);
      expect(result.stepsCompleted).toBe(2);
      expect(result.outputFileName).toContain('.docx');

      const downloadItem = getWorkflowDownload(result.downloadToken!);
      expect(downloadItem).toBeDefined();
      expect(downloadItem!.mimeType).toContain('wordprocessingml');
    });
  });
});
