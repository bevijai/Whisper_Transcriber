#!/usr/bin/env python3
"""Simple FastAPI server to transcribe audio with Whisper.

Endpoints
- POST /transcribe : multipart upload the audio file as `file` field. Returns JSON {text, seconds}

Usage (example):
  pip install fastapi uvicorn python-multipart
  SSL_CERT_FILE=$(python -c "import certifi;print(certifi.where())") \
    uvicorn server:app --host 127.0.0.1 --port 8000

By default the `MODEL_NAME` environment variable controls which model is preloaded (default: "tiny").
"""
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse, FileResponse
from fastapi import Query
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import os
import time
import tempfile
import shutil
from typing import Dict


def ensure_certifi_env():
    try:
        import certifi

        os.environ.setdefault("SSL_CERT_FILE", certifi.where())
    except Exception:
        pass


ensure_certifi_env()

app = FastAPI(title="Whisper Local Server")

# Allow CORS so other users (LAN or web clients) can access the API from browsers.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve the simple web UI from ./web at the repo root
web_dir = os.path.join(os.path.dirname(__file__), "web")
if os.path.isdir(web_dir):
    # Mount static files under /static to avoid intercepting API routes
    app.mount("/static", StaticFiles(directory=web_dir), name="static")

    # Serve the index at root
    @app.get("/", response_class=FileResponse)
    def _index():
        index_path = os.path.join(web_dir, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path, media_type="text/html")
        return JSONResponse({"detail": "No UI available"}, status_code=404)

# simple model cache to allow loading different models on demand
_MODEL_CACHE: Dict[str, object] = {}

@app.get("/languages")
def _languages():
    try:
        from whisper.tokenizer import LANGUAGES

        return JSONResponse(LANGUAGES)
    except Exception:
        return JSONResponse({}, status_code=200)

def get_model(name: str = None):
    """Load or return cached Whisper model."""
    import whisper

    if name is None:
        name = os.environ.get("MODEL_NAME", "tiny")

    if name in _MODEL_CACHE:
        return _MODEL_CACHE[name]

    model = whisper.load_model(name)
    _MODEL_CACHE[name] = model
    return model


@app.on_event("startup")
def startup_event():
    # preload default model to reduce first-request latency
    default = os.environ.get("MODEL_NAME", "tiny")
    try:
        get_model(default)
    mode: str = Query("en_en"),
    src: str = Query("auto"),
    tgt: str = Query("en"),
        print(f"Preloaded model: {default}")
    except Exception as e:
        print(f"Warning: failed to preload model {default}: {e}")


@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...), model: str = None):
    """Transcribe an uploaded audio file.

    - `file`: multipart file upload
    - `model` (optional query param): model name to use (overrides default)
    """
    suffix = os.path.splitext(file.filename)[1] if file.filename else ".wav"
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp_path = tmp.name
            shutil.copyfileobj(file.file, tmp)
    finally:
        file.file.close()

    try:
        m = get_model(model)
        t0 = time.time()
        result = m.transcribe(tmp_path)
        took = time.time() - t0
        text = result.get("text", "")
        return JSONResponse({"text": text, "seconds": took})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        try:
            os.remove(tmp_path)
        except Exception:
            pass


if __name__ == "__main__":
    import uvicorn

    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run("server:app", host=host, port=port, reload=False)
