import { create } from 'zustand';

// ── Language auto-detection ─────────────────────────────────────────────────
export function detectLanguage(code) {
    if (!code || code.trim().length < 3) return null;
    const c = code;
    // Java — must come before C/C++ (has class/System.out)
    if (/public\s+class\s+\w+|import\s+java\.|System\.out\.|\.nextInt\(\)|\.nextLine\(\)/.test(c)) return 'java';
    // Rust
    if (/fn\s+main\s*\(\s*\)|let\s+mut\s+|println!\s*\(|use\s+std::/.test(c)) return 'rust';
    // Go
    if (/package\s+main|func\s+main\s*\(\s*\)|fmt\.Print|import\s+"fmt"/.test(c)) return 'go';
    // C++ — before C (has cout/cin/namespace)
    if (/#include\s*<(iostream|vector|string|map|algorithm)>|cout\s*<<|cin\s*>>|using\s+namespace\s+std/.test(c)) return 'cpp';
    // C — has stdio/printf/scanf but NOT cout
    if (/#include\s*<(stdio\.h|stdlib\.h|string\.h)>|printf\s*\(|scanf\s*\(|int\s+main\s*\(/.test(c)) return 'c';
    // Python
    if (/^\s*def\s+\w+\s*\(|^\s*import\s+\w+|^\s*from\s+\w+\s+import|print\s*\(|elif\s+|:\s*$/.test(c, 'm') ||
        /\bprint\s*\(|\brange\s*\(|\binput\s*\(/.test(c)) return 'python';
    // TypeScript — has type annotations
    if (/:\s*(number|string|boolean|void|any)\b|interface\s+\w+\s*\{|type\s+\w+\s*=/.test(c)) return 'typescript';
    // SQL
    if (/\b(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|TRUNCATE|GRANT|REVOKE|MERGE)\b/i.test(c) &&
        /\b(FROM|INTO|TABLE|SET|WHERE|JOIN|GROUP BY|ORDER BY|VALUES)\b/i.test(c)) return 'sql';

    // JavaScript fallback
    if (/\bconsole\.(log|error|warn)\b|require\s*\(|const\s+\w+\s*=|let\s+\w+\s*=|=>\s*\{?/.test(c)) return 'javascript';
    return null; // unknown
}

const useExecutionStore = create((set, get) => ({
    // Code — starts blank, user pastes/writes their own
    language: 'javascript',
    setLanguage: (lang) => set({ language: lang }),   // does NOT replace code
    code: '',
    setCode: (code) => set({ code }),

    // Static analysis flag
    isStatic: false,

    // Execution state
    steps: [],
    currentStepIndex: -1,
    isRunning: false,
    isPaused: false,
    isConnected: false,
    totalSteps: 0,

    // Current step data (derived from steps[currentStepIndex])
    currentLine: 0,
    variables: {},
    loopState: null,
    output: [],
    stackFrames: ['global'],
    flowNodeActive: null,
    conditionResult: null,
    iterationCount: 0,
    error: null,
    description: '',

    // Flow graph
    flowNodes: [],
    flowEdges: [],

    // Settings
    speed: 600,
    setSpeed: (speed) => set({ speed }),
    breakpoints: new Set(),

    // Inputs
    inputs: [],
    pendingInputRequest: false,
    setInputs: (inputs) => set({ inputs }),
    clearInputs: () => set({ inputs: [] }),

    // ── Interactive terminal session ─────────────────────────────────────
    terminalMode: false,       // are we collecting inputs in the terminal?
    terminalLines: [],         // {type:'prompt'|'input'|'out'|'err', text:string}[]
    terminalPrompts: [],       // prompts extracted from code
    terminalPromptIndex: 0,    // which prompt we're on
    terminalCollected: [],     // inputs typed so far
    terminalRunCallback: null, // function(inputs) to call when done

    startTerminalInput: (prompts, onRun) => set({
        terminalMode: true,
        terminalLines: prompts.length > 0
            ? [{ type: 'prompt', text: prompts[0] }]
            : [{ type: 'prompt', text: '> Input: ' }],
        terminalPrompts: prompts,
        terminalPromptIndex: 0,
        terminalCollected: [],
        terminalRunCallback: onRun,
        activeConsoleTab: 'output',
    }),

    submitTerminalInput: (value) => {
        const { terminalPrompts, terminalPromptIndex, terminalLines, terminalCollected, terminalRunCallback } = get();
        const collected = [...terminalCollected, value];
        const nextIndex = terminalPromptIndex + 1;
        const hasMore = nextIndex < terminalPrompts.length;
        const newLines = [
            ...terminalLines,
            { type: 'input', text: value },
            ...(hasMore ? [{ type: 'prompt', text: terminalPrompts[nextIndex] }] : []),
        ];
        if (hasMore) {
            set({ terminalLines: newLines, terminalPromptIndex: nextIndex, terminalCollected: collected });
        } else {
            // All collected — run
            set({
                terminalLines: newLines,
                terminalMode: false,
                terminalCollected: [],
                terminalPromptIndex: 0,
                terminalRunCallback: null,
            });
            if (terminalRunCallback) terminalRunCallback(collected);
        }
    },

    appendTerminalOutput: (lines) => set((state) => ({
        terminalLines: [...state.terminalLines, ...lines.map(t => ({ type: 'out', text: t }))],
    })),

    clearTerminal: () => set({
        terminalMode: false, terminalLines: [], terminalPrompts: [],
        terminalPromptIndex: 0, terminalCollected: [], terminalRunCallback: null,
    }),

    // UI state
    activeConsoleTab: 'output',
    setActiveConsoleTab: (tab) => set({ activeConsoleTab: tab }),

    // Snippets
    savedSnippets: JSON.parse(localStorage.getItem('cf_snippets') || '[]'),

    // Actions
    setConnected: (v) => set({ isConnected: v }),

    applyStep: (step, stepIndex, totalSteps, flowGraph) => {
        const updates = {
            currentStepIndex: stepIndex,
            totalSteps: totalSteps || get().totalSteps,
        };
        if (step) {
            updates.currentLine = step.currentLine;
            updates.variables = step.variables || {};
            updates.loopState = step.loopState;
            updates.output = (() => {
                const o = step.output;
                if (!o) return [];
                if (Array.isArray(o)) return o;
                // Python returns a string — split into lines
                return String(o).split('\n').filter(l => l !== '');
            })();
            updates.stackFrames = step.stackFrames || ['global'];
            updates.flowNodeActive = step.flowNodeActive;
            updates.conditionResult = step.conditionResult;
            updates.iterationCount = step.iterationCount || 0;
            updates.error = step.error;
            updates.description = step.description || '';

            // Add to steps history
            const steps = [...get().steps];
            steps[stepIndex] = step;
            updates.steps = steps;
        }
        if (flowGraph) {
            updates.flowNodes = flowGraph.nodes || [];
            updates.flowEdges = flowGraph.edges || [];
        }
        set(updates);
    },

    setReady: (totalSteps, flowGraph) => set({
        totalSteps,
        steps: new Array(totalSteps).fill(null),
        flowNodes: flowGraph?.nodes || [],
        flowEdges: flowGraph?.edges || [],
        isRunning: true,
        isPaused: false,
        currentStepIndex: -1,
        output: [],
        error: null,
        description: '',
    }),

    setRunning: (v) => set({ isRunning: v }),
    setPaused: (v) => set({ isPaused: v }),

    reset: () => set({
        steps: [],
        currentStepIndex: -1,
        isRunning: false,
        isPaused: false,
        totalSteps: 0,
        currentLine: 0,
        variables: {},
        loopState: null,
        output: [],
        stackFrames: ['global'],
        flowNodeActive: null,
        conditionResult: null,
        iterationCount: 0,
        error: null,
        description: '',
        flowNodes: [],
        flowEdges: [],
    }),

    jumpToStep: (index) => {
        const { steps, flowNodes, flowEdges } = get();
        const step = steps[index];
        if (step) {
            set({
                currentStepIndex: index,
                currentLine: step.currentLine,
                variables: step.variables || {},
                loopState: step.loopState,
                output: (() => { const o = step.output; if (!o) return []; if (Array.isArray(o)) return o; return String(o).split('\n').filter(l => l !== ''); })(),
                stackFrames: step.stackFrames || ['global'],
                flowNodeActive: step.flowNodeActive,
                conditionResult: step.conditionResult,
                iterationCount: step.iterationCount || 0,
                error: step.error,
                description: step.description || '',
            });
        }
    },

    toggleBreakpoint: (line) => {
        const breakpoints = new Set(get().breakpoints);
        if (breakpoints.has(line)) breakpoints.delete(line);
        else breakpoints.add(line);
        set({ breakpoints });
    },

    saveSnippet: () => {
        const { code, savedSnippets } = get();
        const name = `Snippet ${new Date().toLocaleTimeString()}`;
        const updated = [...savedSnippets, { name, code, id: Date.now() }];
        localStorage.setItem('cf_snippets', JSON.stringify(updated));
        set({ savedSnippets: updated });
    },

    loadSnippet: (id) => {
        const { savedSnippets } = get();
        const snippet = savedSnippets.find(s => s.id === id);
        if (snippet) set({ code: snippet.code });
    },

    exportTrace: () => {
        const { steps, code } = get();
        const data = { code, steps, exportedAt: new Date().toISOString() };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'codeflow-trace.json';
        a.click();
        URL.revokeObjectURL(url);
    },

    setInputs: (inputs) => set({ inputs }),
    setPendingInput: (v) => set({ pendingInputRequest: v }),
}));

export default useExecutionStore;
