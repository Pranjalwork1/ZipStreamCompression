/**
 * Central Workflow Tool Registry & Compatibility System
 *
 * Defines the single source of truth for:
 * - Available workflow tools
 * - Categories, labels, and descriptions
 * - Accepted input types and generated output types
 * - Default step configurations
 * - Step compatibility validation logic
 */

export type FileType = 'pdf' | 'pdf[]' | 'docx' | 'xlsx' | 'jpg' | 'zip';

export type ToolCategory = 'Organize' | 'Optimize' | 'Convert' | 'Security';

export interface WorkflowToolDefinition {
  key: string;
  label: string;
  category: ToolCategory;
  description: string;
  inputTypes: FileType[];
  outputType: FileType;
  supportsWorkflow: boolean;
  defaultConfig: Record<string, any>;
  configFields: Array<{
    name: string;
    label: string;
    type: 'select' | 'text' | 'number' | 'boolean' | 'slider';
    options?: Array<{ label: string; value: any }>;
    defaultValue: any;
    min?: number;
    max?: number;
    step?: number;
  }>;
}

export const WORKFLOW_MAX_STEPS = 4;

export const WORKFLOW_TOOLS: Record<string, WorkflowToolDefinition> = {
  merge: {
    key: 'merge',
    label: 'Merge PDF',
    category: 'Organize',
    description: 'Combine multiple PDF files or pages into one cohesive document.',
    inputTypes: ['pdf', 'pdf[]'],
    outputType: 'pdf',
    supportsWorkflow: true,
    defaultConfig: {
      addBlankSeparators: false,
    },
    configFields: [
      {
        name: 'addBlankSeparators',
        label: 'Insert blank page between documents',
        type: 'boolean',
        defaultValue: false,
      },
    ],
  },
  split: {
    key: 'split',
    label: 'Split PDF',
    category: 'Organize',
    description: 'Extract specific page ranges from the PDF.',
    inputTypes: ['pdf'],
    outputType: 'pdf',
    supportsWorkflow: true,
    defaultConfig: {
      pageRanges: '1-3',
    },
    configFields: [
      {
        name: 'pageRanges',
        label: 'Page ranges to extract (e.g. 1-3, 5, 8-10)',
        type: 'text',
        defaultValue: '1-3',
      },
    ],
  },
  rotate: {
    key: 'rotate',
    label: 'Rotate PDF',
    category: 'Organize',
    description: 'Rotate all pages by 90°, 180°, or 270° clockwise.',
    inputTypes: ['pdf'],
    outputType: 'pdf',
    supportsWorkflow: true,
    defaultConfig: {
      rotationAngle: 90,
    },
    configFields: [
      {
        name: 'rotationAngle',
        label: 'Rotation angle',
        type: 'select',
        options: [
          { label: '90° Clockwise', value: 90 },
          { label: '180° Half Turn', value: 180 },
          { label: '270° Counter-Clockwise', value: 270 },
        ],
        defaultValue: 90,
      },
    ],
  },
  compress: {
    key: 'compress',
    label: 'Compress PDF',
    category: 'Optimize',
    description: 'Drastically reduce PDF file size while preserving readability and vector text.',
    inputTypes: ['pdf'],
    outputType: 'pdf',
    supportsWorkflow: true,
    defaultConfig: {
      level: 'medium',
    },
    configFields: [
      {
        name: 'level',
        label: 'Compression level',
        type: 'select',
        options: [
          { label: 'Extreme (High compression, smallest size)', value: 'high' },
          { label: 'Recommended (Balanced quality and size)', value: 'medium' },
          { label: 'Less (Near-lossless, highest quality)', value: 'low' },
        ],
        defaultValue: 'medium',
      },
    ],
  },
  watermark: {
    key: 'watermark',
    label: 'Watermark PDF',
    category: 'Security',
    description: 'Stamp custom semi-transparent text watermark across document pages.',
    inputTypes: ['pdf'],
    outputType: 'pdf',
    supportsWorkflow: true,
    defaultConfig: {
      text: 'CONFIDENTIAL',
      fontSize: 36,
      opacity: 0.3,
      position: 'center',
      rotationDegrees: 45,
      color: 'gray',
    },
    configFields: [
      {
        name: 'text',
        label: 'Watermark text',
        type: 'text',
        defaultValue: 'CONFIDENTIAL',
      },
      {
        name: 'position',
        label: 'Stamp position',
        type: 'select',
        options: [
          { label: 'Center (Diagonal)', value: 'center' },
          { label: 'Header (Top)', value: 'top' },
          { label: 'Footer (Bottom)', value: 'bottom' },
        ],
        defaultValue: 'center',
      },
      {
        name: 'opacity',
        label: 'Opacity (0.1 - 1.0)',
        type: 'slider',
        min: 0.1,
        max: 1.0,
        step: 0.05,
        defaultValue: 0.3,
      },
      {
        name: 'color',
        label: 'Watermark color',
        type: 'select',
        options: [
          { label: 'Gray', value: 'gray' },
          { label: 'Red (Warning)', value: 'red' },
          { label: 'Blue (Official)', value: 'blue' },
          { label: 'Black (Dark)', value: 'black' },
        ],
        defaultValue: 'gray',
      },
    ],
  },
  protect: {
    key: 'protect',
    label: 'Protect PDF',
    category: 'Security',
    description: 'Add standard password protection to the PDF document.',
    inputTypes: ['pdf'],
    outputType: 'pdf',
    supportsWorkflow: true,
    defaultConfig: {
      userPassword: '',
    },
    configFields: [
      {
        name: 'userPassword',
        label: 'Document Password',
        type: 'text',
        defaultValue: '',
      },
    ],
  },
  unlock: {
    key: 'unlock',
    label: 'Unlock PDF',
    category: 'Security',
    description: 'Remove password protection from an authorized PDF document.',
    inputTypes: ['pdf'],
    outputType: 'pdf',
    supportsWorkflow: true,
    defaultConfig: {
      password: '',
    },
    configFields: [
      {
        name: 'password',
        label: 'Current Password (if required)',
        type: 'text',
        defaultValue: '',
      },
    ],
  },
  pdf_to_word: {
    key: 'pdf_to_word',
    label: 'PDF to Word',
    category: 'Convert',
    description: 'Convert PDF document into editable Microsoft Word (.docx) document.',
    inputTypes: ['pdf'],
    outputType: 'docx',
    supportsWorkflow: true,
    defaultConfig: {
      format: 'docx',
    },
    configFields: [
      {
        name: 'format',
        label: 'Output format',
        type: 'select',
        options: [{ label: 'Microsoft Word (.docx)', value: 'docx' }],
        defaultValue: 'docx',
      },
    ],
  },
  pdf_to_jpg: {
    key: 'pdf_to_jpg',
    label: 'PDF to JPG',
    category: 'Convert',
    description: 'Convert PDF pages into high-resolution JPG images packaged as a ZIP archive.',
    inputTypes: ['pdf'],
    outputType: 'zip',
    supportsWorkflow: true,
    defaultConfig: {
      quality: 85,
    },
    configFields: [
      {
        name: 'quality',
        label: 'JPEG Quality (1 - 100)',
        type: 'number',
        min: 30,
        max: 100,
        defaultValue: 85,
      },
    ],
  },
};

/**
 * Validates whether tool B can accept the output of tool A in a workflow chain.
 */
export function isStepChainCompatible(
  outputType: FileType,
  nextToolKey: string
): { compatible: boolean; error?: string } {
  const nextTool = WORKFLOW_TOOLS[nextToolKey];
  if (!nextTool) {
    return { compatible: false, error: `Tool "${nextToolKey}" is not recognized.` };
  }

  // Check if outputType matches any of nextTool.inputTypes
  const matches = nextTool.inputTypes.some((it) => {
    if (it === outputType) return true;
    if (it === 'pdf[]' && outputType === 'pdf') return true;
    return false;
  });

  if (!matches) {
    return {
      compatible: false,
      error: `"${nextTool.label}" requires ${nextTool.inputTypes.join(' or ')} input, but the previous step outputs ${outputType.toUpperCase()}.`,
    };
  }

  return { compatible: true };
}
