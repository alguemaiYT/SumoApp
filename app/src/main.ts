import { BleClient, dataViewToText } from '@capacitor-community/bluetooth-le';
import { StatusBar, Style } from '@capacitor/status-bar';

// ── STATE ─────────────────────────────────────
const S = {
  connected: false,
  deviceId: '',
  filters: new Set(['TX', 'RX', 'ERR', 'SYS']),
  avail: new Set(['1', '2', '3', '4', '5', '6', '7']),
};

const STRATS = [
  { v: '1', l: 'Radar' }, { v: '2', l: 'Caçador' }, { v: '3', l: 'Firula' },
  { v: '4', l: 'Suicida' }, { v: '5', l: 'Só Vai' }, { v: '6', l: 'Contorno' }, { v: '7', l: 'Seg Linha' },
];

const UART_SVC = '6e400001-b5a4-f393-e0a9-e50e24dcca9e';
const UART_TX = '6e400002-b5a4-f393-e0a9-e50e24dcca9e'; // Characteristic to write to
const UART_RX = '6e400003-b5a4-f393-e0a9-e50e24dcca9e'; // Characteristic to read from

// ── INITIALIZATION ───────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  try {
    await BleClient.initialize();
    logE('SYS', 'Bluetooth LE inicializado');
    
    // Configure StatusBar for mobile
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#080b0f' });
  } catch (e) {
    logE('ERR', 'Falha ao inicializar: ' + e);
  }
  setupEventListeners();
  logE('SYS', 'ROBOCTL App inicializado');
});

function setupEventListeners() {
  document.getElementById('ov-btn')?.addEventListener('click', connectBT);
  document.getElementById('dismissOverlay')?.addEventListener('click', dismiss);
  document.getElementById('toggleConnBtn')?.addEventListener('click', toggleConn);
  document.getElementById('emrg')?.addEventListener('click', sendEmrg);
  document.getElementById('reqDataBtn')?.addEventListener('click', reqData);
  document.getElementById('chkStratBtn')?.addEventListener('click', chkStrat);
  document.getElementById('strat-send')?.addEventListener('click', sendStrat);
  document.getElementById('sendSpeedsBtn')?.addEventListener('click', sendSpeeds);
  document.getElementById('sendThreshBtn')?.addEventListener('click', sendThresh);
  document.getElementById('sendEvasionBtn')?.addEventListener('click', sendEvasion);
  document.getElementById('sendRawBtn')?.addEventListener('click', sendRaw);
  document.getElementById('clearLogBtn')?.addEventListener('click', clearLog);
  document.getElementById('exportCfgBtn')?.addEventListener('click', exportCfg);
  document.getElementById('importCfgBtn')?.addEventListener('click', () => document.getElementById('imp-file')?.click());
  document.getElementById('imp-file')?.addEventListener('change', (e) => importCfg(e.target as HTMLInputElement));
  document.getElementById('strat-sel')?.addEventListener('change', onStratChg);

  // Nav items
  document.querySelectorAll('.nitem').forEach(item => {
    item.addEventListener('click', () => goPage(item as HTMLElement));
  });

  // Sliders
  document.getElementById('vr')?.addEventListener('input', (e) => {
    const val = (e.target as HTMLInputElement).value;
    const el = document.getElementById('vr-v');
    if (el) el.textContent = val;
  });
  document.getElementById('vg')?.addEventListener('input', (e) => {
    const val = (e.target as HTMLInputElement).value;
    const el = document.getElementById('vg-v');
    if (el) el.textContent = val;
  });

  // Log chips
  document.querySelectorAll('.chip[data-t]').forEach(chip => {
    chip.addEventListener('click', () => togChip(chip as HTMLElement));
  });

  // Raw input Enter key
  document.getElementById('raw-in')?.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Enter') {
      sendRaw();
      (e.target as HTMLInputElement).blur();
    }
  });
}

