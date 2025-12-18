/**
 * Component Tests for ParametersEditor
 * Tests operation parameters editor with table, add/remove, validation
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReactNode } from "react";
import { ParametersEditor } from "../../../../src/components/forms/tabs/ParametersEditor";
import { FormStateProvider } from "../../../../src/providers/FormStateProvider";
import { initialFormState, FormState, emptyOas } from "../../../../src/types/formState";

/**
 * Sample parameters for testing
 */
const sampleParameters = [
  {
    name: "petId",
    in: "path",
    required: true,
    description: "ID of the pet to retrieve",
    schema: { type: "integer", format: "int64" },
  },
  {
    name: "status",
    in: "query",
    required: false,
    description: "Filter by status",
    schema: { type: "string", enum: ["available", "pending", "sold"] },
  },
  {
    name: "limit",
    in: "query",
    required: false,
    description: "Maximum number of results",
    schema: { type: "integer", minimum: 1, maximum: 100 },
  },
  {
    name: "X-API-Key",
    in: "header",
    required: true,
    description: "API key for authentication",
    schema: { type: "string" },
  },
  {
    name: "session",
    in: "cookie",
    required: false,
    description: "Session cookie",
    schema: { type: "string" },
  },
];

/**
 * Helper to render ParametersEditor within FormStateProvider
 */
function renderWithProvider(
  props: {
    parameters?: typeof sampleParameters;
    onParametersChange?: (params: any[]) => void;
    pathTemplate?: string;
  } = {},
  initialState: Partial<FormState> = {}
) {
  const state: FormState = {
    ...initialFormState,
    ...initialState,
  };

  const defaultProps = {
    parameters: sampleParameters,
    onParametersChange: vi.fn(),
    pathTemplate: "/pets/{petId}",
    ...props,
  };

  return render(
    <FormStateProvider initialState={state}>
      <ParametersEditor {...defaultProps} />
    </FormStateProvider>
  );
}

