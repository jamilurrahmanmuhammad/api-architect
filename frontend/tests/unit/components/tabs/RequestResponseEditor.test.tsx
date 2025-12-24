/**
 * Component Tests for RequestResponseEditor
 * Tests request body and response editor for operations
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RequestResponseEditor } from "../../../../src/components/forms/tabs/RequestResponseEditor";
import { FormStateProvider } from "../../../../src/providers/FormStateProvider";
import { initialFormState, FormState, emptyOas } from "../../../../src/types/formState";

/**
 * Sample schemas for testing
 */
const sampleSchemas = {
  Pet: {
    type: "object",
    properties: {
      id: { type: "integer" },
      name: { type: "string" },
    },
  },
  Error: {
    type: "object",
    properties: {
      code: { type: "integer" },
      message: { type: "string" },
    },
  },
  User: {
    type: "object",
    properties: {
      id: { type: "integer" },
      email: { type: "string" },
    },
  },
};

/**
 * Sample request body for testing
 */
const sampleRequestBody = {
  description: "Pet object to add",
  required: true,
  content: {
    "application/json": {
      schema: {
        $ref: "#/components/schemas/Pet",
      },
    },
  },
};

/**
 * Sample responses for testing
 */
const sampleResponses = {
  "200": {
    description: "Successful response",
    content: {
      "application/json": {
        schema: {
          $ref: "#/components/schemas/Pet",
        },
      },
    },
  },
  "400": {
    description: "Bad request",
    content: {
      "application/json": {
        schema: {
          $ref: "#/components/schemas/Error",
        },
      },
    },
  },
  "404": {
    description: "Not found",
  },
};

/**
 * Helper to render RequestResponseEditor within FormStateProvider
 */
function renderWithProvider(
  props: {
    requestBody?: typeof sampleRequestBody | null;
    responses?: typeof sampleResponses;
    onRequestBodyChange?: (body: any) => void;
    onResponsesChange?: (responses: any) => void;
  } = {},
  initialState: Partial<FormState> = {}
) {
  const state: FormState = {
    ...initialFormState,
    oasData: {
      ...emptyOas,
      components: {
        schemas: sampleSchemas,
      },
    },
    ...initialState,
  };

  const defaultProps = {
    requestBody: sampleRequestBody,
    responses: sampleResponses,
    onRequestBodyChange: vi.fn(),
    onResponsesChange: vi.fn(),
    ...props,
  };

  return render(
    <FormStateProvider initialState={state}>
      <RequestResponseEditor {...defaultProps} />
    </FormStateProvider>
  );
}

