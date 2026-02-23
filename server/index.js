const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const cors = require('cors');
const executeRouter = require('./routes/execute');
const { setupWebSocket } = require('./websocket/stream');

const app = express();
const PORT = 3001;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '1mb' }));

app.use('/api', executeRouter);

app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

setupWebSocket(wss);

server.listen(PORT, () => {
    console.log(`\n🚀 CodeFlow Backend running on http://localhost:${PORT}`);
    console.log(`🔌 WebSocket server on ws://localhost:${PORT}/ws\n`);
});