// ── BLUETOOTH ─────────────────────────────────
async function connectBT() {
  const btn = document.getElementById('ov-btn') as HTMLButtonElement;
  const ring = document.getElementById('ov-ring');
  btn.disabled = true;
  btn.textContent = '◌ BUSCANDO...';
  ring?.classList.add('spin');
  setOvMsg('Procurando dispositivos...', '');

  try {
    const device = await BleClient.requestDevice({
      // Removed specific service filter to show all devices
      // services: [UART_SVC], 
    });

    setOvMsg('Conectando a ' + (device.name || 'ESP32') + '...', '');
    
    await BleClient.connect(device.deviceId, onDisco);
    S.deviceId = device.deviceId;

    await BleClient.startNotifications(
      S.deviceId,
      UART_SVC,
      UART_RX,
      (value) => {
        const txt = dataViewToText(value).trim();
        logE('RX', txt);
        parseTele(txt);
      }
    );

    setConnected(true, device.name || 'ESP32');
    ring?.classList.remove('spin');
    dismiss();
    reqData();
  } catch (e: any) {
    ring?.classList.remove('spin');
    btn.disabled = false;
    btn.textContent = '◉ CONECTAR AO ESP32';
    const cancelled = e.name === 'NotFoundError' || (e.message || '').includes('cancel');
    setOvMsg(cancelled ? 'Seleção cancelada.' : 'Erro: ' + e.message, 'err');
    if (!cancelled) {
      logE('ERR', e.message);
      toast(e.message, 'err');
    }
  }
}

function onDisco(deviceId: string) {
  setConnected(false);
  logE('SYS', 'Desconectado de ' + deviceId);
  toast('Conexão BT perdida', 'err');
}

async function toggleConn() {
  if (S.connected) {
    try {
      await BleClient.disconnect(S.deviceId);
      setConnected(false);
      logE('SYS', 'Desconectado manualmente');
    } catch (e: any) {
      logE('ERR', 'Erro ao desconectar: ' + e.message);
    }
  } else {
    document.getElementById('overlay')?.classList.remove('gone');
  }
}

function setConnected(v: boolean, name = '') {
  S.connected = v;
  const btn = document.getElementById('conn-btn-top');
  if (btn) btn.className = 'conn-btn-top' + (v ? ' connected' : '');
  const lbl = name.length > 10 ? name.slice(0, 10) + '…' : name;
  const lblEl = document.getElementById('conn-lbl');
  if (lblEl) lblEl.textContent = v ? lbl : 'CONECTAR';
  updPreview();
}

function setOvMsg(msg: string, type: string) {
  const el = document.getElementById('ov-msg');
  if (el) {
    el.textContent = msg;
    el.className = 'ov-msg' + (type ? ' ' + type : '');
  }
}

function dismiss() {
  document.getElementById('overlay')?.classList.add('gone');
}

// ── SEND ──────────────────────────────────────
async function send(cmd: string) {
  if (!S.connected) {
    toast('Não conectado', 'err');
    logE('ERR', 'Sem conexão: ' + cmd);
    return false;
  }
  logE('TX', cmd);
  try {
    const data = new TextEncoder().encode(cmd + '\n');
    await BleClient.write(S.deviceId, UART_SVC, UART_TX, new DataView(data.buffer));
    return true;
  } catch (e: any) {
    logE('ERR', e.message);
    toast('TX: ' + e.message, 'err');
    return false;
  }
}

function sendEmrg() { send('STOP*'); toast('⚡ Emergência enviada!', 'err'); }
function reqData() { send('dados'); }

function sendSpeeds() {
  const vr = (document.getElementById('vr') as HTMLInputElement).value;
  const vg = (document.getElementById('vg') as HTMLInputElement).value;
  send('VR,' + vr + '*');
  send('VG,' + vg + '*');
  toast('VR=' + vr + ' VG=' + vg + ' enviados', 'ok');
}

function sendThresh() {
  const lip = (document.getElementById('lip') as HTMLInputElement).value;
  const lie = (document.getElementById('lie') as HTMLInputElement).value;
  if (!lip || !lie) { toast('Preencha ambos os limiares', 'err'); return; }
  send('LIP,' + lip + '*');
  send('LIE,' + lie + '*');
  toast('Limiares enviados', 'ok');
}

function sendEvasion() {
  const on = (document.getElementById('hbe') as HTMLInputElement).checked;
  send('HBE,' + (on ? 'ON' : 'OFF') + '*');
  toast('Evasão ' + (on ? 'ATIVADA' : 'DESATIVADA'), 'ok');
}

function sendStrat() {
  const sel = document.getElementById('strat-sel') as HTMLSelectElement;
  if (!sel.value) { toast('Selecione uma estratégia', 'err'); return; }
  if (!S.avail.has(sel.value)) { toast('Estratégia indisponível', 'err'); return; }
  send('EST,' + sel.value + '*');
  toast('Estratégia: ' + sel.options[sel.selectedIndex].text, 'ok');
}

