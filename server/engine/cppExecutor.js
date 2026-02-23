/**
 * C / C++ Executor — compiles with gcc/g++ and runs, piping stdin inputs.
 * Falls back to static flow analysis if compiler not available.
 */
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { executeGeneric } = require('./genericExecutor');

function runWithInput(cmd, args, cwd, inputs) {
    return new Promise((resolve) => {
        const proc = spawn(cmd, args, { cwd, timeout: 15000 });
        let stdout = '';
        let stderr = '';
        proc.stdout.on('data', d => { stdout += d; });
        proc.stderr.on('data', d => { stderr += d; });
        proc.on('close', code => resolve({ stdout, stderr, exitCode: code }));
        proc.on('error', err => resolve({ stdout, stderr: err.message, exitCode: -1 }));
        if (inputs.length > 0) proc.stdin.write(inputs.join('\n') + '\n');
        proc.stdin.end();
    });
}

async function executeCpp(code, inputs = [], language = 'cpp') {
    const ext = language === 'c' ? '.c' : '.cpp';
    const compiler = language === 'c' ? 'gcc' : 'g++';
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codeflow-cpp-'));
    const srcFile = path.join(tmpDir, `main${ext}`);
    const outFile = path.join(tmpDir, 'main.out');

    try {
        fs.writeFileSync(srcFile, code, 'utf8');

        // Compile
        const compileResult = await runWithInput(compiler, [srcFile, '-o', outFile, '-std=c++17'], tmpDir, []);
        if (compileResult.exitCode !== 0) {
            throw new Error('Compile error:\n' + compileResult.stderr);
        }

        // Run
        const runResult = await runWithInput(outFile, [], tmpDir, inputs);

        const staticResult = executeGeneric(code, language);
        const steps = staticResult.steps;
        const outputLines = runResult.stdout ? runResult.stdout.split('\n').filter(l => l !== '') : [];
        if (steps.length > 0) steps[steps.length - 1].output = outputLines;

        return { steps, output: outputLines, error: runResult.exitCode !== 0 ? runResult.stderr : null };

    } catch (err) {
        const staticResult = executeGeneric(code, language);
        return {
            steps: [
                ...staticResult.steps.slice(0, -1),
                {
                    currentLine: 0, variables: {}, flowNodeActive: 'error',
                    description: err.message.split('\n')[0],
                    conditionResult: null, output: [], error: err.message,
                    stackFrames: ['main'], loopState: null, iterationCount: 0,
                },
            ],
            output: [],
            error: err.message,
        };
    } finally {
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { }
    }
}

// Detect if C/C++ code uses scanf, cin, gets, etc.
function cppUsesInput(code) {
    return /scanf|cin\s*>>|gets\(|fgets\(|getline\(/.test(code);
}

module.exports = { executeCpp, cppUsesInput };
