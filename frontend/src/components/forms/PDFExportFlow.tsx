/**
 * PDFExportFlow Component
 * Generates and previews PDF documentation from OAS
 */

import React, { useState, useCallback } from "react";
import { FileText, Download, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface PDFExportFlowProps {
  /** OAS data to export */
  oasData: Record<string, unknown>;
  /** Callback after PDF generation */
  onGenerate?: (pdfUrl: string) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Generate HTML content from OAS for PDF
 */
function generateHTMLContent(oasData: Record<string, unknown>): string {
  const info = (oasData.info || {}) as Record<string, unknown>;
  const paths = (oasData.paths || {}) as Record<string, Record<string, unknown>>;
  const methods = ["get", "post", "put", "patch", "delete", "head", "options", "trace"];

  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${info.title || "API Documentation"}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #333; }
    h1 { color: #1a1a1a; border-bottom: 2px solid #eee; padding-bottom: 10px; }
    h2 { color: #333; margin-top: 30px; }
    h3 { color: #555; }
    .method { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; margin-right: 8px; }
    .get { background: #61affe; color: white; }
    .post { background: #49cc90; color: white; }
    .put { background: #fca130; color: white; }
    .patch { background: #50e3c2; color: white; }
    .delete { background: #f93e3e; color: white; }
    .path { font-family: monospace; background: #f5f5f5; padding: 2px 6px; border-radius: 3px; }
    .description { color: #666; margin: 10px 0; }
    .version { color: #888; font-size: 14px; }
    .endpoint { border: 1px solid #eee; border-radius: 8px; padding: 15px; margin: 15px 0; }
  </style>
</head>
<body>
  <h1>${info.title || "API Documentation"}</h1>
  <p class="version">Version ${info.version || "1.0.0"}</p>
  ${info.description ? `<p class="description">${info.description}</p>` : ""}

  <h2>Endpoints</h2>
`;

  for (const [path, pathItem] of Object.entries(paths)) {
    for (const method of methods) {
      const op = pathItem[method] as Record<string, unknown> | undefined;
      if (op) {
        html += `
  <div class="endpoint">
    <h3>
      <span class="method ${method}">${method.toUpperCase()}</span>
      <span class="path">${path}</span>
    </h3>
    ${op.summary ? `<p><strong>${op.summary}</strong></p>` : ""}
    ${op.description ? `<p class="description">${op.description}</p>` : ""}
  </div>
`;
      }
    }
  }

  html += `
</body>
</html>
`;

  return html;
}

/**
 * Convert HTML to PDF-like blob (simulated)
 * In production, this would call a backend service
 */
async function generatePDF(oasData: Record<string, unknown>): Promise<string> {
  // Simulate async PDF generation
  await new Promise((resolve) => setTimeout(resolve, 500));

  const htmlContent = generateHTMLContent(oasData);
  const blob = new Blob([htmlContent], { type: "text/html" });
  return URL.createObjectURL(blob);
}

/**
 * Check if OAS has content to export
 */
function hasContent(oasData: Record<string, unknown>): boolean {
  const info = (oasData.info || {}) as Record<string, unknown>;
  const paths = (oasData.paths || {}) as Record<string, unknown>;

  return !!(info.title && Object.keys(paths).length > 0);
}

/**
 * PDFExportFlow component for generating and previewing PDF docs.
 */
export function PDFExportFlow({
  oasData,
  onGenerate,
  className,
}: PDFExportFlowProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const canGenerate = hasContent(oasData);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);

    try {
      const url = await generatePDF(oasData);
      setPreviewUrl(url);
      setShowPreview(true);
      onGenerate?.(url);
    } finally {
      setIsGenerating(false);
    }
  }, [oasData, onGenerate]);

  const handleClose = useCallback(() => {
    setShowPreview(false);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }, [previewUrl]);

  const handleDownload = useCallback(() => {
    if (!previewUrl) return;

    const link = document.createElement("a");
    link.href = previewUrl;
    link.download = `api-documentation-${Date.now()}.html`;
    link.click();
  }, [previewUrl]);

  return (
    <div className={cn("flex items-center gap-4", className)}>
      {/* Generate button */}
      <Button
        type="button"
        variant="outline"
        onClick={handleGenerate}
        disabled={!canGenerate || isGenerating}
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <FileText className="h-4 w-4 mr-2" />
            Generate PDF
          </>
        )}
      </Button>

      {/* Preview dialog */}
      <Dialog open={showPreview} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle>PDF Preview</DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClose}
              >
                <X className="h-4 w-4 mr-2" />
                Close
              </Button>
            </div>
          </DialogHeader>

          <div data-testid="pdf-preview" className="flex-1 min-h-0">
            {previewUrl && (
              <iframe
                data-testid="pdf-iframe"
                src={previewUrl}
                className="w-full h-full border rounded-md"
                title="PDF Preview"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PDFExportFlow;
