/**
 * Integration tests for NotFound (404) page.
 * T111: RED - NotFound page tests.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

describe('NotFound', () => {
  it('should render 404 message', async () => {
    const { NotFound } = await import('@/pages/NotFound');
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>
    );

    expect(screen.getByText(/404/)).toBeInTheDocument();
  });

  it('should have link to home', async () => {
    const { NotFound } = await import('@/pages/NotFound');
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /home|back/i })).toBeInTheDocument();
  });

  it('should display helpful message', async () => {
    const { NotFound } = await import('@/pages/NotFound');
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>
    );

    // Page has "Page not found" text
    expect(screen.getByText(/page not found/i)).toBeInTheDocument();
  });
});
