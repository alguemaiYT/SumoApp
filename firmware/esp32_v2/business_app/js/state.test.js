const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createInitialState,
  appendSessionEvent,
  saveProfile,
  loadProfiles,
  exportLogCsv,
} = require('./state.js');

function createMemoryStorage() {
  const map = new Map();
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, value);
    },
  };
}

test('createInitialState returns expected default shape', () => {
  const state = createInitialState();
  assert.equal(state.connectionStatus, 'disconnected');
  assert.equal(state.log.length, 0);
  assert.equal(state.config.EST, 1);
});

test('appendSessionEvent appends timestamped log entry', () => {
  const state = createInitialState();
  appendSessionEvent(state, 'Connected');

  assert.equal(state.log.length, 1);
  assert.equal(state.log[0].message, 'Connected');
  assert.ok(state.log[0].timestamp);
});

test('saveProfile and loadProfiles persist profile data', () => {
  const storage = createMemoryStorage();

  saveProfile(storage, 'Aggressive', { EST: 2, VR: 230, VG: 220, HBE: 1, LIP: 0, LIE: -1 });
  const profiles = loadProfiles(storage);

  assert.equal(profiles.length, 1);
  assert.equal(profiles[0].name, 'Aggressive');
  assert.equal(profiles[0].config.VR, 230);
});

test('exportLogCsv outputs stable header and rows', () => {
  const csv = exportLogCsv([
    { timestamp: '2026-04-12T10:00:00.000Z', level: 'info', message: 'Connected' },
    { timestamp: '2026-04-12T10:01:00.000Z', level: 'warning', message: 'Battery low' },
  ]);

  const lines = csv.trim().split('\n');
  assert.equal(lines[0], 'timestamp,level,message');
  assert.equal(lines.length, 3);
});
