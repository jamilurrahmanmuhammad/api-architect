/**
 * Unit tests for LoadingSpinner component.
 * T112: RED - LoadingSpinner tests.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('LoadingSpinner', () => {
  it('should render spinner', async () => {
    const { LoadingSpinner } = await import('@/components/common/LoadingSpinner');
    render(<LoadingSpinner />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should have accessible label', async () => {
    const { LoadingSpinner } = await import('@/components/common/LoadingSpinner');
    render(<LoadingSpinner />);

    expect(screen.getByRole('status')).toHaveAccessibleName();
  });

  it('should accept custom size prop', async () => {
    const { LoadingSpinner } = await import('@/components/common/LoadingSpinner');
    const { container } = render(<LoadingSpinner size="lg" />);

    const spinner = container.querySelector('[data-size="lg"]');
    expect(spinner).toBeInTheDocument();
  });
});
