/**
 * RoboCtrl - ESP32 Sumô Robot Control App
 * Bluetooth Serial Communication with ESP32
 */

// ══════════════════════════════════════════════════════════════════════════════
// BLUETOOTH MANAGER
// ══════════════════════════════════════════════════════════════════════════════

class BluetoothManager {
  constructor() {
    this.device = null;
    this.characteristic = null;
    this.reader = null;
    this.writer = null;
    this.port = null;
    this.connected = false;
    this.telemetryCallback = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
  }

  async connect() {
    try {
      // Check if Web Bluetooth API is available
      if ('bluetooth' in navigator) {
        return await this.connectBLE();
      } 
      // Check if Web Serial API is available (for desktop Chrome)
      else if ('serial' in navigator) {
        return await this.connectSerial();
      } 
      else {
        throw new Error('Bluetooth não suportado neste navegador. Use Chrome ou Edge.');
      }
    } catch (error) {
      console.error('Erro ao conectar:', error);
      throw error;
    }
  }

  async connectBLE() {
    try {
      console.log('Tentando conexão Bluetooth...');
      
      // Request Bluetooth device
      this.device = await navigator.bluetooth.requestDevice({
        filters: [
          { name: 'Madinboo_BT' },
          { namePrefix: 'ESP32' },
          { namePrefix: 'HC-' }
        ],
        optionalServices: ['0000ffe0-0000-1000-8000-00805f9b34fb'] // Common BLE SPP service
      });

      console.log('Dispositivo encontrado:', this.device.name);

      // Connect to GATT server
      const server = await this.device.gatt.connect();
      console.log('GATT conectado');

      // Get service
      const service = await server.getPrimaryService('0000ffe0-0000-1000-8000-00805f9b34fb');
      
      // Get characteristic
      this.characteristic = await service.getCharacteristic('0000ffe1-0000-1000-8000-00805f9b34fb');
      
      // Start notifications
      await this.characteristic.startNotifications();
      this.characteristic.addEventListener('characteristicvaluechanged', (event) => {
        const value = new TextDecoder().decode(event.target.value);
        this.handleReceived(value);
      });

      this.connected = true;
      this.reconnectAttempts = 0;
      console.log('Bluetooth conectado com sucesso');
      return true;

    } catch (error) {
      console.error('Erro BLE:', error);
      
      // Fallback: try Serial if BLE fails
      if ('serial' in navigator) {
        console.log('Tentando fallback para Serial...');
        return await this.connectSerial();
      }
      
      throw error;
    }
  }

  async connectSerial() {
    try {
      console.log('Tentando conexão Serial...');
      
      // Request serial port
      this.port = await navigator.serial.requestPort();
      
      // Open port
      await this.port.open({ baudRate: 115200 });
      
      // Setup reader
      const textDecoder = new TextDecoderStream();
      this.port.readable.pipeTo(textDecoder.writable);
      this.reader = textDecoder.readable.getReader();
      
      // Setup writer
      const textEncoder = new TextEncoderStream();
      textEncoder.readable.pipeTo(this.port.writable);
      this.writer = textEncoder.writable.getWriter();

      // Start reading
      this.readSerial();

      this.connected = true;
      this.reconnectAttempts = 0;
      console.log('Serial conectado com sucesso');
      return true;

    } catch (error) {
      console.error('Erro Serial:', error);
      throw error;
    }
  }

