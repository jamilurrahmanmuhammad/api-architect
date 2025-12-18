/**
 * T069: Unit tests for editor selection utilities.
 *
 * Tests for highlighting DSL text when clicking preview entities.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateLineRange,
  createEditorDecoration,
  findEntityAtCursor,
  type SourceLocation,
} from '@/utils/editorSelection';

describe('editorSelection', () => {
  describe('calculateLineRange', () => {
    it('should return single line range for entity at one line', () => {
      const location: SourceLocation = { line: 10, column: 1 };
      const result = calculateLineRange(location);

      expect(result).toEqual({
        startLine: 10,
        endLine: 10,
        startColumn: 1,
        endColumn: undefined,
      });
    });

    it('should handle entity with end location', () => {
      const location: SourceLocation = { line: 10, column: 1 };
      const endLocation: SourceLocation = { line: 15, column: 20 };
      const result = calculateLineRange(location, endLocation);

      expect(result).toEqual({
        startLine: 10,
        endLine: 15,
        startColumn: 1,
        endColumn: 20,
      });
    });
  });

  describe('createEditorDecoration', () => {
    it('should create decoration options for highlighting', () => {
      const range = {
        startLine: 10,
        endLine: 10,
        startColumn: 1,
        endColumn: undefined,
      };

      const decoration = createEditorDecoration(range);

      expect(decoration).toHaveProperty('range');
      expect(decoration).toHaveProperty('options');
      expect(decoration.options).toHaveProperty('isWholeLine', true);
      expect(decoration.options).toHaveProperty('className');
    });

    it('should use provided highlight class', () => {
      const range = {
        startLine: 10,
        endLine: 10,
        startColumn: 1,
        endColumn: undefined,
      };

      const decoration = createEditorDecoration(range, 'custom-highlight');

      expect(decoration.options.className).toBe('custom-highlight');
    });
  });

  describe('findEntityAtCursor', () => {
    const mockEntities = [
      { name: 'Service1', location: { line: 1, column: 1 }, endLine: 5 },
      { name: 'Model1', location: { line: 10, column: 1 }, endLine: 20 },
      { name: 'Model2', location: { line: 25, column: 1 }, endLine: 30 },
    ];

    it('should find entity containing cursor line', () => {
      const result = findEntityAtCursor(15, mockEntities);

      expect(result).not.toBeNull();
      expect(result?.name).toBe('Model1');
    });

    it('should return null when cursor not in any entity', () => {
      const result = findEntityAtCursor(8, mockEntities);

      expect(result).toBeNull();
    });

    it('should find entity at exact start line', () => {
      const result = findEntityAtCursor(10, mockEntities);

      expect(result).not.toBeNull();
      expect(result?.name).toBe('Model1');
    });

    it('should find entity at exact end line', () => {
      const result = findEntityAtCursor(20, mockEntities);

      expect(result).not.toBeNull();
      expect(result?.name).toBe('Model1');
    });

    it('should return null for empty entities array', () => {
      const result = findEntityAtCursor(10, []);

      expect(result).toBeNull();
    });
  });
});
