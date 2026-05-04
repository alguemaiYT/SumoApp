# Docker workspace design

## Problem

`SumoApp` currently depends on several separate toolchains: the web app, the Android/Capacitor app, and the ESP32 firmware. That makes onboarding and reproducibility hard across machines, and it is easy for local setup drift to break builds.

## Goal

Create a Docker-based development environment that can be used from any computer and stays compatible with GitHub-based workflows.

## Scope

### In scope

- Reproducible build environment for the full repository
- Web app build
- Android/Capacitor build
- ESP32 firmware build
- Optional APK packaging into `apk/`
- GitHub-friendly setup via Dev Container / Codespaces style workflow

### Out of scope

- Running the phone itself inside Docker
- Moving ADB/USB phone access fully into the container
- Rewriting app or firmware logic

## Recommended architecture

Use a single Docker image as the base workspace, then expose it through a Dev Container and `docker compose`.

### Image contents

- Node.js + npm for the web and Capacitor app
- Java/JDK compatible with the Android build
- Android SDK command-line tools and `platform-tools`
- `arduino-cli` with the ESP32 board package
- Common shell utilities used by the repo scripts

### Container layout

- Mount the repository at `/workspace`
- Keep source code editable from the host
- Keep generated artifacts (`www/`, Gradle outputs, APKs) inside the repo so they are easy to inspect

### ADB handling

Keep ADB on the host machine instead of inside the container.

Reason:

- It works on more computers with less friction
- USB passthrough is fragile across operating systems
- The container still handles all build tasks, while the host handles the physical phone connection

## Workflow

1. Open the repo in the Dev Container or start the compose service.
2. Run web/app/firmware build commands from inside the container.
3. Use host `adb` for install, logcat, and device interaction.
4. Share the same Docker image in GitHub workflows so local and CI builds match.

## Error handling and reliability

- Pin tool versions in the image so builds do not drift.
- Fail fast if Android SDK components or ESP32 packages are missing.
- Cache SDK and package downloads in Docker layers where possible.
- Keep host-only ADB steps explicit so users know when Docker is not involved.

## Validation

- `npm run build`
- `npm run cap:sync:android`
- `cd app/android && ./gradlew assembleDebug`
- `arduino-cli compile` for the firmware target
- `adb devices` and `adb install -r` from the host

## Delivery slices

1. Add the Docker image and Dev Container config.
2. Add scripts for web, Android, and firmware builds inside the container.
3. Document host ADB usage.
4. Add GitHub-friendly automation so the same environment can be reused in CI.
