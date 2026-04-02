#!/usr/bin/env python3
"""Simple demo to load a Whisper model and transcribe an audio file.

Usage:
  python demo_transcribe.py path/to/audio.wav --model tiny --device cpu

This script ensures Python uses the venv certifi bundle (if available)
so downloads work behind corporate proxies.
"""
import argparse
import time
import os
import sys

def ensure_certifi_env():
    try:
        import certifi

        os.environ.setdefault("SSL_CERT_FILE", certifi.where())
    except Exception:
        # certifi not installed; proceed and hope system trust is fine
        pass


def main():
    parser = argparse.ArgumentParser(description="Transcribe audio with Whisper model")
    parser.add_argument("audio", help="Path to audio file (wav/mp3/...) or URL")
    parser.add_argument("--model", default="tiny", help="Model name (tiny, base, small, medium, large, turbo)")
    parser.add_argument("--device", default=None, help="Device to load model on (cpu or cuda)")
    parser.add_argument("--output", default=None, help="Optional path to save transcript")
    args = parser.parse_args()

    ensure_certifi_env()

    try:
        import whisper
    except Exception as e:
        print("Failed to import whisper package:", e, file=sys.stderr)
        sys.exit(2)

    device = args.device
    if device is None:
        try:
            import torch

            device = "cuda" if torch.cuda.is_available() else "cpu"
        except Exception:
            device = "cpu"

    print(f"Loading model '{args.model}' on {device}...")
    t0 = time.time()
    model = whisper.load_model(args.model)
    model = model.to(device)
    print(f"Model loaded in {time.time()-t0:.2f}s")

    print(f"Transcribing {args.audio} ...")
    t0 = time.time()
    result = model.transcribe(args.audio)
    took = time.time() - t0

    text = result.get("text", "")
    print("\n--- TRANSCRIPTION ---\n")
    print(text)
    print(f"\n(Transcription took {took:.2f}s)")

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"Saved transcript to {args.output}")


if __name__ == "__main__":
    main()
