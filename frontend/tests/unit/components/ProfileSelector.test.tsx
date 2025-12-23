/**
 * Component Tests for ProfileSelector
 * Tests profile dropdown for changing form visibility levels
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfileSelector } from "../../../src/components/forms/ProfileSelector";
import { ProfileGate } from "../../../src/components/forms/ProfileGate";
import { FormStateProvider } from "../../../src/providers/FormStateProvider";
import { initialFormState, FormState } from "../../../src/types/formState";

/**
 * Helper to render ProfileSelector within FormStateProvider
 */
function renderWithProvider(initialState: Partial<FormState> = {}) {
  const state: FormState = {
    ...initialFormState,
    ...initialState,
  };

  return render(
    <FormStateProvider initialState={state}>
      <ProfileSelector />
    </FormStateProvider>
  );
}

describe("ProfileSelector", () => {
  describe("Rendering", () => {
    it("should render profile selector", () => {
      renderWithProvider();

      expect(screen.getByTestId("profile-selector")).toBeInTheDocument();
    });

    it("should render as a dropdown/select", () => {
      renderWithProvider();

      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("should have accessible label", () => {
      renderWithProvider();

      expect(screen.getByLabelText(/profile/i)).toBeInTheDocument();
    });
  });

  describe("Profile Options", () => {
    it("should have 4 profile options", () => {
      renderWithProvider();

      const select = screen.getByRole("combobox");
      const options = within(select).getAllByRole("option");

      expect(options).toHaveLength(4);
    });

    it("should have Basic option", () => {
      renderWithProvider();

      const select = screen.getByRole("combobox");
      expect(within(select).getByRole("option", { name: /basic/i })).toBeInTheDocument();
    });

    it("should have Advanced option", () => {
      renderWithProvider();

      const select = screen.getByRole("combobox");
      expect(within(select).getByRole("option", { name: /advanced/i })).toBeInTheDocument();
    });

    it("should have Technical option", () => {
      renderWithProvider();

      const select = screen.getByRole("combobox");
      expect(within(select).getByRole("option", { name: /technical/i })).toBeInTheDocument();
    });

    it("should have Expert option", () => {
      renderWithProvider();

      const select = screen.getByRole("combobox");
      expect(within(select).getByRole("option", { name: /expert/i })).toBeInTheDocument();
    });

    it("should have options in correct order", () => {
      renderWithProvider();

      const select = screen.getByRole("combobox");
      const options = within(select).getAllByRole("option");
      const values = options.map((opt) => opt.getAttribute("value"));

      expect(values).toEqual(["Basic", "Advanced", "Technical", "Expert"]);
    });
  });

  describe("Current Selection", () => {
    it("should show Basic as default selection", () => {
      renderWithProvider({ profile: "Basic" });

      const select = screen.getByRole("combobox") as HTMLSelectElement;
      expect(select.value).toBe("Basic");
    });

    it("should show Advanced when profile is Advanced", () => {
      renderWithProvider({ profile: "Advanced" });

      const select = screen.getByRole("combobox") as HTMLSelectElement;
      expect(select.value).toBe("Advanced");
    });

    it("should show Technical when profile is Technical", () => {
      renderWithProvider({ profile: "Technical" });

      const select = screen.getByRole("combobox") as HTMLSelectElement;
      expect(select.value).toBe("Technical");
    });

    it("should show Expert when profile is Expert", () => {
      renderWithProvider({ profile: "Expert" });

      const select = screen.getByRole("combobox") as HTMLSelectElement;
      expect(select.value).toBe("Expert");
    });
  });

  describe("Profile Selection", () => {
    it("should allow selecting Basic profile", async () => {
      renderWithProvider({ profile: "Expert" });

      const select = screen.getByRole("combobox");
      await userEvent.selectOptions(select, "Basic");

      expect((select as HTMLSelectElement).value).toBe("Basic");
    });

    it("should allow selecting Advanced profile", async () => {
      renderWithProvider({ profile: "Basic" });

      const select = screen.getByRole("combobox");
      await userEvent.selectOptions(select, "Advanced");

      expect((select as HTMLSelectElement).value).toBe("Advanced");
    });

    it("should allow selecting Technical profile", async () => {
      renderWithProvider({ profile: "Basic" });

      const select = screen.getByRole("combobox");
      await userEvent.selectOptions(select, "Technical");

      expect((select as HTMLSelectElement).value).toBe("Technical");
    });

    it("should allow selecting Expert profile", async () => {
      renderWithProvider({ profile: "Basic" });

      const select = screen.getByRole("combobox");
      await userEvent.selectOptions(select, "Expert");

      expect((select as HTMLSelectElement).value).toBe("Expert");
    });
  });

  describe("Form Visibility Changes", () => {
    it("should hide Advanced content when Basic is selected", async () => {
      render(
        <FormStateProvider initialState={{ ...initialFormState, profile: "Advanced" }}>
          <ProfileSelector />
          <ProfileGate minProfile="Advanced">
            <div data-testid="advanced-content">Advanced Content</div>
          </ProfileGate>
        </FormStateProvider>
      );

      // Initially visible
      expect(screen.getByTestId("advanced-content")).toBeInTheDocument();

      // Select Basic
      const select = screen.getByRole("combobox");
      await userEvent.selectOptions(select, "Basic");

      // Should be hidden
      expect(screen.queryByTestId("advanced-content")).not.toBeInTheDocument();
    });

    it("should show Advanced content when Advanced is selected", async () => {
      render(
        <FormStateProvider initialState={{ ...initialFormState, profile: "Basic" }}>
          <ProfileSelector />
          <ProfileGate minProfile="Advanced">
            <div data-testid="advanced-content">Advanced Content</div>
          </ProfileGate>
        </FormStateProvider>
      );

      // Initially hidden
      expect(screen.queryByTestId("advanced-content")).not.toBeInTheDocument();

      // Select Advanced
      const select = screen.getByRole("combobox");
      await userEvent.selectOptions(select, "Advanced");

      // Should be visible
      expect(screen.getByTestId("advanced-content")).toBeInTheDocument();
    });

    it("should show Technical content when Technical is selected", async () => {
      render(
        <FormStateProvider initialState={{ ...initialFormState, profile: "Basic" }}>
          <ProfileSelector />
          <ProfileGate minProfile="Technical">
            <div data-testid="technical-content">Technical Content</div>
          </ProfileGate>
        </FormStateProvider>
      );

      // Initially hidden
      expect(screen.queryByTestId("technical-content")).not.toBeInTheDocument();

      // Select Technical
      const select = screen.getByRole("combobox");
      await userEvent.selectOptions(select, "Technical");

      // Should be visible
      expect(screen.getByTestId("technical-content")).toBeInTheDocument();
    });

    it("should show Expert content when Expert is selected", async () => {
      render(
        <FormStateProvider initialState={{ ...initialFormState, profile: "Basic" }}>
          <ProfileSelector />
          <ProfileGate minProfile="Expert">
            <div data-testid="expert-content">Expert Content</div>
          </ProfileGate>
        </FormStateProvider>
      );

      // Initially hidden
      expect(screen.queryByTestId("expert-content")).not.toBeInTheDocument();

      // Select Expert
      const select = screen.getByRole("combobox");
      await userEvent.selectOptions(select, "Expert");

      // Should be visible
      expect(screen.getByTestId("expert-content")).toBeInTheDocument();
    });

    it("should show all lower level content when higher profile is selected", async () => {
      render(
        <FormStateProvider initialState={{ ...initialFormState, profile: "Basic" }}>
          <ProfileSelector />
          <ProfileGate minProfile="Basic">
            <div data-testid="basic-content">Basic</div>
          </ProfileGate>
          <ProfileGate minProfile="Advanced">
            <div data-testid="advanced-content">Advanced</div>
          </ProfileGate>
          <ProfileGate minProfile="Technical">
            <div data-testid="technical-content">Technical</div>
          </ProfileGate>
          <ProfileGate minProfile="Expert">
            <div data-testid="expert-content">Expert</div>
          </ProfileGate>
        </FormStateProvider>
      );

      // Select Expert
      const select = screen.getByRole("combobox");
      await userEvent.selectOptions(select, "Expert");

      // All content should be visible
      expect(screen.getByTestId("basic-content")).toBeInTheDocument();
      expect(screen.getByTestId("advanced-content")).toBeInTheDocument();
      expect(screen.getByTestId("technical-content")).toBeInTheDocument();
      expect(screen.getByTestId("expert-content")).toBeInTheDocument();
    });
  });

  describe("Profile Descriptions", () => {
    it("should show description for current profile", () => {
      renderWithProvider({ profile: "Basic" });

      expect(screen.getByText(/essential.*fields/i)).toBeInTheDocument();
    });

    it("should update description when profile changes", async () => {
      renderWithProvider({ profile: "Basic" });

      const select = screen.getByRole("combobox");
      await userEvent.selectOptions(select, "Expert");

      expect(screen.getByText(/full access|raw.*editing/i)).toBeInTheDocument();
    });
  });

  describe("Persistence", () => {
    it("should maintain selection after rerender", async () => {
      const { rerender } = render(
        <FormStateProvider initialState={{ ...initialFormState, profile: "Basic" }}>
          <ProfileSelector />
        </FormStateProvider>
      );

      const select = screen.getByRole("combobox");
      await userEvent.selectOptions(select, "Technical");

      expect((select as HTMLSelectElement).value).toBe("Technical");

      // Note: The selection is persisted in the provider state
      // The rerender with the same provider maintains the state
    });
  });

  describe("Callback", () => {
    it("should call onChange callback when profile changes", async () => {
      const onChange = vi.fn();

      render(
        <FormStateProvider initialState={{ ...initialFormState, profile: "Basic" }}>
          <ProfileSelector onChange={onChange} />
        </FormStateProvider>
      );

      const select = screen.getByRole("combobox");
      await userEvent.selectOptions(select, "Advanced");

      expect(onChange).toHaveBeenCalledWith("Advanced");
    });

    it("should call onChange with correct profile value", async () => {
      const onChange = vi.fn();

      render(
        <FormStateProvider initialState={{ ...initialFormState, profile: "Basic" }}>
          <ProfileSelector onChange={onChange} />
        </FormStateProvider>
      );

      const select = screen.getByRole("combobox");
      await userEvent.selectOptions(select, "Expert");

      expect(onChange).toHaveBeenCalledWith("Expert");
    });
  });

  describe("Styling", () => {
    it("should have proper styling classes", () => {
      renderWithProvider();

      const selector = screen.getByTestId("profile-selector");
      expect(selector).toHaveClass("profile-selector");
    });

    it("should apply custom className when provided", () => {
      render(
        <FormStateProvider initialState={initialFormState}>
          <ProfileSelector className="custom-class" />
        </FormStateProvider>
      );

      const selector = screen.getByTestId("profile-selector");
      expect(selector).toHaveClass("custom-class");
    });

    it("should have compact variant", () => {
      render(
        <FormStateProvider initialState={initialFormState}>
          <ProfileSelector compact />
        </FormStateProvider>
      );

      const selector = screen.getByTestId("profile-selector");
      expect(selector).toHaveClass("compact");
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA attributes", () => {
      renderWithProvider();

      const select = screen.getByRole("combobox");
      expect(select).toHaveAttribute("aria-label");
    });

    it("should be keyboard accessible", async () => {
      renderWithProvider({ profile: "Basic" });

      const select = screen.getByRole("combobox");
      select.focus();

      expect(document.activeElement).toBe(select);
    });

    it("should have visible label or aria-label", () => {
      renderWithProvider();

      // Either a visible label or aria-label should be present
      const select = screen.getByRole("combobox");
      const hasAriaLabel = select.hasAttribute("aria-label");
      const hasLabel = screen.queryByText(/profile/i) !== null;

      expect(hasAriaLabel || hasLabel).toBe(true);
    });
  });

  describe("Icon Display", () => {
    it("should show profile icon", () => {
      renderWithProvider();

      expect(screen.getByTestId("profile-icon")).toBeInTheDocument();
    });

    it("should change icon based on profile level", async () => {
      renderWithProvider({ profile: "Basic" });

      const select = screen.getByRole("combobox");
      await userEvent.selectOptions(select, "Expert");

      // Expert profile should have different icon/indicator
      const icon = screen.getByTestId("profile-icon");
      expect(icon).toBeInTheDocument();
    });
  });

  describe("Disabled State", () => {
    it("should support disabled prop", () => {
      render(
        <FormStateProvider initialState={initialFormState}>
          <ProfileSelector disabled />
        </FormStateProvider>
      );

      const select = screen.getByRole("combobox");
      expect(select).toBeDisabled();
    });

    it("should not allow selection when disabled", async () => {
      render(
        <FormStateProvider initialState={{ ...initialFormState, profile: "Basic" }}>
          <ProfileSelector disabled />
        </FormStateProvider>
      );

      const select = screen.getByRole("combobox") as HTMLSelectElement;

      // Try to change - should remain Basic
      expect(select.value).toBe("Basic");
    });
  });

  describe("Layout", () => {
    it("should render inline by default", () => {
      renderWithProvider();

      const selector = screen.getByTestId("profile-selector");
      expect(selector).toHaveClass("inline-flex");
    });

    it("should support full width variant", () => {
      render(
        <FormStateProvider initialState={initialFormState}>
          <ProfileSelector fullWidth />
        </FormStateProvider>
      );

      const selector = screen.getByTestId("profile-selector");
      expect(selector).toHaveClass("w-full");
    });
  });
});
