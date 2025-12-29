/**
 * ValidationPanel Component
 * Real-time validation feedback display for form errors and warnings
 */

import { useMemo, useState, useCallback } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFormState } from "@/providers/FormStateProvider";

/** OAS documentation links for different sections */
const OAS_DOC_LINKS: Record<string, string> = {
  info: "https://swagger.io/specification/#info-object",
  paths: "https://swagger.io/specification/#paths-object",
  components: "https://swagger.io/specification/#components-object",
  schemas: "https://swagger.io/specification/#schema-object",
  securitySchemes: "https://swagger.io/specification/#security-scheme-object",
  security: "https://swagger.io/specification/#security-requirement-object",
  servers: "https://swagger.io/specification/#server-object",
  default: "https://swagger.io/specification/",
};

export interface ValidationPanelProps {
  /** Callback when an error is clicked */
  onErrorClick?: (path: string) => void;
  /** Whether to use compact mode */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Decode JSON Pointer path (~1 = /, ~0 = ~)
 */
function decodeJsonPointer(path: string): string {
  return path.replace(/~1/g, "/").replace(/~0/g, "~");
}

/**
 * Get documentation link for a path
 */
function getDocLink(path: string): string {
  const parts = path.split("/").filter(Boolean);

  // Check for specific sections
  if (parts[0] === "components" && parts[1]) {
    return OAS_DOC_LINKS[parts[1]] || OAS_DOC_LINKS.components;
  }

  return OAS_DOC_LINKS[parts[0]] || OAS_DOC_LINKS.default;
}

/**
 * ValidationPanel component for displaying validation feedback.
 */
export function ValidationPanel({
  onErrorClick,
  compact = false,
  className,
}: ValidationPanelProps) {
  const { state } = useFormState();
  const { errors } = state;

  const [isExpanded, setIsExpanded] = useState(true);

  // Separate errors and warnings
  const errorList = useMemo(
    () => errors.filter((e) => e.type === "error"),
    [errors]
  );

  const warningList = useMemo(
    () => errors.filter((e) => e.type === "warning"),
    [errors]
  );

  const errorCount = errorList.length;
  const warningCount = warningList.length;
  const hasErrors = errorCount > 0;
  const hasWarnings = warningCount > 0;
  const isValid = !hasErrors && !hasWarnings;

  // Determine border color based on state
  const borderColor = useMemo(() => {
    if (hasErrors) return "border-destructive";
    if (hasWarnings) return "border-yellow-500";
    return "border-green-500";
  }, [hasErrors, hasWarnings]);

  const handleToggle = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const handleErrorClick = useCallback(
    (path: string) => {
      onErrorClick?.(path);
    },
    [onErrorClick]
  );

  return (
    <div
      data-testid="validation-panel"
      role="region"
      aria-label="Validation status"
      className={cn(
        "border-2 rounded-lg",
        borderColor,
        compact ? "p-2" : "p-4",
        className
      )}
    >
      {/* Summary Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Status Icon */}
          {isValid ? (
            <div data-testid="success-icon" className="text-green-500">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          ) : hasErrors ? (
            <div data-testid="error-icon" className="text-destructive">
              <AlertCircle className="h-5 w-5" />
            </div>
          ) : (
            <div data-testid="warning-icon" className="text-yellow-500">
              <AlertTriangle className="h-5 w-5" />
            </div>
          )}

          {/* Status Text */}
          <div role="status" aria-live="polite">
            {isValid ? (
              <span className="text-green-600 font-medium">
                All good - no issues found
              </span>
            ) : (
              <div className="flex items-center gap-3">
                {hasErrors && (
                  <span className="text-destructive font-medium">
                    {errorCount} error{errorCount !== 1 ? "s" : ""}
                  </span>
                )}
                {hasWarnings && (
                  <span className="text-yellow-600 font-medium">
                    {warningCount} warning{warningCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Expand/Collapse Button */}
        {(hasErrors || hasWarnings) && (
          <button
            type="button"
            onClick={handleToggle}
            aria-label={isExpanded ? "Collapse" : "Expand"}
            aria-expanded={isExpanded}
            className="p-1 text-muted-foreground hover:text-foreground rounded"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && (hasErrors || hasWarnings) && (
        <div className="mt-4 space-y-4">
          {/* Errors Section */}
          {hasErrors && (
            <div data-testid="errors-section">
              <h4 className="text-sm font-medium text-destructive mb-2">
                Errors
              </h4>
              <ul role="list" className="space-y-2">
                {errorList.map((error, index) => (
                  <li key={`error-${index}`}>
                    <button
                      type="button"
                      onClick={() => handleErrorClick(error.path)}
                      className="w-full text-left p-2 rounded bg-destructive/10 hover:bg-destructive/20 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-destructive">
                            {error.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {decodeJsonPointer(error.path)}
                          </p>
                        </div>
                        <a
                          href={getDocLink(error.path)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          aria-label="Learn more"
                          className="flex-shrink-0 p-1 text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings Section */}
          {hasWarnings && (
            <div data-testid="warnings-section">
              <h4 className="text-sm font-medium text-yellow-600 mb-2">
                Warnings
              </h4>
              <ul role="list" className="space-y-2">
                {warningList.map((warning, index) => (
                  <li key={`warning-${index}`}>
                    <button
                      type="button"
                      onClick={() => handleErrorClick(warning.path)}
                      className="w-full text-left p-2 rounded bg-yellow-500/10 hover:bg-yellow-500/20 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-yellow-700">
                            {warning.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {decodeJsonPointer(warning.path)}
                          </p>
                        </div>
                        <a
                          href={getDocLink(warning.path)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          aria-label="Docs"
                          className="flex-shrink-0 p-1 text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ValidationPanel;
