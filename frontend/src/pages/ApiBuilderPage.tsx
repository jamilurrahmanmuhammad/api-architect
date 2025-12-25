/**
 * API Builder Page
 * Form-based OpenAPI specification builder
 */

import { useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormStateProvider, useFormState, useUpdateField } from "@/providers/FormStateProvider";
import {
  ApiInfoTab,
  ModelsTab,
  OperationsTab,
  ProfileSelector,
  ValidationPanel,
  OASViewer,
  UndoRedoButtons,
  SaveIndicator,
  OASImportDialog,
  CSVImportDialog,
  CSVExportFlow,
  PDFExportFlow,
} from "@/components/forms";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import { Button } from "@/components/ui/button";
import { Upload, FileJson } from "lucide-react";

function ApiBuilderContent() {
  const { state } = useFormState();
  const updateField = useUpdateField();
  const { isSaving, lastSaved, error } = useFormPersistence();
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showCSVImportDialog, setShowCSVImportDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("info");

  const handleOASImport = useCallback(
    (oas: Record<string, unknown>) => {
      // Update entire OAS data
      if (oas.info) updateField("/info", oas.info);
      if (oas.paths) updateField("/paths", oas.paths);
      if (oas.components) updateField("/components", oas.components);
      if (oas.servers) updateField("/servers", oas.servers);
      if (oas.security) updateField("/security", oas.security);
      setShowImportDialog(false);
    },
    [updateField]
  );

  const handleCSVImport = useCallback(
    (operations: Array<{ operation_id: string; path: string; method: string; summary?: string }>) => {
      // Convert operations to OAS paths format
      const currentPaths = (state.oasData.paths || {}) as Record<string, Record<string, unknown>>;
      const paths: Record<string, Record<string, unknown>> = { ...currentPaths };
      for (const op of operations) {
        if (!paths[op.path]) {
          paths[op.path] = {};
        }
        paths[op.path][op.method.toLowerCase()] = {
          operationId: op.operation_id,
          summary: op.summary || "",
          responses: { "200": { description: "OK" } },
        };
      }

      updateField("/paths", paths);
      setShowCSVImportDialog(false);
    },
    [state.oasData.paths, updateField]
  );

  // Build current OAS data for export
  const oasData: Record<string, unknown> = {
    openapi: state.oasData.openapi || "3.0.3",
    info: state.oasData.info || { title: "", version: "" },
    paths: state.oasData.paths || {},
    components: state.oasData.components || {},
    servers: state.oasData.servers || [],
  };

  return (
    <div className="h-full flex flex-col" data-testid="api-builder">
      {/* Header */}
      <header className="border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">API Builder</h1>
          <ProfileSelector />
        </div>
        <div className="flex items-center gap-2">
          <UndoRedoButtons />
          <SaveIndicator isSaving={isSaving} lastSaved={lastSaved} error={error} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowImportDialog(true)}
            data-testid="import-oas-button"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import OAS
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCSVImportDialog(true)}
            data-testid="import-csv-button"
          >
            <FileJson className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex min-h-0">
        {/* Form tabs */}
        <div className="flex-1 overflow-auto p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="info" data-testid="tab-info">
                Info
              </TabsTrigger>
              <TabsTrigger value="models" data-testid="tab-models">
                Models
              </TabsTrigger>
              <TabsTrigger value="operations" data-testid="tab-operations">
                Operations
              </TabsTrigger>
              <TabsTrigger value="export" data-testid="tab-export">
                Export
              </TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="mt-4">
              <ApiInfoTab />
            </TabsContent>

            <TabsContent value="models" className="mt-4">
              <ModelsTab />
            </TabsContent>

            <TabsContent value="operations" className="mt-4">
              <OperationsTab />
            </TabsContent>

            <TabsContent value="export" className="mt-4">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Export Options</h3>
                  <div className="flex flex-wrap gap-4">
                    <CSVExportFlow oasData={oasData} />
                    <PDFExportFlow oasData={oasData} />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">OAS Preview</h3>
                  <OASViewer />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar - Validation panel */}
        <aside className="w-80 border-l p-4 overflow-auto">
          <ValidationPanel />
        </aside>
      </div>

      {/* Import dialogs */}
      <OASImportDialog
        open={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImport={handleOASImport}
      />

      <CSVImportDialog
        open={showCSVImportDialog}
        onClose={() => setShowCSVImportDialog(false)}
        onImport={handleCSVImport}
      />
    </div>
  );
}

export function ApiBuilderPage() {
  return (
    <FormStateProvider>
      <ApiBuilderContent />
    </FormStateProvider>
  );
}

export default ApiBuilderPage;
