/**
 * UndoRedoButtons Component
 * Undo/Redo buttons with keyboard shortcut support
 * Wired to FormStateProvider for form state history management
 */

import { useEffect, useCallback } from "react";
import { Undo2, Redo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUndoRedo } from "@/providers/FormStateProvider";

export interface UndoRedoButtonsProps {
  /** Callback when undo is triggered */
  onUndo?: () => void;
  /** Callback when redo is triggered */
  onRedo?: () => void;
  /** Use compact styling */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * UndoRedoButtons component for managing form state history.
 *
 * Supports keyboard shortcuts:
 * - Ctrl+Z / Cmd+Z: Undo
 * - Ctrl+Y / Ctrl+Shift+Z / Cmd+Shift+Z: Redo
 *
 * @example
 * ```tsx
 * <UndoRedoButtons
 *   onUndo={() => console.log('Undone')}
 *   onRedo={() => console.log('Redone')}
 * />
 * ```
 */
export function UndoRedoButtons({
  onUndo,
  onRedo,
  compact = false,
  className,
}: UndoRedoButtonsProps) {
  const { undo, redo, canUndo, canRedo } = useUndoRedo();

  // Handle undo action
  const handleUndo = useCallback(() => {
    if (canUndo) {
      undo();
      onUndo?.();
    }
  }, [canUndo, undo, onUndo]);

  // Handle redo action
  const handleRedo = useCallback(() => {
    if (canRedo) {
      redo();
      onRedo?.();
    }
  }, [canRedo, redo, onRedo]);

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      if (!modKey) return;

      // Undo: Ctrl+Z / Cmd+Z (without Shift)
      if (e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Redo: Ctrl+Y / Ctrl+Shift+Z / Cmd+Shift+Z
      if (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey)) {
        e.preventDefault();
        handleRedo();
        return;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Detect if Mac for tooltip display
  const isMac = typeof navigator !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const undoShortcut = isMac ? "Cmd+Z" : "Ctrl+Z";
  const redoShortcut = isMac ? "Cmd+Shift+Z" : "Ctrl+Y";

  return (
    <div
      data-testid="undo-redo-buttons"
      role="group"
      aria-label="Undo and redo history"
      className={cn(
        "undo-redo-buttons inline-flex items-center gap-1",
        compact && "compact",
        className
      )}
    >
      {/* Undo Button */}
      <button
        type="button"
        onClick={handleUndo}
        disabled={!canUndo}
        aria-disabled={!canUndo}
        aria-label="Undo"
        title={`Undo (${undoShortcut})`}
        className={cn(
          "p-2 rounded-md transition-colors",
          "hover:bg-accent hover:text-accent-foreground",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          !canUndo && "opacity-50 cursor-not-allowed",
          compact && "p-1"
        )}
      >
        <Undo2
          data-testid="undo-icon"
          className={cn("h-4 w-4", compact && "h-3 w-3")}
        />
      </button>

      {/* Redo Button */}
      <button
        type="button"
        onClick={handleRedo}
        disabled={!canRedo}
        aria-disabled={!canRedo}
        aria-label="Redo"
        title={`Redo (${redoShortcut})`}
        className={cn(
          "p-2 rounded-md transition-colors",
          "hover:bg-accent hover:text-accent-foreground",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          !canRedo && "opacity-50 cursor-not-allowed",
          compact && "p-1"
        )}
      >
        <Redo2
          data-testid="redo-icon"
          className={cn("h-4 w-4", compact && "h-3 w-3")}
        />
      </button>
    </div>
  );
}

export default UndoRedoButtons;
