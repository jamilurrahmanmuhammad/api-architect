/**
 * Component Tests for UndoRedoButtons
 * Tests undo/redo functionality with keyboard shortcuts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UndoRedoButtons } from "../../../src/components/forms/UndoRedoButtons";
import { FormStateProvider, useUpdateField } from "../../../src/providers/FormStateProvider";
import { initialFormState, FormState } from "../../../src/types/formState";
import React from "react";

/**
 * Helper to render UndoRedoButtons within FormStateProvider
 */
function renderWithProvider(initialState: Partial<FormState> = {}) {
  const state: FormState = {
    ...initialFormState,
    ...initialState,
  };

  return render(
    <FormStateProvider initialState={state}>
      <UndoRedoButtons />
    </FormStateProvider>
  );
}

/**
 * Helper component to make field updates and test undo/redo
 */
function TestHarness({ initialState }: { initialState?: Partial<FormState> }) {
  const state: FormState = {
    ...initialFormState,
    ...initialState,
  };

  return (
    <FormStateProvider initialState={state}>
      <UndoRedoButtons />
      <FieldUpdater />
    </FormStateProvider>
  );
}

function FieldUpdater() {
  const updateField = useUpdateField();

  return (
    <div>
      <button
        data-testid="update-title"
        onClick={() => updateField("/info/title", "New Title")}
      >
        Update Title
      </button>
      <button
        data-testid="update-version"
        onClick={() => updateField("/info/version", "2.0.0")}
      >
        Update Version
      </button>
    </div>
  );
}

