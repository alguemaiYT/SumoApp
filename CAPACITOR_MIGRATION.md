# SumoApp Capacitor Migration - Implementation Summary (May 2026)

## Overview
Successfully completed the conversion of the web-based robot controller (`web/majinboo.html`) into a native Android application using Capacitor, with native Bluetooth Classic support to maintain compatibility with the ESP32 firmware.

## Key Deliverables

### 1. Capacitor Project Structure (`app/`)
**Files Created:**
- `package.json` - Dependencies: @capacitor/core, haptics, preferences, splash-screen, status-bar, keep-awake
- `capacitor.config.json` - App ID: `com.dragonbotz.sumoapp`
- `tsconfig.json` & `vite.config.ts` - TypeScript + Vite build pipeline
- `src/index.html` - Capacitor entry point
- `src/main.ts` - Plugin initialization with SplashScreen, StatusBar, and bluetooth-adapter import
- `src/style.css` - Safe-area aware wrapper styles
- `src/majinboo.html` - Copied from `web/majinboo.html` with updated UI callbacks

**Build Scripts:**
- `npm run build` - Vite build to `www/`
- `npm run cap:add:android` - Add Android platform
- `npm run cap:sync:android` - Sync web assets + plugins to Android
- `npm run cap:open:android` - Open in Android Studio
- `npm run cap:run:android` - Build and deploy to connected device

### 2. Native Android Bridge

**BluetoothClassicService.java** (Core Service)
- Manages RFCOMM/SPP socket connections
- Device discovery via BroadcastReceiver
- Automatic filter for `Madinboo_BT` device
- Read thread for continuous telemetry parsing
- Command transmission with UTF-8 encoding
- Graceful disconnect and error handling

**BluetoothClassicPlugin.java** (Capacitor Plugin)
- Exposes service methods to JavaScript: `startDiscovery()`, `stopDiscovery()`, `connect()`, `disconnect()`, `sendCommand()`
- Permission request wrapper
- Event forwarding: `deviceFound`, `connected`, `disconnected`, `dataReceived`, `error`, `scanningState`
- Filters discovery results for "Madinboo" devices

**AndroidManifest.xml** (Permissions)
- BLUETOOTH, BLUETOOTH_ADMIN (basic connectivity)
- BLUETOOTH_SCAN, BLUETOOTH_CONNECT (Android 12+ runtime)
- ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION (required for BT discovery)
- INTERNET (baseline)

### 3. TypeScript Service Layer

**bluetooth-service.ts** (Abstraction)
- `BluetoothService` class wraps native plugin with event emitter
- Methods: `isAvailable()`, `isEnabled()`, `isConnected()`, `startDiscovery()`, `stopDiscovery()`, `connect()`, `disconnect()`, `sendCommand()`
- Preferences integration: stores `lastDevice` JSON for auto-reconnect
- Haptics integration: vibration on connect (200ms + 100ms pattern)
- Global singleton: `bluetoothService`

**bluetooth-adapter.ts** (UI Integration)
- Async `initializeBluetoothAdapter()` - called on app startup
- Requests permissions on launch
- Restores last connected device from Preferences
- Registers event listeners and forwards to `window.onNative*` callbacks
- Exports: `nativeStartConnect()`, `nativeStopConnect()`, `nativeSendCommand()`
- Integrates KeepAwake during active connection

**bluetooth-web.ts** (Web Fallback)
- No-op implementation for web platform
- Allows development without mobile runtime

### 4. UI Refactoring

**Updated `app/src/majinboo.html`**
- Changed splash message from "BLE UART / Nordic UART Service" to "Bluetooth Classic (SPP)"
- Removed Web Bluetooth UUID constants (no longer needed)
- Refactored `startConnect()` to call `window.nativeStartConnect()`
- Replaced `sendCmd()` to call `window.nativeSendCommand()` instead of `txChar.writeValue()`
- Updated `disconnect()` to call native cleanup
- Added callback handlers: `onNativeBluetoothConnected()`, `onNativeBluetoothDisconnected()`, `onNativeBluetoothData()`, `onNativeBluetoothError()`
- Protocol preserved: LISTA, DEBUG, EST, PARADA commands unchanged; telemetry parsing (pipe-delimited) identical

**Callback Flow:**
```
User taps "Conectar" 
  → startConnect() calls nativeStartConnect() 
  → Native discovers Madinboo_BT 
  → onDeviceFound event → vibrates (100ms) 
  → Auto-connect triggered 
  → onConnected event → vibrates (200ms + 100ms), KeepAwake.keepAwake() 
  → onNativeBluetoothConnected() updates UI 
  → launchApp("ble"), sends LISTA + DEBUG 1
  → onDataReceived events flow through onNativeBluetoothData() → parseData()
```

### 5. Documentation

**README.md** (Comprehensive guide)
- Setup prerequisites and installation steps
- Development commands (dev server, build, deploy)
- Feature list with plugin integrations
- Protocol documentation (commands + telemetry format)
- Permissions explanation
- Troubleshooting section

