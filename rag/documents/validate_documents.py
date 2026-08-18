from __future__ import annotations

import json
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DOCUMENTS_DIR = PROJECT_ROOT / "rag" / "documents"


SUPPORTED_SOURCES = {
    "uspstf",
    "healthy_people_2030",
    "usda",
}


def load_json(file_path: Path) -> Any:
    """Load and parse a JSON file."""

    with file_path.open(
        "r",
        encoding="utf-8",
    ) as file:
        return json.load(file)


def validate_json_structure(
    data: Any,
) -> list[str]:
    """
    Perform basic validation without assuming that every
    knowledge source has exactly the same JSON schema.
    """

    errors: list[str] = []

    if not isinstance(data, dict):
        errors.append(
            "Root JSON value must be an object."
        )
        return errors

    if not data:
        errors.append(
            "JSON object is empty."
        )

    return errors


def detect_source(
    file_path: Path,
) -> str:
    """Determine which knowledge source owns the file."""

    relative = file_path.relative_to(
        DOCUMENTS_DIR
    )

    parts = {
        part.lower()
        for part in relative.parts
    }

    if "uspstf" in parts:
        return "uspstf"

    if "healthy_people_2030" in parts:
        return "healthy_people_2030"

    if "usda" in parts:
        return "usda"

    return "unknown"


def validate_file(
    file_path: Path,
) -> tuple[bool, list[str]]:
    """Validate one JSON document."""

    errors: list[str] = []

    source = detect_source(file_path)

    if source == "unknown":
        errors.append(
            "File is outside a supported knowledge-source directory."
        )

    try:
        data = load_json(file_path)

    except json.JSONDecodeError as exc:
        errors.append(
            f"Invalid JSON: {exc}"
        )
        return False, errors

    except OSError as exc:
        errors.append(
            f"Could not read file: {exc}"
        )
        return False, errors

    errors.extend(
        validate_json_structure(data)
    )

    return not errors, errors


def validate_all_documents() -> bool:
    """Validate every JSON document recursively."""

    print("=" * 70)
    print("RAG KNOWLEDGE BASE VALIDATION")
    print("=" * 70)
    print()

    if not DOCUMENTS_DIR.exists():
        print(
            f"ERROR: Documents directory does not exist:"
        )
        print(DOCUMENTS_DIR)
        return False

    json_files = sorted(
        DOCUMENTS_DIR.rglob("*.json")
    )

    if not json_files:
        print(
            "WARNING: No JSON documents found."
        )
        return False

    valid_count = 0
    invalid_count = 0

    source_counts: dict[str, int] = {}

    for file_path in json_files:

        source = detect_source(file_path)

        source_counts[source] = (
            source_counts.get(source, 0) + 1
        )

        relative_path = file_path.relative_to(
            PROJECT_ROOT
        )

        is_valid, errors = validate_file(
            file_path
        )

        if is_valid:

            valid_count += 1

            print(
                f"[OK]    {relative_path}"
            )

        else:

            invalid_count += 1

            print(
                f"[ERROR] {relative_path}"
            )

            for error in errors:
                print(
                    f"        - {error}"
                )

    print()
    print("-" * 70)
    print("SUMMARY")
    print("-" * 70)

    print(
        f"Total JSON files : {len(json_files)}"
    )

    print(
        f"Valid documents  : {valid_count}"
    )

    print(
        f"Invalid documents: {invalid_count}"
    )

    print()
    print("Documents by source:")

    for source, count in sorted(
        source_counts.items()
    ):
        print(
            f"  {source}: {count}"
        )

    print()

    if invalid_count == 0:

        print(
            "VALIDATION PASSED"
        )

        return True

    print(
        "VALIDATION FAILED"
    )

    return False


if __name__ == "__main__":

    success = validate_all_documents()

    raise SystemExit(
        0 if success else 1
    )