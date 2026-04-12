'use strict';

const ProtocolRef = typeof window !== 'undefined' && window.Protocol
  ? window.Protocol
  : require('./protocol.js');

const UIRef = typeof window !== 'undefined' && window.UI
  ? window.UI
  : require('./ui.js');

const StateRef = typeof window !== 'undefined' && window.AppState
  ? window.AppState
  : require('./state.js');

function toConfigFromInputs(values) {
  return {
    EST: Number(values.EST),
    VR: Number(values.VR),
    VG: Number(values.VG),
    HBE: Number(values.HBE),
    LIP: Number(values.LIP),
    LIE: Number(values.LIE),
  };
}

function buildConfigCommandBatch(config) {
  return [
    ProtocolRef.buildCommand('EST', config.EST),
    ProtocolRef.buildCommand('VR', config.VR),
    ProtocolRef.buildCommand('VG', config.VG),
    ProtocolRef.buildCommand('HBE', config.HBE),
    ProtocolRef.buildCommand('LIP', config.LIP),
    ProtocolRef.buildCommand('LIE', config.LIE),
  ];
}

function createCommandQueue(dedupeWindowMs = 1500) {
  const pending = [];
  const recentlyQueued = new Map();

  return {
    enqueue(command) {
      const now = Date.now();
      const previous = recentlyQueued.get(command);
      if (previous && now - previous < dedupeWindowMs) {
        return false;
      }
      recentlyQueued.set(command, now);
      pending.push(command);
      return true;
    },
    flush() {
      return pending.splice(0, pending.length);
    },
    size() {
      return pending.length;
    },
  };
}

function reduceEmergencyLockout(isLocked, action) {
  if (action === 'stop') return true;
  if (action === 'rearm') return false;
  return Boolean(isLocked);
}

function deriveSafetySignals(telemetry) {
  if (!telemetry) {
    return {
      batteryLevel: 'unknown',
      edgeRisk: false,
    };
  }

  const sensorLD = Number(telemetry.sensorLD);
  const sensorLE = Number(telemetry.sensorLE);

  return {
    batteryLevel: UIRef.getBatteryLevel(telemetry.Vbat),
    edgeRisk: Number.isFinite(sensorLD) && Number.isFinite(sensorLE)
      ? sensorLD <= 200 || sensorLE <= 200
      : false,
  };
}

function createHttpTransport(baseUrl = 'http://localhost:8787') {
  const root = baseUrl.replace(/\/+$/, '');

  async function postJson(pathname, payload) {
    const response = await fetch(`${root}${pathname}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${response.status}`);
    }
    return response.json();
  }

  return {
    async connect() {
      return postJson('/connect', {});
    },
    async sendCommand(command) {
      return postJson('/command', { command });
    },
    async requestTelemetry() {
      const response = await fetch(`${root}/telemetry/latest`);
      if (!response.ok) {
        return null;
      }
      const body = await response.json().catch(() => null);
      return body?.telemetry || null;
    },
  };
}

function getElements(doc) {
  return {
    status: doc.getElementById('connection-status'),
    strategy: doc.getElementById('strategy-select'),
    inputVR: doc.getElementById('input-vr'),
    inputVG: doc.getElementById('input-vg'),
    inputHBE: doc.getElementById('input-hbe'),
    inputLIP: doc.getElementById('input-lip'),
    inputLIE: doc.getElementById('input-lie'),
    profileName: doc.getElementById('profile-name'),
    profileSelect: doc.getElementById('profile-select'),
    btnConnect: doc.getElementById('btn-connect'),
    btnSync: doc.getElementById('btn-sync'),
    btnApply: doc.getElementById('btn-apply'),
    btnStop: doc.getElementById('btn-stop'),
    btnStopSecondary: doc.getElementById('btn-stop-secondary'),
    btnRearm: doc.getElementById('btn-rearm'),
    btnSaveProfile: doc.getElementById('btn-save-profile'),
    btnLoadProfile: doc.getElementById('btn-load-profile'),
    btnExportLog: doc.getElementById('btn-export-log'),
    edgeCard: doc.getElementById('edge-sensors-card'),
    batteryValue: doc.getElementById('telemetry-Vbat'),
    logList: doc.getElementById('session-log'),
  };
}

