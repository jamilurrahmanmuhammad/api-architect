/**
 * ModelsTab Component
 * Form tab for editing API models/schemas (components.schemas)
 */

import { useCallback, useState, useMemo } from "react";
import { Plus, Trash2, Search, X, Box, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { FormField } from "@/components/forms/FormField";
import { FieldEditor, type FieldEditorSchema } from "@/components/forms/tabs/FieldEditor";
import { useFormState, useUpdateField } from "@/providers/FormStateProvider";
import { Button } from "@/components/ui/button";

interface Schema {
  type?: string;
  description?: string;
  properties?: Record<string, unknown>;
  required?: string[];
  allOf?: unknown[];
  oneOf?: unknown[];
  anyOf?: unknown[];
  items?: unknown;
  [key: string]: unknown;
}

export interface ModelsTabProps {
  /** Additional CSS classes */
  className?: string;
}

/**
 * Count properties in a schema
 */
function getFieldCount(schema: Schema): number {
  if (schema.properties) {
    return Object.keys(schema.properties).length;
  }
  return 0;
}

/**
 * Get display type for a schema
 */
function getSchemaType(schema: Schema): string {
  if (schema.allOf) return "allOf";
  if (schema.oneOf) return "oneOf";
  if (schema.anyOf) return "anyOf";
  if (schema.type === "array") return "array";
  return schema.type || "object";
}

/**
 * Find references to a schema in the OAS
 */
function findSchemaReferences(
  oasData: Record<string, unknown>,
  schemaName: string
): string[] {
  const refs: string[] = [];
  const refPattern = `#/components/schemas/${schemaName}`;

  // Helper to recursively search for refs
  function searchRefs(obj: unknown, path: string): void {
    if (!obj || typeof obj !== "object") return;

    if (Array.isArray(obj)) {
      obj.forEach((item, index) => searchRefs(item, `${path}[${index}]`));
      return;
    }

    const record = obj as Record<string, unknown>;
    for (const [key, value] of Object.entries(record)) {
      const currentPath = path ? `${path}.${key}` : key;

      if (key === "$ref" && value === refPattern) {
        refs.push(path);
      } else {
        searchRefs(value, currentPath);
      }
    }
  }

  // Search in paths
  if (oasData.paths) {
    searchRefs(oasData.paths, "paths");
  }

  return refs;
}

/**
 * ModelsTab component for editing API schemas/models.
 */
export function ModelsTab({ className }: ModelsTabProps) {
  const { state } = useFormState();
  const updateField = useUpdateField();

  const { oasData, editedPaths } = state;
  const schemas: Record<string, Schema> =
    (oasData.components?.schemas as Record<string, Schema>) || {};

  // Local state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
  const [newModelName, setNewModelName] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  // Get sorted model names
  const modelNames = useMemo(() => {
    return Object.keys(schemas).sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
  }, [schemas]);

  // Filter models by search query
  const filteredModels = useMemo(() => {
    if (!searchQuery.trim()) return modelNames;

    const query = searchQuery.toLowerCase();
    return modelNames.filter((name) => {
      const schema = schemas[name];
      return (
        name.toLowerCase().includes(query) ||
        (schema?.description?.toLowerCase() || "").includes(query)
      );
    });
  }, [modelNames, searchQuery, schemas]);

  // Check if path is edited (also checks child paths)
  const isEdited = useCallback(
    (path: string) => {
      if (editedPaths.has(path)) return true;
      // Also check if any child path is edited
      for (const editedPath of editedPaths) {
        if (editedPath.startsWith(path + "/")) return true;
      }
      return false;
    },
    [editedPaths]
  );

  // Handle adding a new model
  const handleAddModel = useCallback(() => {
    setAddError(null);

    if (!newModelName.trim()) {
      setAddError("Model name is required");
      return;
    }

    if (schemas[newModelName]) {
      setAddError("Model with this name already exists");
      return;
    }

    // Create new schema
    const newSchema: Schema = {
      type: "object",
      description: "",
      properties: {},
    };

    updateField(`/components/schemas/${newModelName}`, newSchema);
    setShowAddDialog(false);
    setNewModelName("");
    setSelectedModel(newModelName);
  }, [newModelName, schemas, updateField]);

  // Handle deleting a model
  const handleDeleteModel = useCallback(
    (modelName: string) => {
      // Create new schemas object without the deleted model
      const newSchemas = { ...schemas };
      delete newSchemas[modelName];

      updateField("/components/schemas", newSchemas);
      setShowDeleteDialog(null);

      if (selectedModel === modelName) {
        setSelectedModel(null);
      }
    },
    [schemas, selectedModel, updateField]
  );

  // Handle updating model name
  const handleUpdateModelName = useCallback(
    (oldName: string, newName: string) => {
      if (oldName === newName) return;
      if (!newName.trim()) return;
      if (schemas[newName]) return; // Name already exists

      const schema = schemas[oldName];
      const newSchemas = { ...schemas };
      delete newSchemas[oldName];
      newSchemas[newName] = schema;

      updateField("/components/schemas", newSchemas);
      setSelectedModel(newName);
    },
    [schemas, updateField]
  );

  // Handle updating model description
  const handleUpdateModelDescription = useCallback(
    (modelName: string, description: string) => {
      updateField(`/components/schemas/${modelName}/description`, description);
    },
    [updateField]
  );

  // Handle schema change from FieldEditor
  const handleSchemaChange = useCallback(
    (modelName: string, updatedSchema: FieldEditorSchema) => {
      updateField(`/components/schemas/${modelName}`, updatedSchema);
    },
    [updateField]
  );

  // Get references for model being deleted
  const deleteReferences = useMemo(() => {
    if (!showDeleteDialog) return [];
    return findSchemaReferences(oasData, showDeleteDialog);
  }, [showDeleteDialog, oasData]);

  // Selected model schema
  const selectedSchema = selectedModel ? schemas[selectedModel] : null;

  return (
    <div
      data-testid="models-tab"
      className={cn("space-y-6", className)}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Models</h2>
          <p className="text-sm text-muted-foreground">
            {modelNames.length > 0
              ? `${modelNames.length} models defined`
              : "Define reusable data models for your API"}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowAddDialog(true)}
          aria-label="Add model"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Model
        </Button>
      </div>

      {/* Search */}
      {modelNames.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search models..."
            aria-label="Search models"
            className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-9 py-1 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Main content */}
      {modelNames.length === 0 ? (
        <div className="text-center py-8 border border-dashed rounded-md">
          <Box className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">No models defined yet.</p>
          <p className="text-sm text-muted-foreground">
            Add a model to define reusable data structures.
          </p>
        </div>
      ) : filteredModels.length === 0 ? (
        <div className="text-center py-8 border border-dashed rounded-md">
          <p className="text-sm text-muted-foreground">No models match your search.</p>
        </div>
      ) : (
        <div
          data-testid="models-layout"
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {/* Model list */}
          <div>
            <ul
              aria-label="Models list"
              className="space-y-2"
            >
              {filteredModels.map((name) => {
                const schema = schemas[name];
                const fieldCount = getFieldCount(schema);
                const schemaType = getSchemaType(schema);
                const modelEdited = isEdited(`/components/schemas/${name}`);

                return (
                  <li key={name}>
                    <div
                      className={cn(
                        "flex items-start justify-between gap-2 p-3 rounded-md border transition-colors",
                        selectedModel === name
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedModel(name)}
                        aria-label={`Select ${name} model`}
                        aria-selected={selectedModel === name}
                        className="flex-1 min-w-0 text-left"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{name}</span>
                          {modelEdited && (
                            <span
                              data-testid={`model-edited-indicator-${name}`}
                              className="h-2 w-2 rounded-full bg-amber-500"
                              title="Modified"
                            />
                          )}
                        </div>
                        {schema.description && (
                          <p className="text-sm text-muted-foreground truncate mt-0.5">
                            {schema.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="px-1.5 py-0.5 rounded bg-muted">
                            {schemaType}
                          </span>
                          <span>{fieldCount} fields</span>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDeleteDialog(name)}
                        aria-label={`Delete ${name} model`}
                        className="p-1 text-muted-foreground hover:text-destructive flex-shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Model details */}
          <div>
            {selectedModel && selectedSchema ? (
              <div className="space-y-4 p-4 border rounded-md">
                <h3 className="font-medium">Edit Model</h3>

                <FormField
                  name="model-name"
                  label="Model Name"
                  value={selectedModel}
                  onChange={(value) =>
                    handleUpdateModelName(selectedModel, value as string)
                  }
                  required
                  path={`/components/schemas/${selectedModel}`}
                  isEdited={isEdited(`/components/schemas/${selectedModel}`)}
                  helpText="The name used to reference this model in your API."
                  placeholder="ModelName"
                />

                <FormField
                  name="model-description"
                  label="Description"
                  type="textarea"
                  value={selectedSchema.description || ""}
                  onChange={(value) =>
                    handleUpdateModelDescription(selectedModel, value as string)
                  }
                  path={`/components/schemas/${selectedModel}/description`}
                  isEdited={isEdited(
                    `/components/schemas/${selectedModel}/description`
                  )}
                  helpText="A description of what this model represents."
                  placeholder="Describe the model..."
                  rows={3}
                />

                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground">
                    Type: <span className="font-medium">{getSchemaType(selectedSchema)}</span>
                  </p>
                </div>

                {/* Field Editor for properties */}
                <div className="pt-4 border-t">
                  <FieldEditor
                    modelName={selectedModel}
                    schema={selectedSchema as FieldEditorSchema}
                    onSchemaChange={(updatedSchema) =>
                      handleSchemaChange(selectedModel, updatedSchema)
                    }
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 border border-dashed rounded-md">
                <p className="text-sm text-muted-foreground">
                  Select a model to edit its details
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Model Dialog */}
      {showAddDialog && (
        <div
          role="dialog"
          aria-labelledby="add-model-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        >
          <div className="bg-background p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 id="add-model-title" className="text-lg font-semibold mb-4">
              New Model
            </h3>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="new-model-name"
                  className="block text-sm font-medium mb-1"
                >
                  Model Name <span className="text-destructive">*</span>
                </label>
                <input
                  id="new-model-name"
                  type="text"
                  value={newModelName}
                  onChange={(e) => {
                    setNewModelName(e.target.value);
                    setAddError(null);
                  }}
                  aria-label="Model name"
                  placeholder="e.g., User, Product, Order"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                {addError && (
                  <p className="mt-1 text-sm text-destructive">{addError}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowAddDialog(false);
                  setNewModelName("");
                  setAddError(null);
                }}
              >
                Cancel
              </Button>
              <Button type="button" onClick={handleAddModel}>
                Create
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div
          role="alertdialog"
          aria-labelledby="delete-model-title"
          aria-describedby="delete-model-description"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        >
          <div className="bg-background p-6 rounded-lg shadow-lg w-full max-w-md">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-destructive flex-shrink-0" />
              <div>
                <h3 id="delete-model-title" className="text-lg font-semibold">
                  Are you sure?
                </h3>
                <p id="delete-model-description" className="mt-1 text-sm text-muted-foreground">
                  This will delete the <strong>{showDeleteDialog}</strong> model.
                  This action cannot be undone.
                </p>

                {deleteReferences.length > 0 && (
                  <div className="mt-3 p-2 bg-destructive/10 rounded text-sm">
                    <p className="font-medium text-destructive">
                      Warning: This model is used by {deleteReferences.length} endpoint(s)
                    </p>
                    <p className="text-destructive/80">
                      Deleting it may break your API specification.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowDeleteDialog(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => handleDeleteModel(showDeleteDialog)}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ModelsTab;
