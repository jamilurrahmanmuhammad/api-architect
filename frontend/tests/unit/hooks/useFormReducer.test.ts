/**
 * Unit Tests for Form Reducer
 * Tests undo/redo functionality, field updates, and state management
 */

import { describe, it, expect, beforeEach } from "vitest";
import { formReducerWithUndo } from "../../../src/hooks/useFormReducer";
import {
  FormState,
  initialFormState,
  emptyOas,
} from "../../../src/types/formState";

let initialState: FormState;

beforeEach(() => {
  initialState = {
    oasData: JSON.parse(JSON.stringify(emptyOas)),
    originalOas: null,
    editedPaths: new Set(),
    undoStack: [],
    redoStack: [],
    profile: "Basic",
    isDirty: false,
    errors: [],
    isLoading: false,
  };
});

describe("formReducerWithUndo", () => {
  describe("UPDATE_FIELD", () => {
    it("should update a simple field", () => {
      const newState = formReducerWithUndo(initialState, {
        type: "UPDATE_FIELD",
        payload: { path: "/info/title", value: "My API" },
      });

      expect(newState.oasData.info.title).toBe("My API");
      expect(newState.isDirty).toBe(true);
      expect(newState.editedPaths.has("/info/title")).toBe(true);
    });

    it("should track edited paths", () => {
      const newState = formReducerWithUndo(initialState, {
        type: "UPDATE_FIELD",
        payload: { path: "/info/title", value: "New Title" },
      });

      expect(newState.editedPaths.has("/info/title")).toBe(true);
    });

    it("should push current state to undo stack", () => {
      const newState = formReducerWithUndo(initialState, {
        type: "UPDATE_FIELD",
        payload: { path: "/info/title", value: "Updated" },
      });

      expect(newState.undoStack.length).toBe(1);
      expect(newState.undoStack[0].oasData.info.title).toBe("Untitled API");
    });

    it("should clear redo stack on new edit", () => {
      let state = initialState;

      // Update field
      state = formReducerWithUndo(state, {
        type: "UPDATE_FIELD",
        payload: { path: "/info/title", value: "First" },
      });

      // Undo
      state = formReducerWithUndo(state, { type: "UNDO" });
      expect(state.redoStack.length).toBe(1);

      // Make new edit
      state = formReducerWithUndo(state, {
        type: "UPDATE_FIELD",
        payload: { path: "/info/version", value: "2.0.0" },
      });

      expect(state.redoStack.length).toBe(0);
    });

    it("should not mutate original OAS data", () => {
      const originalData = JSON.parse(JSON.stringify(initialState.oasData));

      formReducerWithUndo(initialState, {
        type: "UPDATE_FIELD",
        payload: { path: "/info/title", value: "Modified" },
      });

      expect(initialState.oasData).toEqual(originalData);
    });

    it("should support nested path updates", () => {
      const newState = formReducerWithUndo(initialState, {
        type: "UPDATE_FIELD",
        payload: {
          path: "/components/schemas/Pet/properties/name",
          value: "Fluffy",
        },
      });

      expect(newState.oasData.components.schemas.Pet.properties.name).toBe(
        "Fluffy"
      );
    });

    it("should limit undo stack to 20 items", () => {
      let state = initialState;

      // Make 25 edits
      for (let i = 0; i < 25; i++) {
        state = formReducerWithUndo(state, {
          type: "UPDATE_FIELD",
          payload: { path: `/info/title`, value: `Title ${i}` },
        });
      }

      expect(state.undoStack.length).toBeLessThanOrEqual(20);
    });
  });

  describe("LOAD_OAS", () => {
    it("should load new OAS data", () => {
      const newOas = {
        openapi: "3.0.0",
        info: { title: "Pet Store", version: "1.0.0" },
        paths: { "/pets": {} },
      };

      const newState = formReducerWithUndo(initialState, {
        type: "LOAD_OAS",
        payload: newOas,
      });

      expect(newState.oasData).toEqual(newOas);
      expect(newState.originalOas).toEqual(newOas);
    });

    it("should clear edited paths on load", () => {
      let state = initialState;

      // Edit something
      state = formReducerWithUndo(state, {
        type: "UPDATE_FIELD",
        payload: { path: "/info/title", value: "Edited" },
      });

      expect(state.editedPaths.size).toBeGreaterThan(0);

      // Load new OAS
      const newOas = {
        openapi: "3.0.0",
        info: { title: "New API", version: "1.0.0" },
        paths: {},
      };

      state = formReducerWithUndo(state, {
        type: "LOAD_OAS",
        payload: newOas,
      });

      expect(state.editedPaths.size).toBe(0);
    });

    it("should clear undo/redo stacks on load", () => {
      let state = initialState;

      state = formReducerWithUndo(state, {
        type: "UPDATE_FIELD",
        payload: { path: "/info/title", value: "First" },
      });

      const newOas = { openapi: "3.0.0", info: {}, paths: {} };

      state = formReducerWithUndo(state, {
        type: "LOAD_OAS",
        payload: newOas,
      });

      expect(state.undoStack.length).toBe(0);
      expect(state.redoStack.length).toBe(0);
    });

    it("should mark form as not dirty after load", () => {
      let state = initialState;

      state = formReducerWithUndo(state, {
        type: "UPDATE_FIELD",
        payload: { path: "/info/title", value: "Dirty" },
      });

      expect(state.isDirty).toBe(true);

      state = formReducerWithUndo(state, {
        type: "LOAD_OAS",
        payload: { openapi: "3.0.0", info: {}, paths: {} },
      });

      expect(state.isDirty).toBe(false);
    });
  });

  describe("UNDO", () => {
    it("should undo a field update", () => {
      let state = initialState;

      state = formReducerWithUndo(state, {
        type: "UPDATE_FIELD",
        payload: { path: "/info/title", value: "Changed" },
      });

      expect(state.oasData.info.title).toBe("Changed");

      state = formReducerWithUndo(state, { type: "UNDO" });

      expect(state.oasData.info.title).toBe("Untitled API");
    });

    it("should move state to redo stack", () => {
      let state = initialState;

      state = formReducerWithUndo(state, {
        type: "UPDATE_FIELD",
        payload: { path: "/info/title", value: "Changed" },
      });

      state = formReducerWithUndo(state, { type: "UNDO" });

      expect(state.redoStack.length).toBe(1);
      expect(state.redoStack[0].oasData.info.title).toBe("Changed");
    });

    it("should do nothing if undo stack is empty", () => {
      const newState = formReducerWithUndo(initialState, { type: "UNDO" });

      expect(newState).toEqual(initialState);
    });

    it("should undo multiple edits in sequence", () => {
      let state = initialState;

      state = formReducerWithUndo(state, {
        type: "UPDATE_FIELD",
        payload: { path: "/info/title", value: "First" },
      });

      state = formReducerWithUndo(state, {
        type: "UPDATE_FIELD",
        payload: { path: "/info/version", value: "2.0.0" },
      });

      expect(state.oasData.info.title).toBe("First");
      expect(state.oasData.info.version).toBe("2.0.0");

      // Undo version update
      state = formReducerWithUndo(state, { type: "UNDO" });
      expect(state.oasData.info.version).toBe("1.0.0");

      // Undo title update
      state = formReducerWithUndo(state, { type: "UNDO" });
      expect(state.oasData.info.title).toBe("Untitled API");
    });
  });

  describe("REDO", () => {
    it("should redo an undone change", () => {
      let state = initialState;

      state = formReducerWithUndo(state, {
        type: "UPDATE_FIELD",
        payload: { path: "/info/title", value: "Changed" },
      });

      state = formReducerWithUndo(state, { type: "UNDO" });
      expect(state.oasData.info.title).toBe("Untitled API");

      state = formReducerWithUndo(state, { type: "REDO" });
      expect(state.oasData.info.title).toBe("Changed");
    });

    it("should do nothing if redo stack is empty", () => {
      const newState = formReducerWithUndo(initialState, { type: "REDO" });

      expect(newState).toEqual(initialState);
    });

    it("should move state back to undo stack", () => {
      let state = initialState;

      state = formReducerWithUndo(state, {
        type: "UPDATE_FIELD",
        payload: { path: "/info/title", value: "Changed" },
      });

      state = formReducerWithUndo(state, { type: "UNDO" });
      expect(state.undoStack.length).toBe(0);

      state = formReducerWithUndo(state, { type: "REDO" });
      expect(state.undoStack.length).toBe(1);
    });

    it("should redo multiple changes in sequence", () => {
      let state = initialState;

      state = formReducerWithUndo(state, {
        type: "UPDATE_FIELD",
        payload: { path: "/info/title", value: "First" },
      });

      state = formReducerWithUndo(state, {
        type: "UPDATE_FIELD",
        payload: { path: "/info/version", value: "2.0.0" },
      });

      // Undo both
      state = formReducerWithUndo(state, { type: "UNDO" });
      state = formReducerWithUndo(state, { type: "UNDO" });

      expect(state.oasData.info.title).toBe("Untitled API");
      expect(state.oasData.info.version).toBe("1.0.0");

      // Redo both
      state = formReducerWithUndo(state, { type: "REDO" });
      expect(state.oasData.info.title).toBe("First");

      state = formReducerWithUndo(state, { type: "REDO" });
      expect(state.oasData.info.version).toBe("2.0.0");
    });
  });

  describe("SET_PROFILE", () => {
    it("should change profile", () => {
      const newState = formReducerWithUndo(initialState, {
        type: "SET_PROFILE",
        payload: "Advanced",
      });

      expect(newState.profile).toBe("Advanced");
    });

    it("should not affect other state", () => {
      let state = initialState;

      state = formReducerWithUndo(state, {
        type: "UPDATE_FIELD",
        payload: { path: "/info/title", value: "Changed" },
      });

      const edited = JSON.parse(JSON.stringify(state));

      state = formReducerWithUndo(state, {
        type: "SET_PROFILE",
        payload: "Expert",
      });

      expect(state.oasData).toEqual(edited.oasData);
      expect(state.editedPaths).toEqual(edited.editedPaths);
    });
  });

  describe("CLEAR_EDITS", () => {
    it("should revert OAS to original", () => {
      let state = initialState;

      state = formReducerWithUndo(state, {
        type: "LOAD_OAS",
        payload: {
          openapi: "3.0.0",
          info: { title: "Original", version: "1.0.0" },
          paths: {},
        },
      });

      state = formReducerWithUndo(state, {
        type: "UPDATE_FIELD",
        payload: { path: "/info/title", value: "Modified" },
      });

      state = formReducerWithUndo(state, { type: "CLEAR_EDITS" });

      expect(state.oasData.info.title).toBe("Original");
    });

    it("should clear edited paths", () => {
      let state = initialState;

      state = formReducerWithUndo(state, {
        type: "UPDATE_FIELD",
        payload: { path: "/info/title", value: "Changed" },
      });

      expect(state.editedPaths.size).toBeGreaterThan(0);

      state = formReducerWithUndo(state, { type: "CLEAR_EDITS" });

      expect(state.editedPaths.size).toBe(0);
    });

    it("should mark form as not dirty", () => {
      let state = initialState;

      state = formReducerWithUndo(state, {
        type: "UPDATE_FIELD",
        payload: { path: "/info/title", value: "Changed" },
      });

      expect(state.isDirty).toBe(true);

      state = formReducerWithUndo(state, { type: "CLEAR_EDITS" });

      expect(state.isDirty).toBe(false);
    });
  });

  describe("SET_ERRORS", () => {
    it("should set validation errors", () => {
      const errors = [
        { path: "/info/title", message: "Required", type: "error" as const },
      ];

      const newState = formReducerWithUndo(initialState, {
        type: "SET_ERRORS",
        payload: errors,
      });

      expect(newState.errors).toEqual(errors);
    });
  });

  describe("SET_LOADING", () => {
    it("should toggle loading state", () => {
      const newState = formReducerWithUndo(initialState, {
        type: "SET_LOADING",
        payload: true,
      });

      expect(newState.isLoading).toBe(true);
    });
  });

  describe("RESET", () => {
    it("should reset to initial state", () => {
      let state = initialState;

      state = formReducerWithUndo(state, {
        type: "UPDATE_FIELD",
        payload: { path: "/info/title", value: "Changed" },
      });

      state = formReducerWithUndo(state, { type: "RESET" });

      expect(state).toEqual(initialFormState);
    });
  });

  describe("undo/redo integration", () => {
    it("should maintain undo stack limit during edits", () => {
      let state = initialState;

      // Create 25 edits
      for (let i = 0; i < 25; i++) {
        state = formReducerWithUndo(state, {
          type: "UPDATE_FIELD",
          payload: { path: "/info/title", value: `Edit ${i}` },
        });
      }

      expect(state.undoStack.length).toBeLessThanOrEqual(20);

      // Undo should still work correctly
      state = formReducerWithUndo(state, { type: "UNDO" });
      expect(state.oasData.info.title).toMatch(/Edit \d+/);
    });

    it("should handle complex undo/redo cycles", () => {
      let state = initialState;

      state = formReducerWithUndo(state, {
        type: "UPDATE_FIELD",
        payload: { path: "/info/title", value: "A" },
      });

      state = formReducerWithUndo(state, {
        type: "UPDATE_FIELD",
        payload: { path: "/info/version", value: "1.0.0" },
      });

      state = formReducerWithUndo(state, { type: "UNDO" });
      expect(state.oasData.info.version).toBe("1.0.0");

      state = formReducerWithUndo(state, {
        type: "UPDATE_FIELD",
        payload: { path: "/info/description", value: "New" },
      });

      expect(state.redoStack.length).toBe(0);

      state = formReducerWithUndo(state, { type: "UNDO" });
      state = formReducerWithUndo(state, { type: "UNDO" });

      expect(state.oasData.info.title).toBe("Untitled API");
    });
  });
});
