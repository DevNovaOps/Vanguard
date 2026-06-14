#!/usr/bin/env python3
"""Streaming JSON record iterators for large knowledge-base files."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Iterator

try:
    import ijson
except ImportError as exc:
    raise SystemExit("ERROR: pip install ijson") from exc

LARGE_BYTES = 100 * 1024 * 1024


def sanitize_json_text(text: str) -> str:
    if "NaN" in text or "Infinity" in text:
        text = text.replace(": NaN", ": null").replace(":NaN", ": null")
        text = text.replace(": -Infinity", ": null").replace(":-Infinity", ": null")
        text = text.replace(": Infinity", ": null").replace(":Infinity", ": null")
    return text


def is_multi_array(path: Path) -> bool:
    with open(path, "rb") as handle:
        head = handle.read(min(50 * 1024 * 1024, path.stat().st_size))
    return bool(re.search(rb"\]\s*,\s*\{", head))


def iter_multi_array(path: Path) -> Iterator[dict[str, Any]]:
    with open(path, encoding="utf-8") as handle:
        text = handle.read()
    decoder = json.JSONDecoder()
    position = 0
    length = len(text)

    while position < length:
        while position < length and text[position] in " \t\n\r,":
            position += 1
        if position >= length:
            break
        if text[position] == "]":
            position += 1
            continue

        chunk, end = decoder.raw_decode(text, position)
        position = end
        records = chunk if isinstance(chunk, list) else [chunk]
        for record in records:
            if isinstance(record, dict):
                yield record


def iter_line_stream(
    path: Path,
    skip_count: int = 0,
    target_line_number: int = 0,
    state: dict[str, Any] | None = None
) -> Iterator[dict[str, Any]]:
    if state is None:
        state = {"skipped": 0, "processed": 0, "line_number": 0, "incidents": 0}

    log_path = path.resolve().parent.parent.parent / "outputs" / "skipped_csv_records.log"
    log_path.parent.mkdir(parents=True, exist_ok=True)

    log_mode = "a" if skip_count > 0 or target_line_number > 0 else "w"
    skipped_log = open(log_path, log_mode, encoding="utf-8")

    current_line = 0
    records_yielded = 0
    buffer = ""
    record_start_line = 0

    def mark_processed():
        state["processed"] += 1
        if state["processed"] % 100_000 == 0:
            print(f"Processed: {state['processed']}")
            print(f"Incidents: {state.get('incidents', 0)}")
            print(f"Skipped: {state['skipped']}")
            import sys
            sys.stdout.flush()

    def mark_skipped(candidate_text: str, start_ln: int):
        state["skipped"] += 1
        skipped_log.write(f"Line {start_ln}: {candidate_text[:200]}\n")
        skipped_log.flush()
        mark_processed()

    try:
        with open(path, encoding="utf-8") as handle:
            # Phase 1: Fast-forward by line number if available
            if target_line_number > 0:
                for line in handle:
                    current_line += 1
                    if current_line >= target_line_number:
                        break
                records_yielded = skip_count

            # Phase 2: Fast-forward by record count if line number is not available
            elif skip_count > 0:
                for line in handle:
                    current_line += 1
                    stripped = line.strip()
                    if not stripped or stripped == "[":
                        continue
                    if stripped == "]":
                        break
                    candidate = stripped.rstrip(",")
                    if candidate == "]":
                        break

                    if not buffer:
                        if candidate.startswith("{"):
                            if candidate.endswith("}"):
                                records_yielded += 1
                                if records_yielded >= skip_count:
                                    break
                            else:
                                buffer = line
                                record_start_line = current_line
                    else:
                        if stripped.startswith('{"'):
                            buffer = line
                            record_start_line = current_line
                        else:
                            buffer += line
                            candidate_buf = buffer.strip().rstrip(",")
                            if candidate_buf.endswith("}"):
                                records_yielded += 1
                                buffer = ""
                                if records_yielded >= skip_count:
                                    break

            # Phase 3: Normal processing
            buffer = ""
            for line in handle:
                current_line += 1
                state["line_number"] = current_line

                if not buffer:
                    stripped = line.strip()
                    if not stripped or stripped == "[":
                        continue
                    if stripped == "]":
                        break
                    candidate = stripped.rstrip(",")
                    if candidate == "]":
                        break

                    record_start_line = current_line

                    try:
                        sanitized = sanitize_json_text(candidate)
                        record = json.loads(sanitized)
                        if isinstance(record, dict):
                            mark_processed()
                            yield record
                        else:
                            raise ValueError("Record is not a dict")
                    except Exception:
                        if candidate.startswith("{") and not candidate.endswith("}"):
                            buffer = line
                        else:
                            mark_skipped(candidate, record_start_line)
                else:
                    stripped = line.strip()
                    if stripped.startswith('{"'):
                        candidate_buf = buffer.strip().rstrip(",")
                        mark_skipped(candidate_buf, record_start_line)

                        buffer = ""
                        record_start_line = current_line
                        candidate = stripped.rstrip(",")
                        if candidate == "]":
                            break
                        try:
                            sanitized = sanitize_json_text(candidate)
                            record = json.loads(sanitized)
                            if isinstance(record, dict):
                                mark_processed()
                                yield record
                            else:
                                raise ValueError("Record is not a dict")
                        except Exception:
                            if candidate.startswith("{") and not candidate.endswith("}"):
                                buffer = line
                            else:
                                mark_skipped(candidate, record_start_line)
                    else:
                        buffer += line
                        candidate_buf = buffer.strip().rstrip(",")
                        if candidate_buf.endswith("}"):
                            try:
                                sanitized = sanitize_json_text(candidate_buf)
                                record = json.loads(sanitized)
                                if isinstance(record, dict):
                                    mark_processed()
                                    yield record
                                else:
                                    raise ValueError("Record is not a dict")
                            except Exception:
                                mark_skipped(candidate_buf, record_start_line)
                            buffer = ""
                        else:
                            if len(buffer) > 10 * 1024 * 1024:
                                mark_skipped(candidate_buf, record_start_line)
                                buffer = ""
    finally:
        skipped_log.close()


def iter_ijson(path: Path) -> Iterator[dict[str, Any]]:
    with open(path, "rb") as handle:
        for record in ijson.items(handle, "item"):
            if isinstance(record, dict):
                yield record


def pick_mode(path: Path) -> str:
    size = path.stat().st_size
    if is_multi_array(path):
        return "multi_array"
    if size >= LARGE_BYTES:
        return "line"
    return "ijson"


def iter_records(
    path: Path,
    skip_count: int = 0,
    target_line_number: int = 0,
    state: dict[str, Any] | None = None
) -> Iterator[dict[str, Any]]:
    mode = pick_mode(path)
    if mode == "multi_array":
        yield from iter_multi_array(path)
    elif mode == "line":
        yield from iter_line_stream(path, skip_count, target_line_number, state)
    else:
        yield from iter_ijson(path)


class JsonArrayWriter:
    """Incrementally write a JSON array without loading all records in memory."""

    def __init__(self, path: Path) -> None:
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._handle = open(path, "w", encoding="utf-8")
        self._handle.write("[\n")
        self._first = True
        self.count = 0

    def write(self, record: dict[str, Any]) -> None:
        if not self._first:
            self._handle.write(",\n")
        json.dump(record, self._handle, ensure_ascii=False)
        self._first = False
        self.count += 1

    def close(self) -> None:
        self._handle.write("\n]\n")
        self._handle.close()
