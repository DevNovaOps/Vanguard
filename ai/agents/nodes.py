#!/usr/bin/env python3
"""Vanguard LangGraph agent node definitions."""

from __future__ import annotations

import sys
from pathlib import Path

from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_ollama import ChatOllama, OllamaEmbeddings

SCRIPTS_DIR = Path(__file__).resolve().parent.parent / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from rag_chain import (  # noqa: E402
    CHROMA_DIR,
    COLLECTION_NAME,
    deduplicate_documents,
    format_context,
    load_retriever,
)

from agents.state import VanguardState

LLM_MODEL = "qwen2.5:3b"
MMR_SEARCH_KWARGS = {
    "k": 5,
    "fetch_k": 20,
    "lambda_mult": 0.7,
}


def get_llm() -> ChatOllama:
    return ChatOllama(model=LLM_MODEL)


def get_vectorstore() -> Chroma:
    embeddings = OllamaEmbeddings(model="nomic-embed-text")
    return Chroma(
        collection_name=COLLECTION_NAME,
        embedding_function=embeddings,
        persist_directory=str(CHROMA_DIR),
    )


def get_filtered_retriever(source_type: str):
    vectorstore = get_vectorstore()
    return vectorstore.as_retriever(
        search_type="mmr",
        search_kwargs={
            **MMR_SEARCH_KWARGS,
            "filter": {"source_type": source_type},
        },
    )


def get_filtered_retriever_by_dataset(dataset: str):
    vectorstore = get_vectorstore()
    return vectorstore.as_retriever(
        search_type="mmr",
        search_kwargs={
            **MMR_SEARCH_KWARGS,
            "filter": {"dataset": dataset},
        },
    )


def documents_to_source_names(documents: list[Document]) -> list[str]:
    names: list[str] = []
    for document in documents:
        name = document.metadata.get("file_name") or document.metadata.get("dataset")
        if name and name not in names:
            names.append(str(name))
    return names


def format_evidence(documents: list[Document], label: str) -> str:
    if not documents:
        return f"No {label} evidence retrieved."

    sections: list[str] = []
    for index, document in enumerate(documents, start=1):
        source_name = document.metadata.get("file_name", "Unknown source")
        sections.append(
            f"[{label} {index}] Source: {source_name}\n{document.page_content}"
        )
    return "\n\n".join(sections)


def telemetry_intelligence_agent(state: VanguardState) -> dict:
    """Analyze live telemetry, detect abnormal trends, and compute telemetry risk."""
    telemetry = state.get("telemetry_data") or {}
    query = state.get("query", "")
    
    # Extract telemetry values
    temperature = telemetry.get("temperature", 40)
    vibration = telemetry.get("vibration", 5)
    gas = telemetry.get("gas", 10)
    power = telemetry.get("power", 24)
    risk_score = telemetry.get("riskScore") or telemetry.get("risk_score") or 20

    # Rules analysis first to build context
    violations = []
    if temperature > 90: violations.append(f"Temperature high: {temperature}°C")
    if vibration > 80 or (vibration > 6 and vibration < 20): violations.append(f"Vibration high: {vibration} mm/s")
    if gas > 70: violations.append(f"Gas level high: {gas} ppm")
    if power < 15 or power > 30: violations.append(f"Power level anomalous: {power} kV (acceptable range: 15-30kV)")
    if risk_score > 85: violations.append(f"Base risk score critical: {risk_score}/100")
    
    violations_str = ", ".join(violations) if violations else "None"

    prompt = ChatPromptTemplate.from_template(
        """You are the Vanguard Telemetry Intelligence Agent.

Analyze the live railway telemetry readings below, identify anomalies or critical trends, and compute a telemetry risk summary.

Live Telemetry Data:
- Temperature: {temperature}°C (safety threshold: 90°C)
- Track Vibration: {vibration} mm/s (safety threshold: 80 mm/s or 6 mm/s scale)
- Hazardous Gas: {gas} ppm (safety threshold: 70 ppm)
- Power Grid Voltage: {power} kV (acceptable range: 15-30 kV)
- Pre-computed Base Risk: {risk_score}/100

Identified Safety Violations:
{violations}

Provide a concise telemetry analysis report including:
1. Threat classification (thermal, vibration, gas, voltage, multiple, or none)
2. Base risk classification (Low, Medium, High, Critical)
3. Trend diagnosis (increasing, decreasing, or stable)"""
    )
    
    chain = prompt | get_llm() | StrOutputParser()
    analysis = chain.invoke({
        "temperature": temperature,
        "vibration": vibration,
        "gas": gas,
        "power": power,
        "risk_score": risk_score,
        "violations": violations_str
    })
    
    return {
        "telemetry_risk": analysis,
        "sensor_evidence": analysis
    }


