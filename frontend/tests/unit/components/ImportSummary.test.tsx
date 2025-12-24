/**
 * Component Tests for ImportSummary
 * Tests import summary display and undo functionality
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { ImportSummary } from "../../../src/components/forms/ImportSummary";

describe("ImportSummary", () => {
  const mockImportResult = {
    source: "file.json",
    timestamp: Date.now(),
    addedPaths: ["/users", "/products"],
    modifiedPaths: ["/orders"],
    unchangedPaths: ["/health"],
    totalOperations: 8,
  };

  const defaultProps = {
    result: mockImportResult,
    onUndo: vi.fn(),
    onDismiss: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render import summary", () => {
      render(<ImportSummary {...defaultProps} />);

      expect(screen.getByText(/import complete/i)).toBeInTheDocument();
    });

    it("should show source filename", () => {
      render(<ImportSummary {...defaultProps} />);

      expect(screen.getByText(/file\.json/)).toBeInTheDocument();
    });

    it("should show added paths count", () => {
      render(<ImportSummary {...defaultProps} />);

      expect(screen.getByText(/2 added/i)).toBeInTheDocument();
    });

    it("should show modified paths count", () => {
      render(<ImportSummary {...defaultProps} />);

      expect(screen.getByText(/1 modified/i)).toBeInTheDocument();
    });

    it("should show unchanged paths count", () => {
      render(<ImportSummary {...defaultProps} />);

      expect(screen.getByText(/1 unchanged/i)).toBeInTheDocument();
    });
  });

  describe("Undo", () => {
    it("should have undo button", () => {
      render(<ImportSummary {...defaultProps} />);

      expect(screen.getByRole("button", { name: /undo/i })).toBeInTheDocument();
    });

    it("should call onUndo when clicked", () => {
      render(<ImportSummary {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /undo/i }));

      expect(defaultProps.onUndo).toHaveBeenCalled();
    });

    it("should disable undo after timeout", async () => {
      vi.useFakeTimers();
      render(<ImportSummary {...defaultProps} undoTimeout={2000} />);

      expect(screen.getByRole("button", { name: /undo/i })).not.toBeDisabled();

      // Advance past timeout
      await vi.advanceTimersByTimeAsync(2001);

      expect(screen.getByRole("button", { name: /undo/i })).toBeDisabled();

      vi.useRealTimers();
    });
  });

  describe("Dismiss", () => {
    it("should have dismiss button", () => {
      render(<ImportSummary {...defaultProps} />);

      expect(screen.getByRole("button", { name: /dismiss/i })).toBeInTheDocument();
    });

    it("should call onDismiss when clicked", () => {
      render(<ImportSummary {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));

      expect(defaultProps.onDismiss).toHaveBeenCalled();
    });
  });

  describe("Details Expansion", () => {
    it("should show details button when paths exist", () => {
      render(<ImportSummary {...defaultProps} />);

      expect(screen.getByRole("button", { name: /details/i })).toBeInTheDocument();
    });

    it("should expand to show path list", () => {
      render(<ImportSummary {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /details/i }));

      expect(screen.getByText("/users")).toBeInTheDocument();
      expect(screen.getByText("/products")).toBeInTheDocument();
    });
  });

  describe("Empty State", () => {
    it("should handle no changes gracefully", () => {
      const emptyResult = {
        source: "empty.json",
        timestamp: Date.now(),
        addedPaths: [],
        modifiedPaths: [],
        unchangedPaths: [],
        totalOperations: 0,
      };

      render(<ImportSummary {...defaultProps} result={emptyResult} />);

      expect(screen.getByText(/no changes/i)).toBeInTheDocument();
    });
  });

  describe("Timer Display", () => {
    it("should show countdown timer", () => {
      render(<ImportSummary {...defaultProps} undoTimeout={10000} />);

      // Should show some time remaining
      expect(screen.getByText(/\d+s/)).toBeInTheDocument();
    });
  });
});
