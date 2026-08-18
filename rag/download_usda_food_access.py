import json
import re
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup


# ------------------------------------------------------------
# Paths
# ------------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent

OUTPUT_DIR = (
    BASE_DIR
    / "documents"
    / "sdoh"
    / "usda"
    / "food_access"
)


# ------------------------------------------------------------
# Configuration
# ------------------------------------------------------------

HEADERS = {
    "User-Agent": (
        "UC09-MEMBER-RISK-RAG/1.0 "
        "(research knowledge-base collection)"
    )
}


USDA_SOURCES = [
    {
        "name": "Food Access Research Atlas Overview",
        "type": "overview",
        "url": (
            "https://www.ers.usda.gov/"
            "data-products/food-access-research-atlas"
        ),
    },
    {
        "name": "Food Access Research Atlas Documentation",
        "type": "documentation",
        "url": (
            "https://www.ers.usda.gov/"
            "data-products/food-access-research-atlas/"
            "documentation"
        ),
    },
    {
        "name": "Large Retailer Access Map Reference Guide",
        "type": "definitions",
        "url": (
            "https://www.ers.usda.gov/"
            "data-products/food-access-research-atlas/"
            "documentation/"
            "large-retailer-access-map-reference-guide"
        ),
    },
    {
        "name": (
            "SNAP-authorized Retailer Access Map "
            "Reference Guide"
        ),
        "type": "sram_definitions",
        "url": (
            "https://www.ers.usda.gov/"
            "data-products/food-access-research-atlas/"
            "documentation/"
            "snap-authorized-retailer-access-map-reference-guide"
        ),
    },
    {
        "name": (
            "Large Retailer Access Map "
            "Data Sources and Technical Methods"
        ),
        "type": "methodology",
        "url": (
            "https://www.ers.usda.gov/"
            "data-products/food-access-research-atlas/"
            "documentation/"
            "large-retailer-access-map-data-sources-and-"
            "technical-methods"
        ),
    },
]


# ------------------------------------------------------------
# Text utilities
# ------------------------------------------------------------

def clean_text(text: str) -> str:
    """
    Normalize whitespace while preserving readable text.
    """
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def extract_page(url: str) -> dict:
    """
    Download a USDA page and extract useful textual content.
    """

    response = requests.get(
        url,
        headers=HEADERS,
        timeout=60,
    )

    response.raise_for_status()

    soup = BeautifulSoup(
        response.text,
        "html.parser",
    )

    # Remove navigation and non-content elements.
    for element in soup.find_all(
        [
            "script",
            "style",
            "noscript",
            "nav",
            "footer",
            "header",
            "form",
        ]
    ):
        element.decompose()

    # Page title.
    title = ""

    h1 = soup.find("h1")

    if h1:
        title = clean_text(
            h1.get_text(" ", strip=True)
        )

    elif soup.title:
        title = clean_text(
            soup.title.get_text(" ", strip=True)
        )

    # Prefer main/article content.
    main = (
        soup.find("main")
        or soup.find("article")
        or soup.body
    )

    if main is None:
        raise ValueError(
            f"Could not identify page content: {url}"
        )

    sections = []

    for element in main.find_all(
        [
            "h2",
            "h3",
            "h4",
            "p",
            "li",
        ]
    ):
        text = clean_text(
            element.get_text(
                " ",
                strip=True,
            )
        )

        if text:
            sections.append(text)

    content = "\n\n".join(sections)

    return {
        "title": title,
        "content": content,
    }


# ------------------------------------------------------------
# Save JSON
# ------------------------------------------------------------

def save_json(
    filename: str,
    document: dict,
):
    OUTPUT_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    output_file = OUTPUT_DIR / filename

    with output_file.open(
        "w",
        encoding="utf-8",
    ) as file:
        json.dump(
            document,
            file,
            indent=2,
            ensure_ascii=False,
        )

    print(
        f"Saved: {output_file}"
    )


# ------------------------------------------------------------
# Main extraction
# ------------------------------------------------------------

def main():

    print("=" * 70)
    print("USDA FOOD ACCESS KNOWLEDGE EXTRACTION")
    print("=" * 70)

    OUTPUT_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    extracted = []

    for source in USDA_SOURCES:

        print()
        print(
            f"Downloading: {source['name']}"
        )

        try:

            page = extract_page(
                source["url"]
            )

            document = {
                "source": (
                    "USDA Economic Research Service"
                ),
                "dataset": (
                    "Food Access Research Atlas"
                ),
                "document_type": (
                    "sdoh_food_access"
                ),
                "category": source["type"],
                "title": page["title"],
                "content": page["content"],
                "source_url": source["url"],
            }

            extracted.append(document)

            print("SUCCESS")

        except Exception as exc:

            print(
                f"FAILED: {exc}"
            )

        time.sleep(1)

    # --------------------------------------------------------
    # Save individual documents
    # --------------------------------------------------------

    filename_map = {
        "overview": "overview.json",
        "documentation": "definitions.json",
        "definitions": "indicators.json",
        "sram_definitions": (
            "sram_definitions.json"
        ),
        "methodology": "methodology.json",
    }

    for document in extracted:

        filename = filename_map.get(
            document["category"]
        )

        if filename is None:
            continue

        save_json(
            filename,
            document,
        )

    # --------------------------------------------------------
    # Save combined knowledge document
    # --------------------------------------------------------

    combined = {
        "source": (
            "USDA Economic Research Service"
        ),
        "dataset": (
            "Food Access Research Atlas"
        ),
        "document_type": (
            "sdoh_food_access_collection"
        ),
        "documents": extracted,
    }

    save_json(
        "usda_food_access_knowledge_base.json",
        combined,
    )

    print()
    print("=" * 70)
    print(
        f"Documents extracted: "
        f"{len(extracted)}"
    )

    print(
        f"Output directory: "
        f"{OUTPUT_DIR}"
    )

    print("=" * 70)


if __name__ == "__main__":
    main()