function sendRaw() {
  const el = document.getElementById('raw-in') as HTMLInputElement;
  const cmd = el.value.trim();
  if (!cmd) { toast('Digite um comando', 'err'); return; }
  send(cmd);
  el.value = '';
}

// ── PARSE ─────────────────────────────────────
function parseTele(raw: string) {
  ['SE', 'SCE', 'SCD', 'SD', 'LE', 'LD'].forEach(k => {
    const m = raw.match(new RegExp(k + '[=:](\\d+\\.?\\d*)'));
    if (m) updSensor(k, parseFloat(m[1]));
  });
  const sm = raw.match(/STRAT:([0-9,]+)/);
  if (sm) {
    S.avail = new Set(sm[1].split(','));
    refreshStrats();
    logE('SYS', 'Estratégias: ' + sm[1]);
  }
  const updTs = document.getElementById('upd-ts');
  if (updTs) updTs.textContent = new Date().toLocaleTimeString('pt-BR', { hour12: false });
}

function updSensor(k: string, v: number) {
  const isLine = k === 'LE' || k === 'LD';
  const max = isLine ? 1 : 4095;
  const pct = Math.min(100, (v / max) * 100).toFixed(1);
  const vEl = document.getElementById('v-' + k);
  const bEl = document.getElementById('b-' + k) as HTMLElement;
  const tile = document.getElementById('t-' + k);
  if (!vEl) return;
  vEl.textContent = isLine ? (v ? 'ON' : 'OFF') : Math.round(v).toString();
  if (bEl) bEl.style.width = pct + '%';
  if (isLine) {
    if (tile) tile.className = 'stile' + (v ? ' lon' : '');
  } else {
    if (tile) tile.className = 'stile' + (v > 200 ? ' on' : '');
  }
}

// ── STRATEGY ──────────────────────────────────
function onStratChg() {
  const sel = document.getElementById('strat-sel') as HTMLSelectElement;
  if (!sel.value) {
    setSF('pending', '◌', 'Selecione uma estratégia');
    const sendBtn = document.getElementById('strat-send') as HTMLButtonElement;
    if (sendBtn) sendBtn.disabled = true;
    return;
  }
  chkStrat();
}

function chkStrat() {
  const sel = document.getElementById('strat-sel') as HTMLSelectElement;
  if (!sel.value) { toast('Selecione uma estratégia', 'err'); return; }
  const lbl = sel.options[sel.selectedIndex].text;
  const ok = S.avail.has(sel.value);
  setSF(ok ? 'valid' : 'invalid', ok ? '✓' : '✕', lbl + (ok ? ' — Disponível' : ' — Indisponível agora'));
  const sendBtn = document.getElementById('strat-send') as HTMLButtonElement;
  if (sendBtn) sendBtn.disabled = !ok;
}

function setSF(cls: string, ico: string, msg: string) {
  const el = document.getElementById('sf');
  if (el) {
    el.className = 'sf ' + cls;
    const icoEl = el.querySelector('.sf-ico');
    if (icoEl) icoEl.textContent = ico;
    const msgEl = document.getElementById('sf-msg');
    if (msgEl) msgEl.textContent = msg;
  }
}

function refreshStrats() {
  const sel = document.getElementById('strat-sel') as HTMLSelectElement;
  if (!sel) return;
  Array.from(sel.options).forEach(opt => {
    if (!opt.value) return;
    const avail = S.avail.has(opt.value);
    const st = STRATS.find(s => s.v === opt.value);
    opt.textContent = (avail ? '' : '✕ ') + (st?.l || opt.value);
    opt.disabled = !avail;
  });
  if (sel.value) chkStrat();
}

// ── LOG ───────────────────────────────────────
function logE(type: string, msg: string) {
  const area = document.getElementById('log');
  if (!area) return;
  const ts = new Date().toLocaleTimeString('pt-BR', { hour12: false });
  const row = document.createElement('div');
  row.className = 'lrow';
  row.dataset.t = type;
  row.style.display = S.filters.has(type) ? 'flex' : 'none';
  row.innerHTML = `<span class="lts">${ts}</span><span class="ltype ${type}">${type}</span><span class="lmsg">${esc(msg)}</span>`;
  area.appendChild(row);
  area.scrollTop = area.scrollHeight;
}

function togChip(chip: HTMLElement) {
  const t = chip.dataset.t;
  if (!t) return;
  if (S.filters.has(t)) {
    S.filters.delete(t);
    chip.classList.remove('on');
  } else {
    S.filters.add(t);
    chip.classList.add('on');
  }
  document.querySelectorAll('.lrow').forEach(row => {
    const r = row as HTMLElement;
    r.style.display = S.filters.has(r.dataset.t!) ? 'flex' : 'none';
  });
}

