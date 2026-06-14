#!/usr/bin/env python3
"""Generate human-readable incident summaries from CSV dataset records."""

from __future__ import annotations

import ast
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import numpy as np
from tqdm import tqdm

from json_stream import JsonArrayWriter, iter_records

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CSV_INPUT = PROJECT_ROOT / "knowledge_base" / "json_output" / "csv_data.json"
CSV_OUTPUT = PROJECT_ROOT / "knowledge_base" / "csv_incident_summaries.json"
CSV_JSONL = PROJECT_ROOT / "knowledge_base" / "csv_incident_summaries.jsonl"
CHECKPOINT_PATH = PROJECT_ROOT / "knowledge_base" / "csv_incident_checkpoint.json"
STATS_PATH = PROJECT_ROOT / "knowledge_base" / "csv_incident_stats.json"

CHECKPOINT_INTERVAL = 50_000
ZSCORE_THRESHOLD = 2.5
TREND_SLOPE_THRESHOLD = 0.05
REPEATED_ANOMALY_MIN = 3


@dataclass
class FileBuffer:
    dataset: str
    file_name: str
    row_indices: list[int] = field(default_factory=list)
    signals: list[float] = field(default_factory=list)


def load_checkpoint() -> dict[str, Any]:
    if CHECKPOINT_PATH.exists():
        return json.loads(CHECKPOINT_PATH.read_text(encoding="utf-8"))
    return {"records_processed": 0, "incidents_generated": 0}


def save_checkpoint(
    records_processed: int,
    incidents_generated: int,
    line_number: int = 0,
    skipped: int = 0,
) -> None:
    CHECKPOINT_PATH.parent.mkdir(parents=True, exist_ok=True)
    data = {
        "records_processed": records_processed,
        "incidents_generated": incidents_generated,
    }
    if line_number > 0:
        data["line_number"] = line_number
    if skipped > 0:
        data["skipped"] = skipped
    CHECKPOINT_PATH.write_text(
        json.dumps(data, indent=2),
        encoding="utf-8",
    )


def parse_record_payload(record: dict[str, Any]) -> dict[str, Any]:
    payload = record.get("record")
    if isinstance(payload, dict):
        return payload
    if isinstance(payload, str):
        try:
            parsed = json.loads(payload)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            pass
        try:
            parsed = ast.literal_eval(payload)
            if isinstance(parsed, dict):
                return parsed
        except (SyntaxError, ValueError):
            pass
    return {}


def extract_signal_value(payload: dict[str, Any]) -> float | None:
    numeric_values: list[float] = []
    for value in payload.values():
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            numeric_values.append(float(value))

    if not numeric_values:
        return None

    return max(numeric_values, key=abs)


def infer_component(file_name: str, dataset: str) -> str:
    name = f"{dataset} {file_name}".lower()
    if "bearing" in name or "acc_" in name:
        return "wheel_bearing"
    if "vibration" in name or "vib" in name:
        return "vibration_sensor"
    if "temp" in name:
        return "temperature_sensor"
    return "general_component"


def severity_from_metrics(
    zscore: float, slope: float, anomaly_count: int, threshold_hits: int
) -> str:
    score = 0
    if zscore >= 4:
        score += 2
    elif zscore >= ZSCORE_THRESHOLD:
        score += 1
    if abs(slope) >= TREND_SLOPE_THRESHOLD * 2:
        score += 2
    elif abs(slope) >= TREND_SLOPE_THRESHOLD:
        score += 1
    if anomaly_count >= REPEATED_ANOMALY_MIN * 2:
        score += 2
    elif anomaly_count >= REPEATED_ANOMALY_MIN:
        score += 1
    if threshold_hits >= 5:
        score += 1

    if score >= 4:
        return "High"
    if score >= 2:
        return "Medium"
    return "Low"


def analyze_file_buffer(buffer: FileBuffer) -> dict[str, Any] | None:
    if len(buffer.signals) < 5:
        return None

    signals = np.asarray(buffer.signals, dtype=float)
    mean = float(np.mean(signals))
    std = float(np.std(signals))
    if std == 0:
        return None

    zscores = np.abs((signals - mean) / std)
    anomaly_mask = zscores >= ZSCORE_THRESHOLD
    anomaly_count = int(np.sum(anomaly_mask))
    if anomaly_count == 0 and len(signals) < 20:
        return None

    x = np.arange(len(signals), dtype=float)
    slope = float(np.polyfit(x, signals, 1)[0]) if len(signals) >= 2 else 0.0
    threshold = mean + (2 * std)
    threshold_hits = int(np.sum(signals > threshold))

    symptoms: list[str] = []
    if anomaly_count >= REPEATED_ANOMALY_MIN:
        symptoms.append("repeated statistical anomalies detected")
    if slope >= TREND_SLOPE_THRESHOLD:
        symptoms.append("increasing signal trend observed")
    elif slope <= -TREND_SLOPE_THRESHOLD:
        symptoms.append("decreasing signal trend observed")
    if threshold_hits > 0:
        symptoms.append("threshold exceedances detected")
    if float(np.max(zscores)) >= ZSCORE_THRESHOLD:
        symptoms.append("abnormal peak values observed")

    if not symptoms:
        return None

    max_z = float(np.max(zscores))
    severity = severity_from_metrics(max_z, slope, anomaly_count, threshold_hits)
    component = infer_component(buffer.file_name, buffer.dataset)

    finding = (
        f"Statistical analysis of {buffer.file_name} ({buffer.dataset}) "
        f"shows {', '.join(symptoms)}. "
        f"Mean={mean:.4f}, Std={std:.4f}, Max z-score={max_z:.2f}, "
        f"trend slope={slope:.6f}, threshold hits={threshold_hits}."
    )
    recommended_action = (
        "Inspect the affected component, verify sensor calibration, "
        "compare against baseline readings, and schedule maintenance if "
        "abnormal trends persist."
    )
    if severity == "High":
        recommended_action = (
            "Immediate inspection required. Isolate the component, perform "
            "diagnostic vibration/temperature checks, and plan corrective maintenance."
        )
    elif severity == "Medium":
        recommended_action = (
            "Schedule targeted inspection within the next maintenance window "
            "and increase monitoring frequency."
        )

    incident_id = (
        f"csvinc::{buffer.dataset}::{buffer.file_name}::"
        f"{re.sub(r'[^a-zA-Z0-9_]+', '_', symptoms[0])[:40]}"
    )
    document = (
        f"CSV incident for component '{component}' in dataset '{buffer.dataset}', "
        f"file '{buffer.file_name}'. Severity: {severity}. "
        f"Symptoms: {', '.join(symptoms)}. Finding: {finding} "
        f"Recommended action: {recommended_action}"
    )

    return {
        "incident_id": incident_id,
        "dataset": buffer.dataset,
        "component": component,
        "symptoms": symptoms,
        "severity": severity,
        "finding": finding,
        "recommended_action": recommended_action,
        "document": document,
    }


