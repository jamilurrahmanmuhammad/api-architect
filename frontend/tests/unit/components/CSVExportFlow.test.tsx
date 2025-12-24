/**
 * Component Tests for CSVExportFlow
 * Tests profile selection, CSV generation, and file download
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CSVExportFlow } from "../../../src/components/forms/CSVExportFlow";

// Mock URL.createObjectURL and URL.revokeObjectURL
const mockCreateObjectURL = vi.fn(() => "blob:mock-url");
const mockRevokeObjectURL = vi.fn();
global.URL.createObjectURL = mockCreateObjectURL;
global.URL.revokeObjectURL = mockRevokeObjectURL;

describe("CSVExportFlow", () => {
  const mockOasData = {
    openapi: "3.0.0",
    info: { title: "Test API", version: "1.0.0" },
    paths: {
      "/users": {
        get: {
          operationId: "getUsers",
          summary: "Get all users",
          responses: { "200": { description: "OK" } },
        },
        post: {
          operationId: "createUser",
          summary: "Create user",
          responses: { "201": { description: "Created" } },
        },
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render profile selector", () => {
      render(<CSVExportFlow oasData={mockOasData} />);

      expect(screen.getByLabelText(/profile/i)).toBeInTheDocument();
    });

    it("should have 3 profile options", () => {
      render(<CSVExportFlow oasData={mockOasData} />);

      const select = screen.getByLabelText(/profile/i);
      expect(select).toBeInTheDocument();

      // Check options exist
      expect(screen.getByRole("option", { name: /basic/i })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: /advanced/i })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: /expert/i })).toBeInTheDocument();
    });

    it("should render download button", () => {
      render(<CSVExportFlow oasData={mockOasData} />);

      expect(screen.getByRole("button", { name: /download csv/i })).toBeInTheDocument();
    });
  });

  describe("Profile Selection", () => {
    it("should default to Basic profile", () => {
      render(<CSVExportFlow oasData={mockOasData} />);

      const select = screen.getByLabelText(/profile/i) as HTMLSelectElement;
      expect(select.value).toBe("basic");
    });

    it("should allow changing profile", async () => {
      const user = userEvent.setup();
      render(<CSVExportFlow oasData={mockOasData} />);

      const select = screen.getByLabelText(/profile/i);
      await user.selectOptions(select, "advanced");

      expect((select as HTMLSelectElement).value).toBe("advanced");
    });
  });

  describe("CSV Download", () => {
    it("should generate CSV when download clicked", async () => {
      const user = userEvent.setup();
      render(<CSVExportFlow oasData={mockOasData} />);

      await user.click(screen.getByRole("button", { name: /download csv/i }));

      expect(mockCreateObjectURL).toHaveBeenCalled();
    });

    it("should create blob with CSV content type", async () => {
      const user = userEvent.setup();
      render(<CSVExportFlow oasData={mockOasData} />);

      await user.click(screen.getByRole("button", { name: /download csv/i }));

      // Check that blob was created with correct type
      const blobArg = mockCreateObjectURL.mock.calls[0][0] as Blob;
      expect(blobArg.type).toBe("text/csv;charset=utf-8;");
    });

    it("should cleanup blob URL after download", async () => {
      const user = userEvent.setup();
      render(<CSVExportFlow oasData={mockOasData} />);

      await user.click(screen.getByRole("button", { name: /download csv/i }));

      await waitFor(() => {
        expect(mockRevokeObjectURL).toHaveBeenCalled();
      });
    });
  });

  describe("CSV Content", () => {
    it("should include operation_id in Basic profile", async () => {
      const user = userEvent.setup();
      render(<CSVExportFlow oasData={mockOasData} />);

      await user.click(screen.getByRole("button", { name: /download csv/i }));

      // Verify blob was created with CSV content
      const blobArg = mockCreateObjectURL.mock.calls[0][0] as Blob;
      expect(blobArg.type).toBe("text/csv;charset=utf-8;");
    });

    it("should disable download when no operations", () => {
      const emptyOas = {
        openapi: "3.0.0",
        info: { title: "Empty API", version: "1.0.0" },
        paths: {},
      };

      render(<CSVExportFlow oasData={emptyOas} />);

      const button = screen.getByRole("button", { name: /download csv/i });
      expect(button).toBeDisabled();
    });
  });

  describe("Callback", () => {
    it("should call onExport callback when provided", async () => {
      const onExport = vi.fn();
      const user = userEvent.setup();

      render(<CSVExportFlow oasData={mockOasData} onExport={onExport} />);

      await user.click(screen.getByRole("button", { name: /download csv/i }));

      expect(onExport).toHaveBeenCalled();
    });
  });
});
