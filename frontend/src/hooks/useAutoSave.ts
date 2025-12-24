/**
 * Custom hook for auto-save functionality.
 *
 * Provides:
 * - Debounced auto-save (30 seconds after last change)
 * - Dirty state tracking
 * - Manual save trigger
 * - Save status indicators
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  setSaving,
  setLastSavedAt,
  updateContent,
} from "../store/slices/editorSlice";
import { useUpdateFile } from "./useEditorApi";

export interface UseAutoSaveOptions {
  /** Auto-save interval in milliseconds (default: 30000 = 30 seconds) */
  autoSaveInterval?: number;
  /** Debounce delay for content changes in milliseconds (default: 1000) */
  debounceDelay?: number;
  /** Enable auto-save functionality (default: true) */
  enabled?: boolean;
}

export interface UseAutoSaveReturn {
  /** Whether there are unsaved changes */
  isDirty: boolean;
  /** Whether a save operation is in progress */
  isSaving: boolean;
  /** Timestamp of last successful save */
  lastSavedAt: string | null;
  /** Manually trigger a save */
  save: () => Promise<void>;
  /** Update content (marks as dirty) */
  setContent: (content: string) => void;
  /** Reset dirty state (after external save) */
  resetDirty: () => void;
}

const DEFAULT_AUTO_SAVE_INTERVAL = 30000; // 30 seconds

export function useAutoSave(
  fileId: string | null,
  options: UseAutoSaveOptions = {}
): UseAutoSaveReturn {
  const {
    autoSaveInterval = DEFAULT_AUTO_SAVE_INTERVAL,
    enabled = true,
  } = options;

  const dispatch = useAppDispatch();
  const { content, isSaving, lastSavedAt } = useAppSelector(
    (state) => state.editor
  );

  const [isDirty, setIsDirty] = useState(false);
  const lastSavedContentRef = useRef<string>(content);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Use the update mutation from useEditorApi
  const updateMutation = useUpdateFile(fileId || "");

  // Check if content has changed from last saved version
  const checkDirty = useCallback(() => {
    return content !== lastSavedContentRef.current;
  }, [content]);

  // Perform save operation
  const save = useCallback(async () => {
    if (!fileId || !isDirty || isSaving) {
      return;
    }

    dispatch(setSaving(true));

    try {
      await updateMutation.mutateAsync(content);
      lastSavedContentRef.current = content;
      setIsDirty(false);
      dispatch(setLastSavedAt(new Date().toISOString()));
    } catch (error) {
      console.error("Auto-save failed:", error);
      // Keep dirty state so user knows save failed
    } finally {
      dispatch(setSaving(false));
    }
  }, [fileId, content, isDirty, isSaving, dispatch, updateMutation]);

  // Update content and mark as dirty
  const setContent = useCallback(
    (newContent: string) => {
      dispatch(updateContent(newContent));
      setIsDirty(true);

      // Clear existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Reset auto-save timer when content changes
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      // Set new auto-save timer
      if (enabled && fileId) {
        autoSaveTimerRef.current = setTimeout(() => {
          save();
        }, autoSaveInterval);
      }
    },
    [dispatch, enabled, fileId, autoSaveInterval, save]
  );

  // Reset dirty state (used after external save)
  const resetDirty = useCallback(() => {
    lastSavedContentRef.current = content;
    setIsDirty(false);
  }, [content]);

  // Update dirty state when content changes
  useEffect(() => {
    setIsDirty(checkDirty());
  }, [content, checkDirty]);

  // Update lastSavedContentRef when fileId changes (new file loaded)
  useEffect(() => {
    lastSavedContentRef.current = content;
    setIsDirty(false);
  }, [fileId]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  // Save before unload (warn user of unsaved changes)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty]);

  return {
    isDirty,
    isSaving,
    lastSavedAt,
    save,
    setContent,
    resetDirty,
  };
}

/**
 * Hook for keyboard shortcuts (Ctrl+S to save).
 */
export function useSaveShortcut(onSave: () => void, enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        onSave();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onSave, enabled]);
}
