/**
 * T019: Unit tests for ExportDialog component.
 *
 * Tests for Feature 003 - OpenAPI Export.
 * TDD: Tests written BEFORE implementation.
 *
 * Tests the export dialog that:
 * - Renders format options (YAML, JSON)
 * - Renders version options (3.0, 3.1)
 * - Triggers export on button click
 * - Shows loading state during export
 * - Can be cancelled
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExportDialog } from '@/components/Editor/ExportDialog';

describe('ExportDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onExport: vi.fn(),
    isExporting: false,
    error: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render when open', () => {
      render(<ExportDialog {...defaultProps} />);
      expect(screen.getByTestId('export-dialog')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(<ExportDialog {...defaultProps} isOpen={false} />);
      expect(screen.queryByTestId('export-dialog')).not.toBeInTheDocument();
    });

    it('should display dialog title', () => {
      render(<ExportDialog {...defaultProps} />);
      expect(screen.getByText(/export to openapi/i)).toBeInTheDocument();
    });
  });

  describe('Format Options', () => {
    it('should render YAML format option', () => {
      render(<ExportDialog {...defaultProps} />);
      expect(screen.getByLabelText(/yaml/i)).toBeInTheDocument();
    });

    it('should render JSON format option', () => {
      render(<ExportDialog {...defaultProps} />);
      expect(screen.getByLabelText(/json/i)).toBeInTheDocument();
    });

    it('should have YAML selected by default', () => {
      render(<ExportDialog {...defaultProps} />);
      const yamlRadio = screen.getByLabelText(/yaml/i);
      expect(yamlRadio).toBeChecked();
    });

    it('should allow selecting JSON format', async () => {
      const user = userEvent.setup();
      render(<ExportDialog {...defaultProps} />);

      const jsonRadio = screen.getByLabelText(/json/i);
      await user.click(jsonRadio);

      expect(jsonRadio).toBeChecked();
    });
  });

  describe('Version Options', () => {
    it('should render OpenAPI 3.0 version option', () => {
      render(<ExportDialog {...defaultProps} />);
      expect(screen.getByLabelText(/3\.0/)).toBeInTheDocument();
    });

    it('should render OpenAPI 3.1 version option', () => {
      render(<ExportDialog {...defaultProps} />);
      expect(screen.getByLabelText(/3\.1/)).toBeInTheDocument();
    });

    it('should have 3.0 selected by default', () => {
      render(<ExportDialog {...defaultProps} />);
      const v30Radio = screen.getByLabelText(/3\.0/);
      expect(v30Radio).toBeChecked();
    });
  });

  describe('Export Button', () => {
    it('should render export button', () => {
      render(<ExportDialog {...defaultProps} />);
      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
    });

    it('should call onExport with selected format and version', async () => {
      const user = userEvent.setup();
      const mockOnExport = vi.fn();
      render(<ExportDialog {...defaultProps} onExport={mockOnExport} />);

      await user.click(screen.getByRole('button', { name: /export/i }));

      expect(mockOnExport).toHaveBeenCalledWith('yaml', '3.0');
    });

    it('should call onExport with JSON format when selected', async () => {
      const user = userEvent.setup();
      const mockOnExport = vi.fn();
      render(<ExportDialog {...defaultProps} onExport={mockOnExport} />);

      await user.click(screen.getByLabelText(/json/i));
      await user.click(screen.getByRole('button', { name: /export/i }));

      expect(mockOnExport).toHaveBeenCalledWith('json', '3.0');
    });

    it('should call onExport with 3.1 version when selected', async () => {
      const user = userEvent.setup();
      const mockOnExport = vi.fn();
      render(<ExportDialog {...defaultProps} onExport={mockOnExport} />);

      await user.click(screen.getByLabelText(/3\.1/));
      await user.click(screen.getByRole('button', { name: /export/i }));

      expect(mockOnExport).toHaveBeenCalledWith('yaml', '3.1');
    });
  });

  describe('Cancel Button', () => {
    it('should render cancel button', () => {
      render(<ExportDialog {...defaultProps} />);
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should call onClose when cancel clicked', async () => {
      const user = userEvent.setup();
      const mockOnClose = vi.fn();
      render(<ExportDialog {...defaultProps} onClose={mockOnClose} />);

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('should show loading state when exporting', () => {
      render(<ExportDialog {...defaultProps} isExporting={true} />);
      expect(screen.getByTestId('export-loading')).toBeInTheDocument();
    });

    it('should disable export button when exporting', () => {
      render(<ExportDialog {...defaultProps} isExporting={true} />);
      expect(screen.getByRole('button', { name: /export/i })).toBeDisabled();
    });

    it('should disable cancel button when exporting', () => {
      render(<ExportDialog {...defaultProps} isExporting={true} />);
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    });
  });

  describe('Error State', () => {
    it('should display error message when error prop is set', () => {
      render(<ExportDialog {...defaultProps} error="Export failed" />);
      expect(screen.getByText(/export failed/i)).toBeInTheDocument();
    });

    it('should display error alert styling', () => {
      render(<ExportDialog {...defaultProps} error="Export failed" />);
      expect(screen.getByTestId('export-error')).toBeInTheDocument();
    });
  });
});
