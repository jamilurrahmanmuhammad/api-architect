/**
 * T020: ExportDialog component for OpenAPI export.
 *
 * Allows users to select export format (YAML/JSON) and OpenAPI version (3.0/3.1).
 * Displays loading and error states during export.
 *
 * Feature 003 - Natural Language DSL & OpenAPI Export.
 */

import { useState } from 'react';
import { Download, X, Loader2 } from 'lucide-react';

export type ExportFormat = 'yaml' | 'json';
export type OpenAPIVersion = '3.0' | '3.1';

export interface ExportDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback when dialog is closed */
  onClose: () => void;
  /** Callback when export is triggered */
  onExport: (format: ExportFormat, version: OpenAPIVersion) => void;
  /** Whether export is in progress */
  isExporting: boolean;
  /** Error message if export failed */
  error: string | null;
}

/**
 * Export dialog component for OpenAPI export functionality.
 */
export function ExportDialog({
  isOpen,
  onClose,
  onExport,
  isExporting,
  error,
}: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('yaml');
  const [version, setVersion] = useState<OpenAPIVersion>('3.0');

  if (!isOpen) {
    return null;
  }

  const handleExport = () => {
    onExport(format, version);
  };

  return (
    <div
      data-testid="export-dialog"
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      role="dialog"
      aria-labelledby="export-dialog-title"
      aria-modal="true"
    >
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-96">
        <div className="flex justify-between items-center mb-4">
          <h3 id="export-dialog-title" className="text-lg font-semibold">
            Export to OpenAPI
          </h3>
          <button
            onClick={onClose}
            disabled={isExporting}
            className="text-gray-400 hover:text-white disabled:opacity-50"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            data-testid="export-error"
            className="mb-4 p-3 bg-red-900/50 border border-red-500/50 rounded text-red-200 text-sm"
          >
            {error}
          </div>
        )}

        {/* Format Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Format
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="format"
                value="yaml"
                checked={format === 'yaml'}
                onChange={() => setFormat('yaml')}
                className="text-blue-500"
              />
              <span>YAML</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="format"
                value="json"
                checked={format === 'json'}
                onChange={() => setFormat('json')}
                className="text-blue-500"
              />
              <span>JSON</span>
            </label>
          </div>
        </div>

        {/* Version Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            OpenAPI Version
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="version"
                value="3.0"
                checked={version === '3.0'}
                onChange={() => setVersion('3.0')}
                className="text-blue-500"
              />
              <span>3.0</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="version"
                value="3.1"
                checked={version === '3.1'}
                onChange={() => setVersion('3.1')}
                className="text-blue-500"
              />
              <span>3.1</span>
            </label>
          </div>
        </div>

        {/* Loading Indicator */}
        {isExporting && (
          <div
            data-testid="export-loading"
            className="mb-4 flex items-center justify-center gap-2 text-blue-400"
          >
            <Loader2 className="animate-spin" size={20} />
            <span>Exporting...</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 text-gray-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded font-medium transition-colors"
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExportDialog;
