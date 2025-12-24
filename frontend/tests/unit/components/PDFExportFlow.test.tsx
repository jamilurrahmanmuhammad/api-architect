/**
 * Component Tests for PDFExportFlow
 * Tests PDF generation, preview, and download
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PDFExportFlow } from "../../../src/components/forms/PDFExportFlow";

// Mock URL APIs
const mockCreateObjectURL = vi.fn(() => "blob:mock-pdf-url");
const mockRevokeObjectURL = vi.fn();
global.URL.createObjectURL = mockCreateObjectURL;
global.URL.revokeObjectURL = mockRevokeObjectURL;

describe("PDFExportFlow", () => {
  const mockOasData = {
    openapi: "3.0.0",
    info: { title: "Test API", version: "1.0.0", description: "A test API" },
    paths: {
      "/users": {
        get: {
          operationId: "getUsers",
          summary: "Get all users",
          responses: { "200": { description: "OK" } },
        },
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render Generate PDF button", () => {
      render(<PDFExportFlow oasData={mockOasData} />);

      expect(screen.getByRole("button", { name: /generate pdf/i })).toBeInTheDocument();
    });

    it("should be disabled when no content", () => {
      const emptyOas = {
        openapi: "3.0.0",
        info: { title: "", version: "" },
        paths: {},
      };

      render(<PDFExportFlow oasData={emptyOas} />);

      expect(screen.getByRole("button", { name: /generate pdf/i })).toBeDisabled();
    });
  });

  describe("Loading State", () => {
    it("should show loading spinner while generating", async () => {
      const user = userEvent.setup();
      render(<PDFExportFlow oasData={mockOasData} />);

      await user.click(screen.getByRole("button", { name: /generate pdf/i }));

      // Should show loading state briefly
      await waitFor(() => {
        const button = screen.getByRole("button", { name: /generating/i });
        expect(button).toBeInTheDocument();
      });
    });

    it("should disable button while generating", async () => {
      const user = userEvent.setup();
      render(<PDFExportFlow oasData={mockOasData} />);

      await user.click(screen.getByRole("button", { name: /generate pdf/i }));

      await waitFor(() => {
        const button = screen.getByRole("button", { name: /generating/i });
        expect(button).toBeDisabled();
      });
    });
  });

  describe("PDF Preview", () => {
    it("should show preview dialog after generation", async () => {
      const user = userEvent.setup();
      render(<PDFExportFlow oasData={mockOasData} />);

      await user.click(screen.getByRole("button", { name: /generate pdf/i }));

      await waitFor(() => {
        expect(screen.getByTestId("pdf-preview")).toBeInTheDocument();
      });
    });

    it("should show iframe with PDF", async () => {
      const user = userEvent.setup();
      render(<PDFExportFlow oasData={mockOasData} />);

      await user.click(screen.getByRole("button", { name: /generate pdf/i }));

      await waitFor(() => {
        const iframe = screen.getByTestId("pdf-iframe");
        expect(iframe).toBeInTheDocument();
      });
    });

    it("should have download button in preview", async () => {
      const user = userEvent.setup();
      render(<PDFExportFlow oasData={mockOasData} />);

      await user.click(screen.getByRole("button", { name: /generate pdf/i }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /download/i })).toBeInTheDocument();
      });
    });

    it("should have close button in preview", async () => {
      const user = userEvent.setup();
      render(<PDFExportFlow oasData={mockOasData} />);

      await user.click(screen.getByRole("button", { name: /generate pdf/i }));

      await waitFor(() => {
        // Look for button with exact "Close" text (our button has "Close" as text content)
        const closeButtons = screen.getAllByRole("button", { name: /close/i });
        expect(closeButtons.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Close Preview", () => {
    it("should close preview when close clicked", async () => {
      const user = userEvent.setup();
      render(<PDFExportFlow oasData={mockOasData} />);

      await user.click(screen.getByRole("button", { name: /generate pdf/i }));

      await waitFor(() => {
        expect(screen.getByTestId("pdf-preview")).toBeInTheDocument();
      });

      // Click the first close button (our custom one)
      const closeButtons = screen.getAllByRole("button", { name: /close/i });
      await user.click(closeButtons[0]);

      await waitFor(() => {
        expect(screen.queryByTestId("pdf-preview")).not.toBeInTheDocument();
      });
    });
  });

  describe("Callback", () => {
    it("should call onGenerate callback", async () => {
      const onGenerate = vi.fn();
      const user = userEvent.setup();

      render(<PDFExportFlow oasData={mockOasData} onGenerate={onGenerate} />);

      await user.click(screen.getByRole("button", { name: /generate pdf/i }));

      await waitFor(() => {
        expect(onGenerate).toHaveBeenCalled();
      });
    });
  });
});
