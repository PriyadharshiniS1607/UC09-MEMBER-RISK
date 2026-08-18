from __future__ import annotations

import json
from pathlib import Path

import faiss
import numpy as np


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

INDEX_DIR = (
    PROJECT_ROOT
    / "rag"
    / "vectorstore"
    / "faiss_index"
)

INDEX_FILE = INDEX_DIR / "index.faiss"


# ============================================================
# CONFIGURATION
# ============================================================

EXPECTED_DIMENSION = 384


# ============================================================
# LOAD EMBEDDINGS
# ============================================================

def load_embeddings() -> list[dict]:

    if not EMBEDDINGS_FILE.exists():
        raise FileNotFoundError(
            f"Embeddings file not found:\n"
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
# BUILD FAISS INDEX
# ============================================================

def build_index(
    records: list[dict],
) -> faiss.Index:

    if not records:
        raise ValueError(
            "No embedding records found."
        )

    vectors = []

    for index, record in enumerate(records):

        embedding = record.get("embedding")

        if not embedding:
            raise ValueError(
                f"Missing embedding at record {index}"
            )

        vectors.append(embedding)

    matrix = np.asarray(
        vectors,
        dtype=np.float32,
    )

    print(
        f"Embedding records: {len(records)}"
    )

    print(
        f"Vector dimension: {matrix.shape[1]}"
    )

    if matrix.shape[1] != EXPECTED_DIMENSION:
        raise ValueError(
            f"Expected {EXPECTED_DIMENSION} dimensions, "
            f"got {matrix.shape[1]}"
        )

    # --------------------------------------------------------
    # Normalize vectors
    # --------------------------------------------------------

    faiss.normalize_L2(matrix)

    # --------------------------------------------------------
    # Inner product on normalized vectors
    #
    # This is equivalent to cosine similarity.
    # --------------------------------------------------------

    index = faiss.IndexFlatIP(
        EXPECTED_DIMENSION
    )

    index.add(matrix)

    return index


# ============================================================
# SAVE INDEX
# ============================================================

def save_index(
    index: faiss.Index,
) -> None:

    INDEX_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    faiss.write_index(
        index,
        str(INDEX_FILE),
    )

    print()
    print(
        f"FAISS vectors: {index.ntotal}"
    )

    print(
        f"Index dimension: {index.d}"
    )

    print(
        f"Index saved to:"
    )

    print(INDEX_FILE)


# ============================================================
# MAIN
# ============================================================

def main() -> None:

    print("=" * 70)
    print("FAISS INDEX BUILDER")
    print("=" * 70)
    print()

    records = load_embeddings()

    index = build_index(
        records
    )

    print()
    print("Building FAISS index...")

    save_index(
        index
    )

    print()
    print("=" * 70)
    print("FAISS INDEX BUILD COMPLETED")
    print("=" * 70)


if __name__ == "__main__":
    main()