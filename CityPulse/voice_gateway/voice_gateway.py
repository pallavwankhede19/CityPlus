import asyncio
import base64
import json
import logging
import os
import ssl
import re
import struct
import time
import tempfile
import wave
import subprocess
from pathlib import Path
from contextlib import asynccontextmanager

import httpx
import websockets
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("voice-gateway")

# ================== CONFIGURATION ==================

SARVAM_KEY = os.getenv("SARVAM_API_KEY")
GEMINI_KEY = os.getenv("GEMINI_API_KEY")

# D:\caller exact params
SARVAM_WS_URL = (
    "wss://api.sarvam.ai/speech-to-text/ws"
    "?model=saaras:v3"
    "&language-code=en-IN"
    "&vad_signals=true"
    "&high_vad_sensitivity=true" 
)

MIT_WPU_NAV = {
    "intent": "NAVIGATE",
    "destination": "MIT WPU, Kothrud, Pune",
    "language": "en",
    "response": "Sure, I'm setting the route to MIT WPU in Kothrud."
}

GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_KEY}"
GEMINI_SYSTEM_PROMPT = """You are "Ira", the intelligent CityPulse navigator for Pune. 
Output JSON: {"intent":"NAVIGATE|CANCEL_ROUTE|GENERAL","destination":"<place>","language":"en|hi|mr","response":"<spoken reply>"}
Rules: Navigation dest must end in ", Pune". Be concise (1 sentence)."""

MODELS_DIR = Path(r"d:\Frontend\Assistant\models")
MODEL_MAP = {
    "en": MODELS_DIR / "English.onnx",
    "hi": MODELS_DIR / "Hindi.onnx",
    "mr": MODELS_DIR / "marathi.onnx",
    "mr_premium": MODELS_DIR / "marathi1.onnx",
}
PIPER_BIN = r"d:\Frontend\piper\piper.exe"

ssl_context = ssl._create_unverified_context()

# ================== TTS SERVICE ==================

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

# ================== PIPELINE ==================

class StreamingSentenceBuffer:
    def __init__(self):
        self.buffer = ""
        self.punctuation = r'([.!?;,।\n])'
    def add_token(self, token):
        self.buffer += token
        segments = []
        while True:
            match = re.search(self.punctuation, self.buffer)
            if not match: break
            end_idx = match.end()
            seg = self.buffer[:end_idx].strip()
            if seg: segments.append(seg)
            self.buffer = self.buffer[end_idx:].lstrip()
        return segments
    def flush(self):
        res = self.buffer.strip()
        self.buffer = ""
        return [res] if len(res) > 1 else []

async def run_voice_pipeline(transcript, ws: WebSocket):
    logger.info(f"🚀 Pipeline RECEIVED: {transcript}")
    
    # ⚡ FAST TRACK FOR MIT WPU
    if "mit" in transcript.lower() and "wpu" in transcript.lower():
        result = MIT_WPU_NAV
        await ws.send_json({"type": "assistant_result", **result})
        audio = await asyncio.to_thread(synthesize_tts, result["response"], "en")
        if audio: await ws.send_bytes(audio)
        await ws.send_json({"type": "llm_done"})
        return

    # NO NOISE SHIELD - Process everything!
    sentence_queue = asyncio.Queue()
    state = {"lang": "en"}
    
    import random
    fillers = ["Got it.", "Sure.", "Checking.", "Okay."]

    async def ai_producer():
        await sentence_queue.put(random.choice(fillers))
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(GEMINI_URL, json={
                    "system_instruction": {"parts": [{"text": GEMINI_SYSTEM_PROMPT}]},
                    "contents": [{"parts": [{"text": f"User: \"{transcript}\""}]}],
                    "generationConfig": {"temperature": 0.2, "responseMimeType": "application/json"}
                })
                result = json.loads(resp.json()["candidates"][0]["content"]["parts"][0]["text"])
                state["lang"] = result.get("language", "en")
                await ws.send_json({"type": "assistant_result", **result})
                
                buffer = StreamingSentenceBuffer()
                for seg in buffer.add_token(result.get("response", "")):
                    await sentence_queue.put(seg)
                for seg in buffer.flush():
                    await sentence_queue.put(seg)
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

# ================== WEB APP ==================

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
            ssl=ssl_context
        ) as sarvam_ws:
            logger.info("🎤 Sarvam Ready")
            
            async def client_to_sarvam():
                try:
                    chunk_count = 0
                    while True:
                        data = await ws.receive_json()
                        if data.get("type") == "audio":
                            chunk_count += 1
                            if chunk_count % 20 == 0:
                                logger.info(f"🎙️ Audio Chunk #{chunk_count} received")
                            
                            await sarvam_ws.send(json.dumps({
                                "audio": {"data": data["audio"]["data"], "encoding": "audio/wav", "sample_rate": 16000}
                            }))
                        elif data.get("type") == "ping": await ws.send_json({"type": "pong"})
                except Exception: pass

            async def sarvam_to_client():
                try:
                    async for message in sarvam_ws:
                        resp = json.loads(message)
                        logger.info(f"📡 Sarvam Msg: {resp.get('type')}")
                        
                        if resp.get("type") == "data":
                            inner = resp.get("data", {})
                            transcript, is_final = inner.get("transcript", ""), inner.get("is_final", False)
                            if transcript.strip():
                                logger.info(f"✅ Transcript: {transcript}")
                                await ws.send_json({"type": "transcript", "text": transcript, "is_final": is_final})
                                if is_final: asyncio.create_task(run_voice_pipeline(transcript, ws))
                        elif resp.get("type") == "error":
                            logger.error(f"❌ Sarvam Error: {resp}")
                        elif resp.get("type") == "events":
                            logger.info(f"🔔 Sarvam Event: {resp.get('data', {}).get('signal_type')}")
                except Exception as e:
                    logger.info(f"Sarvam stream ended: {e}")
            
            await asyncio.gather(client_to_sarvam(), sarvam_to_client())
    except Exception as e: logger.error(f"WS Exception: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3001)