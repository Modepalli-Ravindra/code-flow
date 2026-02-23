import React, { useEffect } from 'react';
import useExecutionStore from '../store/executionStore';
import {
    runCode,
    pauseExecution,
    resumeExecution,
    resetExecution,
    stepForward,
    stepBack
} from '../services/websocket';

const LANGUAGES = [
    { value: 'javascript', label: '🟨 JavaScript', icon: '🟨' },
    { value: 'python', label: '🐍 Python', icon: '🐍' },
    { value: 'java', label: '☕ Java', icon: '☕' },
    { value: 'cpp', label: '⚙️ C++', icon: '⚙️' },
    { value: 'c', label: '🔧 C', icon: '🔧' },
    { value: 'go', label: '🐹 Go', icon: '🐹' },
    { value: 'typescript', label: '🔷 TypeScript', icon: '🔷' },
    { value: 'rust', label: '🦀 Rust', icon: '🦀' },
    { value: 'sql', label: '🗄️ SQL', icon: '🗄️' },
];

export default function ControlBar() {
    const {
        language, setLanguage, isRunning, isPaused, currentLine, steps,
        playbackSpeed, setPlaybackSpeed, wsStatus, inputs, setInputs,
        clearTerminal, startTerminalInput, currentStepIndex
    } = useExecutionStore();

    // Key handlers
    useEffect(() => {
        const handleKeys = (e) => {
            if (e.key === 'F5') { e.preventDefault(); handleRun(); }
            if (e.key === 'F8') { e.preventDefault(); stepForward(); }
            if (e.key === 'Escape') { e.preventDefault(); resetExecution(); }
        };
        window.addEventListener('keydown', handleKeys);
        return () => window.removeEventListener('keydown', handleKeys);
    }, [isRunning, language]);

    const codeNeedsInput = () => {
        const code = useExecutionStore.getState().code;
        if (language === 'javascript') return code.includes('input()');
        if (language === 'python') return /\binput\s*\(/.test(code);
        if (language === 'java') return /Scanner|nextInt\(\)|nextLine\(\)|nextDouble\(\)|next\(\)/.test(code);
        if (language === 'c') return /scanf\s*\(|gets\s*\(|fgets\s*\(/.test(code);
        if (language === 'cpp') return /scanf\s*\(|cin\s*>>|gets\s*\(|getline\s*\(/.test(code);
        return false;
    };

    const extractPrompts = () => {
        const code = useExecutionStore.getState().code;
        if (language === 'java') {
            return [...(code.matchAll(/System\.out\.print[ln]*\(\s*\"([^\"]+)\"\s*\)/g))].map(m => m[1]);
        }
        if (language === 'cpp') {
            return [...(code.matchAll(/cout\s*<<\s*\"([^\"]+)\"/g))].map(m => m[1]);
        }
        if (language === 'c') {
            return [...(code.matchAll(/printf\s*\(\s*\"([^\"]+)\"/g))].map(m => m[1].replace(/\\n/g, '').trim()).filter(Boolean);
        }
        if (language === 'python') {
            return [...(code.matchAll(/input\s*\(\s*(?:\"([^\"]+)\"|\'([^\']+)\')\s*\)/g))].map(m => m[1] || m[2]);
        }
        return [];
    };

    const handleRun = () => {
        if (isRunning) return;
        const currentCode = useExecutionStore.getState().code;
        if (codeNeedsInput()) {
            const prompts = extractPrompts();
            clearTerminal();
            startTerminalInput(
                prompts.length > 0 ? prompts : ['Enter input: '],
                (collected) => {
                    useExecutionStore.getState().setInputs(collected);
                    runCode(currentCode, collected, playbackSpeed * 1000, language);
                }
            );
            return;
        }
        runCode(currentCode, inputs, playbackSpeed * 1000, language);
    };

    const isConnected = wsStatus === 'connected';

    return (
        <div className="glass" style={{
            height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 12, padding: '0 16px', zIndex: 100, borderBottom: '1px solid rgba(99,102,241,0.25)',
            flexShrink: 0, width: '100%', borderRadius: 0, borderLeft: 'none', borderRight: 'none', borderTop: 'none'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, overflow: 'hidden' }}>
                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <div className="glow-blue" style={{
                        width: 28, height: 28, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16
                    }}>⚡</div>
                    <span className="font-bold text-sm hide-sm" style={{ color: '#a78bfa', letterSpacing: '0.05em' }}>
                        CodeFlow
                    </span>
                </div>

                <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} className="hide-sm" />

                {/* Detected Language Badge */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold"
                    style={{
                        background: 'rgba(99,102,241,0.12)',
                        border: '1px solid rgba(99,102,241,0.3)',
                        color: '#a78bfa',
                        textTransform: 'uppercase',
                        letterSpacing: '0.03em',
                        flexShrink: 0
                    }}>
                    <span style={{ fontSize: 13 }}>
                        {LANGUAGES.find(l => l.value === language)?.icon || '📝'}
                    </span>
                    <span className="hide-xs">{language || 'Auto'}</span>
                </div>
            </div>

            {/* Controls Group */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'center' }}>
                <button
                    onClick={handleRun}
                    disabled={isRunning && !isPaused}
                    className="btn btn-success"
                    style={{ padding: '7px 12px' }}
                >
                    <span>▶</span> <span className="hide-sm">Run</span>
                </button>

                <button
                    onClick={() => stepForward()}
                    disabled={!isRunning}
                    className="btn btn-ghost"
                    style={{ padding: '7px 10px' }}
                    title="Step Forward (F8)"
                >
                    <span>→</span> <span className="hide-md">Step</span>
                </button>

                <button
                    onClick={isPaused ? () => resumeExecution() : () => pauseExecution()}
                    disabled={!isRunning}
                    className="btn btn-warning"
                    style={{ padding: '7px 10px' }}
                >
                    <span>{isPaused ? '▶' : 'Ⅱ'}</span> <span className="hide-lg">{isPaused ? 'Resume' : 'Pause'}</span>
                </button>

                <button onClick={() => resetExecution()} className="btn btn-danger" style={{ padding: '7px 10px' }}>
                    <span>↺</span> <span className="hide-md">Reset</span>
                </button>
            </div>

            {/* Indicators Group */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                {/* Speed Slider */}
                <div className="hide-lg" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>Speed</span>
                    <input
                        type="range" min="0.1" max="2" step="0.1"
                        value={playbackSpeed}
                        onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                        style={{ width: 60 }}
                    />
                </div>

                {/* Connection Status */}
                <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-void/50 border border-border-subtle">
                    <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_6px_#10b981]' : 'bg-red-500'} pulse-dot`} />
                    <span className="hide-sm" style={{ fontSize: 9, fontWeight: 700, color: isConnected ? '#10b981' : '#ef4444' }}>
                        {isConnected ? 'LIVE' : 'OFF'}
                    </span>
                </div>
            </div>
        </div>
    );
}
