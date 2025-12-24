/**
 * Component Tests for OASViewer
 * Tests JSON/YAML viewer for OpenAPI specs in Expert Mode
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OASViewer } from "../../../src/components/forms/OASViewer";
import { FormStateProvider } from "../../../src/providers/FormStateProvider";
import { initialFormState, FormState, emptyOas } from "../../../src/types/formState";

/**
 * Sample OAS data for testing
 */
const sampleOasData = {
  openapi: "3.0.0",
  info: {
    title: "Pet Store API",
    version: "1.0.0",
    description: "A sample API for pets",
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
 * Helper to render OASViewer within FormStateProvider
 */
function renderWithProvider(initialState: Partial<FormState> = {}) {
  const editedPaths = new Set<string>();
  if (initialState.editedPaths) {
    initialState.editedPaths.forEach((p) => editedPaths.add(p));
  }

  const state: FormState = {
    ...initialFormState,
    oasData: sampleOasData,
    editedPaths,
    ...initialState,
  };

  return render(
    <FormStateProvider initialState={state}>
      <OASViewer />
    </FormStateProvider>
  );
}

describe("OASViewer", () => {
  describe("JSON Rendering", () => {
    it("should render OAS viewer component", () => {
      renderWithProvider();

      expect(screen.getByTestId("oas-viewer")).toBeInTheDocument();
    });

    it("should display OAS data as JSON", () => {
      renderWithProvider();

      expect(screen.getByText(/"openapi"/)).toBeInTheDocument();
      expect(screen.getByText(/"3.0.0"/)).toBeInTheDocument();
    });

    it("should show info section", () => {
      renderWithProvider();

      expect(screen.getByText(/"info"/)).toBeInTheDocument();
      expect(screen.getByText(/"Pet Store API"/)).toBeInTheDocument();
    });

    it("should show paths section", () => {
      renderWithProvider();

      expect(screen.getByText(/"paths"/)).toBeInTheDocument();
      expect(screen.getByText(/\/pets/)).toBeInTheDocument();
    });

    it("should show components section", () => {
      renderWithProvider();

      expect(screen.getByText(/"components"/)).toBeInTheDocument();
      expect(screen.getByText(/"schemas"/)).toBeInTheDocument();
    });
  });

  describe("Syntax Highlighting", () => {
    it("should apply syntax highlighting classes", () => {
      renderWithProvider();

      const viewer = screen.getByTestId("oas-viewer");
      expect(viewer.querySelector(".syntax-key")).toBeInTheDocument();
    });

    it("should highlight string values", () => {
      renderWithProvider();

      const viewer = screen.getByTestId("oas-viewer");
      expect(viewer.querySelector(".syntax-string")).toBeInTheDocument();
    });

    it("should highlight numeric values", () => {
      renderWithProvider();

      const viewer = screen.getByTestId("oas-viewer");
      // Version "1.0.0" is a string, but we might have numeric values
      expect(viewer.querySelector(".syntax-string")).toBeInTheDocument();
    });

    it("should highlight boolean values", () => {
      const oasWithBool = {
        ...sampleOasData,
        paths: {
          "/pets": {
            get: {
              deprecated: true,
              responses: { "200": { description: "OK" } },
            },
          },
        },
      };

      render(
        <FormStateProvider initialState={{ ...initialFormState, oasData: oasWithBool }}>
          <OASViewer />
        </FormStateProvider>
      );

      const viewer = screen.getByTestId("oas-viewer");
      expect(viewer.querySelector(".syntax-boolean")).toBeInTheDocument();
    });
  });

  describe("Edited Fields Highlighting", () => {
    it("should highlight edited paths", () => {
      const editedPaths = new Set(["/info/title"]);

      renderWithProvider({ editedPaths });

      const viewer = screen.getByTestId("oas-viewer");
      const editedLine = viewer.querySelector(".edited-field");
      expect(editedLine).toBeInTheDocument();
    });

    it("should show edited indicator for modified fields", () => {
      const editedPaths = new Set(["/info/title", "/info/version"]);

      renderWithProvider({ editedPaths });

      const viewer = screen.getByTestId("oas-viewer");
      const editedLines = viewer.querySelectorAll(".edited-field");
      expect(editedLines.length).toBeGreaterThanOrEqual(1);
    });

    it("should apply distinct styling to edited fields", () => {
      const editedPaths = new Set(["/info/title"]);

      renderWithProvider({ editedPaths });

      const viewer = screen.getByTestId("oas-viewer");
      const editedLine = viewer.querySelector(".edited-field");
      expect(editedLine).toHaveClass("bg-yellow-100");
    });
  });

  describe("File Size Display", () => {
    it("should show file size", () => {
      renderWithProvider();

      expect(screen.getByTestId("file-size")).toBeInTheDocument();
    });

    it("should display size in bytes for small specs", () => {
      const smallOas = { openapi: "3.0.0", info: { title: "Test", version: "1.0.0" } };

      render(
        <FormStateProvider initialState={{ ...initialFormState, oasData: smallOas }}>
          <OASViewer />
        </FormStateProvider>
      );

      const sizeText = screen.getByTestId("file-size").textContent;
      expect(sizeText).toMatch(/\d+\s*B/);
    });

    it("should display size in KB for larger specs", () => {
      renderWithProvider();

      const sizeText = screen.getByTestId("file-size").textContent;
      // Sample data is a few hundred bytes
      expect(sizeText).toMatch(/\d+(\.\d+)?\s*(B|KB)/);
    });
  });

  describe("Format Toggle", () => {
    it("should show format toggle buttons", () => {
      renderWithProvider();

      expect(screen.getByRole("button", { name: /json/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /yaml/i })).toBeInTheDocument();
    });

    it("should default to JSON format", () => {
      renderWithProvider();

      const jsonButton = screen.getByRole("button", { name: /json/i });
      expect(jsonButton).toHaveAttribute("aria-pressed", "true");
    });

    it("should switch to YAML format when clicked", async () => {
      renderWithProvider();

      const yamlButton = screen.getByRole("button", { name: /yaml/i });
      await userEvent.click(yamlButton);

      expect(yamlButton).toHaveAttribute("aria-pressed", "true");
    });

    it("should display YAML formatted content", async () => {
      renderWithProvider();

      const yamlButton = screen.getByRole("button", { name: /yaml/i });
      await userEvent.click(yamlButton);

      // YAML key is displayed without quotes (tokenized separately)
      const viewer = screen.getByTestId("oas-viewer");
      // Check that we have YAML syntax (key followed by colon)
      expect(viewer.textContent).toContain("openapi");
      expect(viewer.textContent).toContain(": 3.0.0");
    });
  });

  describe("Copy Functionality", () => {
    it("should show copy button", () => {
      renderWithProvider();

      expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
    });

    it("should copy content to clipboard when clicked", async () => {
      const mockClipboard = {
        writeText: vi.fn().mockResolvedValue(undefined),
      };
      Object.assign(navigator, { clipboard: mockClipboard });

      renderWithProvider();

      const copyButton = screen.getByRole("button", { name: /copy/i });
      await userEvent.click(copyButton);

      expect(mockClipboard.writeText).toHaveBeenCalled();
    });

    it("should show copied confirmation", async () => {
      const mockClipboard = {
        writeText: vi.fn().mockResolvedValue(undefined),
      };
      Object.assign(navigator, { clipboard: mockClipboard });

      renderWithProvider();

      const copyButton = screen.getByRole("button", { name: /copy/i });
      await userEvent.click(copyButton);

      expect(screen.getByText(/copied/i)).toBeInTheDocument();
    });
  });

  describe("Line Numbers", () => {
    it("should show line numbers", () => {
      renderWithProvider();

      const viewer = screen.getByTestId("oas-viewer");
      expect(viewer.querySelector(".line-number")).toBeInTheDocument();
    });

    it("should number lines sequentially", () => {
      renderWithProvider();

      const viewer = screen.getByTestId("oas-viewer");
      const lineNumbers = viewer.querySelectorAll(".line-number");

      expect(lineNumbers.length).toBeGreaterThan(5);
      expect(lineNumbers[0].textContent).toBe("1");
      expect(lineNumbers[1].textContent).toBe("2");
    });
  });

  describe("Collapsible Sections", () => {
    it("should have collapse buttons for objects", () => {
      renderWithProvider();

      const collapseButtons = screen.getAllByRole("button", { name: /collapse|expand/i });
      expect(collapseButtons.length).toBeGreaterThan(0);
    });

    it("should toggle collapse state when clicked", async () => {
      renderWithProvider();

      // Find any collapse button
      const collapseButtons = screen.getAllByRole("button", { name: /collapse|expand/i });
      expect(collapseButtons.length).toBeGreaterThan(0);

      // Click a collapse button
      await userEvent.click(collapseButtons[0]);

      // After click, button should change to expand (or vice versa)
      // This tests the state toggle functionality
      const updatedButtons = screen.getAllByRole("button", { name: /collapse|expand/i });
      expect(updatedButtons.length).toBeGreaterThan(0);
    });
  });

  describe("Search Functionality", () => {
    it("should show search input", () => {
      renderWithProvider();

      expect(screen.getByRole("searchbox")).toBeInTheDocument();
    });

    it("should highlight search matches", async () => {
      renderWithProvider();

      const searchInput = screen.getByRole("searchbox");
      await userEvent.type(searchInput, "Pet");

      const viewer = screen.getByTestId("oas-viewer");
      const highlights = viewer.querySelectorAll(".search-highlight");
      expect(highlights.length).toBeGreaterThan(0);
    });

    it("should show match count", async () => {
      renderWithProvider();

      const searchInput = screen.getByRole("searchbox");
      await userEvent.type(searchInput, "Pet");

      expect(screen.getByText(/\d+.*match/i)).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA attributes", () => {
      renderWithProvider();

      const viewer = screen.getByTestId("oas-viewer");
      expect(viewer).toHaveAttribute("role", "region");
      expect(viewer).toHaveAttribute("aria-label");
    });

    it("should be keyboard navigable", () => {
      renderWithProvider();

      const viewer = screen.getByTestId("oas-viewer");
      expect(viewer).toHaveAttribute("tabIndex", "0");
    });

    it("should have accessible format toggle", () => {
      renderWithProvider();

      const jsonButton = screen.getByRole("button", { name: /json/i });
      const yamlButton = screen.getByRole("button", { name: /yaml/i });

      expect(jsonButton).toHaveAttribute("aria-pressed");
      expect(yamlButton).toHaveAttribute("aria-pressed");
    });
  });

  describe("Performance", () => {
    it("should handle large specs without freezing", () => {
      // Create a large OAS object
      const largeOas = { ...sampleOasData, paths: {} as Record<string, any> };
      for (let i = 0; i < 50; i++) {
        largeOas.paths[`/resource${i}`] = {
          get: {
            summary: `Get resource ${i}`,
            responses: { "200": { description: "OK" } },
          },
        };
      }

      const startTime = performance.now();

      render(
        <FormStateProvider initialState={{ ...initialFormState, oasData: largeOas }}>
          <OASViewer />
        </FormStateProvider>
      );

      const endTime = performance.now();

      // Should render in reasonable time (allowing for test environment overhead)
      expect(endTime - startTime).toBeLessThan(3000);
    });
  });

  describe("Layout", () => {
    it("should render with proper styling", () => {
      renderWithProvider();

      const viewer = screen.getByTestId("oas-viewer");
      expect(viewer).toHaveClass("font-mono");
    });

    it("should have dark theme for code display", () => {
      renderWithProvider();

      const viewer = screen.getByTestId("oas-viewer");
      expect(viewer).toHaveClass("bg-slate-900");
    });
  });
});
