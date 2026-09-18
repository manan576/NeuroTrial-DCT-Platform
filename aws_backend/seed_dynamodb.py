"""
Utility: Seed DynamoDB with Longitudinal Telemetry Dataset
Usage:
  python aws_backend/seed_dynamodb.py --table NeuroStressTelemetry --region ap-south-1 --patient-id patient_001
"""

import argparse
import csv
import os
import sys
from decimal import Decimal
import boto3

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

VALIDATION_VIDEOS = [
    "nod_20260807_121518.mp4",
    "nod_20260902_214353.mp4",
    "nod_20260902_214442.mp4"
]


def load_and_transform_csv(csv_path, patient_id="patient_001"):
    """
    Parses oscillation_log.csv and transforms into DynamoDB telemetry records.
    Maintains August 2026 dates for historical trial records so real-time September
    captures naturally sort to the top.
    """
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"CSV file not found at: {csv_path}")

    items = []
    with open(csv_path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for idx, row in enumerate(reader):
            ts = row["Timestamp"]
            event_type = row.get("Event_Type", "OSC")
            validation_raw = row.get("Validation_Status", "TP")
            bpm = float(row.get("BPM", 75.0))
            rmssd_15s = float(row.get("RMSSD_15s", 40.0))
            rmssd_60s = float(row.get("RMSSD_60s", 42.0))

            if validation_raw == "TP":
                status = "VERIFIED_TRUE_POSITIVE"
            elif validation_raw == "FP":
                status = "DISMISSED_FALSE_POSITIVE"
            else:
                status = "BASELINE_CONTROL"

            # Derive synthetic baseline and incident metrics
            if event_type == "OSC":
                baseline_rmssd = round(rmssd_60s * 1.8 if rmssd_60s < 30 else 45.0, 2)
                incident_rmssd = round(rmssd_15s, 2)
                freq_hz = round(2.8 + (idx % 7) * 0.2, 2)
                duration_sec = round(1.8 + (idx % 5) * 0.4, 1)
                actual_video = VALIDATION_VIDEOS[idx % len(VALIDATION_VIDEOS)]
                s3_key = f"clips/{patient_id}/{actual_video}"
            else:
                baseline_rmssd = round(rmssd_60s, 2)
                incident_rmssd = round(rmssd_60s, 2)
                freq_hz = 0.0
                duration_sec = 0.0
                s3_key = ""

            stress_drop_pct = round(((baseline_rmssd - incident_rmssd) / baseline_rmssd) * 100.0, 2) if baseline_rmssd > 0 else 0.0

            item = {
                "patient_id": patient_id,
                "timestamp": ts,
                "event_id": f"evt_seed_{idx:04d}",
                "event_type": event_type,
                "oscillation_freq_hz": Decimal(str(freq_hz)),
                "tremor_freq_hz": Decimal(str(freq_hz)),
                "duration_sec": Decimal(str(duration_sec)),
                "baseline_rmssd": Decimal(str(baseline_rmssd)),
                "session_baseline_rmssd": Decimal(str(baseline_rmssd)),
                "incident_rmssd": Decimal(str(incident_rmssd)),
                "stress_drop_pct": Decimal(str(stress_drop_pct)),
                "bpm": Decimal(str(bpm)),
                "sdnn_60s": Decimal(str(row.get("SDNN_60s", 45.0))),
                "s3_video_key": s3_key,
                "verification_status": status,
                "dataset_source": "pilot_cohort_benchmark"
            }
            items.append(item)

    # Ensure unique (patient_id, timestamp) keys for DynamoDB
    seen_keys = set()
    unique_items = []
    for item in items:
        p_id = item["patient_id"]
        t_stamp = item["timestamp"]
        if (p_id, t_stamp) in seen_keys:
            cnt = 1
            while (p_id, f"{t_stamp}.{cnt:03d}") in seen_keys:
                cnt += 1
            item["timestamp"] = f"{t_stamp}.{cnt:03d}"
        seen_keys.add((p_id, item["timestamp"]))
        unique_items.append(item)

    return unique_items


def clear_old_seeds(table, patient_id="patient_001"):
    """Deletes old evt_seed items so the table only has canonical August seed + real September live items."""
    print(f"Scanning for existing seed items for {patient_id}...")
    res = table.scan()
    items_to_delete = []
    for it in res.get("Items", []):
        if it.get("patient_id") == patient_id and str(it.get("event_id", "")).startswith("evt_seed_"):
            items_to_delete.append({"patient_id": it["patient_id"], "timestamp": it["timestamp"]})

    while "LastEvaluatedKey" in res:
        res = table.scan(ExclusiveStartKey=res["LastEvaluatedKey"])
        for it in res.get("Items", []):
            if it.get("patient_id") == patient_id and str(it.get("event_id", "")).startswith("evt_seed_"):
                items_to_delete.append({"patient_id": it["patient_id"], "timestamp": it["timestamp"]})

    if items_to_delete:
        print(f"Purging {len(items_to_delete)} old seed items...")
        with table.batch_writer() as batch:
            for k in items_to_delete:
                batch.delete_item(Key=k)
        print("Purge completed.")


def seed_dynamodb(items, table_name="NeuroStressTelemetry", region="ap-south-1", patient_id="patient_001"):
    """
    Bulk writes items to DynamoDB using batch_writer.
    """
    dynamodb = boto3.resource("dynamodb", region_name=region)
    table = dynamodb.Table(table_name)

    clear_old_seeds(table, patient_id)

    print(f"Connecting to DynamoDB table: {table_name} ({region})...")
    written_count = 0
    with table.batch_writer() as batch:
        for item in items:
            batch.put_item(Item=item)
            written_count += 1
            if written_count % 100 == 0:
                print(f"  Uploaded {written_count}/{len(items)} records...")

    print(f"Successfully seeded {written_count} records into {table_name}!")


def main():
    parser = argparse.ArgumentParser(description="Seed DynamoDB with Nystagmus Telemetry Data")
    parser.add_argument("--csv", default="oscillation_log.csv", help="Path to oscillation_log.csv")
    parser.add_argument("--table", default="NeuroStressTelemetry", help="DynamoDB Table Name")
    parser.add_argument("--region", default="ap-south-1", help="AWS Region")
    parser.add_argument("--patient-id", default="patient_001", help="Patient ID partition key")
    parser.add_argument("--dry-run", action="store_true", help="Print transformed items without uploading to AWS")

    args = parser.parse_args()

    csv_path = args.csv
    if not os.path.exists(csv_path):
        parent_csv = os.path.join(os.path.dirname(__file__), "..", args.csv)
        if os.path.exists(parent_csv):
            csv_path = parent_csv

    print(f"Loading dataset from: {csv_path}")
    items = load_and_transform_csv(csv_path, patient_id=args.patient_id)
    print(f"Loaded and transformed {len(items)} telemetry records.")

    if args.dry_run:
        print("\n[DRY RUN MODE] Sample record (Item 0):")
        import pprint
        pprint.pprint(items[0])
    else:
        seed_dynamodb(items, table_name=args.table, region=args.region, patient_id=args.patient_id)


if __name__ == "__main__":
    main()
