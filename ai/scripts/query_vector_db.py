#!/usr/bin/env python3
"""Query the Vanguard ChromaDB vector store."""

from __future__ import annotations

import json
import sys
from pathlib import Path

from langchain_chroma import Chroma
from langchain_ollama import OllamaEmbeddings

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CHROMA_DIR = PROJECT_ROOT / "chroma_db"
COLLECTION_NAME = "vanguard_knowledge"
TOP_K = 5

TEST_QUERIES = [
    "What maintenance procedure should be followed for bearing overheating?",
    "What RDSO guidance exists for vibration anomalies?",
    "What inspection actions are recommended for wheel bearings?",
]


def load_vectorstore() -> Chroma:
    if not CHROMA_DIR.exists():
        sys.exit(f"ERROR: ChromaDB not found at {CHROMA_DIR.resolve()}")

    import chromadb
    embeddings = OllamaEmbeddings(model="nomic-embed-text")
    client = chromadb.PersistentClient(path=str(CHROMA_DIR))
    return Chroma(
        collection_name=COLLECTION_NAME,
        embedding_function=embeddings,
        client=client,
    )


def print_results(query: str, results: list) -> None:
    print("=" * 80)
    print(f"Query: {query}")
    print("=" * 80)

    if not results:
        print("No results found.\n")
        return

    for index, (document, score) in enumerate(results, start=1):
        print(f"\n--- Result {index} (score: {score:.4f}) ---")
        print(document.page_content)
        print("\nMetadata:")
        print(json.dumps(document.metadata, indent=2, ensure_ascii=False))

    print()


def main() -> None:
    vectorstore = load_vectorstore()

    for query in TEST_QUERIES:
        results = vectorstore.similarity_search_with_score(query, k=TOP_K)
        print_results(query, results)


if __name__ == "__main__":
    main()
