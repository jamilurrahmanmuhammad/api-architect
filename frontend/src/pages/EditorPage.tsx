/**
 * T039-T042, T065: EditorPage with editor, preview, and file actions.
 *
 * Provides:
 * - Monaco Editor with DSL syntax highlighting
 * - Split-pane layout with editor and preview
 * - File loading by ID
 * - Save functionality with version tracking (Ctrl+S)
 * - Auto-save (debounced, every 30 seconds)
 * - Unsaved changes indicator and warning
 * - Live preview of parsed entities
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Download } from 'lucide-react';
import { EditorPane } from '@/components/Editor/EditorPane';
import { SplitLayout } from '@/components/Editor/SplitLayout';
import { PreviewPane, type ParsedResult, type SourceLocation } from '@/components/Editor/PreviewPane';
import { ExportDialog, type ExportFormat, type OpenAPIVersion } from '@/components/Editor/ExportDialog';
import { useFile } from '@/hooks/useFile';
import { useExport } from '@/hooks/useExport';

// Auto-save delay in milliseconds (30 seconds)
const AUTO_SAVE_DELAY = 30000;

// Parse delay in milliseconds (1 second debounce)
const PARSE_DELAY = 1000;

// API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8765';

export function EditorPage() {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();

  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [showExportDialog, setShowExportDialog] = useState(false);

  // Export functionality
  const { exportToOpenAPI, isExporting, error: exportError } = useExport();

  // Preview state
  const [parsedData, setParsedData] = useState<ParsedResult | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<SourceLocation | undefined>(undefined);
  const parseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef = useRef<{ revealLine: (line: number) => void } | null>(null);

  const {
    file,
    content,
    loading,
    saving,
    error,
    hasUnsavedChanges,
    setContent,
    save,
  } = useFile({
    fileId,
    autoSaveDelay: autoSaveEnabled ? AUTO_SAVE_DELAY : 0,
    onSaveSuccess: (updatedFile) => {
      setSaveMessage(`Saved! v${updatedFile.version}`);
      setTimeout(() => setSaveMessage(null), 3000);
    },
    onSaveError: () => {
      // Error is already set by useFile
    },
  });

  // Parse content function
  const parseContent = useCallback(async (contentToparse: string) => {
    if (!contentToparse.trim()) {
      setParsedData(null);
      return;
    }

    setIsParsing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: contentToparse }),
      });

      if (response.ok) {
        const data = await response.json();
        setParsedData(data);
      } else {
        console.error('Parse API error:', response.status);
      }
    } catch (err) {
      console.error('Failed to parse content:', err);
    } finally {
      setIsParsing(false);
    }
  }, []);

  // Debounced parsing effect
  useEffect(() => {
    if (parseTimeoutRef.current) {
      clearTimeout(parseTimeoutRef.current);
    }

    parseTimeoutRef.current = setTimeout(() => {
      parseContent(content);
    }, PARSE_DELAY);

    return () => {
      if (parseTimeoutRef.current) {
        clearTimeout(parseTimeoutRef.current);
      }
    };
  }, [content, parseContent]);

  // Handle entity click from preview
  const handleEntityClick = useCallback((entity: { location: SourceLocation }) => {
    setSelectedLocation(entity.location);
    // Scroll editor to the entity's line
    if (editorRef.current) {
      editorRef.current.revealLine(entity.location.line);
    }
  }, []);

  // Warn about unsaved changes when leaving
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleSave = useCallback(async () => {
    await save();
  }, [save]);

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
  }, [setContent]);

  const handleEditorSave = useCallback(
    async (value: string) => {
      setContent(value);
      await save();
    },
    [setContent, save]
  );

  const handleBackClick = () => {
    if (hasUnsavedChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to leave?')) {
        navigate('/files');
      }
    } else {
      navigate('/files');
    }
  };

  // Export handler
  const handleExport = useCallback(
    async (format: ExportFormat, version: OpenAPIVersion) => {
      await exportToOpenAPI(content, format, version);
      if (!exportError) {
        setShowExportDialog(false);
      }
    },
    [content, exportToOpenAPI, exportError]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-400">Loading file...</span>
        </div>
      </div>
    );
  }

  if (error && !file) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-lg mb-4">{error}</div>
          <Link
            to="/files"
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Back to Files
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Editor header */}
      <header className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBackClick}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            <span className="text-sm">Back</span>
          </button>

          <div className="h-6 w-px bg-gray-700" />

          <div className="flex items-center gap-2">
            <span className="text-white font-medium">{file?.name}</span>
            {hasUnsavedChanges && (
              <span className="w-2 h-2 bg-yellow-500 rounded-full" title="Unsaved changes" />
            )}
            <span className="text-xs text-gray-500">v{file?.version}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Status indicator */}
          {error && (
            <span className="text-sm text-red-400">{error}</span>
          )}
          {saveMessage && (
            <span className="text-sm text-green-400">{saveMessage}</span>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving || !hasUnsavedChanges}
            className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                  />
                </svg>
                Save
              </>
            )}
          </button>

          {/* Export button */}
          <button
            onClick={() => setShowExportDialog(true)}
            disabled={!content.trim()}
            className="flex items-center gap-2 px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>

          {/* Auto-save toggle */}
          <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={autoSaveEnabled}
              onChange={(e) => setAutoSaveEnabled(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
            />
            Auto-save
          </label>

          {/* Keyboard shortcut hint */}
          <span className="text-xs text-gray-500 hidden sm:inline">
            Ctrl+S to save
          </span>
        </div>
      </header>

      {/* Editor and Preview Split Layout */}
      <div className="flex-1 overflow-hidden">
        <SplitLayout
          initialSplit={60}
          minLeftWidth={30}
          maxLeftWidth={80}
          collapsible
          leftPane={
            <EditorPane
              value={content}
              onChange={handleContentChange}
              onSave={handleEditorSave}
              theme="vs-dark"
              height="100%"
            />
          }
          rightPane={
            <PreviewPane
              data={parsedData}
              isLoading={isParsing}
              onEntityClick={handleEntityClick}
              selectedLocation={selectedLocation}
            />
          }
        />
      </div>

      {/* Status bar */}
      <footer className="flex items-center justify-between px-4 py-1 bg-gray-800 border-t border-gray-700 text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <span>Requirements DSL</span>
          <span>|</span>
          <span>{content.split('\n').length} lines</span>
          <span>|</span>
          <span>{content.length} characters</span>
          <span>|</span>
          {isParsing ? (
            <span className="text-yellow-400">Parsing...</span>
          ) : parsedData ? (
            <span className="text-green-400">
              {parsedData.valid_entities} entities
              {parsedData.total_errors > 0 && (
                <span className="text-red-400 ml-1">
                  ({parsedData.total_errors} errors)
                </span>
              )}
            </span>
          ) : (
            <span>No data</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span
            className={`px-2 py-0.5 rounded ${
              file?.status === 'draft'
                ? 'bg-gray-700 text-gray-300'
                : file?.status === 'reviewing'
                ? 'bg-yellow-900/50 text-yellow-400'
                : file?.status === 'approved'
                ? 'bg-green-900/50 text-green-400'
                : 'bg-blue-900/50 text-blue-400'
            }`}
          >
            {file?.status}
          </span>
          {file?.updated_at && (
            <span>
              Last saved:{' '}
              {new Date(file.updated_at).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
          {autoSaveEnabled && (
            <span className="text-blue-400">Auto-save on</span>
          )}
        </div>
      </footer>

      {/* Export Dialog */}
      <ExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        onExport={handleExport}
        isExporting={isExporting}
        error={exportError}
      />
    </div>
  );
}

export default EditorPage;
