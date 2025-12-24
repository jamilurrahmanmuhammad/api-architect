/**
 * Redux store configuration and setup.
 *
 * Uses Redux Toolkit for simplified state management with:
 * - Built-in immer for immutable updates
 * - Built-in thunk middleware for async operations
 * - Simplified reducer creation with createSlice
 * - Redux DevTools integration
 */

import { configureStore } from "@reduxjs/toolkit";
import editorReducer from "./slices/editorSlice";
import fileReducer from "./slices/fileSlice";
import uiReducer from "./slices/uiSlice";

export const store = configureStore({
  reducer: {
    editor: editorReducer,
    file: fileReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore non-serializable values in specific actions if needed
        // e.g., file uploads, dates from API
        warnAfter: 128,
        ignoredActions: [],
        ignoredPaths: [],
      },
    }),
  devTools: import.meta.env.DEV,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
