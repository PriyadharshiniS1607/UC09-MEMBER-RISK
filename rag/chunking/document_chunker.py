from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter


# ============================================================
# PATHS
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[2]

DOCUMENTS_DIR = PROJECT_ROOT / "rag" / "documents"

CHUNKS_DIR = PROJECT_ROOT / "rag" / "chunks"
CHUNKS_FILE = CHUNKS_DIR / "chunks.json"


# ============================================================
# CHUNKING CONFIGURATION
# ============================================================

CHUNK_SIZE = 1000
CHUNK_OVERLAP = 150


# ============================================================
# TEXT SPLITTER
# ============================================================

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=CHUNK_SIZE,
    chunk_overlap=CHUNK_OVERLAP,
    separators=[
        "\n\n",
        "\n",
        ". ",
        ", ",
        " ",
        "",
    ],
)


# ============================================================
# SOURCE METADATA
# ============================================================

def detect_source(file_path: Path) -> dict[str, str]:
    """
    Determine the knowledge source and domain from the
    document's location inside rag/documents/.
    """

    relative_path = file_path.relative_to(DOCUMENTS_DIR)

    parts = [part.lower() for part in relative_path.parts]

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
    # Healthy People 2030
    # --------------------------------------------------------

    if "healthy_people_2030" in parts:

        domain_map = {
            "economic_stability": "economic_stability",
            "education_access": "education_access",
            "health_care_access": "health_care_access",
            "neighborhood_built_environment": (
                "neighborhood_built_environment"
            ),
            "social_community_context": (
                "social_community_context"
            ),
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
    # Unknown source
    # --------------------------------------------------------

    return {
        "source": "unknown",
        "source_type": "unknown",
        "domain": "unknown",
    }


# ============================================================
# JSON TEXT EXTRACTION
# ============================================================

def json_to_text(data: Any) -> str:
    """
    Convert arbitrary JSON content into readable text.

    This allows the RAG pipeline to work even if the JSON
    structures from USPSTF, Healthy People 2030, and USDA
    are not identical.
    """

    if isinstance(data, str):
        return data

    if isinstance(data, (int, float, bool)):
        return str(data)

    if data is None:
        return ""

    if isinstance(data, list):

        parts = []

        for item in data:
            text = json_to_text(item)

            if text.strip():
                parts.append(text)

        return "\n".join(parts)

    if isinstance(data, dict):

        parts = []

        for key, value in data.items():

            value_text = json_to_text(value)

            if not value_text.strip():
                continue

            readable_key = key.replace("_", " ").strip()

            parts.append(
                f"{readable_key}: {value_text}"
            )

        return "\n".join(parts)

    return str(data)


# ============================================================
# TOPIC EXTRACTION
# ============================================================

def extract_topic(
    data: dict[str, Any],
    file_path: Path,
) -> str:
    """
    Try to extract a useful topic from common JSON fields.
    Falls back to the filename.
    """

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

        if isinstance(value, str) and value.strip():
            return value.strip()

    return file_path.stem.replace("_", " ").strip()


# ============================================================
# DOCUMENT LOADING
# ============================================================

def load_json_documents() -> list[Document]:
    """
    Recursively load every JSON knowledge document under
    rag/documents/.
    """

    documents: list[Document] = []

    json_files = sorted(
        DOCUMENTS_DIR.rglob("*.json")
    )

    if not json_files:
        print(
            f"No JSON files found in: {DOCUMENTS_DIR}"
        )
        return documents

    for file_path in json_files:

        try:

            with file_path.open(
                "r",
                encoding="utf-8",
            ) as file:

                data = json.load(file)

            metadata = detect_source(file_path)

            topic = extract_topic(
                data,
                file_path,
            )

            text = json_to_text(data).strip()

            if not text:
                print(
                    f"Skipping empty document: {file_path}"
                )
                continue

            metadata.update(
                {
                    "topic": topic,
                    "document": file_path.name,
                    "document_path": str(
                        file_path.relative_to(
                            PROJECT_ROOT
                        )
                    ),
                    "source_url": (
                        data.get("source_url")
                        if isinstance(data, dict)
                        else None
                    ),
                }
            )

            documents.append(
                Document(
                    page_content=text,
                    metadata=metadata,
                )
            )

            print(
                f"Loaded: {file_path.relative_to(PROJECT_ROOT)}"
            )

        except json.JSONDecodeError as exc:

            print(
                f"Invalid JSON: {file_path} | {exc}"
            )

        except Exception as exc:

            print(
                f"Failed to load {file_path} | {exc}"
            )

    return documents


# ============================================================
# CHUNK DOCUMENTS
# ============================================================

def chunk_documents(
    documents: list[Document],
) -> list[Document]:
    """
    Split documents into overlapping chunks and add chunk
    metadata.
    """

    chunks: list[Document] = []

    for document in documents:

        split_chunks = text_splitter.split_documents(
            [document]
        )

        for index, chunk in enumerate(split_chunks):

            chunk.metadata = {
                **document.metadata,
                "chunk_id": (
                    f"{document.metadata['document']}"
                    f"__chunk_{index}"
                ),
                "chunk_index": index,
                "chunk_size": len(
                    chunk.page_content
                ),
            }

            chunks.append(chunk)

    return chunks


# ============================================================
# SAVE CHUNKS
# ============================================================

def save_chunks(
    chunks: list[Document],
) -> None:
    """
    Save all processed chunks into one JSON file.
    """

    CHUNKS_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    output = []

    for chunk in chunks:

        output.append(
            {
                "text": chunk.page_content,
                "metadata": chunk.metadata,
            }
        )

    with CHUNKS_FILE.open(
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            output,
            file,
            indent=2,
            ensure_ascii=False,
        )

    print()
    print(
        f"Saved {len(chunks)} chunks to:"
    )
    print(CHUNKS_FILE)


# ============================================================
# MAIN PIPELINE
# ============================================================

def main() -> None:

    print("=" * 60)
    print("RAG DOCUMENT CHUNKING")
    print("=" * 60)

    print()
    print(
        f"Documents directory: {DOCUMENTS_DIR}"
    )

    documents = load_json_documents()

    print()
    print(
        f"Documents loaded: {len(documents)}"
    )

    if not documents:
        return

    chunks = chunk_documents(
        documents
    )

    print()
    print(
        f"Chunks generated: {len(chunks)}"
    )

    save_chunks(chunks)

    print()
    print("Chunking completed successfully.")


if __name__ == "__main__":
    main()