function setStatus(elements, statusText) {
  elements.status.textContent = statusText;
}

function getConfigFromDom(elements) {
  return toConfigFromInputs({
    EST: elements.strategy.value,
    VR: elements.inputVR.value,
    VG: elements.inputVG.value,
    HBE: elements.inputHBE.value,
    LIP: elements.inputLIP.value,
    LIE: elements.inputLIE.value,
  });
}

function setConfigToDom(elements, config) {
  elements.strategy.value = String(config.EST);
  elements.inputVR.value = String(config.VR);
  elements.inputVG.value = String(config.VG);
  elements.inputHBE.value = String(config.HBE);
  elements.inputLIP.value = String(config.LIP);
  elements.inputLIE.value = String(config.LIE);
}

function appendLog(state, elements, message, level = 'info') {
  const event = StateRef.appendSessionEvent(state, message, level);
  const li = document.createElement('li');
  li.textContent = `[${event.level}] ${event.timestamp} ${event.message}`;
  elements.logList.prepend(li);
}

function renderProfiles(elements, profiles) {
  elements.profileSelect.innerHTML = '<option value="">Select profile</option>';
  profiles.forEach((profile) => {
    const option = document.createElement('option');
    option.value = profile.name;
    option.textContent = profile.name;
    elements.profileSelect.appendChild(option);
  });
}

function updateTelemetry(doc, telemetry) {
  Object.entries(telemetry).forEach(([field, value]) => {
    const element = doc.getElementById(`telemetry-${field}`);
    if (element) {
      element.textContent = String(value);
    }
  });
}

function applySafetyIndicators(elements, telemetry) {
  const signals = deriveSafetySignals(telemetry);

  if (elements.batteryValue) {
    elements.batteryValue.dataset.level = signals.batteryLevel;
  }
  if (elements.edgeCard) {
    elements.edgeCard.dataset.risk = signals.edgeRisk ? 'high' : 'normal';
  }

  return signals;
}