def retrieval_agent(state: VanguardState) -> dict:
    """Retrieve railway maintenance knowledge using the existing RAG pipeline."""
    query = state["query"]
    retriever = load_retriever()
    documents = deduplicate_documents(retriever.invoke(query))
    context = format_context(documents)

    return {
        "documents": documents,
        "context": context,
        "retrieved_sources": documents_to_source_names(documents),
        "retrieval_results": context,
    }


def sensor_evidence_agent(state: VanguardState) -> dict:
    """Analyze MAT signal feature summaries relevant to the query."""
    query = state["query"]
    retriever = get_filtered_retriever("mat_features")
    documents = deduplicate_documents(retriever.invoke(query))
    evidence = format_evidence(documents, "Sensor")

    prompt = ChatPromptTemplate.from_template(
        """You are the Vanguard Sensor Evidence Agent.

Interpret ONLY the MAT sensor feature evidence below for the user query.
Summarize abnormal signal characteristics, feature trends, and diagnostic indicators.

User Query:
{query}

MAT Sensor Evidence:
{sensor_evidence}

Provide a concise sensor evidence summary with cited source file names."""
    )

    chain = prompt | get_llm() | StrOutputParser()
    summary = chain.invoke({"query": query, "sensor_evidence": evidence})
    return {"sensor_evidence": summary}


def historical_incident_agent(state: VanguardState) -> dict:
    """Analyze CSV-derived historical incident summaries relevant to the query."""
    query = state["query"]
    retriever = get_filtered_retriever("csv_incident")
    documents = deduplicate_documents(retriever.invoke(query))
    evidence = format_evidence(documents, "Incident")

    prompt = ChatPromptTemplate.from_template(
        """You are the Vanguard Historical Incident Agent.

Use ONLY the CSV incident evidence below for the user query.
Summarize prior incidents, symptoms, severity patterns, and recurring findings.

User Query:
{query}

Historical Incident Evidence:
{historical_evidence}

Provide a concise historical incident summary with cited incident sources."""
    )

    chain = prompt | get_llm() | StrOutputParser()
    summary = chain.invoke({"query": query, "historical_evidence": evidence})
    return {
        "historical_evidence": summary,
        "historical_incidents": summary
    }


def rdso_knowledge_agent(state: VanguardState) -> dict:
    """Retrieve and summarize RDSO guidance from standard maintenance manuals."""
    query = state["query"]
    retriever = get_filtered_retriever_by_dataset("pdf_manuals")
    documents = deduplicate_documents(retriever.invoke(query))
    evidence = format_evidence(documents, "RDSO Guidance")

    prompt = ChatPromptTemplate.from_template(
        """You are the Vanguard RDSO Knowledge Agent.

Interpret and summarize ONLY the RDSO guidance and maintenance standards below for the user query.
Specify standard codes, inspection intervals, and procedural compliance rules.

User Query:
{query}

RDSO Manual Evidence:
{evidence}

Provide a concise summary of RDSO guidelines with cited files/pages."""
    )

    chain = prompt | get_llm() | StrOutputParser()
    summary = chain.invoke({"query": query, "evidence": evidence})
    return {"rdso_guidance": summary}


def root_cause_agent(state: VanguardState) -> dict:
    """Identify probable root causes from all retrieved evidence."""
    query = state["query"]
    context = state.get("context", "")
    sensor_evidence = state.get("sensor_evidence", "")
    historical_incidents = state.get("historical_incidents", "")
    rdso_guidance = state.get("rdso_guidance", "")

    prompt = ChatPromptTemplate.from_template(
        """You are the Vanguard Root Cause Agent.

Analyze the evidence below and identify probable root causes.

User Query:
{query}

General Context:
{context}

Sensor Evidence:
{sensor_evidence}

Historical Incident Evidence:
{historical_incidents}

RDSO Compliance Guidance:
{rdso_guidance}

Provide:
- Probable root causes (ranked by likelihood)
- Supporting evidence
- Source references"""
    )

    chain = prompt | get_llm() | StrOutputParser()
    root_cause = chain.invoke(
        {
            "query": query,
            "context": context,
            "sensor_evidence": sensor_evidence,
            "historical_incidents": historical_incidents,
            "rdso_guidance": rdso_guidance,
        }
    )
    return {
        "root_cause": root_cause,
        "root_causes": root_cause
    }


