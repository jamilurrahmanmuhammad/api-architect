/**
 * OASViewer Component
 * JSON/YAML viewer for OpenAPI specs with syntax highlighting
 */

import { useMemo, useState, useCallback } from "react";
import { Copy, Check, ChevronDown, ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFormState } from "@/providers/FormStateProvider";

export interface OASViewerProps {
  /** Additional CSS classes */
  className?: string;
}

type ViewFormat = "json" | "yaml";

/**
 * Convert JSON object to YAML string (simplified)
 */
function toYaml(obj: any, indent: number = 0): string {
  const spaces = "  ".repeat(indent);

  if (obj === null) return "null";
  if (obj === undefined) return "";
  if (typeof obj === "boolean") return obj ? "true" : "false";
  if (typeof obj === "number") return String(obj);
  if (typeof obj === "string") {
    if (obj.includes("\n") || obj.includes(": ") || obj.includes("#")) {
      return `"${obj.replace(/"/g, '\\"')}"`;
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) return "[]";
    return obj.map((item) => `${spaces}- ${toYaml(item, indent + 1).trimStart()}`).join("\n");
  }

  if (typeof obj === "object") {
    const entries = Object.entries(obj);
    if (entries.length === 0) return "{}";

    return entries
      .map(([key, value]) => {
        const valueStr = toYaml(value, indent + 1);
        if (typeof value === "object" && value !== null && !Array.isArray(value)) {
          return `${spaces}${key}:\n${valueStr}`;
        }
        if (Array.isArray(value) && value.length > 0) {
          return `${spaces}${key}:\n${valueStr}`;
        }
        return `${spaces}${key}: ${valueStr}`;
      })
      .join("\n");
  }

  return String(obj);
}

/**
 * Calculate file size
 */