function clearLog() {
  const log = document.getElementById('log');
  if (log) log.innerHTML = '';
}
function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── NAV ───────────────────────────────────────
const PG_TITLES: Record<string, string> = { dash: 'Dashboard', params: 'Parâmetros', terminal: 'Terminal', io: 'Import / Export' };

function goPage(item: HTMLElement) {
  document.querySelectorAll('.nitem').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  item.classList.add('active');
  const pg = item.dataset.pg || 'dash';
  document.getElementById('page-' + pg)?.classList.add('active');
  const ptitle = document.getElementById('ptitle');
  if (ptitle) ptitle.textContent = PG_TITLES[pg] || '';
  const main = document.getElementById('main');
  if (main) main.scrollTop = 0;
  if (pg === 'io') updPreview();
}

// ── I/O ───────────────────────────────────────
function getCfg() {
  const sel = document.getElementById('strat-sel') as HTMLSelectElement;
  return {
    strategy: { value: sel?.value, label: sel?.selectedOptions[0]?.text || '' },
    speeds: {
      VR: +(document.getElementById('vr') as HTMLInputElement)?.value || 0,
      VG: +(document.getElementById('vg') as HTMLInputElement)?.value || 0
    },
    thresholds: {
      LIP: +(document.getElementById('lip') as HTMLInputElement)?.value || 0,
      LIE: +(document.getElementById('lie') as HTMLInputElement)?.value || 0
    },
    evasion: { HBE: (document.getElementById('hbe') as HTMLInputElement)?.checked || false },
    exported: new Date().toISOString(),
    version: '2.1',
  };
}

function exportCfg() {
  const json = JSON.stringify(getCfg(), null, 2);
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([json], { type: 'application/json' })),
    download: 'roboctl_' + new Date().toISOString().slice(0, 10) + '.json',
  });
  a.click();
  toast('Configuração exportada', 'ok');
  logE('SYS', 'Config exportada');
}

function importCfg(input: HTMLInputElement) {
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const cfg = JSON.parse(e.target?.result as string);
      applyCfg(cfg);
      const msg = document.getElementById('imp-msg');
      if (msg) msg.textContent = '✓ ' + file.name;
      toast('Importado com sucesso', 'ok');
      logE('SYS', 'Importado: ' + file.name);
      updPreview();
    } catch {
      const msg = document.getElementById('imp-msg');
      if (msg) msg.textContent = '✕ JSON inválido';
      toast('JSON inválido', 'err');
    }
    input.value = '';
  };
  reader.readAsText(file);
}

function applyCfg(cfg: any) {
  if (cfg.strategy?.value) {
    const sel = document.getElementById('strat-sel') as HTMLSelectElement;
    if (sel) {
      sel.value = cfg.strategy.value;
      onStratChg();
    }
  }
  if (cfg.speeds?.VR != null) {
    const el = document.getElementById('vr') as HTMLInputElement;
    if (el) el.value = cfg.speeds.VR;
    const vEl = document.getElementById('vr-v');
    if (vEl) vEl.textContent = cfg.speeds.VR;
  }
  if (cfg.speeds?.VG != null) {
    const el = document.getElementById('vg') as HTMLInputElement;
    if (el) el.value = cfg.speeds.VG;
    const vEl = document.getElementById('vg-v');
    if (vEl) vEl.textContent = cfg.speeds.VG;
  }
  if (cfg.thresholds?.LIP != null) {
    const el = document.getElementById('lip') as HTMLInputElement;
    if (el) el.value = cfg.thresholds.LIP;
  }
  if (cfg.thresholds?.LIE != null) {
    const el = document.getElementById('lie') as HTMLInputElement;
    if (el) el.value = cfg.thresholds.LIE;
  }
  if (cfg.evasion?.HBE != null) {
    const el = document.getElementById('hbe') as HTMLInputElement;
    if (el) el.checked = cfg.evasion.HBE;
  }
}

function updPreview() {
  const pre = document.getElementById('cfg-pre');
  if (pre) pre.textContent = JSON.stringify(getCfg(), null, 2);
}

// ── TOAST ─────────────────────────────────────
function toast(msg: string, type = 'info') {
  const area = document.getElementById('toasts');
  if (!area) return;
  const t = Object.assign(document.createElement('div'), { className: 'toast ' + type, textContent: msg });
  area.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}
