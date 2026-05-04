#!/bin/bash
set -e

echo "Compiling ESP32 Firmware..."
cd /workspace/firmware/Sumo_Auto_ESP32_V2.ino

# Board FQBN for ESP32 (standard)
# You might need to adjust this depending on the specific ESP32 board
FQBN="esp32:esp32:esp32"

arduino-cli compile --fqbn "$FQBN" .

echo "Firmware compiled successfully."
