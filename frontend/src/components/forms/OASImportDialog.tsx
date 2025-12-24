/**
 * OASImportDialog Component
 * Dialog for importing OpenAPI specification files
 * Supports drag-drop and file upload with validation
 */

import React, { useState, useCallback, useEffect, useRef } from "react";
import { Upload, FileJson, AlertCircle, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import yaml from "js-yaml";

interface ImportSummary {
  title: string;
  version: string;
  operationsCount: number;
  modelsCount: number;
  pathsCount: number;
}

interface ParsedResult {
  oas: Record<string, unknown>;
  summary: ImportSummary;
}

export interface OASImportDialogProps {
  /** Whether dialog is open */
  open: boolean;
  /** Called when dialog should close */
  onClose: () => void;
  /** Called with parsed OAS when import is confirmed */
  onImport: (oas: Record<string, unknown>) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Count operations in an OAS document
 */
function countOperations(paths: Record<string, unknown>): number {
  const methods = ["get", "post", "put", "patch", "delete", "head", "options", "trace"];
  let count = 0;

  for (const pathItem of Object.values(paths)) {
    if (typeof pathItem === "object" && pathItem !== null) {
      for (const method of methods) {
        if (method in pathItem) {
          count++;
        }
      }
    }
  }

  return count;
}

/**
 * Count models/schemas in an OAS document
 */
function countModels(components: Record<string, unknown> | undefined): number {
  if (!components) return 0;
  const schemas = components.schemas as Record<string, unknown> | undefined;
  if (!schemas) return 0;
  return Object.keys(schemas).length;
}

/**
 * Parse and validate OAS content
 */
function parseOAS(content: string, filename: string): ParsedResult {
  let parsed: Record<string, unknown>;

  // Try to parse as JSON or YAML
  try {
    if (filename.endsWith(".json")) {
      parsed = JSON.parse(content);
    } else {
      parsed = yaml.load(content) as Record<string, unknown>;
    }
  } catch {
    throw new Error("Invalid file format. Please provide a valid JSON or YAML file.");
  }

  // Validate required fields
  if (!parsed.openapi && !parsed.swagger) {
    throw new Error("Invalid OpenAPI specification. Missing 'openapi' or 'swagger' field.");
  }

  const info = parsed.info as Record<string, unknown> | undefined;
  if (!info || !info.title) {
    throw new Error("Invalid OpenAPI specification. Missing 'info.title' field.");
  }

  const paths = (parsed.paths || {}) as Record<string, unknown>;
  const components = parsed.components as Record<string, unknown> | undefined;

  const summary: ImportSummary = {
    title: (info.title as string) || "Untitled API",
    version: (info.version as string) || "1.0.0",
    operationsCount: countOperations(paths),
    modelsCount: countModels(components),
    pathsCount: Object.keys(paths).length,
  };

  return { oas: parsed, summary };
}

/**
 * OASImportDialog component for importing OpenAPI specs.
 *
 * Features:
 * - Drag and drop file support
 * - File picker button
 * - Progress indicator during parsing
 * - Import summary with operation/model counts
 * - Error handling for invalid files
 */
export function OASImportDialog({
  open,
  onClose,
  onImport,
  className,
}: OASImportDialogProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedResult, setParsedResult] = useState<ParsedResult | null>(null);
  const [filename, setFilename] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setIsDragging(false);
      setIsLoading(false);
      setError(null);
      setParsedResult(null);
      setFilename(null);
    }
  }, [open]);

  // Handle file selection
  const handleFile = useCallback((file: File) => {
    setIsLoading(true);
    setError(null);
    setParsedResult(null);
    setFilename(file.name);

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const content = reader.result as string;
        const result = parseOAS(content, file.name);
        setParsedResult(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to parse file");
      } finally {
        setIsLoading(false);
      }
    };

    reader.onerror = () => {
      setError("Failed to read file. Please try again.");
      setIsLoading(false);
    };

    reader.readAsText(file);
  }, []);

  // Handle file input change
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  // Handle import confirmation
  const handleImport = useCallback(() => {
    if (parsedResult) {
      onImport(parsedResult.oas);
      onClose();
    }
  }, [parsedResult, onImport, onClose]);

  // Handle file button click
  const handleChooseFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className={cn("sm:max-w-md", className)}>
        <DialogHeader>
          <DialogTitle>Import OpenAPI Specification</DialogTitle>
          <DialogDescription>
            Upload a JSON or YAML file containing your OpenAPI specification.
          </DialogDescription>
        </DialogHeader>

        {/* Drop zone */}
        <div
          data-testid="dropzone"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50",
            error && "border-destructive/50"
          )}
        >
          {isLoading ? (
            <div data-testid="import-progress" className="flex flex-col items-center gap-2">
              <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Parsing {filename}...</p>
            </div>
          ) : parsedResult ? (
            <div data-testid="import-summary" className="flex flex-col items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">{parsedResult.summary.title}</p>
                <p className="text-sm text-muted-foreground">
                  Version {parsedResult.summary.version}
                </p>
              </div>
              <div className="flex gap-4 text-sm">
                <span className="text-muted-foreground">
                  <strong>{parsedResult.summary.operationsCount}</strong> operations
                </span>
                <span className="text-muted-foreground">
                  <strong>{parsedResult.summary.modelsCount}</strong> models
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{filename}</p>
            </div>
          ) : (
            <>
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-2">
                Drag and drop your OpenAPI file here, or
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleChooseFile}
              >
                <FileJson className="h-4 w-4 mr-2" />
                Choose File
              </Button>
              <p className="text-xs text-muted-foreground mt-3">
                Supports .json, .yaml, .yml files
              </p>
            </>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          data-testid="file-input"
          accept=".json,.yaml,.yml,application/json,application/x-yaml,text/yaml"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Error message */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm"
          >
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            disabled={!parsedResult || isLoading}
          >
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default OASImportDialog;
