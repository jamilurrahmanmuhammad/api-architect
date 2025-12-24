/**
 * Component Tests for ValidationPanel
 * Tests real-time validation feedback display
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ValidationPanel } from "../../../src/components/forms/ValidationPanel";
import { FormStateProvider } from "../../../src/providers/FormStateProvider";
import { initialFormState, FormState, emptyOas } from "../../../src/types/formState";

/**
 * Sample validation errors for testing
 */
const sampleErrors = [
  { path: "/info/title", message: "Title is required", type: "error" as const },
  { path: "/info/version", message: "Version must be semver format", type: "error" as const },
  { path: "/paths/~1pets/get/responses", message: "Operation must have at least one response", type: "error" as const },
];

const sampleWarnings = [
  { path: "/info/description", message: "Description is recommended for better documentation", type: "warning" as const },
  { path: "/paths/~1pets/get/summary", message: "Summary should be less than 120 characters", type: "warning" as const },
];

const mixedErrors = [...sampleErrors, ...sampleWarnings];

/**
 * Helper to render ValidationPanel within FormStateProvider
 */
function renderWithProvider(initialState: Partial<FormState> = {}) {
  const state: FormState = {
    ...initialFormState,
    oasData: emptyOas,
    ...initialState,
  };

  return render(
    <FormStateProvider initialState={state}>
      <ValidationPanel />
    </FormStateProvider>
  );
}

