/**
 * T066: useParser hook for parsing DSL content.
 *
 * Features:
 * - Debounced parsing (default 1000ms)
 * - Caches results for unchanged content
 * - Handles loading and error states
 * - Manual refresh function
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ParsedResult } from '@/components/Editor/PreviewPane';

export interface UseParserOptions {
  /** Debounce delay in milliseconds (default: 1000) */
  debounceMs?: number;
  /** API base URL (default: VITE_API_URL or localhost:8765) */
  apiUrl?: string;
}

export interface UseParserReturn {
  /** Parsed result data */
  data: ParsedResult | null;
  /** Whether parsing is in progress */
  isLoading: boolean;
  /** Error message if parsing failed */
  error: string | null;
  /** Manually trigger a parse (bypasses debounce) */
  refresh: () => Promise<void>;
}

const DEFAULT_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8765';
const DEFAULT_DEBOUNCE_MS = 1000;

/**
 * Hook for parsing DSL content with debouncing and caching.
 *
 * @param content - DSL content to parse
 * @param options - Configuration options
 * @returns Parser state and controls
 */
export function useParser(
  content: string,
  options: UseParserOptions = {}
): UseParserReturn {
  const {
    debounceMs = DEFAULT_DEBOUNCE_MS,
    apiUrl = DEFAULT_API_URL,
  } = options;

  const [data, setData] = useState<ParsedResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track last parsed content to avoid duplicate requests
  const lastParsedContentRef = useRef<string>('');
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Parse content via API
   */
  const parseContent = useCallback(async (contentToParse: string) => {
    // Skip empty/whitespace content
    if (!contentToParse.trim()) {
      setData(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    // Skip if content hasn't changed
    if (contentToParse === lastParsedContentRef.current) {
      return;
    }

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/api/v1/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: contentToParse }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Parse failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      lastParsedContentRef.current = contentToParse;
      setData(result);
      setError(null);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was cancelled, ignore
        return;
      }
      setError(err instanceof Error ? err.message : 'Unknown error');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl]);

  /**
   * Manual refresh (bypasses debounce)
   */
  const refresh = useCallback(async () => {
    // Clear cached content to force re-parse
    lastParsedContentRef.current = '';
    await parseContent(content);
  }, [content, parseContent]);

  /**
   * Debounced parsing effect
   */
  useEffect(() => {
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Skip empty content
    if (!content.trim()) {
      setData(null);
      setError(null);
      return;
    }

    // Schedule parse after debounce
    debounceTimeoutRef.current = setTimeout(() => {
      parseContent(content);
    }, debounceMs);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [content, debounceMs, parseContent]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    data,
    isLoading,
    error,
    refresh,
  };
}

export default useParser;
