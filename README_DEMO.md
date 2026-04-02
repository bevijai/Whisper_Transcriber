Demo: Transcribing audio with the local Whisper checkout

Quick steps:

1. Activate the project's venv:

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install --upgrade pip setuptools wheel
pip install -e .[dev]
```

2. Ensure `ffmpeg` is installed (macOS Homebrew example):

```bash
brew install ffmpeg
```

3. Run the demo script:

```bash
. .venv/bin/activate
python demo_transcribe.py path/to/audio.wav --model tiny
```

Options:
- `--model`: model name (tiny, base, small, medium, large, turbo)
- `--device`: `cpu` or `cuda`
- `--output`: path to save the transcript text

Notes:
- If you're behind a corporate proxy, ensure system trust or set `SSL_CERT_FILE` to the `certifi` bundle in the venv.
