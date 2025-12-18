/**
 * T018: useExport hook for OpenAPI export functionality.
 *
 * Features:
 * - Export DSL to OpenAPI 3.0/3.1
 * - YAML and JSON format support
 * - Handles loading and error states
 * - Triggers browser download
 *
 * Feature 003 - Natural Language DSL & OpenAPI Export.
 */

import { useState, useCallback } from 'react';

export type ExportFormat = 'yaml' | 'json';
export type OpenAPIVersion = '3.0' | '3.1';

export interface UseExportOptions {
  /** API base URL (default: VITE_API_URL or localhost:8765) */
  apiUrl?: string;
}

export interface UseExportReturn {
  /** Export DSL content to OpenAPI */
  exportToOpenAPI: (
    content: string,
    format: ExportFormat,
    version: OpenAPIVersion
  ) => Promise<void>;
  /** Whether export is in progress */
  isExporting: boolean;
  /** Error message if export failed */
  error: string | null;
}

const DEFAULT_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8765';

/**
 * Hook for exporting DSL content to OpenAPI specifications.
 *
 * @param options - Configuration options
 * @returns Export state and function
 */
export function useExport(options: UseExportOptions = {}): UseExportReturn {
  const { apiUrl = DEFAULT_API_URL } = options;

  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Export DSL content to OpenAPI and trigger download.
   */
  const exportToOpenAPI = useCallback(
    async (
      content: string,
      format: ExportFormat,
      version: OpenAPIVersion
    ): Promise<void> => {
      // Clear previous error
      setError(null);

      // Validate content
      if (!content.trim()) {
        setError('Content is empty');
        return;
      }

      setIsExporting(true);

      try {
        const response = await fetch(`${apiUrl}/api/v1/export`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, format, version }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.detail || `Export failed: ${response.status} ${response.statusText}`
          );
        }

        // Get the response content
        const blob = await response.blob();

        // Create download link
        const url = URL.createObjectURL(blob);
        const filename = `openapi.${format}`;

        // Trigger download
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Cleanup
        URL.revokeObjectURL(url);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown export error';
        setError(message);
      } finally {
        setIsExporting(false);
      }
    },
    [apiUrl]
  );

  return {
    exportToOpenAPI,
    isExporting,
    error,
  };
}

export default useExport;
