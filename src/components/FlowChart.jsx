import React, { useRef, useEffect } from 'react';
import useExecutionStore from '../store/executionStore';

// ── Dimensions ─────────────────────────────────────────────────────────────
const RECT_W = 170;
const RECT_H = 54;
const DIAMOND_S = 68;
const OVAL_W = 140;
const OVAL_H = 44;
const PARA_W = 170;
const PARA_H = 52;
const SKEW = 16;
const CX = 220; // canvas center x

// ── Color palettes ──────────────────────────────────────────────────────────
const PAL = {
    purple: { fill: '#1e0a44', stroke: '#a78bfa', text: '#e9d5ff', glow: '#7c3aed' },
    blue: { fill: '#061b3a', stroke: '#60a5fa', text: '#bfdbfe', glow: '#2563eb' },
    yellow: { fill: '#1c1000', stroke: '#fbbf24', text: '#fef3c7', glow: '#d97706' },
    cyan: { fill: '#011520', stroke: '#22d3ee', text: '#cffafe', glow: '#0891b2' },
    green: { fill: '#01200e', stroke: '#34d399', text: '#d1fae5', glow: '#059669' },
    red: { fill: '#1e0707', stroke: '#f87171', text: '#fee2e2', glow: '#dc2626' },
};

function pal(color, active) {
    const p = PAL[color] || PAL.blue;
    return active
        ? { fill: p.glow, stroke: '#fff', text: '#fff', glow: p.glow }
        : p;
}

// ── Shape components ────────────────────────────────────────────────────────
function NodeText({ x, y, lines, fill, fontSize = 12, fontWeight = 600 }) {
    return lines.map((line, i) => (
        <text key={i}
            x={x} y={y + (i - (lines.length - 1) / 2) * 15}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={fontSize} fontWeight={fontWeight}
            fontFamily="Inter, system-ui, sans-serif" fill={fill}>
            {line}
        </text>
    ));
}

function Glow({ active, color, children }) {
    if (!active) return children;
    return (
        <g style={{ filter: `drop-shadow(0 0 12px ${PAL[color]?.glow || '#6366f1'})` }}>
            {children}
        </g>
    );
}

function OvalNode({ x, y, label, color, active }) {
    const p = pal(color, active);
    const lines = label.split('\n');
    return (
        <Glow active={active} color={color}>
            <g>
                <ellipse cx={x} cy={y} rx={OVAL_W / 2} ry={OVAL_H / 2}
                    fill={p.fill} stroke={p.stroke} strokeWidth={active ? 2.5 : 1.5} />
                {active && <ellipse cx={x} cy={y} rx={OVAL_W / 2 + 6} ry={OVAL_H / 2 + 6}
                    fill="none" stroke={p.stroke} strokeWidth={1} opacity={0.4} />}
                <NodeText x={x} y={y} lines={lines} fill={p.text} fontWeight={700} />
            </g>
        </Glow>
    );
}

function RectNode({ x, y, label, color, active }) {
    const p = pal(color, active);
    const lines = label.split('\n');
    const h = RECT_H + Math.max(0, lines.length - 1) * 15;
    return (
        <Glow active={active} color={color}>
            <g>
                <rect x={x - RECT_W / 2} y={y - h / 2} width={RECT_W} height={h}
                    rx={7} fill={p.fill} stroke={p.stroke} strokeWidth={active ? 2.5 : 1.5} />
                {active && <rect x={x - RECT_W / 2 - 5} y={y - h / 2 - 5} width={RECT_W + 10} height={h + 10}
                    rx={11} fill="none" stroke={p.stroke} strokeWidth={1} opacity={0.35} />}
                <NodeText x={x} y={y} lines={lines} fill={p.text} />
            </g>
        </Glow>
    );
}

