"""
test_analysis.py — CityPulse Agent Analysis Demo
================================================
Bypasses video capture and directly tests the core analysis pipeline
with realistic Indian traffic scenarios.

Run with:  python test_analysis.py
"""

import sys
import json
from datetime import datetime, timezone

# ── Import core functions from agent ────────────────────────────────────────
sys.path.insert(0, ".")
from agent import (
    schedule_signals,
    classify_density,
    build_payload,
    compute_weighted_queue,
    compute_adaptive_discharge,
    DISCHARGE_RATE,
    BUFFER_TIME,
    MIN_GREEN,
    MAX_GREEN,
    YELLOW_DURATION,
    VEHICLE_WEIGHTS,
    INTERSECTION_ID,
    INTERSECTION_LOCATION,
    INTERSECTION_NAME,       # [NEW] human-readable Pune signal name
    PUNE_INTERSECTIONS,      # [NEW] full Pune dataset registry
)

# ─────────────────────────────────────────────────────────────────────────────
# TEST SCENARIOS — Edit these to simulate any traffic situation
# ─────────────────────────────────────────────────────────────────────────────
SCENARIOS = [
    {
        "name": "🌙 Late Night — Almost Empty",
        "directions": {
            "north": {"raw_queue": 1,  "class_counts": {3: 1}},             # 1 bike
            "south": {"raw_queue": 0,  "class_counts": {}},
            "east":  {"raw_queue": 2,  "class_counts": {2: 2}},             # 2 cars
            "west":  {"raw_queue": 1,  "class_counts": {3: 1}},             # 1 bike
        }
    },
    {
        "name": "🌤️ Morning — Light Traffic",
        "directions": {
            "north": {"raw_queue": 5,  "class_counts": {2: 3, 3: 4}},       # 3 cars, 4 bikes
            "south": {"raw_queue": 3,  "class_counts": {2: 2, 3: 2}},
            "east":  {"raw_queue": 7,  "class_counts": {2: 4, 3: 6}},
            "west":  {"raw_queue": 4,  "class_counts": {2: 3, 3: 2}},
        }
    },
    {
        "name": "🚦 Peak Hour — Heavy Traffic (Indian Rush Hour)",
        "directions": {
            "north": {"raw_queue": 18, "class_counts": {2: 8, 3: 15, 7: 2}},  # cars, bikes, trucks
            "south": {"raw_queue": 22, "class_counts": {2: 10, 3: 20, 5: 1}}, # + 1 bus
            "east":  {"raw_queue": 12, "class_counts": {2: 6, 3: 10}},
            "west":  {"raw_queue": 25, "class_counts": {2: 12, 3: 22, 5: 2, 7: 3}}, # busiest
        }
    },
    {
        "name": "🚌 Bus-Heavy — Commercial Zone",
        "directions": {
            "north": {"raw_queue": 10, "class_counts": {2: 3, 5: 4, 7: 3}},  # buses + trucks
            "south": {"raw_queue": 6,  "class_counts": {2: 2, 5: 2, 7: 2}},
            "east":  {"raw_queue": 8,  "class_counts": {2: 4, 5: 3}},
            "west":  {"raw_queue": 14, "class_counts": {2: 5, 5: 5, 7: 4}},
        }
    },
]

# ─────────────────────────────────────────────────────────────────────────────
# ANALYSIS ENGINE
# ─────────────────────────────────────────────────────────────────────────────

