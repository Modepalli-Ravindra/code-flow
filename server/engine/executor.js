const MAX_ITERATIONS = 1000;
const MAX_STEPS = 5000;

class Executor {
    constructor(inputs = []) {
        this.steps = [];
        this.variables = {}; // flat scope (simplified)
        this.output = [];
        this.stackFrames = ['global'];
        this.iterationCount = 0;
        this.inputs = inputs;
        this.inputIndex = 0;
        this.stepCount = 0;
        this.flowNodes = [];
        this.flowEdges = [];
    }

    pushStep({ currentLine, description, loopState, flowNodeActive, conditionResult }) {
        if (this.stepCount >= MAX_STEPS) {
            throw new Error('Maximum step limit reached (5000). Possible infinite loop.');
        }
        this.steps.push({
            currentLine: currentLine || 0,
            description: description || '',
            variables: JSON.parse(JSON.stringify(this.variables)),
            loopState: loopState || null,
            output: [...this.output],
            stackFrames: [...this.stackFrames],
            flowNodeActive: flowNodeActive || null,
            conditionResult: conditionResult !== undefined ? conditionResult : null,
            iterationCount: this.iterationCount,
            error: null,
        });
        this.stepCount++;
    }

    pushError(message, line) {
        this.steps.push({
            currentLine: line || 0,
            description: `Error: ${message}`,
            variables: JSON.parse(JSON.stringify(this.variables)),
            loopState: null,
            output: [...this.output],
            stackFrames: [...this.stackFrames],
            flowNodeActive: 'error',
            conditionResult: null,
            iterationCount: this.iterationCount,
            error: message,
        });
    }

    getLine(node) {
        return node && node.loc ? node.loc.start.line : 0;
    }

    // ──── Expression Evaluator ────────────────────────────────────────────────
    evalExpr(node) {
        if (!node) return undefined;

        switch (node.type) {
            case 'NumericLiteral':
            case 'StringLiteral':
            case 'BooleanLiteral':
                return node.value;

            case 'NullLiteral':
                return null;

            case 'Identifier':
                if (node.name === 'undefined') return undefined;
                if (node.name in this.variables) return this.variables[node.name];
                return undefined;

            case 'TemplateLiteral': {
                let str = '';
                const quasis = node.quasis;
                const exprs = node.expressions;
                for (let i = 0; i < quasis.length; i++) {
                    str += quasis[i].value.cooked;
                    if (i < exprs.length) str += String(this.evalExpr(exprs[i]));
                }
                return str;
            }

            case 'BinaryExpression': {
                const left = this.evalExpr(node.left);
                const right = this.evalExpr(node.right);
                switch (node.operator) {
                    case '+': return left + right;
                    case '-': return left - right;
                    case '*': return left * right;
                    case '/': return right !== 0 ? left / right : NaN;
                    case '%': return left % right;
                    case '**': return Math.pow(left, right);
                    case '===': return left === right;
                    case '!==': return left !== right;
                    case '==': return left == right; // eslint-disable-line eqeqeq
                    case '!=': return left != right; // eslint-disable-line eqeqeq
                    case '>': return left > right;
                    case '<': return left < right;
                    case '>=': return left >= right;
                    case '<=': return left <= right;
                    case '&&': return left && right;
                    case '||': return left || right;
                    default: return undefined;
                }
            }

            case 'LogicalExpression': {
                const left = this.evalExpr(node.left);
                const right = this.evalExpr(node.right);
                if (node.operator === '&&') return left && right;
                if (node.operator === '||') return left || right;
                if (node.operator === '??') return left ?? right;
                return undefined;
            }

            case 'UnaryExpression': {
                const val = this.evalExpr(node.argument);
                switch (node.operator) {
                    case '-': return -val;
                    case '+': return +val;
                    case '!': return !val;
                    case 'typeof': return typeof val;
                    default: return undefined;
                }
            }

            case 'UpdateExpression': {
                const name = node.argument.name;
                if (node.operator === '++') {
                    if (node.prefix) { this.variables[name]++; return this.variables[name]; }
                    else { const old = this.variables[name]; this.variables[name]++; return old; }
                }
                if (node.operator === '--') {
                    if (node.prefix) { this.variables[name]--; return this.variables[name]; }
                    else { const old = this.variables[name]; this.variables[name]--; return old; }
                }
                return undefined;
            }

            case 'AssignmentExpression': {
                const val = this.evalExpr(node.right);
                const name = node.left.name || (node.left.property && node.left.property.name);
                if (node.left.type === 'Identifier') {
                    switch (node.operator) {
                        case '=': this.variables[name] = val; break;
                        case '+=': this.variables[name] += val; break;
                        case '-=': this.variables[name] -= val; break;
                        case '*=': this.variables[name] *= val; break;
                        case '/=': this.variables[name] /= val; break;
                        case '%=': this.variables[name] %= val; break;
                    }
                    return this.variables[name];
                }
                return val;
            }

            case 'CallExpression': {
                // Handle console.log
                if (
                    node.callee.type === 'MemberExpression' &&
                    node.callee.object.name === 'console' &&
                    node.callee.property.name === 'log'
                ) {
                    const args = node.arguments.map(a => this.evalExpr(a));
                    this.output.push(args.map(a => String(a)).join(' '));
                    return undefined;
                }
                // Handle custom input()
                if (node.callee.type === 'Identifier' && node.callee.name === 'input') {
                    const val = this.inputs[this.inputIndex] !== undefined
                        ? this.inputs[this.inputIndex++]
                        : '';
                    return isNaN(val) ? val : Number(val);
                }
                // Handle Math functions
                if (node.callee.type === 'MemberExpression' && node.callee.object.name === 'Math') {
                    const fn = node.callee.property.name;
                    const args = node.arguments.map(a => this.evalExpr(a));
                    if (typeof Math[fn] === 'function') return Math[fn](...args);
                }
                // Handle String/Number/Boolean constructors
                if (node.callee.type === 'Identifier') {
                    const args = node.arguments.map(a => this.evalExpr(a));
                    if (node.callee.name === 'String') return String(args[0]);
                    if (node.callee.name === 'Number') return Number(args[0]);
                    if (node.callee.name === 'Boolean') return Boolean(args[0]);
                    if (node.callee.name === 'parseInt') return parseInt(args[0], args[1]);
                    if (node.callee.name === 'parseFloat') return parseFloat(args[0]);
                    if (node.callee.name === 'isNaN') return isNaN(args[0]);
                    if (node.callee.name === 'isFinite') return isFinite(args[0]);
                }
                return undefined;
            }

            case 'ConditionalExpression': {
                const test = this.evalExpr(node.test);
                return test ? this.evalExpr(node.consequent) : this.evalExpr(node.alternate);
            }

            case 'ArrayExpression':
                return node.elements.map(e => e ? this.evalExpr(e) : undefined);

            case 'ObjectExpression': {
                const obj = {};
                for (const prop of node.properties) {
                    const key = prop.key.name || prop.key.value;
                    obj[key] = this.evalExpr(prop.value);
                }
                return obj;
            }

            case 'MemberExpression': {
                const obj = this.evalExpr(node.object);
                const prop = node.computed ? this.evalExpr(node.property) : node.property.name;
                if (obj !== null && obj !== undefined) return obj[prop];
                return undefined;
            }

            default:
                return undefined;
        }
    }

