/**
 * T052-T053: ErrorPanel component for displaying validation errors.
 *
 * Displays validation errors and warnings with:
 * - Error location (line/column)
 * - Error message and type
 * - Guidance for fixing
 * - Click-to-navigate functionality
 * - Collapsible interface
 */

import { useState, useMemo } from 'react';
import { AlertCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ValidationError {
  line: number;
  column: number;
  message: string;
  error_type: string;
  severity: 'error' | 'warning';
  guidance: string | null;
}

export interface ErrorPanelProps {
  errors: ValidationError[];
  onErrorClick?: (error: ValidationError) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

export function ErrorPanel({
  errors,
  onErrorClick,
  isCollapsed: controlledCollapsed,
  onToggleCollapse,
  className,
}: ErrorPanelProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);

  // Support both controlled and uncontrolled collapse state
  const isCollapsed = controlledCollapsed ?? internalCollapsed;
  const toggleCollapse = onToggleCollapse ?? (() => setInternalCollapsed((prev) => !prev));

  const { errorCount, warningCount } = useMemo(() => {
    return {
      errorCount: errors.filter((e) => e.severity === 'error').length,
      warningCount: errors.filter((e) => e.severity === 'warning').length,
    };
  }, [errors]);

  const totalIssues = errors.length;

  if (isCollapsed) {
    return (
      <div
        data-testid="error-panel"
        className={cn(
          'collapsed flex items-center justify-between px-4 py-2 bg-gray-800 border-t border-gray-700',
          className
        )}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={toggleCollapse}
            data-testid="toggle-button"
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ChevronUp className="w-4 h-4" />
            <span>
              Expand ({totalIssues} {totalIssues === 1 ? 'issue' : 'issues'})
            </span>
          </button>
          <div className="flex items-center gap-3 text-xs">
            {errorCount > 0 && (
              <span className="flex items-center gap-1 text-red-400">
                <AlertCircle className="w-3 h-3" />
                {errorCount}
              </span>
            )}
            {warningCount > 0 && (
              <span className="flex items-center gap-1 text-yellow-400">
                <AlertTriangle className="w-3 h-3" />
                {warningCount}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="error-panel"
      className={cn('flex flex-col bg-gray-800 border-t border-gray-700', className)}
    >
      {/* Header */}
      <div
        data-testid="error-header"
        className="flex items-center justify-between px-4 py-2 border-b border-gray-700"
      >
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-white">Problems</span>
          <div className="flex items-center gap-3 text-xs">
            <span data-testid="error-count" className="flex items-center gap-1 text-red-400">
              <AlertCircle className="w-3 h-3" />
              {errorCount} errors
            </span>
            <span data-testid="warning-count" className="flex items-center gap-1 text-yellow-400">
              <AlertTriangle className="w-3 h-3" />
              {warningCount} warnings
            </span>
          </div>
        </div>
        <button
          onClick={toggleCollapse}
          data-testid="toggle-button"
          className="text-gray-400 hover:text-white transition-colors"
          aria-label="Collapse"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto max-h-48">
        {errors.length === 0 ? (
          <div
            data-testid="no-errors"
            className="flex items-center justify-center py-8 text-gray-400 text-sm"
          >
            <span className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-green-400" />
              No issues found
            </span>
          </div>
        ) : (
          <ul data-testid="error-list" className="divide-y divide-gray-700">
            {errors.map((error, index) => (
              <ErrorItem
                key={`${error.line}-${error.column}-${index}`}
                error={error}
                index={index}
                onClick={onErrorClick}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

interface ErrorItemProps {
  error: ValidationError;
  index: number;
  onClick?: (error: ValidationError) => void;
}

function ErrorItem({ error, index, onClick }: ErrorItemProps) {
  const Icon = error.severity === 'error' ? AlertCircle : AlertTriangle;
  const iconColor = error.severity === 'error' ? 'text-red-400' : 'text-yellow-400';

  return (
    <li
      data-testid={`error-item-${index}`}
      className={cn(
        error.severity,
        'flex items-start gap-3 px-4 py-2 hover:bg-gray-700/50 cursor-pointer transition-colors group'
      )}
      onClick={() => onClick?.(error)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick?.(error);
        }
      }}
    >
      <Icon className={cn('w-4 h-4 mt-0.5 flex-shrink-0', iconColor)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-sm">
          <span data-testid="error-message" className="text-gray-200 truncate">
            {error.message}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
          <span data-testid="error-location">
            Line {error.line}, Column {error.column}
          </span>
          <span data-testid="error-type" className="px-1.5 py-0.5 bg-gray-700 rounded text-gray-300">
            {error.error_type.replace(/_/g, ' ')}
          </span>
        </div>
        {error.guidance && (
          <p data-testid="error-guidance" className="mt-1 text-xs text-gray-500 italic">
            {error.guidance}
          </p>
        )}
      </div>
    </li>
  );
}

export default ErrorPanel;
