/**
 * Frontend Workflow Tool Registry & Types
 */

import {
  FilePlus,
  Scissors,
  RotateCw,
  FileText,
  Stamp,
  Lock,
  Unlock,
  FileCode,
  Image as ImageIcon,
} from 'lucide-react';
import React from 'react';

export type FileType = 'pdf' | 'pdf[]' | 'docx' | 'xlsx' | 'jpg' | 'zip';
export type ToolCategory = 'Organize' | 'Optimize' | 'Convert' | 'Security';

export interface WorkflowToolItem {
  key: string;
  label: string;
  category: ToolCategory;
  description: string;
  iconName: string;
  inputTypes: FileType[];
  outputType: FileType;
  defaultConfig: Record<string, any>;
}

export const WORKFLOW_MAX_STEPS = 4;

export const FRONTEND_WORKFLOW_TOOLS: Record<string, WorkflowToolItem> = {
  merge: {
    key: 'merge',
    label: 'Merge PDF',
    category: 'Organize',
    description: 'Combine multiple PDF files or pages into one document.',
    iconName: 'FilePlus',
    inputTypes: ['pdf', 'pdf[]'],
    outputType: 'pdf',
    defaultConfig: { addBlankSeparators: false },
  },
  split: {
    key: 'split',
    label: 'Split PDF',
    category: 'Organize',
    description: 'Extract specific page intervals or single pages.',
    iconName: 'Scissors',
    inputTypes: ['pdf'],
    outputType: 'pdf',
    defaultConfig: { pageRanges: '1-3' },
  },
  rotate: {
    key: 'rotate',
    label: 'Rotate PDF',
    category: 'Organize',
    description: 'Rotate pages by 90°, 180°, or 270° clockwise.',
    iconName: 'RotateCw',
    inputTypes: ['pdf'],
    outputType: 'pdf',
    defaultConfig: { rotationAngle: 90 },
  },
  compress: {
    key: 'compress',
    label: 'Compress PDF',
    category: 'Optimize',
    description: 'Reduce file size while preserving high visual quality.',
    iconName: 'FileText',
    inputTypes: ['pdf'],
    outputType: 'pdf',
    defaultConfig: { level: 'medium' },
  },
  watermark: {
    key: 'watermark',
    label: 'Watermark PDF',
    category: 'Security',
    description: 'Stamp custom semi-transparent text across document pages.',
    iconName: 'Stamp',
    inputTypes: ['pdf'],
    outputType: 'pdf',
    defaultConfig: {
      text: 'CONFIDENTIAL',
      fontSize: 36,
      opacity: 0.3,
      position: 'center',
      rotationDegrees: 45,
      color: 'gray',
    },
  },
  protect: {
    key: 'protect',
    label: 'Protect PDF',
    category: 'Security',
    description: 'Add standard password protection to the PDF document.',
    iconName: 'Lock',
    inputTypes: ['pdf'],
    outputType: 'pdf',
    defaultConfig: { userPassword: '' },
  },
  unlock: {
    key: 'unlock',
    label: 'Unlock PDF',
    category: 'Security',
    description: 'Remove password protection from an authorized PDF document.',
    iconName: 'Unlock',
    inputTypes: ['pdf'],
    outputType: 'pdf',
    defaultConfig: { password: '' },
  },
  pdf_to_word: {
    key: 'pdf_to_word',
    label: 'PDF to Word',
    category: 'Convert',
    description: 'Convert PDF document into editable Microsoft Word (.docx) document.',
    iconName: 'FileCode',
    inputTypes: ['pdf'],
    outputType: 'docx',
    defaultConfig: { format: 'docx' },
  },
  pdf_to_jpg: {
    key: 'pdf_to_jpg',
    label: 'PDF to JPG',
    category: 'Convert',
    description: 'Convert PDF pages into high-resolution JPG images packaged as a ZIP archive.',
    iconName: 'ImageIcon',
    inputTypes: ['pdf'],
    outputType: 'zip',
    defaultConfig: { quality: 85 },
  },
};

export function checkChainCompatibility(
  currentOutputType: FileType,
  nextToolKey: string
): { compatible: boolean; error?: string } {
  const nextTool = FRONTEND_WORKFLOW_TOOLS[nextToolKey];
  if (!nextTool) return { compatible: false, error: 'Unrecognized tool.' };

  const matches = nextTool.inputTypes.some((it) => {
    if (it === currentOutputType) return true;
    if (it === 'pdf[]' && currentOutputType === 'pdf') return true;
    return false;
  });

  if (!matches) {
    return {
      compatible: false,
      error: `"${nextTool.label}" requires ${nextTool.inputTypes.join(' or ')} input, but previous step produces ${currentOutputType.toUpperCase()}.`,
    };
  }

  return { compatible: true };
}
