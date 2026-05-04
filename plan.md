# Capacitor Bluetooth LE Migration & APK Build Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Sumo Robot control app from Web Bluetooth to native Capacitor stack with automatic BLE device discovery, haptic feedback, persistent connection, and build to functional APK via ADB on Android device.

**Architecture:** 
1. Replace Web Bluetooth API with @capacitor-community/bluetooth-le (BLE UART)
2. Implement auto-discovery: user clicks button → app searches for "Madinboo" device → vibrate on found
3. Use @capacitor/preferences for last-device persistence  
4. Use @capacitor/haptics for haptic feedback throughout UI
5. Fix build blockers: downgrade Capacitor v4→v5, set correct Java compatibility (1.8), use AGP 7.4.2
6. Build and deploy APK via Gradle, test via ADB on connected device

**Tech Stack:** 
- Capacitor 5.7 (pinned version)
- @capacitor-community/bluetooth-le (BLE UART)
- @capacitor/haptics, @capacitor/preferences
- TypeScript, HTML/CSS
- Gradle 7.5.1, AGP 7.4.2, Java 1.8 source compatibility

---

## File Structure

### Frontend (Web Assets)
- `app/src/majinboo.html` - Main UI, remove Web Bluetooth message, add auto-search button
- `app/src/bluetooth-service.ts` - Replace Web Bluetooth with BLE service layer
- `app/src/bluetooth-adapter.ts` - UI bridge, integrate haptics + auto-discovery
- `app/src/main.ts` - Initialize Capacitor plugins at startup

### Capacitor Configuration
- `app/capacitor.config.json` - Configure plugins (BLE, preferences, haptics)
- `app/package.json` - Lock Capacitor v5.7, add BLE library
- `app/android/build.gradle` - Set AGP 7.4.2, compileSdk 34
- `app/android/app/build.gradle` - Java 1.8 compatibility
- `app/android/gradle.properties` - Suppress warnings

### Android Native (Already exists, verify compatibility)
- `app/android/app/src/main/java/.../BluetoothClassicService.java` - Keep for reference, but will use BLE plugin instead
- `app/android/MainActivity.java` - Ensure Capacitor initialization

---

## Tasks

### Task 1: Fix Capacitor Build Configuration (Java 1.8 + AGP 7.4.2)

**Files:**
- Modify: `app/android/build.gradle`
- Modify: `app/android/app/build.gradle`
- Modify: `app/android/gradle.properties`

- [ ] **Step 1: Verify current AGP version**

Run: `grep "classpath 'com.android.tools.build" /home/kali/Repos/SumoApp/app/android/build.gradle`

Expected: Currently shows AGP 7.3.1 or similar. We'll set 7.4.2.

- [ ] **Step 2: Update top-level build.gradle to AGP 7.4.2**

Replace in `/app/android/build.gradle`:
```gradle
buildscript {
  repositories {
    google()
    mavenCentral()
  }
  dependencies {
    classpath 'com.android.tools.build:gradle:7.4.2'
  }
}

allprojects {
  repositories {
    google()
    mavenCentral()
  }
}

ext {
  compileSdkVersion = 34
  minSdkVersion = 26
  targetSdkVersion = 34
  buildToolsVersion = "34.0.0"
  suppressUnsupportedSdk = true
}
```

- [ ] **Step 3: Ensure Java 1.8 source compatibility in app/build.gradle**

Replace in `/app/android/app/build.gradle` (compileOptions section):
```gradle
compileOptions {
  sourceCompatibility JavaVersion.VERSION_1_8
  targetCompatibility JavaVersion.VERSION_1_8
}
```

- [ ] **Step 4: Update gradle.properties to suppress JDK image warnings**

Replace content of `/app/android/gradle.properties`:
```properties
org.gradle.jvmargs=-Xmx4096m
org.gradle.parallel=true
android.useAndroidX=true
android.enableJetifier=true
android.suppressUnsupportedCompileSdk=34
compileSdk=34
buildToolsVersion=34.0.0
# Disable experimental JDK image transform to avoid Java 21 jlink errors
android.experimental.jdk.image.enabled=false
```

- [ ] **Step 5: Downgrade Capacitor/Android to v5.7 for Java 1.8 compatibility**

