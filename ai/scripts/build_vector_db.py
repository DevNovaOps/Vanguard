#!/usr/bin/env python3
"""Build ChromaDB vector store from pdf_data.json and txt_data.json."""

from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Any, Iterator

try:
    import ijson
except ImportError:
    sys.exit("ERROR: pip install ijson")

from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_ollama import OllamaEmbeddings
from tqdm import tqdm

PROJECT_ROOT = Path(__file__).resolve().parent.parent
JSON_DIR = PROJECT_ROOT / "knowledge_base" / "json_output"
CHROMA_DIR = PROJECT_ROOT / "chroma_db"
COLLECTION_NAME = "vanguard_knowledge"
DATA_FILES = ("pdf_data.json", "txt_data.json")
BATCH_SIZE = 64


def sanitize_json_text(text: str) -> str:
    text = re.sub(r":\s*NaN\b", ": null", text)
    text = re.sub(r":\s*-Infinity\b", ": null", text)
    text = re.sub(r":\s*Infinity\b", ": null", text)
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


def iter_records(path: Path) -> Iterator[dict[str, Any]]:
    if is_multi_array(path):
        yield from iter_multi_array(path)
        return

    with open(path, "rb") as handle:
        for record in ijson.items(handle, "item"):
            if isinstance(record, dict):
                yield record


def flatten_metadata(metadata: Any) -> dict[str, str | int | float | bool]:
    if not isinstance(metadata, dict):
        return {}

    flat: dict[str, str | int | float | bool] = {}
    for key, value in metadata.items():
        if value is None:
            continue
        if isinstance(value, (str, int, float, bool)):
            flat[str(key)] = value
        else:
            flat[str(key)] = json.dumps(value, ensure_ascii=False)
    return flat


def record_to_document(record: dict[str, Any]) -> Document | None:
    doc_id = record.get("id")
    page_content = record.get("document")
    metadata = record.get("metadata")

    if not doc_id or not isinstance(page_content, str) or not page_content.strip():
        return None

    return Document(
        page_content=page_content,
        metadata=flatten_metadata(metadata),
    )


def load_existing_ids(vectorstore: Chroma) -> set[str]:
    try:
        existing = vectorstore.get(include=[])
        return set(existing.get("ids", []))
    except Exception:
        return set()


def unique_document_id(base_id: str, content: str, known_ids: set[str]) -> tuple[str, bool]:
    """Return a globally unique ID, appending a content hash when base_id collides."""
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


def process_file(
    path: Path,
    vectorstore: Chroma,
    known_ids: set[str],
) -> tuple[int, int, int]:
    documents_processed = 0
    embeddings_created = 0
    duplicates_skipped = 0
    batch_docs: list[Document] = []
    batch_ids: list[str] = []

    progress = tqdm(iter_records(path), desc=path.name, unit="doc")
    for record in progress:
        documents_processed += 1
        doc_id = record.get("id")
        if not doc_id:
            continue

        document = record_to_document(record)
        if document is None:
            continue

        base_id = str(doc_id)
        effective_known = known_ids | set(batch_ids)
        doc_id, was_duplicate = unique_document_id(
            base_id, document.page_content, effective_known
        )
        if was_duplicate:
            duplicates_skipped += 1

        batch_docs.append(document)
        batch_ids.append(doc_id)

        if len(batch_docs) >= BATCH_SIZE:
            created, skipped = flush_batch(
                vectorstore, batch_docs, batch_ids, known_ids
            )
            embeddings_created += created
            duplicates_skipped += skipped
            batch_docs = []
            batch_ids = []

    created, skipped = flush_batch(vectorstore, batch_docs, batch_ids, known_ids)
    embeddings_created += created
    duplicates_skipped += skipped
    return documents_processed, embeddings_created, duplicates_skipped


def main() -> None:
    CHROMA_DIR.mkdir(parents=True, exist_ok=True)

    missing = [name for name in DATA_FILES if not (JSON_DIR / name).exists()]
    if missing:
        sys.exit(f"ERROR: Missing data files in {JSON_DIR}: {', '.join(missing)}")

    embeddings = OllamaEmbeddings(model="nomic-embed-text")
    vectorstore = Chroma(
        collection_name=COLLECTION_NAME,
        embedding_function=embeddings,
        persist_directory=str(CHROMA_DIR),
    )

    known_ids = load_existing_ids(vectorstore)
    total_processed = 0
    total_embeddings = 0
    total_duplicates_skipped = 0

    for filename in DATA_FILES:
        processed, created, skipped = process_file(
            JSON_DIR / filename, vectorstore, known_ids
        )
        total_processed += processed
        total_embeddings += created
        total_duplicates_skipped += skipped

    print(f"Documents processed: {total_processed}")
    print(f"Embeddings created: {total_embeddings}")
    print(f"Duplicates skipped: {total_duplicates_skipped}")
    print(f"ChromaDB location: {CHROMA_DIR.resolve()}")


if __name__ == "__main__":
    main()
