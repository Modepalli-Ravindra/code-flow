const { parseCode } = require('../parser/astParser');
const { Executor } = require('../engine/executor');

function getNodeMeta(step) {
    const fna = step.flowNodeActive;
    const d = step.description || '';

    switch (fna) {
        case 'start':
            return { label: 'START', shape: 'oval', color: 'purple' };
        case 'end':
            return { label: 'END', shape: 'oval', color: 'purple' };
        case 'var-decl': {
            const m = d.match(/Declare \w+ (\w+) = (.+)/);
            return {
                label: m ? `Create "${m[1]}"\n= ${m[2]}` : d.substring(0, 40),
                shape: 'rect', color: 'blue',
            };
        }
        case 'assignment': {
            const m = d.match(/Assign (\w+) = (.+?) \(was (.+?)\)/);
            return {
                label: m ? `${m[1]}: ${m[3]} → ${m[2]}` : d.substring(0, 40),
                shape: 'rect', color: 'yellow',
            };
        }
        case 'loop-condition': {
            const m = d.match(/for condition check → (true|false)/i) ||
                d.match(/while condition → (true|false)/i);
            const condText = step.conditionResult ? 'YES ✓' : 'NO ✗';
            return {
                label: `Loop\nCondition?\n${condText}`,
                shape: 'diamond', color: 'cyan',
                conditionResult: step.conditionResult,
            };
        }
        case 'condition': {
            const condText = step.conditionResult ? 'YES ✓' : 'NO ✗';
            return {
                label: `Condition?\n${condText}`,
                shape: 'diamond', color: 'cyan',
                conditionResult: step.conditionResult,
            };
        }
        case 'loop-update': {
            const m = d.match(/for update: (.+?) \((.+?) → (.+?)\)/);
            return {
                label: m ? `Update\n${m[1]}\n(${m[2]} → ${m[3]})` : 'Update',
                shape: 'rect', color: 'green',
            };
        }
        case 'output': {
            const m = d.match(/console\.log\((.+)\)/);
            return {
                label: m ? `Print:\n${m[1]}` : 'Print Output',
                shape: 'parallelogram', color: 'green',
            };
        }
        case 'func-decl':
            return { label: `Define\nFunction`, shape: 'rect', color: 'purple' };
        case 'return':
            return { label: `Return\nValue`, shape: 'rect', color: 'purple' };
        case 'error':
            return { label: `❌ Error`, shape: 'rect', color: 'red' };
        default:
            return { label: d.substring(0, 30) || fna, shape: 'rect', color: 'blue' };
    }
}

function buildFlowGraph(steps) {
    const nodes = [];
    const edges = [];

    // Always add Start node
    nodes.push({
        id: 'start',
        type: 'start',
        shape: 'oval',
        color: 'purple',
        label: 'START',
        position: { x: 200, y: 30 },
    });

    let yPos = 130;
    let lastId = 'start';
    let nodeIndex = 0;
    const seenKeys = new Set();

    for (const step of steps) {
        const fna = step.flowNodeActive;
        if (!fna || fna === 'start' || fna === 'end') continue;

        // Deduplicate: same type+line = same node (avoid duplicate loop-condition nodes when iterating)
        const key = `${fna}-${step.currentLine}`;
        const isLoopBack = seenKeys.has(key) && (fna === 'loop-condition' || fna === 'condition');

        if (isLoopBack) {
            // Add a loop-back edge to the existing node
            const existingId = `node-${[...seenKeys].indexOf(key) + 1}`;
            if (!edges.find(e => e.id === `e-loopback-${existingId}`)) {
                edges.push({
                    id: `e-loopback-${existingId}`,
                    source: lastId,
                    target: existingId,
                    label: 'loop back',
                    isLoopBack: true,
                });
            }
            lastId = existingId;
            continue;
        }

        seenKeys.add(key);
        nodeIndex++;
        const id = `node-${nodeIndex}`;
        const meta = getNodeMeta(step);

        nodes.push({
            id,
            type: fna,
            shape: meta.shape,
            color: meta.color,
            label: meta.label,
            line: step.currentLine,
            conditionResult: step.conditionResult,
            position: { x: 200, y: yPos },
        });

        edges.push({
            id: `e-${lastId}-${id}`,
            source: lastId,
            target: id,
            label: step.conditionResult === true ? 'YES' :
                step.conditionResult === false ? 'NO' : '',
            isLoopBack: false,
        });

        lastId = id;
        yPos += 110;
    }

    // End node
    nodes.push({
        id: 'end',
        type: 'end',
        shape: 'oval',
        color: 'purple',
        label: 'END',
        position: { x: 200, y: yPos },
    });
    edges.push({ id: `e-${lastId}-end`, source: lastId, target: 'end', label: '', isLoopBack: false });

    return { nodes, edges };
}

async function executeCode(code, inputs = [], language = 'javascript') {
    // ── JavaScript ──────────────────────────────────────────────────────────
    if (language === 'javascript' || language === 'js') {
        const { ast, error } = parseCode(code);
        if (error) {
            return {
                steps: [{
                    currentLine: error.line || 0,
                    description: `Syntax Error: ${error.message}`,
                    variables: {},
                    loopState: null,
                    output: '',
                    stackFrames: ['global'],
                    flowNodeActive: 'error',
                    conditionResult: null,
                    iterationCount: 0,
                    error: `Syntax Error at line ${error.line}: ${error.message}`,
                }],
                flowGraph: { nodes: [], edges: [] },
            };
        }
        const executor = new Executor(inputs);
        const steps = executor.run(ast.program || ast);
        const flowGraph = buildFlowGraph(steps);
        return { steps, flowGraph };
    }

    // ── Python ───────────────────────────────────────────────────────────────
    if (language === 'python') {
        const { executePython } = require('./pythonExecutor');
        const result = await executePython(code, inputs);
        const flowGraph = buildFlowGraph(result.steps || []);
        return { steps: result.steps || [], flowGraph, error: result.error };
    }

    // ── Java ─────────────────────────────────────────────────────────────────
    if (language === 'java') {
        const { executeJava } = require('./javaExecutor');
        const result = await executeJava(code, inputs);
        const flowGraph = buildFlowGraph(result.steps || []);
        return {
            steps: result.steps || [],
            flowGraph,
            output: result.output,
            error: result.error,
        };
    }

    // ── C / C++ ────────────────────────────────────────────────────────────
    if (language === 'c' || language === 'cpp') {
        const { executeCpp } = require('./cppExecutor');
        const result = await executeCpp(code, inputs, language);
        const flowGraph = buildFlowGraph(result.steps || []);
        return {
            steps: result.steps || [],
            flowGraph,
            output: result.output,
            error: result.error,
        };
    }

    // ── All other languages (Go, TypeScript, Rust…) ───────────────────────
    const { executeGeneric } = require('./genericExecutor');
    const result = executeGeneric(code, language);
    const flowGraph = buildFlowGraph(result.steps || []);
    return {
        steps: result.steps || [],
        flowGraph,
        isStatic: true,
        note: result.note,
    };
}

module.exports = { executeCode };
