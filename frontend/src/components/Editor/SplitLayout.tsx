/**
 * T063: SplitLayout component for resizable split-pane layout.
 *
 * Provides a resizable two-pane layout:
 * - Left pane: typically the editor
 * - Right pane: typically the preview
 * - Resizable divider with drag support
 * - Keyboard navigation support
 * - Collapse/expand functionality
 */

import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface SplitLayoutProps {
  /** Content for the left pane */
  leftPane: ReactNode;
  /** Content for the right pane */
  rightPane: ReactNode;
  /** Initial split percentage (0-100) for left pane width */
  initialSplit?: number;
  /** Minimum width for left pane (percentage) */
  minLeftWidth?: number;
  /** Maximum width for left pane (percentage) */
  maxLeftWidth?: number;
  /** Whether the right pane can be collapsed */
  collapsible?: boolean;
  /** Callback when split position changes */
  onSplitChange?: (split: number) => void;
  /** Additional className for the container */
  className?: string;
  /** Additional className for the divider */
  dividerClassName?: string;
}

export function SplitLayout({
  leftPane,
  rightPane,
  initialSplit = 50,
  minLeftWidth = 20,
  maxLeftWidth = 80,
  collapsible = false,
  onSplitChange,
  className,
  dividerClassName,
}: SplitLayoutProps) {
  // Clamp initial split to min/max bounds
  const clampedInitial = Math.max(minLeftWidth, Math.min(maxLeftWidth, initialSplit));
  const [splitPercent, setSplitPercent] = useState(clampedInitial);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle split change with clamping
  const handleSplitChange = useCallback(
    (newSplit: number) => {
      const clamped = Math.max(minLeftWidth, Math.min(maxLeftWidth, newSplit));
      setSplitPercent(clamped);
      onSplitChange?.(clamped);
    },
    [minLeftWidth, maxLeftWidth, onSplitChange]
  );

  // Mouse drag handling
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newPercent = ((e.clientX - rect.left) / rect.width) * 100;
      handleSplitChange(newPercent);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleSplitChange]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const step = 2; // Percentage step for keyboard navigation
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleSplitChange(splitPercent - step);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleSplitChange(splitPercent + step);
      }
    },
    [splitPercent, handleSplitChange]
  );

  // Collapse/expand handlers
  const handleCollapse = useCallback(() => {
    setIsCollapsed(true);
  }, []);

  const handleExpand = useCallback(() => {
    setIsCollapsed(false);
  }, []);

  return (
    <div
      ref={containerRef}
      data-testid="split-layout"
      className={cn('flex h-full w-full relative', className)}
    >
      {/* Left Pane */}
      <div
        data-testid="left-pane"
        className="h-full overflow-hidden flex-shrink-0"
        style={{ width: isCollapsed ? '100%' : `${splitPercent}%` }}
      >
        {leftPane}
      </div>

      {/* Divider */}
      {!isCollapsed && (
        <div
          data-testid="split-divider"
          role="separator"
          aria-orientation="vertical"
          aria-valuenow={splitPercent}
          tabIndex={0}
          onMouseDown={handleMouseDown}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          onKeyDown={handleKeyDown}
          className={cn(
            'w-1 h-full cursor-col-resize flex-shrink-0 transition-colors',
            'bg-gray-700 hover:bg-blue-500 focus:bg-blue-500 focus:outline-none',
            isDragging && 'bg-blue-600',
            isHovering && 'bg-blue-500',
            dividerClassName
          )}
        >
          {/* Divider grip indicator */}
          <div className="h-full w-full flex items-center justify-center">
            <div className="w-0.5 h-8 bg-gray-500 rounded-full opacity-50" />
          </div>
        </div>
      )}

      {/* Right Pane */}
      <div
        data-testid="right-pane"
        className={cn(
          'h-full overflow-hidden flex-1',
          isCollapsed && 'collapsed hidden'
        )}
      >
        {rightPane}
      </div>

      {/* Collapse/Expand Button */}
      {collapsible && (
        <>
          {!isCollapsed ? (
            <button
              data-testid="collapse-button"
              onClick={handleCollapse}
              className="absolute right-2 top-2 p-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white z-10"
              aria-label="Collapse preview pane"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              data-testid="expand-button"
              onClick={handleExpand}
              className="absolute right-2 top-2 p-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white z-10"
              aria-label="Expand preview pane"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default SplitLayout;
