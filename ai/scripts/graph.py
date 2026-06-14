#!/usr/bin/env python3
"""LangGraph workflow for the Vanguard multi-agent system."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPTS = ROOT / "scripts"
for path in (ROOT, SCRIPTS):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

from langgraph.graph import END, START, StateGraph

from agents.nodes import (
    telemetry_intelligence_agent,
    retrieval_agent,
    historical_incident_agent,
    rdso_knowledge_agent,
    root_cause_agent,
    mitigation_agent,
    executive_summary_agent,
)
from agents.reporting import save_executive_report_node
from agents.state import VanguardState


def build_vanguard_graph():
    """
    Vanguard 7-agent sequential workflow:

        User Query & Telemetry Data
                    ↓
        Telemetry Analysis Agent (Agent 1)
                    ↓
        RAG Retrieval Agent (Agent 2)
                    ↓
        Incident Analysis Agent (Agent 3)
                    ↓
        Compliance & Standards Agent (Agent 4)
                    ↓
        Root Cause Agent (Agent 5)
                    ↓
        Mitigation Decision Agent (Agent 6)
                    ↓
        Executive Reporting Agent (Agent 7)
                    ↓
                   END
    """
    graph = StateGraph(VanguardState)

    graph.add_node("telemetry_intelligence_agent", telemetry_intelligence_agent)
    graph.add_node("retrieval_agent", retrieval_agent)
    graph.add_node("historical_incident_agent", historical_incident_agent)
    graph.add_node("rdso_knowledge_agent", rdso_knowledge_agent)
    graph.add_node("root_cause_agent", root_cause_agent)
    graph.add_node("mitigation_agent", mitigation_agent)
    graph.add_node("executive_summary_agent", executive_summary_agent)

    graph.add_edge(START, "telemetry_intelligence_agent")
    graph.add_edge("telemetry_intelligence_agent", "retrieval_agent")
    graph.add_edge("retrieval_agent", "historical_incident_agent")
    graph.add_edge("historical_incident_agent", "rdso_knowledge_agent")
    graph.add_edge("rdso_knowledge_agent", "root_cause_agent")
    graph.add_edge("root_cause_agent", "mitigation_agent")
    graph.add_edge("mitigation_agent", "executive_summary_agent")
    graph.add_edge("executive_summary_agent", END)

    return graph.compile()


def run_vanguard(query: str, telemetry_data: dict = None) -> VanguardState:
    """Run the Vanguard graph for a single user query and optional telemetry data."""
    app = build_vanguard_graph()
    return app.invoke({"query": query, "telemetry_data": telemetry_data or {}})


def display_result(result: VanguardState) -> None:
    print("=" * 33)
    print("RETRIEVED SOURCES")
    print("=" * 33)
    sources = result.get("retrieved_sources", [])
    if sources:
        for index, source in enumerate(sources, start=1):
            print(f"{index}. {source}")
    else:
        print("No sources retrieved.")
    print()

    print("=" * 33)
    print("SENSOR EVIDENCE")
    print("=" * 33)
    print(result.get("sensor_evidence", ""))
    print()

    print("=" * 33)
    print("HISTORICAL INCIDENTS")
    print("=" * 33)
    print(result.get("historical_evidence", ""))
    print()

    print("=" * 33)
    print("ROOT CAUSE ANALYSIS")
    print("=" * 33)
    print(result.get("root_cause", ""))
    print()

    print("=" * 33)
    print("MITIGATION RECOMMENDATIONS")
    print("=" * 33)
    print(result.get("mitigation", ""))
    print()

    print("=" * 33)
    print("EXECUTIVE SUMMARY")
    print("=" * 33)
    print(result.get("executive_summary", ""))
    print()


def main() -> None:
    print("Vanguard Railway Maintenance Assistant")
    print("Type 'exit' to quit.\n")

    while True:
        query = input("Enter query: ").strip()
        if not query:
            continue
        if query.lower() == "exit":
            break

        result = run_vanguard(query)
        display_result(result)


if __name__ == "__main__":
    main()
