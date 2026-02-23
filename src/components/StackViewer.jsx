import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useExecutionStore from '../store/executionStore';

export default function StackViewer() {
    const { stackFrames, loopState, currentStepIndex } = useExecutionStore();

    // The stack frames are usually [global, func1, func2]
    // We want to show them piling up from bottom to top or top to bottom.
    // Top-to-bottom is more conventional for "piling up" visually in a panel.

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'rgba(5,5,15,0.4)' }}>
            <div className="flex items-center justify-between px-3 py-1.5"
                style={{ borderBottom: '1px solid rgba(99,102,241,0.15)', background: 'rgba(10,10,20,0.7)' }}>
                <span className="panel-label">Call Stack & Loops</span>
                {stackFrames.length > 1 && (
                    <span style={{ fontSize: 9, color: '#a78bfa', fontWeight: 800 }}>RECURSION ACTIVE</span>
                )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
                {/* ── Call Stack (Visual Piling) ─────────────────────────── */}
                <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        📚 Call Stack (Depth: {stackFrames.length})
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column-reverse', gap: 4 }}>
                        <AnimatePresence>
                            {stackFrames.map((frame, i) => {
                                const isTop = i === stackFrames.length - 1;
                                return (
                                    <motion.div
                                        key={`${i}-${frame}`}
                                        initial={{ opacity: 0, x: -20, scale: 0.9 }}
                                        animate={{ opacity: 1, x: 0, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        style={{
                                            padding: '8px 12px',
                                            borderRadius: 6,
                                            background: isTop ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.05)',
                                            border: `1px solid ${isTop ? 'rgba(99, 102, 241, 0.5)' : 'rgba(99, 102, 241, 0.2)'}`,
                                            borderLeft: `3px solid ${isTop ? '#6366f1' : '#475569'}`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            position: 'relative',
                                            overflow: 'hidden'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                                                #{i}
                                            </span>
                                            <span style={{
                                                fontSize: 12,
                                                fontWeight: isTop ? 700 : 400,
                                                color: isTop ? '#fff' : 'var(--text-secondary)',
                                                fontFamily: 'JetBrains Mono'
                                            }}>
                                                {frame}{frame === 'global' ? '' : '()'}
                                            </span>
                                        </div>
                                        {isTop && (
                                            <motion.div
                                                animate={{ opacity: [0.4, 1, 0.4] }}
                                                transition={{ repeat: Infinity, duration: 1.5 }}
                                                style={{ fontSize: 10 }}
                                            >
                                                ⚡ ACTIVE
                                            </motion.div>
                                        )}
                                        {/* Subtle background block effect */}
                                        <div style={{
                                            position: 'absolute', right: -10, bottom: -10,
                                            fontSize: 40, opacity: 0.03, pointerEvents: 'none'
                                        }}>
                                            {i}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                </div>

                {/* ── Loop Tracker ───────────────────────────────────────── */}
                <div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        🔁 Loop Iterations
                    </div>
                    {loopState ? (
                        <div style={{
                            padding: 12,
                            borderRadius: 10,
                            background: 'rgba(34, 211, 238, 0.05)',
                            border: '1px solid rgba(34, 211, 238, 0.2)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                <div>
                                    <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Cycles</div>
                                    <div style={{ fontSize: 28, fontWeight: 900, color: '#22d3ee', fontFamily: 'JetBrains Mono', lineHeight: 1 }}>
                                        {loopState.iterationCount}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Condition</div>
                                    <div style={{
                                        fontSize: 14, fontWeight: 800,
                                        color: loopState.conditionResult ? '#10b981' : '#ef4444',
                                        fontFamily: 'JetBrains Mono'
                                    }}>
                                        {loopState.conditionResult ? 'TRUE' : 'FALSE'}
                                    </div>
                                </div>
                            </div>

                            {/* Visual iteration dots */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {Array.from({ length: Math.min(loopState.iterationCount, 20) }).map((_, idx) => (
                                    <div key={idx} style={{
                                        width: 6, height: 6, borderRadius: '50%',
                                        background: idx === loopState.iterationCount - 1 ? '#22d3ee' : 'rgba(34, 211, 238, 0.3)',
                                        boxShadow: idx === loopState.iterationCount - 1 ? '0 0 5px #22d3ee' : 'none'
                                    }} />
                                ))}
                                {loopState.iterationCount > 20 && <span style={{ fontSize: 10, color: '#22d3ee' }}>+</span>}
                            </div>
                        </div>
                    ) : (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', padding: '0 4px' }}>
                            No code is currently looping
                        </div>
                    )}
                </div>
            </div>

            {/* Step Status Bar */}
            <div style={{
                padding: '6px 12px',
                background: 'rgba(255,255,255,0.03)',
                fontSize: 10,
                color: 'var(--text-muted)',
                display: 'flex',
                justifyContent: 'space-between',
                borderTop: '1px solid rgba(255,255,255,0.05)'
            }}>
                <span>STATUS: {currentStepIndex >= 0 ? 'EXECUTING' : 'IDLE'}</span>
                <span>STEP {currentStepIndex + 1}</span>
            </div>
        </div>
    );
}
