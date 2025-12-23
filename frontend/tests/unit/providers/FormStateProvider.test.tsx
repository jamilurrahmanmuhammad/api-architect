/**
 * Component Tests for FormStateProvider
 * Tests context hooks and provider functionality
 */

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ReactNode } from "react";
import {
  FormStateProvider,
  useFormState,
  useUpdateField,
  useUndoRedo,
  useLoadOas,
  useFormMetadata,
} from "../../../src/providers/FormStateProvider";
import { initialFormState, emptyOas } from "../../../src/types/formState";

/**
 * Test component that uses FormStateProvider hooks
 */
function TestComponent() {
  const { state, dispatch } = useFormState();
  const updateField = useUpdateField();
  const { undo, redo, canUndo, canRedo } = useUndoRedo();
  const loadOas = useLoadOas();
  const { profile, isDirty, errors, editedPaths, setProfile, clearEdits } =
    useFormMetadata();

  return (
    <div>
      <div data-testid="api-title">{state.oasData.info.title}</div>
      <div data-testid="api-version">{state.oasData.info.version}</div>
      <div data-testid="profile">{profile}</div>
      <div data-testid="is-dirty">{isDirty ? "dirty" : "clean"}</div>
      <div data-testid="edited-paths">{editedPaths.size}</div>
      <div data-testid="errors">{errors.length}</div>
      <div data-testid="can-undo">{canUndo ? "yes" : "no"}</div>
      <div data-testid="can-redo">{canRedo ? "yes" : "no"}</div>

      <button
        data-testid="update-title"
        onClick={() => updateField("/info/title", "Updated")}
      >
        Update Title
      </button>

      <button
        data-testid="undo-btn"
        onClick={() => undo()}
        disabled={!canUndo}
      >
        Undo
      </button>

      <button
        data-testid="redo-btn"
        onClick={() => redo()}
        disabled={!canRedo}
      >
        Redo
      </button>

      <button
        data-testid="load-oas"
        onClick={() =>
          loadOas({
            openapi: "3.0.0",
            info: { title: "Loaded API", version: "2.0.0" },
            paths: {},
          })
        }
      >
        Load OAS
      </button>

      <button
        data-testid="set-profile"
        onClick={() => setProfile("Expert")}
      >
        Set Expert
      </button>

      <button
        data-testid="clear-edits"
        onClick={() => clearEdits()}
      >
        Clear Edits
      </button>

      <button
        data-testid="dispatch-direct"
        onClick={() =>
          dispatch({ type: "SET_LOADING", payload: true })
        }
      >
        Set Loading
      </button>
    </div>
  );
}

