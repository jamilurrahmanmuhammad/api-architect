/**
 * Component Tests for CSVImportDialog
 * Tests CSV file upload, preview, and import confirmation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CSVImportDialog } from "../../../src/components/forms/CSVImportDialog";

// Helper to create a mock file with content
function createMockFile(content: string, name: string, type: string): File {
  return new File([content], name, { type });
}

describe("CSVImportDialog", () => {
  const mockOnImport = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validCSV = `operation_id,path,method,summary,description
getUsers,/users,get,Get all users,Returns a list of users
createUser,/users,post,Create user,Creates a new user
getUser,/users/{id},get,Get user,Returns a single user`;

  describe("Rendering", () => {
    it("should render when open is true", () => {
      render(
        <CSVImportDialog
          open={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText(/Import CSV/i)).toBeInTheDocument();
    });

    it("should not render when open is false", () => {
      render(
        <CSVImportDialog
          open={false}
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("should render file upload for CSV", () => {
      render(
        <CSVImportDialog
          open={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      const input = screen.getByTestId("file-input") as HTMLInputElement;
      expect(input.accept).toContain(".csv");
    });
  });

  describe("Import Preview", () => {
    it("should show import preview after file selection", async () => {
      render(
        <CSVImportDialog
          open={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      const file = createMockFile(validCSV, "operations.csv", "text/csv");
      const input = screen.getByTestId("file-input");

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByTestId("import-preview")).toBeInTheDocument();
      });
    });

    it("should show row count in preview", async () => {
      render(
        <CSVImportDialog
          open={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      const file = createMockFile(validCSV, "operations.csv", "text/csv");
      const input = screen.getByTestId("file-input");

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        const preview = screen.getByTestId("import-preview");
        expect(preview.textContent).toMatch(/3/); // 3 data rows
      });
    });
  });

  describe("Confirm/Cancel Buttons", () => {
    it("should have confirm button", async () => {
      render(
        <CSVImportDialog
          open={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      const file = createMockFile(validCSV, "operations.csv", "text/csv");
      const input = screen.getByTestId("file-input");

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /import/i })).toBeInTheDocument();
      });
    });

    it("should have cancel button", () => {
      render(
        <CSVImportDialog
          open={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    });

    it("should call onClose when cancel clicked", async () => {
      const user = userEvent.setup();

      render(
        <CSVImportDialog
          open={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      await user.click(screen.getByRole("button", { name: /cancel/i }));

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("should show error for invalid CSV", async () => {
      render(
        <CSVImportDialog
          open={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      // CSV without required headers
      const invalidCSV = "col1,col2\nval1,val2";
      const file = createMockFile(invalidCSV, "invalid.csv", "text/csv");
      const input = screen.getByTestId("file-input");

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });
    });

    it("should show error for empty CSV", async () => {
      render(
        <CSVImportDialog
          open={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      const file = createMockFile("", "empty.csv", "text/csv");
      const input = screen.getByTestId("file-input");

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });
    });
  });

  describe("Import Action", () => {
    it("should call onImport with parsed data when confirmed", async () => {
      const user = userEvent.setup();

      render(
        <CSVImportDialog
          open={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      const file = createMockFile(validCSV, "operations.csv", "text/csv");
      const input = screen.getByTestId("file-input");

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByTestId("import-preview")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /import/i }));

      expect(mockOnImport).toHaveBeenCalled();
      expect(mockOnImport.mock.calls[0][0]).toHaveLength(3); // 3 operations
    });

    it("should close dialog after import", async () => {
      const user = userEvent.setup();

      render(
        <CSVImportDialog
          open={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      const file = createMockFile(validCSV, "operations.csv", "text/csv");
      const input = screen.getByTestId("file-input");

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByTestId("import-preview")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /import/i }));

      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
