import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import useExecutionStore from '../store/executionStore';
import { jumpToStep } from '../services/websocket';

const NODE_COLORS = {
    'start': '#8b5cf6',
    'end': '#8b5cf6',
    'var-decl': '#6366f1',
    'assignment': '#f59e0b',
    'loop-condition': '#22d3ee',
    'condition': '#22d3ee',
    'loop-update': '#10b981',
    'output': '#10b981',
    'error': '#ef4444',
    'func-decl': '#a78bfa',
    'return': '#a78bfa',
};

const NODE_ICONS = {
    'start': '▶',
    'end': '⏹',
    'var-decl': '📦',
    'assignment': '✏️',
    'loop-condition': '🔍',
    'condition': '🔀',
    'loop-update': '⬆️',
    'output': '📤',
    'error': '❌',
    'func-decl': '🔧',
    'return': '↩️',
};

function shortDesc(step) {
    if (!step) return '';
    const d = step.description || '';
    if (step.flowNodeActive === 'var-decl') {
        const m = d.match(/Declare \w+ (\w+) = (.+)/);
        return m ? `${m[1]} = ${m[2]}` : d;
    }
    if (step.flowNodeActive === 'assignment') {
        const m = d.match(/Assign (\w+) = (.+?) \(was/);
        return m ? `${m[1]} = ${m[2]}` : d;
    }
    if (step.flowNodeActive === 'loop-condition') {
        return step.conditionResult ? 'Condition → TRUE ✅' : 'Condition → FALSE ❌';
    }
    if (step.flowNodeActive === 'loop-update') {
        const m = d.match(/for update: (.+)/);
        return m ? m[1] : d;
    }
    if (step.flowNodeActive === 'output') {
        const m = d.match(/console\.log\((.+)\)/);
        return m ? `print: ${m[1]}` : d;
    }
    return d.length > 35 ? d.substring(0, 35) + '…' : d;
}

export default function ExecutionTrace() {
    const { steps, currentStepIndex, totalSteps } = useExecutionStore();
    const activeRef = useRef(null);

    // Scroll active step into view
    useEffect(() => {
        if (activeRef.current) {
            activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [currentStepIndex]);

    const visibleSteps = steps.filter(Boolean);

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between px-3 py-1.5"
                style={{ borderBottom: '1px solid rgba(99,102,241,0.15)', background: 'rgba(10,10,20,0.7)' }}>
                <span className="panel-label">Execution Trace</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {visibleSteps.length} steps
                </span>
            </div>

            <div className="flex-1 overflow-y-auto" style={{ padding: '8px 0' }}>
                {visibleSteps.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: 24, marginBottom: 8 }}>📋</div>
                        <div style={{ fontSize: 12 }}>Step history will appear here as code runs</div>
                    </div>
                ) : (
                    <div style={{ position: 'relative' }}>
                        {/* Vertical line */}
                        <div style={{
                            position: 'absolute', left: 30, top: 0, bottom: 0, width: 2,
                            background: 'rgba(99,102,241,0.15)', zIndex: 0
                        }} />

                        {visibleSteps.map((step, idx) => {
                            if (!step) return null;
                            const isActive = idx === currentStepIndex;
                            const color = NODE_COLORS[step.flowNodeActive] || '#6366f1';
                            const icon = NODE_ICONS[step.flowNodeActive] || '•';

                            return (
                                <div
                                    key={idx}
                                    ref={isActive ? activeRef : null}
                                    onClick={() => {
                                        useExecutionStore.getState().jumpToStep(idx);
                                        jumpToStep(idx);
                                    }}
                                    style={{
                                        display: 'flex', alignItems: 'flex-start', gap: 10,
                                        padding: '5px 12px',
                                        cursor: 'pointer',
                                        background: isActive ? `rgba(99,102,241,0.12)` : 'transparent',
                                        borderLeft: isActive ? `3px solid ${color}` : '3px solid transparent',
                                        transition: 'all 0.2s',
                                    }}>

                                    {/* Circle on timeline */}
                                    <div style={{
                                        width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                                        background: isActive ? color : 'rgba(15,15,30,1)',
                                        border: `2px solid ${isActive ? color : 'rgba(99,102,241,0.2)'}`,
                                        boxShadow: isActive ? `0 0 8px ${color}` : 'none',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 10, zIndex: 1,
                                        transition: 'all 0.2s',
                                    }}>
                                        {isActive ? (
                                            <motion.div
                                                animate={{ scale: [1, 1.3, 1] }}
                                                transition={{ repeat: Infinity, duration: 0.7 }}
                                                style={{ width: 8, height: 8, borderRadius: '50%', background: 'white' }}
                                            />
                                        ) : (
                                            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>{idx + 1}</span>
                                        )}
                                    </div>

                                    {/* Step content */}
                                    <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                            {step.currentLine > 0 && (
                                                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', flexShrink: 0 }}>
                                                    L{step.currentLine}
                                                </span>
                                            )}
                                            <span style={{
                                                fontSize: 11, color: isActive ? '#f1f5f9' : 'var(--text-secondary)',
                                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                fontFamily: 'JetBrains Mono'
                                            }}>
                                                {icon} {shortDesc(step)}
                                            </span>
                                        </div>

                                        {/* Show changed variable if any */}
                                        {isActive && step.flowNodeActive === 'assignment' && (() => {
                                            const m = (step.description || '').match(/Assign (\w+) = (.+?) \(was (.+?)\)/);
                                            if (m) return (
                                                <div style={{ fontSize: 11, marginTop: 2, color: '#f59e0b', fontFamily: 'JetBrains Mono' }}>
                                                    {m[3]} → {m[2]}
                                                </div>
                                            );
                                            return null;
                                        })()}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
