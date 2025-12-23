/**
 * Component Tests for ExportTab
 * Tests export functionality for OpenAPI specs and CSV
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExportTab } from "../../../../src/components/forms/tabs/ExportTab";
import { FormStateProvider } from "../../../../src/providers/FormStateProvider";
import { initialFormState, FormState, emptyOas } from "../../../../src/types/formState";

/**
 * Sample OAS data for testing
 */
const sampleOasData = {
  ...emptyOas,
  info: {
    title: "Pet Store API",
    version: "1.0.0",
    description: "A sample API",
  },
  paths: {
    "/pets": {
      get: {
        summary: "List pets",
        operationId: "listPets",
        responses: {
          "200": { description: "Success" },
        },
      },
    },
  },
  components: {
    schemas: {
      Pet: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
        },
      },
    },
  },
};

/**
 * Helper to render ExportTab within FormStateProvider
 */
function renderWithProvider(initialState: Partial<FormState> = {}) {
  const state: FormState = {
    ...initialFormState,
    oasData: sampleOasData,
    ...initialState,
  };

  return render(
    <FormStateProvider initialState={state}>
      <ExportTab />
    </FormStateProvider>
  );
}

describe("ExportTab", () => {
  describe("OpenAPI Export Section", () => {
    it("should render OpenAPI export section", () => {
      renderWithProvider();

      expect(screen.getByRole("heading", { name: /openapi.*export/i })).toBeInTheDocument();
    });

    it("should show format selector", () => {
      renderWithProvider();

      expect(screen.getByText(/format/i)).toBeInTheDocument();
    });

    it("should have YAML and JSON format options", () => {
      renderWithProvider();

      expect(screen.getByRole("radio", { name: /yaml/i })).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: /json/i })).toBeInTheDocument();
    });

    it("should default to YAML format", () => {
      renderWithProvider();

      const yamlRadio = screen.getByRole("radio", { name: /yaml/i });
      expect(yamlRadio).toBeChecked();
    });

    it("should allow selecting JSON format", async () => {
      renderWithProvider();

      const jsonRadio = screen.getByRole("radio", { name: /json/i });
      await userEvent.click(jsonRadio);

      expect(jsonRadio).toBeChecked();
    });

    it("should show download OAS button", () => {
      renderWithProvider();

      expect(screen.getByRole("button", { name: /download.*openapi/i })).toBeInTheDocument();
    });

    it("should enable download button when form is valid", () => {
      renderWithProvider({ errors: [] });

      const downloadButton = screen.getByRole("button", { name: /download.*openapi/i });
      expect(downloadButton).not.toBeDisabled();
    });

    it("should disable download button when form has errors", () => {
      renderWithProvider({
        errors: [{ path: "/info/title", message: "Title is required", type: "error" }],
      });

      const downloadButton = screen.getByRole("button", { name: /download.*openapi/i });
      expect(downloadButton).toBeDisabled();
    });

    it("should show file size estimate", () => {
      renderWithProvider();

      expect(screen.getByText(/size/i)).toBeInTheDocument();
    });
  });

  describe("CSV Export Section", () => {
    it("should render CSV export section", () => {
      renderWithProvider();

      expect(screen.getByRole("heading", { name: /csv.*export/i })).toBeInTheDocument();
    });

    it("should show profile selector", () => {
      renderWithProvider();

      expect(screen.getByRole("combobox", { name: /profile/i })).toBeInTheDocument();
    });

    it("should offer Basic, Advanced, Expert profiles", () => {
      renderWithProvider();

      const select = screen.getByRole("combobox", { name: /profile/i });
      const options = within(select).getAllByRole("option");
      const values = options.map((o) => o.getAttribute("value"));

      expect(values).toContain("Basic");
      expect(values).toContain("Advanced");
      expect(values).toContain("Expert");
    });

    it("should default to Basic profile", () => {
      renderWithProvider();

      const select = screen.getByRole("combobox", { name: /profile/i }) as HTMLSelectElement;
      expect(select.value).toBe("Basic");
    });

    it("should allow selecting different profiles", async () => {
      renderWithProvider();

      const select = screen.getByRole("combobox", { name: /profile/i });
      fireEvent.change(select, { target: { value: "Advanced" } });

      expect((select as HTMLSelectElement).value).toBe("Advanced");
    });

    it("should show download CSV button", () => {
      renderWithProvider();

      expect(screen.getByRole("button", { name: /download.*csv/i })).toBeInTheDocument();
    });

    it("should show profile description", () => {
      renderWithProvider();

      // Basic profile description
      expect(screen.getByText(/operations.*parameters/i)).toBeInTheDocument();
    });

    it("should update description when profile changes", async () => {
      renderWithProvider();

      const select = screen.getByRole("combobox", { name: /profile/i });
      fireEvent.change(select, { target: { value: "Expert" } });

      // Expert profile shows more features
      expect(screen.getByText(/security|webhook/i)).toBeInTheDocument();
    });
  });

  describe("Validation Status", () => {
    it("should show validation status section", () => {
      renderWithProvider();

      expect(screen.getByTestId("validation-status")).toBeInTheDocument();
    });

    it("should show valid status when no errors", () => {
      renderWithProvider({ errors: [] });

      expect(screen.getByText(/valid/i)).toBeInTheDocument();
    });

    it("should show error count when errors exist", () => {
      renderWithProvider({
        errors: [
          { path: "/info/title", message: "Title is required", type: "error" },
          { path: "/info/version", message: "Version is required", type: "error" },
        ],
      });

      expect(screen.getByText(/2.*error/i)).toBeInTheDocument();
    });

    it("should show warning count when warnings exist", () => {
      renderWithProvider({
        errors: [
          { path: "/info/description", message: "Description recommended", type: "warning" },
        ],
      });

      expect(screen.getByText(/1.*warning/i)).toBeInTheDocument();
    });

    it("should list individual errors", () => {
      renderWithProvider({
        errors: [
          { path: "/info/title", message: "Title is required", type: "error" },
        ],
      });

      expect(screen.getByText(/title is required/i)).toBeInTheDocument();
    });

    it("should show success icon when valid", () => {
      renderWithProvider({ errors: [] });

      const status = screen.getByTestId("validation-status");
      expect(within(status).getByTestId("status-icon-valid")).toBeInTheDocument();
    });

    it("should show error icon when invalid", () => {
      renderWithProvider({
        errors: [{ path: "/info/title", message: "Error", type: "error" }],
      });

      const status = screen.getByTestId("validation-status");
      expect(within(status).getByTestId("status-icon-error")).toBeInTheDocument();
    });
  });

  describe("Document Generation", () => {
    it("should show document generation section", () => {
      renderWithProvider();

      expect(screen.getByRole("heading", { name: /documentation/i })).toBeInTheDocument();
    });

    it("should show generate HTML button", () => {
      renderWithProvider();

      expect(screen.getByRole("button", { name: /html/i })).toBeInTheDocument();
    });

    it("should show generate PDF button", () => {
      renderWithProvider();

      expect(screen.getByRole("button", { name: /pdf/i })).toBeInTheDocument();
    });

    it("should disable doc generation buttons when form has errors", () => {
      renderWithProvider({
        errors: [{ path: "/info/title", message: "Error", type: "error" }],
      });

      const htmlButton = screen.getByRole("button", { name: /html/i });
      const pdfButton = screen.getByRole("button", { name: /pdf/i });

      expect(htmlButton).toBeDisabled();
      expect(pdfButton).toBeDisabled();
    });
  });

  describe("Export Summary", () => {
    it("should show spec summary", () => {
      renderWithProvider();

      expect(screen.getByTestId("export-summary")).toBeInTheDocument();
    });

    it("should show operation count", () => {
      renderWithProvider();

      // Sample data has 1 operation
      expect(screen.getByText(/1.*operation/i)).toBeInTheDocument();
    });

    it("should show model count", () => {
      renderWithProvider();

      // Sample data has 1 model (Pet)
      expect(screen.getByText(/1.*model/i)).toBeInTheDocument();
    });

    it("should show API title", () => {
      renderWithProvider();

      expect(screen.getByText("Pet Store API")).toBeInTheDocument();
    });

    it("should show API version", () => {
      renderWithProvider();

      // Version is shown as "Version 1.0.0"
      expect(screen.getByText(/version.*1\.0\.0/i)).toBeInTheDocument();
    });
  });

  describe("Copy to Clipboard", () => {
    it("should show copy to clipboard button", () => {
      renderWithProvider();

      expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
    });

    it("should enable copy button when form is valid", () => {
      renderWithProvider({ errors: [] });

      const copyButton = screen.getByRole("button", { name: /copy/i });
      expect(copyButton).not.toBeDisabled();
    });
  });

  describe("OpenAPI Version", () => {
    it("should show OpenAPI version selector", () => {
      renderWithProvider();

      expect(screen.getByRole("combobox", { name: /openapi.*version/i })).toBeInTheDocument();
    });

    it("should offer 3.0.x and 3.1.x versions", () => {
      renderWithProvider();

      const select = screen.getByRole("combobox", { name: /openapi.*version/i });
      const options = within(select).getAllByRole("option");
      const texts = options.map((o) => o.textContent);

      expect(texts.some((t) => t?.includes("3.0"))).toBe(true);
      expect(texts.some((t) => t?.includes("3.1"))).toBe(true);
    });

    it("should show current spec version", () => {
      renderWithProvider();

      const select = screen.getByRole("combobox", { name: /openapi.*version/i }) as HTMLSelectElement;
      expect(select.value).toBe("3.0.0");
    });
  });

  describe("Accessibility", () => {
    it("should have proper section headings", () => {
      renderWithProvider();

      const headings = screen.getAllByRole("heading");
      expect(headings.length).toBeGreaterThanOrEqual(3);
    });

    it("should have accessible form controls", () => {
      renderWithProvider();

      const radios = screen.getAllByRole("radio");
      radios.forEach((radio) => {
        expect(radio).toHaveAttribute("name");
      });

      const selects = screen.getAllByRole("combobox");
      selects.forEach((select) => {
        expect(select).toHaveAttribute("aria-label");
      });
    });

    it("should have proper button labels", () => {
      renderWithProvider();

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(
          button.hasAttribute("aria-label") || button.textContent?.trim()
        ).toBeTruthy();
      });
    });
  });

  describe("Layout", () => {
    it("should render with proper spacing", () => {
      const { container } = renderWithProvider();

      const tab = container.querySelector("[data-testid='export-tab']");
      expect(tab).toHaveClass("space-y-6");
    });
  });
});
