from __future__ import annotations

import json
from pathlib import Path

import faiss
import numpy as np
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

FAISS_INDEX_FILE = (
    PROJECT_ROOT
    / "rag"
    / "vectorstore"
    / "faiss_index"
    / "index.faiss"
)


# ============================================================
# CONFIGURATION
# ============================================================

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

TOP_K = 5


# ============================================================
# LOAD DATA
# ============================================================

def load_records() -> list[dict]:

    with EMBEDDINGS_FILE.open(
        "r",
        encoding="utf-8",
    ) as file:

        return json.load(file)


def load_faiss_index() -> faiss.Index:

    if not FAISS_INDEX_FILE.exists():

        raise FileNotFoundError(
            f"FAISS index not found:\n"
            f"{FAISS_INDEX_FILE}"
        )

    return faiss.read_index(
        str(FAISS_INDEX_FILE)
    )


# ============================================================
# EMBEDDING MODEL
# ============================================================

def load_model() -> SentenceTransformer:

    return SentenceTransformer(
        MODEL_NAME
    )


# ============================================================
# RETRIEVAL
# ============================================================

def retrieve(
    query: str,
    model: SentenceTransformer,
    index: faiss.Index,
    records: list[dict],
    top_k: int = TOP_K,
) -> list[dict]:

    query_vector = model.encode(
        [query],
        convert_to_numpy=True,
        normalize_embeddings=True,
    ).astype(np.float32)

    scores, indices = index.search(
        query_vector,
        top_k,
    )

    results = []

    for rank, (score, vector_index) in enumerate(
        zip(scores[0], indices[0]),
        start=1,
    ):

        if vector_index < 0:
            continue

        record = records[vector_index]

        results.append(
            {
                "rank": rank,
                "score": float(score),
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

    return results


# ============================================================
# DISPLAY
# ============================================================

def print_results(
    query: str,
    results: list[dict],
) -> None:

    print()
    print("=" * 80)
    print("QUERY")
    print("=" * 80)

    print(query)

    print()
    print("-" * 80)

    for result in results:

        metadata = result["metadata"]

        print(
            f"Rank: {result['rank']}"
        )

        print(
            f"Score: {result['score']:.4f}"
        )

        print(
            f"Source: "
            f"{metadata.get('source')}"
        )

        print(
            f"Domain: "
            f"{metadata.get('domain')}"
        )

        print(
            f"Topic: "
            f"{metadata.get('topic')}"
        )

        print(
            f"Document: "
            f"{metadata.get('document')}"
        )

        print(
            f"Chunk: "
            f"{metadata.get('chunk_id')}"
        )

        print()

        text = result["text"]

        if len(text) > 500:
            text = text[:500] + "..."

        print(text)

        print()
        print("-" * 80)


# ============================================================
# TEST QUERIES
# ============================================================

TEST_QUERIES = [

    "What factors contribute to food insecurity?",

    "What social determinants affect access to primary care?",

    "What does USPSTF recommend for hypertension screening?",

    "How does housing instability affect health?",
]


# ============================================================
# MAIN
# ============================================================

def main() -> None:

    print("=" * 80)
    print("FAISS RETRIEVAL TEST")
    print("=" * 80)

    records = load_records()

    index = load_faiss_index()

    model = load_model()

    print()
    print(
        f"Loaded embeddings: {len(records)}"
    )

    print(
        f"FAISS vectors: {index.ntotal}"
    )

    print(
        f"FAISS dimension: {index.d}"
    )

    if index.ntotal != len(records):

        raise ValueError(
            "FAISS vector count does not "
            "match embeddings.json records."
        )

    for query in TEST_QUERIES:

        results = retrieve(
            query=query,
            model=model,
            index=index,
            records=records,
            top_k=TOP_K,
        )

        print_results(
            query,
            results,
        )

    print()
    print("=" * 80)
    print("FAISS RETRIEVAL TEST COMPLETED")
    print("=" * 80)


if __name__ == "__main__":
    main()