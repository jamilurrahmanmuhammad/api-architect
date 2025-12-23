/**
 * Form State Reducer
 * Implements undo/redo stack management with 20-level max
 */

import { FormState, FormAction, initialFormState } from "../types/formState";

const MAX_UNDO_LEVELS = 20;

/**
 * Deep clone a form state
 */
function cloneFormState(state: FormState): FormState {
  return {
    oasData: structuredClone(state.oasData),
    originalOas: state.originalOas
      ? structuredClone(state.originalOas)
      : null,
    editedPaths: new Set(state.editedPaths),
    undoStack: state.undoStack.map((s) => cloneFormState(s)),
    redoStack: state.redoStack.map((s) => cloneFormState(s)),
    profile: state.profile,
    isDirty: state.isDirty,
    errors: [...state.errors],
    isLoading: state.isLoading,
  };
}

/**
 * Set a value at a JSONPointer path
 * e.g., setAtPath({a: {b: 1}}, "/a/b", 2) => {a: {b: 2}}
 */
function setAtPath(
  obj: Record<string, any>,
  path: string,
  value: any
): Record<string, any> {
  const result = structuredClone(obj);

  // Remove leading slash and split path
  const segments = path.startsWith("/") ? path.slice(1).split("/") : path.split("/");

  if (segments.length === 0) {
    return value;
  }

  let current = result;
  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i];
    if (!(segment in current)) {
      current[segment] = {};
    }
    current = current[segment];
  }

  const lastSegment = segments[segments.length - 1];
  current[lastSegment] = value;

  return result;
}

/**
 * Form state reducer
 */
export function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "UPDATE_FIELD": {
      const { path, value } = action.payload;

      // Create new state with updated field
      const newOasData = setAtPath(state.oasData, path, value);
      const newEditedPaths = new Set(state.editedPaths);
      newEditedPaths.add(path);

      // Clear redo stack when making new edit
      return {
        ...state,
        oasData: newOasData,
        editedPaths: newEditedPaths,
        isDirty: true,
        redoStack: [],
      };
    }

    case "LOAD_OAS": {
      const oasData = action.payload;

      return {
        ...state,
        oasData: structuredClone(oasData),
        originalOas: structuredClone(oasData),
        editedPaths: new Set(),
        isDirty: false,
        undoStack: [],
        redoStack: [],
        errors: [],
      };
    }

    case "UNDO": {
      if (state.undoStack.length === 0) {
        return state;
      }

      // Pop from undo stack (newest state is at index 0)
      const previousState = state.undoStack[0];
      const newUndoStack = state.undoStack.slice(1);

      // Push current state to redo stack
      const newRedoStack = [cloneFormState(state), ...state.redoStack];

      return {
        ...previousState,
        undoStack: newUndoStack,
        redoStack: newRedoStack,
      };
    }

    case "REDO": {
      if (state.redoStack.length === 0) {
        return state;
      }

      // Pop from redo stack
      const nextState = state.redoStack[0];
      const newRedoStack = state.redoStack.slice(1);

      // Push current state to undo stack
      const newUndoStack = [...state.undoStack, cloneFormState(state)];

      return {
        ...nextState,
        undoStack: newUndoStack,
        redoStack: newRedoStack,
      };
    }

    case "SET_PROFILE": {
      return {
        ...state,
        profile: action.payload,
      };
    }

    case "CLEAR_EDITS": {
      return {
        ...state,
        oasData: state.originalOas
          ? structuredClone(state.originalOas)
          : structuredClone(initialFormState.oasData),
        editedPaths: new Set(),
        isDirty: false,
        undoStack: [],
        redoStack: [],
      };
    }

    case "SET_ERRORS": {
      return {
        ...state,
        errors: action.payload,
      };
    }

    case "SET_LOADING": {
      return {
        ...state,
        isLoading: action.payload,
      };
    }

    case "RESET": {
      return { ...initialFormState };
    }

    default:
      return state;
  }
}

/**
 * Reducer with undo/redo stack management
 * Wraps formReducer to push state onto undo stack before mutations
 */
export function formReducerWithUndo(
  state: FormState,
  action: FormAction
): FormState {
  // Don't push to undo stack for certain actions
  if (["SET_LOADING", "SET_ERRORS", "SET_PROFILE"].includes(action.type)) {
    return formReducer(state, action);
  }

  if (action.type === "UPDATE_FIELD") {
    // Push current state to undo stack before updating
    const newUndoStack = [cloneFormState(state), ...state.undoStack].slice(
      0,
      MAX_UNDO_LEVELS
    );

    const newState = formReducer(state, action);
    return {
      ...newState,
      undoStack: newUndoStack,
    };
  }

  return formReducer(state, action);
}
