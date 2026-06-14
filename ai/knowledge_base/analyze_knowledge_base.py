#!/usr/bin/env python3
"""Validate knowledge_base/json_output — sample-based for large CSV files."""

from __future__ import annotations

import hashlib
import json
import re
import sys
import time
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator

try:
    import ijson
except ImportError:
    sys.exit("ERROR: pip install ijson")

KB_ROOT = Path(__file__).resolve().parent
JSON_OUTPUT = KB_ROOT / "json_output"
SUMMARY_PATH = KB_ROOT / "knowledge_base_summary.json"
STRUCTURE_PATH = KB_ROOT / "knowledge_base_structure.json"

IGNORE = {"extraction_report.json", "ingestion_checkpoint.json"}
LARGE_BYTES = 100 * 1024 * 1024
CSV_SAMPLE_SIZE = 10_000
SAMPLE_TRUNCATE = 500
CHUNK = 64 * 1024 * 1024

IMPORTANT: dict[str, list[str]] = {
    "pdf_data.json": ["id", "document", "content", "source_type", "file_name"],
    "txt_data.json": ["id", "document", "content", "source_type", "file_name"],
    "mat_data.json": ["id", "document", "variable_name", "source_type", "file_name"],
    "csv_data.json": ["id", "document", "record", "source_type", "file_name"],
}

RAG_FIELDS = [
    "document", "content", "id", "source_type", "dataset", "file_name",
    "metadata", "metadata.source_type", "metadata.dataset", "metadata.file_name",
    "metadata.source_path", "page_number", "chunk_id", "row_index",
    "variable_name", "shape", "record", "values", "source_path",
]

RAG_BY_DATASET = {
    "pdf_data.json": ["document", "content", "file_name", "dataset", "page_number", "id", "metadata"],
    "txt_data.json": ["document", "content", "file_name", "dataset", "chunk_id", "id", "metadata", "source_path"],
    "mat_data.json": ["document", "variable_name", "file_name", "dataset", "shape", "id", "metadata"],
    "csv_data.json": ["document", "record", "file_name", "dataset", "row_index", "id", "metadata"],
}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def type_name(v: Any) -> str:
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "boolean"
    if isinstance(v, int):
        return "integer"
    if isinstance(v, float):
        return "number"
    if isinstance(v, str):
        return "string"
    if isinstance(v, list):
        return "array"
    if isinstance(v, dict):
        return "object"
    return type(v).__name__


def truncate(v: Any) -> Any:
    if isinstance(v, str) and len(v) > SAMPLE_TRUNCATE:
        return v[:SAMPLE_TRUNCATE] + f"... [{len(v)} chars total]"
    if isinstance(v, list) and len(v) > 20:
        return v[:20] + [f"... [{len(v)} items total]"]
    if isinstance(v, dict):
        return {k: truncate(val) for k, val in v.items()}
    return v


def field_types_from(obj: Any, prefix: str = "") -> tuple[set[str], dict[str, set[str]]]:
    fields: set[str] = set()
    types: dict[str, set[str]] = defaultdict(set)
    if isinstance(obj, dict):
        for k, val in obj.items():
            f = f"{prefix}.{k}" if prefix else k
            fields.add(f)
            types[f].add(type_name(val))
            sf, st = field_types_from(val, f)
            fields |= sf
            for kk, vv in st.items():
                types[kk] |= vv
    elif isinstance(obj, list) and obj and isinstance(obj[0], (dict, list)):
        sf, st = field_types_from(obj[0], prefix)
        fields |= sf
        for kk, vv in st.items():
            types[kk] |= vv
    return fields, types


def count_issues(obj: Any) -> tuple[int, int]:
    miss, empty = 0, 0
    if isinstance(obj, dict):
        for val in obj.values():
            m, e = count_issues(val)
            miss += m
            empty += e
            if val is None or val == [] or val == {}:
                miss += 1
            elif isinstance(val, str) and val == "":
                empty += 1
    elif isinstance(obj, list):
        for item in obj:
            m, e = count_issues(item)
            miss += m
            empty += e
    return miss, empty


