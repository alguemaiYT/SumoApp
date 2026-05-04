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
VERSION=$(node -p "require('../package.json').version")
APK_SRC="app/build/outputs/apk/debug/app-debug.apk"
APK_DEST="/workspace/apk/SumoApp-debug-v${VERSION}.apk"

mkdir -p /workspace/apk
cp "$APK_SRC" "$APK_DEST"

echo "Android APK built and copied to $APK_DEST"
