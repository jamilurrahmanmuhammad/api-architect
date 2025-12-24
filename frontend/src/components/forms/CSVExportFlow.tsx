/**
 * CSVExportFlow Component
 * Exports OAS operations to CSV with profile selection
 */

import { useState, useCallback, useMemo } from "react";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type ExportProfile = "basic" | "advanced" | "expert";

interface Operation {
  operationId: string;
  path: string;
  method: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: unknown[];
  requestBody?: unknown;
  responses?: Record<string, unknown>;
  security?: unknown[];
}

export interface CSVExportFlowProps {
  /** OAS data to export */
  oasData: Record<string, unknown>;
  /** Callback after export */
  onExport?: (csv: string, profile: ExportProfile) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Extract operations from OAS paths
 */
function extractOperations(oasData: Record<string, unknown>): Operation[] {
  const paths = (oasData.paths || {}) as Record<string, Record<string, unknown>>;
  const methods = ["get", "post", "put", "patch", "delete", "head", "options", "trace"];
  const operations: Operation[] = [];

  for (const [path, pathItem] of Object.entries(paths)) {
    for (const method of methods) {
      const op = pathItem[method] as Record<string, unknown> | undefined;
      if (op) {
        operations.push({
          operationId: (op.operationId as string) || `${method}_${path.replace(/\//g, "_")}`,
          path,
          method: method.toUpperCase(),
          summary: op.summary as string | undefined,
          description: op.description as string | undefined,
          tags: op.tags as string[] | undefined,
          parameters: op.parameters as unknown[] | undefined,
          requestBody: op.requestBody,
          responses: op.responses as Record<string, unknown> | undefined,
          security: op.security as unknown[] | undefined,
        });
      }
    }
  }

  return operations;
}

/**
 * Get CSV headers based on profile
 */
function getHeaders(profile: ExportProfile): string[] {
  const basic = ["operation_id", "path", "method", "summary"];
  const advanced = [...basic, "description", "tags", "parameters"];
  const expert = [...advanced, "request_body", "responses", "security"];

  switch (profile) {
    case "basic":
      return basic;
    case "advanced":
      return advanced;
    case "expert":
      return expert;
    default:
      return basic;
  }
}

/**
 * Escape CSV value
 */
function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  let str: string;
  if (typeof value === "object") {
    str = JSON.stringify(value);
  } else {
    str = String(value);
  }

  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Convert operations to CSV string
 */
function operationsToCSV(operations: Operation[], profile: ExportProfile): string {
  const headers = getHeaders(profile);
  const rows: string[] = [headers.join(",")];

  for (const op of operations) {
    const values: string[] = headers.map((header) => {
      switch (header) {
        case "operation_id":
          return escapeCSV(op.operationId);
        case "path":
          return escapeCSV(op.path);
        case "method":
          return escapeCSV(op.method);
        case "summary":
          return escapeCSV(op.summary);
        case "description":
          return escapeCSV(op.description);
        case "tags":
          return escapeCSV(op.tags?.join(";"));
        case "parameters":
          return escapeCSV(op.parameters);
        case "request_body":
          return escapeCSV(op.requestBody);
        case "responses":
          return escapeCSV(op.responses);
        case "security":
          return escapeCSV(op.security);
        default:
          return "";
      }
    });

    rows.push(values.join(","));
  }

  return rows.join("\n");
}

/**
 * Generate filename with timestamp
 */
function generateFilename(): string {
  const now = new Date();
  const timestamp = now.toISOString().slice(0, 19).replace(/[:-]/g, "");
  return `api-${timestamp}.csv`;
}

/**
 * Trigger file download
 */
function downloadFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";

  link.click();

  // Cleanup
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * CSVExportFlow component for exporting operations to CSV.
 */
export function CSVExportFlow({
  oasData,
  onExport,
  className,
}: CSVExportFlowProps) {
  const [profile, setProfile] = useState<ExportProfile>("basic");

  const operations = useMemo(() => extractOperations(oasData), [oasData]);
  const hasOperations = operations.length > 0;

  const handleExport = useCallback(() => {
    const csv = operationsToCSV(operations, profile);
    const filename = generateFilename();

    downloadFile(csv, filename);

    onExport?.(csv, profile);
  }, [operations, profile, onExport]);

  return (
    <div className={cn("flex items-center gap-4", className)}>
      {/* Profile selector */}
      <div className="flex items-center gap-2">
        <label htmlFor="csv-profile" className="text-sm font-medium">
          Profile:
        </label>
        <select
          id="csv-profile"
          value={profile}
          onChange={(e) => setProfile(e.target.value as ExportProfile)}
          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="basic">Basic</option>
          <option value="advanced">Advanced</option>
          <option value="expert">Expert</option>
        </select>
      </div>

      {/* Download button */}
      <Button
        type="button"
        variant="outline"
        onClick={handleExport}
        disabled={!hasOperations}
      >
        <Download className="h-4 w-4 mr-2" />
        Download CSV
      </Button>

      {/* Operation count */}
      <span className="text-sm text-muted-foreground">
        {operations.length} operation{operations.length !== 1 ? "s" : ""}
      </span>
    </div>
  );
}

export default CSVExportFlow;