function downloadCsv(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function initApp(doc = document) {
  const state = StateRef.createInitialState();
  state.emergencyLocked = false;

  const commandQueue = createCommandQueue();
  const elements = getElements(doc);
  const transport = window.bridgeTransport || createHttpTransport();
  let bridgeSocket = null;

  function applyLockUi() {
    const locked = state.emergencyLocked;
    elements.btnApply.disabled = locked;
    elements.btnSync.disabled = locked;
    elements.btnSaveProfile.disabled = locked;
    elements.btnLoadProfile.disabled = locked;
    elements.btnRearm.disabled = !locked;
  }

  async function flushCommandQueue() {
    const commands = commandQueue.flush();
    for (const command of commands) {
      await transport.sendCommand(command);
      appendLog(state, elements, `Sent ${command}`);
    }
  }

  function attachBridgeSocket() {
    if (typeof WebSocket === 'undefined' || bridgeSocket) {
      return;
    }

    bridgeSocket = new WebSocket('ws://localhost:8787');
    bridgeSocket.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'telemetry') {
          state.telemetry = message.payload;
          updateTelemetry(doc, message.payload);
          applySafetyIndicators(elements, message.payload);
        }
      } catch (error) {
        appendLog(state, elements, `Bridge message parse failed: ${error.message}`, 'warning');
      }
    });
  }

  UIRef.hydrateStrategySelect(elements.strategy, state.config.EST);
  setConfigToDom(elements, state.config);
  setStatus(elements, 'Disconnected');
  applyLockUi();

  const existingProfiles = StateRef.loadProfiles(window.localStorage);
  renderProfiles(elements, existingProfiles);

  elements.btnConnect.addEventListener('click', async () => {
    if (state.connectionStatus !== 'connected') {
      try {
        await transport.connect();
        state.connectionStatus = 'connected';
        setStatus(elements, 'Connected');
        appendLog(state, elements, 'Bridge connected.');
        attachBridgeSocket();
      } catch (error) {
        state.connectionStatus = 'disconnected';
        setStatus(elements, 'Disconnected');
        appendLog(state, elements, `Connect failed: ${error.message}`, 'warning');
      }
      return;
    }

    state.connectionStatus = 'disconnected';
    setStatus(elements, 'Disconnected');
    if (bridgeSocket) {
      bridgeSocket.close();
      bridgeSocket = null;
    }
    appendLog(state, elements, 'Bridge disconnected.');
  });

  elements.btnApply.addEventListener('click', async () => {
    if (state.emergencyLocked) {
      appendLog(state, elements, 'Apply blocked: re-arm required after emergency stop.', 'warning');
      return;
    }

    const config = getConfigFromDom(elements);
    const commands = buildConfigCommandBatch(config);
    commands.forEach((command) => commandQueue.enqueue(command));
    await flushCommandQueue();
    state.config = { ...config };
  });

  const stopHandler = async () => {
    commandQueue.enqueue(ProtocolRef.buildCommand('PARADA', 1));
    await flushCommandQueue();
    state.emergencyLocked = reduceEmergencyLockout(state.emergencyLocked, 'stop');
    applyLockUi();
    setStatus(elements, 'Emergency stop active (re-arm required)');
    appendLog(state, elements, 'Emergency stop sent.', 'warning');
  };

  elements.btnStop.addEventListener('click', stopHandler);
  elements.btnStopSecondary.addEventListener('click', stopHandler);

  elements.btnRearm.addEventListener('click', () => {
    state.emergencyLocked = reduceEmergencyLockout(state.emergencyLocked, 'rearm');
    applyLockUi();
    setStatus(elements, state.connectionStatus === 'connected' ? 'Connected' : 'Disconnected');
    appendLog(state, elements, 'System re-armed by operator.');
  });

  elements.btnSync.addEventListener('click', async () => {
    if (state.emergencyLocked) {
      appendLog(state, elements, 'Telemetry sync blocked: re-arm required.', 'warning');
      return;
    }

    await transport.sendCommand(ProtocolRef.buildCommand('dados', 1));
    const payload = await transport.requestTelemetry();
    if (!payload) {
      appendLog(state, elements, 'Telemetry request sent (awaiting bridge stream).');
      return;
    }

    const telemetry = typeof payload === 'string'
      ? ProtocolRef.parseTelemetry(payload)
      : payload;
    state.telemetry = telemetry;
    updateTelemetry(doc, telemetry);
    const signals = applySafetyIndicators(elements, telemetry);
    appendLog(state, elements, `Telemetry synchronized (battery: ${signals.batteryLevel}).`);
  });

  elements.btnSaveProfile.addEventListener('click', () => {
    const name = elements.profileName.value.trim();
    const config = getConfigFromDom(elements);
    const profiles = StateRef.saveProfile(window.localStorage, name, config);
    renderProfiles(elements, profiles);
    appendLog(state, elements, `Profile "${name}" saved.`);
  });

  elements.btnLoadProfile.addEventListener('click', () => {
    const selectedName = elements.profileSelect.value;
    const profiles = StateRef.loadProfiles(window.localStorage);
    const selected = profiles.find((item) => item.name === selectedName);
    if (!selected) return;
    setConfigToDom(elements, selected.config);
    appendLog(state, elements, `Profile "${selectedName}" loaded.`);
  });

  elements.btnExportLog.addEventListener('click', () => {
    const csv = StateRef.exportLogCsv(state.log);
    const filename = `robot-session-${new Date().toISOString().slice(0, 19).replaceAll(':', '-')}.csv`;
    downloadCsv(filename, csv);
    appendLog(state, elements, 'Session log exported.');
  });

  return {
    state,
    elements,
    commandQueue,
  };
}

const api = {
  toConfigFromInputs,
  buildConfigCommandBatch,
  createCommandQueue,
  reduceEmergencyLockout,
  deriveSafetySignals,
  createHttpTransport,
  initApp,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
}

if (typeof window !== 'undefined') {
  window.RobotOpsApp = api;
  window.addEventListener('DOMContentLoaded', () => {
    window.RobotOpsApp.initApp(document);
  });
}
