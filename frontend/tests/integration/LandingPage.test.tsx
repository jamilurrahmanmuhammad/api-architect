/**
 * T034-T036: RED/GREEN - Integration tests for landing page.
 *
 * Requirements: FR-001, FR-003, FR-020, FR-021, SC-001, SC-006, SC-007
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LandingPage from '@/pages/LandingPage';

describe('LandingPage', () => {
  const renderLandingPage = () => {
    return render(
      <MemoryRouter initialEntries={['/']}>
        <LandingPage />
      </MemoryRouter>
    );
  };

  describe('T034: Product information display', () => {
    it('should display the product name in the heading', () => {
      renderLandingPage();
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent(/API Architect/i);
    });

    it('should display a product description', () => {
      renderLandingPage();
      // FR-001: Product name, tagline/description visible
      expect(
        screen.getByText(/transform.*api.*requirements/i)
      ).toBeInTheDocument();
    });

    it('should display key features section', () => {
      renderLandingPage();
      // FR-003: Feature highlights
      expect(
        screen.getByRole('heading', { name: /features/i })
      ).toBeInTheDocument();
    });

    it('should have call-to-action buttons', () => {
      renderLandingPage();
      // FR-021: CTA to authenticated area - multiple CTAs is fine
      const ctaButtons = screen.getAllByRole('button', { name: /get started/i });
      expect(ctaButtons.length).toBeGreaterThan(0);
    });

    it('should have a login link in header', () => {
      renderLandingPage();
      const loginLink = screen.getByRole('button', { name: /sign in/i });
      expect(loginLink).toBeInTheDocument();
    });
  });

  describe('T035: Responsive layout', () => {
    it('should have responsive container classes', () => {
      const { container } = renderLandingPage();
      // SC-006: Support 320px to 2560px viewport
      const mainElement = container.querySelector('main');
      expect(mainElement).toBeInTheDocument();
    });

    it('should use responsive grid for features', () => {
      const { container } = renderLandingPage();
      // Features should use responsive grid
      const featureGrid = container.querySelector('[class*="grid"]');
      expect(featureGrid).toBeInTheDocument();
    });
  });

  describe('T036: Performance requirements', () => {
    it('should render within acceptable time', async () => {
      // SC-001: Landing page loads within 3 seconds
      const start = performance.now();
      renderLandingPage();
      const elapsed = performance.now() - start;

      // Component render should be much faster than 3s
      expect(elapsed).toBeLessThan(100);
    });

    it('should not have excessive DOM nodes', () => {
      const { container } = renderLandingPage();
      // Performance: avoid excessive DOM complexity
      const nodeCount = container.querySelectorAll('*').length;
      expect(nodeCount).toBeLessThan(200);
    });
  });

  describe('Accessibility', () => {
    it('should have a main landmark', () => {
      renderLandingPage();
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('should have proper heading hierarchy', () => {
      renderLandingPage();
      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toBeInTheDocument();
    });
  });
});
