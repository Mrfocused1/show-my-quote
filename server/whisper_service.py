"""
Show My Quote — Faster Whisper transcription HTTP service

Listens on port 8001.
POST /transcribe  — body: raw WAV bytes, returns { text: "..." }
GET  /health      — returns "ok"

Model is loaded once at startup and reused for all requests.
"""

import io
import logging
import os

import torch
import uvicorn
from faster_whisper import WhisperModel
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, PlainTextResponse

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("whisper_service")

# ── Model config ──────────────────────────────────────────────────────────────
# base.en  → fast, English-only, ~150 MB, good quality
# small.en → better accuracy, ~500 MB, still fast on CPU
# tiny.en  → fastest, ~75 MB, OK for clear audio
MODEL_SIZE   = os.getenv("WHISPER_MODEL", "base.en")
DEVICE       = "cuda" if torch.cuda.is_available() else "cpu"
COMPUTE_TYPE = "float16" if DEVICE == "cuda" else "int8"

log.info(f"Loading Faster Whisper model '{MODEL_SIZE}' on {DEVICE} ({COMPUTE_TYPE}) ...")
model = WhisperModel(MODEL_SIZE, device=DEVICE, compute_type=COMPUTE_TYPE)
log.info("Model ready.")

app = FastAPI(title="SMQ Whisper Service")


@app.get("/health")
async def health():
    return PlainTextResponse("ok")


@app.post("/transcribe")
async def transcribe(request: Request):
    audio_bytes = await request.body()

    if not audio_bytes or len(audio_bytes) < 100:
        return JSONResponse({"text": ""})

    try:
        audio_io = io.BytesIO(audio_bytes)

        segments, info = model.transcribe(
            audio_io,
            language="en",
            beam_size=1,            # fastest decoding
            best_of=1,
            vad_filter=True,        # skip silence automatically
            vad_parameters={
                "min_silence_duration_ms": 300,
                "speech_pad_ms": 100,
            },
        )

        text = " ".join(seg.text for seg in segments).strip()

        if text:
            log.info(f"Transcribed {len(audio_bytes)//2000:.1f}s → {text[:80]}")

        return JSONResponse({"text": text})

    except Exception as exc:
        log.error(f"Transcription error: {exc}")
        return JSONResponse({"text": ""}, status_code=500)


if __name__ == "__main__":
    port = int(os.getenv("WHISPER_PORT", "8001"))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="warning")
