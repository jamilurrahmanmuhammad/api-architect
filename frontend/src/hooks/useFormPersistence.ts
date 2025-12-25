/**
 * useFormPersistence Hook
 * Auto-saves form state to localStorage with debouncing
 * Provides state restoration and save status indicators
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useFormState } from "@/providers/FormStateProvider";
import type { FormState } from "@/types/formState";

/** Prefix for localStorage keys */
export const STORAGE_KEY_PREFIX = "api-architect-form-";

/** Default debounce interval (10 seconds) */
const DEFAULT_DEBOUNCE_MS = 10000;

export interface FormPersistenceError {
  type: "quota" | "storage" | "serialization";
  message: string;
}

export interface FormPersistenceOptions {
  /** Unique key for this form's storage (default: "default") */
  storageKey?: string;
  /** Debounce interval in milliseconds (default: 10000 = 10 seconds) */
  debounceMs?: number;
  /** Enable persistence (default: true) */
  enabled?: boolean;
}

export interface FormPersistenceReturn {
  /** Whether a save operation is in progress */
  isSaving: boolean;
  /** Timestamp of last successful save (ms since epoch) */
  lastSaved: number | null;
  /** Formatted last saved time (e.g., "2 minutes ago") */
  lastSavedFormatted: string | null;
  /** Whether there is persisted state available */
  hasPersistedState: boolean;
  /** Current error, if any */
  error: FormPersistenceError | null;
  /** Trigger a debounced save */
  triggerSave: () => void;
  /** Save immediately without debouncing */
  saveNow: () => void;
  /** Get the persisted state (for restoration) */
  getPersistedState: () => Partial<FormState> | null;
  /** Clear all persisted state */
  clearPersistedState: () => void;
  /** Clear current error */
  clearError: () => void;
}

/**
 * Serialize form state for localStorage
 * Excludes undo/redo stacks and converts Set to array
 */
export function serializeFormState(state: FormState): string {
  const { undoStack, redoStack, editedPaths, ...rest } = state;

  const serializable = {
    ...rest,
    editedPaths: Array.from(editedPaths),
  };

  return JSON.stringify(serializable);
}

/**
 * Deserialize form state from localStorage
 * Converts array back to Set and initializes empty stacks
 */
export function deserializeFormState(json: string): Partial<FormState> | null {
  if (!json || json.trim() === "") {
    return null;
  }

  try {
    const parsed = JSON.parse(json);

    // Convert editedPaths array back to Set
    if (Array.isArray(parsed.editedPaths)) {
      parsed.editedPaths = new Set(parsed.editedPaths);
    } else {
      parsed.editedPaths = new Set();
    }

    // Initialize empty stacks (not persisted)
    parsed.undoStack = [];
    parsed.redoStack = [];

    return parsed;
  } catch {
    return null;
  }
}

/**
 * Clear persisted state for a given key
 */
export function clearPersistedState(storageKey: string = "default"): void {
  try {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${storageKey}`);
  } catch {
    // Ignore errors when clearing
  }
}

/**
 * Format timestamp as relative time (e.g., "2 minutes ago")
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 5) {
    return "just now";
  } else if (seconds < 60) {
    return `${seconds} seconds ago`;
  } else if (minutes === 1) {
    return "1 minute ago";
  } else if (minutes < 60) {
    return `${minutes} minutes ago`;
  } else if (hours === 1) {
    return "1 hour ago";
  } else {
    return `${hours} hours ago`;
  }
}

/**
 * Hook for persisting form state to localStorage
 *
 * Features:
 * - Debounced auto-save (default: 10 seconds)
 * - State restoration on mount
 * - Save status indicators
 * - Error handling for quota exceeded, etc.
 *
 * @example
 * ```tsx
 * function FormEditor() {
 *   const {
 *     isSaving,
 *     lastSavedFormatted,
 *     hasPersistedState,
 *     getPersistedState,
 *   } = useFormPersistence();
 *
 *   // Restore state on mount
 *   useEffect(() => {
 *     if (hasPersistedState) {
 *       const saved = getPersistedState();
 *       if (saved) loadOas(saved.oasData);
 *     }
 *   }, []);
 *
 *   return (
 *     <div>
 *       {isSaving && <span>Saving...</span>}
 *       {lastSavedFormatted && <span>Last saved: {lastSavedFormatted}</span>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useFormPersistence(
  options: FormPersistenceOptions = {}
): FormPersistenceReturn {
  const {
    storageKey = "default",
    debounceMs = DEFAULT_DEBOUNCE_MS,
    enabled = true,
  } = options;

  const { state } = useFormState();

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const [error, setError] = useState<FormPersistenceError | null>(null);
  const [hasPersistedState, setHasPersistedState] = useState(false);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fullStorageKey = `${STORAGE_KEY_PREFIX}${storageKey}`;

  // Check for persisted state on mount
  useEffect(() => {
    if (!enabled) {
      setHasPersistedState(false);
      return;
    }

    try {
      const stored = localStorage.getItem(fullStorageKey);
      setHasPersistedState(stored !== null && deserializeFormState(stored) !== null);
    } catch {
      setHasPersistedState(false);
    }
  }, [enabled, fullStorageKey]);

  // Save state to localStorage
  const performSave = useCallback(() => {
    if (!enabled) return;

    setIsSaving(true);
    setError(null);

    try {
      const serialized = serializeFormState(state);
      localStorage.setItem(fullStorageKey, serialized);
      setLastSaved(Date.now());
      setHasPersistedState(true);
    } catch (err) {
      if (err instanceof DOMException && err.name === "QuotaExceededError") {
        setError({
          type: "quota",
          message: "Storage quota exceeded. Please clear some data.",
        });
      } else {
        setError({
          type: "storage",
          message: "Failed to save to localStorage.",
        });
      }
    } finally {
      setIsSaving(false);
    }
  }, [enabled, state, fullStorageKey]);

  // Trigger a debounced save
  const triggerSave = useCallback(() => {
    if (!enabled) return;

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      performSave();
    }, debounceMs);
  }, [enabled, debounceMs, performSave]);

  // Save immediately
  const saveNow = useCallback(() => {
    if (!enabled) return;

    // Clear any pending debounced save
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set isSaving immediately for UI feedback
    setIsSaving(true);

    // Use setTimeout to allow UI to update
    setTimeout(() => {
      performSave();
    }, 0);
  }, [enabled, performSave]);

  // Get persisted state
  const getPersistedState = useCallback((): Partial<FormState> | null => {
    if (!enabled) return null;

    try {
      const stored = localStorage.getItem(fullStorageKey);
      if (!stored) return null;
      return deserializeFormState(stored);
    } catch {
      return null;
    }
  }, [enabled, fullStorageKey]);

  // Clear persisted state
  const clearPersistedStateFn = useCallback(() => {
    try {
      localStorage.removeItem(fullStorageKey);
      setHasPersistedState(false);
    } catch {
      // Ignore errors when clearing
    }
  }, [fullStorageKey]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Format last saved time
  const lastSavedFormatted = lastSaved ? formatRelativeTime(lastSaved) : null;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    isSaving,
    lastSaved,
    lastSavedFormatted,
    hasPersistedState,
    error,
    triggerSave,
    saveNow,
    getPersistedState,
    clearPersistedState: clearPersistedStateFn,
    clearError,
  };
}

export default useFormPersistence;