describe("ValidationPanel", () => {
  describe("Error Display", () => {
    it("should render validation panel", () => {
      renderWithProvider();

      expect(screen.getByTestId("validation-panel")).toBeInTheDocument();
    });

    it("should show error count when errors exist", () => {
      renderWithProvider({ errors: sampleErrors });

      expect(screen.getByText(/3.*error/i)).toBeInTheDocument();
    });

    it("should show singular error text for single error", () => {
      renderWithProvider({
        errors: [{ path: "/info/title", message: "Title required", type: "error" }],
      });

      expect(screen.getByText(/1.*error(?!s)/i)).toBeInTheDocument();
    });

    it("should show zero errors when no errors", () => {
      renderWithProvider({ errors: [] });

      // When valid, shows success message instead of "0 errors"
      expect(screen.getByText(/all good|no issues/i)).toBeInTheDocument();
    });

    it("should display error icon for errors section", () => {
      renderWithProvider({ errors: sampleErrors });

      expect(screen.getByTestId("error-icon")).toBeInTheDocument();
    });
  });

  describe("Warning Display", () => {
    it("should show warning count when warnings exist", () => {
      renderWithProvider({ errors: sampleWarnings });

      expect(screen.getByText(/2.*warning/i)).toBeInTheDocument();
    });

    it("should show singular warning text for single warning", () => {
      renderWithProvider({
        errors: [{ path: "/info/desc", message: "Recommended", type: "warning" }],
      });

      expect(screen.getByText(/1.*warning(?!s)/i)).toBeInTheDocument();
    });

    it("should display warning icon for warnings section", () => {
      renderWithProvider({ errors: sampleWarnings });

      expect(screen.getByTestId("warning-icon")).toBeInTheDocument();
    });
  });

  describe("Mixed Errors and Warnings", () => {
    it("should show both error and warning counts", () => {
      renderWithProvider({ errors: mixedErrors });

      expect(screen.getByText(/3.*error/i)).toBeInTheDocument();
      expect(screen.getByText(/2.*warning/i)).toBeInTheDocument();
    });

    it("should list errors before warnings", () => {
      renderWithProvider({ errors: mixedErrors });

      const panel = screen.getByTestId("validation-panel");
      const errorSection = within(panel).getByTestId("errors-section");
      const warningSection = within(panel).getByTestId("warnings-section");

      // Error section should come before warning section
      const allSections = panel.querySelectorAll("[data-testid$='-section']");
      const errorIndex = Array.from(allSections).indexOf(errorSection);
      const warningIndex = Array.from(allSections).indexOf(warningSection);

      expect(errorIndex).toBeLessThan(warningIndex);
    });
  });

  describe("Actionable Error List", () => {
    it("should display list of individual errors", () => {
      renderWithProvider({ errors: sampleErrors });

      expect(screen.getByText("Title is required")).toBeInTheDocument();
      expect(screen.getByText("Version must be semver format")).toBeInTheDocument();
    });

    it("should show error path for each error", () => {
      renderWithProvider({ errors: sampleErrors });

      expect(screen.getByText("/info/title")).toBeInTheDocument();
      expect(screen.getByText("/info/version")).toBeInTheDocument();
    });

    it("should make error items clickable", () => {
      const onErrorClick = vi.fn();
      const state: FormState = {
        ...initialFormState,
        errors: sampleErrors,
      };

      render(
        <FormStateProvider initialState={state}>
          <ValidationPanel onErrorClick={onErrorClick} />
        </FormStateProvider>
      );

      const errorItem = screen.getByText("Title is required").closest("button");
      expect(errorItem).toBeInTheDocument();
    });

    it("should call onErrorClick when error clicked", async () => {
      const onErrorClick = vi.fn();
      const state: FormState = {
        ...initialFormState,
        errors: sampleErrors,
      };

      render(
        <FormStateProvider initialState={state}>
          <ValidationPanel onErrorClick={onErrorClick} />
        </FormStateProvider>
      );

      const errorItem = screen.getByText("Title is required").closest("button");
      await userEvent.click(errorItem!);

      expect(onErrorClick).toHaveBeenCalledWith("/info/title");
    });
  });

  describe("OAS Documentation Links", () => {
    it("should show help link for complex issues", () => {
      renderWithProvider({
        errors: [
          {
            path: "/components/securitySchemes",
            message: "Invalid security scheme format",
            type: "error",
          },
        ],
      });

      expect(screen.getByRole("link", { name: /docs|learn more|help/i })).toBeInTheDocument();
    });

    it("should link to OpenAPI specification", () => {
      renderWithProvider({
        errors: [
          {
            path: "/components/schemas/Pet",
            message: "Invalid schema definition",
            type: "error",
          },
        ],
      });

      const link = screen.getByRole("link", { name: /docs|learn more|help/i });
      expect(link).toHaveAttribute("href", expect.stringContaining("swagger.io"));
    });

    it("should open link in new tab", () => {
      renderWithProvider({
        errors: [
          {
            path: "/paths",
            message: "Path must start with /",
            type: "error",
          },
        ],
      });

      const link = screen.getByRole("link", { name: /docs|learn more|help/i });
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
    });
  });

  describe("Valid State", () => {
    it("should show success message when no errors", () => {
      renderWithProvider({ errors: [] });

      expect(screen.getByText(/valid|no issues|all good/i)).toBeInTheDocument();
    });

    it("should show success icon when valid", () => {
      renderWithProvider({ errors: [] });

      expect(screen.getByTestId("success-icon")).toBeInTheDocument();
    });

    it("should use green styling for valid state", () => {
      renderWithProvider({ errors: [] });

      const panel = screen.getByTestId("validation-panel");
      expect(panel).toHaveClass("border-green-500");
    });
  });

  describe("Error State Styling", () => {
    it("should use red styling when errors present", () => {
      renderWithProvider({ errors: sampleErrors });

      const panel = screen.getByTestId("validation-panel");
      expect(panel).toHaveClass("border-destructive");
    });

    it("should use yellow styling when only warnings", () => {
      renderWithProvider({ errors: sampleWarnings });

      const panel = screen.getByTestId("validation-panel");
      expect(panel).toHaveClass("border-yellow-500");
    });
  });

  describe("Collapsible Behavior", () => {
    it("should have expand/collapse button", () => {
      renderWithProvider({ errors: sampleErrors });

      expect(screen.getByRole("button", { name: /expand|collapse|toggle/i })).toBeInTheDocument();
    });

    it("should expand to show full error list", async () => {
      renderWithProvider({ errors: sampleErrors });

      // Panel starts expanded, all errors should be visible
      expect(screen.getByText("Title is required")).toBeInTheDocument();
      expect(screen.getByText("Version must be semver format")).toBeInTheDocument();
      expect(screen.getByText("Operation must have at least one response")).toBeInTheDocument();
    });

    it("should collapse to hide error details", async () => {
      renderWithProvider({ errors: sampleErrors });

      // Expand first
      const toggleButton = screen.getByRole("button", { name: /expand|collapse|toggle/i });
      await userEvent.click(toggleButton);

      // Then collapse
      await userEvent.click(toggleButton);

      // Error count should still be visible
      expect(screen.getByText(/3.*error/i)).toBeInTheDocument();
    });
  });

  describe("Real-Time Updates", () => {
    it("should display correct state based on errors prop", () => {
      // Test with errors
      const { unmount } = render(
        <FormStateProvider initialState={{ ...initialFormState, errors: sampleErrors }}>
          <ValidationPanel />
        </FormStateProvider>
      );

      expect(screen.getByText(/3.*error/i)).toBeInTheDocument();
      unmount();

      // Test without errors
      render(
        <FormStateProvider initialState={{ ...initialFormState, errors: [] }}>
          <ValidationPanel />
        </FormStateProvider>
      );

      expect(screen.getByText(/all good|no issues/i)).toBeInTheDocument();
    });
  });

  describe("Path Formatting", () => {
    it("should decode JSON pointer paths for display", () => {
      renderWithProvider({
        errors: [
          {
            path: "/paths/~1pets~1{petId}/get",
            message: "Invalid operation",
            type: "error",
          },
        ],
      });

      // ~1 should be decoded to /
      expect(screen.getByText(/\/pets\/\{petId\}/)).toBeInTheDocument();
    });

    it("should show human-readable field names", () => {
      renderWithProvider({
        errors: [{ path: "/info/title", message: "Required", type: "error" }],
      });

      // Should show "info > title" or similar readable format
      expect(screen.getByText(/info.*title/i)).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA attributes", () => {
      renderWithProvider({ errors: sampleErrors });

      const panel = screen.getByTestId("validation-panel");
      expect(panel).toHaveAttribute("role", "region");
      expect(panel).toHaveAttribute("aria-label");
    });

    it("should announce error count to screen readers", () => {
      renderWithProvider({ errors: sampleErrors });

      const liveRegion = screen.getByRole("status");
      expect(liveRegion).toBeInTheDocument();
    });

    it("should have accessible error list", () => {
      renderWithProvider({ errors: sampleErrors });

      const list = screen.getByRole("list");
      expect(list).toBeInTheDocument();
    });
  });

  describe("Layout", () => {
    it("should render with proper spacing", () => {
      renderWithProvider({ errors: sampleErrors });

      const panel = screen.getByTestId("validation-panel");
      expect(panel).toHaveClass("p-4");
    });

    it("should have compact mode option", () => {
      const state: FormState = { ...initialFormState, errors: sampleErrors };

      render(
        <FormStateProvider initialState={state}>
          <ValidationPanel compact />
        </FormStateProvider>
      );

      const panel = screen.getByTestId("validation-panel");
      expect(panel).toHaveClass("p-2");
    });
  });
});
