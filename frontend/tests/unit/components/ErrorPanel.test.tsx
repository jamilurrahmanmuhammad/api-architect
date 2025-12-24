/**
 * T047: Unit tests for ErrorPanel component.
 *
 * Tests the error panel that displays validation errors and warnings.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorPanel, type ValidationError } from '@/components/Editor/ErrorPanel';

describe('ErrorPanel', () => {
  const mockErrors: ValidationError[] = [
    {
      line: 5,
      column: 10,
      message: "Undefined model reference 'User'",
      error_type: 'UNDEFINED_REFERENCE',
      severity: 'error',
      guidance: 'Define the model before referencing it',
    },
    {
      line: 12,
      column: 3,
      message: "Invalid type 'badtype'",
      error_type: 'INVALID_TYPE',
      severity: 'error',
      guidance: 'Use valid types like string, integer, boolean',
    },
    {
      line: 20,
      column: 1,
      message: 'Consider using a more descriptive name',
      error_type: 'NAMING_SUGGESTION',
      severity: 'warning',
      guidance: null,
    },
  ];

  describe('Rendering', () => {
    it('should render the error panel container', () => {
      render(<ErrorPanel errors={[]} />);
      expect(screen.getByTestId('error-panel')).toBeInTheDocument();
    });

    it('should display "No issues found" when no errors', () => {
      render(<ErrorPanel errors={[]} />);
      expect(screen.getByTestId('no-errors')).toHaveTextContent('No issues found');
    });

    it('should display error count', () => {
      render(<ErrorPanel errors={mockErrors} />);
      expect(screen.getByTestId('error-count')).toHaveTextContent('2 errors');
    });

    it('should display warning count', () => {
      render(<ErrorPanel errors={mockErrors} />);
      expect(screen.getByTestId('warning-count')).toHaveTextContent('1 warnings');
    });

    it('should render all error items', () => {
      render(<ErrorPanel errors={mockErrors} />);
      const errorList = screen.getByTestId('error-list');
      expect(errorList.children).toHaveLength(3);
    });
  });

  describe('Error Item Display', () => {
    it('should display error location (line and column)', () => {
      render(<ErrorPanel errors={[mockErrors[0]]} />);
      const location = screen.getByTestId('error-location');
      expect(location).toHaveTextContent('Line 5, Column 10');
    });

    it('should display error message', () => {
      render(<ErrorPanel errors={[mockErrors[0]]} />);
      const message = screen.getByTestId('error-message');
      expect(message).toHaveTextContent("Undefined model reference 'User'");
    });

    it('should display error type', () => {
      render(<ErrorPanel errors={[mockErrors[0]]} />);
      const errorType = screen.getByTestId('error-type');
      // Error type is formatted with underscores replaced by spaces
      expect(errorType).toHaveTextContent('UNDEFINED REFERENCE');
    });

    it('should display guidance when available', () => {
      render(<ErrorPanel errors={[mockErrors[0]]} />);
      const guidance = screen.getByTestId('error-guidance');
      expect(guidance).toHaveTextContent('Define the model before referencing it');
    });

    it('should not display guidance when not available', () => {
      const errorWithoutGuidance: ValidationError = {
        ...mockErrors[0],
        guidance: null,
      };
      render(<ErrorPanel errors={[errorWithoutGuidance]} />);
      expect(screen.queryByTestId('error-guidance')).not.toBeInTheDocument();
    });

    it('should apply correct severity class to error items', () => {
      render(<ErrorPanel errors={mockErrors} />);
      const firstError = screen.getByTestId('error-item-0');
      const warning = screen.getByTestId('error-item-2');

      expect(firstError).toHaveClass('error');
      expect(warning).toHaveClass('warning');
    });
  });

  describe('Interactivity', () => {
    it('should call onErrorClick when clicking an error item', () => {
      const handleClick = vi.fn();
      render(<ErrorPanel errors={mockErrors} onErrorClick={handleClick} />);

      const firstError = screen.getByTestId('error-item-0');
      fireEvent.click(firstError);

      expect(handleClick).toHaveBeenCalledTimes(1);
      expect(handleClick).toHaveBeenCalledWith(mockErrors[0]);
    });

    it('should have role="button" for accessibility', () => {
      render(<ErrorPanel errors={mockErrors} />);
      const firstError = screen.getByTestId('error-item-0');
      expect(firstError).toHaveAttribute('role', 'button');
    });

    it('should be focusable with tabIndex', () => {
      render(<ErrorPanel errors={mockErrors} />);
      const firstError = screen.getByTestId('error-item-0');
      expect(firstError).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('Collapsible Behavior', () => {
    it('should render collapsed state when isCollapsed is true', () => {
      render(<ErrorPanel errors={mockErrors} isCollapsed={true} />);
      const panel = screen.getByTestId('error-panel');
      expect(panel).toHaveClass('collapsed');
    });

    it('should show issue count in collapsed state', () => {
      render(<ErrorPanel errors={mockErrors} isCollapsed={true} />);
      const toggleButton = screen.getByTestId('toggle-button');
      expect(toggleButton).toHaveTextContent('3 issues');
    });

    it('should show singular "issue" for single error', () => {
      render(<ErrorPanel errors={[mockErrors[0]]} isCollapsed={true} />);
      const toggleButton = screen.getByTestId('toggle-button');
      expect(toggleButton).toHaveTextContent('1 issue');
    });

    it('should call onToggleCollapse when toggle button is clicked', () => {
      const handleToggle = vi.fn();
      render(<ErrorPanel errors={mockErrors} isCollapsed={true} onToggleCollapse={handleToggle} />);

      const toggleButton = screen.getByTestId('toggle-button');
      fireEvent.click(toggleButton);

      expect(handleToggle).toHaveBeenCalledTimes(1);
    });

    it('should show Collapse button when expanded', () => {
      const handleToggle = vi.fn();
      render(
        <ErrorPanel errors={mockErrors} isCollapsed={false} onToggleCollapse={handleToggle} />
      );

      const toggleButton = screen.getByTestId('toggle-button');
      // Button uses icon with aria-label instead of text
      expect(toggleButton).toHaveAttribute('aria-label', 'Collapse');
    });
  });

  describe('Empty State', () => {
    it('should render empty state message', () => {
      render(<ErrorPanel errors={[]} />);
      expect(screen.getByTestId('no-errors')).toBeInTheDocument();
    });

    it('should show 0 errors and 0 warnings counts', () => {
      render(<ErrorPanel errors={[]} />);
      expect(screen.getByTestId('error-count')).toHaveTextContent('0 errors');
      expect(screen.getByTestId('warning-count')).toHaveTextContent('0 warnings');
    });
  });
});

describe('ErrorPanel with useValidator hook integration', () => {
  // These tests will be implemented after T051 (useValidator hook)

  it.todo('should update when validation result changes');
  it.todo('should show loading state during validation');
  it.todo('should handle validation errors gracefully');
});
