# 🚦 CityPluse: Intelligent Navigation & Assistant

Welcome to **CityPulse**! This is a modern, real-time traffic signal navigation engine built to make driving in the city seamless. It transforms standard map navigation into a predictive, highly intelligent driving experience by connecting to live traffic data.

---

## ✨ Core Features & What It Displays

Unlike standard navigation apps, CityPulse is designed to look ahead:
- 🚥 **Live Traffic Signals:** Renders exact traffic light locations directly on your route path.
- ⏱️ **Predictive Timers:** Displays a "Signal Card" showing exactly how many seconds are left before a light turns Red or Green.
- 🟢 **The "Green Wave" (Velocity Guidance):** Calculates and recommends the exact driving speed you need to maintain to hit green lights perfectly, avoiding stops.
- 🎙️ **Hands-Free AI Assistant:** A built-in voice companion answers traffic queries, warns you about upcoming signal changes, and reroutes you using natural conversation.
- 🌙 **"Verdant Dark" UX:** A beautiful, dark-mode, distraction-free interface designed for maximum legibility while driving.

---

## 🏗️ Project Architecture

CityPulse is carefully structured as a **Monorepo** (all parts of the project live in this single folder). It is divided into three main modules:

1. **`mobile/` (The Application)**
   - Built with **Flutter**.
   - Handles the Google Maps rendering, dynamic polyline routing, and the sleek driver HUD.
2. **`server/` (The Traffic Engine)**
   - Built with **Node.js** and connected to a **Supabase (PostgreSQL)** database.
   - Responsible for predicting traffic light phases and broadcasting real-time signal timing down to the millisecond.
3. **`voice_gateway/` (The AI Assistant)**
   - Built with **Python**.
   - Handles the AI Voice pipeline using Sarvam AI (for lightning-fast Speech-to-Text) and Google Gemini (for smart conversational logic).

---

## 🚀 How to Run the Project Locally

To fully run CityPulse on your computer, you need to start all three modules. 

### Step 1: Environment Setup (API Keys)
Before starting, you must configure your API keys. We have safely hidden these from GitHub.
1. Find the `.env.example` file in the root directory.
2. Duplicate it and rename the new file to exactly `.env`.
3. Open your new `.env` file and paste in your Supabase Database URL, Google Maps API Key, and your AI keys.
4. Copy this exact `.env` file into both the **`server/`** and **`mobile/`** folders so all modules can read the keys.

### Step 2: Start the AI Voice Assistant
Open a terminal and run the Python AI service:
```bash
cd voice_gateway
python -m pip install -r requirements.txt
python agent.py
```

### Step 3: Start the Traffic Engine (Backend)
Open a *second* terminal and run the Node.js server:
```bash
cd server
npm install
npm run dev
```

### Step 4: Start the Mobile App (Frontend)
Open a *third* terminal. Make sure you have an Android Emulator running or a physical phone connected.
```bash
cd mobile
flutter clean
flutter pub get
flutter run
```

---

## 🔐 Security Notice
**Never commit your `.env` files to GitHub.**
Our `.gitignore` is completely configured to protect your API keys and database passwords. If you add new keys in the future, always put them inside the hidden `.env` files.

---

## 🤝 Contributing
Feel free to fork the project, create a feature branch, and submit a Pull Request! We welcome all improvements to the Navigation UX, the Traffic Server predictions, or the Voice Assistant capabilities.
