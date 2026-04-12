'use strict';

const PROFILE_STORAGE_KEY = 'sumoapp_profiles';

function createDefaultConfig() {
  return {
    EST: 1,
    VR: 180,
    VG: 180,
    HBE: 0,
    LIP: 0,
    LIE: -1,
  };
}

function createInitialState() {
  return {
    connectionStatus: 'disconnected',
    config: createDefaultConfig(),
    telemetry: null,
    log: [],
  };
}

function appendSessionEvent(state, message, level = 'info') {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };
  state.log.push(entry);
  return entry;
}

function loadProfiles(storage) {
  const raw = storage.getItem(PROFILE_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed;
  } catch (error) {
    return [];
  }
}

function saveProfile(storage, name, config) {
  const profiles = loadProfiles(storage);
  const normalizedName = String(name || '').trim();
  if (!normalizedName) {
    throw new Error('Profile name is required');
  }

  const existingIndex = profiles.findIndex((item) => item.name === normalizedName);
  const profile = {
    name: normalizedName,
    config: { ...config },
  };

  if (existingIndex >= 0) {
    profiles[existingIndex] = profile;
  } else {
    profiles.push(profile);
  }

  storage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profiles));
  return profiles;
}

function escapeCsvCell(value) {
  const text = String(value ?? '');
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function exportLogCsv(entries) {
  const header = 'timestamp,level,message';
  const rows = entries.map((entry) => [
    escapeCsvCell(entry.timestamp),
    escapeCsvCell(entry.level),
    escapeCsvCell(entry.message),
  ].join(','));
  return [header, ...rows].join('\n');
}

const api = {
  PROFILE_STORAGE_KEY,
  createDefaultConfig,
  createInitialState,
  appendSessionEvent,
  loadProfiles,
  saveProfile,
  exportLogCsv,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
}

if (typeof window !== 'undefined') {
  window.AppState = api;
}
