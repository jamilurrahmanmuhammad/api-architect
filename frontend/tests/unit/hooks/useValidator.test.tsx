/**
 * T051: Unit tests for useValidator hook.
 *
 * Tests real-time validation with debouncing functionality.
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useValidator } from '@/hooks/useValidator';

// Create a fresh QueryClient for each test
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

// Wrapper component with QueryClient
function createWrapper() {
  const queryClient = createTestQueryClient();
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useValidator', () => {
  describe('Initial State', () => {
    it('should return initial valid state', () => {
      const { result } = renderHook(() => useValidator(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isValid).toBe(true);
      expect(result.current.errors).toEqual([]);
      expect(result.current.errorCount).toBe(0);
      expect(result.current.warningCount).toBe(0);
      expect(result.current.isValidating).toBe(false);
    });

    it('should return validateNow function', () => {
      const { result } = renderHook(() => useValidator(''), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.validateNow).toBe('function');
    });

    it('should return validationError as null initially', () => {
      const { result } = renderHook(() => useValidator(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.validationError).toBeNull();
    });
  });

  describe('Empty Content', () => {
    it('should be valid for empty content', () => {
      const { result } = renderHook(() => useValidator(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isValid).toBe(true);
      expect(result.current.errors).toEqual([]);
    });

    it('should be valid for whitespace-only content', () => {
      const { result } = renderHook(() => useValidator('   \n\t  '), {
        wrapper: createWrapper(),
      });

      expect(result.current.isValid).toBe(true);
    });

    it('should reset to valid when content becomes empty', () => {
      const { result, rerender } = renderHook(
        ({ content }) => useValidator(content, { debounceMs: 100 }),
        {
          wrapper: createWrapper(),
          initialProps: { content: 'some content' },
        }
      );

      // Change to empty
      rerender({ content: '' });

      expect(result.current.isValid).toBe(true);
      expect(result.current.errors).toEqual([]);
      expect(result.current.errorCount).toBe(0);
    });
  });

  describe('Disabled State', () => {
    it('should not trigger validation when disabled', () => {
      const onValidated = vi.fn();
      const { result } = renderHook(
        () => useValidator('# Service: Test', { onValidated, enabled: false }),
        { wrapper: createWrapper() }
      );

      // Should still be valid (no validation run)
      expect(result.current.isValid).toBe(true);
      expect(result.current.isValidating).toBe(false);
    });

    it('should not validateNow when disabled', () => {
      const { result } = renderHook(
        () => useValidator('# Service: Test', { enabled: false }),
        { wrapper: createWrapper() }
      );

      // Try to validate - should do nothing
      act(() => {
        result.current.validateNow();
      });

      expect(result.current.isValidating).toBe(false);
    });
  });

  describe('Validation Trigger', () => {
    it('should provide validateNow for immediate validation', async () => {
      const onValidated = vi.fn();
      const { result } = renderHook(
        () => useValidator('# Service: Test\nversion: 1.0.0', { debounceMs: 100, onValidated }),
        { wrapper: createWrapper() }
      );

      // Call validateNow
      act(() => {
        result.current.validateNow();
      });

      // Wait for validation to complete (validates that validateNow was called)
      await waitFor(() => {
        expect(onValidated).toHaveBeenCalled();
      });

      expect(result.current.isValidating).toBe(false);
    });

    it('should validate with valid content', async () => {
      const { result } = renderHook(
        () => useValidator('# Service: Test\nversion: 1.0.0'),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.validateNow();
      });

      await waitFor(() => {
        expect(result.current.isValidating).toBe(false);
      });

      expect(result.current.isValid).toBe(true);
      expect(result.current.errors).toEqual([]);
    });

    it('should return errors for invalid content', async () => {
      const { result } = renderHook(
        () => useValidator('**Response**: UndefinedModel'),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.validateNow();
      });

      await waitFor(() => {
        expect(result.current.isValid).toBe(false);
      });

      expect(result.current.errors.length).toBeGreaterThan(0);
      expect(result.current.errorCount).toBeGreaterThan(0);
    });
  });

  describe('Debounce Configuration', () => {
    it('should accept custom debounceMs option', () => {
      // This just ensures the option is accepted without error
      const { result } = renderHook(
        () => useValidator('', { debounceMs: 500 }),
        { wrapper: createWrapper() }
      );

      expect(result.current).toBeDefined();
    });

    it('should use default debounceMs when not specified', () => {
      // This just ensures default works
      const { result } = renderHook(
        () => useValidator(''),
        { wrapper: createWrapper() }
      );

      expect(result.current).toBeDefined();
    });
  });

  describe('Callback Handling', () => {
    it('should call onValidated callback when validation completes', async () => {
      const onValidated = vi.fn();
      const { result } = renderHook(
        () => useValidator('# Service: Test\nversion: 1.0.0', { onValidated }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.validateNow();
      });

      await waitFor(() => {
        expect(onValidated).toHaveBeenCalled();
      });

      expect(onValidated).toHaveBeenCalledWith(
        expect.objectContaining({
          valid: expect.any(Boolean),
          errors: expect.any(Array),
        })
      );
    });
  });

  describe('Error Types', () => {
    it('should detect undefined model references', async () => {
      const { result } = renderHook(
        () => useValidator('**Response**: UndefinedModel'),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.validateNow();
      });

      await waitFor(() => {
        expect(result.current.isValid).toBe(false);
      });

      const hasUndefinedRef = result.current.errors.some(
        (e) => e.error_type === 'UNDEFINED_REFERENCE'
      );
      expect(hasUndefinedRef).toBe(true);
    });

    it('should detect invalid types', async () => {
      const { result } = renderHook(
        () =>
          useValidator(`# Service: Test
version: 1.0.0

## Model: User
| name | type | required |
|------|------|----------|
| id | invalidtype | true |`),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.validateNow();
      });

      await waitFor(() => {
        expect(result.current.isValid).toBe(false);
      });

      const hasInvalidType = result.current.errors.some(
        (e) => e.error_type === 'INVALID_TYPE'
      );
      expect(hasInvalidType).toBe(true);
    });

    it('should detect duplicate models', async () => {
      const { result } = renderHook(
        () =>
          useValidator(`# Service: Test
version: 1.0.0

## Model: User
| name | type | required |
|------|------|----------|
| id | integer | true |

## Model: User
| name | type | required |
|------|------|----------|
| name | string | true |`),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.validateNow();
      });

      await waitFor(() => {
        expect(result.current.isValid).toBe(false);
      });

      const hasDuplicate = result.current.errors.some(
        (e) => e.error_type === 'DUPLICATE_ENTITY'
      );
      expect(hasDuplicate).toBe(true);
    });
  });
});
