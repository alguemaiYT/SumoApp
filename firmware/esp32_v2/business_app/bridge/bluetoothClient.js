'use strict';

const { EventEmitter } = require('node:events');

const DEFAULT_CONFIG = Object.freeze({
  deviceName: 'Madinboo_BT',
  deviceAddress: '',
  pollIntervalMs: 500,
  reconnectBaseMs: 250,
  reconnectMaxMs: 8000,
});

function buildBridgeConfig(userConfig = {}) {
  return {
    ...DEFAULT_CONFIG,
    ...userConfig,
  };
}

function sanitizeOutgoingCommand(command) {
  if (typeof command !== 'string' || command.trim() === '') {
    throw new Error('Command must be a non-empty string');
  }

  let framed = command.trim();
  if (!framed.includes(',')) {
    throw new Error('Command must include command and value');
  }
  if (!framed.endsWith('*')) {
    framed = `${framed}*`;
  }

  const payload = framed.slice(0, -1);
  const separatorIndex = payload.indexOf(',');
  if (separatorIndex <= 0 || separatorIndex >= payload.length - 1) {
    throw new Error('Command must include command and value');
  }

  return framed;
}

function nextReconnectDelay(attempt, baseDelayMs, maxDelayMs) {
  const safeAttempt = Math.max(0, Number(attempt) || 0);
  const safeBase = Math.max(1, Number(baseDelayMs) || DEFAULT_CONFIG.reconnectBaseMs);
  const safeMax = Math.max(safeBase, Number(maxDelayMs) || DEFAULT_CONFIG.reconnectMaxMs);
  return Math.min(safeMax, safeBase * (2 ** safeAttempt));
}

