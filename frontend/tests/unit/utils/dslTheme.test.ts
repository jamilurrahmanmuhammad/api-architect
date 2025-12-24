/**
 * T054: Unit tests for DSL syntax highlighting theme/grammar.
 *
 * Tests the Monaco Editor language definition for the Requirements DSL.
 */

import { describe, it, expect } from 'vitest';
import {
  DSL_LANGUAGE_ID,
  dslLanguageConfig,
  dslTokensProvider,
  dslDarkTheme,
  dslLightTheme,
  DSL_KEYWORDS,
  DSL_TYPES,
} from '@/utils/dslTheme';

describe('DSL Language Definition', () => {
  describe('Language Configuration', () => {
    it('should export the correct language ID', () => {
      expect(DSL_LANGUAGE_ID).toBe('requirements-dsl');
    });

    it('should export language configuration', () => {
      expect(dslLanguageConfig).toBeDefined();
    });

    it('should export tokens provider', () => {
      expect(dslTokensProvider).toBeDefined();
      expect(dslTokensProvider.tokenizer).toBeDefined();
      expect(dslTokensProvider.tokenizer.root).toBeDefined();
    });
  });

  describe('Token Rules', () => {
    it('should have rules for service headers', () => {
      const rules = dslTokensProvider.tokenizer.root;
      const hasServiceRule = rules.some(
        (rule) => Array.isArray(rule) && rule[1] === 'keyword.service'
      );
      expect(hasServiceRule).toBe(true);
    });

    it('should have rules for model headers', () => {
      const rules = dslTokensProvider.tokenizer.root;
      const hasModelRule = rules.some(
        (rule) => Array.isArray(rule) && rule[1] === 'keyword.model'
      );
      expect(hasModelRule).toBe(true);
    });

    it('should have rules for operation headers', () => {
      const rules = dslTokensProvider.tokenizer.root;
      const hasOperationRule = rules.some(
        (rule) => Array.isArray(rule) && rule[1] === 'keyword.operation'
      );
      expect(hasOperationRule).toBe(true);
    });

    it('should have rules for error headers', () => {
      const rules = dslTokensProvider.tokenizer.root;
      const hasErrorRule = rules.some(
        (rule) => Array.isArray(rule) && rule[1] === 'keyword.error'
      );
      expect(hasErrorRule).toBe(true);
    });

    it('should have rules for comments', () => {
      const rules = dslTokensProvider.tokenizer.root;
      const hasCommentRule = rules.some(
        (rule) => Array.isArray(rule) && rule[1] === 'comment'
      );
      expect(hasCommentRule).toBe(true);
    });

    it('should have rules for strings', () => {
      const rules = dslTokensProvider.tokenizer.root;
      const hasStringRule = rules.some(
        (rule) => Array.isArray(rule) && rule[1] === 'string'
      );
      expect(hasStringRule).toBe(true);
    });

    it('should have rules for numbers', () => {
      const rules = dslTokensProvider.tokenizer.root;
      const hasNumberRule = rules.some(
        (rule) => Array.isArray(rule) && rule[1] === 'number'
      );
      expect(hasNumberRule).toBe(true);
    });

    it('should have rules for type keywords', () => {
      const rules = dslTokensProvider.tokenizer.root;
      const hasTypeRule = rules.some(
        (rule) => Array.isArray(rule) && rule[1] === 'type'
      );
      expect(hasTypeRule).toBe(true);
    });

    it('should have rules for table delimiters', () => {
      const rules = dslTokensProvider.tokenizer.root;
      const hasDelimiterRule = rules.some(
        (rule) => Array.isArray(rule) && rule[1] === 'delimiter'
      );
      expect(hasDelimiterRule).toBe(true);
    });

    it('should have rules for field references', () => {
      const rules = dslTokensProvider.tokenizer.root;
      const hasFieldRefRule = rules.some(
        (rule) => Array.isArray(rule) && rule[1] === 'variable.reference'
      );
      expect(hasFieldRefRule).toBe(true);
    });
  });

  describe('DSL Keywords', () => {
    it('should include common DSL keywords', () => {
      expect(DSL_KEYWORDS).toContain('required');
      expect(DSL_KEYWORDS).toContain('optional');
      expect(DSL_KEYWORDS).toContain('true');
      expect(DSL_KEYWORDS).toContain('false');
      expect(DSL_KEYWORDS).toContain('null');
    });
  });

  describe('DSL Types', () => {
    it('should include primitive types', () => {
      expect(DSL_TYPES).toContain('string');
      expect(DSL_TYPES).toContain('integer');
      expect(DSL_TYPES).toContain('number');
      expect(DSL_TYPES).toContain('boolean');
    });

    it('should include complex types', () => {
      expect(DSL_TYPES).toContain('array');
      expect(DSL_TYPES).toContain('object');
    });

    it('should include date/time types', () => {
      expect(DSL_TYPES).toContain('date');
      expect(DSL_TYPES).toContain('datetime');
      expect(DSL_TYPES).toContain('timestamp');
    });

    it('should include uuid type', () => {
      expect(DSL_TYPES).toContain('uuid');
    });
  });

  describe('Dark Theme', () => {
    it('should be based on vs-dark', () => {
      expect(dslDarkTheme.base).toBe('vs-dark');
    });

    it('should inherit base theme rules', () => {
      expect(dslDarkTheme.inherit).toBe(true);
    });

    it('should define service keyword colors', () => {
      const serviceRule = dslDarkTheme.rules.find((r) => r.token === 'keyword.service');
      expect(serviceRule).toBeDefined();
      expect(serviceRule?.foreground).toBeDefined();
      expect(serviceRule?.fontStyle).toBe('bold');
    });

    it('should define model keyword colors', () => {
      const modelRule = dslDarkTheme.rules.find((r) => r.token === 'keyword.model');
      expect(modelRule).toBeDefined();
      expect(modelRule?.foreground).toBeDefined();
      expect(modelRule?.fontStyle).toBe('bold');
    });

    it('should define operation keyword colors', () => {
      const operationRule = dslDarkTheme.rules.find((r) => r.token === 'keyword.operation');
      expect(operationRule).toBeDefined();
      expect(operationRule?.foreground).toBeDefined();
      expect(operationRule?.fontStyle).toBe('bold');
    });

    it('should define error keyword colors', () => {
      const errorRule = dslDarkTheme.rules.find((r) => r.token === 'keyword.error');
      expect(errorRule).toBeDefined();
      expect(errorRule?.foreground).toBeDefined();
      expect(errorRule?.fontStyle).toBe('bold');
    });

    it('should define custom background color', () => {
      expect(dslDarkTheme.colors['editor.background']).toBeDefined();
    });

    it('should define comment colors', () => {
      const commentRule = dslDarkTheme.rules.find((r) => r.token === 'comment');
      expect(commentRule).toBeDefined();
      expect(commentRule?.foreground).toBeDefined();
      expect(commentRule?.fontStyle).toBe('italic');
    });
  });

  describe('Light Theme', () => {
    it('should be based on vs', () => {
      expect(dslLightTheme.base).toBe('vs');
    });

    it('should inherit base theme rules', () => {
      expect(dslLightTheme.inherit).toBe(true);
    });

    it('should define service keyword colors', () => {
      const serviceRule = dslLightTheme.rules.find((r) => r.token === 'keyword.service');
      expect(serviceRule).toBeDefined();
      expect(serviceRule?.foreground).toBeDefined();
    });

    it('should define model keyword colors', () => {
      const modelRule = dslLightTheme.rules.find((r) => r.token === 'keyword.model');
      expect(modelRule).toBeDefined();
      expect(modelRule?.foreground).toBeDefined();
    });

    it('should have different colors from dark theme', () => {
      const darkServiceRule = dslDarkTheme.rules.find((r) => r.token === 'keyword.service');
      const lightServiceRule = dslLightTheme.rules.find((r) => r.token === 'keyword.service');
      expect(darkServiceRule?.foreground).not.toBe(lightServiceRule?.foreground);
    });
  });

  describe('HTTP Method Highlighting', () => {
    it('should have rules for GET method', () => {
      const rules = dslTokensProvider.tokenizer.root;
      const hasGetRule = rules.some(
        (rule) =>
          Array.isArray(rule) &&
          rule[0] instanceof RegExp &&
          rule[0].toString().includes('GET')
      );
      expect(hasGetRule).toBe(true);
    });

    it('should have rules for POST method', () => {
      const rules = dslTokensProvider.tokenizer.root;
      const hasPostRule = rules.some(
        (rule) =>
          Array.isArray(rule) &&
          rule[0] instanceof RegExp &&
          rule[0].toString().includes('POST')
      );
      expect(hasPostRule).toBe(true);
    });

    it('should have rules for PUT method', () => {
      const rules = dslTokensProvider.tokenizer.root;
      const hasPutRule = rules.some(
        (rule) =>
          Array.isArray(rule) &&
          rule[0] instanceof RegExp &&
          rule[0].toString().includes('PUT')
      );
      expect(hasPutRule).toBe(true);
    });

    it('should have rules for DELETE method', () => {
      const rules = dslTokensProvider.tokenizer.root;
      const hasDeleteRule = rules.some(
        (rule) =>
          Array.isArray(rule) &&
          rule[0] instanceof RegExp &&
          rule[0].toString().includes('DELETE')
      );
      expect(hasDeleteRule).toBe(true);
    });
  });
});
