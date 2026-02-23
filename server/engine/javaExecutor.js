/**
 * Java Executor — runs Java code in a subprocess.
 * Uses Java 11+ single-file source launcher (java FileName.java).
 * Fallback: javac compile + java run.
 * Returns actual stdout output + static flow steps (from genericExecutor).
 */
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { executeGeneric } = require('./genericExecutor');

function extractClassName(code) {
    const m = code.match(/public\s+class\s+(\w+)/);
    return m ? m[1] : 'Main';
}

function runProcess(cmd, args, options) {
    return new Promise((resolve) => {
        const proc = spawn(cmd, args, { ...options, timeout: 15000 });
        let stdout = '';
        let stderr = '';
        proc.stdout.on('data', d => { stdout += d; });
        proc.stderr.on('data', d => { stderr += d; });
        proc.on('close', code => resolve({ stdout, stderr, exitCode: code }));
        proc.on('error', err => resolve({ stdout, stderr: err.message, exitCode: -1 }));
        // stdin is handled by caller
        return proc;
    });
}

function runProcessWithInput(cmd, args, cwd, inputs) {
    return new Promise((resolve) => {
        const proc = spawn(cmd, args, { cwd, timeout: 15000 });
        let stdout = '';
        let stderr = '';
        proc.stdout.on('data', d => { stdout += d; });
        proc.stderr.on('data', d => { stderr += d; });
        proc.on('close', code => resolve({ stdout, stderr, exitCode: code }));
        proc.on('error', err => resolve({ stdout, stderr: err.message, exitCode: -1 }));
        // Feed all inputs
        if (inputs.length > 0) {
            proc.stdin.write(inputs.join('\n') + '\n');
        }
        proc.stdin.end();
    });
}

async function executeJava(code, inputs = []) {
    const className = extractClassName(code);
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codeflow-java-'));
    const javaFile = path.join(tmpDir, `${className}.java`);

    try {
        fs.writeFileSync(javaFile, code, 'utf8');

        // ── Attempt 1: Java 11+ single-file source launcher ─────────────────────
        let result = await runProcessWithInput('java', [javaFile], tmpDir, inputs);

        if (result.exitCode !== 0 && result.stderr.includes('error:')) {
            // ── Attempt 2: javac compile then run ────────────────────────────────
            const compile = await runProcessWithInput('javac', [javaFile], tmpDir, []);
            if (compile.exitCode !== 0) {
                throw new Error('Compile error:\n' + compile.stderr);
            }
            result = await runProcessWithInput('java', ['-cp', tmpDir, className], tmpDir, inputs);
        }

        // Build static flow steps (code structure)
        const staticResult = executeGeneric(code, 'java');
        const steps = staticResult.steps;

        // Attach actual output to the last step
        const outputLines = result.stdout ? result.stdout.split('\n').filter(l => l !== '') : [];
        if (steps.length > 0) {
            steps[steps.length - 1].output = outputLines;
        }
        // Attach error to all steps if there was a stderr
        if (result.stderr && result.exitCode !== 0) {
            steps.push({
                currentLine: 0, variables: {}, flowNodeActive: 'error',
                description: result.stderr.split('\n')[0] || 'Runtime error',
                conditionResult: null, output: outputLines,
                error: result.stderr, stackFrames: ['main'], loopState: null, iterationCount: 0,
            });
        }

        return { steps, output: outputLines, error: result.exitCode !== 0 ? result.stderr : null };

    } catch (err) {
        const staticResult = executeGeneric(code, 'java');
        return {
            steps: [
                ...staticResult.steps.slice(0, -1),
                {
                    currentLine: 0, variables: {}, flowNodeActive: 'error',
                    description: err.message.split('\n')[0],
                    conditionResult: null, output: [],
                    error: err.message, stackFrames: ['main'], loopState: null, iterationCount: 0,
                },
            ],
            output: [],
            error: err.message,
        };
    } finally {
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { }
    }
}

// Detect that Java code needs user input (Scanner, BufferedReader, etc.)
function javaUsesInput(code) {
    return /Scanner|BufferedReader|System\.in|nextInt\(\)|nextLine\(\)|nextDouble\(\)|next\(\)/.test(code);
}

// Count how many input calls exist (to pre-size the modal)
function countJavaInputCalls(code) {
    const matches = code.match(/\.(nextInt|nextLine|nextDouble|nextFloat|nextLong|next)\(\)/g);
    return matches ? matches.length : 1;
}

module.exports = { executeJava, javaUsesInput, countJavaInputCalls };
