/**
 * Pre-typed Redux hooks for use in the application.
 *
 * These hooks are pre-configured with the correct type definitions
 * for RootState and AppDispatch, so you don't need to repeat them
 * everywhere you use Redux.
 */

import { useDispatch, useSelector, type TypedUseSelectorHook } from "react-redux";
import type { RootState, AppDispatch } from "./index";

/**
 * Pre-typed dispatch hook.
 *
 * Usage:
 * ```tsx
 * const dispatch = useAppDispatch();
 * dispatch(setCurrentFile({ fileId: '123', content: 'DSL...' }));
 * ```
 */
export const useAppDispatch = () => useDispatch<AppDispatch>();

/**
 * Pre-typed selector hook.
 *
 * Usage:
 * ```tsx
 * const content = useAppSelector(state => state.editor.content);
 * const files = useAppSelector(state => state.file.list.files);
 * ```
 */
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
