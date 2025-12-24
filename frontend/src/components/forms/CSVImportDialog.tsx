/**
 * CSVImportDialog Component
 * Dialog for importing operations from CSV files
 */

import React, { useState, useCallback, useEffect, useRef } from "react";
import { Upload, FileSpreadsheet, AlertCircle, Check, Loader2 } from "lucide-react";
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

interface CSVRow {
  operation_id: string;
  path: string;
  method: string;
  summary?: string;
  description?: string;
  [key: string]: string | undefined;
}

interface ParsedResult {
  rows: CSVRow[];
  headers: string[];
}

export interface CSVImportDialogProps {
  /** Whether dialog is open */
  open: boolean;
  /** Called when dialog should close */
  onClose: () => void;
  /** Called with parsed operations when import is confirmed */
  onImport: (operations: CSVRow[]) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Required CSV headers for operations
 */
const REQUIRED_HEADERS = ["operation_id", "path", "method"];

/**
 * Parse CSV content into rows
 */
function parseCSV(content: string): ParsedResult {
  const lines = content.trim().split("\n");

  if (lines.length === 0) {
    throw new Error("CSV file is empty.");
  }

  // Parse headers
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

  // Validate required headers
  const missingHeaders = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
  if (missingHeaders.length > 0) {
    throw new Error(`Missing required headers: ${missingHeaders.join(", ")}`);
  }

  // Parse data rows
  const rows: CSVRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);

    if (values.length !== headers.length) {
      continue; // Skip malformed rows
    }

    const row: CSVRow = {
      operation_id: "",
      path: "",
      method: "",
    };

    headers.forEach((header, idx) => {
      row[header] = values[idx];
    });

    // Skip empty rows
    if (row.operation_id && row.path && row.method) {
      rows.push(row);
    }
  }

  if (rows.length === 0) {
    throw new Error("No valid data rows found in CSV.");
  }

  return { rows, headers };
}

/**
 * Parse a single CSV line, handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

/**
 * CSVImportDialog component for importing operations from CSV.
 */
export function CSVImportDialog({
  open,
  onClose,
  onImport,
  className,
}: CSVImportDialogProps) {
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
        const result = parseCSV(content);
        setParsedResult(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to parse CSV");
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
      onImport(parsedResult.rows);
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
      <DialogContent className={cn("sm:max-w-lg", className)}>
        <DialogHeader>
          <DialogTitle>Import CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file with operations. Required columns: operation_id, path, method.
          </DialogDescription>
        </DialogHeader>

        {/* Drop zone or preview */}
        {!parsedResult ? (
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
            ) : (
              <>
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-2">
                  Drag and drop your CSV file here, or
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleChooseFile}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Choose File
                </Button>
                <p className="text-xs text-muted-foreground mt-3">
                  Supports .csv files
                </p>
              </>
            )}
          </div>
        ) : (
          <div data-testid="import-preview" className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium">{filename}</p>
                <p className="text-sm text-muted-foreground">
                  {parsedResult.rows.length} operations found
                </p>
              </div>
            </div>

            {/* Preview table */}
            <div className="border rounded-md overflow-hidden max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left font-medium px-3 py-2">Operation</th>
                    <th className="text-left font-medium px-3 py-2">Method</th>
                    <th className="text-left font-medium px-3 py-2">Path</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedResult.rows.slice(0, 5).map((row, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-3 py-2 font-mono text-xs">{row.operation_id}</td>
                      <td className="px-3 py-2">
                        <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-medium uppercase">
                          {row.method}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{row.path}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedResult.rows.length > 5 && (
                <div className="px-3 py-2 text-center text-sm text-muted-foreground border-t bg-muted/30">
                  And {parsedResult.rows.length - 5} more...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          data-testid="file-input"
          accept=".csv,text/csv"
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

export default CSVImportDialog;
