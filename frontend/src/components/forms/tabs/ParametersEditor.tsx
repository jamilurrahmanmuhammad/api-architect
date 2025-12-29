/**
 * ParametersEditor Component
 * Table-based editor for operation parameters
 */

import { useCallback, useMemo } from "react";
import { Plus, Trash2, AlertTriangle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFormState } from "@/providers/FormStateProvider";
import { Button } from "@/components/ui/button";

/** Parameter location options */
const PARAM_LOCATIONS = [
  { value: "query", label: "query" },
  { value: "path", label: "path" },
  { value: "header", label: "header" },
  { value: "cookie", label: "cookie" },
];

/** Parameter type options */
const PARAM_TYPES = [
  { value: "string", label: "string" },
  { value: "integer", label: "integer" },
  { value: "number", label: "number" },
  { value: "boolean", label: "boolean" },
  { value: "array", label: "array" },
];

/** Example suggestions by type and format */
const EXAMPLE_SUGGESTIONS: Record<string, Record<string, string>> = {
  string: {
    default: "example-string",
    uuid: "550e8400-e29b-41d4-a716-446655440000",
    email: "user@example.com",
    uri: "https://api.example.com/resource",
    url: "https://www.example.com",
    hostname: "api.example.com",
    ipv4: "192.168.1.1",
    ipv6: "2001:0db8:85a3:0000:0000:8a2e:0370:7334",
    "date-time": "2025-01-15T09:30:00Z",
    date: "2025-01-15",
    time: "09:30:00",
    password: "********",
    byte: "U3dhZ2dlciByb2Nrcw==",
    binary: "<binary data>",
  },
  integer: {
    default: "42",
    int32: "2147483647",
    int64: "9223372036854775807",
  },
  number: {
    default: "3.14",
    float: "3.14159",
    double: "3.141592653589793",
  },
  boolean: {
    default: "true",
  },
  array: {
    default: "[item1, item2]",
  },
};

/**
 * Get example suggestion for a parameter based on type and format
 */
function getExampleSuggestion(schema?: ParameterSchema): string {
  if (!schema) return "";

  const type = schema.type || "string";
  const format = schema.format || "default";

  // If enum, suggest first value
  if (schema.enum && schema.enum.length > 0) {
    return schema.enum[0];
  }

  // Check for format-specific example
  const typeExamples = EXAMPLE_SUGGESTIONS[type];
  if (typeExamples) {
    return typeExamples[format] || typeExamples.default || "";
  }

  return "";
}

interface ParameterSchema {
  type?: string;
  format?: string;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  items?: { type?: string };
  [key: string]: unknown;
}

interface Parameter {
  name: string;
  in: "query" | "path" | "header" | "cookie";
  required?: boolean;
  description?: string;
  example?: string;
  schema?: ParameterSchema;
  [key: string]: unknown;
}

export interface ParametersEditorProps {
  /** Array of parameters */
  parameters: Parameter[];
  /** Callback when parameters change */
  onParametersChange: (params: Parameter[]) => void;
  /** Path template to extract path params (e.g., /pets/{petId}) */
  pathTemplate?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Extract path parameter names from a path template
 */
function extractPathParams(pathTemplate: string): string[] {
  const matches = pathTemplate.match(/\{([^}]+)\}/g) || [];
  return matches.map((m) => m.slice(1, -1));
}

/**
 * Format constraints for display
 */
function formatConstraints(schema?: ParameterSchema): string[] {
  if (!schema) return [];

  const constraints: string[] = [];

  if (schema.format) {
    constraints.push(schema.format);
  }
  if (schema.enum && schema.enum.length > 0) {
    constraints.push(`enum: ${schema.enum.join(", ")}`);
  }
  if (schema.minimum !== undefined) {
    constraints.push(`min: ${schema.minimum}`);
  }
  if (schema.maximum !== undefined) {
    constraints.push(`max: ${schema.maximum}`);
  }
  if (schema.minLength !== undefined) {
    constraints.push(`minLen: ${schema.minLength}`);
  }
  if (schema.maxLength !== undefined) {
    constraints.push(`maxLen: ${schema.maxLength}`);
  }
  if (schema.pattern) {
    constraints.push(`pattern: ${schema.pattern}`);
  }

  return constraints;
}

/**
 * ParametersEditor component for editing operation parameters.
 */
