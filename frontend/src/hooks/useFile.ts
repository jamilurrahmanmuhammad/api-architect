/**
 * T040: useFile hook for file state management with dirty flag tracking.
 *
 * Provides:
 * - File loading and state management
 * - Dirty flag (hasUnsavedChanges) tracking
 * - Save functionality with version update
 * - Error handling
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { fileService } from '@/services/fileService';
import type { RequirementFile } from '@/types/file';

export interface UseFileOptions {
  fileId: string | undefined;
  autoSaveDelay?: number; // ms, 0 to disable
  onSaveSuccess?: (file: RequirementFile) => void;
  onSaveError?: (error: Error) => void;
}

export interface UseFileReturn {
  file: RequirementFile | null;
  content: string;
  loading: boolean;
  saving: boolean;
  error: string | null;
  hasUnsavedChanges: boolean;
  setContent: (content: string) => void;
  save: () => Promise<RequirementFile | null>;
  reload: () => Promise<void>;
}

export function useFile({
  fileId,
  autoSaveDelay = 0,
  onSaveSuccess,
  onSaveError,
}: UseFileOptions): UseFileReturn {
  const [file, setFile] = useState<RequirementFile | null>(null);
  const [content, setContentState] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef(content);

  // Keep content ref updated
  contentRef.current = content;

  const hasUnsavedChanges = content !== originalContent;

  // Load file
  const load = useCallback(async () => {
    if (!fileId) {
      setLoading(false);
      setError('No file ID provided');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const loadedFile = await fileService.getFile(fileId);
      setFile(loadedFile);
      setContentState(loadedFile.content);
      setOriginalContent(loadedFile.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file');
    } finally {
      setLoading(false);
    }
  }, [fileId]);

  // Initial load
  useEffect(() => {
    load();
  }, [load]);

  // Save file
  const save = useCallback(async (): Promise<RequirementFile | null> => {
    if (!fileId || saving) return null;

    setSaving(true);
    setError(null);

    try {
      const updatedFile = await fileService.updateFile(fileId, {
        content: contentRef.current,
      });
      setFile(updatedFile);
      setOriginalContent(contentRef.current);

      if (onSaveSuccess) {
        onSaveSuccess(updatedFile);
      }

      return updatedFile;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to save file');
      setError(error.message);

      if (onSaveError) {
        onSaveError(error);
      }

      return null;
    } finally {
      setSaving(false);
    }
  }, [fileId, saving, onSaveSuccess, onSaveError]);

  // Set content with auto-save scheduling
  const setContent = useCallback(
    (newContent: string) => {
      setContentState(newContent);

      // Clear existing auto-save timer
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }

      // Schedule auto-save if enabled and content changed
      if (autoSaveDelay > 0 && newContent !== originalContent) {
        autoSaveTimerRef.current = setTimeout(() => {
          save();
        }, autoSaveDelay);
      }
    },
    [autoSaveDelay, originalContent, save]
  );

  // Cleanup auto-save timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  return {
    file,
    content,
    loading,
    saving,
    error,
    hasUnsavedChanges,
    setContent,
    save,
    reload: load,
  };
}

export default useFile;
