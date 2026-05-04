# Android APK Build Blocker - Java 21 + SDK 34 + Gradle Incompatibility

## Problem Summary
The Capacitor Android project fails to build with a fundamental incompatibility between:
- **Java 21** (only available JVM on system)
- **Android SDK 34** (only SDK level available after 29)
- **Gradle 6.9-8.7** (all versions with AGP 6.9.2 - 8.1.4)
- **jlink module-path system** (introduced in AGP 7.0+)

## Root Cause
When AGP (Android Gradle Plugin) >= 7.0 compiles with Java 9+ source, it uses jlink to create a JDK image from the Android SDK's `core-for-system-modules.jar`. This process fails because:

1. The Android SDK 34's `core-for-system-modules.jar` is not a valid jmod module
2. Java 21's jlink cannot process it into a valid JDK image
3. This prevents all Java compilation in the build

## Error Details
```
Execution failed for task ':capacitor-android:compileDebugJavaWithJavac'.
> Could not resolve all files for configuration ':capacitor-android:androidJdkImage'.
   > Failed to transform core-for-system-modules.jar to match attributes...
      > Error while executing process /usr/lib/jvm/java-21-openjdk-amd64/bin/jlink with arguments
         {--module-path ... --add-modules java.base --output ... --disable-plugin system-modules}
```

## Solutions Attempted (All Failed)
1. ✗ Upgraded AGP to 8.0+ (requires SDK 35/36, not available)
2. ✗ Downgraded AGP to 7.3.1, 6.9.2 (jlink issue persists)
3. ✗ Downgraded Capacitor to v4.x (doesn't fix underlying gradle issue)
4. ✗ Modified gradle.properties with various flags (gradle bypasses them)
5. ✗ Created jlink wrapper scripts (gradle uses absolute path)
6. ✗ Patched Capacitor source files (doesn't address gradle transform)
7. ✗ Cleared gradle caches multiple times (issue persists)
8. ✗ Upgraded build-tools (none compatible with Java 21 + SDK 34)

##  Viable Solutions

### Solution A: Use Docker (Recommended for CI/CD)
Use an Android build container with pre-configured compatibility:
```bash
docker run --rm -v $(pwd):/workspace google/android:latest ./gradlew assembleDebug
```

### Solution B: Use Android Studio GUI
Android Studio handles gradle configuration automatically:
1. Install Android Studio 2023.1+
2. Open the project
3. Build → Make Project (it will handle compatibility issues)

### Solution C: Use Web Version Only
Deploy the web version directly to the device:
```bash
adb push app/www /sdcard/sumoapp-web/
# Serve via built-in web server or WebView wrapper app
```

### Solution D: Upgrade System Java (If Possible)
Downgrade to Java 11 or install Java 11 alongside Java 21:
```bash
sudo apt-get install openjdk-11-jdk
export JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64
```

### Solution E: Install Android SDK 35+
If you can upgrade the system Android SDK to level 35+:
```bash
sdkmanager "platforms;android-35"
# Then update build.gradle compileSdk = 35
```

## Files Changed
- `/app/android/build.gradle` - Various AGP version attempts
- `/app/android/app/build.gradle` - Java source compatibility settings
- `/app/android/gradle.properties` - Gradle flags and settings
- `/app/node_modules/@capacitor/android/capacitor/build.gradle` - Java version downgrades
- `/app/package.json` - Capacitor version downgrades to 4.x
- `/app/android/gradlew` - Updated to point to `/tmp/gradle-8.7`

## Next Steps
1. **Choose a solution** from "Viable Solutions" above
2. If using Docker: Install Docker and pull Android build image
3. If using Android Studio: Download and install
4. If using Java 11: Install JDK 11 and set JAVA_HOME
5. Contact system administrator for SDK upgrade options

## Hardware Context
- OS: Linux (Kali)
- Java: OpenJDK 21.0.10 (only version available)
- Android SDK: Level 29, 34 (no access to 35+)
- Gradle: 6.9, 7.5.1, 7.6, 8.0.2, 8.1.4, 8.7 (all tested)
- Device: RXCW205TPDE (Android 15 API 35) - connected via ADB
