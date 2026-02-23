const { executeCode } = require('../engine/stepGenerator');

function setupWebSocket(wss) {
    wss.on('connection', (ws) => {
        console.log('Client connected via WebSocket');

        let steps = [];
        let flowGraph = { nodes: [], edges: [] };
        let currentIndex = 0;
        let autoPlayTimer = null;
        let isPaused = false;

        function sendStep(index) {
            if (index < steps.length) {
                ws.send(JSON.stringify({
                    type: 'STEP',
                    step: steps[index],
                    stepIndex: index,
                    totalSteps: steps.length,
                    flowGraph,
                }));
            }
        }

        function sendMessage(type, payload = {}) {
            ws.send(JSON.stringify({ type, ...payload }));
        }

        function startAutoPlay(speed = 600) {
            if (autoPlayTimer) clearInterval(autoPlayTimer);
            autoPlayTimer = setInterval(() => {
                if (isPaused || currentIndex >= steps.length) {
                    clearInterval(autoPlayTimer);
                    autoPlayTimer = null;
                    if (currentIndex >= steps.length) {
                        sendMessage('DONE', { totalSteps: steps.length });
                    }
                    return;
                }
                sendStep(currentIndex);
                currentIndex++;
            }, speed);
        }

        ws.on('message', async (data) => {
            let msg;
            try {
                msg = JSON.parse(data.toString());
            } catch {
                return;
            }

            switch (msg.type) {
                case 'RUN': {
                    if (autoPlayTimer) { clearInterval(autoPlayTimer); autoPlayTimer = null; }
                    const code = msg.code || '';
                    const inputs = msg.inputs || [];
                    const speed = msg.speed || 600;
                    const language = msg.language || 'javascript';

                    if (!code.trim()) {
                        sendMessage('ERROR', { error: 'No code provided.' });
                        return;
                    }
                    if (code.length > 50000) {
                        sendMessage('ERROR', { error: 'Code too large (max 50KB).' });
                        return;
                    }

                    console.log(`Executing ${language} code...`);
                    try {
                        const result = await executeCode(code, inputs, language);
                        steps = result.steps || [];
                        flowGraph = result.flowGraph || { nodes: [], edges: [] };
                        currentIndex = 0;
                        isPaused = false;

                        sendMessage('READY', {
                            totalSteps: steps.length,
                            flowGraph,
                            isStatic: result.isStatic || false,
                            note: result.note || '',
                        });
                        startAutoPlay(speed);
                    } catch (err) {
                        sendMessage('ERROR', { error: err.message });
                    }
                    break;
                }

                case 'STEP_FORWARD': {
                    if (autoPlayTimer) { clearInterval(autoPlayTimer); autoPlayTimer = null; }
                    if (currentIndex < steps.length) {
                        sendStep(currentIndex);
                        currentIndex++;
                    } else {
                        sendMessage('DONE', { totalSteps: steps.length });
                    }
                    break;
                }

                case 'STEP_BACK': {
                    if (autoPlayTimer) { clearInterval(autoPlayTimer); autoPlayTimer = null; }
                    if (currentIndex > 1) {
                        currentIndex -= 2;
                        sendStep(currentIndex);
                        currentIndex++;
                    }
                    break;
                }

                case 'JUMP': {
                    const idx = Math.max(0, Math.min(msg.index, steps.length - 1));
                    currentIndex = idx;
                    sendStep(currentIndex);
                    currentIndex++;
                    break;
                }

                case 'PAUSE': {
                    isPaused = true;
                    if (autoPlayTimer) { clearInterval(autoPlayTimer); autoPlayTimer = null; }
                    sendMessage('PAUSED', { stepIndex: currentIndex });
                    break;
                }

                case 'RESUME': {
                    isPaused = false;
                    startAutoPlay(msg.speed || 600);
                    break;
                }

                case 'RESET': {
                    if (autoPlayTimer) { clearInterval(autoPlayTimer); autoPlayTimer = null; }
                    steps = [];
                    flowGraph = { nodes: [], edges: [] };
                    currentIndex = 0;
                    isPaused = false;
                    sendMessage('RESET_OK');
                    break;
                }
            }
        });

        ws.on('close', () => {
            console.log('Client disconnected');
            if (autoPlayTimer) clearInterval(autoPlayTimer);
        });

        ws.on('error', (err) => {
            console.error('WS error:', err.message);
        });
    });
}

module.exports = { setupWebSocket };