**IMPLEMENTATION_CHECKLIST.md** (Phase tracking)
- 5 phases with completion status
- Next steps for build & deployment
- Known limitations (iOS deferred, web no native BT, no background notifications yet)
- Future enhancements (BLE support, iOS, device management UI)

## Key Decisions

1. **Bluetooth Classic/SPP** (not BLE) chosen because ESP32 firmware currently uses `BluetoothSerial` (SPP profile)
2. **Android-first** scope to avoid complexity of cross-platform development; iOS deferred
3. **Auto-discovery** on app launch and on button tap; no manual device list UI (uses system pairing)
4. **Haptics feedback** on device found (100ms) and connected (200ms + 100ms pattern)
5. **Preferences** for persistent `lastDevice` to enable fast reconnect
6. **Protocol stability** - no changes to command format or telemetry layout

## Protocol Unchanged

**Commands (App → Robot):** `COMANDO,VALOR*\n`
- EST, VR, VG, HBE, LIP, LIE, PARADA, LISTA, DEBUG, dados

**Telemetry (Robot → App):** Pipe-delimited
```
velocreta|velocgiro|HBEvasao|limiarParado|limiarEmpurrado|Vbat|sen_dir|sen_centro_dir|sen_centro_esq|sen_esq|sensorLD|sensorLE
```

## Platform & Dependencies

| Component | Version | Notes |
|-----------|---------|-------|
| Capacitor | 5.5.1 | Core platform |
| @capacitor/haptics | 5.0.6 | Vibration feedback |
| @capacitor/preferences | 5.0.6 | Persistent storage |
| @capacitor/keep-awake | 5.0.6 | Screen control during match |
| @capacitor/splash-screen | 5.0.6 | Native launch screen |
| @capacitor/status-bar | 5.0.6 | Dark theme bar |
| Vite | 5.0.0 | Build tool |
| TypeScript | 5.3.3 | Language |
| Node | 16+ | Runtime |
| Android SDK | 31+ | Target platform |

## Build Path

```bash
cd app/
npm install
npm run cap:add:android
npm run build
npm run cap:sync:android
npm run cap:open:android  # Opens Android Studio
# Build APK via Studio or:
npm run cap:build:android
# Deploy to device:
npm run cap:run:android
```

## Testing Checklist

- [ ] App launches without runtime errors
- [ ] Tap "Conectar" starts discovery (UI shows "Procurando…")
- [ ] Robot `Madinboo_BT` detected and phone vibrates
- [ ] Connection succeeds and phone vibrates again
- [ ] UI shows "Conectado · IR pendente"
- [ ] Telemetry updates in real-time (battery, sensors, velocities)
- [ ] Strategy list loads (LISTA command works)
- [ ] Can change strategy (EST command works)
- [ ] Can adjust velocities (VR, VG commands work)
- [ ] Emergency stop button sends PARADA
- [ ] Close app and relaunch → device remembered (Preferences)
- [ ] Keep-awake active during connection (screen doesn't dim)
- [ ] Disconnect shows "Desconectado" after 2s delay

## Future Work

1. **BLE Support** - Requires firmware migration on ESP32; would swap native bridge to `@capacitor-community/bluetooth-le`
2. **iOS Platform** - Add iOS project; reuse web layer but different native bridge
3. **Device Management UI** - Settings screen to view/forget paired devices
4. **Reconnection UI** - Show retry attempts and estimated time
5. **Background Notifications** - Match updates while app is backgrounded
6. **Battery Indicator** - Show robot battery in status bar or persistent notification
7. **Telemetry Logging** - Record sensor data for post-match analysis
8. **WebRTC/Streaming** - Real-time camera feed (if camera added to robot)

## Files Modified/Created

### Created (Core)
- `/app/package.json`
- `/app/capacitor.config.json`
- `/app/tsconfig.json`
- `/app/vite.config.ts`
- `/app/src/index.html`
- `/app/src/main.ts`
- `/app/src/style.css`
- `/app/src/majinboo.html` (copied from web/)
- `/app/src/bluetooth-service.ts`
- `/app/src/bluetooth-adapter.ts`
- `/app/src/web/bluetooth-web.ts`
- `/app/android/app/src/main/java/com/dragonbotz/sumoapp/BluetoothClassicService.java`
- `/app/android/app/src/main/java/com/dragonbotz/sumoapp/BluetoothClassicPlugin.java`
- `/app/android/app/src/main/AndroidManifest.xml`

### Updated
- `/app/README.md` (from Tauri template to Capacitor guide)
- `/app/.gitignore`

### Created (Documentation)
- `/app/build.gradle.sample`
- `/app/IMPLEMENTATION_CHECKLIST.md`

### Unchanged (Original Source)
- `/web/majinboo.html` (original copy remains; app uses `/app/src/majinboo.html`)
- `/firmware/**` (ESP32 code unchanged)

---

**Status:** Implementation Complete (Phase 1-4 done; Phase 5 testing deferred to user)
**Next Step:** Run `npm install && npm run cap:add:android && npm run build` and test on Android device
