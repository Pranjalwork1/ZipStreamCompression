/**
 * ZipStream PDF Editor — Undo / Redo History Manager
 * 
 * Manages an immutable snapshot stack of editor objects with operation descriptions.
 */

import { EditorObject, EditorHistoryState } from './types';

export class HistoryManager {
  private past: EditorHistoryState[] = [];
  private present: EditorHistoryState;
  private future: EditorHistoryState[] = [];
  private maxDepth: number;

  constructor(initialObjects: EditorObject[] = [], maxDepth = 40) {
    this.maxDepth = maxDepth;
    this.present = {
      objects: JSON.parse(JSON.stringify(initialObjects)),
      description: 'Initial state',
    };
  }

  /**
   * Pushes a new state after a user action. Clears redo future.
   */
  public push(newObjects: EditorObject[], description = 'Edit'): void {
    // Avoid pushing duplicate identical states
    if (JSON.stringify(newObjects) === JSON.stringify(this.present.objects)) {
      return;
    }

    this.past.push(this.present);
    if (this.past.length > this.maxDepth) {
      this.past.shift();
    }

    this.present = {
      objects: JSON.parse(JSON.stringify(newObjects)),
      description,
    };
    this.future = [];
  }

  public canUndo(): boolean {
    return this.past.length > 0;
  }

  public canRedo(): boolean {
    return this.future.length > 0;
  }

  public undo(): EditorObject[] | null {
    if (!this.canUndo()) return null;

    const previous = this.past.pop()!;
    this.future.unshift(this.present);
    this.present = previous;

    return JSON.parse(JSON.stringify(this.present.objects));
  }

  public redo(): EditorObject[] | null {
    if (!this.canRedo()) return null;

    const next = this.future.shift()!;
    this.past.push(this.present);
    this.present = next;

    return JSON.parse(JSON.stringify(this.present.objects));
  }

  public getCurrent(): EditorObject[] {
    return JSON.parse(JSON.stringify(this.present.objects));
  }

  public clear(initialObjects: EditorObject[] = []): void {
    this.past = [];
    this.future = [];
    this.present = {
      objects: JSON.parse(JSON.stringify(initialObjects)),
      description: 'Reset state',
    };
  }
}