def analyse_scenario(scenario):
    """Runs the full agent analysis pipeline on a test scenario."""
    print("\n" + "=" * 75)
    print(f"  {scenario['name']}")
    print("=" * 75)

    green_times = {}
    diagnostics = {}

    for direction, data in scenario["directions"].items():
        raw_queue    = float(data["raw_queue"])
        class_counts = data["class_counts"]

        # PCE-weighted queue
        if class_counts:
            weighted_q = compute_weighted_queue(class_counts)
            discharge  = compute_adaptive_discharge(class_counts)
        else:
            weighted_q = raw_queue
            discharge  = DISCHARGE_RATE

        # Green time formula
        raw_green  = (weighted_q / discharge) + BUFFER_TIME
        green_time = int(max(MIN_GREEN, min(MAX_GREEN, round(raw_green))))
        green_times[direction] = green_time

        # Build diagnostics for payload
        diagnostics[direction] = {
            "queue_float":  raw_queue,
            "queue":        f"{raw_queue:.1f}",
            "pce":          round(weighted_q, 1),
            "discharge":    discharge,
            "class_counts": class_counts,
            "counts":       [],
        }

    # Collision-free schedule
    schedule = schedule_signals(green_times)
    total    = list(schedule.values())[0]["total_cycle"]

    # ── Print Table ─────────────────────────────────────────────────────────
    print(f"\n  {'DIR':<7} {'PH':<4} {'RAW Q':<7} {'PCE Q':<7} {'RATE':<6} "
          f"{'GREEN':>6} {'YELLOW':>7} {'RED':>6}  DENSITY")
    print(f"  {'-'*7} {'-'*4} {'-'*7} {'-'*7} {'-'*6} "
          f"{'-'*6} {'-'*7} {'-'*6}  {'-'*8}")

    for direction, info in schedule.items():
        diag = diagnostics[direction]
        print(
            f"  {direction.upper():<7} #{info['phase_order']:<3} "
            f"{diag['queue_float']:<7.1f} {diag['pce']:<7.1f} "
            f"{diag['discharge']:<6.1f} "
            f"{info['green']:>5}s  {info['yellow']:>5}s  {info['red']:>5}s  "
            f"{classify_density(diag['queue_float'])}"
        )

    print(f"\n  Total signal cycle: {total}s")

    # ── Vehicle class breakdown ──────────────────────────────────────────────
    print("\n  Vehicle mix per direction:")
    class_names = {2: "Cars", 3: "Bikes", 5: "Buses", 7: "Trucks"}
    for direction, data in scenario["directions"].items():
        cc   = data["class_counts"]
        mix  = ", ".join(f"{class_names.get(k,'?')}: {v}" for k, v in cc.items()) or "None"
        print(f"    {direction.upper():<6}: {mix}")

    # ── Live state snapshot (what PhaseEngine would output at t=0) ──────────
    print("\n  Live state at cycle start (t=0):")
    first = sorted(schedule, key=lambda d: schedule[d]["phase_order"])[0]
    for direction, info in schedule.items():
        if direction == first:
            state     = "🟢 GREEN"
            remaining = info["green"]
        else:
            # Time until this direction's green starts
            acc = 0
            for d in sorted(schedule, key=lambda d: schedule[d]["phase_order"]):
                if d == direction:
                    break
                acc += schedule[d]["green"] + schedule[d]["yellow"]
            remaining = acc
            state = "🔴 RED"
        print(f"    {direction.upper():<6}: {state}  {remaining}s remaining")

    # ── Full structured JSON ─────────────────────────────────────────────────
    full_payload = build_payload(schedule, diagnostics)
    print(f"\n  Full JSON payload (sent to backend):")
    print("  " + json.dumps(full_payload, indent=2).replace("\n", "\n  "))


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("\n" + "█" * 75)
    print("  CityPulse — Agent Analysis Test")
    print(f"  Intersection : {INTERSECTION_ID} — {INTERSECTION_NAME}")
    print(f"  Location     : {INTERSECTION_LOCATION}")
    print(f"  Timestamp    : {datetime.now(timezone.utc).isoformat()}")
    print(f"  Pune registry: {len(PUNE_INTERSECTIONS)} intersections loaded")
    print("█" * 75)

    for scenario in SCENARIOS:
        analyse_scenario(scenario)

    print("\n" + "=" * 75)
    print("  ✅ Test complete. All 4 scenarios analysed successfully.")
    print("  These are the timings your backend and mobile app will receive.")
    print("=" * 75 + "\n")
