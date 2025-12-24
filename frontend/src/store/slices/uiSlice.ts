/**
 * Redux slice for UI state management.
 *
 * Manages:
 * - Modal/dialog visibility
 * - Sidebar state
 * - Notifications/toasts
 * - Loading states
 * - UI preferences
 */

import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

export interface Notification {
  id: string;
  type: "success" | "error" | "warning" | "info";
  message: string;
  duration?: number;
}

export interface UIState {
  sidebarOpen: boolean;
  editingMode: boolean;
  previewMode: boolean;
  notifications: Notification[];
  modals: {
    createFile: boolean;
    importFile: boolean;
    exportFile: boolean;
    deleteFile: boolean;
    settings: boolean;
  };
  loading: {
    global: boolean;
    files: boolean;
    parse: boolean;
    export: boolean;
  };
}

const initialState: UIState = {
  sidebarOpen: true,
  editingMode: true,
  previewMode: true,
  notifications: [],
  modals: {
    createFile: false,
    importFile: false,
    exportFile: false,
    deleteFile: false,
    settings: false,
  },
  loading: {
    global: false,
    files: false,
    parse: false,
    export: false,
  },
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },

    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },

    toggleEditingMode: (state) => {
      state.editingMode = !state.editingMode;
    },

    togglePreviewMode: (state) => {
      state.previewMode = !state.previewMode;
    },

    openModal: (
      state,
      action: PayloadAction<keyof UIState["modals"]>
    ) => {
      state.modals[action.payload] = true;
    },

    closeModal: (
      state,
      action: PayloadAction<keyof UIState["modals"]>
    ) => {
      state.modals[action.payload] = false;
    },

    toggleModal: (
      state,
      action: PayloadAction<keyof UIState["modals"]>
    ) => {
      state.modals[action.payload] = !state.modals[action.payload];
    },

    closeAllModals: (state) => {
      Object.keys(state.modals).forEach((key) => {
        state.modals[key as keyof UIState["modals"]] = false;
      });
    },

    addNotification: (state, action: PayloadAction<Notification>) => {
      state.notifications.push(action.payload);

      // Auto-remove notification after duration
      if (action.payload.duration) {
        setTimeout(() => {
          state.notifications = state.notifications.filter(
            (n) => n.id !== action.payload.id
          );
        }, action.payload.duration);
      }
    },

    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(
        (n) => n.id !== action.payload
      );
    },

    clearNotifications: (state) => {
      state.notifications = [];
    },

    setLoading: (
      state,
      action: PayloadAction<{
        key: keyof UIState["loading"];
        value: boolean;
      }>
    ) => {
      state.loading[action.payload.key] = action.payload.value;
    },

    setGlobalLoading: (state, action: PayloadAction<boolean>) => {
      state.loading.global = action.payload;
    },
  },
});

export const {
  toggleSidebar,
  setSidebarOpen,
  toggleEditingMode,
  togglePreviewMode,
  openModal,
  closeModal,
  toggleModal,
  closeAllModals,
  addNotification,
  removeNotification,
  clearNotifications,
  setLoading,
  setGlobalLoading,
} = uiSlice.actions;

export default uiSlice.reducer;
