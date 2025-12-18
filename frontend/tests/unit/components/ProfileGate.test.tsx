/**
 * Component Tests for ProfileGate
 * Tests profile-based conditional rendering
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ReactNode } from "react";
import { ProfileGate, ProfileGateProps } from "../../../src/components/forms/ProfileGate";
import { FormStateProvider } from "../../../src/providers/FormStateProvider";
import { initialFormState, FormState } from "../../../src/types/formState";

/**
 * Helper to render ProfileGate within FormStateProvider
 */
function renderWithProvider(
  ui: ReactNode,
  initialState: Partial<FormState> = {}
) {
  const state: FormState = {
    ...initialFormState,
    ...initialState,
  };

  return render(
    <FormStateProvider initialState={state}>
      {ui}
    </FormStateProvider>
  );
}

describe("ProfileGate", () => {
  describe("Basic Profile", () => {
    it("should show content when profile is Basic and minProfile is Basic", () => {
      renderWithProvider(
        <ProfileGate minProfile="Basic">
          <div data-testid="content">Basic Content</div>
        </ProfileGate>,
        { profile: "Basic" }
      );

      expect(screen.getByTestId("content")).toBeInTheDocument();
      expect(screen.getByText("Basic Content")).toBeInTheDocument();
    });

    it("should hide content when profile is Basic and minProfile is Advanced", () => {
      renderWithProvider(
        <ProfileGate minProfile="Advanced">
          <div data-testid="content">Advanced Content</div>
        </ProfileGate>,
        { profile: "Basic" }
      );

      expect(screen.queryByTestId("content")).not.toBeInTheDocument();
    });

    it("should hide content when profile is Basic and minProfile is Technical", () => {
      renderWithProvider(
        <ProfileGate minProfile="Technical">
          <div data-testid="content">Technical Content</div>
        </ProfileGate>,
        { profile: "Basic" }
      );

      expect(screen.queryByTestId("content")).not.toBeInTheDocument();
    });

    it("should hide content when profile is Basic and minProfile is Expert", () => {
      renderWithProvider(
        <ProfileGate minProfile="Expert">
          <div data-testid="content">Expert Content</div>
        </ProfileGate>,
        { profile: "Basic" }
      );

      expect(screen.queryByTestId("content")).not.toBeInTheDocument();
    });
  });

  describe("Advanced Profile", () => {
    it("should show Basic content when profile is Advanced", () => {
      renderWithProvider(
        <ProfileGate minProfile="Basic">
          <div data-testid="content">Basic Content</div>
        </ProfileGate>,
        { profile: "Advanced" }
      );

      expect(screen.getByTestId("content")).toBeInTheDocument();
    });

    it("should show Advanced content when profile is Advanced", () => {
      renderWithProvider(
        <ProfileGate minProfile="Advanced">
          <div data-testid="content">Advanced Content</div>
        </ProfileGate>,
        { profile: "Advanced" }
      );

      expect(screen.getByTestId("content")).toBeInTheDocument();
    });

    it("should hide Technical content when profile is Advanced", () => {
      renderWithProvider(
        <ProfileGate minProfile="Technical">
          <div data-testid="content">Technical Content</div>
        </ProfileGate>,
        { profile: "Advanced" }
      );

      expect(screen.queryByTestId("content")).not.toBeInTheDocument();
    });

    it("should hide Expert content when profile is Advanced", () => {
      renderWithProvider(
        <ProfileGate minProfile="Expert">
          <div data-testid="content">Expert Content</div>
        </ProfileGate>,
        { profile: "Advanced" }
      );

      expect(screen.queryByTestId("content")).not.toBeInTheDocument();
    });
  });

  describe("Technical Profile", () => {
    it("should show Basic content when profile is Technical", () => {
      renderWithProvider(
        <ProfileGate minProfile="Basic">
          <div data-testid="content">Basic Content</div>
        </ProfileGate>,
        { profile: "Technical" }
      );

      expect(screen.getByTestId("content")).toBeInTheDocument();
    });

    it("should show Advanced content when profile is Technical", () => {
      renderWithProvider(
        <ProfileGate minProfile="Advanced">
          <div data-testid="content">Advanced Content</div>
        </ProfileGate>,
        { profile: "Technical" }
      );

      expect(screen.getByTestId("content")).toBeInTheDocument();
    });

    it("should show Technical content when profile is Technical", () => {
      renderWithProvider(
        <ProfileGate minProfile="Technical">
          <div data-testid="content">Technical Content</div>
        </ProfileGate>,
        { profile: "Technical" }
      );

      expect(screen.getByTestId("content")).toBeInTheDocument();
    });

    it("should hide Expert content when profile is Technical", () => {
      renderWithProvider(
        <ProfileGate minProfile="Expert">
          <div data-testid="content">Expert Content</div>
        </ProfileGate>,
        { profile: "Technical" }
      );

      expect(screen.queryByTestId("content")).not.toBeInTheDocument();
    });
  });

  describe("Expert Profile", () => {
    it("should show Basic content when profile is Expert", () => {
      renderWithProvider(
        <ProfileGate minProfile="Basic">
          <div data-testid="content">Basic Content</div>
        </ProfileGate>,
        { profile: "Expert" }
      );

      expect(screen.getByTestId("content")).toBeInTheDocument();
    });

    it("should show Advanced content when profile is Expert", () => {
      renderWithProvider(
        <ProfileGate minProfile="Advanced">
          <div data-testid="content">Advanced Content</div>
        </ProfileGate>,
        { profile: "Expert" }
      );

      expect(screen.getByTestId("content")).toBeInTheDocument();
    });

    it("should show Technical content when profile is Expert", () => {
      renderWithProvider(
        <ProfileGate minProfile="Technical">
          <div data-testid="content">Technical Content</div>
        </ProfileGate>,
        { profile: "Expert" }
      );

      expect(screen.getByTestId("content")).toBeInTheDocument();
    });

    it("should show Expert content when profile is Expert", () => {
      renderWithProvider(
        <ProfileGate minProfile="Expert">
          <div data-testid="content">Expert Content</div>
        </ProfileGate>,
        { profile: "Expert" }
      );

      expect(screen.getByTestId("content")).toBeInTheDocument();
    });
  });

  describe("Default Behavior", () => {
    it("should default to Basic minProfile when not specified", () => {
      renderWithProvider(
        <ProfileGate>
          <div data-testid="content">Default Content</div>
        </ProfileGate>,
        { profile: "Basic" }
      );

      expect(screen.getByTestId("content")).toBeInTheDocument();
    });

    it("should render children as-is without wrapper by default", () => {
      const { container } = renderWithProvider(
        <ProfileGate minProfile="Basic">
          <span data-testid="content">Content</span>
        </ProfileGate>,
        { profile: "Basic" }
      );

      // Should not wrap content in extra divs
      const content = screen.getByTestId("content");
      expect(content.tagName).toBe("SPAN");
    });
  });

  describe("Fallback Content", () => {
    it("should render fallback when content is hidden", () => {
      renderWithProvider(
        <ProfileGate
          minProfile="Expert"
          fallback={<div data-testid="fallback">Upgrade to Expert</div>}
        >
          <div data-testid="content">Expert Content</div>
        </ProfileGate>,
        { profile: "Basic" }
      );

      expect(screen.queryByTestId("content")).not.toBeInTheDocument();
      expect(screen.getByTestId("fallback")).toBeInTheDocument();
      expect(screen.getByText("Upgrade to Expert")).toBeInTheDocument();
    });

    it("should not render fallback when content is shown", () => {
      renderWithProvider(
        <ProfileGate
          minProfile="Basic"
          fallback={<div data-testid="fallback">Upgrade</div>}
        >
          <div data-testid="content">Basic Content</div>
        </ProfileGate>,
        { profile: "Basic" }
      );

      expect(screen.getByTestId("content")).toBeInTheDocument();
      expect(screen.queryByTestId("fallback")).not.toBeInTheDocument();
    });

    it("should render null when hidden and no fallback provided", () => {
      const { container } = renderWithProvider(
        <ProfileGate minProfile="Expert">
          <div data-testid="content">Expert Content</div>
        </ProfileGate>,
        { profile: "Basic" }
      );

      expect(screen.queryByTestId("content")).not.toBeInTheDocument();
      // Container should be mostly empty (just the provider wrapper)
      expect(container.querySelector("[data-testid='content']")).toBeNull();
    });
  });

  describe("Multiple Children", () => {
    it("should show all children when profile matches", () => {
      renderWithProvider(
        <ProfileGate minProfile="Basic">
          <div data-testid="child1">Child 1</div>
          <div data-testid="child2">Child 2</div>
          <div data-testid="child3">Child 3</div>
        </ProfileGate>,
        { profile: "Basic" }
      );

      expect(screen.getByTestId("child1")).toBeInTheDocument();
      expect(screen.getByTestId("child2")).toBeInTheDocument();
      expect(screen.getByTestId("child3")).toBeInTheDocument();
    });

    it("should hide all children when profile does not match", () => {
      renderWithProvider(
        <ProfileGate minProfile="Expert">
          <div data-testid="child1">Child 1</div>
          <div data-testid="child2">Child 2</div>
        </ProfileGate>,
        { profile: "Basic" }
      );

      expect(screen.queryByTestId("child1")).not.toBeInTheDocument();
      expect(screen.queryByTestId("child2")).not.toBeInTheDocument();
    });
  });

  describe("Nested ProfileGates", () => {
    it("should support nested profile gates", () => {
      renderWithProvider(
        <ProfileGate minProfile="Basic">
          <div data-testid="basic">
            Basic Section
            <ProfileGate minProfile="Advanced">
              <div data-testid="advanced">Advanced Section</div>
            </ProfileGate>
          </div>
        </ProfileGate>,
        { profile: "Advanced" }
      );

      expect(screen.getByTestId("basic")).toBeInTheDocument();
      expect(screen.getByTestId("advanced")).toBeInTheDocument();
    });

    it("should hide nested gates when parent profile not met", () => {
      renderWithProvider(
        <ProfileGate minProfile="Technical">
          <div data-testid="technical">
            Technical Section
            <ProfileGate minProfile="Expert">
              <div data-testid="expert">Expert Section</div>
            </ProfileGate>
          </div>
        </ProfileGate>,
        { profile: "Advanced" }
      );

      expect(screen.queryByTestId("technical")).not.toBeInTheDocument();
      expect(screen.queryByTestId("expert")).not.toBeInTheDocument();
    });

    it("should show parent but hide nested when nested profile not met", () => {
      renderWithProvider(
        <ProfileGate minProfile="Basic">
          <div data-testid="basic">
            Basic Section
            <ProfileGate minProfile="Expert">
              <div data-testid="expert">Expert Section</div>
            </ProfileGate>
          </div>
        </ProfileGate>,
        { profile: "Basic" }
      );

      expect(screen.getByTestId("basic")).toBeInTheDocument();
      expect(screen.queryByTestId("expert")).not.toBeInTheDocument();
    });
  });

  describe("Profile Override", () => {
    it("should use overrideProfile instead of context profile", () => {
      renderWithProvider(
        <ProfileGate minProfile="Expert" overrideProfile="Expert">
          <div data-testid="content">Expert Content</div>
        </ProfileGate>,
        { profile: "Basic" } // Context says Basic, but override says Expert
      );

      expect(screen.getByTestId("content")).toBeInTheDocument();
    });

    it("should hide content when overrideProfile is lower than minProfile", () => {
      renderWithProvider(
        <ProfileGate minProfile="Expert" overrideProfile="Basic">
          <div data-testid="content">Expert Content</div>
        </ProfileGate>,
        { profile: "Expert" } // Context says Expert, but override says Basic
      );

      expect(screen.queryByTestId("content")).not.toBeInTheDocument();
    });
  });

  describe("Wrapper Element", () => {
    it("should wrap content in specified element when wrapper prop is provided", () => {
      renderWithProvider(
        <ProfileGate minProfile="Basic" wrapper="section">
          <div data-testid="content">Content</div>
        </ProfileGate>,
        { profile: "Basic" }
      );

      const content = screen.getByTestId("content");
      expect(content.parentElement?.tagName).toBe("SECTION");
    });

    it("should apply wrapperClassName to wrapper element", () => {
      renderWithProvider(
        <ProfileGate
          minProfile="Basic"
          wrapper="div"
          wrapperClassName="custom-wrapper-class"
        >
          <div data-testid="content">Content</div>
        </ProfileGate>,
        { profile: "Basic" }
      );

      const content = screen.getByTestId("content");
      expect(content.parentElement).toHaveClass("custom-wrapper-class");
    });

    it("should not render wrapper when content is hidden", () => {
      const { container } = renderWithProvider(
        <ProfileGate
          minProfile="Expert"
          wrapper="section"
          wrapperClassName="custom-class"
        >
          <div data-testid="content">Content</div>
        </ProfileGate>,
        { profile: "Basic" }
      );

      expect(container.querySelector("section")).not.toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should not affect accessibility tree when showing content", () => {
      renderWithProvider(
        <ProfileGate minProfile="Basic">
          <button data-testid="btn">Click me</button>
        </ProfileGate>,
        { profile: "Basic" }
      );

      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
    });

    it("should not leave hidden elements in accessibility tree", () => {
      renderWithProvider(
        <ProfileGate minProfile="Expert">
          <button data-testid="btn">Click me</button>
        </ProfileGate>,
        { profile: "Basic" }
      );

      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("should apply aria-hidden to wrapper when hiding visually but keeping in DOM", () => {
      renderWithProvider(
        <ProfileGate minProfile="Expert" hideMode="visual">
          <div data-testid="content">Hidden Content</div>
        </ProfileGate>,
        { profile: "Basic" }
      );

      // With visual hide mode, content stays in DOM but is visually hidden
      const content = screen.getByTestId("content");
      expect(content.parentElement).toHaveAttribute("aria-hidden", "true");
      expect(content.parentElement).toHaveClass("hidden");
    });
  });

  describe("Hide Mode", () => {
    it("should remove from DOM by default (hideMode=unmount)", () => {
      const { container } = renderWithProvider(
        <ProfileGate minProfile="Expert">
          <div data-testid="content">Content</div>
        </ProfileGate>,
        { profile: "Basic" }
      );

      expect(screen.queryByTestId("content")).not.toBeInTheDocument();
    });

    it("should keep in DOM but hide visually when hideMode=visual", () => {
      renderWithProvider(
        <ProfileGate minProfile="Expert" hideMode="visual">
          <div data-testid="content">Content</div>
        </ProfileGate>,
        { profile: "Basic" }
      );

      const content = screen.getByTestId("content");
      expect(content).toBeInTheDocument();
      expect(content.parentElement).toHaveClass("hidden");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty children gracefully", () => {
      const { container } = renderWithProvider(
        <ProfileGate minProfile="Basic">{null}</ProfileGate>,
        { profile: "Basic" }
      );

      // Should not crash
      expect(container).toBeInTheDocument();
    });

    it("should handle undefined children gracefully", () => {
      const { container } = renderWithProvider(
        <ProfileGate minProfile="Basic">{undefined}</ProfileGate>,
        { profile: "Basic" }
      );

      // Should not crash
      expect(container).toBeInTheDocument();
    });

    it("should handle text children", () => {
      renderWithProvider(
        <ProfileGate minProfile="Basic">Plain text content</ProfileGate>,
        { profile: "Basic" }
      );

      expect(screen.getByText("Plain text content")).toBeInTheDocument();
    });

    it("should handle number children", () => {
      renderWithProvider(
        <ProfileGate minProfile="Basic">{42}</ProfileGate>,
        { profile: "Basic" }
      );

      expect(screen.getByText("42")).toBeInTheDocument();
    });

    it("should handle boolean children (false renders nothing)", () => {
      const { container } = renderWithProvider(
        <ProfileGate minProfile="Basic">{false}</ProfileGate>,
        { profile: "Basic" }
      );

      // false should not render anything visible
      expect(container.textContent).toBe("");
    });

    it("should handle conditional children", () => {
      const showExtra = true;
      renderWithProvider(
        <ProfileGate minProfile="Basic">
          <div data-testid="always">Always</div>
          {showExtra && <div data-testid="conditional">Conditional</div>}
        </ProfileGate>,
        { profile: "Basic" }
      );

      expect(screen.getByTestId("always")).toBeInTheDocument();
      expect(screen.getByTestId("conditional")).toBeInTheDocument();
    });
  });

  describe("useProfileGate Hook", () => {
    // Test the hook directly for programmatic usage
    it("should export useProfileGate hook", async () => {
      const { useProfileGate } = await import(
        "../../../src/components/forms/ProfileGate"
      );
      expect(useProfileGate).toBeDefined();
      expect(typeof useProfileGate).toBe("function");
    });
  });
});
