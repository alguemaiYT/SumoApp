'use strict';

const STRATEGIES = Object.freeze([
  { value: 1, label: 'Radar' },
  { value: 2, label: 'Cacador' },
  { value: 3, label: 'Firula' },
  { value: 4, label: 'Suicida' },
  { value: 5, label: 'Sovai' },
  { value: 6, label: 'Contorno' },
  { value: 7, label: 'Seg-linha' },
]);

const ACTION_BUTTONS = Object.freeze(['connect', 'sync', 'apply', 'stop']);

function renderStrategyOptions(selected = 1) {
  return STRATEGIES.map((item) => {
    const isSelected = Number(selected) === item.value ? ' selected' : '';
    return `<option value="${item.value}"${isSelected}>${item.label}</option>`;
  }).join('');
}

function getBatteryLevel(voltage) {
  const numeric = Number(voltage);
  if (!Number.isFinite(numeric)) {
    return 'unknown';
  }

  if (numeric < 10.8) {
    return 'danger';
  }

  if (numeric < 11.3) {
    return 'warning';
  }

  return 'healthy';
}

function hydrateStrategySelect(selectElement, selected = 1) {
  if (!selectElement) return;
  selectElement.innerHTML = renderStrategyOptions(selected);
}

function updateBatteryBadge(badgeElement, voltage) {
  if (!badgeElement) return;
  const level = getBatteryLevel(voltage);
  badgeElement.dataset.level = level;
  badgeElement.textContent = Number.isFinite(Number(voltage)) ? `${Number(voltage).toFixed(2)} V` : '--';
}

const api = {
  STRATEGIES,
  ACTION_BUTTONS,
  renderStrategyOptions,
  getBatteryLevel,
  hydrateStrategySelect,
  updateBatteryBadge,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
}

if (typeof window !== 'undefined') {
  window.UI = api;
}