def missing_important(rec: Any, fields: list[str]) -> bool:
    if not isinstance(rec, dict):
        return True
    return any(
        f not in rec
        or rec.get(f) is None
        or (isinstance(rec.get(f), str) and rec[f] == "")
        for f in fields
    )


def dedup_key(rec: Any) -> str:
    if isinstance(rec, dict) and rec.get("id"):
        return str(rec["id"])
    return hashlib.sha256(
        json.dumps(rec, sort_keys=True, default=str).encode()
    ).hexdigest()


def sanitize(s: str) -> str:
    s = re.sub(r":\s*NaN\b", ": null", s)
    s = re.sub(r":\s*-Infinity\b", ": null", s)
    s = re.sub(r":\s*Infinity\b", ": null", s)
    return s


def is_multi_array(path: Path) -> bool:
    with open(path, "rb") as f:
        head = f.read(min(50 * 1024 * 1024, path.stat().st_size))
    return bool(re.search(rb"\]\s*,\s*\{", head))


def iter_multi_array(path: Path) -> Iterator[Any]:
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()
    dec = json.JSONDecoder()
    pos, n = 0, len(text)
    while pos < n:
        while pos < n and text[pos] in " \t\n\r,":
            pos += 1
        if pos >= n:
            break
        if text[pos] == "]":
            pos += 1
            continue
        obj, end = dec.raw_decode(text, pos)
        pos = end
        yield from obj if isinstance(obj, list) else [obj]


def iter_line_stream(path: Path) -> Iterator[Any]:
    buf = ""
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            if not buf:
                s = line.strip()
                if not s or s == "[":
                    continue
                if s == "]":
                    break
                c = s.rstrip(",")
                if c == "]":
                    break
                try:
                    yield json.loads(sanitize(c))
                    continue
                except json.JSONDecodeError:
                    if c.startswith("{") and not c.endswith("}"):
                        buf = line
                    continue
            else:
                buf += line
                c = buf.strip().rstrip(",")
                try:
                    yield json.loads(sanitize(c))
                    buf = ""
                except json.JSONDecodeError:
                    if len(buf) > 50 * 1024 * 1024:
                        buf = ""


def iter_ijson(path: Path) -> Iterator[Any]:
    with open(path, "rb") as f:
        yield from ijson.items(f, "item")


def iter_records(path: Path, mode: str) -> Iterator[Any]:
    if mode == "multi_array":
        yield from iter_multi_array(path)
    elif mode == "line":
        yield from iter_line_stream(path)
    elif mode == "ijson":
        yield from iter_ijson(path)
    elif mode == "load":
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        yield from data if isinstance(data, list) else [data]


def pick_mode(path: Path, size: int) -> str:
    if is_multi_array(path):
        return "multi_array"
    if size >= LARGE_BYTES:
        return "line"
    return "load"


def fast_record_count(path: Path, marker: bytes) -> int:
    """Count records via byte marker with chunk overlap."""
    count, tail = 0, b""
    overlap = max(len(marker) - 1, 0)
    with open(path, "rb") as f:
        while True:
            chunk = f.read(CHUNK)
            if not chunk:
                break
            data = tail + chunk
            count += data.count(marker)
            tail = data[-overlap:] if overlap else b""
    return count


