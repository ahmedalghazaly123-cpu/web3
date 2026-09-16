#!/usr/bin/env bash
# Space entrypoint: start Ollama, pull the single model, then front it with
# the token gate (Ollama itself has no auth).
set -euo pipefail

echo "=== starting ollama ==="
ollama serve > /tmp/ollama.log 2>&1 &
for i in $(seq 1 30); do
  if curl -sf http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then break; fi
  sleep 2
done

echo "=== pulling model: ${OLLAMA_MODEL} (server-side download, once) ==="
ollama pull "${OLLAMA_MODEL}"
ollama list

if [ -z "${GATE_TOKEN:-}" ]; then
  echo "FATAL: GATE_TOKEN secret is not set on this Space." >&2
  exit 1
fi

echo "=== starting token gate on :${GATE_PORT} ==="
exec node /app/gate.js