Run from `/app`:
```bash
npm install @capacitor/android@^5.7 @capacitor/core@^5.7 --save
```

Expected: Dependencies update to 5.7.x versions

- [ ] **Step 6: Sync Capacitor configuration**

Run from `/app`:
```bash
npx cap sync android
```

Expected: "Sync finished" message with no errors

- [ ] **Step 7: Test configuration with gradlew help**

Run from `/app/android`:
```bash
./gradlew help 2>&1 | head -20
```

Expected: Gradle 7.5+ version shown, no jlink errors

- [ ] **Step 8: Commit**

```bash
cd /home/kali/Repos/SumoApp && git add app/android/build.gradle app/android/app/build.gradle app/android/gradle.properties app/package.json && git commit -m "fix: downgrade Capacitor to v5.7, set AGP 7.4.2 + Java 1.8 compatibility"
```

---

### Task 2: Install BLE & Haptics Plugins

**Files:**
- Modify: `app/package.json`
- Modify: `app/capacitor.config.json`

- [ ] **Step 1: Install @capacitor-community/bluetooth-le**

Run from `/app`:
```bash
npm install @capacitor-community/bluetooth-le @capacitor/haptics @capacitor/preferences @capacitor-community/keep-awake --save
```

Expected: 4 packages added to package.json

- [ ] **Step 2: Update capacitor.config.json to register plugins**

Replace plugins section in `/app/capacitor.config.json`:
```json
{
  "appId": "com.dragonbotz.sumoapp",
  "appName": "SumoApp",
  "webDir": "www",
  "plugins": {
    "BluetoothLe": {
      "displayStrings": {
        "scanning": "Procurando robôs...",
        "cancel": "Cancelar",
        "availableDevices": "Dispositivos disponíveis",
        "noDeviceFound": "Nenhum dispositivo encontrado"
      }
    },
    "KeepAwake": {
      "enable": true
    }
  }
}
```

- [ ] **Step 3: Sync plugins to Android**

Run from `/app`:
```bash
npx cap sync android
```

Expected: Plugins copied to android modules

- [ ] **Step 4: Commit**

```bash
cd /home/kali/Repos/SumoApp && git add app/package.json app/capacitor.config.json && git commit -m "feat: add BLE, haptics, preferences plugins"
```

---

### Task 3: Rewrite Bluetooth Service for BLE

**Files:**
- Create: `app/src/ble-service.ts` (replaces bluetooth-service.ts)
- Delete: `app/src/bluetooth-service.ts` (old Bluetooth Classic)

- [ ] **Step 1: Create new BLE service with auto-discovery**

