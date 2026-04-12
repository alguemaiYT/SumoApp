'use strict';

const COMMAND_SPECS = Object.freeze({
  EST: { min: 1, max: 7 },
  VR: { min: 0, max: 255 },
  VG: { min: 0, max: 255 },
  HBE: { min: 0, max: 1 },
  LIP: { min: -1000, max: 1000 },
  LIE: { min: -1000, max: 1000 },
  PARADA: { min: 0, max: 1 },
  dados: { min: 0, max: 1 },
});

const TELEMETRY_FIELDS = Object.freeze([
  'velocreta',
  'velocgiro',
  'HBEvasao',
  'limiarParado',
  'limiarEmpurrado',
  'Vbat',
  'sen_dir',
  'sen_centro_dir',
  'sen_centro_esq',
  'sen_esq',
  'sensorLD',
  'sensorLE',
]);

function validateCommandValue(command, value) {
  const spec = COMMAND_SPECS[command];
  if (!spec) {
    throw new Error(`Unknown command: ${command}`);
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    throw new Error(`Invalid value for ${command}`);
  }

  const normalized = Math.trunc(numeric);
  if (normalized < spec.min || normalized > spec.max) {
    throw new Error(`Value for ${command} out of range [${spec.min}, ${spec.max}]`);
  }

  return normalized;
}

function buildCommand(command, value = 0) {
  const normalizedValue = validateCommandValue(command, value);
  return `${command},${normalizedValue}*`;
}

function parseTelemetry(payload) {
  if (typeof payload !== 'string' || payload.trim() === '') {
    throw new Error('Telemetry payload must be a non-empty string');
  }

  const parts = payload.trim().split('|');
  if (parts.length !== TELEMETRY_FIELDS.length) {
    throw new Error(`Expected ${TELEMETRY_FIELDS.length} telemetry fields`);
  }

  const result = {};
  for (let i = 0; i < TELEMETRY_FIELDS.length; i += 1) {
    const value = Number(parts[i].trim());
    if (!Number.isFinite(value)) {
      throw new Error(`Invalid numeric value for ${TELEMETRY_FIELDS[i]}`);
    }
    result[TELEMETRY_FIELDS[i]] = value;
  }

  return result;
}

const api = {
  COMMAND_SPECS,
  TELEMETRY_FIELDS,
  validateCommandValue,
  buildCommand,
  parseTelemetry,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
}

if (typeof window !== 'undefined') {
  window.Protocol = api;
}
