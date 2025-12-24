/**
 * Form State Types and Interfaces
 * Manages the entire form state including OAS data, edits, and undo/redo
 */

export interface FormState {
  /** Current OAS object (editable) */
  oasData: Record<string, any>;

  /** Original OAS object (for lossless merging) */
  originalOas: Record<string, any> | null;

  /** Set of edited paths (JSONPointer format) */
  editedPaths: Set<string>;

  /** Undo stack (max 20 levels) */
  undoStack: FormState[];

  /** Redo stack */
  redoStack: FormState[];

  /** Currently selected profile */
  profile: "Basic" | "Advanced" | "Technical" | "Expert";

  /** Whether form has unsaved changes */
  isDirty: boolean;

  /** Validation errors */
  errors: ValidationError[];

  /** Current loading state */
  isLoading: boolean;
}

export interface ValidationError {
  path: string;
  message: string;
  type: "error" | "warning";
}

export type FormAction =
  | { type: "UPDATE_FIELD"; payload: { path: string; value: any } }
  | { type: "LOAD_OAS"; payload: Record<string, any> }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "SET_PROFILE"; payload: FormState["profile"] }
  | { type: "CLEAR_EDITS" }
  | { type: "SET_ERRORS"; payload: ValidationError[] }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "RESET" };

/** Empty OAS template for new specs */
export const emptyOas = {
  openapi: "3.0.0",
  info: {
    title: "Untitled API",
    version: "1.0.0",
    description: "",
  },
  servers: [
    {
      url: "https://api.example.com",
      description: "Production server",
    },
  ],
  paths: {},
  components: {
    schemas: {},
  },
};

/** Initial form state */
export const initialFormState: FormState = {
  oasData: { ...emptyOas },
  originalOas: null,
  editedPaths: new Set(),
  undoStack: [],
  redoStack: [],
  profile: "Basic",
  isDirty: false,
  errors: [],
  isLoading: false,
};
