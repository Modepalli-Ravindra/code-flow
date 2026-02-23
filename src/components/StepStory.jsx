import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useExecutionStore from '../store/executionStore';

// Plain-English descriptions for each step type
function humanize(description, flowNodeActive, conditionResult, variables) {
    if (!description) return 'Program is ready to run...';

    if (flowNodeActive === 'start') return '🚀 Program starts executing from the top.';
    if (flowNodeActive === 'end') return '🏁 Program finished! All done.';

    if (flowNodeActive === 'var-decl') {
        // e.g. "Declare let sum = 0"
        const match = description.match(/Declare \w+ (\w+) = (.+)/);
        if (match) return `📦 Creating a new variable called "${match[1]}" and setting its value to ${match[2]}.`;
        return `📦 ${description}`;
    }

    if (flowNodeActive === 'assignment') {
        const match = description.match(/Assign (\w+) = (.+?) \(was (.+)\)/);
        if (match) return `✏️ Updating "${match[1]}" from ${match[3]} → ${match[2]}.`;
        return `✏️ ${description}`;
    }

    if (flowNodeActive === 'loop-condition') {
        const iterMatch = description.match(/iteration (\d+)/);
        const iter = iterMatch ? iterMatch[1] : '';
        if (conditionResult === true)
            return `🔍 Loop check (iteration ${iter}): condition is ✅ TRUE — entering the loop body.`;
        if (conditionResult === false)
            return `🔍 Loop check (iteration ${iter}): condition is ❌ FALSE — loop ends here.`;
        return `🔁 Checking loop condition...`;
    }

    if (flowNodeActive === 'condition') {
        if (conditionResult === true) return `🔀 if-condition is ✅ TRUE — running the "if" block.`;
        if (conditionResult === false) return `🔀 if-condition is ❌ FALSE — skipping "if", running "else" (if any).`;
        return `🔀 Evaluating condition...`;
    }

    if (flowNodeActive === 'loop-update') {
        const match = description.match(/for update: (\w+).+?\((.+?) → (.+?)\)/);
        if (match) return `⬆️ Loop step: "${match[1]}" goes from ${match[2]} to ${match[3]}.`;
        return `⬆️ ${description}`;
    }

    if (flowNodeActive === 'output') {
        const match = description.match(/console\.log\((.+)\)/);
        if (match) return `📤 Printing to console: ${match[1]}`;
        return `📤 ${description}`;
    }

    if (flowNodeActive === 'func-decl') return `🔧 Defining a function that can be called later.`;
    if (flowNodeActive === 'return') return `↩️ Function returns a value back to where it was called.`;
    if (flowNodeActive === 'error') return `❌ Error: ${description}`;

    return description;
}

export default function StepStory() {
    const {
        description, flowNodeActive, conditionResult,
        variables, currentLine, currentStepIndex, totalSteps, isRunning, loopState
    } = useExecutionStore();

    const humanText = humanize(description, flowNodeActive, conditionResult, variables);

    const bgColor = flowNodeActive === 'error' ? 'rgba(239,68,68,0.08)' :
        conditionResult === true ? 'rgba(16,185,129,0.06)' :
            conditionResult === false ? 'rgba(239,68,68,0.06)' :
                flowNodeActive === 'output' ? 'rgba(34,211,238,0.06)' :
                    'rgba(99,102,241,0.06)';

    const borderColor = flowNodeActive === 'error' ? 'rgba(239,68,68,0.4)' :
        conditionResult === true ? 'rgba(16,185,129,0.4)' :
            conditionResult === false ? 'rgba(239,68,68,0.3)' :
                flowNodeActive === 'output' ? 'rgba(34,211,238,0.3)' :
                    'rgba(99,102,241,0.3)';

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2"
                style={{ borderBottom: '1px solid rgba(99,102,241,0.15)', background: 'rgba(10,10,20,0.7)' }}>
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full`}
                        style={{
                            background: isRunning ? '#10b981' : '#475569',
                            boxShadow: isRunning ? '0 0 8px #10b981' : 'none',
                            animation: isRunning ? 'pulse-dot 1s infinite' : 'none'
                        }} />
                    <span className="panel-label">What's Happening</span>
                </div>
                {totalSteps > 0 && (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                        Step {Math.max(0, currentStepIndex + 1)} / {totalSteps}
                    </span>
                )}
            </div>

            <div className="flex flex-col gap-3 p-4 flex-1 overflow-y-auto">
                {/* Current step big explanation */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStepIndex}
                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.25 }}
                        style={{
                            background: bgColor,
                            border: `1px solid ${borderColor}`,
                            borderRadius: 12,
                            padding: '16px 20px',
                        }}>
                        <div style={{ fontSize: 16, fontWeight: 500, color: '#f1f5f9', lineHeight: 1.6 }}>
                            {humanText}
                        </div>
                        {currentLine > 0 && (
                            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>
                                📍 Currently on <span style={{ color: '#a78bfa', fontFamily: 'JetBrains Mono' }}>Line {currentLine}</span>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>

                {/* Progress bar */}
                {totalSteps > 0 && (
                    <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Execution Progress</div>
                        <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                            <motion.div
                                style={{ height: '100%', borderRadius: 3, background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }}
                                animate={{ width: `${Math.round(((currentStepIndex + 1) / totalSteps) * 100)}%` }}
                                transition={{ duration: 0.3 }}
                            />
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, textAlign: 'right' }}>
                            {Math.round(((currentStepIndex + 1) / totalSteps) * 100)}% complete
                        </div>
                    </div>
                )}

                {/* Condition result big badge */}
                {conditionResult !== null && (
                    <motion.div
                        key={`cond-${currentStepIndex}`}
                        initial={{ scale: 0.7, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '12px 16px',
                            borderRadius: 10,
                            background: conditionResult ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                            border: `1px solid ${conditionResult ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
                        }}>
                        <span style={{ fontSize: 28 }}>{conditionResult ? '✅' : '❌'}</span>
                        <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: conditionResult ? '#10b981' : '#ef4444' }}>
                                Condition is {conditionResult ? 'TRUE' : 'FALSE'}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                {conditionResult ? 'Code inside the block runs' : 'Code inside the block is skipped'}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Not started hint */}
                {totalSteps === 0 && (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: 36, marginBottom: 10 }}>▶</div>
                        <div style={{ fontSize: 14 }}>Click <strong style={{ color: '#a78bfa' }}>Run</strong> to start the visualization</div>
                        <div style={{ fontSize: 12, marginTop: 6 }}>Each step will be explained here in plain English</div>
                    </div>
                )}
            </div>
        </div>
    );
}
