#!/bin/bash
set -e

echo "Building Android App (Capacitor + Gradle)..."
cd /workspace/app

# Ensure web assets are built
/workspace/scripts/build-web.sh

# Sync Capacitor
npx cap sync android

# Build APK
cd android
./gradlew assembleDebug

# Copy APK to /apk folder as per GEMINI.md
APK_SRC="app/build/outputs/apk/debug/app-debug.apk"
APK_DEST=$(bash /workspace/init "$APK_SRC" SumoApp)

echo "Android APK built and copied to $APK_DEST"