describe("RequestResponseEditor", () => {
  describe("Request Body Section", () => {
    it("should render request body section", () => {
      renderWithProvider();

      expect(screen.getByText(/request body/i)).toBeInTheDocument();
    });

    it("should show schema selector for request body", () => {
      renderWithProvider();

      const select = screen.getByRole("combobox", { name: /request.*schema/i });
      expect(select).toBeInTheDocument();
    });

    it("should list available schemas in dropdown", () => {
      renderWithProvider();

      const select = screen.getByRole("combobox", { name: /request.*schema/i });
      const options = within(select).getAllByRole("option");
      const values = options.map((o) => o.textContent);

      expect(values).toContain("Pet");
      expect(values).toContain("Error");
      expect(values).toContain("User");
    });

    it("should show current request body schema", () => {
      renderWithProvider();

      const select = screen.getByRole("combobox", { name: /request.*schema/i }) as HTMLSelectElement;
      expect(select.value).toBe("Pet");
    });

    it("should call onRequestBodyChange when schema selected", async () => {
      const onRequestBodyChange = vi.fn();
      renderWithProvider({ onRequestBodyChange });

      const select = screen.getByRole("combobox", { name: /request.*schema/i });
      fireEvent.change(select, { target: { value: "User" } });

      expect(onRequestBodyChange).toHaveBeenCalled();
      const newBody = onRequestBodyChange.mock.calls[0][0];
      expect(newBody.content["application/json"].schema.$ref).toBe("#/components/schemas/User");
    });

    it("should show None option for no request body", () => {
      renderWithProvider();

      const select = screen.getByRole("combobox", { name: /request.*schema/i });
      const options = within(select).getAllByRole("option");
      const values = options.map((o) => o.getAttribute("value"));

      expect(values).toContain("none");
    });

    it("should allow clearing request body", async () => {
      const onRequestBodyChange = vi.fn();
      renderWithProvider({ onRequestBodyChange });

      const select = screen.getByRole("combobox", { name: /request.*schema/i });
      fireEvent.change(select, { target: { value: "none" } });

      expect(onRequestBodyChange).toHaveBeenCalledWith(null);
    });

    it("should show required checkbox for request body", () => {
      renderWithProvider();

      const checkbox = screen.getByRole("checkbox", { name: /required/i });
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).toBeChecked();
    });

    it("should toggle required when checkbox clicked", async () => {
      const onRequestBodyChange = vi.fn();
      renderWithProvider({ onRequestBodyChange });

      const checkbox = screen.getByRole("checkbox", { name: /required/i });
      await userEvent.click(checkbox);

      expect(onRequestBodyChange).toHaveBeenCalled();
      const newBody = onRequestBodyChange.mock.calls[0][0];
      expect(newBody.required).toBe(false);
    });

    it("should show description field for request body", () => {
      renderWithProvider();

      const input = screen.getByRole("textbox", { name: /request.*description/i });
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue("Pet object to add");
    });

    it("should show empty state when no request body", () => {
      renderWithProvider({ requestBody: null });

      expect(screen.getByText(/no request body/i)).toBeInTheDocument();
    });
  });

  describe("Response Section", () => {
    it("should render responses section", () => {
      renderWithProvider();

      expect(screen.getByText(/responses/i)).toBeInTheDocument();
    });

    it("should display all response codes", () => {
      renderWithProvider();

      expect(screen.getByText("200")).toBeInTheDocument();
      expect(screen.getByText("400")).toBeInTheDocument();
      expect(screen.getByText("404")).toBeInTheDocument();
    });

    it("should show response descriptions", () => {
      renderWithProvider();

      // Descriptions are in input fields
      const row200 = screen.getByTestId("response-row-200");
      const row400 = screen.getByTestId("response-row-400");
      const row404 = screen.getByTestId("response-row-404");

      expect(within(row200).getByDisplayValue("Successful response")).toBeInTheDocument();
      expect(within(row400).getByDisplayValue("Bad request")).toBeInTheDocument();
      expect(within(row404).getByDisplayValue("Not found")).toBeInTheDocument();
    });

    it("should show schema reference for responses", () => {
      renderWithProvider();

      // 200 response has Pet schema
      const row200 = screen.getByTestId("response-row-200");
      expect(within(row200).getByText(/pet/i)).toBeInTheDocument();
    });

    it("should render add response button", () => {
      renderWithProvider();

      expect(screen.getByRole("button", { name: /add response/i })).toBeInTheDocument();
    });

    it("should open add response dialog when button clicked", async () => {
      renderWithProvider();

      const addButton = screen.getByRole("button", { name: /add response/i });
      await userEvent.click(addButton);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("should render remove button for each response", () => {
      renderWithProvider();

      const removeButtons = screen.getAllByRole("button", { name: /remove.*response/i });
      expect(removeButtons.length).toBe(3);
    });

    it("should remove response when remove button clicked", async () => {
      const onResponsesChange = vi.fn();
      renderWithProvider({ onResponsesChange });

      const row400 = screen.getByTestId("response-row-400");
      const removeButton = within(row400).getByRole("button", { name: /remove.*response/i });

      await userEvent.click(removeButton);

      expect(onResponsesChange).toHaveBeenCalled();
      const newResponses = onResponsesChange.mock.calls[0][0];
      expect(newResponses["400"]).toBeUndefined();
    });

    it("should show empty state when no responses", () => {
      renderWithProvider({ responses: {} });

      expect(screen.getByText(/no responses defined/i)).toBeInTheDocument();
    });
  });

  describe("Add Response Dialog", () => {
    it("should show status code input", async () => {
      renderWithProvider();

      const addButton = screen.getByRole("button", { name: /add response/i });
      await userEvent.click(addButton);

      expect(screen.getByRole("combobox", { name: /status code/i })).toBeInTheDocument();
    });

    it("should offer common status codes", async () => {
      renderWithProvider();

      const addButton = screen.getByRole("button", { name: /add response/i });
      await userEvent.click(addButton);

      const select = screen.getByRole("combobox", { name: /status code/i });
      const options = within(select).getAllByRole("option");
      const values = options.map((o) => o.getAttribute("value"));

      expect(values).toContain("200");
      expect(values).toContain("201");
      expect(values).toContain("400");
      expect(values).toContain("401");
      expect(values).toContain("404");
      expect(values).toContain("500");
    });

    it("should show description input", async () => {
      renderWithProvider();

      const addButton = screen.getByRole("button", { name: /add response/i });
      await userEvent.click(addButton);

      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getByRole("textbox", { name: /description/i })).toBeInTheDocument();
    });

    it("should show schema selector", async () => {
      renderWithProvider();

      const addButton = screen.getByRole("button", { name: /add response/i });
      await userEvent.click(addButton);

      expect(screen.getByRole("combobox", { name: /response.*schema/i })).toBeInTheDocument();
    });

    it("should add new response when form submitted", async () => {
      const onResponsesChange = vi.fn();
      renderWithProvider({ onResponsesChange });

      const addButton = screen.getByRole("button", { name: /add response/i });
      await userEvent.click(addButton);

      const dialog = screen.getByRole("dialog");

      const codeSelect = within(dialog).getByRole("combobox", { name: /status code/i });
      fireEvent.change(codeSelect, { target: { value: "201" } });

      const descInput = within(dialog).getByRole("textbox", { name: /description/i });
      fireEvent.change(descInput, { target: { value: "Created" } });

      const createButton = within(dialog).getByRole("button", { name: /create/i });
      await userEvent.click(createButton);

      expect(onResponsesChange).toHaveBeenCalled();
      const newResponses = onResponsesChange.mock.calls[0][0];
      expect(newResponses["201"]).toBeDefined();
      expect(newResponses["201"].description).toBe("Created");
    });

    it("should close dialog on cancel", async () => {
      renderWithProvider();

      const addButton = screen.getByRole("button", { name: /add response/i });
      await userEvent.click(addButton);

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      await userEvent.click(cancelButton);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("should prevent duplicate status codes", async () => {
      renderWithProvider();

      const addButton = screen.getByRole("button", { name: /add response/i });
      await userEvent.click(addButton);

      const codeSelect = screen.getByRole("combobox", { name: /status code/i });
      fireEvent.change(codeSelect, { target: { value: "200" } });

      const createButton = screen.getByRole("button", { name: /create/i });
      await userEvent.click(createButton);

      expect(screen.getByText(/already exists/i)).toBeInTheDocument();
    });
  });

  describe("Response Schema Selection", () => {
    it("should show schema selector for response", () => {
      renderWithProvider();

      const row200 = screen.getByTestId("response-row-200");
      const select = within(row200).getByRole("combobox", { name: /schema/i });
      expect(select).toBeInTheDocument();
    });

    it("should change response schema when selected", async () => {
      const onResponsesChange = vi.fn();
      renderWithProvider({ onResponsesChange });

      const row200 = screen.getByTestId("response-row-200");
      const select = within(row200).getByRole("combobox", { name: /schema/i });

      fireEvent.change(select, { target: { value: "User" } });

      expect(onResponsesChange).toHaveBeenCalled();
      const newResponses = onResponsesChange.mock.calls[0][0];
      expect(newResponses["200"].content["application/json"].schema.$ref).toBe(
        "#/components/schemas/User"
      );
    });

    it("should show array toggle for response", () => {
      renderWithProvider();

      const row200 = screen.getByTestId("response-row-200");
      const toggle = within(row200).getByRole("checkbox", { name: /array/i });
      expect(toggle).toBeInTheDocument();
    });

    it("should convert to array schema when toggle enabled", async () => {
      const onResponsesChange = vi.fn();
      renderWithProvider({ onResponsesChange });

      const row200 = screen.getByTestId("response-row-200");
      const toggle = within(row200).getByRole("checkbox", { name: /array/i });

      await userEvent.click(toggle);

      expect(onResponsesChange).toHaveBeenCalled();
      const newResponses = onResponsesChange.mock.calls[0][0];
      const schema = newResponses["200"].content["application/json"].schema;
      expect(schema.type).toBe("array");
      expect(schema.items.$ref).toBe("#/components/schemas/Pet");
    });

    it("should convert back to single schema when toggle disabled", async () => {
      const arrayResponse = {
        "200": {
          description: "List of pets",
          content: {
            "application/json": {
              schema: {
                type: "array",
                items: { $ref: "#/components/schemas/Pet" },
              },
            },
          },
        },
      };

      const onResponsesChange = vi.fn();
      renderWithProvider({ responses: arrayResponse, onResponsesChange });

      const row200 = screen.getByTestId("response-row-200");
      const toggle = within(row200).getByRole("checkbox", { name: /array/i });

      expect(toggle).toBeChecked();

      await userEvent.click(toggle);

      expect(onResponsesChange).toHaveBeenCalled();
      const newResponses = onResponsesChange.mock.calls[0][0];
      const schema = newResponses["200"].content["application/json"].schema;
      expect(schema.$ref).toBe("#/components/schemas/Pet");
      expect(schema.type).toBeUndefined();
    });

    it("should allow no schema for response", async () => {
      const onResponsesChange = vi.fn();
      renderWithProvider({ onResponsesChange });

      const row200 = screen.getByTestId("response-row-200");
      const select = within(row200).getByRole("combobox", { name: /schema/i });

      fireEvent.change(select, { target: { value: "none" } });

      expect(onResponsesChange).toHaveBeenCalled();
      const newResponses = onResponsesChange.mock.calls[0][0];
      expect(newResponses["200"].content).toBeUndefined();
    });
  });

  describe("Response Description Editing", () => {
    it("should show description input for each response", () => {
      renderWithProvider();

      const row200 = screen.getByTestId("response-row-200");
      const input = within(row200).getByRole("textbox", { name: /description/i });
      expect(input).toHaveValue("Successful response");
    });

    it("should update description when edited", async () => {
      const onResponsesChange = vi.fn();
      renderWithProvider({ onResponsesChange });

      const row200 = screen.getByTestId("response-row-200");
      const input = within(row200).getByRole("textbox", { name: /description/i });

      fireEvent.change(input, { target: { value: "Returns a pet" } });

      expect(onResponsesChange).toHaveBeenCalled();
      const newResponses = onResponsesChange.mock.calls[0][0];
      expect(newResponses["200"].description).toBe("Returns a pet");
    });
  });

  describe("Status Code Styling", () => {
    it("should style 2xx codes as success", () => {
      renderWithProvider();

      const row200 = screen.getByTestId("response-row-200");
      const badge = within(row200).getByText("200");
      expect(badge).toHaveClass("bg-green-100");
    });

    it("should style 4xx codes as warning", () => {
      renderWithProvider();

      const row400 = screen.getByTestId("response-row-400");
      const badge = within(row400).getByText("400");
      expect(badge).toHaveClass("bg-yellow-100");
    });

    it("should style 404 as client error", () => {
      renderWithProvider();

      const row404 = screen.getByTestId("response-row-404");
      const badge = within(row404).getByText("404");
      expect(badge).toHaveClass("bg-yellow-100");
    });
  });

  describe("Accessibility", () => {
    it("should have proper section headings", () => {
      renderWithProvider();

      expect(screen.getByRole("heading", { name: /request body/i })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /responses/i })).toBeInTheDocument();
    });

    it("should have accessible form controls", () => {
      renderWithProvider();

      const selects = screen.getAllByRole("combobox");
      selects.forEach((select) => {
        expect(select).toHaveAttribute("aria-label");
      });
    });
  });

  describe("Layout", () => {
    it("should render with proper spacing", () => {
      const { container } = renderWithProvider();

      const editor = container.querySelector("[data-testid='request-response-editor']");
      expect(editor).toHaveClass("space-y-6");
    });
  });
});
