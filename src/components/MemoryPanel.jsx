import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useExecutionStore from '../store/executionStore';

function VarCard({ name, value, isNew, isUpdated, prevValue }) {
    const displayVal = typeof value === 'object' ? JSON.stringify(value) : String(value ?? 'undefined');

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: -12, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            style={{
                borderRadius: 12,
                padding: '14px 16px',
                background: isUpdated
                    ? 'rgba(245,158,11,0.12)'
                    : isNew
                        ? 'rgba(16,185,129,0.10)'
                        : 'rgba(99,102,241,0.07)',
                border: `1.5px solid ${isUpdated ? 'rgba(245,158,11,0.55)' :
                        isNew ? 'rgba(16,185,129,0.45)' :
                            'rgba(99,102,241,0.2)'}`,
                boxShadow: isUpdated
                    ? '0 0 16px rgba(245,158,11,0.25)'
                    : isNew
                        ? '0 0 14px rgba(16,185,129,0.2)'
                        : 'none',
                minWidth: 90,
            }}>
            {/* Variable name */}
            <div style={{
                fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.1em',
                fontFamily: 'JetBrains Mono', marginBottom: 6,
            }}>
                {isNew ? '🆕 ' : isUpdated ? '✏️ ' : '📦 '}{name}
            </div>

            {/* Value with old→new animation */}
            {isUpdated && prevValue !== undefined && (
                <div style={{
                    fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono',
                    textDecoration: 'line-through', marginBottom: 2
                }}>
                    {String(prevValue)}
                </div>
            )}
            {isUpdated && (
                <div style={{ fontSize: 11, color: '#f59e0b', fontFamily: 'JetBrains Mono', marginBottom: 2 }}>↓</div>
            )}

            <AnimatePresence mode="wait">
                <motion.div
                    key={displayVal}
                    initial={{ scale: 0.8, opacity: 0.5 }}
                    animate={{ scale: 1, opacity: 1 }}
                    style={{
                        fontSize: 22, fontWeight: 800,
                        color: isUpdated ? '#f59e0b' : isNew ? '#10b981' : '#a78bfa',
                        fontFamily: 'JetBrains Mono',
                        wordBreak: 'break-all',
                    }}>
                    {displayVal}
                </motion.div>
            </AnimatePresence>

            {/* Type hint */}
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                {typeof value}
            </div>
        </motion.div>
    );
}

export default function MemoryPanel() {
    const { variables, description } = useExecutionStore();
    const prevVarsRef = useRef({});
    const [updatedVars, setUpdatedVars] = useState(new Set());
    const [newVars, setNewVars] = useState(new Set());
    const [prevValues, setPrevValues] = useState({});

    const entries = Object.entries(variables);

    useEffect(() => {
        const prev = prevVarsRef.current;
        const updated = new Set();
        const newV = new Set();
        const prevVals = {};

        for (const [k, v] of Object.entries(variables)) {
            if (!(k in prev)) newV.add(k);
            else if (prev[k] !== v) {
                updated.add(k);
                prevVals[k] = prev[k];
            }
        }

        setUpdatedVars(updated);
        setNewVars(newV);
        setPrevValues(prevVals);
        prevVarsRef.current = { ...variables };

        if (updated.size > 0 || newV.size > 0) {
            const t = setTimeout(() => {
                setUpdatedVars(new Set());
                setNewVars(new Set());
                setPrevValues({});
            }, 1400);
            return () => clearTimeout(t);
        }
    }, [variables]);

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between px-3 py-1.5"
                style={{ borderBottom: '1px solid rgba(99,102,241,0.15)', background: 'rgba(10,10,20,0.7)' }}>
                <span className="panel-label">Variables in Memory</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {entries.length} {entries.length === 1 ? 'variable' : 'variables'}
                </span>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
                {entries.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                        <div style={{ fontSize: 12 }}>Variables appear here as they are created</div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                        <AnimatePresence>
                            {entries.map(([name, value]) => (
                                <VarCard
                                    key={name}
                                    name={name}
                                    value={value}
                                    isNew={newVars.has(name)}
                                    isUpdated={updatedVars.has(name)}
                                    prevValue={prevValues[name]}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
}