Create `/app/src/ble-service.ts`:
```typescript
import { BleClient, numberToUUID } from '@capacitor-community/bluetooth-le';
import { Preferences } from '@capacitor/preferences';
import { Haptics } from '@capacitor/haptics';

export interface BluetoothDevice {
  name: string;
  deviceId: string;
}

export class BLEService {
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private connectedDevice: BluetoothDevice | null = null;
  private scanInProgress = false;
  private commandQueue: string[] = [];
  private isConnected = false;

  // UART Service & Characteristics UUIDs
  private readonly SERVICE_UUID = '6E400001-B5A3-F393-E0A9-E50E24DCCA9E';
  private readonly TX_CHAR = '6E400002-B5A3-F393-E0A9-E50E24DCCA9E'; // Write to robot
  private readonly RX_CHAR = '6E400003-B5A3-F393-E0A9-E50E24DCCA9E'; // Read from robot
  private readonly ROBOT_NAME = 'Madinboo';

  constructor() {
    this.initBLE();
  }

  private async initBLE() {
    try {
      await BleClient.initialize();
      console.log('BLE initialized');
      this.emit('bleReady', {});
    } catch (err) {
      console.error('BLE init error:', err);
      this.emit('error', { message: 'Falha ao inicializar Bluetooth' });
    }
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: (data: any) => void) {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, data: any) {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }

  // Auto-discovery: scan for robot, vibrate when found
  async startAutoDiscovery() {
    if (this.scanInProgress) return;
    this.scanInProgress = true;
    this.emit('scanningState', { scanning: true });

    try {
      await BleClient.requestLEScan(
        { services: [] },
        async (result) => {
          if (result.device.name?.includes(this.ROBOT_NAME)) {
            // Device found!
            await Haptics.vibrate({ duration: 100 });
            await Haptics.vibrate({ duration: 100 });
            this.emit('deviceFound', {
              name: result.device.name,
              deviceId: result.device.deviceId,
            });
            // Auto-connect
            await this.connect({
              name: result.device.name,
              deviceId: result.device.deviceId,
            });
            await this.stopScan();
          }
        }
      );
    } catch (err) {
      console.error('Scan error:', err);
      this.emit('error', { message: 'Erro ao procurar dispositivos' });
      this.scanInProgress = false;
    }
  }

  private async stopScan() {
    try {
      await BleClient.stopLEScan();
      this.scanInProgress = false;
      this.emit('scanningState', { scanning: false });
    } catch (err) {
      console.error('Stop scan error:', err);
    }
  }

  async connect(device: BluetoothDevice) {
    try {
      await BleClient.connect(device.deviceId);
      this.connectedDevice = device;
      this.isConnected = true;

      // Save last device
      await Preferences.set({
        key: 'lastDevice',
        value: JSON.stringify(device),
      });

      // Vibrate on connect
      await Haptics.vibrate({ duration: 50 });

      // Start listening for data
      await this.startNotifications(device.deviceId);

      this.emit('connected', device);
    } catch (err) {
      console.error('Connect error:', err);
      this.emit('error', { message: 'Falha ao conectar' });
      this.isConnected = false;
    }
  }

  async disconnect() {
    if (!this.connectedDevice) return;

    try {
      await BleClient.disconnect(this.connectedDevice.deviceId);
      this.isConnected = false;
      this.emit('disconnected', {});
    } catch (err) {
      console.error('Disconnect error:', err);
    }
  }

  private async startNotifications(deviceId: string) {
    try {
      await BleClient.startNotifications(
        deviceId,
        this.SERVICE_UUID,
        this.RX_CHAR,
        (value) => {
          const text = new TextDecoder().decode(value);
          this.emit('dataReceived', { data: text });
        }
      );
    } catch (err) {
      console.error('Notification error:', err);
    }
  }

  async sendCommand(command: string) {
    if (!this.connectedDevice || !this.isConnected) {
      console.warn('Not connected');
      return;
    }

    try {
      const data = new TextEncoder().encode(command + '\n');
      await BleClient.write(
        this.connectedDevice.deviceId,
        this.SERVICE_UUID,
        this.TX_CHAR,
        data
      );
      console.log('Command sent:', command);
    } catch (err) {
      console.error('Write error:', err);
      this.emit('error', { message: 'Erro ao enviar comando' });
    }
  }

  async tryAutoReconnect() {
    try {
      const stored = await Preferences.get({ key: 'lastDevice' });
      if (stored.value) {
        const device: BluetoothDevice = JSON.parse(stored.value);
        console.log('Attempting auto-reconnect to:', device.name);
        await this.connect(device);
      }
    } catch (err) {
      console.error('Auto-reconnect error:', err);
    }
  }

  isConnectedToDevice(): boolean {
    return this.isConnected;
  }

  getConnectedDevice(): BluetoothDevice | null {
    return this.connectedDevice;
  }
}

export const bleService = new BLEService();
```

- [ ] **Step 2: Delete old Bluetooth Classic service**

Run:
```bash
rm /home/kali/Repos/SumoApp/app/src/bluetooth-service.ts
```

- [ ] **Step 3: Update bluetooth-adapter.ts to use BLE service**

