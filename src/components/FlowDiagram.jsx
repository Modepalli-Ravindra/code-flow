import React, { useCallback, useMemo } from 'react';
import {
    ReactFlow, Background, Controls, MiniMap,
    Handle, Position, useNodesState, useEdgesState,
    addEdge, MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import useExecutionStore from '../store/executionStore';

// ── Custom node renderer ───────────────────────────────────────────────────
function FlowNode({ data, id }) {
    const isActive = data.isActive;
    const nodeStyle = {
        background: isActive
            ? 'rgba(99,102,241,0.2)'
            : data.type === 'start' || data.type === 'end'
                ? 'rgba(139,92,246,0.15)'
                : data.type === 'condition' || data.type === 'loop-condition'
                    ? 'rgba(245,158,11,0.1)'
                    : data.type === 'output'
                        ? 'rgba(16,185,129,0.1)'
                        : data.type === 'error'
                            ? 'rgba(239,68,68,0.1)'
                            : 'rgba(15,15,30,0.9)',
        border: isActive
            ? '1.5px solid #6366f1'
            : data.type === 'condition' || data.type === 'loop-condition'
                ? '1px solid rgba(245,158,11,0.4)'
                : data.type === 'output'
                    ? '1px solid rgba(16,185,129,0.3)'
                    : data.type === 'error'
                        ? '1px solid rgba(239,68,68,0.4)'
                        : '1px solid rgba(99,102,241,0.2)',
        boxShadow: isActive ? '0 0 16px rgba(99,102,241,0.7), 0 0 32px rgba(99,102,241,0.2)' : 'none',
        borderRadius: data.type === 'start' || data.type === 'end' ? 20 : 6,
        padding: '6px 10px',
        fontSize: 11,
        fontFamily: 'JetBrains Mono, monospace',
        color: isActive ? '#a78bfa' : '#cbd5e1',
        maxWidth: 150,
        textAlign: 'center',
        transition: 'all 0.25s ease',
        wordBreak: 'break-word',
        minWidth: 80,
    };

    return (
        <div style={nodeStyle}>
            <Handle type="target" position={Position.Top} style={{ background: '#6366f1', width: 6, height: 6 }} />
            <div style={{ lineHeight: 1.4 }}>{data.label}</div>
            {isActive && (
                <div style={{ fontSize: 9, color: '#6366f1', marginTop: 3 }}>● active</div>
            )}
            <Handle type="source" position={Position.Bottom} style={{ background: '#6366f1', width: 6, height: 6 }} />
        </div>
    );
}

const nodeTypes = { flowNode: FlowNode };

export default function FlowDiagram() {
    const { flowNodes, flowEdges, flowNodeActive } = useExecutionStore();

    // Convert server nodes/edges to ReactFlow format
    const rfNodes = useMemo(() => {
        if (!flowNodes || flowNodes.length === 0) {
            // Default placeholder diagram
            return [
                { id: 'start', type: 'flowNode', position: { x: 150, y: 30 }, data: { label: '▶ Start', type: 'start', isActive: flowNodeActive === 'start' } },
                { id: 'end', type: 'flowNode', position: { x: 150, y: 160 }, data: { label: '⏹ End', type: 'end', isActive: flowNodeActive === 'end' } },
            ];
        }
        return flowNodes.map(n => ({
            id: n.id,
            type: 'flowNode',
            position: n.position || { x: 150, y: 50 },
            data: {
                label: n.label,
                type: n.type,
                line: n.data?.line,
                isActive: n.id === `node-${findActiveNodeIndex(flowNodes, flowNodeActive)}` ||
                    (n.id === 'start' && flowNodeActive === 'start') ||
                    (n.id === 'end' && flowNodeActive === 'end'),
            },
        }));
    }, [flowNodes, flowNodeActive]);

    const rfEdges = useMemo(() => {
        if (!flowEdges || flowEdges.length === 0) {
            return [{
                id: 'e-start-end', source: 'start', target: 'end', animated: true,
                markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
                style: { stroke: '#6366f1', strokeWidth: 1.5 }
            }];
        }
        return flowEdges.map(e => ({
            ...e,
            animated: e.animated || false,
            markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
            style: { stroke: e.label === 'true' ? '#10b981' : e.label === 'false' ? '#ef4444' : '#6366f1', strokeWidth: 1.5 },
            labelStyle: { fill: e.label === 'true' ? '#10b981' : '#ef4444', fontSize: 10, fontFamily: 'JetBrains Mono' },
            labelBgStyle: { fill: 'rgba(0,0,0,0.6)' },
        }));
    }, [flowEdges]);

    return (
        <div className="h-full" style={{ background: '#080810', borderRadius: 0 }}>
            <div className="flex items-center px-3 py-1.5"
                style={{ borderBottom: '1px solid rgba(99,102,241,0.12)', background: 'rgba(10,10,20,0.6)' }}>
                <span className="panel-label">Flow Diagram</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 8 }}>
                    {flowNodes.length > 0 ? `${flowNodes.length} nodes` : 'Run code to see diagram'}
                </span>
            </div>
            <div style={{ height: 'calc(100% - 32px)' }}>
                <ReactFlow
                    nodes={rfNodes}
                    edges={rfEdges}
                    nodeTypes={nodeTypes}
                    fitView
                    fitViewOptions={{ padding: 0.3 }}
                    proOptions={{ hideAttribution: true }}>
                    <Background color="#1a1a2e" gap={20} size={1} />
                    <Controls position="bottom-right" style={{ background: 'rgba(15,15,30,0.8)', border: '1px solid rgba(99,102,241,0.2)' }} />
                    <MiniMap
                        style={{ background: 'rgba(10,10,20,0.9)', border: '1px solid rgba(99,102,241,0.2)' }}
                        nodeColor={(n) => n.data?.isActive ? '#6366f1' : '#1e1e3a'}
                        maskColor="rgba(0,0,0,0.5)"
                    />
                </ReactFlow>
            </div>
        </div>
    );
}

function findActiveNodeIndex(nodes, flowNodeActive) {
    // Find last node with matching type to return its index
    for (let i = nodes.length - 1; i >= 0; i--) {
        if (nodes[i].type === flowNodeActive) return i + 1;
    }
    return -1;
}
