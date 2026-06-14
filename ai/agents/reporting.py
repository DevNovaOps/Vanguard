from __future__ import annotations

import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

from agents.state import VanguardState

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "outputs"


def utc_timestamp() -> str:
    return datetime.now(timezone.utc).isoformat()


def extract_risk_level(executive_summary: str) -> str:
    match = re.search(
        r"Risk Level:\s*(Low|Medium|High)",
        executive_summary,
        flags=re.IGNORECASE,
    )
    if match:
        return match.group(1).capitalize()
    return "Unknown"


def save_executive_report(state: VanguardState) -> dict:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    report = {
        "timestamp": utc_timestamp(),
        "query": state.get("query", ""),
        "retrieved_sources": state.get("retrieved_sources", []),
        "sensor_evidence": state.get("sensor_evidence", ""),
        "historical_evidence": state.get("historical_evidence", ""),
        "root_cause": state.get("root_cause", ""),
        "mitigation": state.get("mitigation", ""),
        "executive_summary": state.get("executive_summary", ""),
        "risk_level": state.get("risk_level", extract_risk_level(
            state.get("executive_summary", "")
        )),
    }

    safe_name = re.sub(r"[^a-zA-Z0-9_-]+", "_", report["query"])[:60] or "report"
    output_path = OUTPUT_DIR / f"vanguard_report_{safe_name}_{report['timestamp'].replace(':', '-')}.json"
    output_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    report["_output_path"] = str(output_path)
    return report


def save_executive_report_node(state: VanguardState) -> dict:
    report = save_executive_report(state)
    return {"risk_level": report["risk_level"]}
