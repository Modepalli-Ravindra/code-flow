/**
 * Python Executor — runs Python code in a subprocess using sys.settrace()
 * Returns the same step format as the JS executor.
 */
const { spawn } = require('child_process');

const TRACER_SCRIPT = (code, inputsJson) => `
import sys, json, io

steps = []
inputs_list = ${inputsJson}
input_index = [0]

def custom_input(prompt=''):
    idx = input_index[0]
    if idx < len(inputs_list):
        val = inputs_list[idx]
        input_index[0] += 1
        return str(val)
    return ''

def safe_val(v):
    if isinstance(v, (int, float, str, bool, type(None))):
        return v
    if isinstance(v, (list, tuple)):
        return [safe_val(x) for x in v[:10]]
    if isinstance(v, dict):
        return {str(k): safe_val(vv) for k, vv in list(v.items())[:10]}
    return str(v)

def safe_vars(local):
    skip = {'__builtins__', '__name__', '__doc__', '__package__',
            '__loader__', '__spec__', '__annotations__', 'tracer_fn',
            'steps', 'inputs_list', 'input_index', 'custom_input',
            'safe_val', 'safe_vars', 'captured'}
    return {k: safe_val(v) for k, v in local.items() if k not in skip}

captured = io.StringIO()
original_stdout = sys.stdout
sys.stdout = captured

step_count = [0]

def tracer_fn(frame, event, arg):
    if frame.f_code.co_filename != '<string>':
        return tracer_fn
    if step_count[0] >= 500:
        return None
    step_count[0] += 1

    fna = 'statement'
    description = ''
    condition_result = None
    error = None

    if event == 'call':
        fna = 'func-decl' if frame.f_code.co_name != '<module>' else 'start'
        description = f'Call: {frame.f_code.co_name}()'
    elif event == 'line':
        fna = 'statement'
        description = f'Line {frame.f_lineno}'
    elif event == 'return':
        fna = 'return'
        description = f'Return: {repr(arg)}'
    elif event == 'exception':
        fna = 'error'
        error = str(arg[1]) if arg else 'Unknown error'
        description = error

    steps.append({
        'currentLine': frame.f_lineno,
        'variables': safe_vars(frame.f_locals),
        'flowNodeActive': fna,
        'description': description,
        'conditionResult': condition_result,
        'output': '',
        'error': error,
        'stackFrames': [frame.f_code.co_name],
        'loopState': None,
        'iterationCount': 0,
    })
    return tracer_fn

try:
    sys.settrace(tracer_fn)
    exec(compile(${JSON.stringify(code)}, '<string>', 'exec'), {'input': custom_input})
    sys.settrace(None)
except Exception as e:
    sys.settrace(None)
    output_so_far = captured.getvalue()
    sys.stdout = original_stdout
    steps.append({
        'currentLine': 0,
        'variables': {},
        'flowNodeActive': 'error',
        'description': str(e),
        'conditionResult': None,
        'output': output_so_far,
        'error': str(e),
        'stackFrames': ['<module>'],
        'loopState': None,
        'iterationCount': 0,
    })
    print(json.dumps({'steps': steps, 'error': str(e)}))
    sys.exit(0)
finally:
    sys.stdout = original_stdout

output_text = captured.getvalue()
if steps:
    steps[-1]['output'] = output_text

print(json.dumps({'steps': steps}))
`;

function enrichPythonSteps(steps, code) {
    const lines = code.split('\n');
    // Heuristic enrichment: detect loop/condition lines
    for (const step of steps) {
        const lineIdx = step.currentLine - 1;
        const lineText = (lines[lineIdx] || '').trim();

        if (/^(for |while )/.test(lineText)) {
            step.flowNodeActive = 'loop-condition';
            step.description = `Loop: ${lineText}`;
        } else if (/^if |^elif /.test(lineText)) {
            step.flowNodeActive = 'condition';
            step.description = `Condition: ${lineText}`;
        } else if (/^print\s*\(/.test(lineText)) {
            step.flowNodeActive = 'output';
            step.description = `Print output`;
        } else if (/^\w+\s*=\s*/.test(lineText) && !/^(for|if|while|def|class)/.test(lineText)) {
            step.flowNodeActive = 'assignment';
            step.description = lineText;
        } else if (/^def /.test(lineText)) {
            step.flowNodeActive = 'func-decl';
            step.description = lineText;
        } else if (/^return /.test(lineText)) {
            step.flowNodeActive = 'return';
            step.description = lineText;
        }
    }
    return steps;
}

function executePython(code, inputs = []) {
    return new Promise((resolve, reject) => {
        const inputsJson = JSON.stringify(inputs.map(String));
        const script = TRACER_SCRIPT(code, inputsJson);

        // Try python3 first, fallback to python
        const tryPython = (cmd) => {
            return new Promise((res, rej) => {
                const proc = spawn(cmd, ['-c', script], { timeout: 10000 });
                let stdout = '';
                let stderr = '';
                proc.stdout.on('data', d => { stdout += d; });
                proc.stderr.on('data', d => { stderr += d; });
                proc.on('close', (code) => {
                    if (code === 0 || stdout.trim()) {
                        try {
                            const data = JSON.parse(stdout.trim());
                            data.steps = enrichPythonSteps(data.steps || [], code);
                            res(data);
                        } catch {
                            rej(new Error('Failed to parse Python output: ' + stderr));
                        }
                    } else {
                        rej(new Error('Python process failed: ' + stderr));
                    }
                });
                proc.on('error', rej);
            });
        };

        tryPython('python3')
            .catch(() => tryPython('python'))
            .then(resolve)
            .catch(err => resolve({
                steps: [{
                    currentLine: 0, variables: {}, flowNodeActive: 'error',
                    description: 'Python not found. Please install Python 3.',
                    conditionResult: null, output: '',
                    error: 'Python interpreter not found. Install Python 3 from python.org',
                    stackFrames: [], loopState: null, iterationCount: 0,
                }]
            }));
    });
}

module.exports = { executePython };
