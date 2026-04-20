# 🏎️ CityPulse: The Intelligent Pune Navigator

**CityPulse** is a high-fidelity, signal-aware navigation engine designed specifically for the streets of Pune. It combines real-time traffic intelligence with a powerful AI voice assistant to create a seamless "Verdant" driving experience.

---

## 🌟 Key Features

### 🎙️ Ira AI Assistant
An integrated voice companion powered by **Gemini 1.5 Flash** and **Sarvam AI**. 
- **Voice Commands**: "Take me to MIT WPU", "Cancel my route".
- **Natural Language**: Understands context and responds with low-latency speech.
- **Multilingual**: Supports English, Hindi, and Marathi.

### 🚦 Verdant Path Routing
A specialized routing algorithm that doesn't just look at distance, but at **Traffic Signal Intelligence**.
- **Signal Scouting**: Predicts how many signals you will encounter.
- **Predictive HUD**: Shows real-time countdowns for upcoming traffic lights.
- **Dynamic HUD**: Glassmorphic UI provides ETA, Trip Cost, and Signal Density at a glance.

### 🏙️ Pune-Optimized Engine
- **PostGIS Backend**: Real-time spatial querying of over 3,000+ mapped signal nodes in Pune.
- **High Fidelity Maps**: Custom Dark Forest theme with signal-aware polyline coloring.

---

## 🏗️ Project Structure

This is a **Modular Monorepo**:
- 📱 `mobile/`: Flutter-based Mobile Application (Android Optimized).
- 🚀 `server/`: Node.js Signal Scouting Engine & PostGIS Bridge.
- 🎙️ `voice_gateway/`: Python-based FastAPI server for Gemini Reasoning & Piper TTS.
- 📂 `shared/`: Centralized storage for AI models and shared assets.

---

## 🚀 Quick Start

### 1. Requirements
- Flutter SDK (3.x)
- Node.js (v18+)
- Python (3.10+) with `uvicorn`, `fastapi`, `websockets`.

### 2. Identity & Keys
Create a `.env` file in the root and add:
```env
GOOGLE_MAPS_API_KEY=your_google_key
SARVAM_API_KEY=your_sarvam_key
GEMINI_API_KEY=your_gemini_key
```

### 3. Launch Sequence
1. **Start Signal Engine**: `cd server && npm run dev`
2. **Start Voice AI**: `cd voice_gateway && python assistant_tts_server.py`
3. **Launch Mobile**: `cd mobile && flutter run`

---

## 🛠️ Tech Stack
- **Frontend**: Flutter (Dart)
- **Backend**: Node.js, Express, Socket.io
- **AI Gateway**: Python, FastAPI
- **Intelligence**: Gemini 1.5, Sarvam STT, Piper TTS
- **Database**: Supabase + PostGIS

---
*Developed for the Future of Urban Mobility in Pune.* 🛰️🚥🏎️
