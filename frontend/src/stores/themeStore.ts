/**
 * Theme store with Zustand persist middleware.
 * T072: GREEN - Theme state management with persistence.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeState {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;

  // Actions
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === 'system') {
    return getSystemTheme();
  }
  return mode;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'system',
      resolvedTheme: getSystemTheme(),

      setMode: (mode: ThemeMode) => {
        set({
          mode,
          resolvedTheme: resolveTheme(mode),
        });
      },

      toggle: () => {
        const { mode, resolvedTheme } = get();
        let newMode: ThemeMode;

        if (mode === 'system') {
          // Toggle from system to opposite of resolved
          newMode = resolvedTheme === 'dark' ? 'light' : 'dark';
        } else {
          // Toggle between light and dark
          newMode = mode === 'light' ? 'dark' : 'light';
        }

        set({
          mode: newMode,
          resolvedTheme: resolveTheme(newMode),
        });
      },
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ mode: state.mode }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.resolvedTheme = resolveTheme(state.mode);
        }
      },
    }
  )
);
