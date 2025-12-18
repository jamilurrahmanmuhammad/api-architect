/**
 * T060: Unit tests for PreviewPane component.
 *
 * Tests the preview panel that displays parsed DSL entities:
 * - Services, Models, Operations, Errors tabs
 * - Entity details display
 * - Click-to-select functionality
 * - Loading and empty states
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PreviewPane, type ParsedResult } from '@/components/Editor/PreviewPane';

describe('PreviewPane', () => {
  const mockParsedResult: ParsedResult = {
    services: [
      {
        name: 'Petstore API',
        version: '1.0.0',
        base_path: '/api/v1',
        description: 'A sample API',
        location: { line: 1, column: 1 },
      },
    ],
    models: [
      {
        name: 'Pet',
        description: 'A pet in the store',
        fields: [
          { name: 'id', type: 'integer', required: true, location: { line: 10, column: 1 } },
          { name: 'name', type: 'string', required: true, location: { line: 11, column: 1 } },
        ],
        location: { line: 8, column: 1 },
      },
      {
        name: 'Category',
        description: 'Pet category',
        fields: [{ name: 'id', type: 'integer', required: true, location: { line: 20, column: 1 } }],
        location: { line: 18, column: 1 },
      },
    ],
    operations: [
      {
        method: 'GET',
        path: '/pets',
        description: 'List all pets',
        response_model: 'Pet[]',
        location: { line: 25, column: 1 },
      },
      {
        method: 'POST',
        path: '/pets',
        description: 'Add a pet',
        request_model: 'Pet',
        response_model: 'Pet',
        location: { line: 30, column: 1 },
      },
    ],
    errors: [
      {
        status_code: 404,
        name: 'NotFound',
        description: 'Resource not found',
        location: { line: 40, column: 1 },
      },
    ],
    parse_errors: [],
    valid_entities: 6,
    total_errors: 0,
  };

  describe('Rendering', () => {
    it('should render the preview pane container', () => {
      render(<PreviewPane data={null} isLoading={false} />);
      expect(screen.getByTestId('preview-pane')).toBeInTheDocument();
    });

    it('should display tab navigation', () => {
      render(<PreviewPane data={mockParsedResult} isLoading={false} />);
      expect(screen.getByRole('tablist')).toBeInTheDocument();
    });

    it('should display Services tab', () => {
      render(<PreviewPane data={mockParsedResult} isLoading={false} />);
      expect(screen.getByRole('tab', { name: /services/i })).toBeInTheDocument();
    });

    it('should display Models tab', () => {
      render(<PreviewPane data={mockParsedResult} isLoading={false} />);
      expect(screen.getByRole('tab', { name: /models/i })).toBeInTheDocument();
    });

    it('should display Operations tab', () => {
      render(<PreviewPane data={mockParsedResult} isLoading={false} />);
      expect(screen.getByRole('tab', { name: /operations/i })).toBeInTheDocument();
    });

    it('should display Errors tab', () => {
      render(<PreviewPane data={mockParsedResult} isLoading={false} />);
      expect(screen.getByRole('tab', { name: /errors/i })).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator when isLoading is true', () => {
      render(<PreviewPane data={null} isLoading={true} />);
      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
    });

    it('should hide loading indicator when isLoading is false', () => {
      render(<PreviewPane data={mockParsedResult} isLoading={false} />);
      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty message when no data', () => {
      render(<PreviewPane data={null} isLoading={false} />);
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });

    it('should show empty message when data has no entities', () => {
      const emptyData: ParsedResult = {
        services: [],
        models: [],
        operations: [],
        errors: [],
        parse_errors: [],
        valid_entities: 0,
        total_errors: 0,
      };
      render(<PreviewPane data={emptyData} isLoading={false} />);
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('should switch to Models tab when clicked', () => {
      render(<PreviewPane data={mockParsedResult} isLoading={false} />);

      const modelsTab = screen.getByRole('tab', { name: /models/i });
      fireEvent.click(modelsTab);

      expect(modelsTab).toHaveAttribute('aria-selected', 'true');
    });

    it('should switch to Operations tab when clicked', () => {
      render(<PreviewPane data={mockParsedResult} isLoading={false} />);

      const operationsTab = screen.getByRole('tab', { name: /operations/i });
      fireEvent.click(operationsTab);

      expect(operationsTab).toHaveAttribute('aria-selected', 'true');
    });

    it('should show entity count badges on tabs', () => {
      render(<PreviewPane data={mockParsedResult} isLoading={false} />);

      // Models tab should show count of 2
      expect(screen.getByTestId('models-count')).toHaveTextContent('2');

      // Operations tab should show count of 2
      expect(screen.getByTestId('operations-count')).toHaveTextContent('2');
    });
  });

  describe('Services Display', () => {
    it('should display service name', () => {
      render(<PreviewPane data={mockParsedResult} isLoading={false} />);

      // Click Services tab
      const servicesTab = screen.getByRole('tab', { name: /services/i });
      fireEvent.click(servicesTab);

      expect(screen.getByText('Petstore API')).toBeInTheDocument();
    });

    it('should display service version', () => {
      render(<PreviewPane data={mockParsedResult} isLoading={false} />);

      const servicesTab = screen.getByRole('tab', { name: /services/i });
      fireEvent.click(servicesTab);

      expect(screen.getByText('1.0.0')).toBeInTheDocument();
    });
  });

  describe('Models Display', () => {
    it('should display model names', () => {
      render(<PreviewPane data={mockParsedResult} isLoading={false} />);

      // Click Models tab
      const modelsTab = screen.getByRole('tab', { name: /models/i });
      fireEvent.click(modelsTab);

      expect(screen.getByText('Pet')).toBeInTheDocument();
      expect(screen.getByText('Category')).toBeInTheDocument();
    });

    it('should display model field count', () => {
      render(<PreviewPane data={mockParsedResult} isLoading={false} />);

      const modelsTab = screen.getByRole('tab', { name: /models/i });
      fireEvent.click(modelsTab);

      // Pet has 2 fields
      expect(screen.getByTestId('model-Pet-field-count')).toHaveTextContent('2 fields');
    });
  });

  describe('Operations Display', () => {
    it('should display operation methods and paths', () => {
      render(<PreviewPane data={mockParsedResult} isLoading={false} />);

      // Click Operations tab
      const operationsTab = screen.getByRole('tab', { name: /operations/i });
      fireEvent.click(operationsTab);

      expect(screen.getByText('GET')).toBeInTheDocument();
      // Multiple operations may have the same path
      expect(screen.getAllByText('/pets').length).toBeGreaterThanOrEqual(1);
    });

    it('should color-code HTTP methods', () => {
      render(<PreviewPane data={mockParsedResult} isLoading={false} />);

      const operationsTab = screen.getByRole('tab', { name: /operations/i });
      fireEvent.click(operationsTab);

      const getMethod = screen.getByTestId('method-GET');
      expect(getMethod).toHaveClass('method-get');
    });
  });

  describe('Errors Display', () => {
    it('should display error codes and names', () => {
      render(<PreviewPane data={mockParsedResult} isLoading={false} />);

      // Click Errors tab
      const errorsTab = screen.getByRole('tab', { name: /errors/i });
      fireEvent.click(errorsTab);

      expect(screen.getByText('404')).toBeInTheDocument();
      expect(screen.getByText('NotFound')).toBeInTheDocument();
    });
  });

  describe('Entity Selection', () => {
    it('should call onEntityClick when model is clicked', () => {
      const handleClick = vi.fn();
      render(<PreviewPane data={mockParsedResult} isLoading={false} onEntityClick={handleClick} />);

      // Click Models tab
      const modelsTab = screen.getByRole('tab', { name: /models/i });
      fireEvent.click(modelsTab);

      // Click on Pet model
      const petModel = screen.getByTestId('entity-model-Pet');
      fireEvent.click(petModel);

      expect(handleClick).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'model',
          name: 'Pet',
          location: { line: 8, column: 1 },
        })
      );
    });

    it('should call onEntityClick when operation is clicked', () => {
      const handleClick = vi.fn();
      render(<PreviewPane data={mockParsedResult} isLoading={false} onEntityClick={handleClick} />);

      // Click Operations tab
      const operationsTab = screen.getByRole('tab', { name: /operations/i });
      fireEvent.click(operationsTab);

      // Click on first operation
      const operation = screen.getByTestId('entity-operation-0');
      fireEvent.click(operation);

      expect(handleClick).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'operation',
          location: { line: 25, column: 1 },
        })
      );
    });

    it('should highlight selected entity', () => {
      render(
        <PreviewPane
          data={mockParsedResult}
          isLoading={false}
          selectedLocation={{ line: 8, column: 1 }}
        />
      );

      // Click Models tab
      const modelsTab = screen.getByRole('tab', { name: /models/i });
      fireEvent.click(modelsTab);

      // Pet model at line 8 should be highlighted
      const petModel = screen.getByTestId('entity-model-Pet');
      expect(petModel).toHaveClass('selected');
    });
  });

  describe('Parse Errors Display', () => {
    it('should show parse errors count when errors exist', () => {
      const dataWithErrors: ParsedResult = {
        ...mockParsedResult,
        parse_errors: [
          { line: 5, column: 1, message: 'Invalid syntax', error_type: 'SYNTAX_ERROR' },
        ],
        total_errors: 1,
      };

      render(<PreviewPane data={dataWithErrors} isLoading={false} />);
      expect(screen.getByTestId('parse-errors-badge')).toHaveTextContent('1');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels on tabs', () => {
      render(<PreviewPane data={mockParsedResult} isLoading={false} />);

      const tablist = screen.getByRole('tablist');
      expect(tablist).toHaveAttribute('aria-label');
    });

    it('should have tabindex on entity items', () => {
      render(<PreviewPane data={mockParsedResult} isLoading={false} />);

      const modelsTab = screen.getByRole('tab', { name: /models/i });
      fireEvent.click(modelsTab);

      const petModel = screen.getByTestId('entity-model-Pet');
      expect(petModel).toHaveAttribute('tabIndex', '0');
    });
  });
});
