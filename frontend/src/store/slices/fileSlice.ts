/**
 * Redux slice for file management state.
 *
 * Manages:
 * - List of requirement files
 * - Current file metadata
 * - File operations (create, update, delete)
 * - Pagination state
 */

import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

export interface RequirementFile {
  id: string;
  name: string;
  content: string;
  version: number;
  status: "draft" | "reviewing" | "approved" | "published";
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface FileListState {
  files: RequirementFile[];
  total: number;
  page: number;
  page_size: number;
  isLoading: boolean;
  error: string | null;
}

export interface FileState {
  list: FileListState;
  currentFile: RequirementFile | null;
  isDeleting: boolean;
  deleteError: string | null;
}

const initialListState: FileListState = {
  files: [],
  total: 0,
  page: 1,
  page_size: 10,
  isLoading: false,
  error: null,
};

const initialState: FileState = {
  list: initialListState,
  currentFile: null,
  isDeleting: false,
  deleteError: null,
};

const fileSlice = createSlice({
  name: "file",
  initialState,
  reducers: {
    setLoadingFiles: (state, action: PayloadAction<boolean>) => {
      state.list.isLoading = action.payload;
    },

    setFileList: (
      state,
      action: PayloadAction<{
        files: RequirementFile[];
        total: number;
        page: number;
        page_size: number;
      }>
    ) => {
      state.list.files = action.payload.files;
      state.list.total = action.payload.total;
      state.list.page = action.payload.page;
      state.list.page_size = action.payload.page_size;
      state.list.isLoading = false;
      state.list.error = null;
    },

    setFileListError: (state, action: PayloadAction<string>) => {
      state.list.error = action.payload;
      state.list.isLoading = false;
    },

    setCurrentFile: (state, action: PayloadAction<RequirementFile>) => {
      state.currentFile = action.payload;
    },

    updateCurrentFile: (
      state,
      action: PayloadAction<Partial<RequirementFile>>
    ) => {
      if (state.currentFile) {
        state.currentFile = {
          ...state.currentFile,
          ...action.payload,
        };
      }
    },

    addFile: (state, action: PayloadAction<RequirementFile>) => {
      state.list.files.unshift(action.payload);
      state.list.total += 1;
    },

    updateFile: (state, action: PayloadAction<RequirementFile>) => {
      const index = state.list.files.findIndex(
        (f) => f.id === action.payload.id
      );
      if (index !== -1) {
        state.list.files[index] = action.payload;
      }
      if (state.currentFile?.id === action.payload.id) {
        state.currentFile = action.payload;
      }
    },

    removeFile: (state, action: PayloadAction<string>) => {
      state.list.files = state.list.files.filter(
        (f) => f.id !== action.payload
      );
      state.list.total -= 1;
      if (state.currentFile?.id === action.payload) {
        state.currentFile = null;
      }
    },

    setDeleting: (state, action: PayloadAction<boolean>) => {
      state.isDeleting = action.payload;
    },

    setDeleteError: (state, action: PayloadAction<string | null>) => {
      state.deleteError = action.payload;
    },

    clearCurrentFile: (state) => {
      state.currentFile = null;
    },

    setPage: (state, action: PayloadAction<number>) => {
      state.list.page = action.payload;
    },
  },
});

export const {
  setLoadingFiles,
  setFileList,
  setFileListError,
  setCurrentFile,
  updateCurrentFile,
  addFile,
  updateFile,
  removeFile,
  setDeleting,
  setDeleteError,
  clearCurrentFile,
  setPage,
} = fileSlice.actions;

export default fileSlice.reducer;
