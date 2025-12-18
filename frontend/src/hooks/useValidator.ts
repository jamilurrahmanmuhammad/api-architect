/**
 * T051: useValidator hook for real-time DSL validation.
 *
 * Provides debounced validation with real-time feedback suitable for
 * integration with the Monaco editor.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8765/api/v1';

/**
 * Validation error from the API.
 */
export interface ValidationError {
  line: number;
  column: number;
  message: string;
  error_type: string;
  severity: 'error' | 'warning';
  guidance: string | null;
}

/**
 * Validation result from the API.
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  error_count: number;
  warning_count: number;
}

/**
 * Return type for useValidator hook.
 */
export interface UseValidatorResult {
  /** Current validation errors and warnings */
  errors: ValidationError[];
  /** Whether the content is valid (no errors) */
  isValid: boolean;
  /** Whether validation is currently in progress */
  isValidating: boolean;
  /** Number of errors (severity=error) */
  errorCount: number;
  /** Number of warnings (severity=warning) */
  warningCount: number;
  /** Trigger validation immediately (bypasses debounce) */
  validateNow: () => void;
  /** Any error from the validation API call */
  validationError: Error | null;
}

/**
 * Options for useValidator hook.
 */
export interface UseValidatorOptions {
  /** Debounce delay in milliseconds (default: 300ms) */
  debounceMs?: number;
  /** Whether validation is enabled (default: true) */
  enabled?: boolean;
  /** Callback when validation completes */
  onValidated?: (result: ValidationResult) => void;
}

/**
 * Hook for real-time DSL validation with debouncing.
 *
 * Automatically validates content after a debounce period, suitable for
 * integration with text editors where the user is typing.
 *
 * @param content - DSL content to validate
 * @param options - Hook options
 * @returns Validation state and controls
 *
 * @example
 * ```tsx
 * const { errors, isValid, isValidating } = useValidator(editorContent, {
 *   debounceMs: 500,
 *   onValidated: (result) => console.log('Validated:', result.valid),
 * });
 * ```
 */
export function useValidator(
  content: string,
  options: UseValidatorOptions = {}
): UseValidatorResult {
  const { debounceMs = 300, enabled = true, onValidated } = options;

  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isValid, setIsValid] = useState(true);
  const [errorCount, setErrorCount] = useState(0);
  const [warningCount, setWarningCount] = useState(0);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastContentRef = useRef<string>('');
  const onValidatedRef = useRef(onValidated);

  // Keep callback ref updated
  useEffect(() => {
    onValidatedRef.current = onValidated;
  }, [onValidated]);

  // Validation mutation
  const mutation = useMutation({
    mutationFn: async (contentToValidate: string): Promise<ValidationResult> => {
      const response = await fetch(`${API_BASE_URL}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: contentToValidate }),
      });
      if (!response.ok) {
        throw new Error('Failed to validate DSL');
      }
      return response.json();
    },
    onSuccess: (result) => {
      setErrors(result.errors);
      setIsValid(result.valid);
      setErrorCount(result.error_count);
      setWarningCount(result.warning_count);
      onValidatedRef.current?.(result);
    },
  });

  // Validate immediately (bypass debounce)
  const validateNow = useCallback(() => {
    if (!enabled || !content) return;

    // Cancel any pending debounced validation
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    mutation.mutate(content);
  }, [content, enabled, mutation]);

  // Debounced validation on content change
  useEffect(() => {
    // Skip if disabled or content hasn't changed
    if (!enabled || content === lastContentRef.current) {
      return;
    }

    lastContentRef.current = content;

    // Handle empty content
    if (!content || !content.trim()) {
      setErrors([]);
      setIsValid(true);
      setErrorCount(0);
      setWarningCount(0);
      return;
    }

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new debounced validation
    debounceTimerRef.current = setTimeout(() => {
      mutation.mutate(content);
    }, debounceMs);

    // Cleanup on unmount or content change
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [content, enabled, debounceMs, mutation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    errors,
    isValid,
    isValidating: mutation.isPending,
    errorCount,
    warningCount,
    validateNow,
    validationError: mutation.error as Error | null,
  };
}

/**
 * Navigate to error location in editor.
 *
 * Helper function to scroll Monaco editor to an error location.
 *
 * @param editor - Monaco editor instance
 * @param error - Validation error to navigate to
 */
export function navigateToError(
  editor: {
    revealLineInCenter: (line: number) => void;
    setPosition: (position: { lineNumber: number; column: number }) => void;
    focus: () => void;
  },
  error: ValidationError
): void {
  editor.revealLineInCenter(error.line);
  editor.setPosition({ lineNumber: error.line, column: error.column });
  editor.focus();
}

export default useValidator;
