/**
 * Unit tests for Sidebar component.
 * T055-T056, T058: RED - Sidebar navigation tests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock modules
const mockModules = [
  {
    id: 'api-design',
    name: 'API Design',
    description: 'Design APIs',
    icon: 'FileCode',
    route: '/app/api-design',
    enabled: true,
    order: 1,
  },
  {
    id: 'testing',
    name: 'Testing',
    description: 'Test APIs',
    icon: 'FlaskConical',
    route: '/app/testing',
    enabled: true,
    order: 2,
  },
  {
    id: 'deployment',
    name: 'Deployment',
    description: 'Deploy APIs',
    icon: 'Rocket',
    route: '/app/deployment',
    enabled: false,
    order: 3,
  },
];

vi.mock('@/stores/moduleStore', () => ({
  useModuleStore: vi.fn((selector) => {
    const state = {
      modules: mockModules,
      selectedModule: null,
      isLoading: false,
      error: null,
      fetchModules: vi.fn(),
      selectModule: vi.fn(),
      getEnabledModules: () => mockModules.filter((m) => m.enabled),
    };
    return selector ? selector(state) : state;
  }),
}));

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('navigation rendering', () => {
    it('should render enabled modules as navigation items', async () => {
      const { Sidebar } = await import('@/components/layout/Sidebar');
      render(
        <MemoryRouter>
          <Sidebar />
        </MemoryRouter>
      );

      expect(screen.getByText('API Design')).toBeInTheDocument();
      expect(screen.getByText('Testing')).toBeInTheDocument();
    });

    it('should not render disabled modules in navigation', async () => {
      const { Sidebar } = await import('@/components/layout/Sidebar');
      render(
        <MemoryRouter>
          <Sidebar />
        </MemoryRouter>
      );

      expect(screen.queryByText('Deployment')).not.toBeInTheDocument();
    });

    it('should render navigation links with correct routes', async () => {
      const { Sidebar } = await import('@/components/layout/Sidebar');
      render(
        <MemoryRouter>
          <Sidebar />
        </MemoryRouter>
      );

      const apiDesignLink = screen.getByRole('link', { name: /API Design/i });
      expect(apiDesignLink).toHaveAttribute('href', '/app/api-design');
    });
  });

  describe('active state indication (T056)', () => {
    it('should highlight active navigation item based on current route', async () => {
      const { Sidebar } = await import('@/components/layout/Sidebar');
      render(
        <MemoryRouter initialEntries={['/app/api-design']}>
          <Sidebar />
        </MemoryRouter>
      );

      const apiDesignLink = screen.getByRole('link', { name: /API Design/i });
      // Active link should have data-active attribute or specific class
      expect(apiDesignLink).toHaveAttribute('data-active', 'true');
    });

    it('should not highlight inactive navigation items', async () => {
      const { Sidebar } = await import('@/components/layout/Sidebar');
      render(
        <MemoryRouter initialEntries={['/app/api-design']}>
          <Sidebar />
        </MemoryRouter>
      );

      const testingLink = screen.getByRole('link', { name: /Testing/i });
      expect(testingLink).not.toHaveAttribute('data-active', 'true');
    });
  });

  describe('mobile sidebar toggle (T058)', () => {
    it('should render toggle button for mobile', async () => {
      const { Sidebar } = await import('@/components/layout/Sidebar');
      render(
        <MemoryRouter>
          <Sidebar />
        </MemoryRouter>
      );

      const toggleButton = screen.getByRole('button', {
        name: /toggle.*sidebar/i,
      });
      expect(toggleButton).toBeInTheDocument();
    });

    it('should toggle sidebar visibility on button click', async () => {
      const { Sidebar } = await import('@/components/layout/Sidebar');
      render(
        <MemoryRouter>
          <Sidebar />
        </MemoryRouter>
      );

      const toggleButton = screen.getByRole('button', {
        name: /toggle.*sidebar/i,
      });
      const sidebar = screen.getByRole('navigation');

      // Initial state - visible on desktop
      expect(sidebar).toBeVisible();

      // Click to toggle
      fireEvent.click(toggleButton);

      // Check for collapsed state (via data attribute or class)
      expect(sidebar).toHaveAttribute('data-collapsed');
    });
  });

  describe('loading state', () => {
    it('should show loading indicator when fetching modules', async () => {
      vi.doMock('@/stores/moduleStore', () => ({
        useModuleStore: vi.fn((selector) => {
          const state = {
            modules: [],
            selectedModule: null,
            isLoading: true,
            error: null,
            fetchModules: vi.fn(),
            selectModule: vi.fn(),
            getEnabledModules: () => [],
          };
          return selector ? selector(state) : state;
        }),
      }));

      vi.resetModules();
      const { Sidebar } = await import('@/components/layout/Sidebar');
      render(
        <MemoryRouter>
          <Sidebar />
        </MemoryRouter>
      );

      expect(screen.getByTestId('sidebar-loading')).toBeInTheDocument();
    });
  });
});
