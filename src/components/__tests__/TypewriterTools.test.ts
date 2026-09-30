import { describe, it, expect } from 'vitest';
import { TYPEWRITER_TOOLS } from '../TypewriterTools';
import { TOOL_CANONICAL_PATHS } from '../HomePage';

describe('TypewriterTools Registry & Verification', () => {
  it('should only contain verified, existing tools in the repository', () => {
    expect(TYPEWRITER_TOOLS.length).toBeGreaterThan(15);

    for (const item of TYPEWRITER_TOOLS) {
      expect(item.phrase).toBeTruthy();
      expect(item.toolId).toBeTruthy();
      expect(item.category).toBeTruthy();

      // Verify that every single tool exists in the canonical paths registry
      expect(TOOL_CANONICAL_PATHS[item.toolId]).toBeDefined();
    }
  });

  it('should categorize tools across the core ZipStream capabilities', () => {
    const categories = new Set(TYPEWRITER_TOOLS.map((t) => t.category));
    expect(categories.has('Essentials')).toBe(true);
    expect(categories.has('Conversion')).toBe(true);
    expect(categories.has('Security')).toBe(true);
    expect(categories.has('AI & OCR')).toBe(true);
    expect(categories.has('Collaboration')).toBe(true);
    expect(categories.has('Business')).toBe(true);
  });

  it('should not contain duplicate consecutive phrases', () => {
    for (let i = 0; i < TYPEWRITER_TOOLS.length - 1; i++) {
      expect(TYPEWRITER_TOOLS[i].phrase).not.toBe(TYPEWRITER_TOOLS[i + 1].phrase);
    }
  });
});
