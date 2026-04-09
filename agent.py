import cv2
import time
import json
import logging
import numpy as np
import threading
import requests
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
    {"direction": "north", "source": "camera_north.mp4", "lat": 18.5204, "lng": 73.8567},
    {"direction": "south", "source": "camera_south.mp4", "lat": 18.5194, "lng": 73.8567},
    {"direction": "east",  "source": "camera_east.mp4",  "lat": 18.5199, "lng": 73.8577},
    {"direction": "west",  "source": "camera_west.mp4",  "lat": 18.5199, "lng": 73.8557},
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

# ── [NEW] Intersection identity ────────────────────────────────────────────────
# INTERSECTION_ID must match the record in your PostGIS database.
# INTERSECTION_LOCATION is the GPS centre-point of the physical intersection.
INTERSECTION_ID       = "INT_001"
INTERSECTION_LOCATION = {"lat": 18.5204, "lng": 73.8567}

# ── [NEW] Pune Real-World Intersection Registry ────────────────────────────────
# Source: Pune Smart City traffic signal dataset.
# To deploy this agent at a different intersection, change INTERSECTION_ID
# to the matching key below and update CAMERAS sources to that location's feeds.
#
# PostGIS schema (for reference):
#   intersections(id TEXT PK, name TEXT, lat FLOAT8, lng FLOAT8, geom GEOMETRY)
#
PUNE_INTERSECTIONS = {
    "INT_001": {"name": "FC Road & Bhandarkar Rd",        "lat": 18.5204, "lng": 73.8567},
    "INT_002": {"name": "Shivajinagar Signal",             "lat": 18.5308, "lng": 73.8474},
    "INT_003": {"name": "Karve Road & Paud Road",          "lat": 18.5088, "lng": 73.8238},
    "INT_004": {"name": "Pune Station Junction",           "lat": 18.5287, "lng": 73.8741},
    "INT_005": {"name": "Swargate Bus Stand",              "lat": 18.5018, "lng": 73.8636},
    "INT_006": {"name": "Viman Nagar Signal",              "lat": 18.5679, "lng": 73.9143},
    "INT_007": {"name": "Kothrud Depot Signal",            "lat": 18.5080, "lng": 73.8065},
    "INT_008": {"name": "Hadapsar Industrial Estate",      "lat": 18.5019, "lng": 73.9346},
    "INT_009": {"name": "Wakad-Hinjewadi Junction",        "lat": 18.5930, "lng": 73.7559},
    "INT_010": {"name": "Deccan Gymkhana Signal",          "lat": 18.5168, "lng": 73.8462},
}

# Resolve active intersection metadata from registry (fallback to defaults)
_active_intersection = PUNE_INTERSECTIONS.get(
    INTERSECTION_ID,
    {"name": INTERSECTION_ID, "lat": INTERSECTION_LOCATION["lat"], "lng": INTERSECTION_LOCATION["lng"]}
)
INTERSECTION_NAME = _active_intersection["name"]

