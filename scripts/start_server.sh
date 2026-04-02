#!/bin/bash
set -euo pipefail
# start_server.sh - wrapper used by launchd plist to start the uvicorn server

# change to repo dir
cd /Users/samyukthavijai/code/whisper

# activate venv if present
if [ -f ".venv/bin/activate" ]; then
  # shellcheck disable=SC1091
  . .venv/bin/activate
fi

# Ensure certifi bundle is used when available
if python - <<'PY' >/dev/null 2>&1
try:
    import certifi
    print('ok')
except Exception:
    raise SystemExit(1)
PY
then
  export SSL_CERT_FILE=$(python -c 'import certifi;print(certifi.where())')
fi

# default model
export MODEL_NAME=${MODEL_NAME:-tiny}

HOST=${HOST:-127.0.0.1}
PORT=${PORT:-8000}

if [ -x ".venv/bin/python" ]; then
  exec .venv/bin/python -m uvicorn server:app --host "$HOST" --port "$PORT"
else
  exec uvicorn server:app --host "$HOST" --port "$PORT"
fi