  async readSerial() {
    try {
      let buffer = '';
      while (true) {
        const { value, done } = await this.reader.read();
        if (done) break;
        
        buffer += value;
        
        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.trim()) {
            this.handleReceived(line.trim());
          }
        }
      }
    } catch (error) {
      console.error('Erro ao ler Serial:', error);
      this.connected = false;
    }
  }

  handleReceived(data) {
    console.log('<<', data);
    
    // Log to event log
    if (window.app) {
      window.app.addLog('RX: ' + data);
    }

    // Parse telemetry
    if (data.includes('|')) {
      if (this.telemetryCallback) {
        this.telemetryCallback(data);
      }
    }
  }

  async send(command, value = '') {
    if (!this.connected) {
      throw new Error('Não conectado');
    }

    const message = value !== '' ? `${command},${value}*` : `${command}*`;
    console.log('>>', message);

    // Log to event log
    if (window.app) {
      window.app.addLog('TX: ' + message);
    }

    try {
      if (this.characteristic) {
        // BLE
        const encoder = new TextEncoder();
        await this.characteristic.writeValue(encoder.encode(message));
      } else if (this.writer) {
        // Serial
        await this.writer.write(message + '\n');
      }
      return true;
    } catch (error) {
      console.error('Erro ao enviar:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.device && this.device.gatt.connected) {
        await this.device.gatt.disconnect();
      }
      if (this.reader) {
        await this.reader.cancel();
        this.reader = null;
      }
      if (this.writer) {
        await this.writer.close();
        this.writer = null;
      }
      if (this.port) {
        await this.port.close();
        this.port = null;
      }
      this.connected = false;
      console.log('Desconectado');
    } catch (error) {
      console.error('Erro ao desconectar:', error);
    }
  }

  onTelemetry(callback) {
    this.telemetryCallback = callback;
  }

  isConnected() {
    return this.connected;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// UI CONTROLLER
// ══════════════════════════════════════════════════════════════════════════════

class UIController {
  constructor() {
    this.currentPage = 'control';
    this.setupNavigation();
  }

  setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');

    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const targetPage = item.dataset.page;
        this.switchPage(targetPage);
      });
    });
  }

  switchPage(pageName) {
    if (this.currentPage === pageName) return;

    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === pageName);
    });

    // Update pages
    document.querySelectorAll('.page').forEach(page => {
      page.classList.toggle('active', page.id === `page-${pageName}`);
    });

    this.currentPage = pageName;
    
    // Scroll to top
    document.querySelector('.main').scrollTop = 0;
  }

  setConnectionStatus(status) {
    const dot = document.getElementById('conn-dot');
    const label = document.getElementById('conn-label');
    const btn = document.getElementById('btn-conn');

    dot.classList.remove('active', 'error', 'reconnecting');
    
    switch (status) {
      case 'connected':
        dot.classList.add('active');
        label.textContent = 'Conectado';
        btn.textContent = 'Desconectar';
        btn.classList.add('connected');
        break;
      case 'disconnected':
        dot.classList.add('error');
        label.textContent = 'Desconectado';
        btn.textContent = 'Conectar';
        btn.classList.remove('connected');
        break;
      case 'reconnecting':
        dot.classList.add('reconnecting');
        label.textContent = 'Reconectando...';
        btn.textContent = 'Conectar';
        btn.classList.remove('connected');
        break;
    }
  }

  updateSlider(elementId, value) {
    const slider = document.getElementById(elementId);
    const valueDisplay = document.getElementById(elementId.replace('slider-', '') + '-val');
    if (slider) slider.value = value;
    if (valueDisplay) valueDisplay.textContent = value;
  }

  showAlert(message, duration = 3000) {
    const alert = document.getElementById('alert');
    alert.textContent = message;
    alert.classList.add('show');
    
    if (navigator.vibrate) {
      navigator.vibrate(200);
    }

    setTimeout(() => {
      alert.classList.remove('show');
    }, duration);
  }

  updateBattery(voltage) {
    const valueEl = document.getElementById('battery-value');
    const fillEl = document.getElementById('battery-fill');
    
    valueEl.textContent = voltage.toFixed(1) + ' V';
    
    // Calculate percentage (assuming 7V-12.6V range)
    const percent = Math.max(0, Math.min(100, ((voltage - 7) / (12.6 - 7)) * 100));
    fillEl.style.width = percent + '%';
    
    // Color coding
    valueEl.classList.remove('warning', 'critical');
    fillEl.classList.remove('warning', 'critical');
    
    if (voltage < 8) {
      valueEl.classList.add('critical');
      fillEl.classList.add('critical');
      if (voltage < 7) {
        this.showAlert('⚠️ BATERIA CRÍTICA! Recarregue imediatamente.', 5000);
      }
    } else if (voltage < 11) {
      valueEl.classList.add('warning');
      fillEl.classList.add('warning');
    }
  }

  updateSensor(sensorId, value) {
    const dot = document.getElementById(sensorId);
    if (dot) {
      dot.classList.toggle('active', value === 1 || value === true || value === 'HIGH');
    }
  }

  updateLineSensor(sensorId, value) {
    const fillEl = document.getElementById(sensorId + '-fill');
    const valEl = document.getElementById(sensorId + '-val');
    
    if (fillEl && valEl) {
      // Value is 0-4095
      const percent = (value / 4095) * 100;
      fillEl.style.height = percent + '%';
      valEl.textContent = value;
    }
  }

  updateTimestamp() {
    const now = new Date();
    const time = now.toLocaleTimeString('pt-BR');
    const timestampEl = document.getElementById('telemetry-timestamp');
    if (timestampEl) {
      timestampEl.textContent = time;
    }
  }

  setStrategyStatus(strategyNum) {
    const statusEl = document.getElementById('strategy-status');
    const strategies = ['', 'Radar', 'Hunter', 'Firula', 'Suicida', 'Sovai', 'Contorno', 'Seg. Linha'];
    if (statusEl && strategyNum >= 1 && strategyNum <= 7) {
      statusEl.textContent = `Ativa: ${strategyNum} - ${strategies[strategyNum]}`;
      statusEl.classList.add('active');
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// STATE MANAGER
// ══════════════════════════════════════════════════════════════════════════════

const StateManager = {
  save(key, value) {
    try {
      localStorage.setItem('robo_' + key, JSON.stringify(value));
    } catch (error) {
      console.error('Erro ao salvar:', error);
    }
  },

  load(key, defaultValue = null) {
    try {
      const value = localStorage.getItem('robo_' + key);
      return value ? JSON.parse(value) : defaultValue;
    } catch (error) {
      console.error('Erro ao carregar:', error);
      return defaultValue;
    }
  },

  saveProfile(profileName, config) {
    this.save('profile_' + profileName, config);
  },

  loadProfile(profileName) {
    return this.load('profile_' + profileName, null);
  },

  getProfileConfig() {
    return {
      vr: parseInt(document.getElementById('slider-vr').value),
      vg: parseInt(document.getElementById('slider-vg').value),
      lip: parseInt(document.getElementById('slider-lip').value),
      lie: parseInt(document.getElementById('slider-lie').value),
      hbe: document.getElementById('toggle-hbe').checked ? 1 : 0
    };
  },

  applyProfileConfig(config) {
    if (!config) return;
    
    if (config.vr !== undefined) {
      document.getElementById('slider-vr').value = config.vr;
      document.getElementById('vr-val').textContent = config.vr;
    }
    if (config.vg !== undefined) {
      document.getElementById('slider-vg').value = config.vg;
      document.getElementById('vg-val').textContent = config.vg;
    }
    if (config.lip !== undefined) {
      document.getElementById('slider-lip').value = config.lip;
      document.getElementById('lip-val').textContent = config.lip;
    }
    if (config.lie !== undefined) {
      document.getElementById('slider-lie').value = config.lie;
      document.getElementById('lie-val').textContent = config.lie;
    }
    if (config.hbe !== undefined) {
      document.getElementById('toggle-hbe').checked = config.hbe === 1;
    }
  },

  addToHistory(command, value) {
    const history = this.load('history', []);
    history.unshift({
      command,
      value,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 50 entries
    if (history.length > 50) {
      history.length = 50;
    }
    
    this.save('history', history);
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════════════════════════

class App {
  constructor() {
    this.bt = new BluetoothManager();
    this.ui = new UIController();
    this.telemetryInterval = null;
    this.eventLog = [];
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.restoreLastConfig();
    this.setupTelemetry();
    this.addLog('[Sistema] App iniciado');
  }

  setupEventListeners() {
    // Connection
    document.getElementById('btn-conn').addEventListener('click', () => this.toggleConnection());

    // Emergency Stop
    document.getElementById('btn-emergency').addEventListener('click', () => this.emergencyStop());

    // Strategy Selection
    document.querySelectorAll('input[name="strategy"]').forEach(radio => {
      radio.addEventListener('change', (e) => this.selectStrategy(e.target.value));
    });

    // HBE Toggle
    document.getElementById('toggle-hbe').addEventListener('change', (e) => {
      this.sendCommand('HBE', e.target.checked ? 1 : 0);
    });

    // Manual Mode Toggle
    document.getElementById('toggle-manual').addEventListener('change', (e) => {
      const controls = document.getElementById('manual-controls');
      controls.style.display = e.target.checked ? 'block' : 'none';
    });

    // Manual Controls
    document.getElementById('slider-manual-speed').addEventListener('input', (e) => {
      document.getElementById('manual-speed-val').textContent = e.target.value;
    });

    const manualButtons = {
      'btn-forward': 'FRENTE',
      'btn-reverse': 'RE',
      'btn-left': 'ESQUERDA',
      'btn-right': 'DIREITA'
    };

    Object.entries(manualButtons).forEach(([id, command]) => {
      const btn = document.getElementById(id);
      btn.addEventListener('mousedown', () => {
        const speed = document.getElementById('slider-manual-speed').value;
        this.sendCommand(command, speed);
      });
      btn.addEventListener('mouseup', () => this.sendCommand('PARADA'));
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const speed = document.getElementById('slider-manual-speed').value;
        this.sendCommand(command, speed);
      });
      btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.sendCommand('PARADA');
      });
    });

    // Config Sliders
    const sliders = ['vr', 'vg', 'lip', 'lie'];
    sliders.forEach(id => {
      const slider = document.getElementById(`slider-${id}`);
      const valueDisplay = document.getElementById(`${id}-val`);
      
      slider.addEventListener('input', (e) => {
        valueDisplay.textContent = e.target.value;
      });
      
      slider.addEventListener('change', (e) => {
        const command = id.toUpperCase();
        this.sendCommand(command, e.target.value);
      });
    });

    // Calibrate IMU
    document.getElementById('btn-calibrate').addEventListener('click', () => {
      this.sendCommand('CALIBRAR');
      this.ui.showAlert('Calibrando IMU... Não mova o robô!');
    });

    // Profile Management
    document.getElementById('btn-save-profile').addEventListener('click', () => this.saveProfile());
    document.getElementById('btn-load-profile').addEventListener('click', () => this.loadProfile());

    // Diagnostic Tests
    document.getElementById('btn-test-motor-dir-fwd').addEventListener('click', () => {
      this.sendCommand('TESTE_MOTOR', 'DIR_FWD');
      this.ui.showAlert('Testando Motor Direito (Frente)', 1000);
    });
    document.getElementById('btn-test-motor-dir-rev').addEventListener('click', () => {
      this.sendCommand('TESTE_MOTOR', 'DIR_REV');
      this.ui.showAlert('Testando Motor Direito (Ré)', 1000);
    });
    document.getElementById('btn-test-motor-esq-fwd').addEventListener('click', () => {
      this.sendCommand('TESTE_MOTOR', 'ESQ_FWD');
      this.ui.showAlert('Testando Motor Esquerdo (Frente)', 1000);
    });
    document.getElementById('btn-test-motor-esq-rev').addEventListener('click', () => {
      this.sendCommand('TESTE_MOTOR', 'ESQ_REV');
      this.ui.showAlert('Testando Motor Esquerdo (Ré)', 1000);
    });

    document.getElementById('btn-read-sensors').addEventListener('click', () => {
      this.readSensors();
    });

    // LED Tests
    document.getElementById('btn-led1-on').addEventListener('click', () => this.sendCommand('LED', '1,1'));
    document.getElementById('btn-led1-off').addEventListener('click', () => this.sendCommand('LED', '1,0'));
    document.getElementById('btn-led2-on').addEventListener('click', () => this.sendCommand('LED', '2,1'));
    document.getElementById('btn-led2-off').addEventListener('click', () => this.sendCommand('LED', '2,0'));

    // Log Management
    document.getElementById('btn-export-log').addEventListener('click', () => this.exportLog());
    document.getElementById('btn-clear-log').addEventListener('click', () => this.clearLog());
  }

  async toggleConnection() {
    if (this.bt.isConnected()) {
      await this.bt.disconnect();
      this.ui.setConnectionStatus('disconnected');
      this.stopTelemetry();
    } else {
      try {
        await this.bt.connect();
        this.ui.setConnectionStatus('connected');
        this.startTelemetry();
        this.ui.showAlert('✓ Conectado com sucesso!');
      } catch (error) {
        this.ui.setConnectionStatus('disconnected');
        this.ui.showAlert('✗ Erro ao conectar: ' + error.message);
      }
    }
  }

  async sendCommand(command, value = '') {
    if (!this.bt.isConnected()) {
      this.ui.showAlert('⚠️ Não conectado!');
      return;
    }

    try {
      await this.bt.send(command, value);
      StateManager.addToHistory(command, value);
    } catch (error) {
      this.ui.showAlert('✗ Erro ao enviar comando');
      console.error(error);
    }
  }

  async emergencyStop() {
    try {
      await this.bt.send('PARADA');
      this.ui.showAlert('🛑 PARADA DE EMERGÊNCIA ATIVADA', 2000);
      
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
    } catch (error) {
      this.ui.showAlert('✗ Erro ao parar!');
    }
  }

  async selectStrategy(strategyNum) {
    await this.sendCommand('EST', strategyNum);
    this.ui.setStrategyStatus(parseInt(strategyNum));
    StateManager.save('last_strategy', strategyNum);
  }

  setupTelemetry() {
    this.bt.onTelemetry((data) => {
      this.parseTelemetry(data);
    });
  }

  parseTelemetry(data) {
    // Format: velocreta|velocgiro|HBEvasao|limiarParado|limiarEmpurrado|Vbat|sen_dir|sen_centro_dir|sen_centro_esq|sen_esq|sensorLD|sensorLE
    const parts = data.split('|');
    
    if (parts.length >= 12) {
      const [velocReta, velocGiro, hbe, limiarParado, limiarEmpurrado, 
             vbat, senDir, senCentroDir, senCentroEsq, senEsq, sensorLD, sensorLE] = parts;
      
      // Update battery
      const voltage = parseFloat(vbat);
      if (!isNaN(voltage)) {
        this.ui.updateBattery(voltage);
      }
      
      // Update digital sensors
      this.ui.updateSensor('sensor-dir', parseInt(senDir));
      this.ui.updateSensor('sensor-centro-dir', parseInt(senCentroDir));
      this.ui.updateSensor('sensor-centro-esq', parseInt(senCentroEsq));
      this.ui.updateSensor('sensor-esq', parseInt(senEsq));
      
      // Update line sensors
      this.ui.updateLineSensor('sensor-ld', parseInt(sensorLD));
      this.ui.updateLineSensor('sensor-le', parseInt(sensorLE));
      
      // Update timestamp
      this.ui.updateTimestamp();
    }
  }

  startTelemetry() {
    this.stopTelemetry();
    
    // Request telemetry every 100ms (10Hz)
    this.telemetryInterval = setInterval(async () => {
      if (this.bt.isConnected()) {
        try {
          await this.bt.send('dados');
        } catch (error) {
          console.error('Erro ao solicitar telemetria:', error);
        }
      }
    }, 100);
  }

  stopTelemetry() {
    if (this.telemetryInterval) {
      clearInterval(this.telemetryInterval);
      this.telemetryInterval = null;
    }
  }

  async readSensors() {
    await this.sendCommand('dados');
    
    setTimeout(() => {
      const display = document.getElementById('sensor-readings');
      const timestamp = new Date().toLocaleTimeString();
      display.innerHTML = `
        <div>[${timestamp}] Leitura solicitada.</div>
        <div>Aguardando resposta do ESP32...</div>
        <div>Verifique a aba TELEMETRIA para valores atualizados.</div>
      `;
    }, 100);
  }

  saveProfile() {
    const select = document.getElementById('profile-select');
    const profileName = select.value;
    
    if (!profileName) {
      this.ui.showAlert('Selecione um perfil para salvar');
      return;
    }
    
    const config = StateManager.getProfileConfig();
    StateManager.saveProfile(profileName, config);
    this.ui.showAlert(`✓ Perfil "${profileName}" salvo!`);
  }

  async loadProfile() {
    const select = document.getElementById('profile-select');
    const profileName = select.value;
    
    if (!profileName) {
      this.ui.showAlert('Selecione um perfil para carregar');
      return;
    }
    
    const config = StateManager.loadProfile(profileName);
    
    if (!config) {
      this.ui.showAlert('Perfil não encontrado');
      return;
    }
    
    // Apply to UI
    StateManager.applyProfileConfig(config);
    
    // Send all values to ESP32
    if (this.bt.isConnected()) {
      await this.sendCommand('VR', config.vr);
      await new Promise(resolve => setTimeout(resolve, 50));
      await this.sendCommand('VG', config.vg);
      await new Promise(resolve => setTimeout(resolve, 50));
      await this.sendCommand('LIP', config.lip);
      await new Promise(resolve => setTimeout(resolve, 50));
      await this.sendCommand('LIE', config.lie);
      await new Promise(resolve => setTimeout(resolve, 50));
      await this.sendCommand('HBE', config.hbe);
    }
    
    this.ui.showAlert(`✓ Perfil "${profileName}" carregado!`);
  }

  restoreLastConfig() {
    const lastStrategy = StateManager.load('last_strategy');
    if (lastStrategy) {
      const radio = document.getElementById(`strat-${lastStrategy}`);
      if (radio) radio.checked = true;
    }
    
    const lastProfile = StateManager.load('last_profile');
    if (lastProfile) {
      const config = StateManager.loadProfile(lastProfile);
      if (config) {
        StateManager.applyProfileConfig(config);
      }
    }
  }

  addLog(message) {
    const timestamp = new Date().toLocaleTimeString();
    const entry = `[${timestamp}] ${message}`;
    
    this.eventLog.unshift(entry);
    
    if (this.eventLog.length > 200) {
      this.eventLog.length = 200;
    }
    
    const logViewer = document.getElementById('log-viewer');
    if (logViewer) {
      const div = document.createElement('div');
      div.className = 'log-entry';
      div.textContent = entry;
      logViewer.insertBefore(div, logViewer.firstChild);
      
      // Keep only last 50 in DOM
      while (logViewer.children.length > 50) {
        logViewer.removeChild(logViewer.lastChild);
      }
    }
  }

  exportLog() {
    const text = this.eventLog.join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `robo-log-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    
    URL.revokeObjectURL(url);
    this.ui.showAlert('✓ Log exportado!');
  }

  clearLog() {
    this.eventLog = [];
    const logViewer = document.getElementById('log-viewer');
    if (logViewer) {
      logViewer.innerHTML = '<div class="log-entry">[Sistema] Log limpo</div>';
    }
    this.ui.showAlert('✓ Log limpo');
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// INITIALIZE
// ══════════════════════════════════════════════════════════════════════════════

let app;

document.addEventListener('DOMContentLoaded', () => {
  app = new App();
  window.app = app; // Make available globally for debugging
  console.log('RoboCtrl inicializado');
});

// Service Worker registration for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      console.log('Service Worker não registrado (arquivo sw.js não encontrado)');
    });
  });
}
