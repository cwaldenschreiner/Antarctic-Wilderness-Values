#!/usr/bin/env bash
set -euo pipefail
if [ -n "${API_HOST:-}" ]; then
  export VITE_API_URL="${API_HOST%/}/api"
  echo "Building with VITE_API_URL=${VITE_API_URL}"
elif [ -n "${VITE_API_URL:-}" ]; then
  echo "Building with VITE_API_URL=${VITE_API_URL}"
else
  echo "Building with default VITE_API_URL=/api (dev proxy)"
fi
npm ci
npm run build
