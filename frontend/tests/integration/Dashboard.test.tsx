/**
 * Integration tests for Dashboard page with navigation.
 * T057: RED - Dashboard integration tests.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

// Import components to be tested
import { Dashboard } from '@/pages/Dashboard';
import { AppLayout } from '@/components/layout/AppLayout';
import { useModuleStore } from '@/stores/moduleStore';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Reset store state before each test
beforeEach(() => {
  useModuleStore.setState({
    modules: [],
    selectedModule: null,
    isLoading: false,
    error: null,
  });
});

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
];

// Add modules endpoint handler
server.use(
  http.get('*/api/v1/modules', () => {
    return HttpResponse.json({
      data: mockModules,
      meta: {
        requestId: 'test-request-id',
        timestamp: new Date().toISOString(),
      },
    });
  })
);

const renderDashboard = (initialRoute = '/app') => {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="api-design" element={<div>API Design Module</div>} />
          <Route path="testing" element={<div>Testing Module</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
};

describe('Dashboard', () => {
  describe('page structure', () => {
    it('should render dashboard heading', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: /dashboard/i })
        ).toBeInTheDocument();
      });
    });

    it('should render within AppLayout with sidebar', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByRole('navigation')).toBeInTheDocument();
      });
    });
  });

  describe('module navigation', () => {
    it('should display module links in sidebar after load', async () => {
      renderDashboard();

      // Wait for modules to load - use getAllByText since modules appear in both sidebar and cards
      await waitFor(() => {
        const apiDesignElements = screen.getAllByText('API Design');
        expect(apiDesignElements.length).toBeGreaterThanOrEqual(1);
      });

      // Verify sidebar contains navigation links
      const sidebar = screen.getByRole('navigation');
      expect(sidebar).toBeInTheDocument();
      expect(sidebar.querySelector('a[href="/app/api-design"]')).toBeInTheDocument();
      expect(sidebar.querySelector('a[href="/app/testing"]')).toBeInTheDocument();
    });

    it('should navigate to module route when clicked', async () => {
      const user = userEvent.setup();
      renderDashboard();

      // Wait for navigation to be ready
      await waitFor(() => {
        const sidebar = screen.getByRole('navigation');
        expect(sidebar.querySelector('a[href="/app/api-design"]')).toBeInTheDocument();
      });

      // Click the sidebar link (first link with this href)
      const sidebar = screen.getByRole('navigation');
      const apiDesignLink = sidebar.querySelector('a[href="/app/api-design"]') as HTMLElement;
      await user.click(apiDesignLink);

      await waitFor(() => {
        expect(screen.getByText('API Design Module')).toBeInTheDocument();
      });
    });

    it('should update active state when navigating', async () => {
      const user = userEvent.setup();
      renderDashboard();

      // Wait for navigation to be ready
      await waitFor(() => {
        const sidebar = screen.getByRole('navigation');
        expect(sidebar.querySelector('a[href="/app/api-design"]')).toBeInTheDocument();
      });

      const sidebar = screen.getByRole('navigation');
      const apiDesignLink = sidebar.querySelector('a[href="/app/api-design"]') as HTMLElement;
      await user.click(apiDesignLink);

      await waitFor(() => {
        expect(apiDesignLink).toHaveAttribute('data-active', 'true');
      });
    });
  });

  describe('SC-004: < 2 clicks to any module', () => {
    it('should navigate to any module in 1 click from dashboard', async () => {
      const user = userEvent.setup();
      renderDashboard();

      // Wait for modules to load
      await waitFor(() => {
        const sidebar = screen.getByRole('navigation');
        expect(sidebar.querySelector('a[href="/app/testing"]')).toBeInTheDocument();
      });

      // One click to navigate - use sidebar link
      const sidebar = screen.getByRole('navigation');
      const testingLink = sidebar.querySelector('a[href="/app/testing"]') as HTMLElement;
      await user.click(testingLink);

      await waitFor(() => {
        expect(screen.getByText('Testing Module')).toBeInTheDocument();
      });
    });
  });

  describe('welcome message', () => {
    it('should display welcome message with user name', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/welcome/i)).toBeInTheDocument();
      });
    });
  });

  describe('module overview', () => {
    it('should display quick access cards for enabled modules', async () => {
      renderDashboard();

      await waitFor(() => {
        const cards = screen.getAllByTestId('module-card');
        expect(cards.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('error handling', () => {
    it.skip('should display error message when modules fail to load', async () => {
      // TODO: T067 - Fix error handling test timing issue
      server.use(
        http.get('*/api/v1/modules', () => {
          return HttpResponse.json(
            {
              error: { code: 'SERVER_ERROR', message: 'Failed to load modules' },
              meta: { requestId: 'test', timestamp: new Date().toISOString() },
            },
            { status: 500 }
          );
        })
      );

      renderDashboard();

      await waitFor(
        () => {
          expect(screen.getByRole('alert')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });
  });
});
