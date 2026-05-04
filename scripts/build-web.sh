#!/bin/bash
set -e

echo "Building Web App..."
cd /workspace/app
npm install
npm run build
echo "Web App built successfully."