def mitigation_agent(state: VanguardState) -> dict:
    """Suggest maintenance and inspection actions."""
    query = state["query"]
    context = state.get("context", "")
    sensor_evidence = state.get("sensor_evidence", "")
    historical_incidents = state.get("historical_incidents", "")
    rdso_guidance = state.get("rdso_guidance", "")
    root_causes = state.get("root_causes", "")

    prompt = ChatPromptTemplate.from_template(
        """You are the Vanguard Mitigation Agent.

Use the evidence, RDSO guidelines, and root cause analysis below to suggest mitigations.

User Query:
{query}

General Context:
{context}

Sensor Evidence:
{sensor_evidence}

Historical Incident Evidence:
{historical_incidents}

RDSO Compliance Guidance:
{rdso_guidance}

Root Cause Analysis:
{root_causes}

Provide:
- Recommended inspection actions (e.g. detailed manual checking timeline)
- Recommended maintenance actions
- Priority order
- Source references"""
    )

    chain = prompt | get_llm() | StrOutputParser()
    mitigation = chain.invoke(
        {
            "query": query,
            "context": context,
            "sensor_evidence": sensor_evidence,
            "historical_incidents": historical_incidents,
            "rdso_guidance": rdso_guidance,
            "root_causes": root_causes,
        }
    )
    return {
        "mitigation": mitigation,
        "mitigation_actions": mitigation
    }


def executive_decision_agent(state: VanguardState) -> dict:
    """Generate risk scores, produce executive summaries, trigger alerts, and decide escalation levels."""
    query = state.get("query", "")
    retrieved_sources = ", ".join(state.get("retrieved_sources", []))
    retrieval_results = state.get("retrieval_results", "")
    sensor_evidence = state.get("sensor_evidence", "")
    historical_incidents = state.get("historical_incidents", "")
    rdso_guidance = state.get("rdso_guidance", "")
    root_causes = state.get("root_causes", "")
    mitigation_actions = state.get("mitigation_actions", "")

    prompt = ChatPromptTemplate.from_template(
        """You are the Vanguard Executive Decision Agent.
Analyze all the compiled agent findings below and produce the final decision parameters.

User Query:
{query}

Retrieved Reference Sources:
{retrieved_sources}

General Retrieval Results:
{retrieval_results}

Sensor Evidence Interpretation:
{sensor_evidence}

Historical Incident Analysis:
{historical_incidents}

RDSO Guidance and Compliance Standards:
{rdso_guidance}

Ranked Root Cause Analysis:
{root_causes}

Mitigation Actions:
{mitigation_actions}

You MUST output your final report in the exact format shown below:

Risk Level: [Low / Medium / High / Critical] (Provide a 1-sentence justification)

Escalation Level: [Low / Medium / High / Critical] (Safety officer routing level)

Safety Alert: [Shutdown System / Emergency Brake / Maintenance Alert / Critical Infrastructure Isolation / Keep Monitoring] (Select the most urgent safety trigger)

Executive Summary:
[Provide a clear, high-level summary of the situation, the diagnosed threat, and the proposed actions]

Recommended Actions:
1. [Numbered action list with references]

Sources:
[List source document names/manuals cited]"""
    )

    chain = prompt | get_llm() | StrOutputParser()
    summary = chain.invoke({
        "query": query,
        "retrieved_sources": retrieved_sources,
        "retrieval_results": retrieval_results,
        "sensor_evidence": sensor_evidence,
        "historical_incidents": historical_incidents,
        "rdso_guidance": rdso_guidance,
        "root_causes": root_causes,
        "mitigation_actions": mitigation_actions
    })

    # Extract risk level, escalation level, alerts
    import re
    clean_summary = summary.replace("**", "")
    
    risk_match = re.search(r"Risk Level:\s*(Low|Medium|High|Critical)", clean_summary, re.IGNORECASE)
    risk_level = risk_match.group(1).upper() if risk_match else "LOW"

    esc_match = re.search(r"Escalation Level:\s*(Low|Medium|High|Critical)", clean_summary, re.IGNORECASE)
    escalation_level = esc_match.group(1).upper() if esc_match else risk_level

    alert_match = re.search(
        r"Safety Alert:\s*(Shutdown System|Emergency Brake|Maintenance Alert|Critical Infrastructure Isolation|Keep Monitoring)",
        clean_summary,
        re.IGNORECASE
    )
    alert = alert_match.group(1).strip() if alert_match else "Keep Monitoring"

    return {
        "executive_summary": summary,
        "risk_level": risk_level,
        "escalation_level": escalation_level,
        "alerts": [alert]
    }


def executive_summary_agent(state: VanguardState) -> dict:
    """Produce final executive decision report summary."""
    res = executive_decision_agent(state)
    return {
        "executive_summary": res["executive_summary"],
        "risk_level": res["risk_level"],
        "escalation_level": res.get("escalation_level", "LOW"),
        "alerts": res.get("alerts", [])
    }
