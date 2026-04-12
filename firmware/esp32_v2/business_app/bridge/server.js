'use strict';

const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { URL } = require('node:url');
const { WebSocketServer, WebSocket } = require('ws');

const { parseTelemetry } = require('../js/protocol.js');
const { BluetoothBridgeClient, buildBridgeConfig, sanitizeOutgoingCommand } = require('./bluetoothClient.js');

function readConfigFromFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  if (!raw.trim()) {
    return {};
  }
  return JSON.parse(raw);
}

function loadBridgeConfig() {
  const configPath = process.env.BRIDGE_CONFIG_PATH || path.join(__dirname, 'config.json');
  const fileConfig = readConfigFromFile(configPath);
  const envPort = process.env.BRIDGE_PORT ? Number(process.env.BRIDGE_PORT) : undefined;

  return {
    ...buildBridgeConfig(fileConfig),
    httpPort: Number(fileConfig.httpPort || envPort || 8787),
  };
}

function createJsonResponder(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');

  return (statusCode, payload) => {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(payload));
  };
}

async function parseJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString('utf8').trim();
  if (!text) return {};
  return JSON.parse(text);
}

function createBridgeServer(config = loadBridgeConfig()) {
  const client = new BluetoothBridgeClient(config);
  let latestTelemetry = null;
  let latestTelemetryAt = null;

  const server = http.createServer(async (req, res) => {
    const sendJson = createJsonResponder(res);

    if (req.method === 'OPTIONS') {
      sendJson(204, {});
      return;
    }

    const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    try {
      if (req.method === 'GET' && requestUrl.pathname === '/health') {
        sendJson(200, {
          ok: true,
          connectionState: client.connectionState,
          latestTelemetryAt,
        });
        return;
      }

      if (req.method === 'GET' && requestUrl.pathname === '/telemetry/latest') {
        sendJson(200, {
          telemetry: latestTelemetry,
          updatedAt: latestTelemetryAt,
        });
        return;
      }

      if (req.method === 'POST' && requestUrl.pathname === '/connect') {
        await client.connect();
        client.startPolling();
        sendJson(200, { ok: true, connectionState: client.connectionState });
        return;
      }

      if (req.method === 'POST' && requestUrl.pathname === '/command') {
        const body = await parseJsonBody(req);
        const command = sanitizeOutgoingCommand(body.command);
        const writeResult = await client.sendCommand(command);
        sendJson(200, { ok: true, result: writeResult });
        return;
      }

      sendJson(404, { error: 'Not found' });
    } catch (error) {
      sendJson(400, { error: error.message });
    }
  });

  const wss = new WebSocketServer({ server });

  function broadcast(type, payload) {
    const message = JSON.stringify({ type, payload, timestamp: new Date().toISOString() });
    for (const socket of wss.clients) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(message);
      }
    }
  }

  client.on('status', (status) => {
    broadcast('status', status);
  });

  client.on('line', (line) => {
    try {
      const telemetry = parseTelemetry(line);
      latestTelemetry = telemetry;
      latestTelemetryAt = new Date().toISOString();
      broadcast('telemetry', telemetry);
    } catch (error) {
      broadcast('raw', { line });
    }
  });

  client.on('error', (error) => {
    broadcast('error', { message: error.message });
  });

  return { server, client, wss, config };
}

async function start() {
  const bridge = createBridgeServer();

  bridge.server.listen(bridge.config.httpPort, async () => {
    // eslint-disable-next-line no-console
    console.log(`Robot bridge listening on http://localhost:${bridge.config.httpPort}`);
  });

  try {
    await bridge.client.connect();
    bridge.client.startPolling();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Initial Bluetooth connect failed: ${error.message}`);
  }

  process.on('SIGINT', () => {
    bridge.client.close();
    bridge.wss.close();
    bridge.server.close(() => process.exit(0));
  });
}

if (require.main === module) {
  start().catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  createBridgeServer,
  loadBridgeConfig,
};
