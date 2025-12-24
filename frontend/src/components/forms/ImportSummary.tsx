/**
 * ImportSummary Component
 * Displays import results with undo capability
 */

import { useState, useEffect, useCallback } from "react";
import { Check, Undo2, X, ChevronDown, ChevronUp, Plus, Edit2, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface ImportResult {
  /** Source file name or URL */
  source: string;
  /** Import timestamp */
  timestamp: number;
  /** Paths that were added */
  addedPaths: string[];
  /** Paths that were modified */
  modifiedPaths: string[];
  /** Paths that were unchanged */
  unchangedPaths: string[];
  /** Total operations imported */
  totalOperations: number;
}

export interface ImportSummaryProps {
  /** Import result data */
  result: ImportResult;
  /** Callback to undo the import */
  onUndo: () => void;
  /** Callback to dismiss the summary */
  onDismiss: () => void;
  /** Undo timeout in milliseconds (default 30000) */
  undoTimeout?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * ImportSummary component for showing import results with undo.
 */
export function ImportSummary({
  result,
  onUndo,
  onDismiss,
  undoTimeout = 30000,
  className,
}: ImportSummaryProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(Math.floor(undoTimeout / 1000));
  const [undoExpired, setUndoExpired] = useState(false);

  const hasChanges =
    result.addedPaths.length > 0 ||
    result.modifiedPaths.length > 0;

  const hasPaths =
    result.addedPaths.length > 0 ||
    result.modifiedPaths.length > 0 ||
    result.unchangedPaths.length > 0;

  // Countdown timer
  useEffect(() => {
    if (undoExpired) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setUndoExpired(true);
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [undoExpired]);

  const handleToggleDetails = useCallback(() => {
    setShowDetails((prev) => !prev);
  }, []);

  return (
    <div
      className={cn(
        "border rounded-lg p-4 bg-background shadow-sm",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Check className="h-5 w-5 text-green-500" />
          <span className="font-medium">Import Complete</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="h-7 w-7 p-0"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Dismiss</span>
        </Button>
      </div>

      {/* Source info */}
      <p className="text-sm text-muted-foreground mb-3">
        Imported from <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">{result.source}</code>
      </p>

      {/* Stats */}
      {hasChanges ? (
        <div className="flex flex-wrap gap-3 mb-3 text-sm">
          {result.addedPaths.length > 0 && (
            <div className="flex items-center gap-1 text-green-600">
              <Plus className="h-3 w-3" />
              <span>{result.addedPaths.length} added</span>
            </div>
          )}
          {result.modifiedPaths.length > 0 && (
            <div className="flex items-center gap-1 text-amber-600">
              <Edit2 className="h-3 w-3" />
              <span>{result.modifiedPaths.length} modified</span>
            </div>
          )}
          {result.unchangedPaths.length > 0 && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Minus className="h-3 w-3" />
              <span>{result.unchangedPaths.length} unchanged</span>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground mb-3">No changes detected.</p>
      )}

      {/* Details toggle */}
      {hasPaths && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleToggleDetails}
          className="mb-3 h-7 text-xs"
        >
          {showDetails ? (
            <>
              <ChevronUp className="h-3 w-3 mr-1" />
              Hide Details
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3 mr-1" />
              Show Details
            </>
          )}
        </Button>
      )}

      {/* Details list */}
      {showDetails && hasPaths && (
        <div className="mb-3 space-y-2 max-h-48 overflow-y-auto">
          {result.addedPaths.length > 0 && (
            <div>
              <p className="text-xs font-medium text-green-600 mb-1">Added:</p>
              {result.addedPaths.map((path) => (
                <div
                  key={path}
                  className="text-xs font-mono bg-green-50 text-green-800 px-2 py-1 rounded mb-1"
                >
                  {path}
                </div>
              ))}
            </div>
          )}
          {result.modifiedPaths.length > 0 && (
            <div>
              <p className="text-xs font-medium text-amber-600 mb-1">Modified:</p>
              {result.modifiedPaths.map((path) => (
                <div
                  key={path}
                  className="text-xs font-mono bg-amber-50 text-amber-800 px-2 py-1 rounded mb-1"
                >
                  {path}
                </div>
              ))}
            </div>
          )}
          {result.unchangedPaths.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Unchanged:</p>
              {result.unchangedPaths.map((path) => (
                <div
                  key={path}
                  className="text-xs font-mono bg-muted px-2 py-1 rounded mb-1"
                >
                  {path}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between border-t pt-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onUndo}
            disabled={undoExpired}
          >
            <Undo2 className="h-4 w-4 mr-2" />
            Undo
          </Button>
          {!undoExpired && (
            <span className="text-xs text-muted-foreground">
              {timeRemaining}s
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {result.totalOperations} operation{result.totalOperations !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}

export default ImportSummary;
