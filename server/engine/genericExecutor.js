/**
 * Generic Static Analyzer — works for ANY language.
 * Parses code line-by-line using regex heuristics to identify:
 * - Variable declarations/assignments
 * - If/else conditions
 * - For/while/do-while loops
 * - Function definitions
 * - Print/output statements
 * - Return statements
 * Generates execution flow steps WITHOUT actually running the code.
 */

const LANG_PATTERNS = {
    java: {
        varDecl: /^\s*(int|double|float|long|String|boolean|char|var)\s+(\w+)\s*=\s*(.+?);/,
        assignment: /^\s*(\w[\w.[\]]*)\s*=\s*(.+?);/,
        forLoop: /^\s*for\s*\(/,
        whileLoop: /^\s*while\s*\(/,
        doLoop: /^\s*do\s*\{/,
        ifStmt: /^\s*if\s*\(/,
        elseStmt: /^\s*(else|else\s+if)/,
        print: /^\s*System\.out\.(print|println)\s*\(/,
        funcDecl: /^\s*(public|private|protected|static|\s)*(void|int|String|boolean|double|float)\s+(\w+)\s*\(/,
        returnStmt: /^\s*return\s/,
        comment: /^\s*(\/\/|\/\*|\*)/,
    },
    c: {
        varDecl: /^\s*(int|double|float|long|char|void|unsigned|short|bool)\s+\*?(\w+)\s*=?\s*/,
        assignment: /^\s*(\w[\w\[\]]*)\s*=\s*(.+?);/,
        forLoop: /^\s*for\s*\(/,
        whileLoop: /^\s*while\s*\(/,
        doLoop: /^\s*do\s*\{/,
        ifStmt: /^\s*if\s*\(/,
        elseStmt: /^\s*else/,
        print: /^\s*printf\s*\(/,
        funcDecl: /^\s*[\w\s\*]+\s+(\w+)\s*\([^)]*\)\s*\{/,
        returnStmt: /^\s*return\s/,
        comment: /^\s*(\/\/|\/\*|\*)/,
    },
    cpp: {
        varDecl: /^\s*(int|double|float|long|char|void|auto|string|bool|unsigned)\s+\*?(\w+)\s*[=;]/,
        assignment: /^\s*(\w[\w\[\]]*)\s*=\s*(.+?);/,
        forLoop: /^\s*for\s*\(/,
        whileLoop: /^\s*while\s*\(/,
        doLoop: /^\s*do\s*\{/,
        ifStmt: /^\s*if\s*\(/,
        elseStmt: /^\s*else/,
        print: /^\s*cout\s*<</,
        funcDecl: /^\s*[\w\s\*:<>]+\s+(\w+)\s*\([^)]*\)\s*\{/,
        returnStmt: /^\s*return\s/,
        comment: /^\s*(\/\/|\/\*|\*)/,
    },
    go: {
        varDecl: /^\s*(var\s+\w+|(\w+)\s*:=)/,
        assignment: /^\s*(\w+)\s*=\s*/,
        forLoop: /^\s*for\s+/,
        whileLoop: /^\s*for\s+[\w!]/,
        doLoop: null,
        ifStmt: /^\s*if\s+/,
        elseStmt: /^\s*}\s*else/,
        print: /^\s*fmt\.(Print|Println|Printf)\s*\(/,
        funcDecl: /^\s*func\s+(\w+)\s*\(/,
        returnStmt: /^\s*return\s/,
        comment: /^\s*\/\//,
    },
    typescript: {
        varDecl: /^\s*(let|const|var)\s+(\w+)(\s*:\s*\w+)?\s*=\s*(.+?);?/,
        assignment: /^\s*(\w+)\s*=\s*(.+?);?/,
        forLoop: /^\s*for\s*\(/,
        whileLoop: /^\s*while\s*\(/,
        doLoop: /^\s*do\s*\{/,
        ifStmt: /^\s*if\s*\(/,
        elseStmt: /^\s*(else|else\s+if)/,
        print: /^\s*console\.(log|warn|error)\s*\(/,
        funcDecl: /^\s*(function|async function|const\s+\w+\s*=\s*(async\s+)?\()/,
        returnStmt: /^\s*return\s/,
        comment: /^\s*(\/\/|\/\*|\*)/,
    },
    rust: {
        varDecl: /^\s*let\s+(mut\s+)?(\w+)/,
        assignment: /^\s*(\w+)\s*=\s*/,
        forLoop: /^\s*for\s+\w+\s+in\s+/,
        whileLoop: /^\s*while\s+/,
        doLoop: /^\s*loop\s*\{/,
        ifStmt: /^\s*if\s+/,
        elseStmt: /^\s*}\s*else/,
        print: /^\s*println!\s*\(/,
        funcDecl: /^\s*fn\s+(\w+)\s*\(/,
        returnStmt: /^\s*return\s/,
        comment: /^\s*\/\//,
    },
    sql: {
        select: /^\s*SELECT\b/i,
        from: /^\s*FROM\b/i,
        where: /^\s*WHERE\b/i,
        insert: /^\s*INSERT\s+INTO\b/i,
        update: /^\s*UPDATE\b/i,
        delete: /^\s*DELETE\b/i,
        create: /^\s*CREATE\s+TABLE\b/i,
        join: /^\s*(JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN)\b/i,
        groupBy: /^\s*GROUP\s+BY\b/i,
        comment: /^\s*(--|\/\*)/,
    },
    python: null, // handled by pythonExecutor
    javascript: null, // handled by existing executor
};

function classifyLine(line, patterns) {
    if (!patterns) return null;
    if (patterns.comment && patterns.comment.test(line)) return null;
    if (!line.trim() || line.trim() === '{' || line.trim() === '}' || line.trim() === '};') return null;

    if (patterns.print && patterns.print.test(line))
        return { type: 'output', shape: 'parallelogram', color: 'green' };
    if (patterns.forLoop && patterns.forLoop.test(line))
        return { type: 'loop-condition', shape: 'diamond', color: 'cyan' };
    if (patterns.whileLoop && patterns.whileLoop.test(line))
        return { type: 'loop-condition', shape: 'diamond', color: 'cyan' };
    if (patterns.doLoop && patterns.doLoop.test(line))
        return { type: 'loop-condition', shape: 'diamond', color: 'cyan' };
    if (patterns.ifStmt && patterns.ifStmt.test(line))
        return { type: 'condition', shape: 'diamond', color: 'cyan' };
    if (patterns.elseStmt && patterns.elseStmt.test(line))
        return { type: 'condition', shape: 'diamond', color: 'cyan' };
    if (patterns.funcDecl && patterns.funcDecl.test(line))
        return { type: 'func-decl', shape: 'rect', color: 'purple' };
    if (patterns.returnStmt && patterns.returnStmt.test(line))
        return { type: 'return', shape: 'rect', color: 'purple' };
    if (patterns.varDecl && patterns.varDecl.test(line))
        return { type: 'var-decl', shape: 'rect', color: 'blue' };
    if (patterns.assignment && patterns.assignment.test(line))
        return { type: 'assignment', shape: 'rect', color: 'yellow' };

    // SQL specific
    if (patterns.select && patterns.select.test(line)) return { type: 'query', shape: 'parallelogram', color: 'cyan' };
    if (patterns.from && patterns.from.test(line)) return { type: 'source', shape: 'rect', color: 'blue' };
    if (patterns.where && patterns.where.test(line)) return { type: 'condition', shape: 'diamond', color: 'cyan' };
    if (patterns.insert && patterns.insert.test(line)) return { type: 'assignment', shape: 'rect', color: 'green' };
    if (patterns.update && patterns.update.test(line)) return { type: 'assignment', shape: 'rect', color: 'yellow' };
    if (patterns.delete && patterns.delete.test(line)) return { type: 'error', shape: 'rect', color: 'red' };
    if (patterns.create && patterns.create.test(line)) return { type: 'var-decl', shape: 'rect', color: 'purple' };
    if (patterns.join && patterns.join.test(line)) return { type: 'statement', shape: 'rect', color: 'purple' };
    if (patterns.groupBy && patterns.groupBy.test(line)) return { type: 'statement', shape: 'rect', color: 'blue' };

    return null;
}

function makeLabel(lineText, type, patterns) {
    const t = lineText.trim().replace(/[{};]+$/, '').trim();
    switch (type) {
        case 'var-decl': return `Create\n${t.substring(0, 30)}`;
        case 'assignment': return `Update\n${t.substring(0, 30)}`;
        case 'loop-condition': return `Loop:\n${t.replace(/for|while|loop/, '').trim().substring(0, 28)}`;
        case 'condition': return `Check:\n${t.replace(/if|else if|else/, '').trim().substring(0, 28)}`;
        case 'output': return `Print:\n${t.substring(0, 28)}`;
        case 'func-decl': return `Function:\n${t.substring(0, 28)}`;
        case 'return': return `Return\n${t.substring(5, 28)}`;
        default: return t.substring(0, 30);
    }
}

function executeGeneric(code, language) {
    const patterns = LANG_PATTERNS[language] || LANG_PATTERNS.java;
    const lines = code.split('\n');
    const steps = [];

    // Add start step
    steps.push({
        currentLine: 1,
        variables: {},
        flowNodeActive: 'start',
        description: 'Program starts',
        conditionResult: null,
        output: '',
        error: null,
        stackFrames: ['main'],
        loopState: null,
        iterationCount: 0,
    });

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;
        const classification = classifyLine(line, patterns);
        if (!classification) continue;

        const label = makeLabel(line, classification.type, patterns);
        steps.push({
            currentLine: lineNum,
            variables: {},
            flowNodeActive: classification.type,
            description: label.replace('\n', ': '),
            conditionResult: null,
            output: '',
            error: null,
            stackFrames: ['main'],
            loopState: null,
            iterationCount: 0,
            // For flow graph
            _label: label,
            _shape: classification.shape,
            _color: classification.color,
        });
    }

    // Add end step
    steps.push({
        currentLine: lines.length,
        variables: {},
        flowNodeActive: 'end',
        description: 'Program ends',
        conditionResult: null,
        output: '',
        error: null,
        stackFrames: [],
        loopState: null,
        iterationCount: 0,
    });

    return {
        steps,
        isStatic: true, // tells frontend this is static analysis, not real execution
        note: `Static flow analysis for ${language}. Code is not executed — structure is analyzed.`,
    };
}

const SUPPORTED_LANGUAGES = ['javascript', 'python', 'java', 'c', 'cpp', 'go', 'typescript', 'rust', 'sql'];

module.exports = { executeGeneric, SUPPORTED_LANGUAGES, LANG_PATTERNS };