    // ──── Statement Executor ─────────────────────────────────────────────────
    execNode(node) {
        if (!node) return;

        switch (node.type) {
            case 'Program':
                for (const stmt of node.body) this.execNode(stmt);
                break;

            case 'BlockStatement':
                for (const stmt of node.body) this.execNode(stmt);
                break;

            case 'VariableDeclaration': {
                for (const decl of node.declarations) {
                    const name = decl.id.name;
                    const val = decl.init ? this.evalExpr(decl.init) : undefined;
                    this.variables[name] = val;
                    this.pushStep({
                        currentLine: this.getLine(node),
                        description: `Declare ${node.kind} ${name} = ${JSON.stringify(val)}`,
                        flowNodeActive: 'var-decl',
                    });
                }
                break;
            }

            case 'ExpressionStatement': {
                const expr = node.expression;
                const line = this.getLine(node);

                if (expr.type === 'AssignmentExpression') {
                    const name = expr.left.name;
                    const oldVal = this.variables[name];
                    const val = this.evalExpr(expr);
                    this.pushStep({
                        currentLine: line,
                        description: `Assign ${name} = ${JSON.stringify(val)} (was ${JSON.stringify(oldVal)})`,
                        flowNodeActive: 'assignment',
                    });
                } else if (
                    expr.type === 'CallExpression' &&
                    expr.callee.type === 'MemberExpression' &&
                    expr.callee.object.name === 'console' &&
                    expr.callee.property.name === 'log'
                ) {
                    const args = expr.arguments.map(a => this.evalExpr(a));
                    this.output.push(args.map(a => String(a)).join(' '));
                    this.pushStep({
                        currentLine: line,
                        description: `console.log(${args.map(a => JSON.stringify(a)).join(', ')})`,
                        flowNodeActive: 'output',
                    });
                } else if (expr.type === 'UpdateExpression') {
                    const name = expr.argument.name;
                    const oldVal = this.variables[name];
                    this.evalExpr(expr);
                    this.pushStep({
                        currentLine: line,
                        description: `Update ${name}: ${oldVal} → ${this.variables[name]}`,
                        flowNodeActive: 'assignment',
                    });
                } else {
                    this.evalExpr(expr);
                    this.pushStep({
                        currentLine: line,
                        description: 'Expression',
                        flowNodeActive: 'statement',
                    });
                }
                break;
            }

            case 'IfStatement': {
                const line = this.getLine(node);
                const condResult = Boolean(this.evalExpr(node.test));
                this.pushStep({
                    currentLine: line,
                    description: `if condition → ${condResult}`,
                    flowNodeActive: 'condition',
                    conditionResult: condResult,
                });
                if (condResult) {
                    this.execNode(node.consequent);
                } else if (node.alternate) {
                    this.execNode(node.alternate);
                }
                break;
            }

            case 'ForStatement': {
                // Init
                if (node.init) {
                    this.execNode(node.init);
                }

                let loopCount = 0;
                while (true) {
                    // Condition
                    if (node.test) {
                        const condResult = Boolean(this.evalExpr(node.test));
                        this.iterationCount = loopCount;
                        this.pushStep({
                            currentLine: this.getLine(node),
                            description: `for condition check → ${condResult} (iteration ${loopCount})`,
                            flowNodeActive: 'loop-condition',
                            conditionResult: condResult,
                            loopState: { iterationCount: loopCount, conditionResult: condResult },
                        });
                        if (!condResult) break;
                    }

                    // Body
                    this.execNode(node.body);

                    // Update
                    if (node.update) {
                        const name = node.update.argument && node.update.argument.name;
                        if (name) {
                            const oldVal = this.variables[name];
                            this.evalExpr(node.update);
                            this.pushStep({
                                currentLine: this.getLine(node),
                                description: `for update: ${name} ${node.update.operator} (${oldVal} → ${this.variables[name]})`,
                                flowNodeActive: 'loop-update',
                                loopState: { iterationCount: loopCount, conditionResult: true },
                            });
                        } else {
                            this.evalExpr(node.update);
                        }
                    }

                    loopCount++;
                    if (loopCount > MAX_ITERATIONS) {
                        this.pushError('Maximum iteration limit (1000) reached. Possible infinite loop detected.', this.getLine(node));
                        break;
                    }
                }
                break;
            }

            case 'WhileStatement': {
                let loopCount = 0;
                while (true) {
                    const condResult = Boolean(this.evalExpr(node.test));
                    this.iterationCount = loopCount;
                    this.pushStep({
                        currentLine: this.getLine(node),
                        description: `while condition → ${condResult} (iteration ${loopCount})`,
                        flowNodeActive: 'loop-condition',
                        conditionResult: condResult,
                        loopState: { iterationCount: loopCount, conditionResult: condResult },
                    });
                    if (!condResult) break;

                    this.execNode(node.body);

                    loopCount++;
                    if (loopCount > MAX_ITERATIONS) {
                        this.pushError('Maximum iteration limit (1000) reached. Possible infinite loop detected.', this.getLine(node));
                        break;
                    }
                }
                break;
            }

            case 'DoWhileStatement': {
                let loopCount = 0;
                do {
                    this.execNode(node.body);
                    const condResult = Boolean(this.evalExpr(node.test));
                    loopCount++;
                    this.pushStep({
                        currentLine: this.getLine(node),
                        description: `do-while condition → ${condResult} (iteration ${loopCount})`,
                        flowNodeActive: 'loop-condition',
                        conditionResult: condResult,
                        loopState: { iterationCount: loopCount, conditionResult: condResult },
                    });
                    if (!condResult) break;
                    if (loopCount > MAX_ITERATIONS) {
                        this.pushError('Maximum iteration limit (1000) reached.', this.getLine(node));
                        break;
                    }
                } while (true);
                break;
            }

            case 'FunctionDeclaration': {
                this.variables[node.id.name] = `[Function: ${node.id.name}]`;
                this.pushStep({
                    currentLine: this.getLine(node),
                    description: `Function declared: ${node.id.name}`,
                    flowNodeActive: 'func-decl',
                });
                break;
            }

            case 'ReturnStatement': {
                // Simplified: just note the return
                const val = node.argument ? this.evalExpr(node.argument) : undefined;
                this.pushStep({
                    currentLine: this.getLine(node),
                    description: `return ${JSON.stringify(val)}`,
                    flowNodeActive: 'return',
                });
                break;
            }

            case 'BreakStatement':
                this.pushStep({
                    currentLine: this.getLine(node),
                    description: 'break',
                    flowNodeActive: 'break',
                });
                break;

            case 'ContinueStatement':
                this.pushStep({
                    currentLine: this.getLine(node),
                    description: 'continue',
                    flowNodeActive: 'continue',
                });
                break;

            default:
                // Silently skip unsupported nodes
                break;
        }
    }

    run(ast) {
        // Push a start step
        this.pushStep({ currentLine: 0, description: 'Program started', flowNodeActive: 'start' });
        try {
            this.execNode(ast);
        } catch (err) {
            this.pushError(err.message, 0);
        }
        // Push an end step
        this.steps.push({
            currentLine: 0,
            description: 'Program finished',
            variables: JSON.parse(JSON.stringify(this.variables)),
            loopState: null,
            output: [...this.output],
            stackFrames: [...this.stackFrames],
            flowNodeActive: 'end',
            conditionResult: null,
            iterationCount: this.iterationCount,
            error: null,
        });
        return this.steps;
    }
}

module.exports = { Executor };
