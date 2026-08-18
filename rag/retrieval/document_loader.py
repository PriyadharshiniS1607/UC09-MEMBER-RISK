from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[2]

DOCUMENTS_DIR = PROJECT_ROOT / "rag" / "documents"


# ============================================================
# RAG DOCUMENT
# ============================================================

@dataclass
class RAGDocument:
    """
    Standard internal representation of one knowledge document.
    """

    text: str
    metadata: dict[str, Any]


# ============================================================
# SOURCE DETECTION
# ============================================================

def detect_source(
    file_path: Path,
) -> dict[str, str]:

    relative_path = file_path.relative_to(
        DOCUMENTS_DIR
    )

    parts = [
        part.lower()
        for part in relative_path.parts
    ]

    # --------------------------------------------------------
    # USPSTF
    # --------------------------------------------------------

    if "uspstf" in parts:

        return {
            "source": "USPSTF",
            "source_type": "clinical",
            "domain": "clinical_recommendation",
        }

    # --------------------------------------------------------
    # HEALTHY PEOPLE 2030
    # --------------------------------------------------------

    if "healthy_people_2030" in parts:

        domain_map = {
            "economic_stability":
                "economic_stability",

            "education_access":
                "education_access",

            "health_care_access":
                "health_care_access",

            "neighborhood_built_environment":
                "neighborhood_built_environment",

            "social_community_context":
                "social_community_context",
        }

        domain = "sdoh"

        for folder, mapped_domain in domain_map.items():

            if folder in parts:

                domain = mapped_domain
                break

        return {
            "source": "Healthy People 2030",
            "source_type": "sdoh",
            "domain": domain,
        }

    # --------------------------------------------------------
    # USDA
    # --------------------------------------------------------

    if "usda" in parts:

        if "food_access" in parts:
            domain = "food_access"
        else:
            domain = "sdoh"

        return {
            "source": "USDA",
            "source_type": "sdoh",
            "domain": domain,
        }

    # --------------------------------------------------------
    # UNKNOWN
    # --------------------------------------------------------

    return {
        "source": "Unknown",
        "source_type": "unknown",
        "domain": "unknown",
    }


# ============================================================
# JSON → TEXT
# ============================================================

def json_to_text(
    value: Any,
    prefix: str = "",
) -> str:
    """
    Convert arbitrary nested JSON into readable text.

    This keeps the loader compatible with different
    structures used by USPSTF, Healthy People 2030,
    and USDA documents.
    """

    if value is None:
        return ""

    if isinstance(value, str):

        return value.strip()

    if isinstance(
        value,
        (int, float, bool),
    ):

        return str(value)

    if isinstance(value, list):

        parts: list[str] = []

        for item in value:

            text = json_to_text(item)

            if text:
                parts.append(text)

        return "\n".join(parts)

    if isinstance(value, dict):

        parts: list[str] = []

        for key, item in value.items():

            text = json_to_text(item)

            if not text:
                continue

            readable_key = (
                str(key)
                .replace("_", " ")
                .strip()
            )

            parts.append(
                f"{readable_key}: {text}"
            )

        return "\n".join(parts)

    return str(value)


# ============================================================
# TOPIC EXTRACTION
# ============================================================

def extract_topic(
    data: Any,
    file_path: Path,
) -> str:

    if isinstance(data, dict):

        possible_fields = [
            "topic",
            "title",
            "name",
            "recommendation_title",
            "condition",
            "subject",
        ]

        for field in possible_fields:

            value = data.get(field)

            if (
                isinstance(value, str)
                and value.strip()
            ):
                return value.strip()

    return (
        file_path.stem
        .replace("_", " ")
        .strip()
    )


# ============================================================
# URL EXTRACTION
# ============================================================

def extract_source_url(
    data: Any,
) -> str | None:

    if not isinstance(data, dict):
        return None

    possible_fields = [
        "source_url",
        "url",
        "source",
        "reference_url",
    ]

    for field in possible_fields:

        value = data.get(field)

        if (
            isinstance(value, str)
            and value.startswith(
                ("http://", "https://")
            )
        ):
            return value

    return None


# ============================================================
# SINGLE DOCUMENT
# ============================================================

def load_document(
    file_path: Path,
) -> RAGDocument:

    with file_path.open(
        "r",
        encoding="utf-8",
    ) as file:

        data = json.load(file)

    source_metadata = detect_source(
        file_path
    )

    text = json_to_text(
        data
    ).strip()

    topic = extract_topic(
        data,
        file_path,
    )

    source_url = extract_source_url(
        data
    )

    metadata = {
        **source_metadata,

        "topic": topic,

        "document": file_path.name,

        "document_path": str(
            file_path.relative_to(
                PROJECT_ROOT
            )
        ),

        "source_url": source_url,
    }

    return RAGDocument(
        text=text,
        metadata=metadata,
    )


# ============================================================
# LOAD ALL DOCUMENTS
# ============================================================

def load_documents() -> list[RAGDocument]:
    """
    Recursively load every JSON document from rag/documents/.
    """

    if not DOCUMENTS_DIR.exists():

        raise FileNotFoundError(
            f"Documents directory not found: "
            f"{DOCUMENTS_DIR}"
        )

    json_files = sorted(
        DOCUMENTS_DIR.rglob("*.json")
    )

    documents: list[RAGDocument] = []

    for file_path in json_files:

        try:

            document = load_document(
                file_path
            )

            if not document.text:

                print(
                    f"[SKIP] Empty document: "
                    f"{file_path}"
                )

                continue

            documents.append(
                document
            )

        except Exception as exc:

            print(
                f"[ERROR] Failed to load "
                f"{file_path}: {exc}"
            )

    return documents


# ============================================================
# DISPLAY SUMMARY
# ============================================================

def print_summary(
    documents: list[RAGDocument],
) -> None:

    print()
    print("=" * 70)
    print("RAG DOCUMENT LOADER")
    print("=" * 70)
    print()

    print(
        f"Documents loaded: {len(documents)}"
    )

    print()

    source_counts: dict[str, int] = {}

    domain_counts: dict[str, int] = {}

    for document in documents:

        source = document.metadata.get(
            "source",
            "Unknown",
        )

        domain = document.metadata.get(
            "domain",
            "unknown",
        )

        source_counts[source] = (
            source_counts.get(source, 0) + 1
        )

        domain_counts[domain] = (
            domain_counts.get(domain, 0) + 1
        )

    print("Sources:")

    for source, count in sorted(
        source_counts.items()
    ):

        print(
            f"  {source}: {count}"
        )

    print()

    print("Domains:")

    for domain, count in sorted(
        domain_counts.items()
    ):

        print(
            f"  {domain}: {count}"
        )


# ============================================================
# MAIN
# ============================================================

def main() -> None:

    documents = load_documents()

    print_summary(
        documents
    )

    print()

    if documents:

        print(
            "Document loading completed successfully."
        )

    else:

        print(
            "No documents were loaded."
        )


if __name__ == "__main__":
    main()