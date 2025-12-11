/**
 * Unit tests for ModuleGrid component.
 * T079: RED - ModuleGrid tests.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockModules = [
  {
    id: 'api-design',
    name: 'API Design',
    description: 'Design and document RESTful APIs',
    icon: 'FileCode',
    route: '/app/api-design',
    enabled: true,
    order: 1,
    badge: null,
  },
  {
    id: 'testing',
    name: 'Testing',
    description: 'Create and run API tests',
    icon: 'FlaskConical',
    route: '/app/testing',
    enabled: true,
    order: 2,
    badge: null,
  },
  {
    id: 'deployment',
    name: 'Deployment',
    description: 'Deploy APIs to cloud platforms',
    icon: 'Rocket',
    route: '/app/deployment',
    enabled: false,
    order: 6,
    badge: 'Coming Soon',
  },
];

describe('ModuleGrid', () => {
  describe('rendering', () => {
    it('should render all modules', async () => {
      const { ModuleGrid } = await import('@/components/modules/ModuleGrid');
      render(
        <MemoryRouter>
          <ModuleGrid modules={mockModules} />
        </MemoryRouter>
      );

      expect(screen.getByText('API Design')).toBeInTheDocument();
      expect(screen.getByText('Testing')).toBeInTheDocument();
      expect(screen.getByText('Deployment')).toBeInTheDocument();
    });

    it('should render in grid layout', async () => {
      const { ModuleGrid } = await import('@/components/modules/ModuleGrid');
      const { container } = render(
        <MemoryRouter>
          <ModuleGrid modules={mockModules} />
        </MemoryRouter>
      );

      const grid = container.querySelector('[data-testid="module-grid"]');
      expect(grid).toBeInTheDocument();
      expect(grid).toHaveClass('grid');
    });

    it('should render correct number of cards', async () => {
      const { ModuleGrid } = await import('@/components/modules/ModuleGrid');
      render(
        <MemoryRouter>
          <ModuleGrid modules={mockModules} />
        </MemoryRouter>
      );

      const cards = screen.getAllByTestId('module-card');
      expect(cards).toHaveLength(3);
    });
  });

  describe('filtering', () => {
    it('should filter to enabled modules only when showDisabled is false', async () => {
      const { ModuleGrid } = await import('@/components/modules/ModuleGrid');
      render(
        <MemoryRouter>
          <ModuleGrid modules={mockModules} showDisabled={false} />
        </MemoryRouter>
      );

      expect(screen.getByText('API Design')).toBeInTheDocument();
      expect(screen.getByText('Testing')).toBeInTheDocument();
      expect(screen.queryByText('Deployment')).not.toBeInTheDocument();
    });

    it('should show all modules when showDisabled is true', async () => {
      const { ModuleGrid } = await import('@/components/modules/ModuleGrid');
      render(
        <MemoryRouter>
          <ModuleGrid modules={mockModules} showDisabled={true} />
        </MemoryRouter>
      );

      expect(screen.getByText('Deployment')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('should render empty state when no modules', async () => {
      const { ModuleGrid } = await import('@/components/modules/ModuleGrid');
      render(
        <MemoryRouter>
          <ModuleGrid modules={[]} />
        </MemoryRouter>
      );

      expect(screen.getByText(/no modules/i)).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('should show loading skeletons when loading', async () => {
      const { ModuleGrid } = await import('@/components/modules/ModuleGrid');
      render(
        <MemoryRouter>
          <ModuleGrid modules={[]} isLoading={true} />
        </MemoryRouter>
      );

      const skeletons = screen.getAllByTestId('module-skeleton');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });
});
