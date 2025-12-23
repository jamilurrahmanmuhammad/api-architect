/**
 * RequestResponseEditor Component
 * Editor for operation request body and responses
 */

import React, { useCallback, useMemo, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFormState } from "@/providers/FormStateProvider";
import { Button } from "@/components/ui/button";

/** Common HTTP status codes */
const STATUS_CODES = [
  { value: "200", label: "200 - OK" },
  { value: "201", label: "201 - Created" },
  { value: "204", label: "204 - No Content" },
  { value: "400", label: "400 - Bad Request" },
  { value: "401", label: "401 - Unauthorized" },
  { value: "403", label: "403 - Forbidden" },
  { value: "404", label: "404 - Not Found" },
  { value: "409", label: "409 - Conflict" },
  { value: "422", label: "422 - Unprocessable Entity" },
  { value: "500", label: "500 - Internal Server Error" },
];

/** Status code color mapping */
function getStatusCodeColor(code: string): string {
  const codeNum = parseInt(code, 10);
  if (codeNum >= 200 && codeNum < 300) return "bg-green-100 text-green-800";
  if (codeNum >= 300 && codeNum < 400) return "bg-blue-100 text-blue-800";
  if (codeNum >= 400 && codeNum < 500) return "bg-yellow-100 text-yellow-800";
  if (codeNum >= 500) return "bg-red-100 text-red-800";
  return "bg-gray-100 text-gray-800";
}

interface RequestBody {
  description?: string;
  required?: boolean;
  content?: {
    "application/json"?: {
      schema?: {
        $ref?: string;
        type?: string;
        items?: { $ref?: string };
      };
    };
  };
  [key: string]: unknown;
}

interface Response {
  description?: string;
  content?: {
    "application/json"?: {
      schema?: {
        $ref?: string;
        type?: string;
        items?: { $ref?: string };
      };
    };
  };
  [key: string]: unknown;
}

