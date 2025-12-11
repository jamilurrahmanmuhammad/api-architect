/**
 * Unit tests for ModuleCard component.
 * T078, T080, T081: RED - ModuleCard tests.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockModule = {
  id: 'api-design',
  name: 'API Design',
  description: 'Design and document RESTful APIs',
  icon: 'FileCode',
  route: '/app/api-design',
  enabled: true,
  order: 1,
  badge: null,
};

const mockDisabledModule = {
  id: 'deployment',
  name: 'Deployment',
  description: 'Deploy APIs to cloud platforms',
  icon: 'Rocket',
  route: '/app/deployment',
  enabled: false,
  order: 6,
  badge: 'Coming Soon',
};

describe('ModuleCard', () => {
  describe('rendering', () => {
    it('should render module name', async () => {
      const { ModuleCard } = await import('@/components/modules/ModuleCard');
      render(
        <MemoryRouter>
          <ModuleCard module={mockModule} />
        </MemoryRouter>
      );

      expect(screen.getByText('API Design')).toBeInTheDocument();
    });

    it('should render module description', async () => {
      const { ModuleCard } = await import('@/components/modules/ModuleCard');
      render(
        <MemoryRouter>
          <ModuleCard module={mockModule} />
        </MemoryRouter>
      );

      expect(
        screen.getByText('Design and document RESTful APIs')
      ).toBeInTheDocument();
    });

    it('should render module icon', async () => {
      const { ModuleCard } = await import('@/components/modules/ModuleCard');
      render(
        <MemoryRouter>
          <ModuleCard module={mockModule} />
        </MemoryRouter>
      );

      // Icon should be rendered (lucide component)
      expect(screen.getByTestId('module-icon')).toBeInTheDocument();
    });

    it('should render badge when present', async () => {
      const moduleWithBadge = { ...mockModule, badge: 'New' };
      const { ModuleCard } = await import('@/components/modules/ModuleCard');
      render(
        <MemoryRouter>
          <ModuleCard module={moduleWithBadge} />
        </MemoryRouter>
      );

      expect(screen.getByText('New')).toBeInTheDocument();
    });
  });

  describe('disabled module display (T080)', () => {
    it('should show disabled styling for disabled modules', async () => {
      const { ModuleCard } = await import('@/components/modules/ModuleCard');
      render(
        <MemoryRouter>
          <ModuleCard module={mockDisabledModule} />
        </MemoryRouter>
      );

      const card = screen.getByTestId('module-card');
      expect(card).toHaveAttribute('data-disabled', 'true');
    });

    it('should show disabled badge for disabled modules', async () => {
      const { ModuleCard } = await import('@/components/modules/ModuleCard');
      render(
        <MemoryRouter>
          <ModuleCard module={mockDisabledModule} />
        </MemoryRouter>
      );

      expect(screen.getByText('Coming Soon')).toBeInTheDocument();
    });

    it('should not be clickable when disabled', async () => {
      const { ModuleCard } = await import('@/components/modules/ModuleCard');
      render(
        <MemoryRouter>
          <ModuleCard module={mockDisabledModule} />
        </MemoryRouter>
      );

      const link = screen.queryByRole('link');
      expect(link).toBeNull();
    });
  });

  describe('click navigation (T081)', () => {
    it('should render as link when enabled', async () => {
      const { ModuleCard } = await import('@/components/modules/ModuleCard');
      render(
        <MemoryRouter>
          <ModuleCard module={mockModule} />
        </MemoryRouter>
      );

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/app/api-design');
    });

    it('should have correct route on click', async () => {
      const { ModuleCard } = await import('@/components/modules/ModuleCard');
      render(
        <MemoryRouter>
          <ModuleCard module={mockModule} />
        </MemoryRouter>
      );

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/app/api-design');
    });
  });

  describe('accessibility', () => {
    it('should have accessible name', async () => {
      const { ModuleCard } = await import('@/components/modules/ModuleCard');
      render(
        <MemoryRouter>
          <ModuleCard module={mockModule} />
        </MemoryRouter>
      );

      const link = screen.getByRole('link');
      expect(link).toHaveAccessibleName();
    });
  });
});
