const test = require('node:test');
const assert = require('node:assert/strict');

const {
  STRATEGIES,
  ACTION_BUTTONS,
  renderStrategyOptions,
  getBatteryLevel,
} = require('./ui.js');

test('renderStrategyOptions renders all firmware strategies', () => {
  const html = renderStrategyOptions(2);

  assert.equal(STRATEGIES.length, 7);
  assert.equal((html.match(/<option/g) || []).length, 7);
  assert.match(html, /<option value="2" selected>Cacador<\/option>/);
});

test('action buttons expose required control actions', () => {
  assert.deepEqual(ACTION_BUTTONS, ['connect', 'sync', 'apply', 'stop']);
});

test('getBatteryLevel returns danger under 10.8V', () => {
  assert.equal(getBatteryLevel(10.7), 'danger');
});

test('getBatteryLevel returns warning between 10.8V and 11.3V', () => {
  assert.equal(getBatteryLevel(11.0), 'warning');
});

test('getBatteryLevel returns healthy above 11.3V', () => {
  assert.equal(getBatteryLevel(12.2), 'healthy');
});
