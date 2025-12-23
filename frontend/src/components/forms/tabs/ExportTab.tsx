/**
 * ExportTab Component
 * Form tab for exporting OpenAPI specs in various formats
 */

import React, { useCallback, useMemo, useState } from "react";
import {
  Download,
  FileJson,
  FileText,
  FileSpreadsheet,
  Copy,
  Check,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  FileCode,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFormState } from "@/providers/FormStateProvider";
import { Button } from "@/components/ui/button";

/** Export format options */
type ExportFormat = "yaml" | "json";

/** CSV profile options */
type CsvProfile = "Basic" | "Advanced" | "Expert";

/** OpenAPI version options */
const OPENAPI_VERSIONS = [
  { value: "3.0.0", label: "3.0.0" },
  { value: "3.0.1", label: "3.0.1" },
  { value: "3.0.2", label: "3.0.2" },
  { value: "3.0.3", label: "3.0.3" },
  { value: "3.1.0", label: "3.1.0" },
];

/** CSV profile descriptions */
const CSV_PROFILE_INFO: Record<CsvProfile, { label: string; description: string }> = {
  Basic: {
    label: "Basic",
    description: "Operations, parameters, and basic responses only",
  },
  Advanced: {
    label: "Advanced",
    description: "Includes headers, examples, validation rules, and request bodies",
  },
  Expert: {
    label: "Expert",
    description: "Full spec including security, webhooks, and vendor extensions",
  },
};

export interface ExportTabProps {
  className?: string;
}

/**
 * Count operations in OAS paths
 */
function countOperations(paths: Record<string, any> | undefined): number {
  if (!paths) return 0;

  let count = 0;
  const methods = ["get", "post", "put", "patch", "delete", "head", "options", "trace"];

  Object.values(paths).forEach((pathItem) => {
    if (pathItem && typeof pathItem === "object") {
      methods.forEach((method) => {
        if (pathItem[method]) count++;
      });
    }
  });

  return count;
}

/**
 * Count models/schemas
 */
function countModels(components: Record<string, any> | undefined): number {
  if (!components?.schemas) return 0;
  return Object.keys(components.schemas).length;
}

/**
 * Estimate file size
 */
