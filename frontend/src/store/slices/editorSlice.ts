/**
 * Redux slice for editor state management.
 *
 * Manages:
 * - Current file being edited
 * - Editor content and parsing state
 * - Parse results and errors
 * - Real-time preview state
 */

import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

export interface ParseError {
  line: number;
  column: number;
  error_type: string;
  message: string;
  guidance?: string;
}

export interface EditorState {
  currentFileId: string | null;
  content: string;
  isSaving: boolean;
  lastSavedAt: string | null;
  parseErrors: ParseError[];
  isParsingValid: boolean;
  previewData: {
    services: Array<{ id: string; name: string }>;
    models: Array<{ id: string; name: string }>;
    operations: Array<{ id: string; method: string; path: string }>;
    errors: Array<{ id: string; status_code: number; name: string }>;
  };
  lastParseTime: number; // milliseconds
}

const initialState: EditorState = {
  currentFileId: null,
  content: "",
  isSaving: false,
  lastSavedAt: null,
  parseErrors: [],
  isParsingValid: true,
  previewData: {
    services: [],
    models: [],
    operations: [],
    errors: [],
  },
  lastParseTime: 0,
};

const editorSlice = createSlice({
  name: "editor",
  initialState,
  reducers: {
    setCurrentFile: (
      state,
      action: PayloadAction<{ fileId: string; content: string }>
    ) => {
      state.currentFileId = action.payload.fileId;
      state.content = action.payload.content;
      state.parseErrors = [];
      state.isParsingValid = true;
    },

    updateContent: (state, action: PayloadAction<string>) => {
      state.content = action.payload;
    },

    setSaving: (state, action: PayloadAction<boolean>) => {
      state.isSaving = action.payload;
    },

    setLastSavedAt: (state, action: PayloadAction<string>) => {
      state.lastSavedAt = action.payload;
    },

    setParseErrors: (state, action: PayloadAction<ParseError[]>) => {
      state.parseErrors = action.payload;
      state.isParsingValid = action.payload.length === 0;
    },

    setPreviewData: (
      state,
      action: PayloadAction<EditorState["previewData"]>
    ) => {
      state.previewData = action.payload;
    },

    setLastParseTime: (state, action: PayloadAction<number>) => {
      state.lastParseTime = action.payload;
    },

    clearEditor: (state) => {
      state.currentFileId = null;
      state.content = "";
      state.isSaving = false;
      state.lastSavedAt = null;
      state.parseErrors = [];
      state.isParsingValid = true;
      state.previewData = {
        services: [],
        models: [],
        operations: [],
        errors: [],
      };
      state.lastParseTime = 0;
    },
  },
});

export const {
  setCurrentFile,
  updateContent,
  setSaving,
  setLastSavedAt,
  setParseErrors,
  setPreviewData,
  setLastParseTime,
  clearEditor,
} = editorSlice.actions;

export default editorSlice.reducer;
