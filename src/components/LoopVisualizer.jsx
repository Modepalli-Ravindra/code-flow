import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useExecutionStore from '../store/executionStore';

const PHASES = [
    { id: 'init', label: 'Initialize', icon: '🏁', desc: 'Set starting value (e.g. i = 1)' },
    { id: 'check', label: 'Condition Check', icon: '🔍', desc: 'Is the condition true?' },
    { id: 'body', label: 'Loop Body', icon: '⚙️', desc: 'Run the code inside {}' },
    { id: 'update', label: 'Update', icon: '⬆️', desc: 'Change the counter (e.g. i++)' },
];

function getPhase(flowNodeActive) {
    if (flowNodeActive === 'var-decl') return 'init';
    if (flowNodeActive === 'loop-condition' || flowNodeActive === 'condition') return 'check';
    if (flowNodeActive === 'assignment' || flowNodeActive === 'output' || flowNodeActive === 'statement') return 'body';
    if (flowNodeActive === 'loop-update') return 'update';
    return null;
}

export default function LoopVisualizer() {
    const { loopState, flowNodeActive, variables } = useExecutionStore();

    const activePhase = getPhase(flowNodeActive);
    const isInLoop = loopState !== null;
    const iterCount = loopState?.iterationCount ?? 0;
    const condResult = loopState?.conditionResult;

    // Show max 7 iteration dots
    const maxDots = 7;

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex items-center px-3 py-1.5"
                style={{ borderBottom: '1px solid rgba(99,102,241,0.15)', background: 'rgba(10,10,20,0.7)' }}>
                <span className="panel-label">Loop Cycle</span>
                {isInLoop && (
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                        Iteration #{iterCount}
                    </span>
                )}
            </div>

            <div className="flex-1 flex flex-col gap-4 p-3 overflow-y-auto">
                {!isInLoop && flowNodeActive !== 'loop-condition' && flowNodeActive !== 'loop-update' ? (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>🔁</div>
                        <div style={{ fontSize: 12 }}>Loop visualization appears when a loop runs</div>
                    </div>
                ) : (
                    <>
                        {/* Loop phases as a vertical flow */}
                        <div className="flex flex-col gap-1">
                            {PHASES.map((phase, idx) => {
                                const isActive = activePhase === phase.id;
                                const isDone =
                                    phase.id === 'init' && iterCount > 0 ||
                                    (phase.id === 'check' && activePhase === 'body') ||
                                    (phase.id === 'check' && activePhase === 'update') ||
                                    (phase.id === 'body' && activePhase === 'update');

                                return (
                                    <React.Fragment key={phase.id}>
                                        <motion.div
                                            animate={{
                                                scale: isActive ? 1.02 : 1,
                                                opacity: isActive ? 1 : 0.6,
                                            }}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 12,
                                                padding: '10px 14px',
                                                borderRadius: 10,
                                                background: isActive
                                                    ? phase.id === 'check' && condResult === false
                                                        ? 'rgba(239,68,68,0.15)'
                                                        : 'rgba(99,102,241,0.18)'
                                                    : isDone
                                                        ? 'rgba(16,185,129,0.07)'
                                                        : 'rgba(255,255,255,0.03)',
                                                border: `1.5px solid ${isActive
                                                        ? phase.id === 'check' && condResult === false
                                                            ? 'rgba(239,68,68,0.6)'
                                                            : '#6366f1'
                                                        : isDone
                                                            ? 'rgba(16,185,129,0.3)'
                                                            : 'rgba(255,255,255,0.06)'
                                                    }`,
                                                boxShadow: isActive ? '0 0 16px rgba(99,102,241,0.4)' : 'none',
                                                transition: 'all 0.3s ease',
                                            }}>
                                            <span style={{ fontSize: 22, lineHeight: 1 }}>{phase.icon}</span>
                                            <div style={{ flex: 1 }}>
                                                <div style={{
                                                    fontSize: 13, fontWeight: isActive ? 700 : 500,
                                                    color: isActive ? '#f1f5f9' : 'var(--text-secondary)'
                                                }}>
                                                    {phase.label}
                                                </div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                                                    {phase.desc}
                                                </div>
                                            </div>
                                            <div style={{ fontSize: 16 }}>
                                                {isActive ? (
                                                    <motion.span
                                                        animate={{ scale: [1, 1.4, 1] }}
                                                        transition={{ repeat: Infinity, duration: 0.8 }}>
                                                        👈
                                                    </motion.span>
                                                ) : isDone ? '✅' : '⏳'}
                                            </div>
                                        </motion.div>

                                        {/* Arrow between phases */}
                                        {idx < PHASES.length - 1 && (
                                            <div style={{ textAlign: 'center', color: 'rgba(99,102,241,0.4)', fontSize: 14, lineHeight: 1 }}>↓</div>
                                        )}
                                    </React.Fragment>
                                );
                            })}

                            {/* Back arrow to check */}
                            <div style={{
                                textAlign: 'center', fontSize: 11,
                                color: 'rgba(99,102,241,0.5)', padding: '4px 0',
                                fontStyle: 'italic'
                            }}>
                                ↩ Back to Condition Check (repeats)
                            </div>
                        </div>

                        {/* Iteration dots */}
                        {iterCount > 0 && (
                            <div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                                    Iterations completed:
                                </div>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    {Array.from({ length: Math.min(iterCount, maxDots) }).map((_, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            style={{
                                                width: 28, height: 28, borderRadius: '50%',
                                                background: i === iterCount - 1
                                                    ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                                                    : 'rgba(99,102,241,0.25)',
                                                border: i === iterCount - 1 ? '2px solid #a78bfa' : '1px solid rgba(99,102,241,0.3)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 11, fontWeight: 700,
                                                color: i === iterCount - 1 ? 'white' : '#818cf8',
                                                fontFamily: 'JetBrains Mono',
                                                boxShadow: i === iterCount - 1 ? '0 0 10px rgba(99,102,241,0.6)' : 'none',
                                            }}>
                                            {i + 1}
                                        </motion.div>
                                    ))}
                                    {iterCount > maxDots && (
                                        <div style={{
                                            width: 28, height: 28, borderRadius: '50%',
                                            background: 'rgba(255,255,255,0.05)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 10, color: 'var(--text-muted)',
                                        }}>+{iterCount - maxDots}</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
