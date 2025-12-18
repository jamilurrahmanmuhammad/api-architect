/**
 * T036/T055: EditorPane component with Monaco Editor integration.
 *
 * Provides:
 * - DSL syntax highlighting (using dslTheme module)
 * - Line numbers
 * - Dark/light theme support
 * - Change event handling
 * - Save keyboard shortcut (Ctrl+S)
 */

import { useRef, useCallback } from 'react';
import Editor, { type OnMount, type OnChange } from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';
import { registerDSLLanguage, getDSLThemeName, DSL_LANGUAGE_ID } from '@/utils/dslTheme';

export interface EditorPaneProps {
  value: string;
  onChange?: (value: string) => void;
  onSave?: (value: string) => void;
  readOnly?: boolean;
  height?: string | number;
  theme?: 'vs-dark' | 'light';
  className?: string;
}

export function EditorPane({
  value,
  onChange,
  onSave,
  readOnly = false,
  height = '100%',
  theme = 'vs-dark',
  className,
}: EditorPaneProps) {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);

  const handleEditorDidMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;
      monacoRef.current = monaco;

      // Register DSL language and themes from centralized module
      registerDSLLanguage(monaco);

      // Set the theme based on prop
      monaco.editor.setTheme(getDSLThemeName(theme));

      // Add Ctrl+S keyboard shortcut for save
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        if (onSave) {
          const currentValue = editor.getValue();
          onSave(currentValue);
        }
      });

      // Focus the editor
      editor.focus();
    },
    [theme, onSave]
  );

  const handleEditorChange: OnChange = useCallback(
    (newValue) => {
      if (onChange && newValue !== undefined) {
        onChange(newValue);
      }
    },
    [onChange]
  );

  return (
    <div className={className} style={{ height, width: '100%' }}>
      <Editor
        height="100%"
        defaultLanguage={DSL_LANGUAGE_ID}
        value={value}
        theme={getDSLThemeName(theme)}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        loading={<EditorLoading />}
        options={{
          readOnly,
          minimap: { enabled: true },
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
          tabSize: 2,
          wordWrap: 'on',
          renderLineHighlight: 'line',
          cursorBlinking: 'smooth',
          bracketPairColorization: { enabled: true },
          padding: { top: 16, bottom: 16 },
        }}
      />
    </div>
  );
}

function EditorLoading() {
  return (
    <div className="flex items-center justify-center h-full bg-gray-900 text-gray-400">
      <div className="flex flex-col items-center gap-2">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span>Loading editor...</span>
      </div>
    </div>
  );
}

export default EditorPane;
