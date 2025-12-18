/**
 * FieldEditor Component
 * Table-based editor for schema properties/fields
 */

import React, { useCallback, useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProfileGate } from "@/components/forms/ProfileGate";
import { useFormState } from "@/providers/FormStateProvider";
import { Button } from "@/components/ui/button";

/** Field type options */
const FIELD_TYPES = [
  { value: "string", label: "string" },
  { value: "integer", label: "integer" },
  { value: "number", label: "number" },
  { value: "boolean", label: "boolean" },
  { value: "object", label: "object" },
  { value: "array", label: "array" },
  { value: "$ref", label: "$ref" },
];

interface SchemaProperty {
  type?: string;
  $ref?: string;
  description?: string;
  format?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  pattern?: string;
  enum?: string[];
  items?: { type?: string; $ref?: string };
  [key: string]: unknown;
}

interface Schema {
  type?: string;
  description?: string;
  properties?: Record<string, SchemaProperty>;
  required?: string[];
  [key: string]: unknown;
}

export interface FieldEditorProps {
  /** Model/schema name */
  modelName: string;
  /** Schema object to edit */
  schema: Schema;
  /** Callback when schema changes */
  onSchemaChange: (schema: Schema) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get display type for a property
 */
function getPropertyType(prop: SchemaProperty): string {
  if (prop.$ref) return "$ref";
  return prop.type || "string";
}

/**
 * Get available schema references from OAS
 */
function getSchemaRefs(oasData: Record<string, unknown>): string[] {
  const schemas = (oasData.components as Record<string, unknown>)?.schemas as Record<string, unknown> | undefined;
  if (!schemas) return [];
  return Object.keys(schemas).map((name) => `#/components/schemas/${name}`);
}

/**
 * Extract schema name from $ref
 */
function getRefName(ref: string): string {
  return ref.split("/").pop() || ref;
}

/**
 * Format constraints for display
 */
function formatConstraints(prop: SchemaProperty): string[] {
  const constraints: string[] = [];

  if (prop.format) {
    constraints.push(prop.format);
  }
  if (prop.minLength !== undefined) {
    constraints.push(`min: ${prop.minLength}`);
  }
  if (prop.maxLength !== undefined) {
    constraints.push(`max: ${prop.maxLength}`);
  }
  if (prop.minimum !== undefined) {
    constraints.push(`min: ${prop.minimum}`);
  }
  if (prop.maximum !== undefined) {
    constraints.push(`max: ${prop.maximum}`);
  }
  if (prop.pattern) {
    constraints.push(`pattern: ${prop.pattern}`);
  }
  if (prop.enum && prop.enum.length > 0) {
    constraints.push(`enum: ${prop.enum.join(", ")}`);
  }

  return constraints;
}

/**
 * FieldEditor component for editing schema properties.
 */
export function FieldEditor({
  modelName,
  schema,
  onSchemaChange,
  className,
}: FieldEditorProps) {
  const { state } = useFormState();
  const { oasData, profile } = state;

  const properties = schema.properties || {};
  const required = schema.required || [];
  const fieldNames = Object.keys(properties);
  const schemaRefs = useMemo(() => getSchemaRefs(oasData), [oasData]);

  // Handle adding a new field
  const handleAddField = useCallback(() => {
    // Generate unique field name
    let newName = "newField";
    let counter = 1;
    while (properties[newName]) {
      newName = `newField${counter}`;
      counter++;
    }

    const newSchema: Schema = {
      ...schema,
      properties: {
        ...properties,
        [newName]: { type: "string", description: "" },
      },
    };

    onSchemaChange(newSchema);
  }, [schema, properties, onSchemaChange]);

  // Handle removing a field
  const handleRemoveField = useCallback(
    (fieldName: string) => {
      const newProperties = { ...properties };
      delete newProperties[fieldName];

      const newRequired = required.filter((r) => r !== fieldName);

      const newSchema: Schema = {
        ...schema,
        properties: newProperties,
        required: newRequired,
      };

      onSchemaChange(newSchema);
    },
    [schema, properties, required, onSchemaChange]
  );

  // Handle renaming a field
  const handleRenameField = useCallback(
    (oldName: string, newName: string) => {
      if (!newName.trim() || oldName === newName) return;
      if (properties[newName]) return; // Name already exists

      const prop = properties[oldName];
      const newProperties: Record<string, SchemaProperty> = {};

      // Preserve order by rebuilding the object
      for (const key of Object.keys(properties)) {
        if (key === oldName) {
          newProperties[newName] = prop;
        } else {
          newProperties[key] = properties[key];
        }
      }

      // Update required array if needed
      const newRequired = required.map((r) => (r === oldName ? newName : r));

      const newSchema: Schema = {
        ...schema,
        properties: newProperties,
        required: newRequired,
      };

      onSchemaChange(newSchema);
    },
    [schema, properties, required, onSchemaChange]
  );

  // Handle changing field type
  const handleTypeChange = useCallback(
    (fieldName: string, newType: string) => {
      const prop = properties[fieldName];
      let newProp: SchemaProperty;

      if (newType === "$ref") {
        newProp = {
          $ref: schemaRefs[0] || "#/components/schemas/Unknown",
          description: prop.description,
        };
      } else {
        newProp = {
          type: newType,
          description: prop.description,
        };

        // Preserve format for integer/number
        if ((newType === "integer" || newType === "number") && prop.format) {
          newProp.format = prop.format;
        }

        // Add items for array type
        if (newType === "array") {
          newProp.items = { type: "string" };
        }
      }

      const newSchema: Schema = {
        ...schema,
        properties: {
          ...properties,
          [fieldName]: newProp,
        },
      };

      onSchemaChange(newSchema);
    },
    [schema, properties, schemaRefs, onSchemaChange]
  );

  // Handle changing field description
  const handleDescriptionChange = useCallback(
    (fieldName: string, description: string) => {
      const newSchema: Schema = {
        ...schema,
        properties: {
          ...properties,
          [fieldName]: {
            ...properties[fieldName],
            description,
          },
        },
      };

      onSchemaChange(newSchema);
    },
    [schema, properties, onSchemaChange]
  );

  // Handle toggling required status
  const handleRequiredToggle = useCallback(
    (fieldName: string) => {
      const isRequired = required.includes(fieldName);
      const newRequired = isRequired
        ? required.filter((r) => r !== fieldName)
        : [...required, fieldName];

      const newSchema: Schema = {
        ...schema,
        required: newRequired,
      };

      onSchemaChange(newSchema);
    },
    [schema, required, onSchemaChange]
  );

  // Handle changing $ref
  const handleRefChange = useCallback(
    (fieldName: string, newRef: string) => {
      const prop = properties[fieldName];
      const newSchema: Schema = {
        ...schema,
        properties: {
          ...properties,
          [fieldName]: {
            ...prop,
            $ref: newRef,
          },
        },
      };

      onSchemaChange(newSchema);
    },
    [schema, properties, onSchemaChange]
  );

  const showConstraints = profile !== "Basic";

  return (
    <div
      data-testid="field-editor"
      className={cn("space-y-4", className)}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Fields</h4>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddField}
          aria-label="Add field"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Field
        </Button>
      </div>

      {/* Field table */}
      {fieldNames.length === 0 ? (
        <div className="text-center py-6 border border-dashed rounded-md">
          <p className="text-sm text-muted-foreground">No fields defined yet.</p>
          <p className="text-sm text-muted-foreground">Add a field to define the model structure.</p>
        </div>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left font-medium px-3 py-2">Name</th>
                <th className="text-left font-medium px-3 py-2">Type</th>
                <th className="text-center font-medium px-3 py-2">Required</th>
                <th className="text-left font-medium px-3 py-2">Description</th>
                {showConstraints && (
                  <th className="text-left font-medium px-3 py-2">Constraints</th>
                )}
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {fieldNames.map((fieldName) => {
                const prop = properties[fieldName];
                const propType = getPropertyType(prop);
                const isRequired = required.includes(fieldName);
                const constraints = formatConstraints(prop);

                return (
                  <tr
                    key={fieldName}
                    data-testid={`field-row-${fieldName}`}
                    className="border-t"
                  >
                    {/* Name */}
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={fieldName}
                        onChange={(e) => handleRenameField(fieldName, e.target.value)}
                        aria-label="Field name"
                        className="w-full h-8 px-2 rounded border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </td>

                    {/* Type */}
                    <td className="px-3 py-2">
                      <select
                        value={propType}
                        onChange={(e) => handleTypeChange(fieldName, e.target.value)}
                        aria-label="Type"
                        className="w-full h-8 px-2 rounded border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {FIELD_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>

                      {/* Show ref selector or array items type */}
                      {propType === "$ref" && (
                        <select
                          value={prop.$ref || ""}
                          onChange={(e) => handleRefChange(fieldName, e.target.value)}
                          aria-label="Reference"
                          className="mt-1 w-full h-8 px-2 rounded border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {schemaRefs.map((ref) => (
                            <option key={ref} value={ref}>
                              {getRefName(ref)}
                            </option>
                          ))}
                        </select>
                      )}

                      {propType === "array" && prop.items && (
                        <span className="text-xs text-muted-foreground ml-1">
                          [{prop.items.type || prop.items.$ref ? getRefName(prop.items.$ref || "") : ""}]
                        </span>
                      )}
                    </td>

                    {/* Required */}
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={isRequired}
                        onChange={() => handleRequiredToggle(fieldName)}
                        aria-label="Required"
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </td>

                    {/* Description */}
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={prop.description || ""}
                        onChange={(e) => handleDescriptionChange(fieldName, e.target.value)}
                        aria-label="Description"
                        placeholder="Field description..."
                        className="w-full h-8 px-2 rounded border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
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
                        onClick={() => handleRemoveField(fieldName)}
                        aria-label="Remove field"
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

export default FieldEditor;
