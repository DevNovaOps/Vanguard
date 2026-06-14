#!/usr/bin/env python3
"""Incrementally expand ChromaDB with MAT and CSV summary documents."""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path
from typing import Any, Iterator

from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_ollama import OllamaEmbeddings
from tqdm import tqdm

from json_stream import iter_records

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CHROMA_DIR = PROJECT_ROOT / "chroma_db"
COLLECTION_NAME = "vanguard_knowledge"
BATCH_SIZE = 64

SUMMARY_FILES = (
    ("mat_feature_summaries.json", "mat_features"),
    ("csv_incident_summaries.json", "csv_incident"),
)

STATS_PATH = PROJECT_ROOT / "knowledge_base" / "chromadb_expansion_stats.json"


def flatten_metadata(metadata: dict[str, Any]) -> dict[str, str | int | float | bool]:
    flat: dict[str, str | int | float | bool] = {}
    for key, value in metadata.items():
        if value is None:
            continue
        if isinstance(value, (str, int, float, bool)):
            flat[str(key)] = value
        else:
            flat[str(key)] = json.dumps(value, ensure_ascii=False)
    return flat


def iter_summary_records(path: Path) -> Iterator[dict[str, Any]]:
    if not path.exists():
        return
    yield from iter_records(path)


def summary_to_document(record: dict[str, Any], source_type: str) -> tuple[Document, str] | None:
    if source_type == "mat_features":
        doc_id = str(record.get("id", ""))
        page_content = record.get("document")
        metadata = {
            "source_type": source_type,
            "dataset": record.get("dataset", ""),
            "file_name": record.get("file_name", ""),
            "variable_name": record.get("variable_name", ""),
            "shape": record.get("shape", ""),
        }
    else:
        doc_id = str(record.get("incident_id", ""))
        page_content = record.get("document")
        metadata = {
            "source_type": source_type,
            "dataset": record.get("dataset", ""),
            "component": record.get("component", ""),
            "severity": record.get("severity", ""),
            "file_name": record.get("incident_id", ""),
        }

    if not doc_id or not isinstance(page_content, str) or not page_content.strip():
        return None

    return (
        Document(page_content=page_content, metadata=flatten_metadata(metadata)),
        doc_id,
    )


def load_existing_ids(vectorstore: Chroma) -> set[str]:
    try:
        existing = vectorstore.get(include=[])
        return set(existing.get("ids", []))
    except Exception:
        return set()


def unique_document_id(base_id: str, content: str, known_ids: set[str]) -> tuple[str, bool]:
    if base_id not in known_ids:
        return base_id, False

    content_hash = hashlib.md5(content.encode("utf-8")).hexdigest()[:8]
    candidate = f"{base_id}_{content_hash}"
    suffix = 1
    while candidate in known_ids:
        candidate = f"{base_id}_{content_hash}_{suffix}"
        suffix += 1
    return candidate, True


def flush_batch(
    vectorstore: Chroma,
    batch_docs: list[Document],
    batch_ids: list[str],
    known_ids: set[str],
) -> tuple[int, int]:
    if not batch_docs:
        return 0, 0

    unique_docs: list[Document] = []
    unique_ids: list[str] = []
    duplicates_skipped = 0

    for doc, doc_id in zip(batch_docs, batch_ids):
        if doc_id not in known_ids:
            unique_docs.append(doc)
            unique_ids.append(doc_id)
            known_ids.add(doc_id)
        else:
            duplicates_skipped += 1

    if not unique_docs:
        return 0, duplicates_skipped

    vectorstore.add_documents(unique_docs, ids=unique_ids)
    return len(unique_ids), duplicates_skipped


def process_summary_file(
    path: Path,
    source_type: str,
    vectorstore: Chroma,
    known_ids: set[str],
) -> tuple[int, int, int]:
    documents_processed = 0
    embeddings_created = 0
    duplicates_skipped = 0
    batch_docs: list[Document] = []
    batch_ids: list[str] = []

    for record in tqdm(iter_summary_records(path), desc=path.name, unit="doc"):
        documents_processed += 1
        converted = summary_to_document(record, source_type)
        if converted is None:
            continue

        document, base_id = converted
        effective_known = known_ids | set(batch_ids)
        doc_id, was_duplicate = unique_document_id(
            base_id, document.page_content, effective_known
        )
        if was_duplicate:
            duplicates_skipped += 1

        batch_docs.append(document)
        batch_ids.append(doc_id)

        if len(batch_docs) >= BATCH_SIZE:
            created, skipped = flush_batch(vectorstore, batch_docs, batch_ids, known_ids)
            embeddings_created += created
            duplicates_skipped += skipped
            batch_docs = []
            batch_ids = []

    created, skipped = flush_batch(vectorstore, batch_docs, batch_ids, known_ids)
    embeddings_created += created
    duplicates_skipped += skipped
    return documents_processed, embeddings_created, duplicates_skipped


def main() -> None:
    if not CHROMA_DIR.exists():
        sys.exit(f"ERROR: Existing ChromaDB not found at {CHROMA_DIR.resolve()}")

    embeddings = OllamaEmbeddings(model="nomic-embed-text")
    vectorstore = Chroma(
        collection_name=COLLECTION_NAME,
        embedding_function=embeddings,
        persist_directory=str(CHROMA_DIR),
    )

    known_ids = load_existing_ids(vectorstore)
    existing_count = len(known_ids)
    total_processed = 0
    total_embeddings = 0
    total_duplicates_skipped = 0

    for filename, source_type in SUMMARY_FILES:
        path = PROJECT_ROOT / "knowledge_base" / filename
        if not path.exists():
            print(f"Skipping missing summary file: {path}")
            continue

        processed, created, skipped = process_summary_file(
            path, source_type, vectorstore, known_ids
        )
        total_processed += processed
        total_embeddings += created
        total_duplicates_skipped += skipped

    stats = {
        "existing_documents_preserved": existing_count,
        "summary_documents_processed": total_processed,
        "chromadb_documents_added": total_embeddings,
        "duplicate_documents_skipped": total_duplicates_skipped,
        "collection_name": COLLECTION_NAME,
        "chromadb_location": str(CHROMA_DIR.resolve()),
    }
    STATS_PATH.write_text(json.dumps(stats, indent=2), encoding="utf-8")

    print(f"Existing documents preserved: {existing_count}")
    print(f"Summary documents processed: {total_processed}")
    print(f"ChromaDB documents added: {total_embeddings}")
    print(f"Duplicate documents skipped: {total_duplicates_skipped}")
    print(f"ChromaDB location: {CHROMA_DIR.resolve()}")


if __name__ == "__main__":
    main()
