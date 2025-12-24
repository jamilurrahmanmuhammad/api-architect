/**
 * Component Tests for FieldEditor
 * Tests schema field editor with type selection, required checkbox, constraints
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReactNode } from "react";
import { FieldEditor } from "../../../../src/components/forms/tabs/FieldEditor";
import { FormStateProvider } from "../../../../src/providers/FormStateProvider";
import { initialFormState, FormState, emptyOas } from "../../../../src/types/formState";

/**
 * Sample schema with properties for testing
 */
const sampleSchema = {
  type: "object",
  description: "A pet in the store",
  properties: {
    id: { type: "integer", format: "int64", description: "Unique identifier" },
    name: { type: "string", description: "Pet name", minLength: 1, maxLength: 100 },
    status: {
      type: "string",
      description: "Pet status",
      enum: ["available", "pending", "sold"],
    },
    tags: { type: "array", items: { type: "string" }, description: "Pet tags" },
    category: { $ref: "#/components/schemas/Category" },
  },
  required: ["id", "name"],
};

/**
 * Helper to render FieldEditor within FormStateProvider
 */
function renderWithProvider(
  props: {
    modelName?: string;
    schema?: typeof sampleSchema;
    onSchemaChange?: (schema: any) => void;
  } = {},
  initialState: Partial<FormState> = {}
) {
  const state: FormState = {
    ...initialFormState,
    ...initialState,
  };

  const defaultProps = {
    modelName: "Pet",
    schema: sampleSchema,
    onSchemaChange: vi.fn(),
    ...props,
  };

  return render(
    <FormStateProvider initialState={state}>
      <FieldEditor {...defaultProps} />
    </FormStateProvider>
  );
}