# ── [NEW] Backend & Socket.IO ──────────────────────────────────────────────────
BACKEND_URL          = "http://localhost:5000/api/intersection-data"
BACKEND_LIVE_URL     = "http://localhost:5000/api/live-state"   # GET endpoint polled by mobile
SOCKET_IO_URL        = "http://localhost:5000"
BACKEND_RETRIES      = 2
BACKEND_TIMEOUT      = 5

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
    logging.info(f"[{direction.upper()}] Capturing {n_frames} frames from '{source}'...")

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
    logging.info(f"[{direction.upper()}] Captured {len(frames)} frames.")
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

    logging.info(
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

    def __init__(self):
        self._lock         = threading.Lock()
        self._schedule     = {}
        self._diagnostics  = {}
        self._cycle_start  = None   # time.monotonic() timestamp
        self._last_phase   = None   # tracks phase transitions for logging
        self._total_cycle  = 0      # cached so live payload can include cycle_time

    def update_schedule(self, schedule: dict, diagnostics: dict):
        """
        Called after every detection cycle. Atomically replaces the current
        signal plan and resets the cycle clock.
        """
        total = list(schedule.values())[0]["total_cycle"] if schedule else 0
        with self._lock:
            self._schedule    = schedule
            self._diagnostics = diagnostics
            self._cycle_start = time.monotonic()
            self._total_cycle = total
        logging.info(
            f"[PHASE ENGINE] New signal plan loaded. "
            f"Cycle timer reset. Total cycle: {total}s."
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
                "remaining_time": max(0, int(remaining)),
                "queue_length":   round(q, 1),
                "density":        classify_density(q),
            }

        # ── [NEW] Phase transition logging ───────────────────────────────────
        # Detect when the active phase changes and log it clearly so ops teams
        # can confirm the signal schedule is executing correctly in production.
        if current_phase and current_phase != self._last_phase:
            logging.info(
                f"[PHASE TRANSITION] ▶ {self._last_phase or 'INIT'} → {current_phase.upper()} "
                f"| elapsed={elapsed:.1f}s into cycle"
            )
            self._last_phase = current_phase

        return signals, current_phase


# ─────────────────────────────────────────────────────────────────────────────
# [NEW] LIVE PAYLOAD BUILDER
# ─────────────────────────────────────────────────────────────────────────────

def build_live_payload(phase_engine: PhaseEngine) -> dict:
    """
    Queries the PhaseEngine for the current second-accurate state and builds
    the payload that goes to the backend / Socket.IO every second.

    Output format (matches backend API contract):
    {
      "intersection_id": "INT_001",
      "intersection_name": "FC Road & Bhandarkar Rd",
      "location":        {"lat": 18.5204, "lng": 73.8567},
      "timestamp":       "2026-04-08T08:45:00+00:00",
      "cycle_time":      120,
      "current_phase":   "north",
      "signals": {
        "north": {"state": "GREEN",  "remaining_time": 14, "queue_length": 10, "density": "Medium"},
        "south": {"state": "RED",    "remaining_time": 47, ...},
        ...
      }
    }

    GET /api/live-state?intersection_id=INT_001  →  this exact payload (polled by mobile app)
    WS  intersection_update event                 →  this exact payload (pushed to dashboard)
    """
    signals, current_phase = phase_engine.get_current_state()
    if not signals:
        return {}

    return {
        "intersection_id":   INTERSECTION_ID,
        "intersection_name": INTERSECTION_NAME,          # [NEW] human-readable Pune signal name
        "location":          INTERSECTION_LOCATION,
        "timestamp":         datetime.now(timezone.utc).isoformat(),
        "cycle_time":        phase_engine._total_cycle,  # [NEW] full cycle duration in seconds
        "current_phase":     current_phase,
        "signals":           signals,
    }


# ─────────────────────────────────────────────────────────────────────────────
# PER-CYCLE PAYLOAD BUILDER  [kept for the 30s full-data POST]
# ─────────────────────────────────────────────────────────────────────────────

def build_payload(schedule: dict, diagnostics: dict) -> dict:
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
            "lat":           cam_config.get("lat"),
            "lng":           cam_config.get("lng"),
        }

        logging.info(
            f"[{direction.upper()}] Density: {density} | "
            f"Queue: {queue_raw:.1f} | Green: {info['green']}s"
        )

    return {
        "timestamp":        datetime.now(timezone.utc).isoformat(),
        "intersection_id":  INTERSECTION_ID,
        "location":         INTERSECTION_LOCATION,
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


def live_emission_loop(phase_engine: PhaseEngine, sio):
    """
    Background daemon thread — runs every second.
    Queries PhaseEngine for the current live state and:
      1. Emits 'intersection_update' via Socket.IO (for dashboard + mobile app)
      2. POSTs to REST backend (for clients that poll instead of subscribe)

    This is what drives the real-time signal countdown on the mobile app.
    """
    logging.info("[LIVE EMITTER] Started. Broadcasting state every second.")
    while True:
        try:
            payload = build_live_payload(phase_engine)
            if payload:
                # Socket.IO push (preferred — instant delivery)
                if sio and sio.connected:
                    sio.emit("intersection_update", payload)

                # REST POST (fallback for polling clients)
                send_to_backend(payload)
        except Exception as e:
            logging.warning(f"[LIVE EMITTER] Error during emission: {e}")

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
        logging.warning(
            f"[{direction.upper()}] No frames captured. Fallback: {FALLBACK_SECONDS}s"
        )
        return {
            "direction":    direction,
            "green":        FALLBACK_SECONDS,
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
    logging.info("  CityPulse — Intersection Intelligence Node")
    logging.info("=" * 65)
    logging.info(f"  Intersection : {INTERSECTION_ID} — {INTERSECTION_NAME}")
    logging.info(f"  Location     : {INTERSECTION_LOCATION}")
    logging.info(f"  Detection    : {'YOLOv8n' if YOLO_AVAILABLE else 'OpenCV (fallback)'}")
    logging.info(f"  Sampling     : {N_FRAMES} frames/{SAMPLE_DURATION}s | 4 cameras parallel")
    logging.info(f"  Formula      : green = (PCE_queue / adaptive_rate) + {BUFFER_TIME}  [{MIN_GREEN}–{MAX_GREEN}s]")
    logging.info(f"  Weighting    : Indian PCE model (bike=0.5, car=1.0, truck=2.0, bus=2.5)")
    logging.info(f"  Cycle        : {CYCLE_INTERVAL_SECONDS}s detection + 1s live push")
    logging.info(f"  Backend REST : {BACKEND_URL}")
    logging.info(f"  Backend Live : {BACKEND_LIVE_URL}  ← GET endpoint (mobile polling)")
    logging.info(f"  Socket.IO    : {'enabled' if SOCKETIO_AVAILABLE else 'disabled (pip install python-socketio[client])'}")
    logging.info(f"  Pune registry: {len(PUNE_INTERSECTIONS)} intersections loaded")
    logging.info("  Press Ctrl+C to stop.\n")

    # ── Load YOLO once at startup ────────────────────────────────────────────
    model = load_detector()

    # ── [NEW] Initialise Phase Engine ───────────────────────────────────────
    phase_engine = PhaseEngine()

    # ── [NEW] Connect Socket.IO (optional) ──────────────────────────────────
    sio = setup_socketio()

    # ── [NEW] Start live emission background thread ──────────────────────────
    threading.Thread(
        target=live_emission_loop,
        args=(phase_engine, sio),
        daemon=True
    ).start()
    logging.info("[LIVE EMITTER] Background thread started (1s push interval).\n")

    cycle_number = 1

    while True:
        # time.monotonic() for drift-free interval measurement
        cycle_tick = time.monotonic()
        logging.info(
            f"─── Cycle #{cycle_number} | {datetime.now().strftime('%H:%M:%S')} ───"
        )

        # ── Run detection + build schedule ──────────────────────────────────
        schedule, diagnostics = run_one_cycle(model)

        # ── [NEW] Feed fresh plan into PhaseEngine ───────────────────────────
        phase_engine.update_schedule(schedule, diagnostics)

        # ── Console output ───────────────────────────────────────────────────
        total = list(schedule.values())[0]["total_cycle"]
        print("\n" + "=" * 75)
        print(
            f"  CYCLE #{cycle_number}  |  {INTERSECTION_ID}  |  "
            f"Total: {total}s  |  {'YOLOv8n' if YOLO_AVAILABLE else 'OpenCV'}"
        )
        print("=" * 75)
        print(f"  {'DIR':<7} {'PH':<4} {'RAW Q':<8} {'PCE Q':<8} "
              f"{'GREEN':>6} {'YELLOW':>7} {'RED':>6}  DENSITY")
        print(f"  {'-'*7} {'-'*4} {'-'*8} {'-'*8} {'-'*6} {'-'*7} {'-'*6}  {'-'*8}")

        for direction, info in schedule.items():
            diag   = diagnostics.get(direction, {})
            q      = diag.get("queue_float", 0.0)
            cc     = diag.get("class_counts", {})
            n_fr   = max(len(diag.get("counts", [1])), 1)
            pce    = compute_weighted_queue({k: v / n_fr for k, v in cc.items()})
            print(
                f"  {direction.upper():<7} #{info['phase_order']:<3} "
                f"{q:<8.1f} {pce:<8.1f} "
                f"{info['green']:>5}s  {info['yellow']:>5}s  {info['red']:>5}s  "
                f"{classify_density(q)}"
            )

        print("=" * 75)

        # ── Post full per-cycle payload to backend ──────────────────────────
        cycle_payload = build_payload(schedule, diagnostics)
        print(f"\n  Structured payload → {BACKEND_URL}")
        send_to_backend(cycle_payload)

        # ── Drift-corrected sleep ────────────────────────────────────────────
        cycle_number += 1
        elapsed    = time.monotonic() - cycle_tick
        sleep_time = max(0, CYCLE_INTERVAL_SECONDS - elapsed)
        logging.info(
            f"Cycle took {elapsed:.1f}s. "
            f"Sleeping {sleep_time:.1f}s before next detection...\n"
        )
        time.sleep(sleep_time)


# ─────────────────────────────────────────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    main()
