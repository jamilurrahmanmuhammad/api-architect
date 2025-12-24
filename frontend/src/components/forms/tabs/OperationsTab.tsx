/**
 * OperationsTab Component
 * Form tab for editing API operations/endpoints (paths)
 */

import React, { useCallback, useState, useMemo } from "react";
import { Plus, Trash2, Search, X, FileCode2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { FormField } from "@/components/forms/FormField";
import { useFormState, useUpdateField } from "@/providers/FormStateProvider";
import { Button } from "@/components/ui/button";

/** HTTP methods supported */
const HTTP_METHODS = ["get", "post", "put", "patch", "delete", "options", "head"] as const;
type HttpMethod = (typeof HTTP_METHODS)[number];

/** Method badge colors */
const METHOD_COLORS: Record<string, string> = {
  get: "bg-green-100 text-green-800",
  post: "bg-blue-100 text-blue-800",
  put: "bg-yellow-100 text-yellow-800",
  patch: "bg-orange-100 text-orange-800",
  delete: "bg-red-100 text-red-800",
  options: "bg-gray-100 text-gray-800",
  head: "bg-purple-100 text-purple-800",
};

interface Operation {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: unknown[];
  requestBody?: unknown;
  responses?: Record<string, unknown>;
  [key: string]: unknown;
}

interface PathItem {
  get?: Operation;
  post?: Operation;
  put?: Operation;
  patch?: Operation;
  delete?: Operation;
  options?: Operation;
  head?: Operation;
  parameters?: unknown[];
  [key: string]: unknown;
}

export interface OperationsTabProps {
  /** Additional CSS classes */
  className?: string;
}

/** Helper type for a flattened operation */
interface FlatOperation {
  path: string;
  method: HttpMethod;
  operation: Operation;
}

/**
 * Flatten paths object into list of operations
 */
function flattenOperations(paths: Record<string, PathItem>): FlatOperation[] {
  const operations: FlatOperation[] = [];

  for (const [path, pathItem] of Object.entries(paths)) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (operation) {
        operations.push({ path, method, operation });
      }
    }
  }

  return operations;
}

/**
 * OperationsTab component for editing API operations/endpoints.
 */