Replace entire `/app/src/bluetooth-adapter.ts`:
```typescript
import { bleService } from './ble-service';
import { Haptics } from '@capacitor/haptics';

export class BluetoothAdapter {
  private statusElement: HTMLElement | null = null;
  private commandButtons: HTMLElement | null = null;

  constructor() {
    this.attachListeners();
    this.updateUI();
  }

  private attachListeners() {
    bleService.on('connected', (device) => {
      console.log('Connected to:', device);
      this.updateUI();
      this.showStatus(`Conectado: ${device.name}`, 'success');
    });

    bleService.on('disconnected', () => {
      console.log('Disconnected');
      this.updateUI();
      this.showStatus('Desconectado', 'default');
    });

    bleService.on('dataReceived', (data) => {
      console.log('Data received:', data);
      this.handleTelemetry(data.data);
    });

    bleService.on('error', (err) => {
      console.error('BLE error:', err);
      this.showStatus(err.message, 'error');
    });

    bleService.on('scanningState', (state) => {
      if (state.scanning) {
        this.showStatus('Procurando robô...', 'scanning');
      }
    });

    bleService.on('deviceFound', (device) => {
      this.showStatus(`Robô encontrado: ${device.name}`, 'success');
    });
  }

  async handleBluetoothButtonClick() {
    if (bleService.isConnectedToDevice()) {
      await bleService.disconnect();
    } else {
      // Vibrate to indicate search start
      await Haptics.vibrate({ duration: 75 });
      await bleService.startAutoDiscovery();
    }
    this.updateUI();
  }

  async sendCommand(cmd: string, value?: number) {
    const command = value !== undefined ? `${cmd},${value}*` : `${cmd}*`;
    await bleService.sendCommand(command);
    await Haptics.vibrate({ duration: 30 });
  }

  private showStatus(message: string, status: string) {
    const statusEl = document.getElementById('status-message');
    if (statusEl) {
      statusEl.textContent = message;
      statusEl.className = `status-${status}`;
    }
  }

  private handleTelemetry(data: string) {
    // Parse telemetry data from robot and update UI
    if (data.startsWith('dados:')) {
      const values = data.substring(6).split('|');
      this.updateTelemetryUI(values);
    }
  }

  private updateTelemetryUI(values: string[]) {
    // Update battery, sensors, speeds on UI
    const battery = document.getElementById('battery-level');
    if (battery && values[5]) {
      battery.textContent = values[5] + 'V';
    }
  }

  private updateUI() {
    const connectBtn = document.getElementById('connect-btn');
    if (connectBtn) {
      const isConnected = bleService.isConnectedToDevice();
      connectBtn.textContent = isConnected ? 'Desconectar' : 'Conectar Bluetooth';
      connectBtn.className = isConnected ? 'btn-connected' : 'btn-default';
    }
  }

  async init() {
    // Try to auto-reconnect on app startup
    await bleService.tryAutoReconnect();
    this.updateUI();
  }
}

export const bluetoothAdapter = new BluetoothAdapter();
```

- [ ] **Step 4: Update main.ts to initialize Capacitor + BLE**

Replace `/app/src/main.ts`:
```typescript
import { CapacitorUpdater } from '@capacitor/updater';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar } from '@capacitor/status-bar';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { bluetoothAdapter } from './bluetooth-adapter';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Initialize status bar
    await StatusBar.setBackgroundColor({ color: '#080C14' });
    StatusBar.setStyle({ style: 'light' });

    // Initialize keep-awake
    await KeepAwake.enable();

    // Initialize Bluetooth adapter
    await bluetoothAdapter.init();

    // Hide splash screen after 1.5s
    setTimeout(() => {
      SplashScreen.hide().catch(() => {});
    }, 1500);
  } catch (err) {
    console.error('Init error:', err);
  }
});
```

- [ ] **Step 5: Commit**

```bash
cd /home/kali/Repos/SumoApp && git add app/src/ble-service.ts app/src/bluetooth-adapter.ts app/src/main.ts && git commit -m "feat: implement BLE service with auto-discovery and haptic feedback"
```

---

### Task 4: Update HTML UI - Remove Web Bluetooth Message, Add Auto-Discovery Button

**Files:**
- Modify: `app/src/majinboo.html`

- [ ] **Step 1: Find and replace Web Bluetooth warning message**

In `/app/src/majinboo.html`, find the section around line 800-900 with:
```html
Requer BLE UART (Nordic UART Service) no ESP32.
Classic BT (SPP) não é suportado por navegadores web.
```

Replace with:
```html
<div id="ble-info-box" style="
  background: var(--card2);
  border: 1px solid var(--border2);
  border-radius: var(--radius);
  padding: 16px;
  margin-bottom: 16px;
  text-align: center;
">
  <p style="color: var(--accent2); font-weight: 600; margin-bottom: 8px;">
    🔌 Bluetooth LE (BLE UART - Nordic UART Service)
  </p>
  <p style="color: var(--muted); font-size: 14px;">
    Conecte-se ao robô Madinboo através de Bluetooth nativo.<br />
    A busca automática encontrará o dispositivo.
  </p>
</div>
```

