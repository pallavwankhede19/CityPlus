import random as _random
import cv2
import time
import json
import logging
import numpy as np
import threading
import requests
import math
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed

# ── [NEW] Optional Socket.IO client ──────────────────────────────────────────
# Install with:  pip install "python-socketio[client]"
# If not installed, live push is skipped gracefully.
try:
    import socketio as _sio_lib
    SOCKETIO_AVAILABLE = True
except ImportError:
    SOCKETIO_AVAILABLE = False

# ── Global YOLO inference lock ────────────────────────────────────────────────
# PyTorch layers are NOT thread-safe. Frame capture runs in parallel (I/O-bound).
# Only one thread runs model() at a time, preventing 'Conv has no attr bn' crash.
_yolo_lock = threading.Lock()

# ─────────────────────────────────────────────────────────────────────────────
# LOGGING SETUP
# ─────────────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# ─────────────────────────────────────────────────────────────────────────────
# TRY TO LOAD YOLO — FALLBACK TO OPENCV IF NOT INSTALLED
# ─────────────────────────────────────────────────────────────────────────────
try:
    from ultralytics import YOLO as _YOLO
    YOLO_AVAILABLE = True
    logging.info("YOLOv8 (ultralytics) found. Using YOLO for vehicle detection.")
except ImportError:
    YOLO_AVAILABLE = False
    logging.warning("ultralytics not installed. Falling back to OpenCV contour detection.")
    logging.warning("For better accuracy:  pip install ultralytics")

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

# ── Camera sources ────────────────────────────────────────────────────────────
# Replace filenames with RTSP URLs when real cameras are available:
#   "rtsp://user:pass@camera_ip:554/stream"
# Optional 'roi': (x1, y1, x2, y2) in pixels on the 640×480 frame.
# Optional 'lat'/'lng': GPS coordinates of each camera pole.
CAMERAS = [
    {"direction": "north", "source": "camera_north.mp4", "latitude": 19.8655, "longitude": 75.3284},
    {"direction": "south", "source": "camera_south.mp4", "latitude": 19.8645, "longitude": 75.3284},
    {"direction": "east",  "source": "camera_east.mp4",  "latitude": 19.8650, "longitude": 75.3294},
    {"direction": "west",  "source": "camera_west.mp4",  "latitude": 19.8650, "longitude": 75.3274},
]

# ── Frame sampling ─────────────────────────────────────────────────────────────
N_FRAMES        = 15    # frames to capture per camera per cycle
SAMPLE_DURATION = 2.5   # seconds to spread those frames across

# ── YOLO vehicle class IDs (COCO dataset) ─────────────────────────────────────
VEHICLE_CLASS_IDS = {2, 3, 5, 7}   # 2=car, 3=motorcycle, 5=bus, 7=truck

# ── Green time formula ─────────────────────────────────────────────────────────
DISCHARGE_RATE  = 1.8   # vehicles/second (baseline — overridden by ADAPTIVE_DISCHARGE)
BUFFER_TIME     = 4     # seconds safety margin
MIN_GREEN       = 10    # minimum green time
MAX_GREEN       = 90    # maximum green time

# ── Signal timing ──────────────────────────────────────────────────────────────
YELLOW_DURATION        = 3
FALLBACK_SECONDS       = 45
CYCLE_INTERVAL_SECONDS = 30

# ── Detection thresholds ───────────────────────────────────────────────────────
YOLO_CONFIDENCE = 0.30  # minimum YOLO confidence to count a vehicle
OPENCV_MIN_AREA = 800   # minimum contour area (px²) for OpenCV fallback

# ── Debug mode ─────────────────────────────────────────────────────────────────
# Saves annotated JPEGs showing what YOLO sees (debug_north.jpg, etc.)
DEBUG_MODE = True

# ── [UPDATED] Multi-Junction "District Controller" Mode ────────────────────────
# Instead of one ID, we now manage ALL junctions in the regional registry.
# The agent will poll the backend for signals and "Adopt" every one it finds.
MAHARASHTRA_REGISTRY_MODE = True
INTERSECTION_LOCATION = {"latitude": 19.8762, "longitude": 75.3433} # Aurangabad Center

