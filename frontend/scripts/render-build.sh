#!/usr/bin/env bash
# Render static-site build — wires VITE_API_URL to the deployed API service.
set -euo pipefail

if [ -n "${API_HOST:-}" ]; then
  # Injected by render.yaml fromService (ant-mici-api RENDER_EXTERNAL_URL)
  export VITE_API_URL="${API_HOST%/}/api"
  echo "Building with VITE_API_URL=${VITE_API_URL}"
elif [ -n "${VITE_API_URL:-}" ]; then
  echo "Building with VITE_API_URL=${VITE_API_URL}"
else
  echo "Building with default VITE_API_URL=/api (local proxy)"
fi

npm ci
npm run build