export function ParametersEditor({
  parameters,
  onParametersChange,
  pathTemplate = "",
  className,
}: ParametersEditorProps) {
  const { state } = useFormState();
  const { profile } = state;

  // Extract path params from template
  const pathParams = useMemo(
    () => extractPathParams(pathTemplate),
    [pathTemplate]
  );

  // Check for missing path parameters
  const missingPathParams = useMemo(() => {
    const definedPathParams = parameters
      .filter((p) => p.in === "path")
      .map((p) => p.name);
    return pathParams.filter((pp) => !definedPathParams.includes(pp));
  }, [parameters, pathParams]);

  // Handle adding a new parameter
  const handleAddParameter = useCallback(() => {
    const newParam: Parameter = {
      name: "newParam",
      in: "query",
      required: false,
      description: "",
      example: "",
      schema: { type: "string" },
    };

    onParametersChange([...parameters, newParam]);
  }, [parameters, onParametersChange]);

  // Handle applying example suggestion
  const handleApplyExampleSuggestion = useCallback(
    (index: number) => {
      const param = parameters[index];
      const suggestion = getExampleSuggestion(param.schema);
      if (suggestion) {
        const newParams = parameters.map((p, i) =>
          i === index ? { ...p, example: suggestion } : p
        );
        onParametersChange(newParams);
      }
    },
    [parameters, onParametersChange]
  );

  // Handle removing a parameter
  const handleRemoveParameter = useCallback(
    (index: number) => {
      const newParams = parameters.filter((_, i) => i !== index);
      onParametersChange(newParams);
    },
    [parameters, onParametersChange]
  );

  // Handle updating a parameter field
  const handleUpdateParameter = useCallback(
    (index: number, field: string, value: unknown) => {
      const newParams = parameters.map((param, i) => {
        if (i !== index) return param;

        if (field === "type") {
          // Update schema type
          return {
            ...param,
            schema: { ...param.schema, type: value as string },
          };
        }

        return { ...param, [field]: value };
      });

      onParametersChange(newParams);
    },
    [parameters, onParametersChange]
  );

  const showConstraints = profile !== "Basic";

  return (
    <div
      data-testid="parameters-editor"
      className={cn("space-y-4", className)}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Parameters</h4>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddParameter}
          aria-label="Add parameter"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Parameter
        </Button>
      </div>

      {/* Missing path params warning */}
      {missingPathParams.length > 0 && (
        <div className="flex items-center gap-2 p-2 rounded bg-yellow-50 text-yellow-800 text-sm">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>
            Missing path parameter{missingPathParams.length > 1 ? "s" : ""}:{" "}
            <strong>{missingPathParams.join(", ")}</strong>
          </span>
        </div>
      )}

      {/* Parameter table */}
      {parameters.length === 0 ? (
        <div className="text-center py-6 border border-dashed rounded-md">
          <p className="text-sm text-muted-foreground">No parameters defined yet.</p>
          <p className="text-sm text-muted-foreground">
            Add parameters to define inputs for this operation.
          </p>
        </div>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left font-medium px-3 py-2">Name</th>
                <th className="text-left font-medium px-3 py-2">In</th>
                <th className="text-left font-medium px-3 py-2">Type</th>
                <th className="text-center font-medium px-3 py-2">Required</th>
                <th className="text-left font-medium px-3 py-2">Description</th>
                <th className="text-left font-medium px-3 py-2">Example</th>
                {showConstraints && (
                  <th className="text-left font-medium px-3 py-2">Constraints</th>
                )}
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {parameters.map((param, index) => {
                const isPathParam = param.in === "path";
                const isInPathTemplate = pathParams.includes(param.name);
                const constraints = formatConstraints(param.schema);

                return (
                  <tr
                    key={`${param.name}-${index}`}
                    data-testid={`param-row-${param.name}`}
                    className="border-t"
                  >
                    {/* Name */}
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={param.name}
                          onChange={(e) =>
                            handleUpdateParameter(index, "name", e.target.value)
                          }
                          aria-label="Parameter name"
                          className="w-full h-8 px-2 rounded border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                        {isPathParam && isInPathTemplate && (
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            path param
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Location (in) */}
                    <td className="px-3 py-2">
                      <select
                        value={param.in}
                        onChange={(e) =>
                          handleUpdateParameter(index, "in", e.target.value)
                        }
                        aria-label="Location"
                        className="w-full h-8 px-2 rounded border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {PARAM_LOCATIONS.map((loc) => (
                          <option key={loc.value} value={loc.value}>
                            {loc.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Type */}
                    <td className="px-3 py-2">
                      <select
                        value={param.schema?.type || "string"}
                        onChange={(e) =>
                          handleUpdateParameter(index, "type", e.target.value)
                        }
                        aria-label="Type"
                        className="w-full h-8 px-2 rounded border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {PARAM_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Required */}
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={param.required || false}
                        onChange={(e) =>
                          handleUpdateParameter(index, "required", e.target.checked)
                        }
                        aria-label="Required"
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </td>

                    {/* Description */}
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={param.description || ""}
                        onChange={(e) =>
                          handleUpdateParameter(index, "description", e.target.value)
                        }
                        aria-label="Description"
                        placeholder="Parameter description..."
                        className="w-full h-8 px-2 rounded border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </td>

                    {/* Example with suggestion */}
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={param.example || ""}
                          onChange={(e) =>
                            handleUpdateParameter(index, "example", e.target.value)
                          }
                          aria-label="Example"
                          placeholder={getExampleSuggestion(param.schema) || "Example value..."}
                          className="w-full h-8 px-2 rounded border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                        <button
                          type="button"
                          onClick={() => handleApplyExampleSuggestion(index)}
                          aria-label="Suggest example"
                          title="Apply suggested example"
                          className="p-1 text-muted-foreground hover:text-primary flex-shrink-0"
                        >
                          <Sparkles className="h-4 w-4" />
                        </button>
                      </div>
                    </td>

                    {/* Constraints (Advanced+) */}
                    {showConstraints && (
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {constraints.map((c, i) => (
                            <span
                              key={i}
                              className="text-xs px-1.5 py-0.5 rounded bg-muted"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      </td>
                    )}

                    {/* Remove button */}
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => handleRemoveParameter(index)}
                        aria-label="Remove parameter"
                        className="p-1 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ParametersEditor;
