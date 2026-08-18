from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

from sentence_transformers import SentenceTransformer


# ============================================================
# PATHS
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[2]

EMBEDDINGS_FILE = (
    PROJECT_ROOT
    / "rag"
    / "embeddings"
    / "embeddings.json"
)


# ============================================================
# MODEL
# ============================================================

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"


# ============================================================
# LOAD EMBEDDINGS
# ============================================================

def load_embeddings() -> list[dict[str, Any]]:
    """
    Load all chunk embeddings and metadata.
    """

    if not EMBEDDINGS_FILE.exists():
        raise FileNotFoundError(
            f"Embeddings file not found: "
            f"{EMBEDDINGS_FILE}"
        )

    with EMBEDDINGS_FILE.open(
        "r",
        encoding="utf-8",
    ) as file:

        records = json.load(file)

    if not isinstance(records, list):
        raise ValueError(
            "embeddings.json must contain a list."
        )

    return records


# ============================================================
# COSINE SIMILARITY
# ============================================================

def cosine_similarity(
    query_vector: list[float],
    document_vector: list[float],
) -> float:

    if len(query_vector) != len(document_vector):
        raise ValueError(
            "Query and document vectors "
            "have different dimensions."
        )

    dot_product = sum(
        q * d
        for q, d in zip(
            query_vector,
            document_vector,
        )
    )

    query_norm = math.sqrt(
        sum(
            value * value
            for value in query_vector
        )
    )

    document_norm = math.sqrt(
        sum(
            value * value
            for value in document_vector
        )
    )

    if query_norm == 0 or document_norm == 0:
        return 0.0

    return (
        dot_product
        / (query_norm * document_norm)
    )


# ============================================================
# QUERY EMBEDDING
# ============================================================

def embed_query(
    query: str,
    model: SentenceTransformer,
) -> list[float]:

    if not query.strip():
        raise ValueError(
            "Query cannot be empty."
        )

    vector = model.encode(
        query.strip(),
        normalize_embeddings=True,
    )

    return vector.tolist()


# ============================================================
# RETRIEVE
# ============================================================

def retrieve(
    query: str,
    records: list[dict[str, Any]],
    model: SentenceTransformer,
    top_k: int = 5,
) -> list[dict[str, Any]]:
    """
    Retrieve the most similar knowledge chunks.
    """

    if top_k <= 0:
        raise ValueError(
            "top_k must be greater than zero."
        )

    query_vector = embed_query(
        query,
        model,
    )

    results = []

    for record in records:

        document_vector = record.get(
            "embedding"
        )

        if not document_vector:
            continue

        score = cosine_similarity(
            query_vector,
            document_vector,
        )

        results.append(
            {
                "score": score,
                "text": record.get(
                    "text",
                    "",
                ),
                "metadata": record.get(
                    "metadata",
                    {},
                ),
            }
        )

    results.sort(
        key=lambda item: item["score"],
        reverse=True,
    )

    return results[:top_k]


# ============================================================
# DISPLAY RESULTS
# ============================================================

def print_results(
    query: str,
    results: list[dict[str, Any]],
) -> None:

    print()
    print("=" * 80)
    print("RETRIEVAL RESULTS")
    print("=" * 80)

    print()
    print(
        f"Query: {query}"
    )

    print()

    for index, result in enumerate(
        results,
        start=1,
    ):

        metadata = result["metadata"]

        print("-" * 80)

        print(
            f"Rank: {index}"
        )

        print(
            f"Score: {result['score']:.4f}"
        )

        print(
            f"Source: "
            f"{metadata.get('source', 'Unknown')}"
        )

        print(
            f"Domain: "
            f"{metadata.get('domain', 'Unknown')}"
        )

        print(
            f"Topic: "
            f"{metadata.get('topic', 'Unknown')}"
        )

        print(
            f"Document: "
            f"{metadata.get('document', 'Unknown')}"
        )

        print(
            f"Chunk: "
            f"{metadata.get('chunk_id', 'Unknown')}"
        )

        print()

        text = result["text"]

        if len(text) > 500:
            text = text[:500] + "..."

        print(text)


# ============================================================
# MAIN TEST
# ============================================================

def main() -> None:

    print("=" * 80)
    print("RAG SIMILARITY RETRIEVER TEST")
    print("=" * 80)

    records = load_embeddings()

    print()
    print(
        f"Loaded embeddings: {len(records)}"
    )

    model = SentenceTransformer(
        MODEL_NAME
    )

    queries = [
        "What factors contribute to food insecurity?",
        "What social determinants affect access to primary care?",
        "What does USPSTF recommend for hypertension screening?",
        "How does housing instability affect health?",
    ]

    for query in queries:

        results = retrieve(
            query=query,
            records=records,
            model=model,
            top_k=5,
        )

        print_results(
            query,
            results,
        )

    print()
    print("=" * 80)
    print("RETRIEVAL TEST COMPLETED")
    print("=" * 80)


if __name__ == "__main__":
    main()