describe("FieldEditor", () => {
  describe("Field Table Display", () => {
    it("should render field table", () => {
      renderWithProvider();

      expect(screen.getByRole("table")).toBeInTheDocument();
    });

    it("should display field names in table", () => {
      renderWithProvider();

      // Field names are in editable inputs
      expect(screen.getByDisplayValue("id")).toBeInTheDocument();
      expect(screen.getByDisplayValue("name")).toBeInTheDocument();
      expect(screen.getByDisplayValue("status")).toBeInTheDocument();
      expect(screen.getByDisplayValue("tags")).toBeInTheDocument();
      expect(screen.getByDisplayValue("category")).toBeInTheDocument();
    });

    it("should display field types", () => {
      renderWithProvider();

      // Types are shown in select dropdowns (selected option)
      const typeSelects = screen.getAllByRole("combobox", { name: /type/i });
      const selectedTypes = typeSelects.map((s) => (s as HTMLSelectElement).value);

      expect(selectedTypes).toContain("integer");
      expect(selectedTypes).toContain("string");
      expect(selectedTypes).toContain("array");
      expect(selectedTypes).toContain("$ref");
    });

    it("should display field descriptions", () => {
      renderWithProvider();

      // Descriptions are in editable inputs
      expect(screen.getByDisplayValue("Unique identifier")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Pet name")).toBeInTheDocument();
    });

    it("should show required indicator for required fields", () => {
      renderWithProvider();

      // id and name are required
      const idRow = screen.getByTestId("field-row-id");
      const nameRow = screen.getByTestId("field-row-name");
      const statusRow = screen.getByTestId("field-row-status");

      expect(within(idRow).getByRole("checkbox", { name: /required/i })).toBeChecked();
      expect(within(nameRow).getByRole("checkbox", { name: /required/i })).toBeChecked();
      expect(within(statusRow).getByRole("checkbox", { name: /required/i })).not.toBeChecked();
    });

    it("should show empty state when no properties", () => {
      renderWithProvider({
        schema: { type: "object", properties: {} },
      });

      expect(screen.getByText(/no fields defined/i)).toBeInTheDocument();
    });

    it("should display table headers", () => {
      renderWithProvider();

      expect(screen.getByText("Name")).toBeInTheDocument();
      expect(screen.getByText("Type")).toBeInTheDocument();
      expect(screen.getByText("Required")).toBeInTheDocument();
      expect(screen.getByText("Description")).toBeInTheDocument();
    });
  });

  describe("Field Type Dropdown", () => {
    it("should render type dropdown for each field", () => {
      renderWithProvider();

      const typeSelects = screen.getAllByRole("combobox", { name: /type/i });
      expect(typeSelects.length).toBeGreaterThan(0);
    });

    it("should offer common types in dropdown", () => {
      renderWithProvider();

      const typeSelect = screen.getAllByRole("combobox", { name: /type/i })[0];
      const options = within(typeSelect).getAllByRole("option");
      const values = options.map((o) => o.getAttribute("value"));

      expect(values).toContain("string");
      expect(values).toContain("integer");
      expect(values).toContain("number");
      expect(values).toContain("boolean");
      expect(values).toContain("object");
      expect(values).toContain("array");
    });

    it("should offer $ref type option", () => {
      renderWithProvider();

      const typeSelect = screen.getAllByRole("combobox", { name: /type/i })[0];
      const options = within(typeSelect).getAllByRole("option");
      const values = options.map((o) => o.getAttribute("value"));

      expect(values).toContain("$ref");
    });

    it("should change field type when dropdown changed", async () => {
      const onSchemaChange = vi.fn();
      renderWithProvider({ onSchemaChange });

      const idRow = screen.getByTestId("field-row-id");
      const typeSelect = within(idRow).getByRole("combobox", { name: /type/i });

      fireEvent.change(typeSelect, { target: { value: "string" } });

      expect(onSchemaChange).toHaveBeenCalled();
      const newSchema = onSchemaChange.mock.calls[0][0];
      expect(newSchema.properties.id.type).toBe("string");
    });
  });

  describe("Required Checkbox", () => {
    it("should render required checkbox for each field", () => {
      renderWithProvider();

      const checkboxes = screen.getAllByRole("checkbox", { name: /required/i });
      expect(checkboxes.length).toBeGreaterThan(0);
    });

    it("should toggle required status when checkbox clicked", async () => {
      const onSchemaChange = vi.fn();
      renderWithProvider({ onSchemaChange });

      const statusRow = screen.getByTestId("field-row-status");
      const checkbox = within(statusRow).getByRole("checkbox", { name: /required/i });

      // status is not required initially
      expect(checkbox).not.toBeChecked();

      await userEvent.click(checkbox);

      expect(onSchemaChange).toHaveBeenCalled();
      const newSchema = onSchemaChange.mock.calls[0][0];
      expect(newSchema.required).toContain("status");
    });

    it("should remove from required when unchecking", async () => {
      const onSchemaChange = vi.fn();
      renderWithProvider({ onSchemaChange });

      const idRow = screen.getByTestId("field-row-id");
      const checkbox = within(idRow).getByRole("checkbox", { name: /required/i });

      // id is required initially
      expect(checkbox).toBeChecked();

      await userEvent.click(checkbox);

      expect(onSchemaChange).toHaveBeenCalled();
      const newSchema = onSchemaChange.mock.calls[0][0];
      expect(newSchema.required).not.toContain("id");
    });
  });

  describe("Add/Remove Fields", () => {
    it("should render add field button", () => {
      renderWithProvider();

      expect(screen.getByRole("button", { name: /add field/i })).toBeInTheDocument();
    });

    it("should add new field when add button clicked", async () => {
      const onSchemaChange = vi.fn();
      renderWithProvider({ onSchemaChange });

      const addButton = screen.getByRole("button", { name: /add field/i });
      await userEvent.click(addButton);

      expect(onSchemaChange).toHaveBeenCalled();
      const newSchema = onSchemaChange.mock.calls[0][0];
      expect(Object.keys(newSchema.properties).length).toBe(6); // 5 + 1 new
    });

    it("should render remove button for each field", () => {
      renderWithProvider();

      const removeButtons = screen.getAllByRole("button", { name: /remove field/i });
      expect(removeButtons.length).toBe(5); // One for each field
    });

    it("should remove field when remove button clicked", async () => {
      const onSchemaChange = vi.fn();
      renderWithProvider({ onSchemaChange });

      const statusRow = screen.getByTestId("field-row-status");
      const removeButton = within(statusRow).getByRole("button", { name: /remove field/i });

      await userEvent.click(removeButton);

      expect(onSchemaChange).toHaveBeenCalled();
      const newSchema = onSchemaChange.mock.calls[0][0];
      expect(newSchema.properties.status).toBeUndefined();
    });

    it("should also remove from required when deleting required field", async () => {
      const onSchemaChange = vi.fn();
      renderWithProvider({ onSchemaChange });

      const idRow = screen.getByTestId("field-row-id");
      const removeButton = within(idRow).getByRole("button", { name: /remove field/i });

      await userEvent.click(removeButton);

      expect(onSchemaChange).toHaveBeenCalled();
      const newSchema = onSchemaChange.mock.calls[0][0];
      expect(newSchema.required).not.toContain("id");
    });
  });

  describe("Field Name Editing", () => {
    it("should allow editing field name", async () => {
      const onSchemaChange = vi.fn();
      renderWithProvider({ onSchemaChange });

      const idRow = screen.getByTestId("field-row-id");
      const nameInput = within(idRow).getByRole("textbox", { name: /field name/i });

      fireEvent.change(nameInput, { target: { value: "identifier" } });

      expect(onSchemaChange).toHaveBeenCalled();
      const newSchema = onSchemaChange.mock.calls[0][0];
      expect(newSchema.properties.identifier).toBeDefined();
      expect(newSchema.properties.id).toBeUndefined();
    });

    it("should update required array when renaming required field", async () => {
      const onSchemaChange = vi.fn();
      renderWithProvider({ onSchemaChange });

      const idRow = screen.getByTestId("field-row-id");
      const nameInput = within(idRow).getByRole("textbox", { name: /field name/i });

      fireEvent.change(nameInput, { target: { value: "identifier" } });

      const newSchema = onSchemaChange.mock.calls[0][0];
      expect(newSchema.required).toContain("identifier");
      expect(newSchema.required).not.toContain("id");
    });
  });

  describe("Field Description Editing", () => {
    it("should allow editing field description", async () => {
      const onSchemaChange = vi.fn();
      renderWithProvider({ onSchemaChange });

      const idRow = screen.getByTestId("field-row-id");
      const descInput = within(idRow).getByRole("textbox", { name: /description/i });

      fireEvent.change(descInput, { target: { value: "New description" } });

      expect(onSchemaChange).toHaveBeenCalled();
      const newSchema = onSchemaChange.mock.calls[0][0];
      expect(newSchema.properties.id.description).toBe("New description");
    });
  });

  describe("Validation Constraints (Advanced Profile)", () => {
    it("should show constraints column in Advanced profile", () => {
      renderWithProvider({}, { profile: "Advanced" });

      expect(screen.getByText("Constraints")).toBeInTheDocument();
    });

    it("should not show constraints column in Basic profile", () => {
      renderWithProvider({}, { profile: "Basic" });

      expect(screen.queryByText("Constraints")).not.toBeInTheDocument();
    });

    it("should display minLength/maxLength for string fields", () => {
      renderWithProvider({}, { profile: "Advanced" });

      const nameRow = screen.getByTestId("field-row-name");
      expect(within(nameRow).getByText(/min.*1/i)).toBeInTheDocument();
      expect(within(nameRow).getByText(/max.*100/i)).toBeInTheDocument();
    });

    it("should display format for fields with format", () => {
      renderWithProvider({}, { profile: "Advanced" });

      const idRow = screen.getByTestId("field-row-id");
      expect(within(idRow).getByText(/int64/i)).toBeInTheDocument();
    });

    it("should display enum values for enum fields", () => {
      renderWithProvider({}, { profile: "Advanced" });

      const statusRow = screen.getByTestId("field-row-status");
      expect(within(statusRow).getByText(/available/i)).toBeInTheDocument();
    });
  });

  describe("Reference Fields", () => {
    it("should show reference path for $ref fields", () => {
      // Provide available schemas so the ref dropdown is populated
      renderWithProvider(
        {},
        {
          oasData: {
            ...emptyOas,
            components: {
              schemas: {
                Pet: sampleSchema,
                Category: { type: "object", properties: {} },
              },
            },
          },
        }
      );

      const categoryRow = screen.getByTestId("field-row-category");
      // The $ref reference is shown in a dropdown with schema name
      const refSelect = within(categoryRow).getByRole("combobox", { name: /reference/i });
      expect(refSelect).toBeInTheDocument();
      expect(within(refSelect).getByText("Category")).toBeInTheDocument();
    });

    it("should allow selecting schema reference", async () => {
      const onSchemaChange = vi.fn();
      renderWithProvider(
        { onSchemaChange },
        {
          oasData: {
            ...emptyOas,
            components: {
              schemas: {
                Pet: sampleSchema,
                Category: { type: "object", properties: {} },
                Tag: { type: "object", properties: {} },
              },
            },
          },
        }
      );

      const categoryRow = screen.getByTestId("field-row-category");
      const refSelect = within(categoryRow).getByRole("combobox", { name: /reference/i });

      fireEvent.change(refSelect, { target: { value: "#/components/schemas/Tag" } });

      expect(onSchemaChange).toHaveBeenCalled();
    });
  });

  describe("Array Item Type", () => {
    it("should show items type for array fields", () => {
      renderWithProvider();

      const tagsRow = screen.getByTestId("field-row-tags");
      expect(within(tagsRow).getByText(/string/i)).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have accessible table structure", () => {
      renderWithProvider();

      expect(screen.getByRole("table")).toBeInTheDocument();
      expect(screen.getAllByRole("row").length).toBeGreaterThan(1);
    });

    it("should have proper labels for inputs", () => {
      renderWithProvider();

      const inputs = screen.getAllByRole("textbox");
      inputs.forEach((input) => {
        expect(input).toHaveAttribute("aria-label");
      });
    });
  });

  describe("Layout", () => {
    it("should render with proper spacing", () => {
      const { container } = renderWithProvider();

      const editor = container.querySelector("[data-testid='field-editor']");
      expect(editor).toHaveClass("space-y-4");
    });
  });
});