describe("ParametersEditor", () => {
  describe("Parameter Table Display", () => {
    it("should render parameter table", () => {
      renderWithProvider();

      expect(screen.getByRole("table")).toBeInTheDocument();
    });

    it("should display parameter names", () => {
      renderWithProvider();

      expect(screen.getByDisplayValue("petId")).toBeInTheDocument();
      expect(screen.getByDisplayValue("status")).toBeInTheDocument();
      expect(screen.getByDisplayValue("limit")).toBeInTheDocument();
      expect(screen.getByDisplayValue("X-API-Key")).toBeInTheDocument();
    });

    it("should display parameter locations (in)", () => {
      renderWithProvider();

      // Location selectors should show current values
      const locationSelects = screen.getAllByRole("combobox", { name: /location/i });
      const values = locationSelects.map((s) => (s as HTMLSelectElement).value);

      expect(values).toContain("path");
      expect(values).toContain("query");
      expect(values).toContain("header");
      expect(values).toContain("cookie");
    });

    it("should display parameter types", () => {
      renderWithProvider();

      const typeSelects = screen.getAllByRole("combobox", { name: /type/i });
      const values = typeSelects.map((s) => (s as HTMLSelectElement).value);

      expect(values).toContain("integer");
      expect(values).toContain("string");
    });

    it("should display parameter descriptions", () => {
      renderWithProvider();

      expect(screen.getByDisplayValue("ID of the pet to retrieve")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Filter by status")).toBeInTheDocument();
    });

    it("should show required checkbox for each parameter", () => {
      renderWithProvider();

      const checkboxes = screen.getAllByRole("checkbox", { name: /required/i });
      expect(checkboxes.length).toBe(5);
    });

    it("should mark required parameters as checked", () => {
      renderWithProvider();

      const petIdRow = screen.getByTestId("param-row-petId");
      const statusRow = screen.getByTestId("param-row-status");

      expect(within(petIdRow).getByRole("checkbox", { name: /required/i })).toBeChecked();
      expect(within(statusRow).getByRole("checkbox", { name: /required/i })).not.toBeChecked();
    });

    it("should show empty state when no parameters", () => {
      renderWithProvider({ parameters: [] });

      expect(screen.getByText(/no parameters defined/i)).toBeInTheDocument();
    });

    it("should display table headers", () => {
      renderWithProvider();

      expect(screen.getByText("Name")).toBeInTheDocument();
      expect(screen.getByText("In")).toBeInTheDocument();
      expect(screen.getByText("Type")).toBeInTheDocument();
      expect(screen.getByText("Required")).toBeInTheDocument();
      expect(screen.getByText("Description")).toBeInTheDocument();
    });
  });

  describe("Location Dropdown", () => {
    it("should offer query, path, header, cookie options", () => {
      renderWithProvider();

      const locationSelect = screen.getAllByRole("combobox", { name: /location/i })[0];
      const options = within(locationSelect).getAllByRole("option");
      const values = options.map((o) => o.getAttribute("value"));

      expect(values).toContain("query");
      expect(values).toContain("path");
      expect(values).toContain("header");
      expect(values).toContain("cookie");
    });

    it("should change parameter location when dropdown changed", async () => {
      const onParametersChange = vi.fn();
      renderWithProvider({ onParametersChange });

      const statusRow = screen.getByTestId("param-row-status");
      const locationSelect = within(statusRow).getByRole("combobox", { name: /location/i });

      fireEvent.change(locationSelect, { target: { value: "header" } });

      expect(onParametersChange).toHaveBeenCalled();
      const newParams = onParametersChange.mock.calls[0][0];
      const statusParam = newParams.find((p: any) => p.name === "status");
      expect(statusParam.in).toBe("header");
    });
  });

  describe("Type Dropdown", () => {
    it("should offer common parameter types", () => {
      renderWithProvider();

      const typeSelect = screen.getAllByRole("combobox", { name: /type/i })[0];
      const options = within(typeSelect).getAllByRole("option");
      const values = options.map((o) => o.getAttribute("value"));

      expect(values).toContain("string");
      expect(values).toContain("integer");
      expect(values).toContain("number");
      expect(values).toContain("boolean");
      expect(values).toContain("array");
    });

    it("should change parameter type when dropdown changed", async () => {
      const onParametersChange = vi.fn();
      renderWithProvider({ onParametersChange });

      const petIdRow = screen.getByTestId("param-row-petId");
      const typeSelect = within(petIdRow).getByRole("combobox", { name: /type/i });

      fireEvent.change(typeSelect, { target: { value: "string" } });

      expect(onParametersChange).toHaveBeenCalled();
      const newParams = onParametersChange.mock.calls[0][0];
      const petIdParam = newParams.find((p: any) => p.name === "petId");
      expect(petIdParam.schema.type).toBe("string");
    });
  });

  describe("Required Checkbox", () => {
    it("should toggle required status when checkbox clicked", async () => {
      const onParametersChange = vi.fn();
      renderWithProvider({ onParametersChange });

      const statusRow = screen.getByTestId("param-row-status");
      const checkbox = within(statusRow).getByRole("checkbox", { name: /required/i });

      await userEvent.click(checkbox);

      expect(onParametersChange).toHaveBeenCalled();
      const newParams = onParametersChange.mock.calls[0][0];
      const statusParam = newParams.find((p: any) => p.name === "status");
      expect(statusParam.required).toBe(true);
    });

    it("should uncheck required when clicking checked checkbox", async () => {
      const onParametersChange = vi.fn();
      renderWithProvider({ onParametersChange });

      const apiKeyRow = screen.getByTestId("param-row-X-API-Key");
      const checkbox = within(apiKeyRow).getByRole("checkbox", { name: /required/i });

      await userEvent.click(checkbox);

      expect(onParametersChange).toHaveBeenCalled();
      const newParams = onParametersChange.mock.calls[0][0];
      const apiKeyParam = newParams.find((p: any) => p.name === "X-API-Key");
      expect(apiKeyParam.required).toBe(false);
    });
  });

  describe("Add/Remove Parameters", () => {
    it("should render add parameter button", () => {
      renderWithProvider();

      expect(screen.getByRole("button", { name: /add parameter/i })).toBeInTheDocument();
    });

    it("should add new parameter when add button clicked", async () => {
      const onParametersChange = vi.fn();
      renderWithProvider({ onParametersChange });

      const addButton = screen.getByRole("button", { name: /add parameter/i });
      await userEvent.click(addButton);

      expect(onParametersChange).toHaveBeenCalled();
      const newParams = onParametersChange.mock.calls[0][0];
      expect(newParams.length).toBe(6); // 5 + 1 new
    });

    it("should render remove button for each parameter", () => {
      renderWithProvider();

      const removeButtons = screen.getAllByRole("button", { name: /remove parameter/i });
      expect(removeButtons.length).toBe(5);
    });

    it("should remove parameter when remove button clicked", async () => {
      const onParametersChange = vi.fn();
      renderWithProvider({ onParametersChange });

      const statusRow = screen.getByTestId("param-row-status");
      const removeButton = within(statusRow).getByRole("button", { name: /remove parameter/i });

      await userEvent.click(removeButton);

      expect(onParametersChange).toHaveBeenCalled();
      const newParams = onParametersChange.mock.calls[0][0];
      expect(newParams.find((p: any) => p.name === "status")).toBeUndefined();
    });
  });

  describe("Parameter Name Editing", () => {
    it("should allow editing parameter name", async () => {
      const onParametersChange = vi.fn();
      renderWithProvider({ onParametersChange });

      const statusRow = screen.getByTestId("param-row-status");
      const nameInput = within(statusRow).getByRole("textbox", { name: /parameter name/i });

      fireEvent.change(nameInput, { target: { value: "filterStatus" } });

      expect(onParametersChange).toHaveBeenCalled();
      const newParams = onParametersChange.mock.calls[0][0];
      expect(newParams.find((p: any) => p.name === "filterStatus")).toBeDefined();
    });
  });

  describe("Parameter Description Editing", () => {
    it("should allow editing parameter description", async () => {
      const onParametersChange = vi.fn();
      renderWithProvider({ onParametersChange });

      const statusRow = screen.getByTestId("param-row-status");
      const descInput = within(statusRow).getByRole("textbox", { name: /description/i });

      fireEvent.change(descInput, { target: { value: "New description" } });

      expect(onParametersChange).toHaveBeenCalled();
      const newParams = onParametersChange.mock.calls[0][0];
      const statusParam = newParams.find((p: any) => p.name === "status");
      expect(statusParam.description).toBe("New description");
    });
  });

  describe("Path Parameter Validation", () => {
    it("should auto-detect path parameters from path template", () => {
      renderWithProvider({ pathTemplate: "/pets/{petId}/photos/{photoId}" });

      // Should show indicators for path parameters
      const petIdRow = screen.getByTestId("param-row-petId");
      expect(within(petIdRow).getByText(/path param/i)).toBeInTheDocument();
    });

    it("should enforce required for path parameters", () => {
      renderWithProvider();

      const petIdRow = screen.getByTestId("param-row-petId");
      const checkbox = within(petIdRow).getByRole("checkbox", { name: /required/i });

      // Path parameters should be required and potentially disabled
      expect(checkbox).toBeChecked();
    });

    it("should show warning if path param is missing from parameters", () => {
      renderWithProvider({
        parameters: [{ name: "status", in: "query", schema: { type: "string" } }],
        pathTemplate: "/pets/{petId}",
      });

      // Warning should mention petId as missing
      expect(screen.getByText(/petId/)).toBeInTheDocument();
      // Warning icon should be present
      expect(screen.getByText(/Missing path parameter/i)).toBeInTheDocument();
    });
  });

  describe("Constraints Display (Advanced Profile)", () => {
    it("should show constraints in Advanced profile", () => {
      renderWithProvider({}, { profile: "Advanced" });

      // Should show format for integer
      const petIdRow = screen.getByTestId("param-row-petId");
      expect(within(petIdRow).getByText(/int64/i)).toBeInTheDocument();
    });

    it("should show enum values for enum parameters", () => {
      renderWithProvider({}, { profile: "Advanced" });

      const statusRow = screen.getByTestId("param-row-status");
      expect(within(statusRow).getByText(/available/i)).toBeInTheDocument();
    });

    it("should show min/max for numeric parameters", () => {
      renderWithProvider({}, { profile: "Advanced" });

      const limitRow = screen.getByTestId("param-row-limit");
      expect(within(limitRow).getByText(/min.*1/i)).toBeInTheDocument();
      expect(within(limitRow).getByText(/max.*100/i)).toBeInTheDocument();
    });
  });

  describe("Example Suggestion", () => {
    it("should display Example column header", () => {
      renderWithProvider();

      expect(screen.getByText("Example")).toBeInTheDocument();
    });

    it("should render example input for each parameter", () => {
      renderWithProvider();

      const exampleInputs = screen.getAllByRole("textbox", { name: /example/i });
      expect(exampleInputs.length).toBe(5);
    });

    it("should allow editing parameter example", async () => {
      const onParametersChange = vi.fn();
      renderWithProvider({ onParametersChange });

      const petIdRow = screen.getByTestId("param-row-petId");
      const exampleInput = within(petIdRow).getByRole("textbox", { name: /example/i });

      fireEvent.change(exampleInput, { target: { value: "12345" } });

      expect(onParametersChange).toHaveBeenCalled();
      const newParams = onParametersChange.mock.calls[0][0];
      const petIdParam = newParams.find((p: any) => p.name === "petId");
      expect(petIdParam.example).toBe("12345");
    });

    it("should render suggest example button for each parameter", () => {
      renderWithProvider();

      const suggestButtons = screen.getAllByRole("button", { name: /suggest example/i });
      expect(suggestButtons.length).toBe(5);
    });

    it("should apply suggested example when suggest button clicked", async () => {
      const onParametersChange = vi.fn();
      renderWithProvider({ onParametersChange });

      const petIdRow = screen.getByTestId("param-row-petId");
      const suggestButton = within(petIdRow).getByRole("button", { name: /suggest example/i });

      await userEvent.click(suggestButton);

      expect(onParametersChange).toHaveBeenCalled();
      const newParams = onParametersChange.mock.calls[0][0];
      const petIdParam = newParams.find((p: any) => p.name === "petId");
      // int64 format should suggest 9223372036854775807
      expect(petIdParam.example).toBe("9223372036854775807");
    });

    it("should show placeholder with suggested example", () => {
      renderWithProvider();

      const petIdRow = screen.getByTestId("param-row-petId");
      const exampleInput = within(petIdRow).getByRole("textbox", { name: /example/i });

      // int64 format should show as placeholder
      expect(exampleInput).toHaveAttribute("placeholder", "9223372036854775807");
    });

    it("should suggest first enum value for enum parameters", async () => {
      const onParametersChange = vi.fn();
      renderWithProvider({ onParametersChange });

      const statusRow = screen.getByTestId("param-row-status");
      const suggestButton = within(statusRow).getByRole("button", { name: /suggest example/i });

      await userEvent.click(suggestButton);

      expect(onParametersChange).toHaveBeenCalled();
      const newParams = onParametersChange.mock.calls[0][0];
      const statusParam = newParams.find((p: any) => p.name === "status");
      expect(statusParam.example).toBe("available");
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

      const editor = container.querySelector("[data-testid='parameters-editor']");
      expect(editor).toHaveClass("space-y-4");
    });
  });
});