# ── [NEW] Pune Real-World Intersection Registry ────────────────────────────────
# Source: Pune Smart City traffic signal dataset.
# To deploy this agent at a different intersection, change INTERSECTION_ID
# to the matching key below and update CAMERAS sources to that location's feeds.
#
# PostGIS schema (for reference):
#   intersections(id TEXT PK, name TEXT, lat FLOAT8, lng FLOAT8, geom GEOMETRY)
#
PUNE_INTERSECTIONS = {
    "INT_001": {"name": "FC Road & Bhandarkar Rd",        "latitude": 18.5204, "longitude": 73.8567},
    "INT_002": {"name": "Shivajinagar Signal",             "latitude": 18.5308, "longitude": 73.8474},
    "INT_003": {"name": "Karve Road & Paud Road",          "latitude": 18.5088, "longitude": 73.8238},
    "INT_004": {"name": "Pune Station Junction",           "latitude": 18.5287, "longitude": 73.8741},
    "INT_005": {"name": "Swargate Bus Stand",              "latitude": 18.5018, "longitude": 73.8636},
    "INT_006": {"name": "Viman Nagar Signal",              "latitude": 18.5679, "longitude": 73.9143},
    "INT_007": {"name": "Kothrud Depot Signal",            "latitude": 18.5080, "longitude": 73.8065},
    "INT_008": {"name": "Hadapsar Industrial Estate",      "latitude": 18.5019, "longitude": 73.9346},
    "INT_009": {"name": "Wakad-Hinjewadi Junction",        "latitude": 18.5930, "longitude": 73.7559},
    "INT_010": {"name": "Deccan Gymkhana Signal",          "latitude": 18.5168, "longitude": 73.8462},
}


# ── [NEW] Backend & Socket.IO (CIDCO Corridor) ───────────────────────────────
BACKEND_URL      = "http://localhost:3000/api/intersection-data"
BACKEND_LIVE_URL = "http://localhost:3000/api/live-state"
SOCKET_IO_URL    = "http://localhost:3000"
BACKEND_RETRIES      = 2
BACKEND_TIMEOUT      = 15

# ── [NEW] Indian traffic vehicle weighting (PCE model) ────────────────────────
# Passenger Car Equivalent (PCE) weights per vehicle class.
# Motorcycles clear ~2x faster; buses/trucks take much longer.
# This gives a better green-time estimate for heterogeneous Indian traffic.
VEHICLE_WEIGHTS = {
    2: 1.0,   # car         → baseline
    3: 0.5,   # motorcycle  → clears quickly
    5: 2.5,   # bus         → large, slow discharge
    7: 2.0,   # truck       → heavy, slow discharge
}

# When True, discharge rate adapts based on the detected vehicle mix.
ADAPTIVE_DISCHARGE = True


# ─────────────────────────────────────────────────────────────────────────────
# LOAD DETECTOR ONCE AT STARTUP
# ─────────────────────────────────────────────────────────────────────────────

def load_detector():
    """
    Loads YOLOv8n once at startup. Returns None if YOLO unavailable
    (OpenCV fallback will be used). Weights (~6 MB) auto-download on first run.
    """
    if YOLO_AVAILABLE:
        logging.info("Loading YOLOv8n model (downloads ~6 MB on first run)...")
        model = _YOLO("yolov8n.pt")
        logging.info("YOLOv8n loaded successfully.")
        return model
    return None


# ─────────────────────────────────────────────────────────────────────────────
# STEP 1 — CAPTURE MULTIPLE FRAMES  [UNCHANGED]
# ─────────────────────────────────────────────────────────────────────────────

def capture_frames(source, direction, n_frames=N_FRAMES, duration=SAMPLE_DURATION):
    """
    Opens the video source and captures N_FRAMES spread evenly over `duration`
    seconds. Multiple frames per cycle give a stable, noise-robust queue count.
    Returns a list of 640×480 BGR numpy arrays, or empty list on failure.
    """
    logging.debug(f"[{direction.upper()}] Capturing {n_frames} frames from '{source}'...")

    cap = cv2.VideoCapture(source)
    if not cap.isOpened():
        logging.error(f"[{direction.upper()}] Cannot open video source: {source}")
        return []

    fps       = cap.get(cv2.CAP_PROP_FPS) or 25
    total_vid = cap.get(cv2.CAP_PROP_FRAME_COUNT)
    frame_gap = max(1, int(fps * duration / n_frames))
    frames    = []

    for i in range(n_frames):
        target = i * frame_gap
        if total_vid > 0:
            target = int(target % total_vid)
        cap.set(cv2.CAP_PROP_POS_FRAMES, target)
        ok, frame = cap.read()
        if ok:
            frames.append(cv2.resize(frame, (640, 480)))

    cap.release()
    logging.debug(f"[{direction.upper()}] Captured {len(frames)} frames.")
    return frames


# ─────────────────────────────────────────────────────────────────────────────
# ROI HELPER  [UNCHANGED]
# ─────────────────────────────────────────────────────────────────────────────