class BluetoothBridgeClient extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = buildBridgeConfig(config);
    this.connectionState = 'disconnected';
    this.reconnectAttempt = 0;
    this.reconnectTimer = null;
    this.pollingTimer = null;
    this.serial = null;
    this.buffer = '';
    this.pendingTelemetry = [];
  }

  _setState(state) {
    this.connectionState = state;
    this.emit('status', { state, timestamp: new Date().toISOString() });
  }

  _createSerialInstance() {
    try {
      // Optional dependency; bridge can still run in simulation mode if unavailable.
      // eslint-disable-next-line global-require, import/no-extraneous-dependencies
      const { BluetoothSerialPort } = require('bluetooth-serial-port');
      return new BluetoothSerialPort();
    } catch (error) {
      return null;
    }
  }

  async _discoverAddressByName(serial, deviceName) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const timeoutId = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error(`Bluetooth device "${deviceName}" not found`));
      }, 10000);

      const cleanup = () => {
        clearTimeout(timeoutId);
        serial.removeListener('found', onFound);
        serial.removeListener('finished', onFinished);
      };

      const onFound = (address, name) => {
        if (settled) return;
        if (name === deviceName) {
          settled = true;
          cleanup();
          resolve(address);
        }
      };

      const onFinished = () => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error(`Bluetooth device "${deviceName}" not found`));
      };

      serial.on('found', onFound);
      serial.on('finished', onFinished);
      serial.inquire();
    });
  }

  async _findChannel(serial, address) {
    return new Promise((resolve, reject) => {
      serial.findSerialPortChannel(address, (channel) => resolve(channel), () => {
        reject(new Error(`No RFCOMM channel found for ${address}`));
      });
    });
  }

  async _connectSerial(serial, address, channel) {
    return new Promise((resolve, reject) => {
      serial.connect(address, channel, () => resolve(), (error) => {
        reject(new Error(`Failed to connect: ${error || 'unknown error'}`));
      });
    });
  }

  _scheduleReconnect() {
    if (this.reconnectTimer || this.connectionState === 'simulated') {
      return;
    }
    const delayMs = nextReconnectDelay(
      this.reconnectAttempt,
      this.config.reconnectBaseMs,
      this.config.reconnectMaxMs,
    );
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      try {
        await this.connect();
      } catch (error) {
        this.emit('error', error);
      }
    }, delayMs);
  }

  _resolveTelemetryWaiter(line) {
    const waiter = this.pendingTelemetry.shift();
    if (!waiter) return;
    clearTimeout(waiter.timeoutId);
    waiter.resolve(line);
  }

  _handleIncomingChunk(buffer) {
    const chunk = Buffer.isBuffer(buffer) ? buffer.toString('utf8') : String(buffer);
    this.buffer += chunk;
    const parts = this.buffer.split(/\r?\n/);
    this.buffer = parts.pop() || '';

    parts
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line) => {
        this.emit('line', line);
        if (line.includes('|')) {
          this._resolveTelemetryWaiter(line);
        }
      });
  }

  _handleDisconnect(reason) {
    this._setState('disconnected');
    this.emit('error', new Error(`Bluetooth disconnected: ${reason}`));
    this._scheduleReconnect();
  }

  async connect() {
    if (this.connectionState === 'connected' || this.connectionState === 'connecting' || this.connectionState === 'simulated') {
      return;
    }

    this._setState('connecting');
    this.serial = this._createSerialInstance();

    if (!this.serial) {
      this._setState('simulated');
      return;
    }

    try {
      const address = this.config.deviceAddress
        || await this._discoverAddressByName(this.serial, this.config.deviceName);
      const channel = await this._findChannel(this.serial, address);
      await this._connectSerial(this.serial, address, channel);

      this.reconnectAttempt = 0;
      this._setState('connected');
      this.serial.on('data', (buffer) => this._handleIncomingChunk(buffer));
      this.serial.on('closed', () => this._handleDisconnect('closed'));
      this.serial.on('failure', (error) => this._handleDisconnect(error || 'failure'));
    } catch (error) {
      this._setState('disconnected');
      this._scheduleReconnect();
      throw error;
    }
  }

  async sendCommand(command) {
    const framed = sanitizeOutgoingCommand(command);

    if (this.connectionState === 'simulated') {
      if (framed.startsWith('dados,')) {
        const sample = '180|170|1|0|-1|12.3|1|0|1|0|330|318';
        setTimeout(() => {
          this.emit('line', sample);
          this._resolveTelemetryWaiter(sample);
        }, 20);
      }
      return { ok: true, simulated: true };
    }

    if (this.connectionState !== 'connected' || !this.serial) {
      throw new Error('Bridge is not connected');
    }

    return new Promise((resolve, reject) => {
      this.serial.write(Buffer.from(framed, 'utf8'), (error, bytesWritten) => {
        if (error) {
          reject(error);
          return;
        }
        resolve({ ok: true, bytesWritten });
      });
    });
  }

  async requestTelemetry(timeoutMs = 1500) {
    const telemetryPromise = new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        this.pendingTelemetry = this.pendingTelemetry.filter((waiter) => waiter.resolve !== resolve);
        resolve(null);
      }, timeoutMs);
      this.pendingTelemetry.push({ resolve, timeoutId });
    });

    await this.sendCommand('dados,1*');
    return telemetryPromise;
  }

  startPolling() {
    this.stopPolling();
    this.pollingTimer = setInterval(async () => {
      try {
        await this.requestTelemetry();
      } catch (error) {
        this.emit('error', error);
      }
    }, this.config.pollIntervalMs);
  }

  stopPolling() {
    if (!this.pollingTimer) return;
    clearInterval(this.pollingTimer);
    this.pollingTimer = null;
  }

  close() {
    this.stopPolling();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.serial && this.connectionState === 'connected') {
      try {
        this.serial.close();
      } catch (error) {
        // Nothing to do; we're shutting down bridge client.
      }
    }
    this._setState('disconnected');
  }
}

module.exports = {
  DEFAULT_CONFIG,
  buildBridgeConfig,
  sanitizeOutgoingCommand,
  nextReconnectDelay,
  BluetoothBridgeClient,
};
