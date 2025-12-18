/**
 * T054: DSL syntax highlighting theme and grammar for Monaco Editor.
 *
 * Defines the Requirements DSL language configuration including:
 * - Token rules for syntax highlighting
 * - Dark and light themes
 * - Keywords and types definitions
 */

import type * as Monaco from 'monaco-editor';

/**
 * Language ID for the Requirements DSL.
 */
export const DSL_LANGUAGE_ID = 'requirements-dsl';

/**
 * DSL keywords that control field behavior.
 */
export const DSL_KEYWORDS = [
  'required',
  'optional',
  'true',
  'false',
  'null',
  'default',
  'unique',
  'primary',
  'index',
];

/**
 * DSL type keywords for field definitions.
 */
export const DSL_TYPES = [
  // Primitive types
  'string',
  'integer',
  'number',
  'boolean',
  'float',
  'decimal',
  // Complex types
  'array',
  'object',
  'map',
  // Date/time types
  'date',
  'datetime',
  'timestamp',
  'time',
  // Special types
  'uuid',
  'email',
  'url',
  'binary',
  'enum',
];

/**
 * HTTP methods for operation definitions.
 */
export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

/**
 * Language configuration for bracket matching and auto-closing.
 */
export const dslLanguageConfig: Monaco.languages.LanguageConfiguration = {
  comments: {
    lineComment: '//',
    blockComment: ['<!--', '-->'],
  },
  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')'],
  ],
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
    { open: '`', close: '`' },
  ],
  surroundingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
    { open: '`', close: '`' },
  ],
  folding: {
    markers: {
      start: /^\s*#/,
      end: /^\s*$/,
    },
  },
};

/**
 * Monarch tokenizer definition for DSL syntax highlighting.
 */