function DiamondNode({ x, y, label, color, active }) {
    const p = pal(color, active);
    const lines = label.split('\n');
    const s = DIAMOND_S;
    return (
        <Glow active={active} color={color}>
            <g>
                <polygon points={`${x},${y - s} ${x + s},${y} ${x},${y + s} ${x - s},${y}`}
                    fill={p.fill} stroke={p.stroke} strokeWidth={active ? 2.5 : 1.5} />
                {active && <polygon points={`${x},${y - s - 7} ${x + s + 7},${y} ${x},${y + s + 7} ${x - s - 7},${y}`}
                    fill="none" stroke={p.stroke} strokeWidth={1} opacity={0.35} />}
                <NodeText x={x} y={y} lines={lines} fill={p.text} fontSize={11} fontWeight={700} />
            </g>
        </Glow>
    );
}

function ParaNode({ x, y, label, color, active }) {
    const p = pal(color, active);
    const lines = label.split('\n');
    const h = PARA_H + Math.max(0, lines.length - 1) * 15;
    const sk = SKEW;
    const pts = `${x - PARA_W / 2 + sk},${y - h / 2} ${x + PARA_W / 2 + sk},${y - h / 2} ${x + PARA_W / 2 - sk},${y + h / 2} ${x - PARA_W / 2 - sk},${y + h / 2}`;
    return (
        <Glow active={active} color={color}>
            <g>
                <polygon points={pts} fill={p.fill} stroke={p.stroke} strokeWidth={active ? 2.5 : 1.5} />
                <NodeText x={x} y={y} lines={lines} fill={p.text} />
            </g>
        </Glow>
    );
}

// ── Layout helpers ──────────────────────────────────────────────────────────
function nodeHeight(node) {
    const lines = (node.label || '').split('\n').length;
    switch (node.shape) {
        case 'oval': return OVAL_H;
        case 'diamond': return DIAMOND_S * 2;
        default: return RECT_H + Math.max(0, lines - 1) * 15;
    }
}
function nodeBottomY(node) { return node.position.y + nodeHeight(node) / 2; }
function nodeTopY(node) { return node.position.y - nodeHeight(node) / 2; }

// ── Arrow ────────────────────────────────────────────────────────────────────
function Arrow({ from, to, label, loopBack }) {
    if (!from || !to) return null;
    const x1 = from.position.x, y1 = nodeBottomY(from);
    const x2 = to.position.x, y2 = nodeTopY(to);
    const col = label === 'YES' ? '#10b981' : label === 'NO' ? '#f87171' : '#6366f1';
    const mid = { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };

    if (loopBack) {
        const lx = Math.min(x1, x2) - 90;
        const my = (y1 + y2) / 2;
        return (
            <g>
                <path d={`M${x1},${y1} C${x1},${y1 + 30} ${lx},${y1 + 40} ${lx},${my} C${lx},${y2 - 40} ${x2},${y2 - 30} ${x2},${y2}`}
                    fill="none" stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="5,4"
                    markerEnd="url(#arrPurple)" />
                <text x={lx - 4} y={my} textAnchor="end" fontSize={9} fill="#a78bfa" fontStyle="italic" fontFamily="Inter">↩ repeat</text>
            </g>
        );
    }

    return (
        <g>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={col} strokeWidth={1.8}
                markerEnd={`url(#arr${label === 'YES' ? 'Green' : label === 'NO' ? 'Red' : 'Blue'})`} />
            {label && (
                <g>
                    <rect x={mid.x - 18} y={mid.y - 10} width={36} height={20} rx={5}
                        fill="rgba(5,5,15,0.9)" stroke={col} strokeWidth={0.8} />
                    <text x={mid.x} y={mid.y + 1} textAnchor="middle" dominantBaseline="middle"
                        fontSize={11} fontWeight={700} fill={col} fontFamily="Inter">{label}</text>
                </g>
            )}
        </g>
    );
}

