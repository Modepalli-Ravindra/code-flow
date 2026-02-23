import React from 'react';
import useExecutionStore from '../store/executionStore';
import { jumpToStep } from '../services/websocket';

export default function TimelineScrubber() {
    const {
        currentStepIndex,
        totalSteps,
        isRunning,
        steps,
        description
    } = useExecutionStore();

    if (!isRunning || totalSteps <= 0) return null;

    const handleChange = (e) => {
        const index = parseInt(e.target.value);
        // We use the jumpToStep helper which sends a message to the backend
        // and also updates the local store state for immediate feedback
        useExecutionStore.getState().jumpToStep(index);
        jumpToStep(index);
    };

    return (
        <div style={{
            padding: '12px 24px',
            background: 'rgba(10, 10, 20, 0.95)',
            borderTop: '1px solid rgba(99, 102, 241, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            zIndex: 10
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 4
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: 'var(--neon-cyan)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em'
                    }}>
                        Time Travel
                    </span>
                    <span style={{
                        fontSize: 12,
                        fontFamily: 'JetBrains Mono',
                        color: 'var(--text-secondary)'
                    }}>
                        Step {currentStepIndex + 1} / {totalSteps}
                    </span>
                </div>

                {description && (
                    <span style={{
                        fontSize: 11,
                        fontFamily: 'JetBrains Mono',
                        color: 'var(--neon-purple)',
                        maxWidth: '50%',
                        textAlign: 'right',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}>
                        {description}
                    </span>
                )}
            </div>

            <div style={{ position: 'relative', height: 24, display: 'flex', alignItems: 'center' }}>
                <input
                    type="range"
                    min="0"
                    max={totalSteps - 1}
                    value={currentStepIndex < 0 ? 0 : currentStepIndex}
                    onChange={handleChange}
                    style={{
                        width: '100%',
                        cursor: 'pointer',
                        background: 'rgba(255, 255, 255, 0.05)',
                        height: 6,
                        borderRadius: 3,
                        outline: 'none',
                        zIndex: 2
                    }}
                />

                {/* Progress highlight */}
                <div style={{
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    height: 6,
                    width: `${((currentStepIndex + 1) / totalSteps) * 100}%`,
                    background: 'linear-gradient(90deg, #6366f1, #22d3ee)',
                    borderRadius: 3,
                    pointerEvents: 'none',
                    boxShadow: '0 0 10px rgba(99, 102, 241, 0.4)',
                    zIndex: 1
                }} />
            </div>
        </div>
    );
}