function estimateSize(oasData: Record<string, any>, format: ExportFormat): string {
  const jsonStr = JSON.stringify(oasData);
  const bytes = format === "json" ? jsonStr.length : Math.round(jsonStr.length * 0.7);

  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * ExportTab component for exporting OpenAPI specs.
 */
export function ExportTab({ className }: ExportTabProps) {
  const { state } = useFormState();
  const { oasData, errors } = state;

  // Local state
  const [format, setFormat] = useState<ExportFormat>("yaml");
  const [csvProfile, setCsvProfile] = useState<CsvProfile>("Basic");
  const [copied, setCopied] = useState(false);

  // Derived state
  const hasErrors = useMemo(() => {
    return errors.some((e) => e.type === "error");
  }, [errors]);

  const errorCount = useMemo(() => {
    return errors.filter((e) => e.type === "error").length;
  }, [errors]);

  const warningCount = useMemo(() => {
    return errors.filter((e) => e.type === "warning").length;
  }, [errors]);

  const operationCount = useMemo(() => countOperations(oasData?.paths), [oasData]);
  const modelCount = useMemo(() => countModels(oasData?.components), [oasData]);
  const fileSize = useMemo(() => estimateSize(oasData, format), [oasData, format]);

  const currentVersion = oasData?.openapi || "3.0.0";

  // Handlers
  const handleDownloadOAS = useCallback(() => {
    const content =
      format === "json"
        ? JSON.stringify(oasData, null, 2)
        : JSON.stringify(oasData, null, 2); // In real implementation, convert to YAML

    const blob = new Blob([content], {
      type: format === "json" ? "application/json" : "text/yaml",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `openapi.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [oasData, format]);

  const handleDownloadCSV = useCallback(() => {
    // In real implementation, call backend API to generate CSV
    console.log(`Exporting CSV with profile: ${csvProfile}`);
  }, [csvProfile]);

  const handleCopyToClipboard = useCallback(async () => {
    const content =
      format === "json"
        ? JSON.stringify(oasData, null, 2)
        : JSON.stringify(oasData, null, 2);

    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [oasData, format]);

  const handleGenerateHTML = useCallback(() => {
    console.log("Generating HTML documentation");
  }, []);

  const handleGeneratePDF = useCallback(() => {
    console.log("Generating PDF documentation");
  }, []);

  return (
    <div data-testid="export-tab" className={cn("space-y-6", className)}>
      {/* Export Summary */}
      <section data-testid="export-summary" className="p-4 border rounded-lg bg-muted/30">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-semibold">{oasData?.info?.title || "Untitled API"}</h4>
            <p className="text-sm text-muted-foreground">
              Version {oasData?.info?.version || "1.0.0"}
            </p>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p>{operationCount} operation{operationCount !== 1 ? "s" : ""}</p>
            <p>{modelCount} model{modelCount !== 1 ? "s" : ""}</p>
          </div>
        </div>
      </section>

      {/* Validation Status */}
      <section data-testid="validation-status" className="p-4 border rounded-lg">
        <div className="flex items-center gap-3">
          {hasErrors ? (
            <div data-testid="status-icon-error" className="text-destructive">
              <AlertCircle className="h-6 w-6" />
            </div>
          ) : (
            <div data-testid="status-icon-valid" className="text-green-500">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          )}
          <div>
            {hasErrors ? (
              <p className="font-medium text-destructive">
                {errorCount} error{errorCount !== 1 ? "s" : ""} found
              </p>
            ) : (
              <p className="font-medium text-green-600">Valid OpenAPI specification</p>
            )}
            {warningCount > 0 && (
              <p className="text-sm text-yellow-600">
                {warningCount} warning{warningCount !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>

        {errors.length > 0 && (
          <div className="mt-3 space-y-1">
            {errors.slice(0, 5).map((error, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-center gap-2 text-sm p-2 rounded",
                  error.type === "error"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-yellow-500/10 text-yellow-700"
                )}
              >
                {error.type === "error" ? (
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                )}
                <span>{error.message}</span>
              </div>
            ))}
            {errors.length > 5 && (
              <p className="text-sm text-muted-foreground pl-6">
                +{errors.length - 5} more issues
              </p>
            )}
          </div>
        )}
      </section>

      {/* OpenAPI Export */}
      <section>
        <h3 className="text-lg font-semibold mb-4">OpenAPI Export</h3>

        <div className="space-y-4">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Format</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  value="yaml"
                  checked={format === "yaml"}
                  onChange={() => setFormat("yaml")}
                  className="h-4 w-4"
                />
                <FileCode className="h-4 w-4 text-muted-foreground" />
                <span>YAML</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  value="json"
                  checked={format === "json"}
                  onChange={() => setFormat("json")}
                  className="h-4 w-4"
                />
                <FileJson className="h-4 w-4 text-muted-foreground" />
                <span>JSON</span>
              </label>
            </div>
          </div>

          {/* Version Selection */}
          <div>
            <label
              htmlFor="openapi-version"
              className="block text-sm font-medium mb-2"
            >
              OpenAPI Version
            </label>
            <select
              id="openapi-version"
              value={currentVersion}
              onChange={() => {}}
              aria-label="OpenAPI version"
              className="flex h-9 w-full max-w-xs rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {OPENAPI_VERSIONS.map((v) => (
                <option key={v.value} value={v.value}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>

          {/* Size Estimate */}
          <div className="text-sm text-muted-foreground">
            <span>Estimated size: </span>
            <span className="font-medium">{fileSize}</span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={handleDownloadOAS}
              disabled={hasErrors}
              aria-label="Download OpenAPI"
            >
              <Download className="h-4 w-4 mr-2" />
              Download OpenAPI
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleCopyToClipboard}
              disabled={hasErrors}
              aria-label="Copy to clipboard"
            >
              {copied ? (
                <Check className="h-4 w-4 mr-2" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
        </div>
      </section>

      {/* CSV Export */}
      <section>
        <h3 className="text-lg font-semibold mb-4">CSV Export</h3>

        <div className="space-y-4">
          {/* Profile Selection */}
          <div>
            <label
              htmlFor="csv-profile"
              className="block text-sm font-medium mb-2"
            >
              Export Profile
            </label>
            <select
              id="csv-profile"
              value={csvProfile}
              onChange={(e) => setCsvProfile(e.target.value as CsvProfile)}
              aria-label="Profile"
              className="flex h-9 w-full max-w-xs rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {Object.entries(CSV_PROFILE_INFO).map(([value, info]) => (
                <option key={value} value={value}>
                  {info.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-sm text-muted-foreground">
              {CSV_PROFILE_INFO[csvProfile].description}
            </p>
          </div>

          {/* Download Button */}
          <Button
            type="button"
            variant="outline"
            onClick={handleDownloadCSV}
            disabled={hasErrors}
            aria-label="Download CSV"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Download CSV
          </Button>
        </div>
      </section>

      {/* Documentation Generation */}
      <section>
        <h3 className="text-lg font-semibold mb-4">Documentation</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Generate professional API documentation from your spec
        </p>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleGenerateHTML}
            disabled={hasErrors}
            aria-label="Generate HTML"
          >
            <FileText className="h-4 w-4 mr-2" />
            HTML
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleGeneratePDF}
            disabled={hasErrors}
            aria-label="Generate PDF"
          >
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </section>
    </div>
  );
}

export default ExportTab;
