/**
 * Redux provider component.
 *
 * Sets up Redux store for the entire application with:
 * - ConfigureStore (Redux Toolkit)
 * - DevTools integration
 * - All registered slices (editor, file, ui)
 */

import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { store } from "../store";

interface ReduxProviderProps {
  children: ReactNode;
}

export function ReduxProvider({ children }: ReduxProviderProps) {
  return <Provider store={store}>{children}</Provider>;
}

export { store };
