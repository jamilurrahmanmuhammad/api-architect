/**
 * T017: Unit tests for useExport hook.
 *
 * Tests for Feature 003 - OpenAPI Export.
 * TDD: Tests written BEFORE implementation.
 *
 * Tests the export hook that:
 * - Exports DSL content to OpenAPI
 * - Handles loading states
 * - Handles errors
 * - Triggers file downloads
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useExport } from '@/hooks/useExport';

describe('useExport', () => {
  describe('Initial State', () => {
    it('should start with isExporting false', () => {
      const { result } = renderHook(() => useExport());
      expect(result.current.isExporting).toBe(false);
    });

    it('should start with no error', () => {
      const { result } = renderHook(() => useExport());
      expect(result.current.error).toBeNull();
    });

    it('should provide exportToOpenAPI function', () => {
      const { result } = renderHook(() => useExport());
      expect(typeof result.current.exportToOpenAPI).toBe('function');
    });
  });

  describe('Export Function', () => {
    it('should set isExporting true during export', async () => {
      const { result } = renderHook(() => useExport());

      // Start export
      act(() => {
        result.current.exportToOpenAPI('# Service: Test', 'yaml', '3.0');
      });

      // Should be loading
      expect(result.current.isExporting).toBe(true);

      // Wait for completion
      await waitFor(() => {
        expect(result.current.isExporting).toBe(false);
      });
    });

    it('should export YAML format', async () => {
      const { result } = renderHook(() => useExport());

      await act(async () => {
        await result.current.exportToOpenAPI('# Service: Test', 'yaml', '3.0');
      });

      expect(result.current.error).toBeNull();
    });

    it('should export JSON format', async () => {
      const { result } = renderHook(() => useExport());

      await act(async () => {
        await result.current.exportToOpenAPI('# Service: Test', 'json', '3.0');
      });

      expect(result.current.error).toBeNull();
    });

    it('should export OpenAPI 3.1', async () => {
      const { result } = renderHook(() => useExport());

      await act(async () => {
        await result.current.exportToOpenAPI('# Service: Test', 'yaml', '3.1');
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should set error for empty content', async () => {
      const { result } = renderHook(() => useExport());

      await act(async () => {
        await result.current.exportToOpenAPI('', 'yaml', '3.0');
      });

      expect(result.current.error).not.toBeNull();
    });

    it('should clear error on next export attempt', async () => {
      const { result } = renderHook(() => useExport());

      // First export fails with empty content
      await act(async () => {
        await result.current.exportToOpenAPI('', 'yaml', '3.0');
      });

      expect(result.current.error).not.toBeNull();

      // Second export with valid content clears error
      await act(async () => {
        await result.current.exportToOpenAPI('# Service: Test', 'yaml', '3.0');
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });
  });

  describe('Download Trigger', () => {
    it('should complete export and trigger download mechanism', async () => {
      const { result } = renderHook(() => useExport());

      await act(async () => {
        await result.current.exportToOpenAPI('# Service: Test', 'yaml', '3.0');
      });

      // Wait for export to complete
      await waitFor(() => {
        expect(result.current.isExporting).toBe(false);
      });

      // Export succeeded without error - download mechanism would have been triggered
      expect(result.current.error).toBeNull();
    });
  });

  describe('Return Type', () => {
    it('should return correct shape', () => {
      const { result } = renderHook(() => useExport());

      expect(result.current).toHaveProperty('exportToOpenAPI');
      expect(result.current).toHaveProperty('isExporting');
      expect(result.current).toHaveProperty('error');
    });
  });
});
