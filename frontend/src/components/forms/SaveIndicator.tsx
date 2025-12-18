/**
 * SaveIndicator Component
 * Displays save status (saving, saved, error) for form persistence
 */

import React from "react";
import { Loader2, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { FormPersistenceError } from "@/hooks/useFormPersistence";

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

export interface SaveIndicatorProps {
  /** Whether a save operation is in progress */
  isSaving: boolean;
  /** Timestamp of last successful save (ms since epoch) */
  lastSaved: number | null;
  /** Current error, if any */
  error: FormPersistenceError | null;
  /** Show idle state text when nothing to display */
  showIdle?: boolean;
  /** Size variant */
  size?: "compact" | "default";
  /** Additional CSS classes */
  className?: string;
}

/**
 * SaveIndicator component for displaying form save status.
 *
 * Shows different states in order of priority:
 * 1. Saving (spinner + "Saving...")
 * 2. Error (error icon + message)
 * 3. Saved (checkmark + relative time)
 * 4. Idle (optional, "Not saved")
 *
 * @example
 * ```tsx
 * const { isSaving, lastSaved, error } = useFormPersistence();
 *
 * <SaveIndicator
 *   isSaving={isSaving}
 *   lastSaved={lastSaved}
 *   error={error}
 * />
 * ```
 */
export function SaveIndicator({
  isSaving,
  lastSaved,
  error,
  showIdle = false,
  size = "default",
  className,
}: SaveIndicatorProps) {
  const sizeClasses = size === "compact" ? "text-xs" : "text-sm";

  // Priority: saving > error > saved > idle
  if (isSaving) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "flex items-center gap-1.5 text-muted-foreground",
          sizeClasses,
          className
        )}
      >
        <Loader2
          data-testid="saving-spinner"
          aria-label="Saving"
          className={cn(
            "animate-spin",
            size === "compact" ? "h-3 w-3" : "h-4 w-4"
          )}
        />
        <span>Saving...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "flex items-center gap-1.5 text-destructive",
          sizeClasses,
          className
        )}
      >
        <AlertCircle
          data-testid="error-icon"
          className={size === "compact" ? "h-3 w-3" : "h-4 w-4"}
        />
        <span>{error.message}</span>
      </div>
    );
  }

  if (lastSaved) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "flex items-center gap-1.5 text-muted-foreground",
          sizeClasses,
          className
        )}
      >
        <Check
          data-testid="saved-icon"
          className={cn(
            "text-green-600",
            size === "compact" ? "h-3 w-3" : "h-4 w-4"
          )}
        />
        <span>Saved {formatRelativeTime(lastSaved)}</span>
      </div>
    );
  }

  if (showIdle) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "flex items-center gap-1.5 text-muted-foreground",
          sizeClasses,
          className
        )}
      >
        <span>Not saved</span>
      </div>
    );
  }

  // No state to display
  return null;
}

export default SaveIndicator;
