import React, { useRef, useEffect } from 'react';
import useExecutionStore from '../store/executionStore';

// ── Icon per line type ───────────────────────────────────────────────────────
function getLineInfo(line, lang) {
    const t = line.trim();

    // ── Empty / comment ──────────────────────────────────────────────────────
    if (!t) return null;
    if (t.startsWith('//') || t.startsWith('#') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('*/'))
        return { icon: '💬', color: '#64748b', badge: 'Comment', explain: 'This is a comment — ignored by the computer, written for human readers.' };

    // ── Imports / includes ───────────────────────────────────────────────────
    if (/^(import|from|#include|using namespace|package|use )/.test(t))
        return { icon: '📦', color: '#60a5fa', badge: 'Import', explain: `Loads an external library or module so you can use its features.` };

    // ── Class / struct ───────────────────────────────────────────────────────
    if (/^(public\s+)?(class|struct|interface|enum)\s+\w+/.test(t))
        return { icon: '🏗️', color: '#a78bfa', badge: 'Class', explain: `Defines a blueprint (class/struct) that groups related data and functions together.` };

    // ── Function / method declaration ────────────────────────────────────────
    if (/^(public|private|protected|static|async|def |fn |func |void |int |double |float |string |bool )/.test(t) && /\w+\s*\(/.test(t))
        return { icon: '🔧', color: '#c084fc', badge: 'Function', explain: `Declares a function — a named block of code you can call multiple times.` };
    if (/^(function\s+\w+|const\s+\w+\s*=\s*(async\s*)?\(|let\s+\w+\s*=\s*(async\s*)?\(|\w+\s*=\s*function)/.test(t))
        return { icon: '🔧', color: '#c084fc', badge: 'Function', explain: `Defines a reusable function. Code inside the { } runs every time you call it by name.` };

    // ── Variable declarations ────────────────────────────────────────────────
    if (/^(const|let|var|int|double|float|long|short|char|boolean|bool|string|auto)\s+\w+/.test(t)) {
        const match = t.match(/^(?:const|let|var|\w+)\s+(\w+)\s*=\s*(.+)/);
        if (match) return { icon: '📦', color: '#60a5fa', badge: 'Variable', explain: `Creates a variable named "${match[1]}" and stores the value ${match[2].replace(/;$/, '').trim()} in it. Variables are like labelled boxes that hold data.` };
        return { icon: '📦', color: '#60a5fa', badge: 'Variable', explain: `Declares a variable — a named storage slot in memory for a value.` };
    }

    // ── Assignment (no keyword) ──────────────────────────────────────────────
    if (/^\w+(\[.*?\])?\s*(\+|-|\*|\/|%)?=(?!=)/.test(t) && !t.startsWith('if') && !t.startsWith('while') && !t.startsWith('for'))
        return { icon: '✏️', color: '#fbbf24', badge: 'Assign', explain: `Updates the value stored in a variable. The right-hand side is calculated first, then saved.` };

    // ── Console / Print output ──────────────────────────────────────────────
    if (/^(console\.(log|error|warn)|print\s*\(|printf\s*\(|System\.out\.print|cout\s*<<|println\s*\(|fmt\.Print)/.test(t))
        return { icon: '📤', color: '#34d399', badge: 'Output', explain: `Prints a value or message to the console/screen so you can see the result.` };

    // ── Input ────────────────────────────────────────────────────────────────
    if (/\binput\s*\(|\bscanner\b|\bcin\s*>>|\bgets\s*\(|\bgetline\s*\(|\bscanner\.next/i.test(t))
        return { icon: '📥', color: '#22d3ee', badge: 'Input', explain: `Reads a value entered by the user at runtime and stores it.` };

    // ── If / else if / else ─────────────────────────────────────────────────
    if (/^(} )?else if\s*\(|^elif\s+/.test(t))
        return { icon: '🔀', color: '#22d3ee', badge: 'Else-If', explain: `If the first check was false, the computer tries this check instead.` };
    if (/^(} )?else(\s*\{)?$/.test(t) || t === 'else:')
        return { icon: '🔀', color: '#94a3b8', badge: 'Else', explain: `If all previous checks were false, the computer runs this "backup" block.` };
    if (/^if\s*[\(:]/.test(t)) {
        const cond = t.match(/^if\s*[\(](.+?)[\)]/)?.[1] || '';
        const isAssignment = /\s[^=]=[^=]\s/.test(cond); // Rough check for = vs ==
        return {
            icon: '🔀', color: '#22d3ee', badge: 'If',
            explain: `Checks if "${cond}" is true. If yes, it runs the code inside the curly braces.`,
            caution: isAssignment ? "Beginner Tip: You used '=' (Assign). Did you mean '==' (Compare)?" : null
        };
    }

    // ── Loops ────────────────────────────────────────────────────────────────
    if (/^for\s*[\(:]/.test(t)) {
        const inner = t.match(/^for\s*\((.+?)\)/)?.[1] || '';
        return { icon: '🔄', color: '#f59e0b', badge: 'For Loop', explain: `Repeats code for a set number of times. It's like a counting machine.` };
    }
    if (/^while\s*[\(:]/.test(t)) {
        const cond = t.match(/^while\s*[\(](.+?)[\)]/)?.[1] || '';
        const isInfinite = cond === 'true' || cond === '1';
        return {
            icon: '🔁', color: '#f59e0b', badge: 'While Loop',
            explain: `Keeps repeating code as long as "${cond}" is true.`,
            caution: isInfinite ? "Careful: This loop might run forever since the condition is always 'true'." : null
        };
    }
    if (/^do\s*\{?$/.test(t))
        return { icon: '🔁', color: '#f59e0b', badge: 'Do-While', explain: `Runs the block at least once, then keeps repeating while the condition is true.` };
    if (/^for\s+\w+\s+in\s+/.test(t))
        return { icon: '🔄', color: '#f59e0b', badge: 'For-In', explain: `Loops over each item in a collection (list/array) one by one.` };

    // ── Return ───────────────────────────────────────────────────────────────
    if (/^return\b/.test(t)) {
        const val = t.replace(/^return\s*/, '').replace(/;$/, '');
        return { icon: '↩️', color: '#a78bfa', badge: 'Return', explain: `Exits the current function and sends back the value "${val}" to wherever the function was called.` };
    }

    // ── Break / continue ─────────────────────────────────────────────────────
    if (/^break\b/.test(t)) return { icon: '🛑', color: '#f87171', badge: 'Break', explain: `Immediately exits the nearest loop — no more iterations.` };
    if (/^continue\b/.test(t)) return { icon: '⏭️', color: '#fbbf24', badge: 'Continue', explain: `Skips the rest of this loop iteration and jumps to the next one.` };

    // ── Try / catch / finally ────────────────────────────────────────────────
    if (/^try\s*\{?$/.test(t)) return { icon: '🛡️', color: '#34d399', badge: 'Try', explain: `Tries to run this block. If an error occurs, execution jumps to the catch block.` };
    if (/^catch\s*/.test(t)) return { icon: '🪤', color: '#f87171', badge: 'Catch', explain: `Catches any error thrown by the try block and lets you handle it gracefully.` };
    if (/^finally\s*/.test(t)) return { icon: '🧹', color: '#94a3b8', badge: 'Finally', explain: `Always runs after try/catch — good for cleanup code.` };

    // ── Throw ────────────────────────────────────────────────────────────────
    if (/^throw\b/.test(t)) return { icon: '💥', color: '#f87171', badge: 'Throw', explain: `Manually triggers an error/exception, stopping normal execution.` };

    // ── Array / object literals ──────────────────────────────────────────────
    if (/^(\[|\{)/.test(t) || /=\s*\[/.test(t))
        return { icon: '🗂️', color: '#818cf8', badge: 'Data', explain: `Creates a collection of values (array [ ] or object { }) stored together.` };

    // ── Closing brace ────────────────────────────────────────────────────────
    if (/^[}\])]/.test(t))
        return { icon: '🔚', color: '#475569', badge: 'Block End', explain: `Closes a block of code — marks where an if/loop/function/class ends.` };

    // ── Generic expression / call ────────────────────────────────────────────
    if (/\w+\s*\(/.test(t))
        return { icon: '⚡', color: '#6366f1', badge: 'Call', explain: `Calls a function by name, causing that function's code to execute right now.` };

    // ── SQL Specific Logic ───────────────────────────────────────────────────
    if (lang === 'sql' || /\b(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)\b/i.test(t)) {
        if (/^SELECT\b/i.test(t)) return { icon: '🔍', color: '#22d3ee', badge: 'Query', explain: 'Fetches specific columns or data from one or more tables in the database.' };
        if (/^FROM\b/i.test(t)) return { icon: '📂', color: '#60a5fa', badge: 'Source', explain: 'Specifies which table(s) the data should be retrieved from.' };
        if (/^WHERE\b/i.test(t)) return { icon: '🎯', color: '#f59e0b', badge: 'Filter', explain: 'Sets conditions to filter the rows. Only rows matching these rules will be included.' };
        if (/^INSERT\s+INTO\b/i.test(t)) return { icon: '📥', color: '#10b981', badge: 'Insert', explain: 'Adds a new row of data into a specific table.' };
        if (/^UPDATE\b/i.test(t)) return { icon: '✏️', color: '#fbbf24', badge: 'Update', explain: 'Modifies existing data in a table based on a condition.' };
        if (/^DELETE\b/i.test(t)) return { icon: '🗑️', color: '#ef4444', badge: 'Delete', explain: 'Removes rows of data from a table.' };
        if (/^JOIN\b|^LEFT JOIN\b|^RIGHT JOIN\b/i.test(t)) return { icon: '🖇️', color: '#a78bfa', badge: 'Join', explain: 'Combines rows from two or more tables based on a related column between them.' };
        if (/^GROUP\s+BY\b/i.test(t)) return { icon: '📊', color: '#c084fc', badge: 'Group', explain: 'Groups rows that have the same values into summary rows (like "total per country").' };
        if (/^ORDER\s+BY\b/i.test(t)) return { icon: '🔢', color: '#94a3b8', badge: 'Sort', explain: 'Sorts the final result set in ascending or descending order.' };
        if (/^CREATE\s+TABLE\b/i.test(t)) return { icon: '🏗️', color: '#a78bfa', badge: 'Schema', explain: 'Defines a new table structure, including column names and their data types.' };
    }

    return { icon: '▸', color: '#64748b', badge: 'Statement', explain: `Executes a statement — an instruction for the computer to perform.` };
}

// ── Flow Summary ─────────────────────────────────────────────────────────────
function buildFlowSummary(code, lang) {
    const lines = code.split('\n');
    const summary = [];
    let hasLoop = false, hasIf = false, hasFn = false, hasInput = false, hasOutput = false;

    for (const line of lines) {
        const t = line.trim();
        if (/^for[\s(:]|^while[\s(:]|^do\s*\{?$/.test(t)) hasLoop = true;
        if (/^if[\s(:]/.test(t)) hasIf = true;
        if (/^(function\s+\w+|const\s+\w+\s*=\s*(async\s*)?\(|def |fn |func )/.test(t)) hasFn = true;
        if (/\binput\s*\(|\bcin\s*>>|\bscanner\b|\bgetline\s*\(/i.test(t)) hasInput = true;
        if (/^(console\.(log|error)|print\s*\(|printf\s*\(|System\.out\.print|cout\s*<<)/.test(t)) hasOutput = true;
    }

    if (lang === 'sql') {
        let hasQuery = false, hasJoin = false, hasFilter = false, hasAgg = false;
        for (const line of lines) {
            const t = line.trim().toUpperCase();
            if (t.includes('SELECT')) hasQuery = true;
            if (t.includes('JOIN')) hasJoin = true;
            if (t.includes('WHERE')) hasFilter = true;
            if (t.includes('GROUP BY') || t.includes('COUNT(') || t.includes('SUM(')) hasAgg = true;
        }
        if (hasQuery) summary.push({ icon: '🔍', text: 'Queries database tables' });
        if (hasJoin) summary.push({ icon: '🖇️', text: 'Joins multiple tables' });
        if (hasFilter) summary.push({ icon: '🎯', text: 'Filters data with conditions' });
        if (hasAgg) summary.push({ icon: '📊', text: 'Aggregates/Summarizes data' });
    } else {
        if (hasFn) summary.push({ icon: '🔧', text: 'Defines reusable functions' });
        if (hasInput) summary.push({ icon: '📥', text: 'Reads user input' });
        if (hasIf) summary.push({ icon: '🔀', text: 'Has conditional branching (if/else)' });
        if (hasLoop) summary.push({ icon: '🔄', text: 'Contains loops (repeating steps)' });
        if (hasOutput) summary.push({ icon: '📤', text: 'Prints output to the console' });
    }

    return summary;
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function CodeExplainer() {
    const { code, language, currentLine, isRunning } = useExecutionStore();
    const activeRef = useRef(null);

    const lines = code ? code.split('\n') : [];
    const flowSummary = code.trim() ? buildFlowSummary(code, language) : [];

    // Scroll active line into view
    useEffect(() => {
        if (activeRef.current) {
            activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [currentLine]);

    if (!code.trim()) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#06060f' }}>
                <div style={{ padding: '7px 14px', borderBottom: '1px solid rgba(99,102,241,0.15)', background: 'rgba(8,8,20,0.85)' }}>
                    <span className="panel-label">📖 Code Explanation</span>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }}>
                    <span style={{ fontSize: 40, opacity: 0.4 }}>📋</span>
                    <span style={{ fontSize: 13, color: '#334155', textAlign: 'center', lineHeight: 1.8 }}>
                        Paste or type your code in the Editor<br />
                        <span style={{ fontSize: 11, color: '#1e293b' }}>
                            Each line will be explained here instantly
                        </span>
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#06060f', fontFamily: "'Inter', system-ui, sans-serif" }}>
            {/* Header */}
            <div style={{
                padding: '7px 14px', borderBottom: '1px solid rgba(99,102,241,0.15)',
                background: 'rgba(8,8,20,0.9)', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
                <span className="panel-label">📖 Code Explanation</span>
                <span style={{ fontSize: 10, color: '#475569' }}>{lines.length} lines</span>
            </div>

            {/* Flow Summary Banner */}
            {flowSummary.length > 0 && (
                <div style={{
                    padding: '8px 12px', background: 'rgba(99,102,241,0.07)',
                    borderBottom: '1px solid rgba(99,102,241,0.12)', flexShrink: 0,
                }}>
                    <div style={{ fontSize: 10, color: '#6366f1', fontWeight: 700, marginBottom: 5, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        🗺 What this code does
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {flowSummary.map((s, i) => (
                            <span key={i} style={{
                                fontSize: 11, color: '#94a3b8',
                                background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
                                borderRadius: 20, padding: '2px 10px', display: 'flex', alignItems: 'center', gap: 4,
                            }}>
                                {s.icon} {s.text}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Line-by-line list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
                {lines.map((line, idx) => {
                    const lineNum = idx + 1;
                    const info = getLineInfo(line, language);
                    const isActive = isRunning && lineNum === currentLine;
                    const isHighlighted = lineNum === currentLine;

                    if (!info) {
                        // Empty line — show as spacer
                        return (
                            <div key={idx} style={{ height: 10 }} />
                        );
                    }

                    return (
                        <div
                            key={idx}
                            ref={isHighlighted ? activeRef : null}
                            style={{
                                display: 'flex', alignItems: 'flex-start', gap: 10,
                                padding: '6px 12px',
                                background: isHighlighted
                                    ? 'rgba(99,102,241,0.14)'
                                    : 'transparent',
                                borderLeft: isHighlighted
                                    ? `3px solid ${info.color}`
                                    : '3px solid transparent',
                                transition: 'all 0.2s',
                            }}
                        >
                            {/* Line number */}
                            <span style={{
                                fontSize: 10, color: isHighlighted ? info.color : '#2d3748',
                                fontFamily: "'JetBrains Mono', monospace",
                                minWidth: 22, textAlign: 'right', flexShrink: 0, paddingTop: 2,
                                fontWeight: isHighlighted ? 700 : 400,
                                transition: 'color 0.2s',
                            }}>
                                {lineNum}
                            </span>

                            {/* Icon */}
                            <span style={{ fontSize: 14, flexShrink: 0, paddingTop: 1 }}>{info.icon}</span>

                            {/* Content */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                {/* Code snippet */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                                    <span style={{
                                        fontSize: 11, color: isHighlighted ? '#e2e8f0' : '#475569',
                                        fontFamily: "'JetBrains Mono', monospace",
                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                        flex: 1, minWidth: 0,
                                        transition: 'color 0.2s',
                                    }}>
                                        {line.trim().length > 48 ? line.trim().substring(0, 48) + '…' : line.trim()}
                                    </span>
                                    <span style={{
                                        fontSize: 9, fontWeight: 700, padding: '1px 7px', borderRadius: 20,
                                        background: `${info.color}22`, color: info.color,
                                        border: `1px solid ${info.color}44`,
                                        flexShrink: 0, letterSpacing: '0.06em',
                                    }}>
                                        {info.badge}
                                    </span>
                                </div>

                                {/* Explanation */}
                                <div style={{
                                    fontSize: 11, color: isHighlighted ? '#94a3b8' : '#374151',
                                    lineHeight: 1.5, transition: 'color 0.2s',
                                }}>
                                    {info.explain}
                                </div>

                                {/* Caution/Warning */}
                                {info.caution && (
                                    <div style={{
                                        marginTop: 6, padding: '4px 8px', borderRadius: 4,
                                        background: 'rgba(245, 158, 11, 0.1)',
                                        border: '1px solid rgba(245, 158, 11, 0.3)',
                                        fontSize: 10, color: '#f59e0b', fontWeight: 600
                                    }}>
                                        ⚠️ {info.caution}
                                    </div>
                                )}

                                {/* Active execution indicator */}
                                {isHighlighted && isRunning && (
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: 5,
                                        marginTop: 4, color: '#6366f1', fontSize: 10, fontWeight: 600,
                                    }}>
                                        <span style={{
                                            width: 6, height: 6, borderRadius: '50%',
                                            background: '#6366f1',
                                            animation: 'explainerPulse 0.8s ease-in-out infinite',
                                            display: 'inline-block',
                                        }} />
                                        Currently executing this line
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {/* End of code notice */}
                {lines.length > 0 && (
                    <div style={{
                        textAlign: 'center', padding: '16px 12px',
                        fontSize: 10, color: '#1e293b',
                        borderTop: '1px solid rgba(99,102,241,0.07)', margin: '6px 0 0',
                    }}>
                        ── end of code ──
                    </div>
                )}
            </div>

            <style>{`
                @keyframes explainerPulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.4; transform: scale(1.4); }
                }
            `}</style>
        </div>
    );
}