def analyze_records(
    records: Iterator[Any],
    file_name: str,
    *,
    limit: int | None = None,
    count_duplicates: bool = True,
) -> dict[str, Any]:
    imp = IMPORTANT.get(file_name, [])
    fields: set[str] = set()
    ftypes: dict[str, set[str]] = defaultdict(set)
    samples: list[Any] = []
    seen: set[str] = set()
    dupes = 0
    missing = 0
    empty = 0
    bad_imp = 0
    n = 0

    for rec in records:
        n += 1
        sf, st = field_types_from(rec)
        fields |= sf
        for k, v in st.items():
            ftypes[k] |= v
        m, e = count_issues(rec)
        missing += m
        empty += e
        if missing_important(rec, imp):
            bad_imp += 1
        if len(samples) < 5:
            samples.append(truncate(rec))
        if count_duplicates:
            k = dedup_key(rec)
            if k in seen:
                dupes += 1
            else:
                seen.add(k)
        if limit and n >= limit:
            break

    dup_pct = round(100.0 * dupes / n, 4) if n and count_duplicates else 0.0
    return {
        "records_analyzed": n,
        "fields": sorted(fields),
        "field_types": {k: sorted(v) for k, v in sorted(ftypes.items())},
        "sample_records": samples,
        "missing_values": missing,
        "empty_strings": empty,
        "duplicates_found": dupes,
        "duplicate_percentage_sample": dup_pct,
        "records_missing_important_fields": bad_imp,
    }


def analyze_file(path: Path) -> dict[str, Any]:
    name = path.name
    size = path.stat().st_size
    size_mb = round(size / (1024 * 1024), 2)
    is_large_csv = name == "csv_data.json" and size > LARGE_BYTES

    print(f"\n>>> {name} ({size_mb} MB)")
    t0 = time.time()
    mode = pick_mode(path, size)

    if is_large_csv:
        print(f"    Sample-based validation ({CSV_SAMPLE_SIZE:,} records, streaming)")
        sample = analyze_records(
            iter_records(path, "line"),
            name,
            limit=CSV_SAMPLE_SIZE,
            count_duplicates=True,
        )
        total = fast_record_count(path, b'"source_type": "csv"')
        est_dupes = int(total * sample["duplicate_percentage_sample"] / 100)
        result = {
            "file_name": name,
            "file_size_mb": size_mb,
            "record_count": total,
            "fields": sample["fields"],
            "field_types": sample["field_types"],
            "sample_records": sample["sample_records"],
            "missing_values": sample["missing_values"],
            "empty_strings": sample["empty_strings"],
            "duplicates_found": est_dupes,
            "duplicate_percentage_sample": sample["duplicate_percentage_sample"],
            "records_missing_important_fields": sample["records_missing_important_fields"],
            "validation_mode": "Sample-based validation performed.",
            "records_analyzed": sample["records_analyzed"],
        }
    else:
        use_stream = size >= LARGE_BYTES or mode != "load"
        print(f"    Mode: {mode} ({'streaming' if use_stream else 'json.load'})")
        stats = analyze_records(iter_records(path, mode), name, count_duplicates=True)
        result = {
            "file_name": name,
            "file_size_mb": size_mb,
            "record_count": stats["records_analyzed"],
            "fields": stats["fields"],
            "field_types": stats["field_types"],
            "sample_records": stats["sample_records"],
            "missing_values": stats["missing_values"],
            "empty_strings": stats["empty_strings"],
            "duplicates_found": stats["duplicates_found"],
            "records_missing_important_fields": stats["records_missing_important_fields"],
            "validation_mode": "Full validation",
            "records_analyzed": stats["records_analyzed"],
        }

    issues = []
    if result.get("validation_mode", "").startswith("Sample"):
        issues.append("Sample-based validation performed.")
    if result["duplicates_found"]:
        issues.append(f"{result['duplicates_found']:,} duplicates"
                      + (f" (est. from {sample['duplicate_percentage_sample']}% sample)"
                         if is_large_csv else ""))
    if result["records_missing_important_fields"]:
        issues.append(f"{result['records_missing_important_fields']:,} missing important fields")
    if result["empty_strings"]:
        issues.append(f"{result['empty_strings']:,} empty strings")
    if mode == "multi_array":
        issues.append("Concatenated JSON arrays detected")
    result["validation_issues"] = issues

    print(
        f"    Done {time.time()-t0:.1f}s | records={result['record_count']:,} | "
        f"dups={result['duplicates_found']:,} | missing={result['missing_values']:,}"
    )
    return result