describe("FormStateProvider", () => {
  describe("Provider and Context", () => {
    it("should render children", () => {
      render(
        <FormStateProvider>
          <div data-testid="child">Child element</div>
        </FormStateProvider>
      );

      expect(screen.getByTestId("child")).toBeInTheDocument();
    });

    it("should throw error when hook used outside provider", () => {
      function ComponentOutsideProvider() {
        try {
          useFormState();
          return <div>Should not render</div>;
        } catch (error: any) {
          return <div data-testid="error">{error.message}</div>;
        }
      }

      render(<ComponentOutsideProvider />);

      expect(screen.getByTestId("error")).toHaveTextContent(
        "useFormState must be used within FormStateProvider"
      );
    });

    it("should accept initial state", () => {
      const customInitialState = {
        ...initialFormState,
        profile: "Expert" as const,
      };

      render(
        <FormStateProvider initialState={customInitialState}>
          <TestComponent />
        </FormStateProvider>
      );

      expect(screen.getByTestId("profile")).toHaveTextContent("Expert");
    });
  });

  describe("useFormState hook", () => {
    it("should provide initial state", () => {
      render(
        <FormStateProvider>
          <TestComponent />
        </FormStateProvider>
      );

      expect(screen.getByTestId("api-title")).toHaveTextContent("Untitled API");
      expect(screen.getByTestId("api-version")).toHaveTextContent("1.0.0");
      expect(screen.getByTestId("profile")).toHaveTextContent("Basic");
    });

    it("should provide dispatch function", () => {
      render(
        <FormStateProvider>
          <TestComponent />
        </FormStateProvider>
      );

      const dispatchBtn = screen.getByTestId("dispatch-direct");
      expect(dispatchBtn).toBeInTheDocument();
    });
  });

  describe("useUpdateField hook", () => {
    it("should update a field", () => {
      render(
        <FormStateProvider>
          <TestComponent />
        </FormStateProvider>
      );

      expect(screen.getByTestId("api-title")).toHaveTextContent("Untitled API");

      act(() => {
        screen.getByTestId("update-title").click();
      });

      expect(screen.getByTestId("api-title")).toHaveTextContent("Updated");
    });

    it("should mark form as dirty", () => {
      render(
        <FormStateProvider>
          <TestComponent />
        </FormStateProvider>
      );

      expect(screen.getByTestId("is-dirty")).toHaveTextContent("clean");

      act(() => {
        screen.getByTestId("update-title").click();
      });

      expect(screen.getByTestId("is-dirty")).toHaveTextContent("dirty");
    });

    it("should track edited paths", () => {
      render(
        <FormStateProvider>
          <TestComponent />
        </FormStateProvider>
      );

      expect(screen.getByTestId("edited-paths")).toHaveTextContent("0");

      act(() => {
        screen.getByTestId("update-title").click();
      });

      expect(screen.getByTestId("edited-paths")).toHaveTextContent("1");
    });
  });

  describe("useUndoRedo hook", () => {
    it("should provide canUndo and canRedo flags", () => {
      render(
        <FormStateProvider>
          <TestComponent />
        </FormStateProvider>
      );

      expect(screen.getByTestId("can-undo")).toHaveTextContent("no");
      expect(screen.getByTestId("can-redo")).toHaveTextContent("no");

      act(() => {
        screen.getByTestId("update-title").click();
      });

      expect(screen.getByTestId("can-undo")).toHaveTextContent("yes");
      expect(screen.getByTestId("can-redo")).toHaveTextContent("no");
    });

    it("should undo changes", () => {
      render(
        <FormStateProvider>
          <TestComponent />
        </FormStateProvider>
      );

      act(() => {
        screen.getByTestId("update-title").click();
      });

      expect(screen.getByTestId("api-title")).toHaveTextContent("Updated");

      act(() => {
        screen.getByTestId("undo-btn").click();
      });

      expect(screen.getByTestId("api-title")).toHaveTextContent("Untitled API");
    });

    it("should redo changes", () => {
      render(
        <FormStateProvider>
          <TestComponent />
        </FormStateProvider>
      );

      act(() => {
        screen.getByTestId("update-title").click();
      });

      act(() => {
        screen.getByTestId("undo-btn").click();
      });

      expect(screen.getByTestId("can-redo")).toHaveTextContent("yes");

      act(() => {
        screen.getByTestId("redo-btn").click();
      });

      expect(screen.getByTestId("api-title")).toHaveTextContent("Updated");
    });

    it("should disable undo button when no history", () => {
      render(
        <FormStateProvider>
          <TestComponent />
        </FormStateProvider>
      );

      const undoBtn = screen.getByTestId("undo-btn") as HTMLButtonElement;
      expect(undoBtn.disabled).toBe(true);

      act(() => {
        screen.getByTestId("update-title").click();
      });

      expect(undoBtn.disabled).toBe(false);
    });

    it("should disable redo button when no redo history", () => {
      render(
        <FormStateProvider>
          <TestComponent />
        </FormStateProvider>
      );

      const redoBtn = screen.getByTestId("redo-btn") as HTMLButtonElement;
      expect(redoBtn.disabled).toBe(true);

      // First update the title to enable undo
      act(() => {
        screen.getByTestId("update-title").click();
      });

      // Then undo to enable redo
      act(() => {
        screen.getByTestId("undo-btn").click();
      });

      // Re-query after state update
      const redoBtnAfterUndo = screen.getByTestId("redo-btn") as HTMLButtonElement;
      expect(redoBtnAfterUndo.disabled).toBe(false);
    });
  });

  describe("useLoadOas hook", () => {
    it("should load OAS data", () => {
      render(
        <FormStateProvider>
          <TestComponent />
        </FormStateProvider>
      );

      act(() => {
        screen.getByTestId("load-oas").click();
      });

      expect(screen.getByTestId("api-title")).toHaveTextContent("Loaded API");
      expect(screen.getByTestId("api-version")).toHaveTextContent("2.0.0");
    });

    it("should clear dirty flag when loading OAS", () => {
      render(
        <FormStateProvider>
          <TestComponent />
        </FormStateProvider>
      );

      act(() => {
        screen.getByTestId("update-title").click();
      });

      expect(screen.getByTestId("is-dirty")).toHaveTextContent("dirty");

      act(() => {
        screen.getByTestId("load-oas").click();
      });

      expect(screen.getByTestId("is-dirty")).toHaveTextContent("clean");
    });

    it("should clear edited paths when loading OAS", () => {
      render(
        <FormStateProvider>
          <TestComponent />
        </FormStateProvider>
      );

      act(() => {
        screen.getByTestId("update-title").click();
      });

      expect(screen.getByTestId("edited-paths")).toHaveTextContent("1");

      act(() => {
        screen.getByTestId("load-oas").click();
      });

      expect(screen.getByTestId("edited-paths")).toHaveTextContent("0");
    });
  });

  describe("useFormMetadata hook", () => {
    it("should provide profile", () => {
      render(
        <FormStateProvider>
          <TestComponent />
        </FormStateProvider>
      );

      expect(screen.getByTestId("profile")).toHaveTextContent("Basic");
    });

    it("should allow changing profile", () => {
      render(
        <FormStateProvider>
          <TestComponent />
        </FormStateProvider>
      );

      act(() => {
        screen.getByTestId("set-profile").click();
      });

      expect(screen.getByTestId("profile")).toHaveTextContent("Expert");
    });

    it("should provide isDirty flag", () => {
      render(
        <FormStateProvider>
          <TestComponent />
        </FormStateProvider>
      );

      expect(screen.getByTestId("is-dirty")).toHaveTextContent("clean");

      act(() => {
        screen.getByTestId("update-title").click();
      });

      expect(screen.getByTestId("is-dirty")).toHaveTextContent("dirty");
    });

    it("should provide errors array", () => {
      render(
        <FormStateProvider>
          <TestComponent />
        </FormStateProvider>
      );

      expect(screen.getByTestId("errors")).toHaveTextContent("0");
    });

    it("should provide editedPaths set", () => {
      render(
        <FormStateProvider>
          <TestComponent />
        </FormStateProvider>
      );

      expect(screen.getByTestId("edited-paths")).toHaveTextContent("0");

      act(() => {
        screen.getByTestId("update-title").click();
      });

      expect(screen.getByTestId("edited-paths")).toHaveTextContent("1");
    });

    it("should allow clearing edits", () => {
      render(
        <FormStateProvider>
          <TestComponent />
        </FormStateProvider>
      );

      act(() => {
        screen.getByTestId("update-title").click();
      });

      expect(screen.getByTestId("api-title")).toHaveTextContent("Updated");

      act(() => {
        screen.getByTestId("clear-edits").click();
      });

      expect(screen.getByTestId("api-title")).toHaveTextContent("Untitled API");
    });
  });

  describe("Multiple renders and state isolation", () => {
    function TwoComponentWrapper() {
      return (
        <FormStateProvider>
          <div>
            <TestComponent />
            <TestComponent />
          </div>
        </FormStateProvider>
      );
    }

    it("should share state between multiple components", () => {
      const { container } = render(<TwoComponentWrapper />);

      const titles = container.querySelectorAll("[data-testid='api-title']");
      expect(titles).toHaveLength(2);
      expect(titles[0]).toHaveTextContent("Untitled API");
      expect(titles[1]).toHaveTextContent("Untitled API");

      act(() => {
        const updateButtons = screen.getAllByTestId("update-title");
        updateButtons[0].click();
      });

      expect(titles[0]).toHaveTextContent("Updated");
      expect(titles[1]).toHaveTextContent("Updated");
    });
  });

  describe("Edge cases", () => {
    it("should handle null originalOas", () => {
      render(
        <FormStateProvider initialState={initialFormState}>
          <TestComponent />
        </FormStateProvider>
      );

      act(() => {
        screen.getByTestId("update-title").click();
      });

      act(() => {
        screen.getByTestId("clear-edits").click();
      });

      // Should not crash and should show initial OAS
      expect(screen.getByTestId("api-title")).toHaveTextContent("Untitled API");
    });

    it("should handle rapid updates", () => {
      render(
        <FormStateProvider>
          <TestComponent />
        </FormStateProvider>
      );

      act(() => {
        for (let i = 0; i < 10; i++) {
          screen.getByTestId("update-title").click();
        }
      });

      expect(screen.getByTestId("api-title")).toHaveTextContent("Updated");
      expect(screen.getByTestId("can-undo")).toHaveTextContent("yes");
    });
  });
});
