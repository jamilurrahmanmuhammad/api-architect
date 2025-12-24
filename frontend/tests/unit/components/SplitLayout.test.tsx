/**
 * T063: Unit tests for SplitLayout component.
 *
 * Tests the resizable split-pane layout:
 * - Left pane (editor)
 * - Right pane (preview)
 * - Resizable divider
 * - Collapse/expand functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SplitLayout } from '@/components/Editor/SplitLayout';

describe('SplitLayout', () => {
  describe('Rendering', () => {
    it('should render the split layout container', () => {
      render(
        <SplitLayout
          leftPane={<div data-testid="left-content">Left</div>}
          rightPane={<div data-testid="right-content">Right</div>}
        />
      );
      expect(screen.getByTestId('split-layout')).toBeInTheDocument();
    });

    it('should render left pane content', () => {
      render(
        <SplitLayout
          leftPane={<div data-testid="left-content">Editor</div>}
          rightPane={<div data-testid="right-content">Preview</div>}
        />
      );
      expect(screen.getByTestId('left-content')).toBeInTheDocument();
      expect(screen.getByText('Editor')).toBeInTheDocument();
    });

    it('should render right pane content', () => {
      render(
        <SplitLayout
          leftPane={<div data-testid="left-content">Editor</div>}
          rightPane={<div data-testid="right-content">Preview</div>}
        />
      );
      expect(screen.getByTestId('right-content')).toBeInTheDocument();
      expect(screen.getByText('Preview')).toBeInTheDocument();
    });

    it('should render the resizable divider', () => {
      render(
        <SplitLayout
          leftPane={<div>Left</div>}
          rightPane={<div>Right</div>}
        />
      );
      expect(screen.getByTestId('split-divider')).toBeInTheDocument();
    });
  });

  describe('Initial Split Ratio', () => {
    it('should default to 50% split', () => {
      render(
        <SplitLayout
          leftPane={<div>Left</div>}
          rightPane={<div>Right</div>}
        />
      );
      const leftPane = screen.getByTestId('left-pane');
      expect(leftPane).toHaveStyle({ width: '50%' });
    });

    it('should respect custom initial split', () => {
      render(
        <SplitLayout
          leftPane={<div>Left</div>}
          rightPane={<div>Right</div>}
          initialSplit={60}
        />
      );
      const leftPane = screen.getByTestId('left-pane');
      expect(leftPane).toHaveStyle({ width: '60%' });
    });
  });

  describe('Minimum/Maximum Constraints', () => {
    it('should not allow left pane smaller than minimum', () => {
      render(
        <SplitLayout
          leftPane={<div>Left</div>}
          rightPane={<div>Right</div>}
          minLeftWidth={30}
          initialSplit={20}
        />
      );
      const leftPane = screen.getByTestId('left-pane');
      // Should be clamped to minimum
      expect(leftPane).toHaveStyle({ width: '30%' });
    });

    it('should not allow left pane larger than maximum', () => {
      render(
        <SplitLayout
          leftPane={<div>Left</div>}
          rightPane={<div>Right</div>}
          maxLeftWidth={80}
          initialSplit={90}
        />
      );
      const leftPane = screen.getByTestId('left-pane');
      // Should be clamped to maximum
      expect(leftPane).toHaveStyle({ width: '80%' });
    });
  });

  describe('Divider Interaction', () => {
    it('should have drag cursor on divider', () => {
      render(
        <SplitLayout
          leftPane={<div>Left</div>}
          rightPane={<div>Right</div>}
        />
      );
      const divider = screen.getByTestId('split-divider');
      expect(divider).toHaveClass('cursor-col-resize');
    });

    it('should show visual feedback on divider hover', () => {
      render(
        <SplitLayout
          leftPane={<div>Left</div>}
          rightPane={<div>Right</div>}
        />
      );
      const divider = screen.getByTestId('split-divider');
      fireEvent.mouseEnter(divider);
      expect(divider).toHaveClass('bg-blue-500');
    });

    it('should call onSplitChange when divider is dragged', () => {
      const handleChange = vi.fn();
      render(
        <SplitLayout
          leftPane={<div>Left</div>}
          rightPane={<div>Right</div>}
          onSplitChange={handleChange}
        />
      );

      const divider = screen.getByTestId('split-divider');

      // Simulate drag start
      fireEvent.mouseDown(divider);

      // Simulate drag (move event)
      fireEvent.mouseMove(document, { clientX: 600 });

      // Simulate drag end
      fireEvent.mouseUp(document);

      expect(handleChange).toHaveBeenCalled();
    });
  });

  describe('Collapse/Expand', () => {
    it('should render collapse button for right pane', () => {
      render(
        <SplitLayout
          leftPane={<div>Left</div>}
          rightPane={<div>Right</div>}
          collapsible
        />
      );
      expect(screen.getByTestId('collapse-button')).toBeInTheDocument();
    });

    it('should collapse right pane when collapse button clicked', () => {
      render(
        <SplitLayout
          leftPane={<div>Left</div>}
          rightPane={<div>Right</div>}
          collapsible
        />
      );

      const collapseButton = screen.getByTestId('collapse-button');
      fireEvent.click(collapseButton);

      const rightPane = screen.getByTestId('right-pane');
      expect(rightPane).toHaveClass('collapsed');
    });

    it('should expand right pane when expand button clicked', () => {
      render(
        <SplitLayout
          leftPane={<div>Left</div>}
          rightPane={<div>Right</div>}
          collapsible
        />
      );

      const collapseButton = screen.getByTestId('collapse-button');

      // Collapse
      fireEvent.click(collapseButton);

      // Expand
      const expandButton = screen.getByTestId('expand-button');
      fireEvent.click(expandButton);

      const rightPane = screen.getByTestId('right-pane');
      expect(rightPane).not.toHaveClass('collapsed');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels on divider', () => {
      render(
        <SplitLayout
          leftPane={<div>Left</div>}
          rightPane={<div>Right</div>}
        />
      );
      const divider = screen.getByTestId('split-divider');
      expect(divider).toHaveAttribute('role', 'separator');
      expect(divider).toHaveAttribute('aria-orientation', 'vertical');
    });

    it('should support keyboard navigation on divider', () => {
      const handleChange = vi.fn();
      render(
        <SplitLayout
          leftPane={<div>Left</div>}
          rightPane={<div>Right</div>}
          onSplitChange={handleChange}
        />
      );

      const divider = screen.getByTestId('split-divider');
      divider.focus();

      // Left arrow should decrease left pane
      fireEvent.keyDown(divider, { key: 'ArrowLeft' });
      expect(handleChange).toHaveBeenCalled();

      // Right arrow should increase left pane
      fireEvent.keyDown(divider, { key: 'ArrowRight' });
      expect(handleChange).toHaveBeenCalledTimes(2);
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      render(
        <SplitLayout
          leftPane={<div>Left</div>}
          rightPane={<div>Right</div>}
          className="custom-class"
        />
      );
      expect(screen.getByTestId('split-layout')).toHaveClass('custom-class');
    });

    it('should apply custom divider className', () => {
      render(
        <SplitLayout
          leftPane={<div>Left</div>}
          rightPane={<div>Right</div>}
          dividerClassName="custom-divider"
        />
      );
      expect(screen.getByTestId('split-divider')).toHaveClass('custom-divider');
    });
  });
});
