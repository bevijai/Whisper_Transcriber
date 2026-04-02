Local server for Whisper

Install requirements (in venv):

```bash
. .venv/bin/activate
pip install fastapi uvicorn python-multipart
```

Run the server (example):

```bash
. .venv/bin/activate
export MODEL_NAME=tiny
export SSL_CERT_FILE=$(python -c 'import certifi;print(certifi.where())')
uvicorn server:app --host 127.0.0.1 --port 8000
```

Use the endpoint:

```bash
curl -X POST "http://127.0.0.1:8000/transcribe?model=tiny" -F "file=@/path/to/audio.wav"
# returns JSON {"text": "...", "seconds": 0.45}
```

Notes:
- The server preloads the model named by `MODEL_NAME` on startup.
- For production/local demos consider running with `--workers` if you expect concurrent requests, but ensure model loading and GPU memory are handled accordingly.
