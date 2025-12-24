/**
 * Component Tests for OASImportDialog
 * Tests file upload, drag-drop, progress, and import summary
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OASImportDialog } from "../../../src/components/forms/OASImportDialog";

// Helper to create a mock file with content
function createMockFile(content: string, name: string, type: string): File {
  const file = new File([content], name, { type });
  return file;
}

describe("OASImportDialog", () => {
  const mockOnImport = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validOAS = JSON.stringify({
    openapi: "3.0.0",
    info: { title: "Test API", version: "1.0.0" },
    paths: {
      "/users": { get: { operationId: "getUsers", responses: { "200": { description: "OK" } } } },
      "/users/{id}": { get: { operationId: "getUser", responses: { "200": { description: "OK" } } } },
    },
    components: {
      schemas: {
        User: { type: "object", properties: { id: { type: "integer" } } },
        Error: { type: "object", properties: { message: { type: "string" } } },
      },
    },
  });

  describe("Rendering", () => {
    it("should render when open is true", () => {
      render(
        <OASImportDialog
          open={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText(/Import OpenAPI/i)).toBeInTheDocument();
    });

    it("should not render when open is false", () => {
      render(
        <OASImportDialog
          open={false}
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("should render file upload button", () => {
      render(
        <OASImportDialog
          open={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      expect(screen.getByText(/Choose File/i)).toBeInTheDocument();
    });

    it("should render drag-drop zone", () => {
      render(
        <OASImportDialog
          open={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      expect(screen.getByTestId("dropzone")).toBeInTheDocument();
      expect(screen.getByText(/drag.*drop/i)).toBeInTheDocument();
    });
  });

  describe("File Upload", () => {
    it("should accept JSON files", async () => {
      render(
        <OASImportDialog
          open={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      const input = screen.getByTestId("file-input") as HTMLInputElement;
      expect(input.accept).toContain(".json");
    });

    it("should accept YAML files", async () => {
      render(
        <OASImportDialog
          open={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      const input = screen.getByTestId("file-input") as HTMLInputElement;
      expect(input.accept).toContain(".yaml");
      expect(input.accept).toContain(".yml");
    });

    it("should read file content when file selected", async () => {
      render(
        <OASImportDialog
          open={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      const file = createMockFile(validOAS, "api.json", "application/json");
      const input = screen.getByTestId("file-input");

      fireEvent.change(input, { target: { files: [file] } });

      // Should show summary after file is processed
      await waitFor(() => {
        expect(screen.getByTestId("import-summary")).toBeInTheDocument();
      });
    });
  });

  describe("Drag and Drop", () => {
    it("should highlight dropzone on drag over", () => {
      render(
        <OASImportDialog
          open={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      const dropzone = screen.getByTestId("dropzone");

      fireEvent.dragOver(dropzone, {
        dataTransfer: { types: ["Files"] },
      });

      expect(dropzone).toHaveClass("border-primary");
    });

    it("should remove highlight on drag leave", () => {
      render(
        <OASImportDialog
          open={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      const dropzone = screen.getByTestId("dropzone");

      fireEvent.dragOver(dropzone, {
        dataTransfer: { types: ["Files"] },
      });
      fireEvent.dragLeave(dropzone);

      expect(dropzone).not.toHaveClass("border-primary");
    });

    it("should handle file drop", async () => {
      render(
        <OASImportDialog
          open={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      const dropzone = screen.getByTestId("dropzone");
      const file = createMockFile(validOAS, "api.json", "application/json");

      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [file],
          types: ["Files"],
        },
      });

      // Should show summary after file is dropped and processed
      await waitFor(() => {
        expect(screen.getByTestId("import-summary")).toBeInTheDocument();
      });
    });
  });

  describe("Progress Indicator", () => {
    it("should show progress or summary after file selection", async () => {
      render(
        <OASImportDialog
          open={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      const file = createMockFile(validOAS, "api.json", "application/json");
      const input = screen.getByTestId("file-input");

      fireEvent.change(input, { target: { files: [file] } });

      // Progress shows briefly or goes directly to summary
      await waitFor(() => {
        const hasSummary = screen.queryByTestId("import-summary");
        const hasProgress = screen.queryByTestId("import-progress");
        expect(hasSummary || hasProgress).toBeTruthy();
      });
    });

    it("should hide progress indicator after parsing complete", async () => {
      render(
        <OASImportDialog
          open={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      const file = createMockFile(validOAS, "api.json", "application/json");
      const input = screen.getByTestId("file-input");

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.queryByTestId("import-progress")).not.toBeInTheDocument();
        expect(screen.getByTestId("import-summary")).toBeInTheDocument();
      });
    });
  });

  describe("Import Summary", () => {
    it("should display import summary after parsing", async () => {
      render(
        <OASImportDialog
          open={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      const file = createMockFile(validOAS, "api.json", "application/json");
      const input = screen.getByTestId("file-input");

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByTestId("import-summary")).toBeInTheDocument();
      });
    });

    it("should show operations count in summary", async () => {
      render(
        <OASImportDialog
          open={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      const file = createMockFile(validOAS, "api.json", "application/json");
      const input = screen.getByTestId("file-input");

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByTestId("import-summary")).toBeInTheDocument();
      });

      // Check for operations count
      const summary = screen.getByTestId("import-summary");
      expect(summary.textContent).toMatch(/2/);
      expect(summary.textContent).toMatch(/operations/i);
    });

    it("should show models count in summary", async () => {
      render(
        <OASImportDialog
          open={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      const file = createMockFile(validOAS, "api.json", "application/json");
      const input = screen.getByTestId("file-input");

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByTestId("import-summary")).toBeInTheDocument();
      });

      // Check for models count
      const summary = screen.getByTestId("import-summary");
      expect(summary.textContent).toMatch(/2/);
      expect(summary.textContent).toMatch(/models/i);
    });

    it("should show API title in summary", async () => {
      render(
        <OASImportDialog
          open={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      const file = createMockFile(validOAS, "api.json", "application/json");
      const input = screen.getByTestId("file-input");

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/Test API/)).toBeInTheDocument();
      });
    });
  });

  describe("Error Handling", () => {
    it("should show error for invalid JSON", async () => {
      render(
        <OASImportDialog
          open={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      const file = createMockFile("not valid json {{{", "api.json", "application/json");
      const input = screen.getByTestId("file-input");

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
        expect(screen.getByText(/invalid/i)).toBeInTheDocument();
      });
    });

    it("should show error for missing required fields", async () => {
      const invalidOAS = JSON.stringify({
        openapi: "3.0.0",
        // Missing info and paths
      });

      render(
        <OASImportDialog
          open={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      const file = createMockFile(invalidOAS, "api.json", "application/json");
      const input = screen.getByTestId("file-input");

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });
    });

    it("should handle unsupported file gracefully", async () => {
      render(
        <OASImportDialog
          open={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      const invalidContent = "This is not JSON or YAML at all {{{";
      const file = createMockFile(invalidContent, "test.json", "application/json");
      const input = screen.getByTestId("file-input");

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });
    });
  });

  describe("Import Action", () => {
    it("should enable import button after successful parse", async () => {
      render(
        <OASImportDialog
          open={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      const file = createMockFile(validOAS, "api.json", "application/json");
      const input = screen.getByTestId("file-input");

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        const importBtn = screen.getByRole("button", { name: /import/i });
        expect(importBtn).not.toBeDisabled();
      });
    });

    it("should call onImport with parsed OAS when import clicked", async () => {
      const user = userEvent.setup();

      render(
        <OASImportDialog
          open={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      const file = createMockFile(validOAS, "api.json", "application/json");
      const input = screen.getByTestId("file-input");

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByTestId("import-summary")).toBeInTheDocument();
      });

      const importBtn = screen.getByRole("button", { name: /import/i });
      await user.click(importBtn);

      expect(mockOnImport).toHaveBeenCalledWith(JSON.parse(validOAS));
    });

    it("should close dialog after successful import", async () => {
      const user = userEvent.setup();

      render(
        <OASImportDialog
          open={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      const file = createMockFile(validOAS, "api.json", "application/json");
      const input = screen.getByTestId("file-input");

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByTestId("import-summary")).toBeInTheDocument();
      });

      const importBtn = screen.getByRole("button", { name: /import/i });
      await user.click(importBtn);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe("Cancel Action", () => {
    it("should call onClose when cancel clicked", async () => {
      const user = userEvent.setup();

      render(
        <OASImportDialog
          open={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      const cancelBtn = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelBtn);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it("should reset state when reopened", async () => {
      const { rerender } = render(
        <OASImportDialog
          open={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      const file = createMockFile(validOAS, "api.json", "application/json");
      const input = screen.getByTestId("file-input");

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByTestId("import-summary")).toBeInTheDocument();
      });

      // Close and reopen
      rerender(
        <OASImportDialog
          open={false}
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );
      rerender(
        <OASImportDialog
          open={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      // Should be back to initial state
      expect(screen.queryByTestId("import-summary")).not.toBeInTheDocument();
      expect(screen.getByText(/drag.*drop/i)).toBeInTheDocument();
    });
  });
});