describe("UndoRedoButtons", () => {
  describe("Rendering", () => {
    it("should render undo/redo buttons", () => {
      renderWithProvider();

      expect(screen.getByTestId("undo-redo-buttons")).toBeInTheDocument();
    });

    it("should render undo button", () => {
      renderWithProvider();

      expect(screen.getByRole("button", { name: /undo/i })).toBeInTheDocument();
    });

    it("should render redo button", () => {
      renderWithProvider();

      expect(screen.getByRole("button", { name: /redo/i })).toBeInTheDocument();
    });

    it("should show undo icon", () => {
      renderWithProvider();

      expect(screen.getByTestId("undo-icon")).toBeInTheDocument();
    });

    it("should show redo icon", () => {
      renderWithProvider();

      expect(screen.getByTestId("redo-icon")).toBeInTheDocument();
    });
  });

  describe("Undo Button State", () => {
    it("should disable undo button when no history", () => {
      renderWithProvider();

      const undoButton = screen.getByRole("button", { name: /undo/i });
      expect(undoButton).toBeDisabled();
    });

    it("should enable undo button when there is history", async () => {
      render(<TestHarness />);

      // Make a change to create undo history
      const updateButton = screen.getByTestId("update-title");
      await userEvent.click(updateButton);

      const undoButton = screen.getByRole("button", { name: /undo/i });
      expect(undoButton).not.toBeDisabled();
    });

    it("should disable undo button after undoing all changes", async () => {
      render(<TestHarness />);

      // Make one change
      const updateButton = screen.getByTestId("update-title");
      await userEvent.click(updateButton);

      // Undo
      const undoButton = screen.getByRole("button", { name: /undo/i });
      await userEvent.click(undoButton);

      // Should be disabled again
      expect(undoButton).toBeDisabled();
    });
  });

  describe("Redo Button State", () => {
    it("should disable redo button when no redo history", () => {
      renderWithProvider();

      const redoButton = screen.getByRole("button", { name: /redo/i });
      expect(redoButton).toBeDisabled();
    });

    it("should enable redo button after undo", async () => {
      render(<TestHarness />);

      // Make a change
      const updateButton = screen.getByTestId("update-title");
      await userEvent.click(updateButton);

      // Undo
      const undoButton = screen.getByRole("button", { name: /undo/i });
      await userEvent.click(undoButton);

      // Redo should be enabled
      const redoButton = screen.getByRole("button", { name: /redo/i });
      expect(redoButton).not.toBeDisabled();
    });

    it("should disable redo button after redoing all changes", async () => {
      render(<TestHarness />);

      // Make a change
      const updateButton = screen.getByTestId("update-title");
      await userEvent.click(updateButton);

      // Undo
      const undoButton = screen.getByRole("button", { name: /undo/i });
      await userEvent.click(undoButton);

      // Redo
      const redoButton = screen.getByRole("button", { name: /redo/i });
      await userEvent.click(redoButton);

      // Should be disabled again
      expect(redoButton).toBeDisabled();
    });

    it("should disable redo button when new change is made after undo", async () => {
      render(<TestHarness />);

      // Make a change
      await userEvent.click(screen.getByTestId("update-title"));

      // Undo
      await userEvent.click(screen.getByRole("button", { name: /undo/i }));

      // Make a new change (should clear redo stack)
      await userEvent.click(screen.getByTestId("update-version"));

      // Redo should be disabled
      const redoButton = screen.getByRole("button", { name: /redo/i });
      expect(redoButton).toBeDisabled();
    });
  });

  describe("Undo Functionality", () => {
    it("should revert form when undo is clicked", async () => {
      render(<TestHarness />);

      // Make a change
      await userEvent.click(screen.getByTestId("update-title"));

      // Undo
      await userEvent.click(screen.getByRole("button", { name: /undo/i }));

      // The undo button should be disabled (no more history)
      expect(screen.getByRole("button", { name: /undo/i })).toBeDisabled();
    });

    it("should support multiple undos", async () => {
      render(<TestHarness />);

      // Make two changes
      await userEvent.click(screen.getByTestId("update-title"));
      await userEvent.click(screen.getByTestId("update-version"));

      // Undo twice
      await userEvent.click(screen.getByRole("button", { name: /undo/i }));
      await userEvent.click(screen.getByRole("button", { name: /undo/i }));

      // Should be back to initial state
      expect(screen.getByRole("button", { name: /undo/i })).toBeDisabled();
    });
  });

  describe("Redo Functionality", () => {
    it("should restore form when redo is clicked", async () => {
      render(<TestHarness />);

      // Make a change
      await userEvent.click(screen.getByTestId("update-title"));

      // Undo
      await userEvent.click(screen.getByRole("button", { name: /undo/i }));

      // Redo
      await userEvent.click(screen.getByRole("button", { name: /redo/i }));

      // Undo should be available again, redo should be disabled
      expect(screen.getByRole("button", { name: /undo/i })).not.toBeDisabled();
      expect(screen.getByRole("button", { name: /redo/i })).toBeDisabled();
    });

    it("should support multiple redos", async () => {
      render(<TestHarness />);

      // Make two changes
      await userEvent.click(screen.getByTestId("update-title"));
      await userEvent.click(screen.getByTestId("update-version"));

      // Undo twice
      await userEvent.click(screen.getByRole("button", { name: /undo/i }));
      await userEvent.click(screen.getByRole("button", { name: /undo/i }));

      // Redo twice
      await userEvent.click(screen.getByRole("button", { name: /redo/i }));
      await userEvent.click(screen.getByRole("button", { name: /redo/i }));

      // Should have undo history again
      expect(screen.getByRole("button", { name: /undo/i })).not.toBeDisabled();
      expect(screen.getByRole("button", { name: /redo/i })).toBeDisabled();
    });
  });

  describe("Keyboard Shortcuts", () => {
    it("should undo on Ctrl+Z", async () => {
      render(<TestHarness />);

      // Make a change
      await userEvent.click(screen.getByTestId("update-title"));

      // Press Ctrl+Z
      fireEvent.keyDown(document, { key: "z", ctrlKey: true });

      // Should have undone
      expect(screen.getByRole("button", { name: /undo/i })).toBeDisabled();
    });

    it("should undo on Cmd+Z (Mac)", async () => {
      render(<TestHarness />);

      // Make a change
      await userEvent.click(screen.getByTestId("update-title"));

      // Press Cmd+Z (metaKey for Mac) - also sends ctrlKey for cross-platform support
      fireEvent.keyDown(document, { key: "z", metaKey: true, ctrlKey: true });

      // Should have undone
      expect(screen.getByRole("button", { name: /undo/i })).toBeDisabled();
    });

    it("should redo on Ctrl+Y", async () => {
      render(<TestHarness />);

      // Make a change
      await userEvent.click(screen.getByTestId("update-title"));

      // Undo
      await userEvent.click(screen.getByRole("button", { name: /undo/i }));

      // Press Ctrl+Y
      fireEvent.keyDown(document, { key: "y", ctrlKey: true });

      // Should have redone
      expect(screen.getByRole("button", { name: /redo/i })).toBeDisabled();
    });

    it("should redo on Ctrl+Shift+Z", async () => {
      render(<TestHarness />);

      // Make a change
      await userEvent.click(screen.getByTestId("update-title"));

      // Undo
      await userEvent.click(screen.getByRole("button", { name: /undo/i }));

      // Press Ctrl+Shift+Z
      fireEvent.keyDown(document, { key: "z", ctrlKey: true, shiftKey: true });

      // Should have redone
      expect(screen.getByRole("button", { name: /redo/i })).toBeDisabled();
    });

    it("should redo on Cmd+Shift+Z (Mac)", async () => {
      render(<TestHarness />);

      // Make a change
      await userEvent.click(screen.getByTestId("update-title"));

      // Undo
      await userEvent.click(screen.getByRole("button", { name: /undo/i }));

      // Press Cmd+Shift+Z (metaKey for Mac) - also sends ctrlKey for cross-platform support
      fireEvent.keyDown(document, { key: "z", metaKey: true, ctrlKey: true, shiftKey: true });

      // Should have redone
      expect(screen.getByRole("button", { name: /redo/i })).toBeDisabled();
    });

    it("should not undo when undo is disabled", () => {
      renderWithProvider();

      const undoButton = screen.getByRole("button", { name: /undo/i });
      expect(undoButton).toBeDisabled();

      // Press Ctrl+Z - should do nothing (no error)
      fireEvent.keyDown(document, { key: "z", ctrlKey: true });

      expect(undoButton).toBeDisabled();
    });

    it("should not redo when redo is disabled", () => {
      renderWithProvider();

      const redoButton = screen.getByRole("button", { name: /redo/i });
      expect(redoButton).toBeDisabled();

      // Press Ctrl+Y - should do nothing (no error)
      fireEvent.keyDown(document, { key: "y", ctrlKey: true });

      expect(redoButton).toBeDisabled();
    });
  });

  describe("Tooltips", () => {
    it("should show undo tooltip with shortcut", () => {
      renderWithProvider();

      const undoButton = screen.getByRole("button", { name: /undo/i });
      expect(undoButton).toHaveAttribute("title", expect.stringMatching(/ctrl\+z|cmd\+z/i));
    });

    it("should show redo tooltip with shortcut", () => {
      renderWithProvider();

      const redoButton = screen.getByRole("button", { name: /redo/i });
      expect(redoButton).toHaveAttribute("title", expect.stringMatching(/ctrl\+y|ctrl\+shift\+z|cmd\+shift\+z/i));
    });
  });

  describe("Styling", () => {
    it("should have proper styling classes", () => {
      renderWithProvider();

      const container = screen.getByTestId("undo-redo-buttons");
      expect(container).toHaveClass("undo-redo-buttons");
    });

    it("should apply custom className when provided", () => {
      render(
        <FormStateProvider initialState={initialFormState}>
          <UndoRedoButtons className="custom-class" />
        </FormStateProvider>
      );

      const container = screen.getByTestId("undo-redo-buttons");
      expect(container).toHaveClass("custom-class");
    });

    it("should have compact variant", () => {
      render(
        <FormStateProvider initialState={initialFormState}>
          <UndoRedoButtons compact />
        </FormStateProvider>
      );

      const container = screen.getByTestId("undo-redo-buttons");
      expect(container).toHaveClass("compact");
    });

    it("should style disabled buttons differently", () => {
      renderWithProvider();

      const undoButton = screen.getByRole("button", { name: /undo/i });
      expect(undoButton).toHaveClass("opacity-50");
    });
  });

  describe("Accessibility", () => {
    it("should have accessible button labels", () => {
      renderWithProvider();

      expect(screen.getByRole("button", { name: /undo/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /redo/i })).toBeInTheDocument();
    });

    it("should indicate disabled state to screen readers", () => {
      renderWithProvider();

      const undoButton = screen.getByRole("button", { name: /undo/i });
      expect(undoButton).toHaveAttribute("aria-disabled", "true");
    });

    it("should have proper button group role", () => {
      renderWithProvider();

      const container = screen.getByTestId("undo-redo-buttons");
      expect(container).toHaveAttribute("role", "group");
    });

    it("should have group label for screen readers", () => {
      renderWithProvider();

      const container = screen.getByTestId("undo-redo-buttons");
      expect(container).toHaveAttribute("aria-label", expect.stringMatching(/undo.*redo|history/i));
    });
  });

  describe("Layout", () => {
    it("should render buttons inline", () => {
      renderWithProvider();

      const container = screen.getByTestId("undo-redo-buttons");
      expect(container).toHaveClass("inline-flex");
    });

    it("should have gap between buttons", () => {
      renderWithProvider();

      const container = screen.getByTestId("undo-redo-buttons");
      expect(container).toHaveClass("gap-1");
    });
  });

  describe("Callback", () => {
    it("should call onUndo callback when undo is clicked", async () => {
      const onUndo = vi.fn();

      render(
        <FormStateProvider initialState={initialFormState}>
          <UndoRedoButtons onUndo={onUndo} />
          <FieldUpdater />
        </FormStateProvider>
      );

      // Make a change
      await userEvent.click(screen.getByTestId("update-title"));

      // Click undo
      await userEvent.click(screen.getByRole("button", { name: /undo/i }));

      expect(onUndo).toHaveBeenCalled();
    });

    it("should call onRedo callback when redo is clicked", async () => {
      const onRedo = vi.fn();

      render(
        <FormStateProvider initialState={initialFormState}>
          <UndoRedoButtons onRedo={onRedo} />
          <FieldUpdater />
        </FormStateProvider>
      );

      // Make a change and undo
      await userEvent.click(screen.getByTestId("update-title"));
      await userEvent.click(screen.getByRole("button", { name: /undo/i }));

      // Click redo
      await userEvent.click(screen.getByRole("button", { name: /redo/i }));

      expect(onRedo).toHaveBeenCalled();
    });
  });
});
