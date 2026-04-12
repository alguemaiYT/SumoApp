const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildBridgeConfig,
  sanitizeOutgoingCommand,
  nextReconnectDelay,
} = require('./bluetoothClient.js');

test('buildBridgeConfig applies defaults and preserves explicit values', () => {
  const config = buildBridgeConfig({ pollIntervalMs: 600, reconnectBaseMs: 400 });

  assert.equal(config.pollIntervalMs, 600);
  assert.equal(config.reconnectBaseMs, 400);
  assert.equal(config.reconnectMaxMs, 8000);
  assert.equal(config.deviceName, 'Madinboo_BT');
});

test('sanitizeOutgoingCommand enforces protocol frame', () => {
  assert.equal(sanitizeOutgoingCommand('EST,2*'), 'EST,2*');
  assert.equal(sanitizeOutgoingCommand('VR,220'), 'VR,220*');
});

test('sanitizeOutgoingCommand rejects malformed payload', () => {
  assert.throws(() => sanitizeOutgoingCommand('EST*'), /must include command and value/);
});

test('nextReconnectDelay increases and caps at max delay', () => {
  assert.equal(nextReconnectDelay(0, 250, 8000), 250);
  assert.equal(nextReconnectDelay(4, 250, 8000), 4000);
  assert.equal(nextReconnectDelay(8, 250, 8000), 8000);
});
