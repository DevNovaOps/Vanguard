#!/usr/bin/env python3
"""Extract signal features from MAT dataset records."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

import numpy as np
from tqdm import tqdm

from json_stream import JsonArrayWriter, iter_records

PROJECT_ROOT = Path(__file__).resolve().parent.parent
MAT_INPUT = PROJECT_ROOT / "knowledge_base" / "json_output" / "mat_data.json"
MAT_OUTPUT = PROJECT_ROOT / "knowledge_base" / "mat_feature_summaries.json"
STATS_PATH = PROJECT_ROOT / "knowledge_base" / "mat_extraction_stats.json"


def parse_values(raw_values: Any) -> np.ndarray | None:
    if raw_values is None:
        return None

    if isinstance(raw_values, list):
        try:
            array = np.asarray(raw_values, dtype=float)
        except (TypeError, ValueError):
            return None
    else:
        return None

    if array.size == 0 or not np.all(np.isfinite(array)):
        return None
    return array.flatten()


def compute_features(array: np.ndarray) -> dict[str, float]:
    array = array.astype(np.float64)
    mean = float(np.mean(array))
    std = float(np.std(array))
    variance = float(np.var(array))
    rms = float(np.sqrt(np.mean(np.square(array))))
    peak = float(np.max(np.abs(array)))
    peak_to_peak = float(np.max(array) - np.min(array))
    crest_factor = float(peak / rms) if rms > 0 else 0.0

    centered = array - mean
    if std > 0:
        normalized = centered / std
        skewness = float(np.mean(normalized**3))
        kurtosis = float(np.mean(normalized**4) - 3.0)
    else:
        skewness = 0.0
        kurtosis = 0.0

    return {
        "rms": round(rms, 6),
        "mean": round(mean, 6),
        "std": round(std, 6),
        "variance": round(variance, 6),
        "kurtosis": round(kurtosis, 6),
        "skewness": round(skewness, 6),
        "peak": round(peak, 6),
        "peak_to_peak": round(peak_to_peak, 6),
        "crest_factor": round(crest_factor, 6),
    }


def build_document(record: dict[str, Any], features: dict[str, float]) -> str:
    return (
        f"MAT signal summary for variable '{record.get('variable_name', 'unknown')}' "
        f"in file '{record.get('file_name', 'unknown')}' "
        f"(dataset: {record.get('dataset', 'unknown')}, shape: {record.get('shape', 'unknown')}). "
        f"RMS={features['rms']}, Mean={features['mean']}, Std={features['std']}, "
        f"Variance={features['variance']}, Kurtosis={features['kurtosis']}, "
        f"Skewness={features['skewness']}, Peak={features['peak']}, "
        f"Peak-to-Peak={features['peak_to_peak']}, Crest Factor={features['crest_factor']}."
    )


def process_record(record: dict[str, Any]) -> dict[str, Any] | None:
    values = parse_values(record.get("values"))
    if values is None:
        return None

    features = compute_features(values)
    base_id = str(record.get("id", ""))
    if not base_id:
        dataset = record.get("dataset", "unknown")
        file_name = record.get("file_name", "unknown")
        variable_name = record.get("variable_name", "unknown")
        base_id = f"matfeat::{dataset}::{file_name}::{variable_name}"

    summary = {
        "id": f"{base_id}::features",
        "dataset": str(record.get("dataset", "")),
        "file_name": str(record.get("file_name", "")),
        "variable_name": str(record.get("variable_name", "")),
        "shape": str(record.get("shape", "")),
        **features,
        "document": build_document(record, features),
    }
    return summary


def main() -> None:
    if not MAT_INPUT.exists():
        sys.exit(f"ERROR: MAT input not found at {MAT_INPUT}")

    writer = JsonArrayWriter(MAT_OUTPUT)
    records_processed = 0
    summaries_generated = 0
    malformed_skipped = 0

    for record in tqdm(iter_records(MAT_INPUT), desc="MAT feature extraction", unit="rec"):
        records_processed += 1
        try:
            summary = process_record(record)
        except Exception:
            malformed_skipped += 1
            continue

        if summary is None:
            malformed_skipped += 1
            continue

        writer.write(summary)
        summaries_generated += 1

    writer.close()

    stats = {
        "mat_records_processed": records_processed,
        "feature_summaries_generated": summaries_generated,
        "malformed_records_skipped": malformed_skipped,
        "output_file": str(MAT_OUTPUT),
    }
    STATS_PATH.write_text(json.dumps(stats, indent=2), encoding="utf-8")

    print(f"MAT records processed: {records_processed}")
    print(f"Feature summaries generated: {summaries_generated}")
    print(f"Malformed records skipped: {malformed_skipped}")
    print(f"Output: {MAT_OUTPUT.resolve()}")


if __name__ == "__main__":
    main()
