/**
 * ZipStream PDF Editor — Structured Object Model & Type Definitions
 */

export type EditorToolType =
  | 'select'
  | 'text'
  | 'image'
  | 'rectangle'
  | 'circle'
  | 'line'
  | 'arrow'
  | 'highlight'
  | 'underline'
  | 'strikethrough'
  | 'draw'
  | 'comment'
  | 'eraser';

export type FontOption = 'Helvetica' | 'TimesRoman' | 'Courier' | 'Arial';

export interface BaseEditorObject {
  id: string;
  type: string;
  page: number; // 1-indexed page number
  x: number;    // PDF page coordinate (points at 72 DPI, measured from top-left during edit)
  y: number;    // PDF page coordinate (points at 72 DPI, measured from top-left during edit)
  width: number;
  height: number;
  rotation?: number; // degrees (0, 90, 180, 270 or arbitrary)
  opacity?: number;  // 0.0 to 1.0
}

export interface TextObject extends BaseEditorObject {
  type: 'text';
  content: string;
  fontFamily: FontOption;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline';
  color: string; // hex (e.g. #0C162C, #055EFE, #FF0000)
  textAlign: 'left' | 'center' | 'right';
  backgroundColor?: string;
}

export interface ImageObject extends BaseEditorObject {
  type: 'image';
  dataUrl: string;
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
  originalWidth: number;
  originalHeight: number;
  aspectRatio: number;
}

export interface ShapeObject extends BaseEditorObject {
  type: 'shape';
  shapeType: 'rectangle' | 'circle' | 'line' | 'arrow';
  fill: string; // hex or 'transparent'
  stroke: string; // hex
  strokeWidth: number;
  strokeDashArray?: string; // e.g. "4 4" for dashed
}

export interface HighlightObject extends BaseEditorObject {
  type: 'highlight';
  color: string; // default #FFE814
  opacity: number; // default 0.35
}

export interface MarkupObject extends BaseEditorObject {
  type: 'markup';
  markupType: 'underline' | 'strikethrough';
  color: string; // default #FF3B30 or #055EFE
  strokeWidth: number;
}

export interface DrawPoint {
  x: number;
  y: number;
}

export interface DrawObject extends BaseEditorObject {
  type: 'draw';
  points: DrawPoint[];
  color: string;
  strokeWidth: number;
  opacity: number;
}

export interface CommentObject extends BaseEditorObject {
  type: 'comment';
  author: string;
  content: string;
  color: string; // marker pin color
  createdAt: number;
  isOpen?: boolean;
}

export type EditorObject =
  | TextObject
  | ImageObject
  | ShapeObject
  | HighlightObject
  | MarkupObject
  | DrawObject
  | CommentObject;

export interface PageDimensions {
  width: number;
  height: number;
  rotation: number;
}

export interface EditorHistoryState {
  objects: EditorObject[];
  description: string;
}

export interface ActiveToolSettings {
  // Text
  fontFamily: FontOption;
  fontSize: number;
  textColor: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline';
  textAlign: 'left' | 'center' | 'right';
  // Shapes
  shapeFill: string;
  shapeStroke: string;
  shapeStrokeWidth: number;
  shapeOpacity: number;
  // Highlight
  highlightColor: string;
  highlightOpacity: number;
  // Draw
  drawColor: string;
  drawWidth: number;
  drawOpacity: number;
  // Markup
  markupColor: string;
  markupWidth: number;
  // Comment
  commentColor: string;
}

export const DEFAULT_TOOL_SETTINGS: ActiveToolSettings = {
  fontFamily: 'Helvetica',
  fontSize: 16,
  textColor: '#0C162C',
  fontWeight: 'normal',
  fontStyle: 'normal',
  textDecoration: 'none',
  textAlign: 'left',

  shapeFill: 'transparent',
  shapeStroke: '#055EFE',
  shapeStrokeWidth: 2,
  shapeOpacity: 1,

  highlightColor: '#FFE814',
  highlightOpacity: 0.35,

  drawColor: '#055EFE',
  drawWidth: 3,
  drawOpacity: 1,

  markupColor: '#EF4444',
  markupWidth: 2,

  commentColor: '#F59E0B',
};
