/**
 * T069: Editor selection utilities for bidirectional selection.
 *
 * Provides utilities for:
 * - Calculating line ranges for entity highlighting
 * - Creating Monaco Editor decorations
 * - Finding entities at cursor position
 */

export interface SourceLocation {
  line: number;
  column: number;
}

export interface LineRange {
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number | undefined;
}

export interface EditorDecoration {
  range: {
    startLineNumber: number;
    endLineNumber: number;
    startColumn: number;
    endColumn: number;
  };
  options: {
    isWholeLine: boolean;
    className: string;
    linesDecorationsClassName?: string;
  };
}

export interface EntityWithLocation {
  name: string;
  location: SourceLocation;
  endLine?: number;
}

/**
 * Calculate the line range for an entity based on its location.
 *
 * @param startLocation - The start location of the entity
 * @param endLocation - Optional end location
 * @returns LineRange object with start/end lines and columns
 */
export function calculateLineRange(
  startLocation: SourceLocation,
  endLocation?: SourceLocation
): LineRange {
  return {
    startLine: startLocation.line,
    endLine: endLocation?.line ?? startLocation.line,
    startColumn: startLocation.column,
    endColumn: endLocation?.column,
  };
}

/**
 * Create a Monaco Editor decoration for highlighting a range.
 *
 * @param range - The line range to highlight
 * @param className - CSS class for highlighting (default: 'entity-highlight')
 * @returns EditorDecoration compatible with Monaco Editor
 */
export function createEditorDecoration(
  range: LineRange,
  className: string = 'entity-highlight'
): EditorDecoration {
  return {
    range: {
      startLineNumber: range.startLine,
      endLineNumber: range.endLine,
      startColumn: range.startColumn,
      endColumn: range.endColumn ?? 1000, // Large number to cover whole line
    },
    options: {
      isWholeLine: true,
      className,
      linesDecorationsClassName: 'entity-line-decoration',
    },
  };
}

/**
 * Find the entity that contains the cursor line.
 *
 * @param cursorLine - Current cursor line number
 * @param entities - Array of entities with locations
 * @returns The entity containing the cursor, or null if none found
 */
export function findEntityAtCursor<T extends EntityWithLocation>(
  cursorLine: number,
  entities: T[]
): T | null {
  if (!entities || entities.length === 0) {
    return null;
  }

  for (const entity of entities) {
    const startLine = entity.location.line;
    const endLine = entity.endLine ?? startLine;

    if (cursorLine >= startLine && cursorLine <= endLine) {
      return entity;
    }
  }

  return null;
}

/**
 * CSS styles for entity highlighting.
 * Import this in your styles or inject dynamically.
 */
export const HIGHLIGHT_STYLES = `
  .entity-highlight {
    background-color: rgba(59, 130, 246, 0.2);
    border-left: 3px solid rgb(59, 130, 246);
  }

  .entity-line-decoration {
    background-color: rgba(59, 130, 246, 0.3);
    width: 3px !important;
    margin-left: 3px;
  }

  .entity-highlight-service {
    background-color: rgba(147, 51, 234, 0.2);
    border-left-color: rgb(147, 51, 234);
  }

  .entity-highlight-model {
    background-color: rgba(6, 182, 212, 0.2);
    border-left-color: rgb(6, 182, 212);
  }

  .entity-highlight-operation {
    background-color: rgba(34, 197, 94, 0.2);
    border-left-color: rgb(34, 197, 94);
  }

  .entity-highlight-error {
    background-color: rgba(239, 68, 68, 0.2);
    border-left-color: rgb(239, 68, 68);
  }
`;

export default {
  calculateLineRange,
  createEditorDecoration,
  findEntityAtCursor,
  HIGHLIGHT_STYLES,
};
