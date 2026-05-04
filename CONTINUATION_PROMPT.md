# Capacitor HTML→Android Bluetooth Migration - Continuation Prompt

## Project Context
You are continuing work on migrating a Sumo Robot control web app (HTML/JavaScript) to a native Android app using Capacitor. The app controls an ESP32 robot via Bluetooth Classic (SPP/RFCOMM), NOT BLE.

**User Requirement**: "faça toda a compilação e teste via adb no android existente, so termina quando 100% funcional" - Build, deploy via ADB, test exhaustively until 100% functional. NO partial deliverables accepted.

## Current State

### What's Complete ✓
1. **Capacitor Project Structure**: `/app/` directory with package.json, capacitor.config.json, tsconfig.json, vite.config.ts
2. **Web Assets**: Successfully built via `npm run build` to `/app/www/` (23 modules, 39KB)
3. **TypeScript Service Layer**: 
   - `/app/src/bluetooth-service.ts` - Event emitter, Preferences, Haptics
   - `/app/src/bluetooth-adapter.ts` - UI integration bridge
4. **UI Migration**: `/app/src/majinboo.html` - Updated with native callbacks, removed Web Bluetooth API
5. **Native Android Bridge**:
   - `/app/android/app/src/main/java/com/dragonbotz/sumoapp/BluetoothClassicService.java` - RFCOMM/SPP connection
   - `/app/android/app/src/main/java/com/dragonbotz/sumoapp/BluetoothClassicPlugin.java` - Capacitor plugin
6. **Android Configuration**: AndroidManifest.xml, MainActivity.java, all Java sources in place
7. **Gradle Configuration**: settings.gradle, build.gradle (both top-level and app), gradle.properties configured
8. **npm Dependencies**: 113 packages installed successfully
9. **Capacitor Sync**: `npx cap sync android` completed, 5 plugins recognized
10. **Android SDK**: API 34 platforms and build-tools 34.0.0 installed
11. **Gradle 8.7**: Downloaded and configured at `/tmp/gradle-8.7/bin/gradle`

### Current Blocker ❌
**BUILD FAILING**: Gradle build fails with "In order to compile Java 9+ source, please set compileSdkVersion to 30 or above"

**Error Details**:
```
FAILURE: Build failed with an exception.
* What went wrong:
Could not determine the dependencies of task ':capacitor-app:bundleLibCompileToJarDebug'.
> Could not create task ':capacitor-app:compileDebugJavaWithJavac'.
   > In order to compile Java 9+ source, please set compileSdkVersion to 30 or above
```

**Current Configuration**:
- `/app/android/build.gradle`: `compileSdkVersion = 34`, `targetSdkVersion = 34`, `buildToolsVersion = "34.0.0"`
- `/app/android/gradle.properties`: `compileSdk=34`, `buildToolsVersion=34.0.0`
- `/app/android/app/build.gradle`: Uses `rootProject.ext.compileSdkVersion` (should be 34)
- `/app/android/app/capacitor.build.gradle`: Sets Java 1.8 compatibility

**Root Cause Analysis Needed**:
The error persists despite setting compileSdkVersion to 34. This suggests:
1. Capacitor's internal build.gradle files may have hardcoded SDK requirements
2. The Android Gradle Plugin version (7.4.2) may be incompatible with Java 9+ source
3. There may be a mismatch between Capacitor 5.7.0 and the AGP version

### Environment Details
- **OS**: Linux (Kali)
- **Java**: OpenJDK 21.0.10
- **Node**: 24.14.1
- **npm**: 11.12.1
- **Gradle**: 8.7 (at `/tmp/gradle-8.7/bin/gradle`)
- **Android SDK**: `/usr/lib/android-sdk` (API 34 installed)
- **Device**: RXCW205TPDE (Android 15 API 35) connected via ADB

## Immediate Next Steps

### Step 1: Fix Build Configuration (CRITICAL)
**Goal**: Resolve the "Java 9+ source" compilation error

**Approach Options**:
1. **Option A**: Upgrade Android Gradle Plugin to 8.x (compatible with Java 9+)
   - Update `/app/android/build.gradle`: Change AGP version from 7.4.2 to 8.1.0 or higher
   - Update `/app/android/app/build.gradle`: Ensure compatibility
   - Test build

2. **Option B**: Downgrade Java source compatibility to 1.8
   - Check `/app/android/app/capacitor.build.gradle` (already set to 1.8)
   - Check `/app/android/app/build.gradle` (already set to 1.8)
   - Investigate if Capacitor's internal modules override this

3. **Option C**: Use Capacitor's recommended AGP version
   - Check Capacitor 5.7.0 documentation for AGP compatibility
   - May need AGP 8.0+ for Java 9+ support

**Recommended Action**: Start with Option A - Upgrade AGP to 8.1.0

### Step 2: Build Debug APK
**Command**:
```bash
cd /home/kali/Repos/SumoApp/app/android
rm -rf .gradle/caches build
/tmp/gradle-8.7/bin/gradle --no-daemon assembleDebug
```

