/**
 * Unit tests for editorSlice Redux reducer.
 *
 * Tests:
 * - State updates
 * - Action creators
 * - Initial state
 */

import { describe, it, expect } from 'vitest';
import editorReducer, {
  EditorState,
  setCurrentFile,
  updateContent,
  setSaving,
  setParseErrors,
  setPreviewData,
  clearEditor,
} from '../../../src/store/slices/editorSlice';

describe('editorSlice', () => {
  const initialState: EditorState = {
    currentFileId: null,
    content: '',
    isSaving: false,
    lastSavedAt: null,
    parseErrors: [],
    isParsingValid: true,
    previewData: {
      services: [],
      models: [],
      operations: [],
      errors: [],
    },
    lastParseTime: 0,
  };

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = editorReducer(undefined, { type: 'unknown' });
      expect(state).toEqual(initialState);
    });
  });

  describe('setCurrentFile', () => {
    it('should set current file and content', () => {
      const action = setCurrentFile({
        fileId: 'file-123',
        content: '## Service\nname: petstore',
      });

      const state = editorReducer(initialState, action);

      expect(state.currentFileId).toBe('file-123');
      expect(state.content).toBe('## Service\nname: petstore');
    });

    it('should clear parse errors when setting new file', () => {
      const stateWithErrors = {
        ...initialState,
        parseErrors: [
          {
            line: 1,
            column: 0,
            error_type: 'MISSING_HEADER',
            message: 'Missing header',
          },
        ],
      };

      const action = setCurrentFile({
        fileId: 'file-123',
        content: 'new content',
      });

      const state = editorReducer(stateWithErrors, action);

      expect(state.parseErrors).toEqual([]);
      expect(state.isParsingValid).toBe(true);
    });
  });

  describe('updateContent', () => {
    it('should update content', () => {
      const action = updateContent('new content here');
      const state = editorReducer(initialState, action);

      expect(state.content).toBe('new content here');
    });

    it('should not affect other fields', () => {
      const previousState = {
        ...initialState,
        currentFileId: 'file-123',
        isSaving: true,
      };

      const action = updateContent('updated content');
      const state = editorReducer(previousState, action);

      expect(state.currentFileId).toBe('file-123');
      expect(state.isSaving).toBe(true);
      expect(state.content).toBe('updated content');
    });
  });

  describe('setSaving', () => {
    it('should set isSaving to true', () => {
      const action = setSaving(true);
      const state = editorReducer(initialState, action);

      expect(state.isSaving).toBe(true);
    });

    it('should set isSaving to false', () => {
      const previousState = { ...initialState, isSaving: true };
      const action = setSaving(false);
      const state = editorReducer(previousState, action);

      expect(state.isSaving).toBe(false);
    });
  });

  describe('setParseErrors', () => {
    it('should set parse errors and mark as invalid', () => {
      const errors = [
        {
          line: 5,
          column: 1,
          error_type: 'MISSING_HEADER',
          message: 'Missing header',
        },
      ];

      const action = setParseErrors(errors);
      const state = editorReducer(initialState, action);

      expect(state.parseErrors).toEqual(errors);
      expect(state.isParsingValid).toBe(false);
    });

    it('should mark as valid when no errors', () => {
      const previousState = {
        ...initialState,
        parseErrors: [
          {
            line: 5,
            column: 1,
            error_type: 'MISSING_HEADER',
            message: 'Missing header',
          },
        ],
        isParsingValid: false,
      };

      const action = setParseErrors([]);
      const state = editorReducer(previousState, action);

      expect(state.parseErrors).toEqual([]);
      expect(state.isParsingValid).toBe(true);
    });
  });

  describe('setPreviewData', () => {
    it('should set preview data', () => {
      const previewData = {
        services: [{ id: 'svc-1', name: 'Service 1' }],
        models: [{ id: 'model-1', name: 'Model 1' }],
        operations: [{ id: 'op-1', method: 'GET', path: '/items' }],
        errors: [{ id: 'err-1', status_code: 404, name: 'NotFound' }],
      };

      const action = setPreviewData(previewData);
      const state = editorReducer(initialState, action);

      expect(state.previewData).toEqual(previewData);
    });
  });

  describe('clearEditor', () => {
    it('should reset all state to initial values', () => {
      const previousState = {
        currentFileId: 'file-123',
        content: 'content here',
        isSaving: true,
        lastSavedAt: '2025-12-12T10:00:00Z',
        parseErrors: [
          {
            line: 5,
            column: 1,
            error_type: 'ERROR',
            message: 'Error',
          },
        ],
        isParsingValid: false,
        previewData: {
          services: [{ id: 's1', name: 'Service' }],
          models: [],
          operations: [],
          errors: [],
        },
        lastParseTime: 100,
      };

      const action = clearEditor();
      const state = editorReducer(previousState as EditorState, action);

      expect(state).toEqual(initialState);
    });
  });
});
