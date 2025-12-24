/**
 * MergeConflictDialog Component
 * Shows conflicts between existing and incoming OAS data with resolution options
 */

import { useMemo } from "react";
import { AlertTriangle, Check, Plus, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export type MergeStrategy = "keep-existing" | "use-incoming" | "merge-both";

export interface MergeResolution {
  strategy: MergeStrategy;
  result: Record<string, unknown>;
}

export interface Conflict {
  path: string;
  type: "path" | "info" | "component";
  existing: unknown;
  incoming: unknown;
}

export interface MergeConflictDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback to change open state */
  onOpenChange: (open: boolean) => void;
  /** Existing OAS data */
  existingOas: Record<string, unknown>;
  /** Incoming OAS data to merge */
  incomingOas: Record<string, unknown>;
  /** Callback when conflicts are resolved */
  onResolve: (resolution: MergeResolution) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Detect conflicts between two OAS documents
 */
function detectConflicts(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>
): Conflict[] {
  const conflicts: Conflict[] = [];
  const methods = ["get", "post", "put", "patch", "delete", "head", "options", "trace"];

  // Check info conflicts
  const existingInfo = (existing.info || {}) as Record<string, unknown>;
  const incomingInfo = (incoming.info || {}) as Record<string, unknown>;

  if (
    existingInfo.version !== incomingInfo.version ||
    existingInfo.title !== incomingInfo.title
  ) {
    conflicts.push({
      path: "info",
      type: "info",
      existing: existingInfo,
      incoming: incomingInfo,
    });
  }

  // Check path conflicts
  const existingPaths = (existing.paths || {}) as Record<string, Record<string, unknown>>;
  const incomingPaths = (incoming.paths || {}) as Record<string, Record<string, unknown>>;

  for (const [path, incomingPathItem] of Object.entries(incomingPaths)) {
    const existingPathItem = existingPaths[path];

    if (existingPathItem) {
      // Check each method
      for (const method of methods) {
        if (incomingPathItem[method] && existingPathItem[method]) {
          const existingOp = JSON.stringify(existingPathItem[method]);
          const incomingOp = JSON.stringify(incomingPathItem[method]);

          if (existingOp !== incomingOp) {
            conflicts.push({
              path: `${path} (${method.toUpperCase()})`,
              type: "path",
              existing: existingPathItem[method],
              incoming: incomingPathItem[method],
            });
          }
        }
      }
    }
  }

  return conflicts;
}

/**
 * Get new paths that don't exist in existing
 */
function getNewPaths(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>
): string[] {
  const existingPaths = Object.keys((existing.paths || {}) as Record<string, unknown>);
  const incomingPaths = Object.keys((incoming.paths || {}) as Record<string, unknown>);

  return incomingPaths.filter((p) => !existingPaths.includes(p));
}

/**
 * Merge OAS documents based on strategy
 */
function mergeOas(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>,
  strategy: MergeStrategy
): Record<string, unknown> {
  switch (strategy) {
    case "keep-existing":
      // Add only new paths from incoming
      return {
        ...existing,
        paths: {
          ...((incoming.paths || {}) as Record<string, unknown>),
          ...((existing.paths || {}) as Record<string, unknown>),
        },
      };

    case "use-incoming":
      // Replace everything with incoming
      return { ...incoming };

    case "merge-both":
      // Deep merge, incoming wins on conflict
      return {
        ...existing,
        ...incoming,
        info: {
          ...((existing.info || {}) as Record<string, unknown>),
          ...((incoming.info || {}) as Record<string, unknown>),
        },
        paths: {
          ...((existing.paths || {}) as Record<string, unknown>),
          ...((incoming.paths || {}) as Record<string, unknown>),
        },
        components: {
          ...((existing.components || {}) as Record<string, unknown>),
          ...((incoming.components || {}) as Record<string, unknown>),
        },
      };

    default:
      return existing;
  }
}

/**
 * MergeConflictDialog component for resolving import conflicts.
 */
export function MergeConflictDialog({
  open,
  onOpenChange,
  existingOas,
  incomingOas,
  onResolve,
  className,
}: MergeConflictDialogProps) {
  const conflicts = useMemo(
    () => detectConflicts(existingOas, incomingOas),
    [existingOas, incomingOas]
  );

  const newPaths = useMemo(
    () => getNewPaths(existingOas, incomingOas),
    [existingOas, incomingOas]
  );

  const hasConflicts = conflicts.length > 0;

  const handleResolve = (strategy: MergeStrategy) => {
    const result = mergeOas(existingOas, incomingOas, strategy);
    onResolve({ strategy, result });
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleApply = () => {
    // No conflicts, just merge
    const result = mergeOas(existingOas, incomingOas, "merge-both");
    onResolve({ strategy: "merge-both", result });
    onOpenChange(false);
  };

  // Get info versions for display
  const existingInfo = (existingOas.info || {}) as Record<string, unknown>;
  const incomingInfo = (incomingOas.info || {}) as Record<string, unknown>;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-w-2xl", className)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {hasConflicts ? (
              <>
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Merge Conflicts
              </>
            ) : (
              <>
                <Check className="h-5 w-5 text-green-500" />
                No Conflicts
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Conflict summary */}
          {hasConflicts ? (
            <p className="text-sm text-muted-foreground">
              {conflicts.length} conflict{conflicts.length !== 1 ? "s" : ""} detected
              between existing and incoming specifications.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              No conflicts found. The incoming data can be safely merged.
            </p>
          )}

          {/* Side by side headers */}
          <div className="grid grid-cols-2 gap-4 text-sm font-medium">
            <div className="p-2 bg-muted/50 rounded">
              <span className="text-muted-foreground">Existing</span>
              {typeof existingInfo.version === "string" && existingInfo.version && (
                <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                  {existingInfo.version}
                </span>
              )}
            </div>
            <div className="p-2 bg-muted/50 rounded">
              <span className="text-muted-foreground">Incoming</span>
              {typeof incomingInfo.version === "string" && incomingInfo.version && (
                <span className="ml-2 text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded">
                  {incomingInfo.version}
                </span>
              )}
            </div>
          </div>

          {/* Conflicts list */}
          {hasConflicts && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {conflicts.map((conflict, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 border rounded text-sm"
                >
                  <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                  <code className="font-mono text-xs">{conflict.path}</code>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground truncate">
                    {conflict.type === "info" ? "Version/title differs" : "Operation differs"}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* New paths */}
          {newPaths.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">New paths to add:</p>
              <div className="space-y-1">
                {newPaths.map((path) => (
                  <div
                    key={path}
                    className="flex items-center gap-2 p-2 border border-green-200 bg-green-50 rounded text-sm"
                  >
                    <Plus className="h-4 w-4 text-green-600" />
                    <code className="font-mono text-xs">{path}</code>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>

          {hasConflicts ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleResolve("keep-existing")}
              >
                Keep Existing
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleResolve("use-incoming")}
              >
                Use Incoming
              </Button>
              <Button
                type="button"
                variant="default"
                onClick={() => handleResolve("merge-both")}
              >
                Merge Both
              </Button>
            </>
          ) : (
            <Button type="button" variant="default" onClick={handleApply}>
              Apply
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default MergeConflictDialog;