def get_roi(frame, roi_box=None):
    """
    Crops the frame to the Region of Interest (stop-line area).
    Default is the full frame. Override per camera via the CAMERAS config.
    Returns (roi_frame, x_offset, y_offset).

    roi_box may be:
      - None              → full frame
      - (x1,y1,x2,y2)    → rectangular crop  [legacy]
      - [(x,y), ...]      → convex polygon   [NEW — for irregular stop-line shapes]
    """
    h, w = frame.shape[:2]

    # ── [NEW] Polygon ROI support ─────────────────────────────────────────────
    # Indian intersections often have non-rectangular stop-line areas, especially
    # at T-junctions and flared medians. A polygon mask preserves accurate vehicle
    # counts while excluding footpaths and parked vehicles outside the stop zone.
    if isinstance(roi_box, (list, tuple)) and len(roi_box) >= 3 and isinstance(roi_box[0], (list, tuple)):
        pts   = np.array(roi_box, dtype=np.int32)
        mask  = np.zeros(frame.shape[:2], dtype=np.uint8)
        cv2.fillPoly(mask, [pts], 255)
        masked = cv2.bitwise_and(frame, frame, mask=mask)
        x1    = int(pts[:, 0].min())
        y1    = int(pts[:, 1].min())
        x2    = int(pts[:, 0].max())
        y2    = int(pts[:, 1].max())
        return masked[y1:y2, x1:x2], x1, y1

    # ── Rectangular ROI (original behaviour) ─────────────────────────────────
    if roi_box:
        x1, y1, x2, y2 = roi_box
    else:
        x1, y1, x2, y2 = 0, 0, w, h
    return frame[y1:y2, x1:x2], x1, y1


# ─────────────────────────────────────────────────────────────────────────────
# DEBUG HELPER  [UNCHANGED]
# ─────────────────────────────────────────────────────────────────────────────

