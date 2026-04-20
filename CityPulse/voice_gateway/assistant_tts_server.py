"""
CityPulse Ira Voice Gateway (Master Production Edition)
======================================================
Mirroring D:\caller exact patterns including SSL bypass & VAD tuning.
"""

import asyncio
import base64
import json
import logging
import os
import re
import subprocess
import struct
import tempfile
import time
import wave
import io
import random
import ssl
from pathlib import Path

import httpx
import websockets
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

load_dotenv(dotenv_path=Path(__file__).parent / ".env")

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ira-gateway")

# ================== CONFIGURATION ==================

SARVAM_KEY = os.getenv("SARVAM_API_KEY")
GEMINI_KEY = os.getenv("GEMINI_API_KEY")

if not SARVAM_KEY or not GEMINI_KEY:
    logger.error("❌ FAILED TO LOAD API KEYS. Ensure .env is present in project root.")

# ⚡ D:\caller SECRET: VAD signals + High sensitivity = Instant response
SARVAM_WS_URL = (
    "wss://api.sarvam.ai/speech-to-text/ws"
    "?model=saaras:v3"
    "&language-code=en-IN"
    "&vad_signals=true"
    "&high_vad_sensitivity=true"
)

MODELS_DIR = Path(r"d:\Frontend\Assistant\models")
MODEL_MAP = {
    "en": MODELS_DIR / "English.onnx",
    "hi": MODELS_DIR / "Hindi.onnx",
    "mr": MODELS_DIR / "marathi.onnx",
    "mr_premium": MODELS_DIR / "marathi1.onnx",
}

GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_KEY}"

GEMINI_SYSTEM_PROMPT = """You are "Ira", the intelligent CityPulse navigator for Pune. 
Output JSON: {"intent":"NAVIGATE|CANCEL_ROUTE|GENERAL","destination":"<place>","language":"en|hi|mr","response":"<spoken reply>"}
Rules: Navigation dest must end in ", Pune". Response 1 sentence."""

FILLERS = ["Got it.", "Sure.", "Looking it up.", "Okay.", "Checking that."]
PIPER_BIN = r"d:\Frontend\piper\piper.exe"

# 🔒 D:\caller SSL BYPASS (Fixes 'handshake timeout')
ssl_context = ssl._create_unverified_context()

# ================== PIPELINE ==================

def synthesize_tts(text, language="en"):
    model = MODEL_MAP.get(language, MODEL_MAP["en"])
    if not model.exists(): return b""
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        outpath = f.name
    try:
        proc = subprocess.run(
            [PIPER_BIN, "--model", str(model), "--output_file", outpath],
            input=text.encode("utf-8"),
            capture_output=True, timeout=15,
        )
        if proc.returncode != 0: return b""
        with wave.open(outpath, "rb") as wf:
            return wf.readframes(wf.getnframes())
    except Exception: return b""
    finally:
        if os.path.exists(outpath): os.unlink(outpath)

async def run_voice_pipeline(transcript, ws: WebSocket):
    logger.info(f"🚀 Pipeline: {transcript}")
    sentence_queue = asyncio.Queue()
    state = {"lang": "en", "intent": "GENERAL", "dest": None}

    async def ai_producer():
        await sentence_queue.put(random.choice(FILLERS))
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(GEMINI_URL, json={
                    "system_instruction": {"parts": [{"text": GEMINI_SYSTEM_PROMPT}]},
                    "contents": [{"parts": [{"text": f"User: \"{transcript}\""}]}],
                    "generationConfig": {"temperature": 0.2, "responseMimeType": "application/json"}
                })
                result = json.loads(resp.json()["candidates"][0]["content"]["parts"][0]["text"])
                state["lang"], state["intent"], state["dest"] = result.get("language", "en"), result.get("intent", "GENERAL"), result.get("destination")
                await ws.send_json({"type": "assistant_result", **result})
                sentences = re.split(r'[.!?;,।\n]', result.get("response", ""))
                for s in [s.strip() for s in sentences if s.strip()]: await sentence_queue.put(s)
        except Exception as e: logger.error(f"AI ERR: {e}")
        finally: await sentence_queue.put(None)

    async def tts_consumer():
        while True:
            sentence = await sentence_queue.get()
            if sentence is None: break
            audio = await asyncio.to_thread(synthesize_tts, sentence, state["lang"])
            if audio: await ws.send_bytes(audio)

    await asyncio.gather(ai_producer(), tts_consumer())
    await ws.send_json({"type": "llm_done"})

# ================== SERVER ==================

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"])

@app.websocket("/ws/voice")
async def voice_ws(ws: WebSocket):
    await ws.accept()
    session_id = ws.query_params.get("session", "default")
    logger.info(f"📱 Connected: {session_id}")

    try:
        async with websockets.connect(
            SARVAM_WS_URL, 
            additional_headers={"Api-Subscription-Key": SARVAM_KEY},
            ssl=ssl_context,
            ping_interval=30,
            ping_timeout=20
        ) as sarvam_ws:
            logger.info("🎤 Sarvam Ready")
            
            async def client_to_sarvam():
                try:
                    chunk_count = 0
                    while True:
                        data = await ws.receive_json()
                        if data.get("type") == "audio":
                            chunk_count += 1
                            if chunk_count % 50 == 0:
                                logger.info(f"🎙️ Received 50 audio chunks from client ({chunk_count} total)")
                            
                            await sarvam_ws.send(json.dumps({
                                "audio": {"data": data["audio"]["data"], "encoding": "audio/wav", "sample_rate": 16000}
                            }))
                        elif data.get("type") == "ping": 
                            await ws.send_json({"type": "pong"})
                except Exception:
                    pass

            async def sarvam_to_client():
                try:
                    async for message in sarvam_ws:
                        resp = json.loads(message)
                        logger.info(f"📡 Sarvam Raw Msg: {resp.get('type')} | Content: {resp}")
                        
                        if resp.get("type") == "data":
                            inner = resp.get("data", {})
                            transcript, is_final = inner.get("transcript", ""), inner.get("is_final", False)
                            if transcript.strip():
                                logger.info(f"✅ Transcript Captured: {transcript} (Final: {is_final})")
                                await ws.send_json({"type": "transcript", "transcript": transcript, "is_final": is_final})
                                if is_final: 
                                    asyncio.create_task(run_voice_pipeline(transcript, ws))
                        elif resp.get("type") == "events" and resp.get("data", {}).get("signal_type") == "END_SPEECH":
                            logger.info("🔔 Sarvam Event: END_SPEECH detected.")
                            await ws.send_json({"type": "end_speech"})
                        elif resp.get("type") == "error":
                            logger.error(f"❌ Sarvam STT Error: {resp}")
                except Exception as e:
                    logger.error(f"Sarvam stream exception: {e}")
            
            try:
                await asyncio.gather(client_to_sarvam(), sarvam_to_client())
            except asyncio.CancelledError:
                logger.info("📡 Voice session cancelled (Client disconnected)")
            except Exception as e:
                logger.error(f"❌ Voice session error: {e}")
    except Exception as e: 
        logger.error(f"🔥 Critical WebSocket Failure: {e}")
    finally: 
        logger.info(f"🔚 Session Ended: {session_id}")

@app.post("/tts")
async def tts_post(req: dict):
    text = req.get("text", "")
    lang = req.get("language", "en")
    logger.info(f"🔊 HTTP TTS request: {text[:50]}...")
    audio = await asyncio.to_thread(synthesize_tts, text, lang)
    if not audio: return {"error": "TTS failed"}
    
    # Return as WAV file
    from fastapi.responses import Response
    return Response(content=audio, media_type="audio/wav")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5001)