// ── Current step indicator sidebar ──────────────────────────────────────────
function StepSidebar({ currentStepIndex, totalSteps, flowNodeActive, currentLine, description }) {
    if (!isFinite(currentStepIndex) || currentStepIndex < 0) return null;
    const pct = totalSteps > 0 ? Math.round(((currentStepIndex + 1) / totalSteps) * 100) : 0;
    const typeLabel = {
        'start': 'Program starts',
        'end': 'Program ends',
        'var-decl': 'Create variable',
        'assignment': 'Update variable',
        'loop-condition': 'Loop check',
        'condition': 'If/else check',
        'output': 'Print output',
        'func-decl': 'Function defined',
        'return': 'Return value',
        'error': 'Error!',
        'statement': 'Execute statement',
        'call': 'Function call',
    }[flowNodeActive] || flowNodeActive || 'Executing...';

    const typeColor = {
        'loop-condition': '#22d3ee', 'condition': '#22d3ee',
        'output': '#34d399', 'error': '#f87171',
        'var-decl': '#60a5fa', 'assignment': '#fbbf24',
        'func-decl': '#a78bfa', 'return': '#a78bfa',
    }[flowNodeActive] || '#6366f1';

    return (
        <div style={{
            padding: '10px 14px', background: 'rgba(8,8,20,0.95)',
            borderBottom: '1px solid rgba(99,102,241,0.15)', flexShrink: 0,
        }}>
            {/* Step progress bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ flex: 1, height: 4, background: 'rgba(99,102,241,0.15)', borderRadius: 2 }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #6366f1, #a78bfa)', borderRadius: 2, transition: 'width 0.3s' }} />
                </div>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
                    {currentStepIndex + 1}/{totalSteps}
                </span>
            </div>
            {/* Current step info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                    padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                    background: `${typeColor}22`, color: typeColor, border: `1px solid ${typeColor}55`,
                    flexShrink: 0,
                }}>
                    {typeLabel}
                </div>
                {currentLine > 0 && (
                    <span style={{ fontSize: 11, color: '#6366f1', fontFamily: 'JetBrains Mono', flexShrink: 0 }}>
                        line {currentLine}
                    </span>
                )}
                {description && (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        — {description.length > 45 ? description.substring(0, 45) + '…' : description}
                    </span>
                )}
                {/* Loop counter badge */}
                {useExecutionStore.getState().loopState && (
                    <div style={{
                        marginLeft: 'auto', padding: '2px 8px', borderRadius: 4,
                        background: 'rgba(34, 211, 238, 0.15)', border: '1px solid rgba(34, 211, 238, 0.4)',
                        color: '#22d3ee', fontSize: 10, fontWeight: 800, fontFamily: 'JetBrains Mono'
                    }}>
                        ITERATION #{useExecutionStore.getState().loopState.iterationCount}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Main FlowChart ────────────────────────────────────────────────────────────
export default function FlowChart() {
    const { flowNodes, flowEdges, flowNodeActive, currentLine,
        currentStepIndex, totalSteps, description, isRunning } = useExecutionStore();
    const scrollRef = useRef(null);
    const activeNodeRef = useRef(null);

    // ── Find active node: match by LINE first, then fallback to type ──────────
    let activeNodeId = null;
    if (flowNodeActive === 'start') {
        activeNodeId = 'start';
    } else if (flowNodeActive === 'end') {
        activeNodeId = 'end';
    } else if (currentLine > 0) {
        // Prefer exact line match
        const byLine = flowNodes.find(n => n.line === currentLine && n.type === flowNodeActive);
        if (byLine) activeNodeId = byLine.id;
        else {
            // Fallback: closest line match within ±2
            const nearby = flowNodes
                .filter(n => n.type === flowNodeActive && Math.abs((n.line || 0) - currentLine) <= 2)
                .sort((a, b) => Math.abs((a.line || 0) - currentLine) - Math.abs((b.line || 0) - currentLine));
            if (nearby[0]) activeNodeId = nearby[0].id;
        }
    }
    if (!activeNodeId && flowNodeActive) {
        // Last resort: first node of matching type
        const byType = flowNodes.find(n => n.type === flowNodeActive);
        if (byType) activeNodeId = byType.id;
    }

    // Scroll to active node
    useEffect(() => {
        if (activeNodeRef.current) {
            activeNodeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [activeNodeId]);

    if (flowNodes.length === 0) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#06060f' }}>
                <div style={{ padding: '6px 14px', borderBottom: '1px solid rgba(99,102,241,0.15)', background: 'rgba(8,8,20,0.8)' }}>
                    <span className="panel-label">Execution Flowchart</span>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
                    <div style={{ fontSize: 48, opacity: 0.6 }}>📊</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-secondary)' }}>Flowchart appears here</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6, maxWidth: 220 }}>
                        Press <b style={{ color: '#10b981' }}>▶ Run</b> to execute your code<br />
                        and see the flow step by step
                    </div>
                </div>
            </div>
        );
    }

    const nodeMap = Object.fromEntries(flowNodes.map(n => [n.id, n]));
    const maxY = Math.max(...flowNodes.map(n => n.position.y)) + 120;
    const svgH = Math.max(maxY, 360);
    const svgW = 440;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#06060f' }}>
            {/* Header */}
            <div style={{ padding: '6px 14px', borderBottom: '1px solid rgba(99,102,241,0.15)', background: 'rgba(8,8,20,0.85)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="panel-label">Execution Flowchart</span>
                <div style={{ display: 'flex', gap: 10, fontSize: 10, color: 'var(--text-muted)' }}>
                    <span style={{ color: '#60a5fa' }}>▭ Action</span>
                    <span style={{ color: '#22d3ee' }}>◆ Decision</span>
                    <span style={{ color: '#34d399' }}>⊘ Output</span>
                    <span style={{ color: '#a78bfa' }}>⬭ Start/End</span>
                </div>
            </div>

            {/* Step indicator */}
            <StepSidebar
                currentStepIndex={currentStepIndex}
                totalSteps={totalSteps}
                flowNodeActive={flowNodeActive}
                currentLine={currentLine}
                description={description}
            />

            {/* SVG canvas */}
            <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', position: 'relative' }}>
                <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} style={{ display: 'block', minHeight: svgH }}>
                    <defs>
                        {[['Blue', '#6366f1'], ['Green', '#10b981'], ['Red', '#f87171'], ['Purple', '#a78bfa']].map(([n, c]) => (
                            <marker key={n} id={`arr${n}`} markerWidth={9} markerHeight={9} refX={6} refY={3} orient="auto">
                                <path d="M0,0 L0,6 L8,3 z" fill={c} />
                            </marker>
                        ))}
                        <pattern id="dotgrid" width="20" height="20" patternUnits="userSpaceOnUse">
                            <circle cx={10} cy={10} r={0.6} fill="rgba(99,102,241,0.12)" />
                        </pattern>
                    </defs>

                    {/* Dot-grid background */}
                    <rect width={svgW} height={svgH} fill="url(#dotgrid)" />

                    {/* Edges first (behind nodes) */}
                    {flowEdges.map(e => (
                        <Arrow key={e.id}
                            from={nodeMap[e.source]} to={nodeMap[e.target]}
                            label={e.label} loopBack={e.isLoopBack} />
                    ))}

                    {/* Nodes */}
                    {flowNodes.map(node => {
                        const active = node.id === activeNodeId;
                        const props = { x: node.position.x, y: node.position.y, label: node.label || node.type, color: node.color || 'blue', active };

                        return (
                            <g key={node.id} ref={active ? activeNodeRef : null}>
                                {node.shape === 'oval' && <OvalNode    {...props} />}
                                {node.shape === 'diamond' && <DiamondNode {...props} />}
                                {node.shape === 'parallelogram' && <ParaNode    {...props} />}
                                {!['oval', 'diamond', 'parallelogram'].includes(node.shape) && <RectNode {...props} />}
                                {/* Line number tag */}
                                {node.line > 0 && (
                                    <text x={node.position.x + RECT_W / 2 + 5} y={node.position.y - 14}
                                        fontSize={9} fill="rgba(148,163,184,0.45)" fontFamily="JetBrains Mono">
                                        L{node.line}
                                    </text>
                                )}
                            </g>
                        );
                    })}
                </svg>
            </div>
        </div>
    );
}