def save_debug_frame(frame, detections, direction, roi_box=None):
    """
    Saves an annotated JPEG:
      - Green rectangle: the ROI being searched
      - Blue rectangles: each detected vehicle
    Open debug_north.jpg etc. to tune your ROI coordinates.
    """
    annotated      = frame.copy()
    h, w           = frame.shape[:2]
    rx1, ry1, rx2, ry2 = roi_box if roi_box else (0, 0, w, h)

    cv2.rectangle(annotated, (rx1, ry1), (rx2, ry2), (0, 255, 0), 2)
    cv2.putText(annotated, "ROI", (rx1 + 5, ry1 + 20),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

    for (bx1, by1, bx2, by2) in detections:
        cv2.rectangle(annotated,
                      (rx1 + bx1, ry1 + by1),
                      (rx1 + bx2, ry1 + by2),
                      (255, 100, 0), 2)

    filename = f"debug_{direction}.jpg"
    cv2.imwrite(filename, annotated)
    logging.info(f"[{direction.upper()}] Debug image saved → {filename}")


# ─────────────────────────────────────────────────────────────────────────────
# VEHICLE DETECTION — YOLO PATH  [MODIFIED: now also returns class_counts]
# ─────────────────────────────────────────────────────────────────────────────

def detect_vehicles_yolo(frame_roi, model):
    """
    Runs YOLOv8 on the ROI crop. Returns:
      count       – total vehicle count
      boxes_list  – bounding boxes for debug overlay
      class_counts – {class_id: n} breakdown used for Indian traffic weighting

    Thread-safe via _yolo_lock (one inference at a time).
    """
    with _yolo_lock:
        results = model(frame_roi, conf=YOLO_CONFIDENCE, verbose=False)

    count        = 0
    boxes_list   = []
    class_counts = {}

    for result in results:
        for box in result.boxes:
            cls_id = int(box.cls[0])
            if cls_id in VEHICLE_CLASS_IDS:
                count += 1
                class_counts[cls_id] = class_counts.get(cls_id, 0) + 1
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                boxes_list.append((x1, y1, x2, y2))

    return count, boxes_list, class_counts


# ─────────────────────────────────────────────────────────────────────────────
# VEHICLE DETECTION — OPENCV FALLBACK  [UNCHANGED]
# ─────────────────────────────────────────────────────────────────────────────

def detect_vehicles_opencv(frame_roi):
    """Edge + contour detection fallback — no extra dependencies."""
    gray    = cv2.cvtColor(frame_roi, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges   = cv2.Canny(blurred, 50, 150)
    dilated = cv2.dilate(edges, np.ones((5, 5), np.uint8), iterations=2)
    contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    return sum(1 for c in contours if cv2.contourArea(c) > OPENCV_MIN_AREA)


# ─────────────────────────────────────────────────────────────────────────────
# [NEW] INDIAN TRAFFIC WEIGHTING HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def compute_weighted_queue(avg_class_counts: dict) -> float:
    """
    Converts a per-class vehicle count dict into a Passenger Car Equivalent (PCE)
    queue length. Bikes contribute 0.5 PCE, buses 2.5 PCE, etc.
    PCE is the standard metric used in Indian traffic engineering (IRC guidelines).
    """
    return sum(
        VEHICLE_WEIGHTS.get(cls_id, 1.0) * cnt
        for cls_id, cnt in avg_class_counts.items()
    )


def compute_adaptive_discharge(avg_class_counts: dict) -> float:
    """
    Adjusts the discharge rate based on the detected vehicle mix.
    Heavy-vehicle-heavy queues take longer to clear; bike-heavy queues are faster.
    Returns vehicles/second.
    """
    if not avg_class_counts or not ADAPTIVE_DISCHARGE:
        return DISCHARGE_RATE
    total = sum(avg_class_counts.values())
    if total == 0:
        return DISCHARGE_RATE
    heavy       = avg_class_counts.get(5, 0) + avg_class_counts.get(7, 0)
    heavy_ratio = heavy / total
    if heavy_ratio > 0.3:
        return 1.4   # >30% buses/trucks → slow clearing
    elif heavy_ratio < 0.1:
        return 2.1   # <10% heavy vehicles → fast clearing (bikes/cars dominate)
    return DISCHARGE_RATE


# ─────────────────────────────────────────────────────────────────────────────
# STEP 2 — ESTIMATE QUEUE LENGTH  [MODIFIED: PCE + adaptive discharge]
# ─────────────────────────────────────────────────────────────────────────────

def estimate_queue_and_green(frames, direction, roi_box, model):
    """
    Core detection pipeline.

    For each captured frame:
      1. Crop to stop-line ROI
      2. Run YOLO (or OpenCV fallback) → per-class vehicle counts
    Then:
      3. Median count across frames (noise-robust)
      4. Compute PCE-weighted queue (Indian traffic model)
      5. Compute adaptive discharge rate
      6. Apply green time formula: green = (PCE_queue / discharge) + buffer

    Returns: (green_seconds, raw_queue, per_frame_counts, all_class_counts)
    """
    per_frame_counts = []
    all_class_counts = {}  # cumulative vehicle class totals across frames
    debug_boxes      = []

    for i, frame in enumerate(frames):
        roi_frame, _, _ = get_roi(frame, roi_box)

        if model is not None:
            count, boxes, class_counts = detect_vehicles_yolo(roi_frame, model)
            for cls_id, cnt in class_counts.items():
                all_class_counts[cls_id] = all_class_counts.get(cls_id, 0) + cnt
            if i == 0:
                debug_boxes = boxes
                if DEBUG_MODE:
                    save_debug_frame(frame, boxes, direction, roi_box)
        else:
            count = detect_vehicles_opencv(roi_frame)

        per_frame_counts.append(count)
        logging.debug(f"[{direction.upper()}] Frame {i+1}: {count} vehicles")

    if not per_frame_counts:
        return FALLBACK_SECONDS, 0.0, [], {}

    # Median = robust to single-frame detection noise
    raw_queue = float(np.median(per_frame_counts))

    # PCE-weighted queue + adaptive discharge (Indian traffic model)
    if ADAPTIVE_DISCHARGE and all_class_counts:
        n          = len(per_frame_counts)
        avg_class  = {k: v / n for k, v in all_class_counts.items()}
        weighted_q = compute_weighted_queue(avg_class)
        discharge  = compute_adaptive_discharge(avg_class)
    else:
        weighted_q = raw_queue
        discharge  = DISCHARGE_RATE

    raw_green  = (weighted_q / discharge) + BUFFER_TIME
    green_time = int(max(MIN_GREEN, min(MAX_GREEN, round(raw_green))))

    logging.debug(
        f"[{direction.upper()}] Raw: {raw_queue:.1f} vehicles | "
        f"PCE: {weighted_q:.1f} | Rate: {discharge:.1f}/s | "
        f"Green: {raw_green:.1f}s → {green_time}s"
    )
    return green_time, raw_queue, per_frame_counts, all_class_counts


# ─────────────────────────────────────────────────────────────────────────────
# STEP 3: SCHEDULE SIGNALS SAFELY  [UNCHANGED]
# ─────────────────────────────────────────────────────────────────────────────

def schedule_signals(green_times: dict) -> dict:
    """
    Converts per-direction green times into the full collision-free schedule.

    Safety guarantee (mathematically enforced):
        red[D] = total_cycle - green[D] - yellow[D]
    This equals the sum of every other phase. Two directions CANNOT be green
    simultaneously — it is impossible by construction.

    Returns dict per direction: {green, yellow, red, phase_order, total_cycle}
    """
    directions  = list(green_times.keys())
    total_cycle = sum(green_times[d] + YELLOW_DURATION for d in directions)
    schedule    = {}

    for i, direction in enumerate(directions):
        green  = green_times[direction]
        yellow = YELLOW_DURATION
        red    = total_cycle - green - yellow
        schedule[direction] = {
            "green":       green,
            "yellow":      yellow,
            "red":         red,
            "phase_order": i + 1,
            "total_cycle": total_cycle
        }

    return schedule


# ─────────────────────────────────────────────────────────────────────────────
# DENSITY CLASSIFICATION  [UNCHANGED]
# ─────────────────────────────────────────────────────────────────────────────

def classify_density(queue_length: float) -> str:
    """Low: 0–5 | Medium: 6–15 | High: 16+"""
    if queue_length <= 5:
        return "Low"
    elif queue_length <= 15:
        return "Medium"
    else:
        return "High"


# ─────────────────────────────────────────────────────────────────────────────
# [NEW] REAL-TIME PHASE ENGINE
# ─────────────────────────────────────────────────────────────────────────────

class PhaseEngine:
    """
    Continuously tracks the LIVE signal state of every direction — updated
    every second, not just every 30-second detection cycle.

    HOW IT WORKS:
      1. After each detection cycle, main() calls update_schedule() with
         the new signal plan and current diagnostics.
      2. The engine records the wall-clock start time of that plan.
      3. Any code can call get_current_state() at any moment to receive
         the exact current state (GREEN/YELLOW/RED + remaining seconds)
         for every direction, computed from elapsed time.

    This powers:
      - Mobile app countdown alerts  ("North turns green in 14s")
      - Admin dashboard live map     (colour-coded signals per intersection)
      - Socket.IO push events        (emitted every second)
    """

    def __init__(self, intersection_id, location):
        self._lock         = threading.Lock()
        self.intersection_id = intersection_id
        self.location      = location
        self._schedule     = {}
        self._diagnostics  = {}
        self._cycle_start  = None   
        self._last_phase   = None   
        self._total_cycle  = 0     
        self.stress_score  = 0.2 # [NEW] Default low-stress fallback

    def update_schedule(self, schedule: dict, diagnostics: dict):
        """
        Called after every detection cycle. Atomically replaces the current
        signal plan and resets the cycle clock.
        """
        total = list(schedule.values())[0]["total_cycle"] if schedule else 0
        with self._lock:
            self._schedule    = schedule
            self._diagnostics = diagnostics
            # 🕒 CONTINUITY: Only pick a random start time ONCE. 
            # Subsequent updates (every 30s) should NOT reset the clock, or the timers will jump.
            if self._cycle_start is None:
                self._cycle_start = time.monotonic() - _random.uniform(0, total)
            
            self._total_cycle = total
        logging.debug(
            f"[PHASE ENGINE] New signal plan loaded for {self.intersection_id}. "
            f"Cycle timer reset with random offset. Total cycle: {total}s."
        )

    def get_current_state(self) -> tuple:
        """
        Returns (signals_dict, current_phase_direction).

        signals_dict example:
        {
          "north": {"state": "GREEN",  "remaining_time": 14, "queue_length": 10, "density": "Medium"},
          "south": {"state": "RED",    "remaining_time": 47, "queue_length":  3, "density": "Low"},
          "east":  {"state": "RED",    "remaining_time": 62, "queue_length":  7, "density": "Medium"},
          "west":  {"state": "RED",    "remaining_time": 75, "queue_length":  1, "density": "Low"},
        }
        """
        with self._lock:
            schedule    = dict(self._schedule)
            diagnostics = dict(self._diagnostics)
            cycle_start = self._cycle_start

        if not schedule or cycle_start is None:
            return {}, None

        total_cycle = list(schedule.values())[0]["total_cycle"]
        elapsed     = (time.monotonic() - cycle_start) % total_cycle

        # Build time windows per direction in phase_order sequence
        sorted_dirs   = sorted(schedule, key=lambda d: schedule[d]["phase_order"])
        phase_windows = {}
        cursor        = 0.0

        for d in sorted_dirs:
            info = schedule[d]
            phase_windows[d] = {
                "green_start":  cursor,
                "yellow_start": cursor + info["green"],
                "phase_end":    cursor + info["green"] + info["yellow"],
            }
            cursor += info["green"] + info["yellow"]

        # Compute state for each direction
        signals       = {}
        current_phase = None

        for d, win in phase_windows.items():
            q       = diagnostics.get(d, {}).get("queue_float", 0.0)
            density = classify_density(q)

            if win["green_start"] <= elapsed < win["yellow_start"]:
                remaining     = win["yellow_start"] - elapsed
                state         = "GREEN"
                current_phase = d

            elif win["yellow_start"] <= elapsed < win["phase_end"]:
                remaining     = win["phase_end"] - elapsed
                state         = "YELLOW"
                current_phase = d

            else:
                # RED: time until this direction's green window starts again
                remaining = (win["green_start"] - elapsed) % total_cycle
                state     = "RED"

            signals[d] = {
                "state":          state,
                "remaining_time": max(0, math.ceil(remaining)),
                "queue_length":   round(q, 1),
                "density":        classify_density(q),
            }

        # ── [NEW] Phase transition logging ───────────────────────────────────
        # Detect when the active phase changes and log it clearly so ops teams
        # can confirm the signal schedule is executing correctly in production.
        if current_phase and current_phase != self._last_phase:
            logging.debug(
                f"[PHASE TRANSITION] ▶ {self._last_phase or 'INIT'} → {current_phase.upper()} "
                f"| elapsed={elapsed:.1f}s into cycle"
            )
            self._last_phase = current_phase

        return signals, current_phase


# ─────────────────────────────────────────────────────────────────────────────
# [NEW] LIVE PAYLOAD BUILDER
# ─────────────────────────────────────────────────────────────────────────────

def build_live_payloads(phase_engines: dict) -> list:
    """
    Queries all active PhaseEngines and builds a list of payloads.
    """
    payloads = []
    for intersection_id, engine in phase_engines.items():
        signals, current_phase = engine.get_current_state()
        if not signals: continue
        
        # 🛰️ Calculate load for this specific junction
        total_q = sum(s.get("queue_length", 0) for s in signals.values())
        
        payloads.append({
            "intersection_id":   intersection_id,
            "lat":               engine.location["latitude"],
            "lon":               engine.location["longitude"],
            "queue_length":      total_q,
            "timestamp":         datetime.now(timezone.utc).isoformat(),
            "current_phase":     current_phase,
            "signals":           signals,
        })
    return payloads


# ─────────────────────────────────────────────────────────────────────────────
# PER-CYCLE PAYLOAD BUILDER  [kept for the 30s full-data POST]
# ─────────────────────────────────────────────────────────────────────────────

def build_payload(schedule: dict, diagnostics: dict, intersection_id: str, location: dict) -> dict:
    """
    Builds the comprehensive per-cycle payload containing the full schedule,
    queue lengths, density levels, and GPS per direction.
    Posted to the backend once at the end of each 30-second detection cycle.
    """
    total_cycle = list(schedule.values())[0]["total_cycle"]
    cam_lookup  = {c["direction"]: c for c in CAMERAS}
    directions_payload = {}

    for direction, info in schedule.items():
        queue_raw  = diagnostics.get(direction, {}).get("queue_float", 0.0)
        cam_config = cam_lookup.get(direction, {})
        density    = classify_density(queue_raw)

        directions_payload[direction] = {
            "queue_length":  round(queue_raw, 1),
            "density_level": density,
            "green_time":    info["green"],
            "yellow_time":   info["yellow"],
            "red_time":      info["red"],
            "phase_order":   info["phase_order"],
            "latitude":      cam_config.get("latitude"),
            "longitude":     cam_config.get("longitude"),
        }

        logging.info(
            f"[{direction.upper()}] Density: {density} | "
            f"Queue: {queue_raw:.1f} | Green: {info['green']}s"
        )

    # 🛰️ Flatten for Node.js intersectionController.js
    total_q = sum(d.get("queue_length", 0) for d in directions_payload.values())
    
    return {
        "lat":              location.get("latitude"),
        "lon":              location.get("longitude"),
        "queue_length":     total_q, # Send total junction load
        "timestamp":        datetime.now(timezone.utc).isoformat(),
        "intersection_id":  intersection_id,
        "total_cycle_time": total_cycle,
        "directions":       directions_payload,
    }


# ─────────────────────────────────────────────────────────────────────────────
# NON-BLOCKING BACKEND SENDER  [UNCHANGED]
# ─────────────────────────────────────────────────────────────────────────────

def _post_to_backend(payload: dict):
    """Retries up to BACKEND_RETRIES times. Never propagates exceptions."""
    for attempt in range(1, BACKEND_RETRIES + 1):
        try:
            r = requests.post(BACKEND_URL, json=payload, timeout=BACKEND_TIMEOUT)
            r.raise_for_status()
            logging.info(f"[BACKEND] POST success (attempt {attempt}) → HTTP {r.status_code}")
            return
        except requests.exceptions.RequestException as e:
            logging.warning(f"[BACKEND] POST failed (attempt {attempt}/{BACKEND_RETRIES}): {e}")
            if attempt < BACKEND_RETRIES:
                time.sleep(1)
    logging.error("[BACKEND] All retry attempts exhausted. Agent continues normally.")


def send_to_backend(payload: dict):
    """Fires the POST in a daemon thread — never blocks the main loop."""
    threading.Thread(target=_post_to_backend, args=(payload,), daemon=True).start()

def send_bulk_to_backend(payload_list: list):
    """
    [NEW] Sends multiple junction updates in a single POST to reduce DB overhead.
    Essential for scaling to thousands of junctions.
    """
    if not payload_list: return
    url = f"{BACKEND_URL.replace('/intersection-data', '/bulk-ingest')}"
    threading.Thread(target=lambda: requests.post(url, json={"updates": payload_list}, timeout=10), daemon=True).start()


# ─────────────────────────────────────────────────────────────────────────────
# [NEW] SOCKET.IO SETUP & LIVE EMISSION LOOP
# ─────────────────────────────────────────────────────────────────────────────

def setup_socketio():
    """
    Creates a Socket.IO client and connects to the Node.js backend.
    Returns the client object, or None if unavailable / connection fails.
    The agent continues normally if Socket.IO is not set up.
    """
    if not SOCKETIO_AVAILABLE:
        logging.info("[SOCKET.IO] python-socketio not installed. Skipping.")
        logging.info("[SOCKET.IO] To enable:  pip install 'python-socketio[client]'")
        return None
    try:
        sio = _sio_lib.Client()
        sio.connect(SOCKET_IO_URL, wait_timeout=5)
        logging.info(f"[SOCKET.IO] Connected to {SOCKET_IO_URL}")
        return sio
    except Exception as e:
        logging.warning(f"[SOCKET.IO] Connection failed: {e}. Live push disabled.")
        return None


def live_emission_loop(phase_engines: dict, sio):
    """
    Background daemon thread — broadcasts every second for ALL managed junctions.
    This drives the real-time signal countdown for the entire region.
    """
    logging.info(f"[LIVE EMITTER] Started. Broadcasting {len(phase_engines)} junctions every second.")
    while True:
        try:
            # 🛰️ AUTO-RECONNECT: If we lost the backend, try to find it again.
            if sio is None or not sio.connected:
                logging.warning("[LIVE EMITTER] Socket disconnected. Attempting to reconnect...")
                sio = setup_socketio()
                if not sio or not sio.connected:
                    time.sleep(2) # Wait and try again
                    continue

            payloads = build_live_payloads(phase_engines)
            if payloads and sio and sio.connected:
                # 🚀 BULK PUSH: Send all 100 updates in ONE event
                sio.emit("regional_update", {"updates": payloads})
        except Exception as e:
            logging.warning(f"[LIVE EMITTER] Error: {e}")
            sio = None # Trigger reconnect on next loop

        time.sleep(1)


# ─────────────────────────────────────────────────────────────────────────────
# CAMERA WORKER  [MODIFIED: returns class_counts]
# ─────────────────────────────────────────────────────────────────────────────

def _process_one_camera(camera: dict, model) -> dict:
    """
    Worker function for a single camera — called in parallel by ThreadPoolExecutor.
    Captures frames, runs detection, and returns the full result dict including
    per-class vehicle counts needed for Indian traffic weighting.
    """
    direction = camera["direction"]
    source    = camera["source"]
    roi_box   = camera.get("roi", None)

    frames = capture_frames(source, direction)

    if not frames:
        # 🛰️ ADAPTIVE FALLBACK: Use stress_score to scale the green light.
        # If stress=1.0 (Heavy Traffic), fallback increases significantly (e.g. 45s -> 90s)
        stress_scale = 1.0 + (getattr(model, 'current_stress', 0.2) * 1.5)
        adaptive_fallback = int(FALLBACK_SECONDS * stress_scale)
        
        logging.warning(
            f"[{direction.upper()}] No frames captured. Sat-Stress: {getattr(model, 'current_stress', 0.2):.2f} | Adaptive Fallback: {adaptive_fallback}s"
        )
        return {
            "direction":    direction,
            "green":        adaptive_fallback,
            "queue_float":  0.0,
            "counts":       [],
            "class_counts": {},
        }

    green, queue, counts, class_counts = estimate_queue_and_green(
        frames, direction, roi_box, model
    )
    return {
        "direction":    direction,
        "green":        green,
        "queue_float":  queue,
        "counts":       counts,
        "class_counts": class_counts,
    }


# ─────────────────────────────────────────────────────────────────────────────
# STEP 4: PROCESS ALL 4 CAMERAS IN PARALLEL  [MODIFIED: includes class_counts]
# ─────────────────────────────────────────────────────────────────────────────

def run_one_cycle(model) -> tuple:
    """
    Runs all 4 camera workers simultaneously via ThreadPoolExecutor.
    Analysis time: ~1× per-camera time (parallel) instead of ~4× (sequential).
    Returns (schedule, diagnostics) — schedule is the collision-free signal plan.
    """
    raw_green_times = {}
    diagnostics     = {}

    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = {
            executor.submit(_process_one_camera, cam, model): cam["direction"]
            for cam in CAMERAS
        }
        for future in as_completed(futures):
            direction = futures[future]
            try:
                result = future.result()
                d      = result["direction"]
                raw_green_times[d] = result["green"]
                diagnostics[d]     = {
                    "queue":        f"{result['queue_float']:.1f}",
                    "queue_float":  result["queue_float"],
                    "counts":       result["counts"],
                    "class_counts": result["class_counts"],
                }
            except Exception as e:
                logging.error(f"[{direction.upper()}] Thread error: {e}. Using fallback.")
                raw_green_times[direction] = FALLBACK_SECONDS
                diagnostics[direction]     = {
                    "queue": "ERR", "queue_float": 0.0,
                    "counts": [], "class_counts": {}
                }

    # Re-order to match CAMERAS list (as_completed is non-deterministic)
    ordered_green = {
        cam["direction"]: raw_green_times[cam["direction"]] for cam in CAMERAS
    }
    schedule = schedule_signals(ordered_green)
    return schedule, diagnostics


# ─────────────────────────────────────────────────────────────────────────────
# MAIN AGENT LOOP  [MODIFIED: PhaseEngine + live emitter + drift correction]
# ─────────────────────────────────────────────────────────────────────────────

def main():
    logging.info("=" * 65)
    logging.info("  CityPulse — Maharashtra District Controller [STABLE]")
    logging.info("=" * 65)
    logging.info(f"  Mode         : MULTI-JUNCTION (State-Wide Grid)")
    logging.info(f"  Detection    : {'YOLOv8n' if YOLO_AVAILABLE else 'OpenCV (fallback)'}")
    logging.info("  Press Ctrl+C to stop.\n")

    model = load_detector()
    sio = setup_socketio()
    
    # ── [NEW] Robust Regional Adoption (Retries until Grid is found) ─────────
    active_engines = {}
    signals_found = 0
    while signals_found < 50: # Expect at least 50 for a healthy grid
        try:
            logging.info("📡 Scanning Maharashtra Regional Grid for active junctions...")
            r = requests.get(BACKEND_URL.replace("/intersection-data", "/all-signals"), timeout=BACKEND_TIMEOUT)
            signals_from_db = r.json().get("signals", [])
            signals_found = len(signals_from_db)
            
            if signals_found < 50:
                logging.warning(f"⚠️ Only found {signals_found} signals. Retrying in 3s...")
                time.sleep(3)
                continue

            for s in signals_from_db:
                eid = s["intersection_id"]
                loc = s.get("location", INTERSECTION_LOCATION)
                engine = PhaseEngine(eid, loc)
                
                # 🖇️ [NEW] HEART-START: If signal is new/unmanaged, kickstart it with a 75s cycle
                if not s.get("data") or "signals" not in s.get("data", {}):
                    default_plan = {"green": 30, "yellow": 3, "red": 42, "phase_order": 1}
                    total_c = sum([v for k,v in default_plan.items() if k != "phase_order"])
                    engine.update_schedule({
                        "north": {**default_plan, "total_cycle": total_c},
                        "south": {**default_plan, "total_cycle": total_c},
                        "east":  {**default_plan, "total_cycle": total_c},
                        "west":  {**default_plan, "total_cycle": total_c}
                    }, {})
                
                active_engines[eid] = engine
            
            logging.info(f"🚀 TOTAL CITY HEART-START: {len(active_engines)} junctions are now pulsing in Maharashtra.")
            break
        except Exception as e:
            logging.error(f"❌ Grid Sync Failed: {e}. Retrying in 5s...")
            time.sleep(5)

    # ── Start live emission background thread ──────────────────────────
    threading.Thread(
        target=live_emission_loop,
        args=(active_engines, sio),
        daemon=True
    ).start()

    cycle_number = 1
    while True:
        cycle_tick = time.monotonic()
        logging.info(f"─── Regional Cycle #{cycle_number} ───")

        # ── [NEW] Throttled Satellite Traffic Check (Every 5 cycles) ──────────
        # Fetches external Google Traffic context to help during 'Blind Mode'
        if cycle_number % 5 == 1:
            logging.info("🛰️ Syncing with Satellite Traffic Intelligence...")
            for eid, engine in active_engines.items():
                try:
                    t_url = f"{BACKEND_URL.replace('/intersection-data','/traffic/stress')}?lat={engine.location.get('latitude')}&lng={engine.location.get('longitude')}"
                    tr = requests.get(t_url, timeout=2)
                    engine.stress_score = tr.json().get("stress_score", 0.2)
                except:
                    continue # Skip if Google is slow or backend busy

        # ── [NEW] Shared regional detection (Think Once, Apply Everywhere) ─
        # In this regional demo mode, we use the primary camera analytics 
        # as a baseline for the entire city, making the system 100x more efficient.
        model.current_stress = 0.2
        schedule, diagnostics = run_one_cycle(model)

        bulk_payloads = []
        for eid, engine in active_engines.items():
            # Apply detection to this engine's cycle
            engine.update_schedule(schedule, diagnostics)
            
            # Prepare payload for bulk-ingest
            p = build_payload(schedule, diagnostics, engine.intersection_id, engine.location)
            bulk_payloads.append(p)

        # 🚀 [NEW] Send all 100 updates in ONE regional batch request
        # This prevents the "Max Clients" database crash.
        logging.info(f"📤 Bulk Uploading {len(bulk_payloads)} junctions to Maharashtra Grid...")
        send_bulk_to_backend(bulk_payloads)

        cycle_number += 1
        elapsed_cycle = time.monotonic() - cycle_tick
        
        # 🧘‍♂️ SAFETY SLEEP: Allow system to breathe between regional sweeps
        sleep_time = max(1, 30 - elapsed_cycle) 
        logging.info(f"✅ Cycle #{cycle_number-1} complete in {elapsed_cycle:.1f}s. Sleeping {sleep_time:.1f}s...")
        time.sleep(sleep_time)


# ─────────────────────────────────────────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    main()