- [ ] **Step 2: Update Bluetooth connection button click handler**

Find the button with ID or text "Conectar via Bluetooth" (search for "Bluetooth" in the HTML around line 400-600).

Update the onclick handler to call:
```html
<button id="connect-btn" class="btn-primary" 
  onclick="window.bluetoothAdapter?.handleBluetoothButtonClick()">
  Conectar Bluetooth
</button>
```

Ensure the button has ID `connect-btn` so bluetooth-adapter.ts can update it.

- [ ] **Step 3: Add status message display element**

Add this anywhere in the main UI (near the connection button):
```html
<div id="status-message" class="status-default" style="
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 12px;
  text-align: center;
  background: var(--card);
  color: var(--text);
  font-size: 14px;
  transition: all 0.3s;
  min-height: 20px;
">
  Pronto para conectar
</div>

<style>
  .status-default { background: var(--card); color: var(--text); }
  .status-success { background: rgba(0, 232, 122, 0.1); color: var(--success); }
  .status-error { background: rgba(255, 45, 85, 0.1); color: var(--danger); }
  .status-scanning { background: rgba(0, 212, 255, 0.1); color: var(--accent2); }
</style>
```

- [ ] **Step 4: Update command buttons to use new adapter**

Find all command buttons (EST, VR, VG, PARADA) and update their onclick handlers:

For example, change from:
```html
onclick="sendStrategy(1)"
```

To:
```html
onclick="window.bluetoothAdapter?.sendCommand('EST', 1)"
```

Do this for all velocity/strategy/stop buttons.

- [ ] **Step 5: Build web assets**

Run from `/app`:
```bash
npm run build
```

Expected: Output to `www/` directory

- [ ] **Step 6: Commit**

```bash
cd /home/kali/Repos/SumoApp && git add app/src/majinboo.html && git commit -m "feat: update UI - remove Web Bluetooth warning, add auto-discovery button"
```

---

### Task 5: Build Android Debug APK

**Files:**
- Reference: `app/android/build.gradle`
- Reference: `app/android/app/build.gradle`
- Output: `app/android/app/build/outputs/apk/debug/app-debug.apk`

- [ ] **Step 1: Clean previous build artifacts**

Run from `/app/android`:
```bash
rm -rf .gradle build app/build ~/.gradle/caches/transforms-* 2>/dev/null || true
```

- [ ] **Step 2: Sync Capacitor configuration again**

Run from `/app`:
```bash
npx cap sync android
```

Expected: "Sync finished" with no errors

- [ ] **Step 3: Build APK using gradle wrapper**

Run from `/app/android`:
```bash
./gradlew --no-daemon -Dorg.gradle.java.home=/usr/lib/jvm/java-21-openjdk-amd64 assembleDebug 2>&1 | tail -100
```

Expected: "BUILD SUCCESSFUL" message after 2-3 minutes

- [ ] **Step 4: Verify APK was created**

Run:
```bash
ls -lh /home/kali/Repos/SumoApp/app/android/app/build/outputs/apk/debug/app-debug.apk
```

Expected: File exists, size > 30MB

- [ ] **Step 5: Commit**

```bash
cd /home/kali/Repos/SumoApp && git add app/www && git commit -m "build: generate APK with BLE + haptics"
```

---

### Task 6: Deploy APK via ADB and Test on Device

**Files:**
- Reference: `app/android/app/build/outputs/apk/debug/app-debug.apk`
- Target: Connected Android device

- [ ] **Step 1: Check ADB connection**

Run:
```bash
adb devices -l
```

Expected: Device listed as "device" or "offline"

- [ ] **Step 2: If offline, enable USB debugging and reconnect**

On the Android device:
- Go to Settings → Developer Options → USB Debugging (enable)
- Reconnect USB cable
- On the device, tap "Allow" when prompted

Run:
```bash
adb devices -l
```

Expected: Device now shows as "device"

- [ ] **Step 3: Install APK on device**

