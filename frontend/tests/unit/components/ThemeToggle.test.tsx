/**
 * Unit tests for ThemeToggle component.
 * T069: RED - ThemeToggle component tests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock the theme store
const mockToggle = vi.fn();
const mockSetMode = vi.fn();

vi.mock('@/stores/themeStore', () => ({
  useThemeStore: vi.fn((selector) => {
    const state = {
      mode: 'system',
      resolvedTheme: 'light',
      toggle: mockToggle,
      setMode: mockSetMode,
    };
    return selector ? selector(state) : state;
  }),
}));

describe('ThemeToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render a toggle button', async () => {
      const { ThemeToggle } = await import(
        '@/components/common/ThemeToggle'
      );
      render(<ThemeToggle />);

      const button = screen.getByRole('button', { name: /theme/i });
      expect(button).toBeInTheDocument();
    });

    it('should show sun icon when in light mode', async () => {
      vi.doMock('@/stores/themeStore', () => ({
        useThemeStore: vi.fn((selector) => {
          const state = {
            mode: 'light',
            resolvedTheme: 'light',
            toggle: mockToggle,
            setMode: mockSetMode,
          };
          return selector ? selector(state) : state;
        }),
      }));

      vi.resetModules();
      const { ThemeToggle } = await import(
        '@/components/common/ThemeToggle'
      );
      render(<ThemeToggle />);

      // Look for sun icon (data-testid or aria-label)
      expect(screen.getByTestId('sun-icon')).toBeInTheDocument();
    });

    it('should show moon icon when in dark mode', async () => {
      vi.doMock('@/stores/themeStore', () => ({
        useThemeStore: vi.fn((selector) => {
          const state = {
            mode: 'dark',
            resolvedTheme: 'dark',
            toggle: mockToggle,
            setMode: mockSetMode,
          };
          return selector ? selector(state) : state;
        }),
      }));

      vi.resetModules();
      const { ThemeToggle } = await import(
        '@/components/common/ThemeToggle'
      );
      render(<ThemeToggle />);

      expect(screen.getByTestId('moon-icon')).toBeInTheDocument();
    });
  });

  describe('interaction', () => {
    it('should call toggle when clicked', async () => {
      const { ThemeToggle } = await import(
        '@/components/common/ThemeToggle'
      );
      render(<ThemeToggle />);

      const button = screen.getByRole('button', { name: /theme/i });
      fireEvent.click(button);

      expect(mockToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe('accessibility', () => {
    it('should have accessible label', async () => {
      const { ThemeToggle } = await import(
        '@/components/common/ThemeToggle'
      );
      render(<ThemeToggle />);

      const button = screen.getByRole('button');
      expect(button).toHaveAccessibleName();
    });
  });

  describe('performance', () => {
    it('should switch theme in under 100ms', async () => {
      const { ThemeToggle } = await import(
        '@/components/common/ThemeToggle'
      );
      render(<ThemeToggle />);

      const button = screen.getByRole('button', { name: /theme/i });

      const startTime = performance.now();
      fireEvent.click(button);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100);
    });
  });
});
