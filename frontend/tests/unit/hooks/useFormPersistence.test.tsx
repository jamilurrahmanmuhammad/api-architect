/**
 * Tests for useFormPersistence hook
 * Tests localStorage auto-save functionality for form state
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { ReactNode } from "react";
import {
  useFormPersistence,
  FormPersistenceOptions,
  STORAGE_KEY_PREFIX,
  serializeFormState,
  deserializeFormState,
  clearPersistedState,
} from "../../../src/hooks/useFormPersistence";
import { FormStateProvider } from "../../../src/providers/FormStateProvider";
import { initialFormState, FormState } from "../../../src/types/formState";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Helper to create wrapper with FormStateProvider
function createWrapper(initialState?: Partial<FormState>) {
  return function Wrapper({ children }: { children: ReactNode }) {
    const state: FormState = {
      ...initialFormState,
      ...initialState,
    };
    return <FormStateProvider initialState={state}>{children}</FormStateProvider>;
  };
}

describe("useFormPersistence", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Initialization", () => {
    it("should initialize with default options", () => {
      const { result } = renderHook(() => useFormPersistence(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isSaving).toBe(false);
      expect(result.current.lastSaved).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it("should accept custom storage key", () => {
      const { result } = renderHook(
        () => useFormPersistence({ storageKey: "custom-key" }),
        { wrapper: createWrapper() }
      );

      expect(result.current).toBeDefined();
    });

    it("should accept custom debounce interval", () => {
      const { result } = renderHook(
        () => useFormPersistence({ debounceMs: 5000 }),
        { wrapper: createWrapper() }
      );

      expect(result.current).toBeDefined();
    });

    it("should allow disabling persistence", () => {
      const { result } = renderHook(
        () => useFormPersistence({ enabled: false }),
        { wrapper: createWrapper() }
      );

      expect(result.current.isSaving).toBe(false);
    });
  });

  describe("Auto-Save (Debounced)", () => {
    it("should save to localStorage after debounce interval", async () => {
      const { result } = renderHook(
        () => useFormPersistence({ debounceMs: 1000 }),
        { wrapper: createWrapper({ isDirty: true }) }
      );

      // Trigger save
      act(() => {
        result.current.saveNow();
      });

      // Should show saving state
      expect(result.current.isSaving).toBe(true);

      // Wait for save to complete
      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it("should debounce multiple rapid changes", async () => {
      const { result } = renderHook(
        () => useFormPersistence({ debounceMs: 1000 }),
        { wrapper: createWrapper() }
      );

      // Trigger multiple saves rapidly
      act(() => {
        result.current.triggerSave();
        result.current.triggerSave();
        result.current.triggerSave();
      });

      // Should not have saved yet
      expect(localStorageMock.setItem).not.toHaveBeenCalled();

      // Advance past debounce time
      await act(async () => {
        vi.advanceTimersByTime(1100);
      });

      // Should have saved only once
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
    });

    it("should use default 10 second debounce interval", async () => {
      const { result } = renderHook(() => useFormPersistence(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.triggerSave();
      });

      // Should not save before 10 seconds
      await act(async () => {
        vi.advanceTimersByTime(9000);
      });
      expect(localStorageMock.setItem).not.toHaveBeenCalled();

      // Should save after 10 seconds
      await act(async () => {
        vi.advanceTimersByTime(1100);
      });
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });

  describe("State Restoration", () => {
    it("should restore state from localStorage on mount", () => {
      const savedState = {
        oasData: { openapi: "3.0.0", info: { title: "Restored API", version: "2.0.0" } },
        profile: "Advanced",
        isDirty: false,
      };

      localStorageMock.setItem(
        `${STORAGE_KEY_PREFIX}default`,
        JSON.stringify(savedState)
      );

      const { result } = renderHook(() => useFormPersistence(), {
        wrapper: createWrapper(),
      });

      expect(result.current.hasPersistedState).toBe(true);
    });

    it("should provide restored state via getPersistedState", () => {
      const savedState = {
        oasData: { openapi: "3.0.0", info: { title: "Restored API", version: "2.0.0" } },
        profile: "Expert",
      };

      localStorageMock.setItem(
        `${STORAGE_KEY_PREFIX}default`,
        JSON.stringify(savedState)
      );

      const { result } = renderHook(() => useFormPersistence(), {
        wrapper: createWrapper(),
      });

      const persisted = result.current.getPersistedState();
      expect(persisted?.oasData.info.title).toBe("Restored API");
      expect(persisted?.profile).toBe("Expert");
    });

    it("should return null when no persisted state exists", () => {
      const { result } = renderHook(() => useFormPersistence(), {
        wrapper: createWrapper(),
      });

      expect(result.current.hasPersistedState).toBe(false);
      expect(result.current.getPersistedState()).toBeNull();
    });

    it("should handle corrupted localStorage data gracefully", () => {
      localStorageMock.setItem(`${STORAGE_KEY_PREFIX}default`, "invalid json{");

      const { result } = renderHook(() => useFormPersistence(), {
        wrapper: createWrapper(),
      });

      expect(result.current.hasPersistedState).toBe(false);
      expect(result.current.error).toBeNull(); // Should not set error, just return null
    });
  });

  describe("Save Status Indicators", () => {
    it("should set isSaving to true during save operation", async () => {
      const { result } = renderHook(() => useFormPersistence(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.saveNow();
      });

      expect(result.current.isSaving).toBe(true);

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current.isSaving).toBe(false);
    });

    it("should update lastSaved timestamp after successful save", async () => {
      const { result } = renderHook(() => useFormPersistence(), {
        wrapper: createWrapper(),
      });

      expect(result.current.lastSaved).toBeNull();

      act(() => {
        result.current.saveNow();
      });

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current.lastSaved).toBeDefined();
      expect(typeof result.current.lastSaved).toBe("number");
    });

    it("should provide formatted lastSaved time", async () => {
      const { result } = renderHook(() => useFormPersistence(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.saveNow();
      });

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current.lastSavedFormatted).toBeDefined();
      expect(typeof result.current.lastSavedFormatted).toBe("string");
    });
  });

  describe("Error Handling", () => {
    it("should handle localStorage quota exceeded error", async () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new DOMException("QuotaExceededError", "QuotaExceededError");
      });

      const { result } = renderHook(() => useFormPersistence(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.saveNow();
      });

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current.error).toBeDefined();
      expect(result.current.error?.type).toBe("quota");
    });

    it("should handle localStorage unavailable error", async () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error("localStorage is not available");
      });

      const { result } = renderHook(() => useFormPersistence(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.saveNow();
      });

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current.error).toBeDefined();
      expect(result.current.error?.type).toBe("storage");
    });

    it("should clear error on successful save", async () => {
      // First save fails
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error("Failed");
      });

      const { result } = renderHook(() => useFormPersistence(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.saveNow();
      });

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current.error).toBeDefined();

      // Second save succeeds
      act(() => {
        result.current.saveNow();
      });

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current.error).toBeNull();
    });

    it("should provide clearError function", async () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error("Failed");
      });

      const { result } = renderHook(() => useFormPersistence(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.saveNow();
      });

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current.error).toBeDefined();

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe("Manual Operations", () => {
    it("should provide saveNow for immediate save", async () => {
      const { result } = renderHook(() => useFormPersistence(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.saveNow();
      });

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it("should provide clearPersistedState to remove saved data", () => {
      localStorageMock.setItem(`${STORAGE_KEY_PREFIX}default`, "{}");

      const { result } = renderHook(() => useFormPersistence(), {
        wrapper: createWrapper(),
      });

      expect(result.current.hasPersistedState).toBe(true);

      act(() => {
        result.current.clearPersistedState();
      });

      expect(localStorageMock.removeItem).toHaveBeenCalled();
      expect(result.current.hasPersistedState).toBe(false);
    });
  });

  describe("Disabled State", () => {
    it("should not save when disabled", async () => {
      const { result } = renderHook(
        () => useFormPersistence({ enabled: false }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.triggerSave();
      });

      await act(async () => {
        vi.advanceTimersByTime(15000);
      });

      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it("should not restore when disabled", () => {
      localStorageMock.setItem(`${STORAGE_KEY_PREFIX}default`, '{"test": true}');

      const { result } = renderHook(
        () => useFormPersistence({ enabled: false }),
        { wrapper: createWrapper() }
      );

      expect(result.current.hasPersistedState).toBe(false);
    });
  });

  describe("Cleanup", () => {
    it("should cancel pending saves on unmount", async () => {
      const { result, unmount } = renderHook(() => useFormPersistence(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.triggerSave();
      });

      unmount();

      await act(async () => {
        vi.advanceTimersByTime(15000);
      });

      // Should not have saved after unmount
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });
  });
});

describe("Serialization Utilities", () => {
  describe("serializeFormState", () => {
    it("should serialize form state to JSON string", () => {
      const state: FormState = {
        ...initialFormState,
        oasData: { openapi: "3.0.0", info: { title: "Test", version: "1.0.0" } },
        profile: "Advanced",
        isDirty: true,
      };

      const serialized = serializeFormState(state);
      expect(typeof serialized).toBe("string");

      const parsed = JSON.parse(serialized);
      expect(parsed.oasData.info.title).toBe("Test");
      expect(parsed.profile).toBe("Advanced");
    });

    it("should exclude undo/redo stacks from serialization", () => {
      const state: FormState = {
        ...initialFormState,
        undoStack: [initialFormState],
        redoStack: [initialFormState],
      };

      const serialized = serializeFormState(state);
      const parsed = JSON.parse(serialized);

      expect(parsed.undoStack).toBeUndefined();
      expect(parsed.redoStack).toBeUndefined();
    });

    it("should convert Set to array for editedPaths", () => {
      const state: FormState = {
        ...initialFormState,
        editedPaths: new Set(["/info/title", "/info/version"]),
      };

      const serialized = serializeFormState(state);
      const parsed = JSON.parse(serialized);

      expect(Array.isArray(parsed.editedPaths)).toBe(true);
      expect(parsed.editedPaths).toContain("/info/title");
    });
  });

  describe("deserializeFormState", () => {
    it("should deserialize JSON string to form state", () => {
      const json = JSON.stringify({
        oasData: { openapi: "3.0.0", info: { title: "Test", version: "1.0.0" } },
        profile: "Expert",
      });

      const state = deserializeFormState(json);
      expect(state?.oasData.info.title).toBe("Test");
      expect(state?.profile).toBe("Expert");
    });

    it("should convert array back to Set for editedPaths", () => {
      const json = JSON.stringify({
        oasData: {},
        editedPaths: ["/info/title", "/info/version"],
      });

      const state = deserializeFormState(json);
      expect(state?.editedPaths).toBeInstanceOf(Set);
      expect(state?.editedPaths.has("/info/title")).toBe(true);
    });

    it("should return null for invalid JSON", () => {
      const state = deserializeFormState("invalid json{");
      expect(state).toBeNull();
    });

    it("should return null for empty string", () => {
      const state = deserializeFormState("");
      expect(state).toBeNull();
    });

    it("should initialize empty undo/redo stacks", () => {
      const json = JSON.stringify({ oasData: {} });
      const state = deserializeFormState(json);

      expect(state?.undoStack).toEqual([]);
      expect(state?.redoStack).toEqual([]);
    });
  });
});

describe("clearPersistedState utility", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("should remove persisted state for given key", () => {
    localStorageMock.setItem(`${STORAGE_KEY_PREFIX}test-key`, "{}");

    clearPersistedState("test-key");

    expect(localStorageMock.removeItem).toHaveBeenCalledWith(
      `${STORAGE_KEY_PREFIX}test-key`
    );
  });

  it("should use default key when not specified", () => {
    clearPersistedState();

    expect(localStorageMock.removeItem).toHaveBeenCalledWith(
      `${STORAGE_KEY_PREFIX}default`
    );
  });
});