function calculateSize(content: string): string {
  const bytes = new Blob([content]).size;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Tokenize JSON string for syntax highlighting
 */
interface Token {
  type: "key" | "string" | "number" | "boolean" | "null" | "punctuation";
  value: string;
  path?: string;
}

function tokenizeLine(
  line: string,
  isYaml: boolean
): { tokens: Token[]; path?: string } {
  const tokens: Token[] = [];

  if (isYaml) {
    // Simple YAML tokenization
    const keyMatch = line.match(/^(\s*)([^:]+):\s*(.*)$/);
    if (keyMatch) {
      const [, indent, key, value] = keyMatch;
      tokens.push({ type: "punctuation", value: indent });
      tokens.push({ type: "key", value: key });
      tokens.push({ type: "punctuation", value: ": " });

      if (value) {
        if (value === "true" || value === "false") {
          tokens.push({ type: "boolean", value });
        } else if (value === "null") {
          tokens.push({ type: "null", value });
        } else if (/^-?\d+(\.\d+)?$/.test(value)) {
          tokens.push({ type: "number", value });
        } else {
          tokens.push({ type: "string", value });
        }
      }
    } else if (line.trim().startsWith("- ")) {
      const match = line.match(/^(\s*)(- )(.*)$/);
      if (match) {
        tokens.push({ type: "punctuation", value: match[1] });
        tokens.push({ type: "punctuation", value: "- " });
        tokens.push({ type: "string", value: match[3] });
      }
    } else {
      tokens.push({ type: "string", value: line });
    }
  } else {
    // JSON tokenization
    let remaining = line;
    const regex = /("(?:[^"\\]|\\.)*")\s*:|("(?:[^"\\]|\\.)*")|(\d+(?:\.\d+)?)|(\btrue\b|\bfalse\b)|(\bnull\b)|([{}\[\]:,])|(\s+)/g;

    let match;
    let lastIndex = 0;

    while ((match = regex.exec(remaining)) !== null) {
      if (match.index > lastIndex) {
        tokens.push({ type: "punctuation", value: remaining.slice(lastIndex, match.index) });
      }

      if (match[1]) {
        // Key (quoted string followed by colon)
        tokens.push({ type: "key", value: match[1] });
      } else if (match[2]) {
        // String value
        tokens.push({ type: "string", value: match[2] });
      } else if (match[3]) {
        // Number
        tokens.push({ type: "number", value: match[3] });
      } else if (match[4]) {
        // Boolean
        tokens.push({ type: "boolean", value: match[4] });
      } else if (match[5]) {
        // Null
        tokens.push({ type: "null", value: match[5] });
      } else if (match[6]) {
        // Punctuation
        tokens.push({ type: "punctuation", value: match[6] });
      } else if (match[7]) {
        // Whitespace
        tokens.push({ type: "punctuation", value: match[7] });
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < remaining.length) {
      tokens.push({ type: "punctuation", value: remaining.slice(lastIndex) });
    }
  }

  return { tokens };
}

/**
 * Get syntax class for token type
 */
function getSyntaxClass(type: Token["type"]): string {
  switch (type) {
    case "key":
      return "syntax-key text-blue-400";
    case "string":
      return "syntax-string text-green-400";
    case "number":
      return "syntax-number text-orange-400";
    case "boolean":
      return "syntax-boolean text-purple-400";
    case "null":
      return "syntax-null text-gray-400";
    default:
      return "text-gray-300";
  }
}

/**
 * Check if a line path matches any edited path
 */
function isPathEdited(linePath: string, editedPaths: Set<string>): boolean {
  for (const edited of editedPaths) {
    if (linePath.startsWith(edited) || edited.startsWith(linePath)) {
      return true;
    }
  }
  return false;
}

/**
 * Extract path from JSON line
 */
function extractPathFromLine(_line: string, lineIndex: number, allLines: string[]): string {
  // Track object depth and current path
  const pathParts: string[] = [];
  let depth = 0;

  for (let i = 0; i <= lineIndex; i++) {
    const currentLine = allLines[i];
    const openBraces = (currentLine.match(/{/g) || []).length;
    const closeBraces = (currentLine.match(/}/g) || []).length;
    const openBrackets = (currentLine.match(/\[/g) || []).length;
    const closeBrackets = (currentLine.match(/]/g) || []).length;

    // Check for key
    const keyMatch = currentLine.match(/"([^"]+)"\s*:/);
    if (keyMatch) {
      while (pathParts.length > depth) {
        pathParts.pop();
      }
      pathParts.push(keyMatch[1]);
    }

    depth += openBraces + openBrackets - closeBraces - closeBrackets;
  }

  return "/" + pathParts.join("/");
}

/**
 * OASViewer component for displaying OpenAPI specs.
 */
export function OASViewer({ className }: OASViewerProps) {
  const { state } = useFormState();
  const { oasData, editedPaths } = state;

  const [format, setFormat] = useState<ViewFormat>("json");
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  // Format content based on selected format
  const formattedContent = useMemo(() => {
    if (format === "yaml") {
      return toYaml(oasData);
    }
    return JSON.stringify(oasData, null, 2);
  }, [oasData, format]);

  // Split into lines for rendering
  const lines = useMemo(() => formattedContent.split("\n"), [formattedContent]);

  // Calculate file size
  const fileSize = useMemo(() => calculateSize(formattedContent), [formattedContent]);

  // Search matches
  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const matches: { line: number; start: number; end: number }[] = [];
    const query = searchQuery.toLowerCase();

    lines.forEach((line, lineIndex) => {
      let searchStart = 0;
      const lowerLine = line.toLowerCase();

      while (true) {
        const index = lowerLine.indexOf(query, searchStart);
        if (index === -1) break;

        matches.push({
          line: lineIndex,
          start: index,
          end: index + query.length,
        });
        searchStart = index + 1;
      }
    });

    return matches;
  }, [lines, searchQuery]);

  // Handle copy to clipboard
  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(formattedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [formattedContent]);

  // Handle format toggle
  const handleFormatChange = useCallback((newFormat: ViewFormat) => {
    setFormat(newFormat);
  }, []);

  // Handle section collapse
  const toggleSection = useCallback((path: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  // Render a single line with syntax highlighting
  const renderLine = useCallback(
    (line: string, lineIndex: number) => {
      const { tokens } = tokenizeLine(line, format === "yaml");
      const linePath = format === "json" ? extractPathFromLine(line, lineIndex, lines) : "";
      const isEdited = editedPaths.size > 0 && isPathEdited(linePath, editedPaths);

      // Check for search highlights
      const lineMatches = searchMatches.filter((m) => m.line === lineIndex);

      // Check if this line starts an object/array
      const hasCollapsible = line.includes("{") || line.includes("[");
      const isCollapsed = collapsedSections.has(`${lineIndex}`);

      return (
        <div
          key={lineIndex}
          className={cn(
            "flex",
            isEdited && "edited-field bg-yellow-100 dark:bg-yellow-900/30"
          )}
          data-collapsible={hasCollapsible || undefined}
        >
          {/* Line number */}
          <span className="line-number select-none text-gray-500 text-right pr-4 w-12 flex-shrink-0">
            {lineIndex + 1}
          </span>

          {/* Collapse button */}
          <span className="w-4 flex-shrink-0">
            {hasCollapsible && (
              <button
                type="button"
                onClick={() => toggleSection(`${lineIndex}`)}
                aria-label={isCollapsed ? "Expand" : "Collapse"}
                className="text-gray-400 hover:text-gray-200"
              >
                {isCollapsed ? (
                  <ChevronRight className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>
            )}
          </span>

          {/* Line content */}
          <span className="flex-1 whitespace-pre">
            {tokens.map((token, tokenIndex) => {
              let content = token.value;

              // Apply search highlighting
              if (lineMatches.length > 0) {
                // Simple highlight - full token if matches
                const tokenLower = token.value.toLowerCase();
                if (tokenLower.includes(searchQuery.toLowerCase())) {
                  return (
                    <span key={tokenIndex} className={getSyntaxClass(token.type)}>
                      <mark className="search-highlight bg-yellow-300 text-black">
                        {content}
                      </mark>
                    </span>
                  );
                }
              }

              return (
                <span key={tokenIndex} className={getSyntaxClass(token.type)}>
                  {content}
                </span>
              );
            })}
          </span>
        </div>
      );
    },
    [format, lines, editedPaths, searchMatches, searchQuery, collapsedSections, toggleSection]
  );

  return (
    <div
      data-testid="oas-viewer"
      role="region"
      aria-label="OpenAPI Specification Viewer"
      tabIndex={0}
      className={cn(
        "font-mono text-sm bg-slate-900 text-gray-100 rounded-lg overflow-hidden",
        className
      )}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
        {/* Format Toggle */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleFormatChange("json")}
            aria-pressed={format === "json"}
            className={cn(
              "px-3 py-1 text-xs rounded font-medium transition-colors",
              format === "json"
                ? "bg-blue-600 text-white"
                : "text-gray-400 hover:text-white"
            )}
          >
            JSON
          </button>
          <button
            type="button"
            onClick={() => handleFormatChange("yaml")}
            aria-pressed={format === "yaml"}
            className={cn(
              "px-3 py-1 text-xs rounded font-medium transition-colors",
              format === "yaml"
                ? "bg-blue-600 text-white"
                : "text-gray-400 hover:text-white"
            )}
          >
            YAML
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
            <input
              type="search"
              role="searchbox"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 pr-2 py-1 text-xs bg-slate-700 border border-slate-600 rounded text-gray-200 placeholder-gray-500 w-40"
            />
          </div>
          {searchQuery && searchMatches.length > 0 && (
            <span className="text-xs text-gray-400">
              {searchMatches.length} match{searchMatches.length !== 1 ? "es" : ""}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* File size */}
          <span data-testid="file-size" className="text-xs text-gray-400">
            {fileSize}
          </span>

          {/* Copy button */}
          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copy to clipboard"
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-white transition-colors"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 overflow-auto max-h-[600px]">
        <div className="min-w-max">
          {lines.map((line, index) => renderLine(line, index))}
        </div>
      </div>
    </div>
  );
}

export default OASViewer;
