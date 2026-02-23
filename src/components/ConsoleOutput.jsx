import React, { useRef, useEffect, useState } from 'react';
import useExecutionStore from '../store/executionStore';

// ── Terminal line styles ────────────────────────────────────────────────────
const LINE_STYLE = {
    prompt: { color: '#22d3ee', fontWeight: 600 },   // cyan prompt text
    input: { color: '#f1f5f9', fontWeight: 500 },   // white user text
    out: { color: '#a3e635', fontWeight: 400 },   // green output
    err: { color: '#f87171', fontWeight: 400 },   // red errors
};

export default function ConsoleOutput() {
    const {
        output, error, activeConsoleTab, setActiveConsoleTab,
        terminalMode, terminalLines, submitTerminalInput, clearTerminal,
        flowNodeActive, isRunning,
    } = useExecutionStore();

    const [inputValue, setInputValue] = useState('');
    const inputRef = useRef(null);
    const bottomRef = useRef(null);

    // Auto-scroll to bottom whenever terminal changes
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [terminalLines, output]);

    // Auto-focus the input when terminal is waiting
    useEffect(() => {
        if (terminalMode && inputRef.current) {
            inputRef.current.focus();
        }
    }, [terminalMode, terminalLines.length]);

    const handleInputSubmit = (e) => {
        e.preventDefault();
        const val = inputValue.trim();
        setInputValue('');
        submitTerminalInput(val);
    };

    const handleInputKeyDown = (e) => {
        if (e.key === 'Enter') handleInputSubmit(e);
    };

    // ── Current program output (from normal execution) ────────────────────────
    const normalOutput = Array.isArray(output)
        ? output
        : output ? String(output).split('\n').filter(Boolean) : [];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', fontFamily: "'JetBrains Mono', monospace" }}>

            {/* Tab header */}
            <div style={{
                display: 'flex', alignItems: 'center',
                borderBottom: '1px solid rgba(99,102,241,0.15)',
                background: 'rgba(6,6,16,0.9)', flexShrink: 0,
            }}>
                <button onClick={() => setActiveConsoleTab('output')} style={{
                    padding: '6px 14px', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer',
                    background: activeConsoleTab === 'output' ? 'rgba(99,102,241,0.12)' : 'transparent',
                    color: activeConsoleTab === 'output' ? '#a78bfa' : 'var(--text-muted)',
                    borderBottom: activeConsoleTab === 'output' ? '2px solid #6366f1' : '2px solid transparent',
                    letterSpacing: '0.05em', textTransform: 'uppercase',
                }}>
                    🖥 Terminal
                    {terminalMode && <span style={{ marginLeft: 6, color: '#22d3ee', animation: 'pulse 1s infinite' }}>⬤</span>}
                </button>
                <button onClick={() => setActiveConsoleTab('errors')} style={{
                    padding: '6px 14px', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer',
                    background: activeConsoleTab === 'errors' ? 'rgba(239,68,68,0.08)' : 'transparent',
                    color: activeConsoleTab === 'errors' ? (error ? '#f87171' : 'var(--text-muted)') : 'var(--text-muted)',
                    borderBottom: activeConsoleTab === 'errors' ? '2px solid #ef4444' : '2px solid transparent',
                    letterSpacing: '0.05em', textTransform: 'uppercase',
                }}>
                    ❌ Errors {error ? '(1)' : ''}
                </button>

                {/* Clear terminal button */}
                {terminalLines.length > 0 && (
                    <button onClick={clearTerminal} style={{
                        marginLeft: 'auto', marginRight: 8, fontSize: 10, color: 'var(--text-muted)',
                        background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px',
                    }}>
                        clear ✕
                    </button>
                )}
            </div>

            {/* Content area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>

                {activeConsoleTab === 'output' ? (
                    <div style={{
                        flex: 1, overflowY: 'auto', padding: '10px 14px',
                        background: '#030308',
                        display: 'flex', flexDirection: 'column', gap: 2,
                    }}>
                        {/* ── Terminal session (interactive input mode) ─────────────── */}
                        {terminalLines.length > 0 && (
                            <div>
                                {terminalLines.map((line, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'baseline', marginBottom: 3 }}>
                                        {line.type === 'input' ? (
                                            <>
                                                <span style={{ color: '#6366f1', marginRight: 6, fontSize: 13, userSelect: 'none' }}>❯</span>
                                                <span style={LINE_STYLE.input}>{line.text}</span>
                                            </>
                                        ) : line.type === 'prompt' && i === terminalLines.length - 1 ? null : (
                                            <span style={LINE_STYLE[line.type] || LINE_STYLE.out}>{line.text}</span>
                                        )}
                                    </div>
                                ))}

                                {/* Active input line */}
                                {terminalMode && terminalLines.length > 0 && (
                                    <div style={{ display: 'flex', alignItems: 'center', marginTop: 2 }}>
                                        <span style={{ ...LINE_STYLE.prompt, marginRight: 6, flexShrink: 0 }}>
                                            {terminalLines[terminalLines.length - 1]?.text || ''}
                                        </span>
                                        <span style={{ color: '#6366f1', marginRight: 6, fontSize: 13, userSelect: 'none' }}>❯</span>
                                        <input
                                            ref={inputRef}
                                            value={inputValue}
                                            onChange={e => setInputValue(e.target.value)}
                                            onKeyDown={handleInputKeyDown}
                                            placeholder="type here and press Enter…"
                                            autoComplete="off"
                                            spellCheck={false}
                                            style={{
                                                background: 'transparent', border: 'none', outline: 'none',
                                                color: '#f1f5f9', fontFamily: "'JetBrains Mono', monospace",
                                                fontSize: 13, flex: 1, caretColor: '#6366f1',
                                            }}
                                        />
                                        <span style={{
                                            width: 8, height: 16, background: '#6366f1',
                                            animation: 'blink 1s step-end infinite', borderRadius: 1,
                                        }} />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Normal program output (after execution completes) ─────── */}
                        {!terminalMode && normalOutput.length > 0 && (
                            <div style={{ marginTop: terminalLines.length > 0 ? 8 : 0 }}>
                                {terminalLines.length > 0 && (
                                    <div style={{ borderTop: '1px solid rgba(99,102,241,0.12)', marginBottom: 8, paddingTop: 8 }} />
                                )}
                                {normalOutput.map((line, i) => (
                                    <div key={i} style={{
                                        display: 'flex', alignItems: 'baseline', marginBottom: 3,
                                    }}>
                                        <span style={{ color: '#334155', marginRight: 8, fontSize: 10, userSelect: 'none', minWidth: 20, textAlign: 'right' }}>
                                            {i + 1}
                                        </span>
                                        <span style={{ color: '#a3e635', fontSize: 13 }}>{line}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Empty state */}
                        {terminalLines.length === 0 && normalOutput.length === 0 && (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 30 }}>
                                <span style={{ fontSize: 32, opacity: 0.4 }}>🖥</span>
                                <span style={{ fontSize: 13, color: '#334155', textAlign: 'center', lineHeight: 1.7 }}>
                                    Terminal output appears here<br />
                                    <span style={{ fontSize: 11, color: '#1e293b' }}>
                                        Input prompts will be shown inline ↓
                                    </span>
                                </span>
                            </div>
                        )}

                        {/* Running indicator */}
                        {isRunning && !terminalMode && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6366f1', fontSize: 11, marginTop: 4 }}>
                                <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span>
                                Executing…
                            </div>
                        )}

                        <div ref={bottomRef} />
                    </div>
                ) : (
                    /* Errors tab */
                    <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px', background: '#030308' }}>
                        {error ? (
                            <div style={{
                                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                                borderRadius: 8, padding: '12px 16px', marginTop: 4,
                            }}>
                                <div style={{ fontWeight: 700, color: '#f87171', marginBottom: 8, fontSize: 13 }}>❌ Error</div>
                                <pre style={{ color: '#fca5a5', fontSize: 12, whiteSpace: 'pre-wrap', margin: 0, lineHeight: 1.6 }}>
                                    {error}
                                </pre>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8 }}>
                                <span style={{ fontSize: 28, opacity: 0.4 }}>✅</span>
                                <span style={{ fontSize: 12, color: '#1e293b' }}>No errors</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Submit button when in terminal mode */}
            {terminalMode && activeConsoleTab === 'output' && (
                <div style={{
                    padding: '8px 14px', background: 'rgba(6,6,16,0.95)',
                    borderTop: '1px solid rgba(99,102,241,0.15)', flexShrink: 0,
                    display: 'flex', alignItems: 'center', gap: 8,
                }}>
                    <span style={{ fontSize: 11, color: '#6366f1', flexShrink: 0 }}>
                        Waiting for input ↵
                    </span>
                    <button
                        onClick={handleInputSubmit}
                        style={{
                            marginLeft: 'auto', padding: '4px 14px', background: '#4f46e5',
                            border: 'none', borderRadius: 6, color: '#fff', fontSize: 12,
                            fontWeight: 700, cursor: 'pointer',
                        }}>
                        Enter ↵
                    </button>
                </div>
            )}

            <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>
        </div>
    );
}
