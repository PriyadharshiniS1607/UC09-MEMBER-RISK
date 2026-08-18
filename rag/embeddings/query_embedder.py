from __future__ import annotations

from pathlib import Path

from sentence_transformers import SentenceTransformer


PROJECT_ROOT = Path(__file__).resolve().parents[2]

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"


def load_model() -> SentenceTransformer:
    """
    Load the same embedding model used for document embeddings.
    """

    return SentenceTransformer(
        MODEL_NAME
    )


def embed_query(
    query: str,
    model: SentenceTransformer,
) -> list[float]:
    """
    Convert a user query into the same
    384-dimensional embedding space used
    by the knowledge-base chunks.
    """

    if not query or not query.strip():
        raise ValueError(
            "Query cannot be empty."
        )

    vector = model.encode(
        query.strip(),
        normalize_embeddings=True,
    )

    return vector.tolist()


def main() -> None:

    print("=" * 70)
    print("QUERY EMBEDDING TEST")
    print("=" * 70)
    print()

    query = (
        "What social determinants of health "
        "are associated with food insecurity?"
    )

    print(
        f"Query: {query}"
    )

    model = load_model()

    vector = embed_query(
        query,
        model,
    )

    print()
    print(
        f"Embedding dimension: {len(vector)}"
    )

    print(
        f"First 5 values: {vector[:5]}"
    )

    print()

    if len(vector) != 384:
        raise ValueError(
            f"Expected 384 dimensions, "
            f"got {len(vector)}"
        )

    print(
        "Query embedding test PASSED."
    )


if __name__ == "__main__":
    main()