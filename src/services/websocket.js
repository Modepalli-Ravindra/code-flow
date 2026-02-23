import useExecutionStore from '../store/executionStore';

let wsInstance = null;

function getWsUrl() {
    // If a custom URL is provided via ENV (e.g. for production), use it
    if (import.meta.env.VITE_WS_URL) {
        return import.meta.env.VITE_WS_URL;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // In dev, Vite proxies /ws to backend on localhost:3001
    // In production (Vercel), this typically points back to the frontend domain,
    // which fails for WebSockets unless using an external backend.
    return `${protocol}//${window.location.host}/ws`;
}

export function connectWS() {
    if (wsInstance && (wsInstance.readyState === WebSocket.OPEN || wsInstance.readyState === WebSocket.CONNECTING)) {
        return wsInstance;
    }

    try {
        const url = getWsUrl();
        wsInstance = new WebSocket(url);

        wsInstance.onopen = () => {
            console.log('✅ WebSocket connected to:', url);
            useExecutionStore.getState().setConnected(true);
        };

        wsInstance.onclose = (event) => {
            console.log(`❌ WebSocket disconnected (Code: ${event.code})`);
            useExecutionStore.getState().setConnected(false);
            useExecutionStore.getState().setRunning(false);
            wsInstance = null;
        };

        wsInstance.onerror = (err) => {
            // Log less aggressively to avoid console noise in production
            console.warn('WS Connection Issue: Ensure your backend server is running and reachable.');
        };

        wsInstance.onmessage = (event) => {
            let msg;
            try { msg = JSON.parse(event.data); } catch { return; }

            const store = useExecutionStore.getState();

            switch (msg.type) {
                case 'READY':
                    store.setReady(msg.totalSteps, msg.flowGraph);
                    break;
                case 'STEP':
                    store.applyStep(msg.step, msg.stepIndex, msg.totalSteps, msg.flowGraph);
                    break;
                case 'DONE':
                    store.setRunning(false);
                    store.setPaused(false);
                    break;
                case 'PAUSED':
                    store.setPaused(true);
                    break;
                case 'ERROR':
                    store.reset();
                    useExecutionStore.setState({ error: msg.error });
                    break;
                case 'RESET_OK':
                    store.reset();
                    break;
                default:
                    break;
            }
        };
    } catch (e) {

        return wsInstance;
    }

    export function sendMessage(payload) {
        if (!wsInstance || wsInstance.readyState !== WebSocket.OPEN) {
            console.warn('WS not connected, reconnecting...');
            connectWS();
            setTimeout(() => {
                if (wsInstance && wsInstance.readyState === WebSocket.OPEN) {
                    wsInstance.send(JSON.stringify(payload));
                }
            }, 500);
            return;
        }
        wsInstance.send(JSON.stringify(payload));
    }

    export function runCode(code, inputs = [], speed = 600, language = 'javascript') {
        connectWS();
        setTimeout(() => {
            sendMessage({ type: 'RUN', code, inputs, speed, language });
        }, wsInstance?.readyState === WebSocket.OPEN ? 0 : 600);
    }

    export function stepForward() { sendMessage({ type: 'STEP_FORWARD' }); }
    export function stepBack() { sendMessage({ type: 'STEP_BACK' }); }
    export function pauseExecution() { sendMessage({ type: 'PAUSE' }); }
    export function resumeExecution(speed) { sendMessage({ type: 'RESUME', speed }); }
    export function resetExecution() { sendMessage({ type: 'RESET' }); }
    export function jumpToStep(index) { sendMessage({ type: 'JUMP', index }); }
