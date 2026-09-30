/**
 * Workflow Validation Service
 *
 * Enforces business logic, step compatibility constraints, configuration rules,
 * and security bounds for workflow creation, updates, and execution.
 */

import { WORKFLOW_TOOLS, WORKFLOW_MAX_STEPS, isStepChainCompatible, FileType } from './toolRegistry';

export interface WorkflowValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateWorkflowDefinition(
  name: string,
  steps: Array<{ tool_key: string; configuration?: Record<string, any> }>
): WorkflowValidationResult {
  const errors: string[] = [];

  // 1. Name validation
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push('Workflow name is required.');
  } else if (name.trim().length > 120) {
    errors.push('Workflow name cannot exceed 120 characters.');
  }

  // 2. Step count validation
  if (!Array.isArray(steps) || steps.length === 0) {
    errors.push('A workflow must contain at least one step.');
    return { valid: false, errors };
  }

  if (steps.length > WORKFLOW_MAX_STEPS) {
    errors.push(`A workflow can have a maximum of ${WORKFLOW_MAX_STEPS} steps.`);
  }

  // 3. Tool existence and compatibility validation
  let currentOutputType: FileType = 'pdf';

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const tool = WORKFLOW_TOOLS[step.tool_key];

    if (!tool) {
      errors.push(`Step ${i + 1}: Tool "${step.tool_key}" is not recognized.`);
      continue;
    }

    if (!tool.supportsWorkflow) {
      errors.push(`Step ${i + 1}: Tool "${tool.label}" cannot be used in automated workflows.`);
      continue;
    }

    // Chain compatibility check (steps > 0)
    if (i > 0) {
      const compatibility = isStepChainCompatible(currentOutputType, step.tool_key);
      if (!compatibility.compatible) {
        errors.push(`Step ${i + 1} (${tool.label}) cannot follow Step ${i}: ${compatibility.error}`);
      }
    }

    currentOutputType = tool.outputType;

    // Validate step configuration
    const config = step.configuration || {};
    if (step.tool_key === 'split' && config.pageRanges) {
      if (!/^[\d\s,-]+$/.test(config.pageRanges)) {
        errors.push(`Step ${i + 1} (Split): Invalid page range format. Use numbers and hyphens (e.g. 1-3, 5).`);
      }
    }
    if (step.tool_key === 'rotate' && config.rotationAngle) {
      if (![90, 180, 270].includes(Number(config.rotationAngle))) {
        errors.push(`Step ${i + 1} (Rotate): Rotation angle must be 90, 180, or 270 degrees.`);
      }
    }
    if (step.tool_key === 'compress' && config.level) {
      if (!['high', 'medium', 'low'].includes(config.level)) {
        errors.push(`Step ${i + 1} (Compress): Invalid compression level.`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
