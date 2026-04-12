const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildConfigCommandBatch,
  toConfigFromInputs,
  createCommandQueue,
  reduceEmergencyLockout,
  deriveSafetySignals,
} = require('./app.js');

test('buildConfigCommandBatch creates all required setup commands', () => {
  const batch = buildConfigCommandBatch({
    EST: 2,
    VR: 210,
    VG: 180,
    HBE: 1,
    LIP: 0,
    LIE: -1,
  });

  assert.deepEqual(batch, [
    'EST,2*',
    'VR,210*',
    'VG,180*',
    'HBE,1*',
    'LIP,0*',
    'LIE,-1*',
  ]);
});

test('toConfigFromInputs converts string input map to numeric config', () => {
  const config = toConfigFromInputs({
    EST: '3',
    VR: '200',
    VG: '170',
    HBE: '0',
    LIP: '1',
    LIE: '-2',
  });

  assert.deepEqual(config, {
    EST: 3,
    VR: 200,
    VG: 170,
    HBE: 0,
    LIP: 1,
    LIE: -2,
  });
});

test('createCommandQueue prevents duplicate consecutive commands', () => {
  const queue = createCommandQueue();

  assert.equal(queue.enqueue('VR,200*'), true);
  assert.equal(queue.enqueue('VR,200*'), false);
  assert.equal(queue.enqueue('VG,170*'), true);
  assert.deepEqual(queue.flush(), ['VR,200*', 'VG,170*']);
});

test('reduceEmergencyLockout toggles lock state on stop and rearm', () => {
  assert.equal(reduceEmergencyLockout(false, 'stop'), true);
  assert.equal(reduceEmergencyLockout(true, 'rearm'), false);
  assert.equal(reduceEmergencyLockout(false, 'noop'), false);
});

test('deriveSafetySignals evaluates battery and line-edge risk', () => {
  const result = deriveSafetySignals({
    Vbat: 10.7,
    sensorLD: 180,
    sensorLE: 320,
  });

  assert.equal(result.batteryLevel, 'danger');
  assert.equal(result.edgeRisk, true);
});
