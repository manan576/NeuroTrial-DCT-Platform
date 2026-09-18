"""
Utility: Seed DynamoDB with Clean Multi-Patient & Multi-Session Clinical Dataset
Populates DynamoDB with clean clinical trial episodes across Session 1, 2, 3
for all patients while preserving live captures from today.
"""

import argparse
import json
import os
import re
import sys
from decimal import Decimal
import boto3

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass


def get_clean_clinical_items():
    """
    Extracts all validated multi-session episodes for patient_001, patient_002, and patient_003.
    """
    items = []

    # -------------------------------------------------------------
    # PATIENT 001: Manan B. (Baseline 46.0 ms)
    # -------------------------------------------------------------
    # Session 1: Baseline & Morning Workday (46.0 ms)
    p1_s1_episodes = [
        {
            "event_id": "evt_p1_s1_01",
            "timestamp": "2026-09-08 10:14:22",
            "duration_sec": 10.0,
            "baseline_rmssd": 46.0,
            "incident_rmssd": 18.2,
            "stress_drop_pct": 60.43,
            "bpm": 91.4,
            "oscillation_freq_hz": 3.4,
            "s3_video_key": "clips/patient_001/nod_20260902_214353.mp4",
            "verification_status": "VERIFIED_TRUE_POSITIVE",
            "doctor_notes": "Confirmed horizontal jerk nystagmus correlated with acute sympathetic surge."
        },
        {
            "event_id": "evt_p1_s1_02",
            "timestamp": "2026-09-08 10:28:45",
            "duration_sec": 10.0,
            "baseline_rmssd": 46.0,
            "incident_rmssd": 16.8,
            "stress_drop_pct": 63.48,
            "bpm": 94.0,
            "oscillation_freq_hz": 3.6,
            "s3_video_key": "clips/patient_001/nod_20260902_214442.mp4",
            "verification_status": "VERIFIED_TRUE_POSITIVE",
            "doctor_notes": "High-amplitude oscillation flare coincided with 63% vagal RMSSD collapse."
        },
        {
            "event_id": "evt_p1_s1_03",
            "timestamp": "2026-09-08 10:45:10",
            "duration_sec": 10.0,
            "baseline_rmssd": 46.0,
            "incident_rmssd": 41.2,
            "stress_drop_pct": 10.43,
            "bpm": 78.5,
            "oscillation_freq_hz": 1.2,
            "s3_video_key": "clips/patient_001/nod_20260807_121518.mp4",
            "verification_status": "DISMISSED_FALSE_POSITIVE",
            "doctor_notes": "Voluntary head movement / stretching during reading, RMSSD maintained near baseline."
        },
        {
            "event_id": "evt_p1_s1_04",
            "timestamp": "2026-09-08 11:02:30",
            "duration_sec": 10.0,
            "baseline_rmssd": 46.0,
            "incident_rmssd": 19.4,
            "stress_drop_pct": 57.83,
            "bpm": 89.2,
            "oscillation_freq_hz": 3.2,
            "s3_video_key": "clips/patient_001/nod_20260902_214353.mp4",
            "verification_status": "PENDING_REVIEW",
            "doctor_notes": ""
        },
        {
            "event_id": "evt_p1_s1_05",
            "timestamp": "2026-09-08 11:21:18",
            "duration_sec": 10.0,
            "baseline_rmssd": 46.0,
            "incident_rmssd": 15.6,
            "stress_drop_pct": 66.09,
            "bpm": 96.5,
            "oscillation_freq_hz": 3.8,
            "s3_video_key": "clips/patient_001/nod_20260902_214442.mp4",
            "verification_status": "VERIFIED_TRUE_POSITIVE",
            "doctor_notes": ""
        },
        {
            "event_id": "evt_p1_s1_06",
            "timestamp": "2026-09-08 11:38:04",
            "duration_sec": 10.0,
            "baseline_rmssd": 46.0,
            "incident_rmssd": 20.1,
            "stress_drop_pct": 56.30,
            "bpm": 87.0,
            "oscillation_freq_hz": 3.1,
            "s3_video_key": "clips/patient_001/nod_20260807_121518.mp4",
            "verification_status": "PENDING_REVIEW",
            "doctor_notes": ""
        }
    ]
    for ep in p1_s1_episodes:
        ep["patient_id"] = "patient_001"
        ep["session_id"] = "sess_001_01"
        ep["session_name"] = "Session 1: Stroop Test"
        ep["session_baseline_rmssd"] = 46.0
        ep["tremor_freq_hz"] = ep["oscillation_freq_hz"]
        ep["event_type"] = "OSC"
        items.append(ep)

    # Session 2: Cognitive Fatigue & Stroop (41.8 ms)
    p1_s2_episodes = [
        {
            "event_id": "evt_p1_s2_01",
            "timestamp": "2026-09-09 14:42:15",
            "duration_sec": 10.0,
            "baseline_rmssd": 41.8,
            "incident_rmssd": 16.2,
            "stress_drop_pct": 61.24,
            "bpm": 93.1,
            "oscillation_freq_hz": 3.5,
            "s3_video_key": "clips/patient_001/nod_20260902_214353.mp4",
            "verification_status": "VERIFIED_TRUE_POSITIVE",
            "doctor_notes": "Confirmed true oscillation during cognitive Stroop trial."
        },
        {
            "event_id": "evt_p1_s2_02",
            "timestamp": "2026-09-09 15:05:40",
            "duration_sec": 10.0,
            "baseline_rmssd": 41.8,
            "incident_rmssd": 14.8,
            "stress_drop_pct": 64.59,
            "bpm": 97.4,
            "oscillation_freq_hz": 3.7,
            "s3_video_key": "clips/patient_001/nod_20260902_214442.mp4",
            "verification_status": "VERIFIED_TRUE_POSITIVE",
            "doctor_notes": "Pronounced horizontal tremor with vagal suppression."
        },
        {
            "event_id": "evt_p1_s2_03",
            "timestamp": "2026-09-09 15:22:11",
            "duration_sec": 10.0,
            "baseline_rmssd": 41.8,
            "incident_rmssd": 18.0,
            "stress_drop_pct": 56.94,
            "bpm": 88.6,
            "oscillation_freq_hz": 3.3,
            "s3_video_key": "clips/patient_001/nod_20260807_121518.mp4",
            "verification_status": "VERIFIED_TRUE_POSITIVE",
            "doctor_notes": "Verified pathological oscillation during color-word challenge."
        },
        {
            "event_id": "evt_p1_s2_04",
            "timestamp": "2026-09-09 15:40:02",
            "duration_sec": 10.0,
            "baseline_rmssd": 41.8,
            "incident_rmssd": 15.5,
            "stress_drop_pct": 62.90,
            "bpm": 95.0,
            "oscillation_freq_hz": 3.6,
            "s3_video_key": "clips/patient_001/nod_20260902_214353.mp4",
            "verification_status": "VERIFIED_TRUE_POSITIVE",
            "doctor_notes": "High-amplitude tremor flare verified."
        }
    ]
    for ep in p1_s2_episodes:
        ep["patient_id"] = "patient_001"
        ep["session_id"] = "sess_001_02"
        ep["session_name"] = "Session 2 — Cognitive Fatigue & Stroop"
        ep["session_baseline_rmssd"] = 41.8
        ep["tremor_freq_hz"] = ep["oscillation_freq_hz"]
        ep["event_type"] = "OSC"
        items.append(ep)

    # Session 3: Visual Strain & Display Contrast (43.6 ms)
    p1_s3_episodes = [
        {
            "event_id": "evt_p1_s3_01",
            "timestamp": "2026-09-10 16:15:30",
            "duration_sec": 10.0,
            "baseline_rmssd": 43.6,
            "incident_rmssd": 17.5,
            "stress_drop_pct": 59.86,
            "bpm": 92.0,
            "oscillation_freq_hz": 3.4,
            "s3_video_key": "clips/patient_001/nod_20260902_214353.mp4",
            "verification_status": "VERIFIED_TRUE_POSITIVE",
            "doctor_notes": "Verified nystagmus oscillation under low-contrast fatigue."
        },
        {
            "event_id": "evt_p1_s3_02",
            "timestamp": "2026-09-10 16:35:12",
            "duration_sec": 10.0,
            "baseline_rmssd": 43.6,
            "incident_rmssd": 15.2,
            "stress_drop_pct": 65.14,
            "bpm": 95.8,
            "oscillation_freq_hz": 3.8,
            "s3_video_key": "clips/patient_001/nod_20260902_214442.mp4",
            "verification_status": "VERIFIED_TRUE_POSITIVE",
            "doctor_notes": "Severe vagal withdrawal and tremor flare verified."
        }
    ]
    for ep in p1_s3_episodes:
        ep["patient_id"] = "patient_001"
        ep["session_id"] = "sess_001_03"
        ep["session_name"] = "Session 3 — Visual Strain & Display Contrast"
        ep["session_baseline_rmssd"] = 43.6
        ep["tremor_freq_hz"] = ep["oscillation_freq_hz"]
        ep["event_type"] = "OSC"
        items.append(ep)

    # -------------------------------------------------------------
    # PATIENT 002: Sarah K. (Baseline 52.4 ms)
    # -------------------------------------------------------------
    p2_episodes = [
        {
            "event_id": "evt_p2_s1_01",
            "timestamp": "2026-09-07 09:48:10",
            "duration_sec": 10.0,
            "baseline_rmssd": 52.4,
            "incident_rmssd": 21.4,
            "stress_drop_pct": 59.16,
            "bpm": 88.5,
            "oscillation_freq_hz": 3.2,
            "s3_video_key": "clips/patient_002/nod_20260902_214442.mp4",
            "verification_status": "VERIFIED_TRUE_POSITIVE",
            "doctor_notes": "Sustained rotary oscillation burst verified."
        },
        {
            "event_id": "evt_p2_s1_02",
            "timestamp": "2026-09-07 10:12:44",
            "duration_sec": 10.0,
            "baseline_rmssd": 52.4,
            "incident_rmssd": 19.8,
            "stress_drop_pct": 62.21,
            "bpm": 92.0,
            "oscillation_freq_hz": 3.5,
            "s3_video_key": "clips/patient_002/nod_20260902_214353.mp4",
            "verification_status": "VERIFIED_TRUE_POSITIVE",
            "doctor_notes": ""
        },
        {
            "event_id": "evt_p2_s1_03",
            "timestamp": "2026-09-07 10:30:19",
            "duration_sec": 10.0,
            "baseline_rmssd": 52.4,
            "incident_rmssd": 49.5,
            "stress_drop_pct": 5.53,
            "bpm": 74.0,
            "oscillation_freq_hz": 1.1,
            "s3_video_key": "clips/patient_002/nod_20260807_121518.mp4",
            "verification_status": "DISMISSED_FALSE_POSITIVE",
            "doctor_notes": "Saccadic repositioning artifact."
        },
        {
            "event_id": "evt_p2_s1_04",
            "timestamp": "2026-09-07 10:55:02",
            "duration_sec": 10.0,
            "baseline_rmssd": 52.4,
            "incident_rmssd": 22.0,
            "stress_drop_pct": 58.02,
            "bpm": 87.4,
            "oscillation_freq_hz": 3.0,
            "s3_video_key": "clips/patient_002/nod_20260902_214442.mp4",
            "verification_status": "PENDING_REVIEW",
            "doctor_notes": ""
        },
        {
            "event_id": "evt_p2_s2_01",
            "timestamp": "2026-09-08 15:10:15",
            "duration_sec": 10.0,
            "baseline_rmssd": 49.8,
            "incident_rmssd": 17.9,
            "stress_drop_pct": 64.06,
            "bpm": 96.2,
            "oscillation_freq_hz": 3.6,
            "s3_video_key": "clips/patient_002/nod_20260902_214353.mp4",
            "verification_status": "VERIFIED_TRUE_POSITIVE",
            "doctor_notes": ""
        },
        {
            "event_id": "evt_p2_s3_01",
            "timestamp": "2026-09-09 17:22:18",
            "duration_sec": 10.0,
            "baseline_rmssd": 51.0,
            "incident_rmssd": 18.6,
            "stress_drop_pct": 63.53,
            "bpm": 94.2,
            "oscillation_freq_hz": 3.4,
            "s3_video_key": "clips/patient_002/nod_20260902_214353.mp4",
            "verification_status": "VERIFIED_TRUE_POSITIVE",
            "doctor_notes": "Gaze fixation-induced rotary nystagmus confirmed."
        }
    ]
    for idx, ep in enumerate(p2_episodes):
        ep["patient_id"] = "patient_002"
        ep["session_id"] = "sess_002_01" if idx < 4 else ("sess_002_02" if idx == 4 else "sess_002_03")
        ep["session_name"] = "Session 1 — Morning Diagnostic Trial" if idx < 4 else "Session 2"
        ep["session_baseline_rmssd"] = ep["baseline_rmssd"]
        ep["tremor_freq_hz"] = ep["oscillation_freq_hz"]
        ep["event_type"] = "OSC"
        items.append(ep)

    # -------------------------------------------------------------
    # PATIENT 003: David Chen (Baseline 38.6 ms)
    # -------------------------------------------------------------
    p3_episodes = [
        {
            "event_id": "evt_p3_s1_01",
            "timestamp": "2026-09-06 11:15:22",
            "duration_sec": 10.0,
            "baseline_rmssd": 38.6,
            "incident_rmssd": 15.4,
            "stress_drop_pct": 60.10,
            "bpm": 94.8,
            "oscillation_freq_hz": 4.1,
            "s3_video_key": "clips/patient_003/nod_20260902_214353.mp4",
            "verification_status": "VERIFIED_TRUE_POSITIVE",
            "doctor_notes": "Vertical downbeat oscillation flare confirmed."
        },
        {
            "event_id": "evt_p3_s1_02",
            "timestamp": "2026-09-06 11:38:40",
            "duration_sec": 10.0,
            "baseline_rmssd": 38.6,
            "incident_rmssd": 14.1,
            "stress_drop_pct": 63.47,
            "bpm": 98.2,
            "oscillation_freq_hz": 4.3,
            "s3_video_key": "clips/patient_003/nod_20260902_214442.mp4",
            "verification_status": "VERIFIED_TRUE_POSITIVE",
            "doctor_notes": ""
        },
        {
            "event_id": "evt_p3_s1_03",
            "timestamp": "2026-09-06 12:02:11",
            "duration_sec": 10.0,
            "baseline_rmssd": 38.6,
            "incident_rmssd": 36.8,
            "stress_drop_pct": 4.66,
            "bpm": 76.5,
            "oscillation_freq_hz": 1.2,
            "s3_video_key": "clips/patient_003/nod_20260807_121518.mp4",
            "verification_status": "DISMISSED_FALSE_POSITIVE",
            "doctor_notes": "Drinking water head tilt artifact."
        },
        {
            "event_id": "evt_p3_s1_04",
            "timestamp": "2026-09-06 12:25:30",
            "duration_sec": 10.0,
            "baseline_rmssd": 38.6,
            "incident_rmssd": 16.0,
            "stress_drop_pct": 58.55,
            "bpm": 91.0,
            "oscillation_freq_hz": 3.9,
            "s3_video_key": "clips/patient_003/nod_20260902_214353.mp4",
            "verification_status": "PENDING_REVIEW",
            "doctor_notes": ""
        }
    ]
    for ep in p3_episodes:
        ep["patient_id"] = "patient_003"
        ep["session_id"] = "sess_003_01"
        ep["session_name"] = "Session 1 — Baseline Diagnostic & Stroop"
        ep["session_baseline_rmssd"] = 38.6
        ep["tremor_freq_hz"] = ep["oscillation_freq_hz"]
        ep["event_type"] = "OSC"
        items.append(ep)

    # Convert floats to Decimal for DynamoDB
    decimal_items = []
    for it in items:
        dec_item = {}
        for k, v in it.items():
            if isinstance(v, float):
                dec_item[k] = Decimal(str(v))
            else:
                dec_item[k] = v
        decimal_items.append(dec_item)

    return decimal_items


