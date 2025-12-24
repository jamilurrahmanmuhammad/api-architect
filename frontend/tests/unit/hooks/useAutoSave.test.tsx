/**
 * Unit tests for useAutoSave hook.
 *
 * Tests auto-save functionality including:
 * - Dirty state tracking
 * - Auto-save timer behavior
 * - Manual save triggering
 * - Keyboard shortcut (Ctrl+S)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import type { ReactNode } from "react";
import editorReducer, { updateContent } from "../../../src/store/slices/editorSlice";
import fileReducer from "../../../src/store/slices/fileSlice";
import uiReducer from "../../../src/store/slices/uiSlice";
import { useAutoSave, useSaveShortcut } from "../../../src/hooks/useAutoSave";

// Mock useUpdateFile from useEditorApi
vi.mock("../../../src/hooks/useEditorApi", () => ({
  useUpdateFile: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isLoading: false,
  })),
}));

function createTestStore() {
  return configureStore({
    reducer: {
      editor: editorReducer,
      file: fileReducer,
      ui: uiReducer,
    },
  });
}

function createWrapper(store: ReturnType<typeof createTestStore>) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <Provider store={store}>{children}</Provider>;
  };
}

describe("useAutoSave", () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("should initialize with isDirty as false", () => {
    const { result } = renderHook(() => useAutoSave("test-file-id"), {
      wrapper: createWrapper(store),
    });

    expect(result.current.isDirty).toBe(false);
    expect(result.current.isSaving).toBe(false);
    expect(result.current.lastSavedAt).toBeNull();
  });

  it("should mark as dirty when content changes", () => {
    const { result } = renderHook(() => useAutoSave("test-file-id"), {
      wrapper: createWrapper(store),
    });

    act(() => {
      result.current.setContent("new content");
    });

    expect(result.current.isDirty).toBe(true);
  });

  it("should not be dirty when fileId is null", () => {
    const { result } = renderHook(() => useAutoSave(null), {
      wrapper: createWrapper(store),
    });

    expect(result.current.isDirty).toBe(false);
  });

  it("should reset dirty state with resetDirty", () => {
    const { result } = renderHook(() => useAutoSave("test-file-id"), {
      wrapper: createWrapper(store),
    });

    act(() => {
      result.current.setContent("modified content");
    });

    expect(result.current.isDirty).toBe(true);

    act(() => {
      result.current.resetDirty();
    });

    expect(result.current.isDirty).toBe(false);
  });

  it("should schedule auto-save when content changes", async () => {
    const { result } = renderHook(
      () =>
        useAutoSave("test-file-id", {
          autoSaveInterval: 5000,
          enabled: true,
        }),
      { wrapper: createWrapper(store) }
    );

    act(() => {
      result.current.setContent("auto-save content");
    });

    // Fast-forward time but not enough to trigger save
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Save should not have triggered yet
    expect(result.current.isDirty).toBe(true);
  });

  it("should not auto-save when disabled", async () => {
    const { result } = renderHook(
      () =>
        useAutoSave("test-file-id", {
          autoSaveInterval: 1000,
          enabled: false,
        }),
      { wrapper: createWrapper(store) }
    );

    act(() => {
      result.current.setContent("disabled auto-save");
    });

    // Fast-forward past auto-save interval
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Should still be dirty because auto-save is disabled
    expect(result.current.isDirty).toBe(true);
  });

  it("should provide save function for manual save", async () => {
    const { result } = renderHook(() => useAutoSave("test-file-id"), {
      wrapper: createWrapper(store),
    });

    expect(typeof result.current.save).toBe("function");
  });

  it("should reset dirty when fileId changes", () => {
    const { result, rerender } = renderHook(
      ({ fileId }) => useAutoSave(fileId),
      {
        wrapper: createWrapper(store),
        initialProps: { fileId: "file-1" },
      }
    );

    act(() => {
      result.current.setContent("some content");
    });

    expect(result.current.isDirty).toBe(true);

    // Change fileId
    rerender({ fileId: "file-2" });

    // Dirty should be reset for new file
    expect(result.current.isDirty).toBe(false);
  });
});

describe("useSaveShortcut", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should call onSave when Ctrl+S is pressed", () => {
    const onSave = vi.fn();

    renderHook(() => useSaveShortcut(onSave, true));

    // Simulate Ctrl+S
    const event = new KeyboardEvent("keydown", {
      key: "s",
      ctrlKey: true,
      bubbles: true,
    });
    Object.defineProperty(event, "preventDefault", {
      value: vi.fn(),
    });

    act(() => {
      window.dispatchEvent(event);
    });

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("should call onSave when Cmd+S is pressed (Mac)", () => {
    const onSave = vi.fn();

    renderHook(() => useSaveShortcut(onSave, true));

    // Simulate Cmd+S (Mac)
    const event = new KeyboardEvent("keydown", {
      key: "s",
      metaKey: true,
      bubbles: true,
    });
    Object.defineProperty(event, "preventDefault", {
      value: vi.fn(),
    });

    act(() => {
      window.dispatchEvent(event);
    });

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("should not call onSave when disabled", () => {
    const onSave = vi.fn();

    renderHook(() => useSaveShortcut(onSave, false));

    const event = new KeyboardEvent("keydown", {
      key: "s",
      ctrlKey: true,
      bubbles: true,
    });

    act(() => {
      window.dispatchEvent(event);
    });

    expect(onSave).not.toHaveBeenCalled();
  });

  it("should not call onSave for other key combinations", () => {
    const onSave = vi.fn();

    renderHook(() => useSaveShortcut(onSave, true));

    // Simulate Ctrl+A (not save)
    const event = new KeyboardEvent("keydown", {
      key: "a",
      ctrlKey: true,
      bubbles: true,
    });

    act(() => {
      window.dispatchEvent(event);
    });

    expect(onSave).not.toHaveBeenCalled();
  });

  it("should cleanup event listener on unmount", () => {
    const onSave = vi.fn();
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

    const { unmount } = renderHook(() => useSaveShortcut(onSave, true));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "keydown",
      expect.any(Function)
    );
  });
});
