from __future__ import annotations

from typing import TypedDict

from langchain_core.documents import Document


class VanguardState(TypedDict, total=False):
    query: str
    documents: list[Document]
    context: str
    retrieved_sources: list[str]
    retrieval_results: str
    telemetry_data: dict
    telemetry_risk: str
    sensor_evidence: str
    historical_evidence: str
    historical_incidents: str
    rdso_guidance: str
    root_cause: str
    root_causes: str
    mitigation: str
    mitigation_actions: str
    executive_summary: str
    risk_level: str
    escalation_level: str
    alerts: list[str]
