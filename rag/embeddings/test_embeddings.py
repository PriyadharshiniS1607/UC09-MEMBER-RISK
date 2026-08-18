from __future__ import annotations

import json
import math
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]

EMBEDDINGS_FILE = (
    PROJECT_ROOT
    / "rag"
    / "embeddings"
    / "embeddings.json"
)

EXPECTED_DIMENSION = 384


def cosine_similarity(
    a: list[float],
    b: list[float],
) -> float:

    if len(a) != len(b):
        raise ValueError(
            "Vectors have different dimensions."
        )

    dot = sum(
        x * y
        for x, y in zip(a, b)
    )

    norm_a = math.sqrt(
        sum(x * x for x in a)
    )

    norm_b = math.sqrt(
        sum(y * y for y in b)
    )

    if norm_a == 0 or norm_b == 0:
        return 0.0

    return dot / (norm_a * norm_b)


def main() -> None:

    print("=" * 70)
    print("EMBEDDING SANITY TEST")
    print("=" * 70)
    print()

    if not EMBEDDINGS_FILE.exists():
        raise FileNotFoundError(
            f"Embeddings file not found: {EMBEDDINGS_FILE}"
        )

    with EMBEDDINGS_FILE.open(
        "r",
        encoding="utf-8",
    ) as file:

        records = json.load(file)

    print(
        f"Embedding records: {len(records)}"
    )

    assert len(records) == 1342, (
        f"Expected 1342 records, "
        f"found {len(records)}"
    )

    dimensions = set()

    invalid_vectors = 0

    empty_text = 0

    for record in records:

        text = record.get("text", "")

        vector = record.get(
            "embedding",
            [],
        )

        if not text.strip():
            empty_text += 1

        dimensions.add(len(vector))

        if len(vector) != EXPECTED_DIMENSION:
            invalid_vectors += 1
            continue

        if any(
            not math.isfinite(value)
            for value in vector
        ):
            invalid_vectors += 1

    print(
        f"Vector dimensions found: {dimensions}"
    )

    print(
        f"Invalid vectors: {invalid_vectors}"
    )

    print(
        f"Empty text records: {empty_text}"
    )

    assert dimensions == {
        EXPECTED_DIMENSION
    }, (
        f"Unexpected dimensions: {dimensions}"
    )

    assert invalid_vectors == 0, (
        "Invalid embedding vectors detected."
    )

    assert empty_text == 0, (
        "Empty chunk text detected."
    )

    # --------------------------------------------------------
    # Similarity sanity check
    # --------------------------------------------------------

    first_vector = records[0]["embedding"]

    second_vector = records[1]["embedding"]

    similarity = cosine_similarity(
        first_vector,
        second_vector,
    )

    print()
    print(
        "Similarity test:"
    )

    print(
        f"Chunk 0 ↔ Chunk 1: {similarity:.4f}"
    )

    assert -1.0 <= similarity <= 1.0

    # --------------------------------------------------------
    # Metadata sanity check
    # --------------------------------------------------------

    required_metadata = [
        "source",
        "source_type",
        "domain",
        "topic",
        "document",
        "chunk_id",
    ]

    missing_metadata = []

    for index, record in enumerate(records):

        metadata = record.get(
            "metadata",
            {},
        )

        for field in required_metadata:

            if field not in metadata:

                missing_metadata.append(
                    (
                        index,
                        field,
                    )
                )

    print(
        f"Missing metadata fields: "
        f"{len(missing_metadata)}"
    )

    assert not missing_metadata, (
        f"Missing metadata: "
        f"{missing_metadata[:10]}"
    )

    print()
    print("=" * 70)
    print("EMBEDDING SANITY TEST PASSED")
    print("=" * 70)


if __name__ == "__main__":
    main()