Run:
```bash
adb install -r /home/kali/Repos/SumoApp/app/android/app/build/outputs/apk/debug/app-debug.apk
```

Expected: "Success" message

- [ ] **Step 4: Verify app installed**

Run:
```bash
adb shell pm list packages | grep sumoapp
```

Expected: `com.dragonbotz.sumoapp` listed

- [ ] **Step 5: Clear app data (first run)**

Run:
```bash
adb shell pm clear com.dragonbotz.sumoapp
```

- [ ] **Step 6: Launch app on device**

Run:
```bash
adb shell am start -n com.dragonbotz.sumoapp/.MainActivity
```

- [ ] **Step 7: Watch logcat for startup messages**

Run in another terminal:
```bash
adb logcat -s "SumoApp:*" | grep -i "ble\|bluetooth\|connected\|error"
```

Expected: "BLE initialized" message within 3 seconds

- [ ] **Step 8: Test UI visibility**

On device (or via logcat output):
- Splash screen should fade after ~1.5 seconds
- Main UI should appear with "Conectar Bluetooth" button
- Status message should show "Pronto para conectar"

- [ ] **Step 9: Power on robot and verify discovery**

On the Sumo Robot:
- Power on robot
- Ensure Bluetooth advertising is active (LED indicator or beep)
- Verify device name is "Madinboo" or "Madinboo_BT"

On app:
- Tap "Conectar Bluetooth" button
- App should vibrate phone twice when robot is found
- Status should change to "Robô encontrado: Madinboo"
- Button text should change to "Desconectar"

- [ ] **Step 10: Test telemetry reception**

Once connected:
- Verify telemetry values appear on screen (battery, sensors, speeds)
- Values should update in real-time

- [ ] **Step 11: Test command transmission**

In app:
- Tap a strategy button (EST)
- Tap velocity increase button
- Watch logcat for "sendCmd: EST,..."
- Verify robot responds (motors engage, LED changes, etc.)

- [ ] **Step 12: Test disconnect**

In app:
- Tap "Desconectar" button
- Button text should return to "Conectar Bluetooth"
- Logcat should show "Disconnected"

- [ ] **Step 13: Test auto-reconnect**

Close and relaunch app:
- App should automatically attempt to reconnect to last device
- If robot is powered on and nearby, should reconnect within 3 seconds

- [ ] **Step 14: Check for any crashes**

Run:
```bash
adb logcat | grep -i "exception\|crash\|anr"
```

Expected: No crashes or ANRs during any test

- [ ] **Step 15: Final verification - Check app settings**

In app (if settings available):
- Verify haptics are enabled
- Verify last device is saved in preferences
- Verify BLE remains active in background

- [ ] **Step 16: Commit final state**

```bash
cd /home/kali/Repos/SumoApp && git add -A && git commit -m "build: successful APK build and ADB deployment - 100% functional"
```

---

## Spec Coverage Checklist

✓ **Remove Web Bluetooth message** - Task 4, Step 1  
✓ **Auto-discovery on button click** - Task 3, BLEService.startAutoDiscovery()  
✓ **Vibrate on device found** - Task 3, Haptics.vibrate() in deviceFound listener  
✓ **Use BLE UART (Nordic)** - Task 3, correct UUIDs in BLEService  
✓ **Use @capacitor-community/bluetooth-le** - Task 2  
✓ **Use @capacitor/haptics** - Task 3, haptic feedback integrated  
✓ **Use @capacitor/preferences** - Task 3, lastDevice persistence  
✓ **Use @capacitor-community/keep-awake** - Task 3, main.ts initialization  
✓ **Fix build blocker** - Task 1, AGP 7.4.2 + Java 1.8  
✓ **Build APK** - Task 5  
✓ **Deploy via ADB** - Task 6, Steps 1-5  
✓ **Test on connected device** - Task 6, Steps 6-16  

---

## Critical Dependencies

- **Task 1 must complete before Task 5** (build config must be fixed first)
- **Task 2 must complete before Task 3** (plugins must be installed)
- **Task 3 must complete before Task 4** (adapter must exist before UI updates)
- **Task 4 must complete before Task 5** (web assets must be built)
- **Task 5 must complete before Task 6** (APK must be built before deployment)

