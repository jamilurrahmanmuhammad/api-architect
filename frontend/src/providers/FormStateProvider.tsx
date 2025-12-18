/**
 * FormStateProvider
 * Global form state management with Context API + useReducer
 * Provides form data, edit tracking, and undo/redo functionality
 */

import React, { createContext, useContext, useReducer, ReactNode } from "react";
import {
  FormState,
  FormAction,
  initialFormState,
} from "../types/formState";
import { formReducerWithUndo } from "../hooks/useFormReducer";

interface FormContextType {
  state: FormState;
  dispatch: React.Dispatch<FormAction>;
  canUndo: boolean;
  canRedo: boolean;
}

const FormContext = createContext<FormContextType | undefined>(undefined);

interface FormStateProviderProps {
  children: ReactNode;
  initialState?: FormState;
}

/**
 * FormStateProvider component
 * Wraps the application with form state context
 */
export function FormStateProvider({
  children,
  initialState = initialFormState,
}: FormStateProviderProps) {
  const [state, dispatch] = useReducer(
    formReducerWithUndo,
    initialState
  );

  const canUndo = state.undoStack.length > 0;
  const canRedo = state.redoStack.length > 0;

  const value: FormContextType = {
    state,
    dispatch,
    canUndo,
    canRedo,
  };

  return (
    <FormContext.Provider value={value}>
      {children}
    </FormContext.Provider>
  );
}

/**
 * Hook to use form state context
 * Throws error if used outside FormStateProvider
 */
export function useFormState(): FormContextType {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error("useFormState must be used within FormStateProvider");
  }
  return context;
}

/**
 * Helper hook to update a field
 */
export function useUpdateField() {
  const { dispatch } = useFormState();

  return (path: string, value: any) => {
    dispatch({
      type: "UPDATE_FIELD",
      payload: { path, value },
    });
  };
}

/**
 * Helper hook for undo/redo
 */
export function useUndoRedo() {
  const { dispatch, canUndo, canRedo } = useFormState();

  return {
    undo: () => dispatch({ type: "UNDO" }),
    redo: () => dispatch({ type: "REDO" }),
    canUndo,
    canRedo,
  };
}

/**
 * Helper hook to load OAS file
 */
export function useLoadOas() {
  const { dispatch } = useFormState();

  return (oasData: Record<string, any>) => {
    dispatch({
      type: "LOAD_OAS",
      payload: oasData,
    });
  };
}

/**
 * Helper hook for form metadata
 */
export function useFormMetadata() {
  const { state, dispatch } = useFormState();

  return {
    profile: state.profile,
    isDirty: state.isDirty,
    isLoading: state.isLoading,
    errors: state.errors,
    editedPaths: state.editedPaths,
    setProfile: (profile: FormState["profile"]) => {
      dispatch({ type: "SET_PROFILE", payload: profile });
    },
    clearEdits: () => {
      dispatch({ type: "CLEAR_EDITS" });
    },
    setErrors: (errors: any[]) => {
      dispatch({ type: "SET_ERRORS", payload: errors });
    },
    setLoading: (loading: boolean) => {
      dispatch({ type: "SET_LOADING", payload: loading });
    },
  };
}
