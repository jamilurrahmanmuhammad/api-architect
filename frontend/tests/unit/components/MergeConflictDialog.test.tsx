/**
 * Component Tests for MergeConflictDialog
 * Tests conflict detection, resolution UI, and merge operations
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MergeConflictDialog } from "../../../src/components/forms/MergeConflictDialog";

describe("MergeConflictDialog", () => {
  const mockExistingOas = {
    openapi: "3.0.0",
    info: { title: "Existing API", version: "1.0.0" },
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

  const mockIncomingOas = {
    openapi: "3.0.0",
    info: { title: "Imported API", version: "2.0.0" },
    paths: {
      "/users": {
        get: {
          operationId: "getUsers",
          summary: "Get users (updated)",
          responses: { "200": { description: "Success" } },
        },
      },
      "/products": {
        get: {
          operationId: "getProducts",
          summary: "Get products",
          responses: { "200": { description: "OK" } },
        },
      },
    },
  };

  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    existingOas: mockExistingOas,
    incomingOas: mockIncomingOas,
    onResolve: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render dialog when open", () => {
      render(<MergeConflictDialog {...defaultProps} />);

      expect(screen.getByText(/merge conflicts/i)).toBeInTheDocument();
    });

    it("should not render when closed", () => {
      render(<MergeConflictDialog {...defaultProps} open={false} />);

      expect(screen.queryByText(/merge conflicts/i)).not.toBeInTheDocument();
    });

    it("should show conflict count", () => {
      render(<MergeConflictDialog {...defaultProps} />);

      // 2 conflicts: info version + /users GET operation
      expect(screen.getByText(/2 conflicts/i)).toBeInTheDocument();
    });
  });

  describe("Conflict Detection", () => {
    it("should detect path conflicts", () => {
      render(<MergeConflictDialog {...defaultProps} />);

      // /users GET exists in both with different content
      expect(screen.getByText(/\/users/)).toBeInTheDocument();
    });

    it("should show info version conflict", () => {
      render(<MergeConflictDialog {...defaultProps} />);

      expect(screen.getByText(/1\.0\.0/)).toBeInTheDocument();
      expect(screen.getByText(/2\.0\.0/)).toBeInTheDocument();
    });

    it("should show new paths as additions", () => {
      render(<MergeConflictDialog {...defaultProps} />);

      expect(screen.getByText(/\/products/)).toBeInTheDocument();
    });
  });

  describe("Resolution Options", () => {
    it("should have Keep Existing option", () => {
      render(<MergeConflictDialog {...defaultProps} />);

      expect(screen.getByRole("button", { name: /keep existing/i })).toBeInTheDocument();
    });

    it("should have Use Incoming option", () => {
      render(<MergeConflictDialog {...defaultProps} />);

      expect(screen.getByRole("button", { name: /use incoming/i })).toBeInTheDocument();
    });

    it("should have Merge Both option", () => {
      render(<MergeConflictDialog {...defaultProps} />);

      expect(screen.getByRole("button", { name: /merge both/i })).toBeInTheDocument();
    });
  });

  describe("Resolution Actions", () => {
    it("should call onResolve with existing when Keep Existing clicked", async () => {
      const user = userEvent.setup();
      render(<MergeConflictDialog {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /keep existing/i }));

      expect(defaultProps.onResolve).toHaveBeenCalledWith(
        expect.objectContaining({
          strategy: "keep-existing",
        })
      );
    });

    it("should call onResolve with incoming when Use Incoming clicked", async () => {
      const user = userEvent.setup();
      render(<MergeConflictDialog {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /use incoming/i }));

      expect(defaultProps.onResolve).toHaveBeenCalledWith(
        expect.objectContaining({
          strategy: "use-incoming",
        })
      );
    });

    it("should call onResolve with merged when Merge Both clicked", async () => {
      const user = userEvent.setup();
      render(<MergeConflictDialog {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /merge both/i }));

      expect(defaultProps.onResolve).toHaveBeenCalledWith(
        expect.objectContaining({
          strategy: "merge-both",
        })
      );
    });
  });

  describe("Cancel", () => {
    it("should have cancel button", () => {
      render(<MergeConflictDialog {...defaultProps} />);

      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    });

    it("should call onOpenChange when cancel clicked", async () => {
      const user = userEvent.setup();
      render(<MergeConflictDialog {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /cancel/i }));

      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe("No Conflicts", () => {
    it("should show no conflicts message when data is identical", () => {
      render(
        <MergeConflictDialog
          {...defaultProps}
          incomingOas={mockExistingOas}
        />
      );

      // Multiple "No Conflicts" elements (title + message)
      expect(screen.getAllByText(/no conflicts/i).length).toBeGreaterThan(0);
    });

    it("should have Apply button when no conflicts", () => {
      render(
        <MergeConflictDialog
          {...defaultProps}
          incomingOas={mockExistingOas}
        />
      );

      expect(screen.getByRole("button", { name: /apply/i })).toBeInTheDocument();
    });
  });

  describe("Conflict Preview", () => {
    it("should show side-by-side comparison", () => {
      render(<MergeConflictDialog {...defaultProps} />);

      // Multiple "Existing" and "Incoming" labels exist - just verify at least one
      expect(screen.getAllByText(/existing/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/incoming/i).length).toBeGreaterThan(0);
    });
  });
});
