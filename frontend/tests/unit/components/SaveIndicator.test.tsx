/**
 * Component Tests for SaveIndicator
 * Tests save status display component
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { SaveIndicator, SaveIndicatorProps } from "../../../src/components/forms/SaveIndicator";

describe("SaveIndicator", () => {
  const defaultProps: SaveIndicatorProps = {
    isSaving: false,
    lastSaved: null,
    error: null,
  };

  describe("Saving State", () => {
    it("should show 'Saving...' when isSaving is true", () => {
      render(<SaveIndicator {...defaultProps} isSaving={true} />);

      expect(screen.getByText("Saving...")).toBeInTheDocument();
    });

    it("should show saving spinner when isSaving is true", () => {
      render(<SaveIndicator {...defaultProps} isSaving={true} />);

      expect(screen.getByTestId("saving-spinner")).toBeInTheDocument();
    });

    it("should have aria-live for screen reader announcements", () => {
      render(<SaveIndicator {...defaultProps} isSaving={true} />);

      const indicator = screen.getByRole("status");
      expect(indicator).toHaveAttribute("aria-live", "polite");
    });
  });

  describe("Saved State", () => {
    it("should show 'Saved' with timestamp when lastSaved is provided", () => {
      const lastSaved = Date.now() - 5000; // 5 seconds ago
      render(<SaveIndicator {...defaultProps} lastSaved={lastSaved} />);

      expect(screen.getByText(/Saved/)).toBeInTheDocument();
    });

    it("should show relative time (just now) for recent saves", () => {
      const lastSaved = Date.now() - 2000; // 2 seconds ago
      render(<SaveIndicator {...defaultProps} lastSaved={lastSaved} />);

      expect(screen.getByText(/just now/i)).toBeInTheDocument();
    });

    it("should show checkmark icon when saved", () => {
      render(<SaveIndicator {...defaultProps} lastSaved={Date.now()} />);

      expect(screen.getByTestId("saved-icon")).toBeInTheDocument();
    });

    it("should format time as 'X minutes ago'", () => {
      const lastSaved = Date.now() - 120000; // 2 minutes ago
      render(<SaveIndicator {...defaultProps} lastSaved={lastSaved} />);

      expect(screen.getByText(/2 minutes ago/i)).toBeInTheDocument();
    });
  });

  describe("Error State", () => {
    it("should show error message when error is provided", () => {
      render(
        <SaveIndicator
          {...defaultProps}
          error={{ type: "storage", message: "Save failed" }}
        />
      );

      expect(screen.getByText(/Save failed/)).toBeInTheDocument();
    });

    it("should show error icon when error is present", () => {
      render(
        <SaveIndicator
          {...defaultProps}
          error={{ type: "quota", message: "Quota exceeded" }}
        />
      );

      expect(screen.getByTestId("error-icon")).toBeInTheDocument();
    });

    it("should apply error styling when error is present", () => {
      render(
        <SaveIndicator
          {...defaultProps}
          error={{ type: "storage", message: "Error" }}
        />
      );

      const indicator = screen.getByRole("status");
      expect(indicator).toHaveClass("text-destructive");
    });

    it("should show quota-specific message for quota errors", () => {
      render(
        <SaveIndicator
          {...defaultProps}
          error={{ type: "quota", message: "Storage full" }}
        />
      );

      expect(screen.getByText(/Storage full/)).toBeInTheDocument();
    });
  });

  describe("Idle State", () => {
    it("should show nothing when no state to display", () => {
      const { container } = render(<SaveIndicator {...defaultProps} />);

      // Should be empty or have minimal content
      expect(container.textContent).toBe("");
    });

    it("should show placeholder when showIdle is true", () => {
      render(<SaveIndicator {...defaultProps} showIdle />);

      expect(screen.getByText(/Not saved/i)).toBeInTheDocument();
    });
  });

  describe("Priority", () => {
    it("should show saving state over saved state", () => {
      render(
        <SaveIndicator
          {...defaultProps}
          isSaving={true}
          lastSaved={Date.now()}
        />
      );

      expect(screen.getByText("Saving...")).toBeInTheDocument();
      expect(screen.queryByTestId("saved-icon")).not.toBeInTheDocument();
    });

    it("should show error state over saved state", () => {
      render(
        <SaveIndicator
          {...defaultProps}
          lastSaved={Date.now()}
          error={{ type: "storage", message: "Failed" }}
        />
      );

      expect(screen.getByText(/Failed/)).toBeInTheDocument();
      expect(screen.queryByText(/Saved/)).not.toBeInTheDocument();
    });

    it("should show saving state over error state", () => {
      render(
        <SaveIndicator
          {...defaultProps}
          isSaving={true}
          error={{ type: "storage", message: "Failed" }}
        />
      );

      expect(screen.getByText("Saving...")).toBeInTheDocument();
      expect(screen.queryByText(/Failed/)).not.toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have role=status for live region", () => {
      render(<SaveIndicator {...defaultProps} isSaving={true} />);

      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("should announce saving to screen readers", () => {
      render(<SaveIndicator {...defaultProps} isSaving={true} />);

      const indicator = screen.getByRole("status");
      expect(indicator).toHaveAttribute("aria-live", "polite");
    });

    it("should have accessible label for saving spinner", () => {
      render(<SaveIndicator {...defaultProps} isSaving={true} />);

      const spinner = screen.getByTestId("saving-spinner");
      expect(spinner).toHaveAttribute("aria-label", "Saving");
    });
  });

  describe("Custom Styling", () => {
    it("should accept custom className", () => {
      render(
        <SaveIndicator {...defaultProps} className="custom-class" isSaving />
      );

      const indicator = screen.getByRole("status");
      expect(indicator).toHaveClass("custom-class");
    });

    it("should accept compact size variant", () => {
      render(<SaveIndicator {...defaultProps} size="compact" isSaving />);

      const indicator = screen.getByRole("status");
      expect(indicator).toHaveClass("text-xs");
    });

    it("should accept default size variant", () => {
      render(<SaveIndicator {...defaultProps} size="default" isSaving />);

      const indicator = screen.getByRole("status");
      expect(indicator).toHaveClass("text-sm");
    });
  });
});