def append_incident(incident: dict[str, Any]) -> None:
    CSV_JSONL.parent.mkdir(parents=True, exist_ok=True)
    with open(CSV_JSONL, "a", encoding="utf-8") as handle:
        handle.write(json.dumps(incident, ensure_ascii=False) + "\n")


def finalize_json_output() -> int:
    if not CSV_JSONL.exists():
        CSV_OUTPUT.write_text("[]\n", encoding="utf-8")
        return 0

    writer = JsonArrayWriter(CSV_OUTPUT)
    with open(CSV_JSONL, encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            writer.write(json.loads(line))
    writer.close()
    return writer.count


def flush_buffer(buffer: FileBuffer | None) -> int:
    if buffer is None:
        return 0

    try:
        incident = analyze_file_buffer(buffer)
    except Exception:
        return 0

    if incident is None:
        return 0

    append_incident(incident)
    return 1


def main() -> None:
    if not CSV_INPUT.exists():
        sys.exit(f"ERROR: CSV input not found at {CSV_INPUT}")

    checkpoint = load_checkpoint()
    skip_count = int(checkpoint.get("records_processed", 0))
    incidents_generated = int(checkpoint.get("incidents_generated", 0))
    target_line_number = int(checkpoint.get("line_number", 0))
    skipped = int(checkpoint.get("skipped", 0))

    records_processed = skip_count
    csv_records_processed = 0
    current_key: tuple[str, str] | None = None
    current_buffer: FileBuffer | None = None

    state = {
        "skipped": skipped,
        "processed": skip_count,
        "line_number": target_line_number,
        "incidents": incidents_generated,
    }

    iterator = iter_records(
        CSV_INPUT,
        skip_count=skip_count,
        target_line_number=target_line_number,
        state=state,
    )
    progress = tqdm(iterator, desc="CSV incident generation", unit="rec")

    for record in progress:
        records_processed += 1
        csv_records_processed += 1
        dataset = str(record.get("dataset", "unknown"))
        file_name = str(record.get("file_name", "unknown"))
        file_key = (dataset, file_name)

        if current_key is None:
            current_key = file_key
            current_buffer = FileBuffer(dataset=dataset, file_name=file_name)

        if file_key != current_key and current_buffer is not None:
            incidents_generated += flush_buffer(current_buffer)
            state["incidents"] = incidents_generated
            current_key = file_key
            current_buffer = FileBuffer(dataset=dataset, file_name=file_name)

        if current_buffer is None:
            current_buffer = FileBuffer(dataset=dataset, file_name=file_name)

        try:
            payload = parse_record_payload(record)
            signal = extract_signal_value(payload)
            if signal is not None:
                current_buffer.row_indices.append(int(record.get("row_index", 0)))
                current_buffer.signals.append(signal)
        except Exception:
            pass

        if csv_records_processed % CHECKPOINT_INTERVAL == 0:
            save_checkpoint(
                records_processed,
                incidents_generated,
                line_number=state["line_number"],
                skipped=state["skipped"],
            )
            progress.set_postfix(incidents=incidents_generated)

    if current_buffer is not None:
        incidents_generated += flush_buffer(current_buffer)
        state["incidents"] = incidents_generated

    finalize_json_output()
    save_checkpoint(
        records_processed,
        incidents_generated,
        line_number=state["line_number"],
        skipped=state["skipped"],
    )

    stats = {
        "csv_records_processed": records_processed,
        "new_csv_records_processed": csv_records_processed,
        "incidents_generated": incidents_generated,
        "skipped_records": state["skipped"],
        "output_file": str(CSV_OUTPUT),
    }
    STATS_PATH.write_text(json.dumps(stats, indent=2), encoding="utf-8")

    print(f"CSV records processed: {records_processed}")
    print(f"Incidents generated: {incidents_generated}")
    print(f"Skipped malformed records: {state['skipped']}")
    print(f"Output: {CSV_OUTPUT.resolve()}")


if __name__ == "__main__":
    main()
