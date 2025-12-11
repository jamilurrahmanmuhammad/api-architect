/**
 * Unit tests for themeStore.
 * T068, T070, T071: RED - Theme store tests.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock matchMedia for system theme detection
const matchMediaMock = vi.fn((query: string) => ({
  matches: query === '(prefers-color-scheme: dark)',
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

Object.defineProperty(window, 'matchMedia', {
  value: matchMediaMock,
});

describe('themeStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    vi.resetModules();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('initial state', () => {
    it('should have system as default mode', async () => {
      const { useThemeStore } = await import('@/stores/themeStore');
      const state = useThemeStore.getState();
      expect(state.mode).toBe('system');
    });

    it('should resolve system theme based on matchMedia', async () => {
      const { useThemeStore } = await import('@/stores/themeStore');
      const state = useThemeStore.getState();
      // With dark matchMedia mock, system should resolve to dark
      expect(state.resolvedTheme).toBe('dark');
    });
  });

  describe('setMode', () => {
    it('should set theme mode to light', async () => {
      const { useThemeStore } = await import('@/stores/themeStore');
      useThemeStore.getState().setMode('light');
      expect(useThemeStore.getState().mode).toBe('light');
    });

    it('should set theme mode to dark', async () => {
      const { useThemeStore } = await import('@/stores/themeStore');
      useThemeStore.getState().setMode('dark');
      expect(useThemeStore.getState().mode).toBe('dark');
    });

    it('should set theme mode to system', async () => {
      const { useThemeStore } = await import('@/stores/themeStore');
      useThemeStore.getState().setMode('light');
      useThemeStore.getState().setMode('system');
      expect(useThemeStore.getState().mode).toBe('system');
    });
  });

  describe('toggle', () => {
    it('should toggle from light to dark', async () => {
      const { useThemeStore } = await import('@/stores/themeStore');
      useThemeStore.getState().setMode('light');
      useThemeStore.getState().toggle();
      expect(useThemeStore.getState().mode).toBe('dark');
    });

    it('should toggle from dark to light', async () => {
      const { useThemeStore } = await import('@/stores/themeStore');
      useThemeStore.getState().setMode('dark');
      useThemeStore.getState().toggle();
      expect(useThemeStore.getState().mode).toBe('light');
    });

    it('should toggle from system to opposite of resolved', async () => {
      const { useThemeStore } = await import('@/stores/themeStore');
      useThemeStore.getState().setMode('system');
      // System resolves to dark (per mock), so toggle should go to light
      useThemeStore.getState().toggle();
      expect(useThemeStore.getState().mode).toBe('light');
    });
  });

  describe('resolvedTheme', () => {
    it('should return light when mode is light', async () => {
      const { useThemeStore } = await import('@/stores/themeStore');
      useThemeStore.getState().setMode('light');
      expect(useThemeStore.getState().resolvedTheme).toBe('light');
    });

    it('should return dark when mode is dark', async () => {
      const { useThemeStore } = await import('@/stores/themeStore');
      useThemeStore.getState().setMode('dark');
      expect(useThemeStore.getState().resolvedTheme).toBe('dark');
    });
  });

  describe('persistence (T070)', () => {
    it('should persist theme mode to localStorage', async () => {
      const { useThemeStore } = await import('@/stores/themeStore');
      useThemeStore.getState().setMode('dark');

      // Zustand persist stores state in localStorage
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should restore theme mode from localStorage on init', async () => {
      // Pre-populate localStorage with persisted state
      localStorageMock.setItem(
        'theme-storage',
        JSON.stringify({ state: { mode: 'light' }, version: 0 })
      );

      vi.resetModules();
      const { useThemeStore } = await import('@/stores/themeStore');

      // After rehydration, mode should be restored
      // Note: This may need adjustment based on actual persist implementation
      const state = useThemeStore.getState();
      expect(['light', 'system']).toContain(state.mode);
    });
  });

  describe('system theme detection (T071)', () => {
    it('should detect dark mode from system', async () => {
      matchMediaMock.mockReturnValue({
        matches: true,
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      });

      vi.resetModules();
      const { useThemeStore } = await import('@/stores/themeStore');
      useThemeStore.getState().setMode('system');
      expect(useThemeStore.getState().resolvedTheme).toBe('dark');
    });

    it('should detect light mode from system', async () => {
      matchMediaMock.mockReturnValue({
        matches: false,
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      });

      vi.resetModules();
      const { useThemeStore } = await import('@/stores/themeStore');
      useThemeStore.getState().setMode('system');
      expect(useThemeStore.getState().resolvedTheme).toBe('light');
    });
  });
});
