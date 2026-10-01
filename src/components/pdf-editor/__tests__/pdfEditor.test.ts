import { describe, it, expect } from 'vitest';
import {
  screenToPageCoords,
  pageToScreenCoords,
  pageToPdfLibCoords,
  hexToPdfLibRgb,
} from '../coordinateUtils';
import { HistoryManager } from '../HistoryManager';
import { EditorObject } from '../types';

describe('PDF Editor Coordinate Utilities', () => {
  it('should accurately transform screen coordinates to editor page points', () => {
    // 100 screen px at scale 2.0 -> 50 points
    const point = screenToPageCoords(100, 200, 2.0);
    expect(point.x).toBe(50);
    expect(point.y).toBe(100);
  });

  it('should accurately transform page points to screen coordinates', () => {
    // 50 points at scale 1.5 -> 75 px
    const screen = pageToScreenCoords(50, 100, 1.5);
    expect(screen.x).toBe(75);
    expect(screen.y).toBe(150);
  });

  it('should convert top-left page points to pdf-lib bottom-left coordinate space', () => {
    const pageHeight = 792; // Standard Letter height
    const elementX = 50;
    const elementY = 100;
    const elementWidth = 200;
    const elementHeight = 40;

    const pdfLibCoords = pageToPdfLibCoords(elementX, elementY, elementWidth, elementHeight, pageHeight);
    expect(pdfLibCoords.x).toBe(50);
    // pdf-lib y = pageHeight - (y + height) = 792 - 140 = 652
    expect(pdfLibCoords.y).toBe(652);
    expect(pdfLibCoords.width).toBe(200);
    expect(pdfLibCoords.height).toBe(40);
  });

  it('should correctly parse hex colors to pdf-lib RGB channels', () => {
    const black = hexToPdfLibRgb('#000000');
    expect(black.red).toBe(0);
    expect(black.green).toBe(0);
    expect(black.blue).toBe(0);

    const white = hexToPdfLibRgb('#ffffff');
    expect(white.red).toBe(1);
    expect(white.green).toBe(1);
    expect(white.blue).toBe(1);

    const blue = hexToPdfLibRgb('#055efe');
    expect(blue.red).toBeCloseTo(0.0196, 2);
    expect(blue.green).toBeCloseTo(0.3686, 2);
    expect(blue.blue).toBeCloseTo(0.996, 2);
  });
});

describe('PDF Editor HistoryManager', () => {
  it('should initialize with initial state and support undo and redo', () => {
    const initialObjects: EditorObject[] = [];

    const history = new HistoryManager(initialObjects);
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(false);

    // Push new state with an added text element
    const textElement: EditorObject = {
      id: 'txt-1',
      type: 'text',
      page: 1,
      x: 100,
      y: 150,
      width: 200,
      height: 30,
      rotation: 0,
      content: 'Contract Agreement',
      fontFamily: 'Helvetica',
      fontSize: 16,
      fontWeight: 'bold',
      fontStyle: 'normal',
      underline: false,
      color: '#0C162C',
      opacity: 1,
      align: 'left',
    };

    history.push([textElement], 'Add Text');

    expect(history.canUndo()).toBe(true);
    expect(history.canRedo()).toBe(false);
    expect(history.getCurrent().length).toBe(1);

    // Undo action
    const undoneState = history.undo();
    expect(undoneState).toBeDefined();
    expect(undoneState!.length).toBe(0);
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(true);

    // Redo action
    const redoneState = history.redo();
    expect(redoneState).toBeDefined();
    expect(redoneState!.length).toBe(1);
    expect((redoneState![0] as any).content).toBe('Contract Agreement');
    expect(history.canUndo()).toBe(true);
    expect(history.canRedo()).toBe(false);
  });

  it('should truncate forward redo stack when new action is pushed after undo', () => {
    const history = new HistoryManager([]);

    history.push([
      {
        id: 'elem-1',
        type: 'text',
        page: 1,
        x: 10,
        y: 10,
        width: 50,
        height: 20,
        rotation: 0,
        content: 'One',
        fontFamily: 'Helvetica',
        fontSize: 12,
        fontWeight: 'normal',
        fontStyle: 'normal',
        underline: false,
        color: '#000000',
        opacity: 1,
        align: 'left',
      },
    ]);

    history.undo();
    expect(history.canRedo()).toBe(true);

    // Push new alternative state
    history.push([
      {
        id: 'elem-2',
        type: 'text',
        page: 1,
        x: 20,
        y: 20,
        width: 60,
        height: 25,
        rotation: 0,
        content: 'Two',
        fontFamily: 'Helvetica',
        fontSize: 14,
        fontWeight: 'normal',
        fontStyle: 'normal',
        underline: false,
        color: '#000000',
        opacity: 1,
        align: 'left',
      },
    ]);

    // Redo should now be discarded
    expect(history.canRedo()).toBe(false);
    expect((history.getCurrent()[0] as any).content).toBe('Two');
  });
});