export interface RequestResponseEditorProps {
  /** Request body object */
  requestBody: RequestBody | null;
  /** Responses object keyed by status code */
  responses: Record<string, Response>;
  /** Callback when request body changes */
  onRequestBodyChange: (body: RequestBody | null) => void;
  /** Callback when responses change */
  onResponsesChange: (responses: Record<string, Response>) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Extract schema name from $ref
 */
function getSchemaNameFromRef(ref: string): string {
  const match = ref.match(/#\/components\/schemas\/(.+)$/);
  return match ? match[1] : "";
}

/**
 * Get current schema name from request body or response
 */
function getCurrentSchema(obj: RequestBody | Response | null): string {
  if (!obj?.content?.["application/json"]?.schema) return "none";

  const schema = obj.content["application/json"].schema;
  if (schema.$ref) {
    return getSchemaNameFromRef(schema.$ref);
  }
  if (schema.type === "array" && schema.items?.$ref) {
    return getSchemaNameFromRef(schema.items.$ref);
  }
  return "none";
}

/**
 * Check if schema is array type
 */
function isArraySchema(obj: RequestBody | Response | null): boolean {
  if (!obj?.content?.["application/json"]?.schema) return false;
  return obj.content["application/json"].schema.type === "array";
}

/**
 * RequestResponseEditor component for editing request body and responses.
 */
export function RequestResponseEditor({
  requestBody,
  responses,
  onRequestBodyChange,
  onResponsesChange,
  className,
}: RequestResponseEditorProps) {
  const { state } = useFormState();

  // Get available schemas from OAS
  const availableSchemas = useMemo(() => {
    const schemas = state.oasData?.components?.schemas || {};
    return Object.keys(schemas).sort();
  }, [state.oasData]);

  // Dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newCode, setNewCode] = useState("201");
  const [newDescription, setNewDescription] = useState("");
  const [newSchema, setNewSchema] = useState("none");
  const [addError, setAddError] = useState<string | null>(null);

  // Handle request body schema change
  const handleRequestSchemaChange = useCallback(
    (schemaName: string) => {
      if (schemaName === "none") {
        onRequestBodyChange(null);
        return;
      }

      const newBody: RequestBody = {
        ...(requestBody || {}),
        description: requestBody?.description || "",
        required: requestBody?.required ?? true,
        content: {
          "application/json": {
            schema: {
              $ref: `#/components/schemas/${schemaName}`,
            },
          },
        },
      };
      onRequestBodyChange(newBody);
    },
    [requestBody, onRequestBodyChange]
  );

  // Handle request body required toggle
  const handleRequestRequiredChange = useCallback(
    (required: boolean) => {
      if (!requestBody) return;
      onRequestBodyChange({
        ...requestBody,
        required,
      });
    },
    [requestBody, onRequestBodyChange]
  );

  // Handle request body description change
  const handleRequestDescriptionChange = useCallback(
    (description: string) => {
      if (!requestBody) return;
      onRequestBodyChange({
        ...requestBody,
        description,
      });
    },
    [requestBody, onRequestBodyChange]
  );

  // Handle response schema change
  const handleResponseSchemaChange = useCallback(
    (code: string, schemaName: string, isArray: boolean) => {
      const response = responses[code];
      if (!response) return;

      let newResponse: Response;

      if (schemaName === "none") {
        // Remove content entirely
        const { content, ...rest } = response;
        newResponse = rest;
      } else {
        // Set schema
        const schema = isArray
          ? { type: "array" as const, items: { $ref: `#/components/schemas/${schemaName}` } }
          : { $ref: `#/components/schemas/${schemaName}` };

        newResponse = {
          ...response,
          content: {
            "application/json": {
              schema,
            },
          },
        };
      }

      onResponsesChange({
        ...responses,
        [code]: newResponse,
      });
    },
    [responses, onResponsesChange]
  );

  // Handle response array toggle
  const handleResponseArrayToggle = useCallback(
    (code: string) => {
      const response = responses[code];
      if (!response?.content?.["application/json"]?.schema) return;

      const currentSchema = getCurrentSchema(response);
      const currentIsArray = isArraySchema(response);

      handleResponseSchemaChange(code, currentSchema, !currentIsArray);
    },
    [responses, handleResponseSchemaChange]
  );

  // Handle response description change
  const handleResponseDescriptionChange = useCallback(
    (code: string, description: string) => {
      const response = responses[code];
      if (!response) return;

      onResponsesChange({
        ...responses,
        [code]: {
          ...response,
          description,
        },
      });
    },
    [responses, onResponsesChange]
  );

  // Handle remove response
  const handleRemoveResponse = useCallback(
    (code: string) => {
      const newResponses = { ...responses };
      delete newResponses[code];
      onResponsesChange(newResponses);
    },
    [responses, onResponsesChange]
  );

  // Handle add response
  const handleAddResponse = useCallback(() => {
    setAddError(null);

    if (responses[newCode]) {
      setAddError(`Response ${newCode} already exists`);
      return;
    }

    const newResponse: Response = {
      description: newDescription || "Response description",
    };

    if (newSchema !== "none") {
      newResponse.content = {
        "application/json": {
          schema: {
            $ref: `#/components/schemas/${newSchema}`,
          },
        },
      };
    }

    onResponsesChange({
      ...responses,
      [newCode]: newResponse,
    });

    setShowAddDialog(false);
    setNewCode("201");
    setNewDescription("");
    setNewSchema("none");
  }, [newCode, newDescription, newSchema, responses, onResponsesChange]);

  // Sort response codes
  const sortedCodes = useMemo(() => {
    return Object.keys(responses).sort((a, b) => parseInt(a) - parseInt(b));
  }, [responses]);

  return (
    <div
      data-testid="request-response-editor"
      className={cn("space-y-6", className)}
    >
      {/* Request Body Section */}
      <section>
        <h3 className="text-sm font-semibold mb-3">Request Body</h3>

        {requestBody ? (
          <div className="space-y-3 p-4 border rounded-md">
            {/* Schema selector */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label
                  htmlFor="request-schema"
                  className="block text-xs font-medium text-muted-foreground mb-1"
                >
                  Schema
                </label>
                <select
                  id="request-schema"
                  value={getCurrentSchema(requestBody)}
                  onChange={(e) => handleRequestSchemaChange(e.target.value)}
                  aria-label="Request body schema"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="none">None</option>
                  {availableSchemas.map((schema) => (
                    <option key={schema} value={schema}>
                      {schema}
                    </option>
                  ))}
                </select>
              </div>

              {/* Required checkbox */}
              <div className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  id="request-required"
                  checked={requestBody.required ?? false}
                  onChange={(e) => handleRequestRequiredChange(e.target.checked)}
                  aria-label="Required"
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="request-required" className="text-sm">
                  Required
                </label>
              </div>
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="request-description"
                className="block text-xs font-medium text-muted-foreground mb-1"
              >
                Description
              </label>
              <input
                type="text"
                id="request-description"
                value={requestBody.description || ""}
                onChange={(e) => handleRequestDescriptionChange(e.target.value)}
                aria-label="Request body description"
                placeholder="Describe the request body..."
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
        ) : (
          <div className="text-center py-6 border border-dashed rounded-md">
            <p className="text-sm text-muted-foreground">No request body defined.</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                onRequestBodyChange({
                  description: "",
                  required: true,
                  content: {
                    "application/json": {
                      schema: availableSchemas.length > 0
                        ? { $ref: `#/components/schemas/${availableSchemas[0]}` }
                        : {},
                    },
                  },
                })
              }
              className="mt-2"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Request Body
            </Button>
          </div>
        )}
      </section>

      {/* Responses Section */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Responses</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAddDialog(true)}
            aria-label="Add response"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Response
          </Button>
        </div>

        {sortedCodes.length === 0 ? (
          <div className="text-center py-6 border border-dashed rounded-md">
            <p className="text-sm text-muted-foreground">No responses defined yet.</p>
            <p className="text-xs text-muted-foreground">
              Add responses to define API output formats.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedCodes.map((code) => {
              const response = responses[code];
              const schemaName = getCurrentSchema(response);
              const isArray = isArraySchema(response);

              return (
                <div
                  key={code}
                  data-testid={`response-row-${code}`}
                  className="flex items-start gap-3 p-3 border rounded-md"
                >
                  {/* Status code badge */}
                  <span
                    className={cn(
                      "px-2 py-1 rounded text-xs font-medium",
                      getStatusCodeColor(code)
                    )}
                  >
                    {code}
                  </span>

                  {/* Response details */}
                  <div className="flex-1 space-y-2">
                    {/* Description */}
                    <input
                      type="text"
                      value={response.description || ""}
                      onChange={(e) =>
                        handleResponseDescriptionChange(code, e.target.value)
                      }
                      aria-label="Description"
                      placeholder="Response description..."
                      className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />

                    {/* Schema controls */}
                    <div className="flex items-center gap-3">
                      <select
                        value={schemaName}
                        onChange={(e) =>
                          handleResponseSchemaChange(code, e.target.value, isArray)
                        }
                        aria-label="Schema"
                        className="flex h-8 rounded-md border border-input bg-background px-2 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <option value="none">No schema</option>
                        {availableSchemas.map((schema) => (
                          <option key={schema} value={schema}>
                            {schema}
                          </option>
                        ))}
                      </select>

                      {schemaName !== "none" && (
                        <div className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            id={`array-${code}`}
                            checked={isArray}
                            onChange={() => handleResponseArrayToggle(code)}
                            aria-label="Array"
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <label
                            htmlFor={`array-${code}`}
                            className="text-xs text-muted-foreground"
                          >
                            Array
                          </label>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveResponse(code)}
                    aria-label="Remove response"
                    className="p-1 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Add Response Dialog */}
      {showAddDialog && (
        <div
          role="dialog"
          aria-labelledby="add-response-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        >
          <div className="bg-background p-6 rounded-lg shadow-lg w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 id="add-response-title" className="text-lg font-semibold">
                Add Response
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowAddDialog(false);
                  setAddError(null);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Status code */}
              <div>
                <label
                  htmlFor="new-code"
                  className="block text-sm font-medium mb-1"
                >
                  Status Code
                </label>
                <select
                  id="new-code"
                  value={newCode}
                  onChange={(e) => {
                    setNewCode(e.target.value);
                    setAddError(null);
                  }}
                  aria-label="Status code"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {STATUS_CODES.map((code) => (
                    <option key={code.value} value={code.value}>
                      {code.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="new-description"
                  className="block text-sm font-medium mb-1"
                >
                  Description
                </label>
                <input
                  type="text"
                  id="new-description"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  aria-label="Description"
                  placeholder="Response description..."
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              {/* Schema */}
              <div>
                <label
                  htmlFor="new-schema"
                  className="block text-sm font-medium mb-1"
                >
                  Schema (optional)
                </label>
                <select
                  id="new-schema"
                  value={newSchema}
                  onChange={(e) => setNewSchema(e.target.value)}
                  aria-label="Response schema"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="none">None</option>
                  {availableSchemas.map((schema) => (
                    <option key={schema} value={schema}>
                      {schema}
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
                  setNewCode("201");
                  setNewDescription("");
                  setNewSchema("none");
                  setAddError(null);
                }}
              >
                Cancel
              </Button>
              <Button type="button" onClick={handleAddResponse}>
                Create
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RequestResponseEditor;
