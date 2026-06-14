#!/usr/bin/env python3
"""Test ChromaDB retrieval using a LangChain retriever."""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path

from langchain_chroma import Chroma
from langchain_ollama import OllamaEmbeddings

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CHROMA_DIR = PROJECT_ROOT / "chroma_db"
COLLECTION_NAME = "vanguard_knowledge"

TEST_QUERIES = [
    "What maintenance procedure should be followed for bearing overheating?",
    "What RDSO guidance exists for vibration anomalies?",
    "What inspection actions are recommended for wheel bearings?",
]


def load_retriever():
    if not CHROMA_DIR.exists():
        sys.exit(f"ERROR: ChromaDB not found at {CHROMA_DIR.resolve()}")

    embeddings = OllamaEmbeddings(model="nomic-embed-text")
    vectorstore = Chroma(
        collection_name=COLLECTION_NAME,
        embedding_function=embeddings,
        persist_directory=str(CHROMA_DIR),
    )
    return vectorstore.as_retriever(search_type="similarity", search_kwargs={"k": 5})


def print_results(query: str, documents: list, elapsed_seconds: float) -> None:
    print("=" * 33)
    print("Query:")
    print(query)
    print("=" * 33)
    print()
    print("Retrieved Documents:")
    print()

    if not documents:
        print("No documents retrieved.")
    else:
        for index, document in enumerate(documents, start=1):
            print(f"Document {index}:")
            print("Content:")
            print(document.page_content)
            print("Metadata:")
            print(json.dumps(document.metadata, indent=2, ensure_ascii=False))
            print()

    print(f"Retrieval time: {elapsed_seconds:.3f}s")
    print()


def main() -> None:
    retriever = load_retriever()

    for query in TEST_QUERIES:
        start = time.perf_counter()
        documents = retriever.invoke(query)
        elapsed = time.perf_counter() - start
        print_results(query, documents, elapsed)


if __name__ == "__main__":
    main()
