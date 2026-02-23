import React, { useEffect, useState } from 'react';
import ControlBar from '../components/ControlBar';
import Editor from '../components/Editor';
import FlowChart from '../components/FlowChart';
import ExecutionTrace from '../components/ExecutionTrace';
import ConsoleOutput from '../components/ConsoleOutput';
import CodeExplainer from '../components/CodeExplainer';
import MemoryPanel from '../components/MemoryPanel';
import StackViewer from '../components/StackViewer';
import TimelineScrubber from '../components/TimelineScrubber';
import useExecutionStore from '../store/executionStore';
import { connectWS } from '../services/websocket';

export default function Playground() {
    const store = useExecutionStore();
    // Tab for left panel: 'editor' | 'explain'
    const [leftTab, setLeftTab] = useState('editor');

    useEffect(() => {
        connectWS();
        const handleKey = (e) => { if (e.key === 'Escape') store.reset(); };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, []);

    // Auto-switch to explain tab when code is pasted (has content) and not running
    const { code, isRunning } = useExecutionStore();
    useEffect(() => {
        if (code.trim().length > 10 && !isRunning) {
            // Only auto-switch once (when user first pastes code)
            // Don't keep overriding manual tab selection
        }
    }, [code]);

    return (
        <div style={{
            height: '100vh', display: 'flex', flexDirection: 'column',
            background: 'var(--bg-void)', overflow: 'hidden'
        }}>
            <ControlBar />

            {/* Layout: | Editor+Explainer (Left) | FlowChart (Center) | Trace+Console (Right) | */}
            <div className="main-container">

                {/* ── Column 1: Editor + Explainer tabs ─────────────────────── */}
                <div className="area-left glass" style={{ borderRadius: 12, overflow: 'hidden' }}>
                    {/* Tab strip */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0,
                        borderBottom: '1px solid rgba(99,102,241,0.18)',
                        background: 'rgba(6,6,16,0.95)',
                    }}>
                        <button
                            onClick={() => setLeftTab('editor')}
                            style={{
                                padding: '7px 18px', fontSize: 12, fontWeight: 700,
                                border: 'none', cursor: 'pointer',
                                background: leftTab === 'editor' ? 'rgba(99,102,241,0.15)' : 'transparent',
                                color: leftTab === 'editor' ? '#a78bfa' : '#475569',
                                borderBottom: leftTab === 'editor' ? '2px solid #6366f1' : '2px solid transparent',
                                letterSpacing: '0.04em', transition: 'all 0.2s',
                                display: 'flex', alignItems: 'center', gap: 6,
                            }}>
                            <span>⌨️</span> Editor
                        </button>
                        <button
                            onClick={() => setLeftTab('explain')}
                            style={{
                                padding: '7px 18px', fontSize: 12, fontWeight: 700,
                                border: 'none', cursor: 'pointer',
                                background: leftTab === 'explain' ? 'rgba(99,102,241,0.15)' : 'transparent',
                                color: leftTab === 'explain' ? '#a78bfa' : '#475569',
                                borderBottom: leftTab === 'explain' ? '2px solid #6366f1' : '2px solid transparent',
                                letterSpacing: '0.04em', transition: 'all 0.2s',
                                display: 'flex', alignItems: 'center', gap: 6,
                                position: 'relative',
                            }}>
                            <span>📖</span> Explain
                            {/* Badge: shows line count when code exists */}
                            {code.trim() && (
                                <span style={{
                                    fontSize: 9, fontWeight: 800,
                                    background: '#6366f1', color: '#fff',
                                    borderRadius: 20, padding: '1px 6px',
                                    marginLeft: 2,
                                }}>
                                    {code.split('\n').filter(l => l.trim()).length}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Tab content */}
                    <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                        <div style={{ height: '100%', display: leftTab === 'editor' ? 'block' : 'none' }}>
                            <Editor />
                        </div>
                        <div style={{ height: '100%', display: leftTab === 'explain' ? 'block' : 'none', overflow: 'hidden' }}>
                            <CodeExplainer />
                        </div>
                    </div>
                </div>

                {/* ── Column 2: FlowChart ─────────────────────────────────────── */}
                <div className="area-center glass" style={{ borderRadius: 12, overflow: 'hidden' }}>
                    <FlowChart />
                </div>

                {/* ── Column 3: State & History (Right) ────────────────────── */}
                <div className="area-right" style={{ gap: 12 }}>
                    {/* Variables Panel */}
                    <div className="glass" style={{ flex: '0 0 35%', borderRadius: 12, overflow: 'hidden' }}>
                        <MemoryPanel />
                    </div>

                    {/* Stack & Loops Panel */}
                    <div className="glass" style={{ flex: '0 0 30%', borderRadius: 12, overflow: 'hidden' }}>
                        <StackViewer />
                    </div>

                    {/* Console & Trace (Tabbed) */}
                    <div className="glass" style={{ flex: 1, borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ flex: 1, minHeight: 0 }}>
                            <ConsoleOutput />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Bottom: Timeline Seek Bar ──────────────────────────── */}
            <TimelineScrubber />
        </div>
    );
}