export const dslTokensProvider: Monaco.languages.IMonarchLanguage = {
  // Set default tokenizer behavior
  defaultToken: '',
  tokenPostfix: '.dsl',

  // Keywords and types for pattern matching
  keywords: DSL_KEYWORDS,
  typeKeywords: DSL_TYPES,
  httpMethods: HTTP_METHODS,

  // Escape sequences
  escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

  tokenizer: {
    root: [
      // Service header (# Service: Name)
      [/^#\s+Service:.*$/, 'keyword.service'],

      // Model header (## Model: Name)
      [/^##\s+Model:.*$/, 'keyword.model'],

      // Operation header (## Operation: Name)
      [/^##\s+Operation:.*$/, 'keyword.operation'],

      // Error header (## Error: Name)
      [/^##\s+Error:.*$/, 'keyword.error'],

      // Endpoint header (### Endpoint:)
      [/^###\s+Endpoint:.*$/, 'keyword.endpoint'],

      // Generic headers
      [/^#+\s.*$/, 'keyword.header'],

      // HTTP methods (GET, POST, PUT, DELETE, etc.)
      [/\b(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\b/, 'http.method'],

      // HTTP status codes (2xx, 4xx, 5xx)
      [/\b[1-5][0-9]{2}\b/, 'number.status'],

      // YAML-like key: value pairs
      [/^[a-zA-Z_][a-zA-Z0-9_]*:/, 'type.identifier'],

      // Field references **FieldName** (bold markdown)
      [/\*\*[a-zA-Z_][a-zA-Z0-9_]*\*\*/, 'variable.reference'],

      // Model/Type references (PascalCase words)
      [/\b[A-Z][a-zA-Z0-9]*\b(?!\s*:)/, 'type.reference'],

      // Table syntax
      [/\|/, 'delimiter'],
      [/---+/, 'delimiter.table'],

      // Comments
      [/\/\/.*$/, 'comment'],
      [/<!--/, 'comment', '@comment'],

      // Strings
      [/"([^"\\]|\\.)*"/, 'string'],
      [/'([^'\\]|\\.)*'/, 'string'],
      [/`([^`\\]|\\.)*`/, 'string.template'],

      // Keywords
      [
        /\b(required|optional|true|false|null|default|unique|primary|index)\b/,
        'keyword',
      ],

      // Type keywords
      [
        /\b(string|integer|number|boolean|float|decimal|array|object|map|date|datetime|timestamp|time|uuid|email|url|binary|enum)\b/,
        'type',
      ],

      // Numbers
      [/\d+\.\d+/, 'number.float'],
      [/\d+/, 'number'],

      // Operators
      [/[=><!~?&|+\-*/^%]+/, 'operator'],

      // Brackets
      [/[{}()\[\]]/, 'delimiter.bracket'],

      // URLs/paths
      [/\/[a-zA-Z0-9_/{}\-\.]+/, 'string.path'],
    ],

    comment: [
      [/[^<-]+/, 'comment'],
      [/-->/, 'comment', '@pop'],
      [/[<-]/, 'comment'],
    ],
  },
};

/**
 * Dark theme definition for DSL.
 * Uses Dracula-inspired colors.
 */
export const dslDarkTheme: Monaco.editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    // Headers - bold and distinctive
    { token: 'keyword.service', foreground: 'FF79C6', fontStyle: 'bold' },
    { token: 'keyword.model', foreground: '8BE9FD', fontStyle: 'bold' },
    { token: 'keyword.operation', foreground: '50FA7B', fontStyle: 'bold' },
    { token: 'keyword.error', foreground: 'FF5555', fontStyle: 'bold' },
    { token: 'keyword.endpoint', foreground: 'FFB86C', fontStyle: 'bold' },
    { token: 'keyword.header', foreground: 'BD93F9', fontStyle: 'bold' },

    // HTTP methods
    { token: 'http.method', foreground: '50FA7B', fontStyle: 'bold' },

    // Keys and identifiers
    { token: 'type.identifier', foreground: 'FFB86C' },
    { token: 'type.reference', foreground: '8BE9FD' },
    { token: 'variable.reference', foreground: 'FF79C6' },

    // Delimiters
    { token: 'delimiter', foreground: '6272A4' },
    { token: 'delimiter.table', foreground: '6272A4' },
    { token: 'delimiter.bracket', foreground: 'F8F8F2' },

    // Comments
    { token: 'comment', foreground: '6272A4', fontStyle: 'italic' },

    // Strings
    { token: 'string', foreground: 'F1FA8C' },
    { token: 'string.template', foreground: 'F1FA8C' },
    { token: 'string.path', foreground: 'BD93F9' },

    // Keywords and types
    { token: 'keyword', foreground: 'FF79C6' },
    { token: 'type', foreground: '8BE9FD' },

    // Numbers
    { token: 'number', foreground: 'BD93F9' },
    { token: 'number.float', foreground: 'BD93F9' },
    { token: 'number.status', foreground: 'FFB86C' },

    // Operators
    { token: 'operator', foreground: 'FF79C6' },
  ],
  colors: {
    'editor.background': '#1E1E2E',
    'editor.foreground': '#F8F8F2',
    'editor.lineHighlightBackground': '#44475A',
    'editor.selectionBackground': '#44475A',
    'editorCursor.foreground': '#F8F8F2',
    'editorLineNumber.foreground': '#6272A4',
    'editorLineNumber.activeForeground': '#F8F8F2',
  },
};

/**
 * Light theme definition for DSL.
 * Uses readable colors for light backgrounds.
 */
export const dslLightTheme: Monaco.editor.IStandaloneThemeData = {
  base: 'vs',
  inherit: true,
  rules: [
    // Headers - bold and distinctive
    { token: 'keyword.service', foreground: 'D63384', fontStyle: 'bold' },
    { token: 'keyword.model', foreground: '0D6EFD', fontStyle: 'bold' },
    { token: 'keyword.operation', foreground: '198754', fontStyle: 'bold' },
    { token: 'keyword.error', foreground: 'DC3545', fontStyle: 'bold' },
    { token: 'keyword.endpoint', foreground: 'FD7E14', fontStyle: 'bold' },
    { token: 'keyword.header', foreground: '6F42C1', fontStyle: 'bold' },

    // HTTP methods
    { token: 'http.method', foreground: '198754', fontStyle: 'bold' },

    // Keys and identifiers
    { token: 'type.identifier', foreground: 'FD7E14' },
    { token: 'type.reference', foreground: '0D6EFD' },
    { token: 'variable.reference', foreground: 'D63384' },

    // Delimiters
    { token: 'delimiter', foreground: '6C757D' },
    { token: 'delimiter.table', foreground: '6C757D' },
    { token: 'delimiter.bracket', foreground: '212529' },

    // Comments
    { token: 'comment', foreground: '6C757D', fontStyle: 'italic' },

    // Strings
    { token: 'string', foreground: '20C997' },
    { token: 'string.template', foreground: '20C997' },
    { token: 'string.path', foreground: '6F42C1' },

    // Keywords and types
    { token: 'keyword', foreground: 'D63384' },
    { token: 'type', foreground: '0D6EFD' },

    // Numbers
    { token: 'number', foreground: '6F42C1' },
    { token: 'number.float', foreground: '6F42C1' },
    { token: 'number.status', foreground: 'FD7E14' },

    // Operators
    { token: 'operator', foreground: 'D63384' },
  ],
  colors: {
    'editor.background': '#FFFFFF',
    'editor.foreground': '#212529',
    'editor.lineHighlightBackground': '#F8F9FA',
    'editor.selectionBackground': '#E9ECEF',
    'editorCursor.foreground': '#212529',
    'editorLineNumber.foreground': '#ADB5BD',
    'editorLineNumber.activeForeground': '#212529',
  },
};

/**
 * Register the DSL language with Monaco Editor.
 *
 * @param monaco - Monaco editor instance
 */
export function registerDSLLanguage(monaco: typeof Monaco): void {
  // Register the language
  monaco.languages.register({ id: DSL_LANGUAGE_ID });

  // Set language configuration
  monaco.languages.setLanguageConfiguration(DSL_LANGUAGE_ID, dslLanguageConfig);

  // Set tokenizer
  monaco.languages.setMonarchTokensProvider(DSL_LANGUAGE_ID, dslTokensProvider);

  // Define themes
  monaco.editor.defineTheme('dsl-dark', dslDarkTheme);
  monaco.editor.defineTheme('dsl-light', dslLightTheme);
}

/**
 * Get the theme name based on theme preference.
 *
 * @param theme - Theme preference ('vs-dark' or 'light')
 * @returns Monaco theme name
 */
export function getDSLThemeName(theme: 'vs-dark' | 'light'): string {
  return theme === 'vs-dark' ? 'dsl-dark' : 'dsl-light';
}

export default {
  DSL_LANGUAGE_ID,
  DSL_KEYWORDS,
  DSL_TYPES,
  HTTP_METHODS,
  dslLanguageConfig,
  dslTokensProvider,
  dslDarkTheme,
  dslLightTheme,
  registerDSLLanguage,
  getDSLThemeName,
};