**Expected Output**: "BUILD SUCCESSFUL" with APK at:
`/home/kali/Repos/SumoApp/app/android/app/build/outputs/apk/debug/app-debug.apk`

### Step 3: Deploy via ADB
**Command**:
```bash
adb install -r /home/kali/Repos/SumoApp/app/android/app/build/outputs/apk/debug/app-debug.apk
```

**Verification**:
```bash
adb shell pm list packages | grep sumoapp
```

### Step 4: Launch App and Verify Base Functionality
**Command**:
```bash
adb shell am start -n com.dragonbotz.sumoapp/.MainActivity
```

**Wait**: 3-5 seconds for splash screen fade

**Success Criteria**:
- App launches without crashes
- No "EXCEPTION" or "ERROR" in logcat
- Splash screen visible then fades
- Main UI visible

### Step 5: Test Bluetooth Discovery
**Prerequisites**: Robot powered on and advertising as "Madinboo_BT"

**Action**: Tap "Conectar via Bluetooth" button in app

**Success Criteria**:
- Phone vibrates (device found event)
- Logcat shows "discovered|Madinboo|deviceFound"
- UI changes to "Conectado" state
- Connection established to robot

### Step 6: Test Telemetry Reception
**Prerequisites**: Bluetooth connection active

**Verification**: Check screen for real-time telemetry (battery voltage, sensor states, velocity values)

**Success Criteria**:
- Telemetry values visible and updating
- Battery percentage displayed
- Sensor indicators active
- Values change when robot sensors detect changes

### Step 7: Test Command Transmission
**Commands to Test**: EST (strategy selection), VR (velocity), VG (rotation), PARADA (emergency stop)

**Success Criteria**:
- Each command results in observable robot behavior
- Logcat shows "sendCmd" with command values
- Robot responds to velocity/strategy changes immediately
- Emergency stop halts robot

### Step 8: Test Preferences Persistence
**Action**: Close app with `adb shell am force-stop com.dragonbotz.sumoapp`, reopen with `adb shell am start -n com.dragonbotz.sumoapp/.MainActivity`

**Success Criteria**:
- App reconnects to previously connected device automatically
- No user intervention needed
- Connection re-established within 5 seconds
- Logcat shows "lastDevice|reconnect" operations

## Protocol Details (DO NOT CHANGE)

### Bluetooth Transport
- **Type**: Classic BT/SPP over RFCOMM sockets
- **UUID**: "00001101-0000-1000-8000-00805F9B34FB" (SPP standard)
- **Device Name Filter**: "Madinboo" (case-sensitive)

### Serial Protocol
- **Command Format**: `COMANDO,VALOR*\n`
- **Commands**: EST, VR, VG, PARADA, LISTA, DEBUG
- **Telemetry Format**: Pipe-delimited values
- **Line Terminator**: `\n`

### Key Files Reference
- **Command Parsing**: `/app/android/app/src/main/java/com/dragonbotz/sumoapp/Bluetooth.ino`
- **Strategy List**: `/app/android/app/src/main/java/com/dragonbotz/sumoapp/Estrategias.ino`
- **Pins/Flags**: `/app/android/app/src/main/java/com/dragonbotz/sumoapp/config.h`
- **Frontend**: `/app/src/majinboo.html`

## Critical Rules
1. **Treat frontend and firmware as one protocol pair** - If you change a command, packet format, sensor mapping, or arm/boot flow, update both sides together
2. **Keep web UI changes centered on `/app/src/majinboo.html`** - Make DOM updates tolerant of missing elements
3. **Do not rely on `/app/web/README.md` for implementation details** - It is empty
4. **User requirement is absolute**: 100% functional = all 8 validation tasks passing
5. **NO partial deliverables** - Continue until all testing passes

## Handy References
- [README.md](README.md) - High-level overview
- [firmware/Sumo_Auto_ESP32_V2.ino/config.h](firmware/Sumo_Auto_ESP32_V2.ino/config.h) - Pins and shared flags
- [firmware/Sumo_Auto_ESP32_V2.ino/Bluetooth.ino](firmware/Sumo_Auto_ESP32_V2.ino/Bluetooth.ino) - Command parsing
- [firmware/Sumo_Auto_ESP32_V2.ino/Estrategias.ino](firmware/Sumo_Auto_ESP32_V2.ino/Estrategias.ino) - Strategy list emission

## Current Working Directory
`/home/kali/Repos/SumoApp/app/android`

## Last Command Executed
```bash
ls -la /home/kali/Repos/SumoApp/app/node_modules/@capacitor/android/
```

## Your Task
1. **First priority**: Fix the build configuration to resolve the "Java 9+ source" error
2. **Second priority**: Build the APK successfully
3. **Third priority**: Deploy via ADB and test all 8 validation steps
4. **Do not stop** until the app is 100% functional on the connected Android device

Start by investigating the Capacitor Android module's build configuration and determining the correct AGP version to use for Java 9+ source compilation.
