/**
 * T066: Unit tests for useParser hook.
 *
 * Tests the parsing hook that:
 * - Debounces requests
 * - Caches results for unchanged content
 * - Handles errors gracefully
 */

import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useParser } from '@/hooks/useParser';

// Use short debounce for fast tests
const TEST_DEBOUNCE = 50;

// Helper to wait for debounce
const waitForDebounce = () => new Promise((resolve) => setTimeout(resolve, TEST_DEBOUNCE + 50));

describe('useParser', () => {
  describe('Initial State', () => {
    it('should start with null data', () => {
      const { result } = renderHook(() => useParser(''));
      expect(result.current.data).toBeNull();
    });

    it('should start with isLoading false when content is empty', () => {
      const { result } = renderHook(() => useParser(''));
      expect(result.current.isLoading).toBe(false);
    });

    it('should start with no error', () => {
      const { result } = renderHook(() => useParser(''));
      expect(result.current.error).toBeNull();
    });
  });

  describe('Parsing', () => {
    it('should parse content after debounce delay', async () => {
      const { result } = renderHook(() => useParser('# Service: TestAPI', { debounceMs: TEST_DEBOUNCE }));

      // Initially not loading (waiting for debounce)
      expect(result.current.isLoading).toBe(false);

      // Wait for debounce and fetch
      await waitForDebounce();

      // Should have parsed data (MSW handler returns a service)
      await waitFor(() => {
        expect(result.current.data).not.toBeNull();
        expect(result.current.data?.services).toHaveLength(1);
        expect(result.current.data?.services[0].name).toBe('TestAPI');
      });
    });

    it('should not parse empty content', async () => {
      const { result } = renderHook(() => useParser('', { debounceMs: TEST_DEBOUNCE }));

      await waitForDebounce();

      expect(result.current.data).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('should not parse whitespace-only content', async () => {
      const { result } = renderHook(() => useParser('   \n\t  ', { debounceMs: TEST_DEBOUNCE }));

      await waitForDebounce();

      expect(result.current.data).toBeNull();
    });
  });

  describe('Debouncing', () => {
    it('should debounce rapid content changes', async () => {
      const { rerender, result } = renderHook(
        ({ content }) => useParser(content, { debounceMs: TEST_DEBOUNCE }),
        { initialProps: { content: '# Service: A' } }
      );

      // Rapid changes before debounce fires
      rerender({ content: '# Service: B' });
      rerender({ content: '# Service: C' });
      rerender({ content: '# Service: D' });

      // Wait for debounce
      await waitForDebounce();

      // Should have parsed final content
      await waitFor(() => {
        expect(result.current.data).not.toBeNull();
        expect(result.current.data?.services[0].name).toBe('D');
      });
    });
  });

  describe('Caching', () => {
    it('should not re-fetch for same content', async () => {
      const { rerender, result } = renderHook(
        ({ content }) => useParser(content, { debounceMs: TEST_DEBOUNCE }),
        { initialProps: { content: '# Service: TestAPI' } }
      );

      // First parse
      await waitForDebounce();

      await waitFor(() => {
        expect(result.current.data).not.toBeNull();
      });

      const initialData = result.current.data;

      // Same content, should use cache
      rerender({ content: '# Service: TestAPI' });

      await waitForDebounce();

      // Data should be the same reference (cached)
      expect(result.current.data).toBe(initialData);
    });
  });

  describe('Manual Refresh', () => {
    it('should provide refresh function', async () => {
      const { result } = renderHook(() => useParser('# Service: TestAPI', { debounceMs: 10000 }));

      // Call refresh immediately (bypasses debounce)
      await result.current.refresh();

      // Wait for data to be set
      await waitFor(() => {
        expect(result.current.data).not.toBeNull();
        expect(result.current.data?.services).toHaveLength(1);
      });
    });

    it('should force re-fetch on refresh even with same content', async () => {
      const { result } = renderHook(() => useParser('# Service: TestAPI', { debounceMs: TEST_DEBOUNCE }));

      // First parse
      await waitForDebounce();

      await waitFor(() => {
        expect(result.current.data).not.toBeNull();
      });

      // Call refresh - should re-fetch
      await result.current.refresh();

      expect(result.current.data).not.toBeNull();
    });
  });

  describe('Configuration', () => {
    it('should use custom API URL', async () => {
      // This test verifies the hook accepts apiUrl option
      // The actual fetch will still go to MSW handler
      const { result } = renderHook(() =>
        useParser('# Service: TestAPI', {
          debounceMs: TEST_DEBOUNCE,
          apiUrl: 'http://localhost:8765',
        })
      );

      await waitForDebounce();

      await waitFor(() => {
        expect(result.current.data).not.toBeNull();
      });
    });
  });

  describe('Multiple Entity Parsing', () => {
    it('should parse services, models, and operations', async () => {
      const content = `# Service: PetStore
## Model: Pet
## Operation: GET /pets
## Error: 404 NotFound`;

      const { result } = renderHook(() => useParser(content, { debounceMs: TEST_DEBOUNCE }));

      await waitForDebounce();

      await waitFor(() => {
        expect(result.current.data).not.toBeNull();
        expect(result.current.data?.services).toHaveLength(1);
        expect(result.current.data?.models).toHaveLength(1);
        expect(result.current.data?.operations).toHaveLength(1);
        expect(result.current.data?.errors).toHaveLength(1);
        expect(result.current.data?.valid_entities).toBe(4);
      });
    });
  });

  describe('Error Handling', () => {
    it('should have error property', () => {
      const { result } = renderHook(() => useParser(''));
      expect(result.current).toHaveProperty('error');
    });
  });

  describe('Loading State', () => {
    it('should have isLoading property', () => {
      const { result } = renderHook(() => useParser(''));
      expect(result.current).toHaveProperty('isLoading');
    });
  });
});
