#!/usr/bin/env python3
"""RAG chain for Vanguard railway maintenance assistant."""

from __future__ import annotations

import sys
from pathlib import Path

from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_ollama import ChatOllama, OllamaEmbeddings

CHROMA_DIR = Path(__file__).resolve().parent.parent / "chroma_db"
COLLECTION_NAME = "vanguard_knowledge"

TEST_QUERIES = [
    "What maintenance procedure should be followed for bearing overheating?",
    "What inspection actions are recommended for wheel bearings?",
    "What remedial measures are suggested for improper grease application?",
]

PROMPT_TEMPLATE = """You are Vanguard, an AI railway maintenance assistant.

Answer ONLY using the retrieved context.

If relevant information exists in the context, summarize it clearly.

Always provide:

1. Inspection Actions
2. Root Cause
3. Recommended Maintenance Actions
4. Source Documents

Only say:

"I could not find sufficient information in the knowledge base."

if absolutely no relevant information exists.

Be precise and cite the retrieved documents.

Context:
{context}

Question:
{question}"""


def load_retriever():
    if not CHROMA_DIR.exists():
        sys.exit(f"ERROR: ChromaDB not found at {CHROMA_DIR.resolve()}")

    embeddings = OllamaEmbeddings(model="nomic-embed-text")
    vectorstore = Chroma(
        collection_name=COLLECTION_NAME,
        embedding_function=embeddings,
        persist_directory=str(CHROMA_DIR),
    )
    return vectorstore.as_retriever(
        search_type="mmr",
        search_kwargs={
            "k": 5,
            "fetch_k": 20,
            "lambda_mult": 0.7,
        },
    )


def deduplicate_documents(documents: list[Document]) -> list[Document]:
    seen: set[tuple[str, str]] = set()
    unique_documents: list[Document] = []

    for document in documents:
        file_name = str(document.metadata.get("file_name", ""))
        key = (file_name, document.page_content)
        if key in seen:
            continue
        seen.add(key)
        unique_documents.append(document)

    return unique_documents


def format_context(documents: list[Document]) -> str:
    sections: list[str] = []
    for index, document in enumerate(documents, start=1):
        source_name = document.metadata.get("file_name", "Unknown source")
        sections.append(
            f"[Document {index}] Source: {source_name}\n{document.page_content}"
        )
    return "\n\n".join(sections)


def format_retrieved_sources(documents: list[Document]) -> str:
    if not documents:
        return "No documents retrieved."

    lines: list[str] = []
    for index, document in enumerate(documents, start=1):
        source_name = document.metadata.get("file_name", "Unknown source")
        dataset = document.metadata.get("dataset", "Unknown dataset")
        preview = document.page_content[:300].replace("\n", " ")
        if len(document.page_content) > 300:
            preview += "..."
        lines.append(
            f"{index}. {source_name} (dataset: {dataset})\n   Preview: {preview}"
        )
    return "\n".join(lines)


def build_rag_chain(retriever):
    llm = ChatOllama(model="qwen2.5:3b")
    prompt = ChatPromptTemplate.from_template(PROMPT_TEMPLATE)

    def retrieve_and_format(query: str) -> dict[str, str]:
        documents = deduplicate_documents(retriever.invoke(query))
        return {
            "context": format_context(documents),
            "question": query,
            "documents": documents,
        }

    def generate_answer(inputs: dict) -> str:
        chain = prompt | llm | StrOutputParser()
        return chain.invoke(
            {"context": inputs["context"], "question": inputs["question"]}
        )

    return retrieve_and_format, generate_answer


def run_query(query: str, retrieve_and_format, generate_answer) -> None:
    print("=" * 33)
    print("USER QUERY")
    print("=" * 33)
    print(query)
    print()
    print("Retrieved Sources:")

    retrieval = retrieve_and_format(query)
    documents = retrieval["documents"]
    print(format_retrieved_sources(documents))
    print()

    answer = generate_answer(retrieval)

    print("=" * 33)
    print("FINAL ANSWER")
    print("=" * 33)
    print()
    print(answer)
    print()


def main() -> None:
    retriever = load_retriever()
    retrieve_and_format, generate_answer = build_rag_chain(retriever)

    for query in TEST_QUERIES:
        run_query(query, retrieve_and_format, generate_answer)


if __name__ == "__main__":
    main()
