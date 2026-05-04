#!/bin/bash
set -e

echo "Starting FULL build of SumoApp..."

/workspace/scripts/build-web.sh
/workspace/scripts/build-android.sh
/workspace/scripts/build-firmware.sh

echo "FULL build completed successfully!"
