import React, { useEffect, useRef, useState } from 'react';
import MonacoEditor from '@monaco-editor/react';
import useExecutionStore, { detectLanguage } from '../store/executionStore';

export default function Editor() {
    const { code, setCode, setLanguage, currentLine, breakpoints, toggleBreakpoint, isRunning, language } = useExecutionStore();
    const editorRef = useRef(null);
    const decorationsRef = useRef([]);
    const monacoRef = useRef(null);

    const handleCodeChange = (newCode) => {
        setCode(newCode);
        const detected = detectLanguage(newCode);
        if (detected && detected !== language) {
            setLanguage(detected);
        }
    };

    function handleEditorMount(editor, monaco) {
        editorRef.current = editor;
        monacoRef.current = monaco;

        // Click on gutter to set breakpoint
        editor.onMouseDown((e) => {
            if (e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN ||
                e.target.type === monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS) {
                const line = e.target.position?.lineNumber;
                if (line) toggleBreakpoint(line);
            }
        });

        // Keyboard shortcuts
        editor.addCommand(monaco.KeyCode.F5, () => { });
        editor.addCommand(monaco.KeyCode.F10, () => { });
    }

    // Update decorations when currentLine or breakpoints change
    useEffect(() => {
        const editor = editorRef.current;
        const monaco = monacoRef.current;
        if (!editor || !monaco) return;

        const newDecorations = [];

        // Active line highlight
        if (currentLine > 0) {
            newDecorations.push({
                range: new monaco.Range(currentLine, 1, currentLine, 1),
                options: {
                    isWholeLine: true,
                    className: 'active-line-highlight',
                    glyphMarginClassName: 'active-glyph',
                    overviewRulerColor: '#6366f1',
                    overviewRulerLane: monaco.editor.OverviewRulerLane.Left,
                    linesDecorationsClassName: 'active-line-deco',
                },
            });
        }

        // Breakpoints
        breakpoints.forEach(line => {
            newDecorations.push({
                range: new monaco.Range(line, 1, line, 1),
                options: {
                    isWholeLine: true,
                    glyphMarginClassName: 'breakpoint-glyph',
                    className: 'breakpoint-line',
                    linesDecorationsClassName: 'breakpoint-deco',
                },
            });
        });

        decorationsRef.current = editor.deltaDecorations(
            decorationsRef.current,
            newDecorations
        );

        // Scroll to active line
        if (currentLine > 0) {
            editor.revealLineInCenter(currentLine);
        }
    }, [currentLine, breakpoints]);

    return (
        <div className="flex flex-col h-full overflow-hidden" style={{ background: '#0d0d18' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-1.5"
                style={{ borderBottom: '1px solid rgba(99,102,241,0.12)', background: 'rgba(10,10,20,0.8)' }}>
                <div className="flex items-center gap-2">
                    <span className="panel-label">Editor</span>
                </div>
                <div className="flex items-center gap-2">
                    {breakpoints.size > 0 && (
                        <span style={{ fontSize: 11, color: '#ef4444' }}>
                            🔴 {breakpoints.size} breakpoint{breakpoints.size > 1 ? 's' : ''}
                        </span>
                    )}
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        Click gutter to set breakpoints
                    </span>
                </div>
            </div>

            <MonacoEditor
                height="100%"
                defaultLanguage={language === 'cpp' ? 'cpp' : language === 'typescript' ? 'typescript' : language === 'c' ? 'c' : language === 'sql' ? 'sql' : language}
                language={language === 'cpp' ? 'cpp' : language === 'sql' ? 'sql' : language}
                value={code}
                onChange={(val) => !isRunning && handleCodeChange(val || '')}
                onMount={handleEditorMount}
                theme="vs-dark"
                options={{
                    fontSize: 14,
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    fontLigatures: true,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    lineNumbers: 'on',
                    glyphMargin: true,
                    folding: true,
                    lineDecorationsWidth: 6,
                    renderLineHighlight: 'gutter',
                    padding: { top: 12 },
                    smoothScrolling: true,
                    cursorSmoothCaretAnimation: 'on',
                    automaticLayout: true,
                    readOnly: isRunning,
                    wordWrap: 'on',
                    tabSize: 2,
                    suggestOnTriggerCharacters: true,
                    quickSuggestions: true,
                }}
            />

            {/* Inject breakpoint glyph styles */}
            <style>{`
        .active-line-highlight { background: rgba(99,102,241,0.12) !important; }
        .active-line-deco { border-left: 3px solid #6366f1 !important; }
        .breakpoint-glyph {
          background: #ef4444;
          border-radius: 50%;
          width: 10px !important;
          height: 10px !important;
          margin-top: 4px;
          margin-left: 4px;
          box-shadow: 0 0 6px rgba(239,68,68,0.7);
        }
        .breakpoint-line { background: rgba(239,68,68,0.06) !important; }
      `}</style>
        </div>
    );
}