def validation_status(results: list[dict]) -> str:
    if any(r["record_count"] == 0 for r in results):
        return "FAIL"
    if any(r.get("validation_issues") for r in results):
        return "WARN"
    return "PASS"


def build_outputs(results: list[dict]) -> tuple[dict, list]:
    all_fields: set[str] = set()
    breakdown = {}
    for r in results:
        breakdown[r["file_name"]] = r["record_count"]
        all_fields.update(r["fields"])

    by_size = sorted(results, key=lambda x: x["file_size_mb"])
    rag = sorted({f for r in results for f in RAG_BY_DATASET.get(r["file_name"], []) if f in all_fields})

    structure = [
        {
            "file_name": r["file_name"],
            "file_size_mb": r["file_size_mb"],
            "record_count": r["record_count"],
            "fields": r["fields"],
            "field_types": r["field_types"],
        }
        for r in results
    ]

    summary = {
        "total_files": len(results),
        "total_records": sum(r["record_count"] for r in results),
        "largest_file": by_size[-1]["file_name"] if by_size else "",
        "smallest_file": by_size[0]["file_name"] if by_size else "",
        "file_breakdown": breakdown,
        "available_fields": sorted(all_fields),
        "duplicates_found": sum(r["duplicates_found"] for r in results),
        "missing_values": sum(r["missing_values"] for r in results),
        "recommended_rag_fields": rag,
        "validation_status": validation_status(results),
        "generated_at": utc_now(),
    }
    if any(r.get("validation_mode", "").startswith("Sample") for r in results):
        summary["validation_note"] = "Sample-based validation performed."

    return summary, structure


def print_report(summary: dict, results: list[dict]) -> None:
    print("\n" + "=" * 40)
    print("KNOWLEDGE BASE ANALYSIS REPORT")
    print("=" * 40)
    print(f"Total JSON Files: {summary['total_files']}")
    print(f"Total Records: {summary['total_records']:,}")
    print(f"Largest File: {summary['largest_file']}")
    print(f"Smallest File: {summary['smallest_file']}")
    print("\nPer File Summary:")
    for r in results:
        print(f"- File Name: {r['file_name']}")
        print(f"  Record Count: {r['record_count']:,}")
        print(f"  Missing Values: {r['missing_values']:,}")
        print(f"  Duplicate Records: {r['duplicates_found']:,}")
        if r.get("duplicate_percentage_sample") is not None:
            print(f"  Duplicate % (sample): {r['duplicate_percentage_sample']}%")
        print(f"  Available Fields: {', '.join(r['fields'])}")
        print(f"  Validation: {r.get('validation_mode', 'Full validation')}")
    print("\nRecommended Fields for RAG:")
    for f in summary["recommended_rag_fields"]:
        print(f"- {f}")
    if summary.get("validation_note"):
        print(f"\nNote: {summary['validation_note']}")
    print(f"\nValidation Status: {summary['validation_status']}")
    print("=" * 40)


def main() -> None:
    files = sorted(
        (p for p in JSON_OUTPUT.glob("*.json") if p.name not in IGNORE),
        key=lambda p: p.stat().st_size,
    )
    print(f"Analyzing {len(files)} files in {JSON_OUTPUT} (one at a time)")

    results = []
    for path in files:
        results.append(analyze_file(path))

    summary, structure = build_outputs(results)
    with open(SUMMARY_PATH, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)
    with open(STRUCTURE_PATH, "w", encoding="utf-8") as f:
        json.dump(structure, f, indent=2, ensure_ascii=False)

    print_report(summary, results)
    print(f"\nWrote {SUMMARY_PATH.name}")
    print(f"Wrote {STRUCTURE_PATH.name}")


if __name__ == "__main__":
    main()
