const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildCommand,
  parseTelemetry,
  TELEMETRY_FIELDS,
} = require('./protocol.js');

test('buildCommand formats EST command with value', () => {
  assert.equal(buildCommand('EST', 3), 'EST,3*');
});

test('buildCommand rejects unknown commands', () => {
  assert.throws(() => buildCommand('ABC', 1), /Unknown command/);
});

test('buildCommand validates strategy range', () => {
  assert.throws(() => buildCommand('EST', 9), /out of range/);
});

test('buildCommand validates speed range', () => {
  assert.throws(() => buildCommand('VR', 999), /out of range/);
});

test('parseTelemetry parses all expected fields', () => {
  const payload = '200|180|1|0|-1|12.4|1|0|1|0|356|349';
  const parsed = parseTelemetry(payload);

  assert.deepEqual(Object.keys(parsed), TELEMETRY_FIELDS);
  assert.equal(parsed.velocreta, 200);
  assert.equal(parsed.HBEvasao, 1);
  assert.equal(parsed.limiarEmpurrado, -1);
  assert.equal(parsed.Vbat, 12.4);
  assert.equal(parsed.sensorLD, 356);
  assert.equal(parsed.sensorLE, 349);
});

test('parseTelemetry rejects malformed payload length', () => {
  assert.throws(() => parseTelemetry('1|2|3'), /Expected 12 telemetry fields/);
});

test('parseTelemetry rejects non numeric values', () => {
  const payload = '200|180|1|0|-1|not-a-number|1|0|1|0|356|349';
  assert.throws(() => parseTelemetry(payload), /Invalid numeric value/);
});
