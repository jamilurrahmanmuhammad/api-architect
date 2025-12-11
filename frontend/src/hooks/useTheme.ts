/**
 * useTheme hook with system detection.
 * T073: GREEN - Theme hook.
 */

import { useEffect } from 'react';
import { useThemeStore, type ThemeMode, type ResolvedTheme } from '@/stores/themeStore';

interface UseThemeReturn {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
  isDark: boolean;
  isLight: boolean;
}

export function useTheme(): UseThemeReturn {
  const mode = useThemeStore((state) => state.mode);
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const setMode = useThemeStore((state) => state.setMode);
  const toggle = useThemeStore((state) => state.toggle);

  // Listen for system theme changes
  useEffect(() => {
    if (mode !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      // Force update resolved theme when system preference changes
      setMode('system');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [mode, setMode]);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(resolvedTheme);
  }, [resolvedTheme]);

  return {
    mode,
    resolvedTheme,
    setMode,
    toggle,
    isDark: resolvedTheme === 'dark',
    isLight: resolvedTheme === 'light',
  };
}
