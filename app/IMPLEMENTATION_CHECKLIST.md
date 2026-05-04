# Capacitor Implementation Checklist

## Phase 1: Bootstrap & Configuration ✓ COMPLETED
- [x] Create `package.json` with Capacitor dependencies
- [x] Create `capacitor.config.json` with app identity and plugin configuration
- [x] Create `tsconfig.json` and `vite.config.ts` for TypeScript builds
- [x] Create `.gitignore` for Capacitor (node_modules, www, dist, android/, etc)
- [x] Copy `web/majinboo.html` to `app/src/majinboo.html`
- [x] Create `src/index.html` as Capacitor entry point
- [x] Create `src/main.ts` with Capacitor plugin initialization
- [x] Update `app/README.md` with comprehensive setup and build instructions

## Phase 2: Native Android Bridge ✓ COMPLETED
- [x] Create `BluetoothClassicService.java` - Core Bluetooth Classic service with:
  - [x] RFCOMM/SPP socket management
  - [x] Device discovery with BroadcastReceiver
  - [x] Auto-connect to `Madinboo_BT` on detection
  - [x] Read thread for incoming serial data
  - [x] Command sending and telemetry parsing
- [x] Create `BluetoothClassicPlugin.java` - Capacitor plugin bridge with:
  - [x] Permission request handling
  - [x] Methods: startDiscovery, stopDiscovery, connect, disconnect, sendCommand
  - [x] Event listeners: deviceFound, connected, disconnected, dataReceived, error, scanningState
- [x] Create `AndroidManifest.xml` with required permissions:
  - [x] BLUETOOTH, BLUETOOTH_ADMIN, BLUETOOTH_SCAN, BLUETOOTH_CONNECT
  - [x] ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION
  - [x] INTERNET

## Phase 3: TypeScript Service Layer ✓ COMPLETED
- [x] Create `bluetooth-service.ts` - Main abstraction layer with:
  - [x] BluetoothService class wrapping native plugin
  - [x] Event emitter pattern (on/off methods)
  - [x] Device connection/disconnection lifecycle
  - [x] Preferences integration for lastDevice persistence
  - [x] Haptics integration for feedback
- [x] Create `web/bluetooth-web.ts` - Web platform fallback (no-op implementation)
- [x] Create `bluetooth-adapter.ts` - UI integration layer with:
  - [x] Global callback hooks for UI (onNativeBluetoothConnected, etc)
  - [x] Auto-discovery and connection flow
  - [x] Keep-awake management during active connection
  - [x] Event forwarding to HTML UI

## Phase 4: UI Refactoring ✓ COMPLETED
- [x] Update splash screen message (from BLE UART to Bluetooth Classic SPP)
- [x] Replace `startConnect()` to use native discovery
- [x] Replace `sendCmd()` to use native Bluetooth transport
- [x] Replace `disconnect()` to use native cleanup
- [x] Remove Web Bluetooth UUID constants (no longer needed)
- [x] Add callback handlers: onNativeBluetoothConnected, onNativeBluetoothDisconnected, onNativeBluetoothData, onNativeBluetoothError
- [x] Protocol remains stable: LISTA, DEBUG, EST, PARADA, telemetry parsing unchanged

## Phase 5: Next Steps

### Before Build
- [ ] Install Node dependencies: `npm install` (from `app/` directory)
- [ ] Review the structure: `ls -la app/src/` and `ls -la app/android/app/src/main/java/...`
- [ ] Ensure Java 11+ is installed: `java -version`
- [ ] Ensure Android SDK is configured

### Build & Deployment
- [ ] Add Android platform: `npm run cap:add:android`
- [ ] Build web assets: `npm run build`
- [ ] Sync to Android: `npm run cap:sync:android`
- [ ] Open in Android Studio: `npm run cap:open:android`
- [ ] Build APK: `npm run cap:build:android` or use Android Studio
- [ ] Test on device: `npm run cap:run:android`

### Testing on Device
1. Power on robot (should advertise as `Madinboo_BT`)
2. Launch app
3. Tap "Conectar via Bluetooth"
4. Confirm discovery starts
5. Verify vibration when robot found
6. Confirm connection and telemetry flow
7. Test sendingCommands (EST, VR, VG)
8. Verify emergency stop (PARADA) works
9. Check preferences persist across relaunches

### Known Limitations (Current Phase)
- iOS support deferred (Android-first)
- Web platform does not have native Bluetooth (graceful fallback only)
- Bluetooth discovery filter currently targets any device with "Madinboo" in name
- No background Bluetooth notifications yet
- No device pairing UI (relies on system Bluetooth settings)

### Future Enhancements
- [ ] Add BLE support (requires firmware change on ESP32)
- [ ] iOS platform support
- [ ] Settings page for device management
- [ ] Bluetooth reconnection statistics/logging
- [ ] Battery indicator in status bar
- [ ] Background match notifications
