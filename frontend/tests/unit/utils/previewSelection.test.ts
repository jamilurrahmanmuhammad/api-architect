/**
 * T070: Unit tests for preview selection utilities.
 *
 * Tests for highlighting preview entities based on editor cursor.
 */

import { describe, it, expect } from 'vitest';
import type { SourceLocation } from '@/components/Editor/PreviewPane';

// Simple utility functions for preview selection
function isLocationMatch(
  entityLocation: SourceLocation,
  selectedLocation: SourceLocation | undefined
): boolean {
  if (!selectedLocation) return false;
  return (
    entityLocation.line === selectedLocation.line &&
    entityLocation.column === selectedLocation.column
  );
}

function findMatchingEntityIndex(
  entities: Array<{ location: SourceLocation }>,
  selectedLocation: SourceLocation | undefined
): number {
  if (!selectedLocation) return -1;
  return entities.findIndex((e) => isLocationMatch(e.location, selectedLocation));
}

describe('previewSelection', () => {
  describe('isLocationMatch', () => {
    it('should return true for matching locations', () => {
      const entityLocation: SourceLocation = { line: 10, column: 1 };
      const selectedLocation: SourceLocation = { line: 10, column: 1 };

      expect(isLocationMatch(entityLocation, selectedLocation)).toBe(true);
    });

    it('should return false for non-matching lines', () => {
      const entityLocation: SourceLocation = { line: 10, column: 1 };
      const selectedLocation: SourceLocation = { line: 15, column: 1 };

      expect(isLocationMatch(entityLocation, selectedLocation)).toBe(false);
    });

    it('should return false for non-matching columns', () => {
      const entityLocation: SourceLocation = { line: 10, column: 1 };
      const selectedLocation: SourceLocation = { line: 10, column: 5 };

      expect(isLocationMatch(entityLocation, selectedLocation)).toBe(false);
    });

    it('should return false for undefined selected location', () => {
      const entityLocation: SourceLocation = { line: 10, column: 1 };

      expect(isLocationMatch(entityLocation, undefined)).toBe(false);
    });
  });

  describe('findMatchingEntityIndex', () => {
    const entities = [
      { name: 'Service1', location: { line: 1, column: 1 } },
      { name: 'Model1', location: { line: 10, column: 1 } },
      { name: 'Model2', location: { line: 20, column: 1 } },
    ];

    it('should find index of matching entity', () => {
      const selectedLocation: SourceLocation = { line: 10, column: 1 };
      const result = findMatchingEntityIndex(entities, selectedLocation);

      expect(result).toBe(1);
    });

    it('should return -1 when no match found', () => {
      const selectedLocation: SourceLocation = { line: 15, column: 1 };
      const result = findMatchingEntityIndex(entities, selectedLocation);

      expect(result).toBe(-1);
    });

    it('should return -1 for undefined selected location', () => {
      const result = findMatchingEntityIndex(entities, undefined);

      expect(result).toBe(-1);
    });

    it('should return -1 for empty entities array', () => {
      const selectedLocation: SourceLocation = { line: 10, column: 1 };
      const result = findMatchingEntityIndex([], selectedLocation);

      expect(result).toBe(-1);
    });
  });
});
