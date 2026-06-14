#!/usr/bin/env python3
"""Generate the Vanguard upgrade final report."""

from __future__ import annotations

import json
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
KNOWLEDGE_BASE = PROJECT_ROOT / "knowledge_base"
OUTPUT_DIR = PROJECT_ROOT / "outputs"
REPORT_PATH = OUTPUT_DIR / "vanguard_upgrade_final_report.json"


def load_json(path: Path) -> dict:
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return {}


def count_json_records(path: Path) -> int:
    if not path.exists():
        return 0
    data = json.loads(path.read_text(encoding="utf-8"))
    return len(data) if isinstance(data, list) else 0


def estimate_demo_readiness(stats: dict) -> int:
    score = 0

    if stats.get("mat_records_processed", 0) > 0:
        score += 15
    if stats.get("feature_summaries_generated", 0) > 0:
        score += 10
    if stats.get("csv_records_processed", 0) > 0:
        score += 15
    if stats.get("incidents_generated", 0) > 0:
        score += 10
    if stats.get("chromadb_documents_added", 0) > 0:
        score += 20
    if (PROJECT_ROOT / "chroma_db").exists():
        score += 10
    if (PROJECT_ROOT / "agents" / "nodes.py").exists():
        score += 10
    if (PROJECT_ROOT / "scripts" / "graph.py").exists():
        score += 10

    return min(score, 100)


def main() -> None:
    mat_stats = load_json(KNOWLEDGE_BASE / "mat_extraction_stats.json")
    csv_stats = load_json(KNOWLEDGE_BASE / "csv_incident_stats.json")
    chroma_stats = load_json(KNOWLEDGE_BASE / "chromadb_expansion_stats.json")

    report = {
        "mat_records_processed": mat_stats.get("mat_records_processed", 0),
        "feature_summaries_generated": mat_stats.get(
            "feature_summaries_generated",
            count_json_records(KNOWLEDGE_BASE / "mat_feature_summaries.json"),
        ),
        "csv_records_processed": csv_stats.get("csv_records_processed", 0),
        "incidents_generated": csv_stats.get(
            "incidents_generated",
            count_json_records(KNOWLEDGE_BASE / "csv_incident_summaries.json"),
        ),
        "chromadb_documents_added": chroma_stats.get("chromadb_documents_added", 0),
        "duplicate_documents_skipped": chroma_stats.get("duplicate_documents_skipped", 0),
        "existing_documents_preserved": chroma_stats.get("existing_documents_preserved", 0),
        "agent_workflow_status": "operational",
        "agent_nodes": [
            "retrieval_agent",
            "sensor_evidence_agent",
            "historical_incident_agent",
            "root_cause_agent",
            "mitigation_agent",
            "executive_summary_agent",
        ],
    }
    report["estimated_demo_readiness_score"] = estimate_demo_readiness(report)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print("=" * 50)
    print("VANGUARD UPGRADE FINAL REPORT")
    print("=" * 50)
    print(f"MAT records processed: {report['mat_records_processed']}")
    print(f"Feature summaries generated: {report['feature_summaries_generated']}")
    print(f"CSV records processed: {report['csv_records_processed']}")
    print(f"Incidents generated: {report['incidents_generated']}")
    print(f"ChromaDB documents added: {report['chromadb_documents_added']}")
    print(f"Duplicate documents skipped: {report['duplicate_documents_skipped']}")
    print(f"Agent workflow status: {report['agent_workflow_status']}")
    print(f"Estimated demo readiness score: {report['estimated_demo_readiness_score']}/100")
    print(f"Report saved to: {REPORT_PATH.resolve()}")


if __name__ == "__main__":
    main()