def seed_clean_dynamodb(table_name="NeuroStressTelemetry", region="ap-south-1"):
    """
    Cleans out old bulk items and seeds validated clinical records while keeping live recordings.
    """
    ak = os.environ.get("AWS_ACCESS_KEY_ID")
    sk = os.environ.get("AWS_SECRET_ACCESS_KEY")
    if ak and sk:
        session = boto3.Session(aws_access_key_id=ak, aws_secret_access_key=sk, region_name=region)
        dynamodb = session.resource("dynamodb")
    else:
        dynamodb = boto3.resource("dynamodb", region_name=region)
    table = dynamodb.Table(table_name)

    print(f"Connecting to DynamoDB table: {table_name} ({region})...")

    # 1. Preserve any live captures from today (evt_live_*)
    print("Scanning for live user captures to preserve...")
    res = table.scan()
    live_items = []
    all_keys_to_delete = []

    for it in res.get("Items", []):
        eid = str(it.get("event_id", ""))
        if eid.startswith("evt_live_"):
            live_items.append(it)
        else:
            all_keys_to_delete.append({"patient_id": it["patient_id"], "timestamp": it["timestamp"]})

    while "LastEvaluatedKey" in res:
        res = table.scan(ExclusiveStartKey=res["LastEvaluatedKey"])
        for it in res.get("Items", []):
            eid = str(it.get("event_id", ""))
            if eid.startswith("evt_live_"):
                live_items.append(it)
            else:
                all_keys_to_delete.append({"patient_id": it["patient_id"], "timestamp": it["timestamp"]})

    print(f"Found {len(live_items)} live user recordings to preserve.")
    print(f"Purging {len(all_keys_to_delete)} old/background raw seed items from DynamoDB...")

    if all_keys_to_delete:
        with table.batch_writer() as batch:
            for k in all_keys_to_delete:
                batch.delete_item(Key=k)
        print("Purge completed.")

    # 2. Insert clean clinical trial multi-session records
    clean_items = get_clean_clinical_items()
    print(f"Uploading {len(clean_items)} validated clinical trial episodes...")

    with table.batch_writer() as batch:
        for it in clean_items:
            batch.put_item(Item=it)

    print(f"Successfully seeded clean clinical dataset into {table_name}!")
    print(f"Total active items in DynamoDB: {len(clean_items) + len(live_items)}")


def main():
    parser = argparse.ArgumentParser(description="Seed DynamoDB with Clean Clinical Dataset")
    parser.add_argument("--table", default="NeuroStressTelemetry", help="DynamoDB Table Name")
    parser.add_argument("--region", default="ap-south-1", help="AWS Region")
    args = parser.parse_args()

    seed_clean_dynamodb(table_name=args.table, region=args.region)


if __name__ == "__main__":
    main()