export function OperationsTab({ className }: OperationsTabProps) {
  const { state } = useFormState();
  const updateField = useUpdateField();

  const { oasData, editedPaths } = state;
  const paths: Record<string, PathItem> = oasData.paths || {};

  // Local state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOp, setSelectedOp] = useState<{ path: string; method: HttpMethod } | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState<{ path: string; method: HttpMethod } | null>(null);
  const [newPath, setNewPath] = useState("");
  const [newMethod, setNewMethod] = useState<HttpMethod>("get");
  const [addError, setAddError] = useState<string | null>(null);

  // Flatten operations for display
  const operations = useMemo(() => flattenOperations(paths), [paths]);

  // Filter operations by search query
  const filteredOperations = useMemo(() => {
    if (!searchQuery.trim()) return operations;

    const query = searchQuery.toLowerCase();
    return operations.filter(({ path, operation }) => {
      return (
        path.toLowerCase().includes(query) ||
        (operation.summary?.toLowerCase() || "").includes(query) ||
        (operation.operationId?.toLowerCase() || "").includes(query)
      );
    });
  }, [operations, searchQuery]);

  // Get unique paths for grouping
  const uniquePaths = useMemo(() => {
    return [...new Set(filteredOperations.map((op) => op.path))].sort();
  }, [filteredOperations]);

  // Check if path is edited
  const isEdited = useCallback(
    (path: string) => {
      for (const editedPath of editedPaths) {
        if (editedPath.startsWith(`/paths/${path.replace(/\//g, "~1")}`)) return true;
      }
      return false;
    },
    [editedPaths]
  );

  // Handle adding a new operation
  const handleAddOperation = useCallback(() => {
    setAddError(null);

    if (!newPath.trim()) {
      setAddError("Path is required");
      return;
    }

    if (!newPath.startsWith("/")) {
      setAddError("Path must start with /");
      return;
    }

    // Check if operation already exists
    const existingPath = paths[newPath];
    if (existingPath && existingPath[newMethod]) {
      setAddError(`${newMethod.toUpperCase()} ${newPath} already exists`);
      return;
    }

    // Create new operation
    const newOperation: Operation = {
      operationId: `${newMethod}${newPath.replace(/[^a-zA-Z0-9]/g, "")}`,
      summary: "",
      description: "",
      responses: {
        "200": { description: "Success" },
      },
    };

    // Add the new path and operation directly to paths object
    const newPaths = {
      ...paths,
      [newPath]: {
        ...(existingPath || {}),
        [newMethod]: newOperation,
      },
    };

    updateField("/paths", newPaths);
    setShowAddDialog(false);
    setNewPath("");
    setNewMethod("get");
    setSelectedOp({ path: newPath, method: newMethod });
  }, [newPath, newMethod, paths, updateField]);

  // Handle deleting an operation
  const handleDeleteOperation = useCallback(
    (path: string, method: HttpMethod) => {
      const pathItem = paths[path];
      if (!pathItem) return;

      // Create new path item without the deleted method
      const newPathItem = { ...pathItem };
      delete newPathItem[method];

      // Check if path item is now empty (only has non-method keys)
      const remainingMethods = HTTP_METHODS.filter((m) => newPathItem[m]);
      if (remainingMethods.length === 0) {
        // Remove entire path
        const newPaths = { ...paths };
        delete newPaths[path];
        updateField("/paths", newPaths);
      } else {
        updateField(`/paths/${path.replace(/\//g, "~1")}`, newPathItem);
      }

      setShowDeleteDialog(null);

      if (selectedOp?.path === path && selectedOp?.method === method) {
        setSelectedOp(null);
      }
    },
    [paths, selectedOp, updateField]
  );

  // Handle updating operation field
  const handleUpdateOperation = useCallback(
    (path: string, method: HttpMethod, field: string, value: string) => {
      const pathItem = paths[path];
      if (!pathItem || !pathItem[method]) return;

      const operation = pathItem[method] as Operation;
      const newOperation = { ...operation, [field]: value };

      updateField(`/paths/${path.replace(/\//g, "~1")}/${method}`, newOperation);
    },
    [paths, updateField]
  );

  // Get selected operation
  const selectedOperation = selectedOp
    ? (paths[selectedOp.path]?.[selectedOp.method] as Operation | undefined)
    : null;

  return (
    <div
      data-testid="operations-tab"
      className={cn("space-y-6", className)}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Operations</h2>
          <p className="text-sm text-muted-foreground">
            {operations.length > 0
              ? `${operations.length} operations defined`
              : "Define API endpoints and operations"}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowAddDialog(true)}
          aria-label="Add operation"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Operation
        </Button>
      </div>

      {/* Search */}
      {operations.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search operations..."
            aria-label="Search operations"
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
      {operations.length === 0 ? (
        <div className="text-center py-8 border border-dashed rounded-md">
          <FileCode2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">No operations defined yet.</p>
          <p className="text-sm text-muted-foreground">
            Add an operation to define API endpoints.
          </p>
        </div>
      ) : filteredOperations.length === 0 ? (
        <div className="text-center py-8 border border-dashed rounded-md">
          <p className="text-sm text-muted-foreground">No operations match your search.</p>
        </div>
      ) : (
        <div
          data-testid="operations-layout"
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {/* Operations list */}
          <div>
            <ul
              aria-label="Operations list"
              className="space-y-2"
            >
              {uniquePaths.map((path) => {
                const pathOperations = filteredOperations.filter((op) => op.path === path);

                return (
                  <li key={path} className="border rounded-md overflow-hidden">
                    <div className="bg-muted/50 px-3 py-2 font-mono text-sm">
                      {path}
                    </div>
                    <div className="divide-y">
                      {pathOperations.map(({ method, operation }) => {
                        const isSelected =
                          selectedOp?.path === path && selectedOp?.method === method;

                        return (
                          <div
                            key={`${path}-${method}`}
                            className={cn(
                              "flex items-center justify-between p-2",
                              isSelected && "bg-primary/5"
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => setSelectedOp({ path, method })}
                              aria-label={`Select ${method.toUpperCase()} ${path} operation`}
                              aria-selected={isSelected}
                              className="flex-1 flex items-center gap-2 text-left"
                            >
                              <span
                                className={cn(
                                  "px-2 py-0.5 rounded text-xs font-medium uppercase",
                                  METHOD_COLORS[method]
                                )}
                              >
                                {method.toUpperCase()}
                              </span>
                              <span className="text-sm truncate">
                                {operation.summary || operation.operationId || "(no summary)"}
                              </span>
                              {operation.tags && operation.tags.length > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  {operation.tags[0]}
                                </span>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowDeleteDialog({ path, method })}
                              aria-label={`Delete ${method.toUpperCase()} ${path} operation`}
                              className="p-1 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Operation details */}
          <div>
            {selectedOp && selectedOperation ? (
              <div className="space-y-4 p-4 border rounded-md">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded text-xs font-medium uppercase",
                      METHOD_COLORS[selectedOp.method]
                    )}
                  >
                    {selectedOp.method.toUpperCase()}
                  </span>
                  <span className="font-mono text-sm">{selectedOp.path}</span>
                </div>

                <FormField
                  name="operation-id"
                  label="Operation ID"
                  value={selectedOperation.operationId || ""}
                  onChange={(value) =>
                    handleUpdateOperation(
                      selectedOp.path,
                      selectedOp.method,
                      "operationId",
                      value as string
                    )
                  }
                  path={`/paths/${selectedOp.path.replace(/\//g, "~1")}/${selectedOp.method}/operationId`}
                  helpText="Unique identifier for this operation."
                  placeholder="getUsers"
                />

                <FormField
                  name="operation-summary"
                  label="Summary"
                  value={selectedOperation.summary || ""}
                  onChange={(value) =>
                    handleUpdateOperation(
                      selectedOp.path,
                      selectedOp.method,
                      "summary",
                      value as string
                    )
                  }
                  path={`/paths/${selectedOp.path.replace(/\//g, "~1")}/${selectedOp.method}/summary`}
                  helpText="Short summary of what this operation does."
                  placeholder="Get all users"
                />

                <FormField
                  name="operation-description"
                  label="Description"
                  type="textarea"
                  value={selectedOperation.description || ""}
                  onChange={(value) =>
                    handleUpdateOperation(
                      selectedOp.path,
                      selectedOp.method,
                      "description",
                      value as string
                    )
                  }
                  path={`/paths/${selectedOp.path.replace(/\//g, "~1")}/${selectedOp.method}/description`}
                  helpText="Detailed description of this operation."
                  placeholder="Describe what this operation does..."
                  rows={3}
                />

                {selectedOperation.tags && selectedOperation.tags.length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground">
                      Tags: <span className="font-medium">{selectedOperation.tags.join(", ")}</span>
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 border border-dashed rounded-md">
                <p className="text-sm text-muted-foreground">
                  Select an operation to edit its details
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Operation Dialog */}
      {showAddDialog && (
        <div
          role="dialog"
          aria-labelledby="add-operation-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        >
          <div className="bg-background p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 id="add-operation-title" className="text-lg font-semibold mb-4">
              New Operation
            </h3>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="new-path"
                  className="block text-sm font-medium mb-1"
                >
                  Path <span className="text-destructive">*</span>
                </label>
                <input
                  id="new-path"
                  type="text"
                  value={newPath}
                  onChange={(e) => {
                    setNewPath(e.target.value);
                    setAddError(null);
                  }}
                  aria-label="Path"
                  placeholder="/users/{id}"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-mono"
                />
              </div>

              <div>
                <label
                  htmlFor="new-method"
                  className="block text-sm font-medium mb-1"
                >
                  Method
                </label>
                <select
                  id="new-method"
                  value={newMethod}
                  onChange={(e) => setNewMethod(e.target.value as HttpMethod)}
                  aria-label="Method"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {HTTP_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              {addError && (
                <p className="text-sm text-destructive">{addError}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowAddDialog(false);
                  setNewPath("");
                  setNewMethod("get");
                  setAddError(null);
                }}
              >
                Cancel
              </Button>
              <Button type="button" onClick={handleAddOperation}>
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
          aria-labelledby="delete-operation-title"
          aria-describedby="delete-operation-description"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        >
          <div className="bg-background p-6 rounded-lg shadow-lg w-full max-w-md">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-destructive flex-shrink-0" />
              <div>
                <h3 id="delete-operation-title" className="text-lg font-semibold">
                  Are you sure?
                </h3>
                <p id="delete-operation-description" className="mt-1 text-sm text-muted-foreground">
                  This will delete the{" "}
                  <strong>
                    {showDeleteDialog.method.toUpperCase()} {showDeleteDialog.path}
                  </strong>{" "}
                  operation. This action cannot be undone.
                </p>
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
                onClick={() =>
                  handleDeleteOperation(showDeleteDialog.path, showDeleteDialog.method)
                }
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

export default OperationsTab;
