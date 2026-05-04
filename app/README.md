# SumoApp Capacitor - Android Implementation

This is the Capacitor-based native Android application for the DragonBotz Sumo Robot controller.

## Setup & Build

### Prerequisites
- Node.js 16+ and npm
- Android SDK (API 31+)
- Android Studio (optional but recommended)
- Java Development Kit (JDK) 11+

### Installation

1. Install dependencies:
```bash
npm install
```

2. Add Android platform:
```bash
npm run cap:add:android
```

3. Build the web assets:
```bash
npm run build
```

4. Sync web assets and dependencies to Android:
```bash
npm run cap:sync:android
```

### Development

- **Local development** (dev server):
```bash
npm run dev
```

- **Build and sync**:
```bash
npm run cap:copy
```

- **Open Android Studio**:
```bash
npm run cap:open:android
```

- **Build APK** (debug):
```bash
npm run cap:build:android
```

- **Run on connected device**:
```bash
npm run cap:run:android
```

## Features

### Bluetooth Classic (SPP)
- Native Android Bluetooth Classic adapter with RFCOMM/SPP support
- Automatic discovery and connection to `Madinboo_BT` robot
- Real-time serial communication (commands and telemetry)
- Haptic feedback on device discovery and connection

### Native Capabilities
- **Haptics**: Vibration feedback via `@capacitor/haptics`
- **Preferences**: Persistent storage of device info and settings via `@capacitor/preferences`
- **Keep-Awake**: Screen stays on during active matches via `@capacitor/keep-awake`
- **Splash Screen**: Native splash with custom timing
- **Status Bar**: Dark theme status bar styling

## Project Structure

```
app/
├── src/
│   ├── index.html          # HTML shell for Capacitor
│   ├── main.ts             # App entry point with plugin init
│   ├── majinboo.html       # Main UI (copied from web/)
│   ├── bluetooth-service.ts   # Bluetooth service abstraction
│   ├── bluetooth-adapter.ts   # UI integration layer
│   ├── web/
│   │   └── bluetooth-web.ts   # Web platform fallback
│   ├── style.css           # Wrapper styles
│   └── vite.config.ts      # Vite build config
├── android/
│   └── app/
│       └── src/main/
│           ├── java/com/dragonbotz/sumoapp/
│           │   ├── BluetoothClassicService.java    # Native service
│           │   └── BluetoothClassicPlugin.java     # Capacitor plugin
│           ├── AndroidManifest.xml
│           └── ...
├── capacitor.config.json   # Capacitor configuration
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript config
└── vite.config.ts          # Build configuration

```

## Protocol

The app communicates with the ESP32 robot using serial-based commands:

### Commands (App → Robot)
- `EST,<id>*` - Set strategy (1-7)
- `VR,<pwm>*` - Set forward velocity (0-255)
- `VG,<pwm>*` - Set rotation velocity (0-255)
- `DEBUG,<0|1>*` - Enable/disable telemetry
- `PARADA,*` - Emergency stop
- `LISTA,*` - Request strategy list

### Telemetry (Robot → App)
Pipe-delimited data sent continuously when DEBUG is enabled:
```
velocreta|velocgiro|HBEvasao|limiarParado|limiarEmpurrado|Vbat|sen_dir|sen_centro_dir|sen_centro_esq|sen_esq|sensorLD|sensorLE
```

## Permissions (Android)

Required permissions are declared in `AndroidManifest.xml`:
- `BLUETOOTH` - Basic Bluetooth access
- `BLUETOOTH_ADMIN` - Discovery and connection management
- `BLUETOOTH_SCAN` - Device discovery (Android 12+)
- `BLUETOOTH_CONNECT` - Establish connections (Android 12+)
- `ACCESS_FINE_LOCATION` - Required for Bluetooth discovery
- `ACCESS_COARSE_LOCATION` - Required for Bluetooth discovery

Runtime permissions are requested on app startup.

## Troubleshooting

### Bluetooth not connecting
1. Ensure the robot is powered on and advertising as `Madinboo_BT`
2. Check that Bluetooth is enabled on the phone
3. Grant runtime permissions (check app settings)
4. Try killing the app and relaunching
5. Use a Bluetooth scanner app to verify robot presence

### Build errors
1. Ensure Android SDK is installed and ANDROID_HOME is set
2. Run `npm install` again
3. Delete `android/` and run `npm run cap:add:android`
4. Check that JDK 11+ is installed: `java -version`

### APK size
- Current debug APK is ~50-80MB
- Use Android Studio → Build → Generate Signed Bundle/APK for optimized release builds

## Next Steps

1. Test on a physical Android device with the robot
2. Adjust Bluetooth discovery timeout and connection retry logic as needed
3. Implement background Bluetooth notifications if required
4. Consider adding settings UI for Bluetooth device management
