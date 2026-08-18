"""
Download USPSTF recommendation pages and convert them into JSON documents
for the RAG pipeline.

Project structure:

rag/
├── documents/
│   └── uspstf/
├── embeddings/
├── vectorstore/
├── retrieval/
├── prompts/
├── generation/
├── rag_pipeline.py
└── download_uspstf.py

Install:
    pip install requests beautifulsoup4

Run:
    python rag/download_uspstf.py

Or, if you are already inside the project root:
    python download_uspstf.py
"""

from __future__ import annotations

import json
import re
import time
from pathlib import Path
from typing import Optional

import requests
from bs4 import BeautifulSoup


# ============================================================
# CONFIGURATION
# ============================================================

BASE_URL = "https://www.uspreventiveservicestaskforce.org"

OUTPUT_DIR = (
    Path(__file__).resolve().parent
    / "documents"
    / "uspstf"
)

REQUEST_TIMEOUT = 30

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 "
        "(Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 "
        "(KHTML, like Gecko) "
        "Chrome/131.0 Safari/537.36"
    )
}


# ============================================================
# USPSTF RECOMMENDATION URLS
#
# These are the individual recommendation pages corresponding
# to the USPSTF A/B recommendations.
#
# You can add/remove URLs later without changing the scraper.
# ============================================================

USPSTF_URLS = [
    # --------------------------------------------------------
    # Cardiovascular / metabolic
    # --------------------------------------------------------

    "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/abdominal-aortic-aneurysm-screening",

    "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/hypertension-in-adults-screening",

    "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/statin-use-in-adults-preventive-medication",

    "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/screening-for-prediabetes-and-type-2-diabetes",

    "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/obesity-in-adults-interventions",

    # --------------------------------------------------------
    # Cancer
    # --------------------------------------------------------

    "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/breast-cancer-screening",

    "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/cervical-cancer-screening",

    "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/colorectal-cancer-screening",

    "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/lung-cancer-screening",

    "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/osteoporosis-screening",

    # --------------------------------------------------------
    # Mental health
    # --------------------------------------------------------

    "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/anxiety-adults-screening",

    "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/screening-anxiety-children-adolescents",

    "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/screening-depression-suicide-risk-adults",

    "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/screening-depression-suicide-risk-children-adolescents",

    # --------------------------------------------------------
    # Infectious diseases
    # --------------------------------------------------------

    "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/hepatitis-b-virus-infection-screening",

    "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/hepatitis-b-virus-infection-in-pregnant-women-screening",

    "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/hepatitis-c-screening",

    "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/human-immunodeficiency-virus-hiv-infection-screening",

    "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/latent-tuberculosis-infection-screening",

    # --------------------------------------------------------
    # Tobacco / substance use
    # --------------------------------------------------------

    "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/tobacco-use-in-adults-and-pregnant-women-counseling-and-interventions",

    "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/unhealthy-alcohol-use-in-adolescents-and-adults-screening-and-behavioral-counseling-interventions",

    "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/drug-use-illicit-screening",

    # --------------------------------------------------------
    # Other preventive care
    # --------------------------------------------------------

    "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/falls-prevention-community-dwelling-older-adults-interventions",

    "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/folic-acid-for-the-prevention-of-neural-tube-defects-preventive-medication",

    "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/healthy-diet-and-physical-activity-counseling-adults-with-high-risk-of-cvd",

    "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/perinatal-depression-preventive-interventions",

    "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/weight-loss-to-prevent-obesity-related-morbidity-and-mortality-in-adults-behavioral-interventions",

    "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/prevention-of-human-immunodeficiency-virus-hiv-infection-pre-exposure-prophylaxis",

    "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/vision-in-children-ages-6-months-to-5-years-screening",

    "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/skin-cancer-counseling",
]


# ============================================================
# UTILITY FUNCTIONS
# ============================================================


def clean_text(text: str) -> str:
    """
    Normalize whitespace while preserving readable text.
    """
    if not text:
        return ""

    text = text.replace("\xa0", " ")
    text = re.sub(r"\s+", " ", text)

    return text.strip()


def slugify(text: str) -> str:
    """
    Convert a title into a safe filename.
    """
    text = text.lower()

    text = re.sub(
        r"[^a-z0-9]+",
        "_",
        text,
    )

    text = text.strip("_")

    return text[:150]


def get_page(url: str) -> Optional[BeautifulSoup]:
    """
    Download a webpage and return BeautifulSoup.
    """

    print(f"\nDownloading:")
    print(url)

    try:
        response = requests.get(
            url,
            headers=HEADERS,
            timeout=REQUEST_TIMEOUT,
        )

        response.raise_for_status()

        print(
            f"  HTTP {response.status_code}"
        )

        return BeautifulSoup(
            response.text,
            "html.parser",
        )

    except requests.RequestException as exc:
        print(
            f"  ERROR downloading page: {exc}"
        )

        return None


# ============================================================
# EXTRACTION
# ============================================================


def extract_title(soup: BeautifulSoup) -> str:
    """
    Extract the recommendation title.
    """

    # Prefer H1.
    h1 = soup.find("h1")

    if h1:
        title = clean_text(
            h1.get_text(" ", strip=True)
        )

        if title:
            return title

    # Fallback to HTML title.
    if soup.title:
        return clean_text(
            soup.title.get_text(
                " ",
                strip=True,
            )
        )

    return "USPSTF Recommendation"


def extract_recommendation(
    soup: BeautifulSoup,
) -> str:
    """
    Try to extract the main USPSTF recommendation statement.

    The site structure can change over time, so several selectors
    are attempted.
    """

    # --------------------------------------------------------
    # Look for headings containing "Recommendation"
    # --------------------------------------------------------

    headings = soup.find_all(
        [
            "h2",
            "h3",
            "h4",
        ]
    )

    for heading in headings:

        heading_text = clean_text(
            heading.get_text(
                " ",
                strip=True,
            )
        ).lower()

        if "recommendation" not in heading_text:
            continue

        # Look at the following elements.
        current = heading.find_next()

        collected = []

        count = 0

        while current and count < 10:

            if current.name in {
                "h2",
                "h3",
                "h4",
            } and current is not heading:
                break

            if current.name == "p":

                text = clean_text(
                    current.get_text(
                        " ",
                        strip=True,
                    )
                )

                if text:
                    collected.append(text)

            current = current.find_next()

            count += 1

        if collected:
            return " ".join(collected)

    # --------------------------------------------------------
    # Look for common recommendation CSS classes.
    # --------------------------------------------------------

    possible_classes = [
        "recommendation",
        "recommendation-statement",
        "field--name-body",
    ]

    for class_name in possible_classes:

        elements = soup.select(
            f".{class_name}"
        )

        for element in elements:

            text = clean_text(
                element.get_text(
                    " ",
                    strip=True,
                )
            )

            if (
                text
                and "USPSTF" in text
            ):
                return text

    # --------------------------------------------------------
    # Fallback:
    # Find paragraphs beginning with USPSTF.
    # --------------------------------------------------------

    paragraphs = soup.find_all("p")

    for paragraph in paragraphs:

        text = clean_text(
            paragraph.get_text(
                " ",
                strip=True,
            )
        )

        if text.startswith(
            "The USPSTF"
        ):
            return text

    return ""


def extract_grade(
    soup: BeautifulSoup,
) -> Optional[str]:
    """
    Extract recommendation grade A/B/C/D/I.
    """

    # --------------------------------------------------------
    # Look for explicit grade text.
    # --------------------------------------------------------

    page_text = clean_text(
        soup.get_text(
            " ",
            strip=True,
        )
    )

    patterns = [
        r"Grade\s*[:\-]?\s*([ABCDI])\b",
        r"grade\s+([ABCDI])\b",
        r"Recommendation\s+Grade\s*[:\-]?\s*([ABCDI])\b",
    ]

    for pattern in patterns:

        match = re.search(
            pattern,
            page_text,
            flags=re.IGNORECASE,
        )

        if match:
            return match.group(1).upper()

    # --------------------------------------------------------
    # Search tables.
    # --------------------------------------------------------

    for table in soup.find_all("table"):

        text = clean_text(
            table.get_text(
                " ",
                strip=True,
            )
        )

        match = re.search(
            r"\bGrade\s*[:\-]?\s*([ABCDI])\b",
            text,
            flags=re.IGNORECASE,
        )

        if match:
            return match.group(1).upper()

    return None


def extract_release_date(
    soup: BeautifulSoup,
) -> Optional[str]:
    """
    Extract the current recommendation release date.
    """

    page_text = clean_text(
        soup.get_text(
            " ",
            strip=True,
        )
    )

    patterns = [
        r"Release Date(?: of Current Recommendation)?\s*[:\-]?\s*([A-Za-z]+\s+\d{4})",
        r"Date of Current Recommendation\s*[:\-]?\s*([A-Za-z]+\s+\d{4})",
        r"Published\s*[:\-]?\s*([A-Za-z]+\s+\d{1,2},\s+\d{4})",
    ]

    for pattern in patterns:

        match = re.search(
            pattern,
            page_text,
            flags=re.IGNORECASE,
        )

        if match:
            return clean_text(
                match.group(1)
            )

    # --------------------------------------------------------
    # Look for metadata.
    # --------------------------------------------------------

    meta_names = [
        "date",
        "article:published_time",
        "publish_date",
    ]

    for meta_name in meta_names:

        meta = soup.find(
            "meta",
            attrs={
                "name": meta_name
            },
        )

        if meta and meta.get("content"):
            return clean_text(
                meta["content"]
            )

    return None


def extract_population(
    title: str,
) -> Optional[str]:
    """
    Many USPSTF A/B recommendation titles contain the target
    population after the final colon.

    Example:

        Breast Cancer: Screening: women aged 40 to 74 years

    This function extracts:

        women aged 40 to 74 years
    """

    parts = [
        part.strip()
        for part in title.split(":")
        if part.strip()
    ]

    if len(parts) >= 3:
        return parts[-1]

    return None


# ============================================================
# DOCUMENT CREATION
# ============================================================


def create_document(
    soup: BeautifulSoup,
    url: str,
) -> dict:
    """
    Create the JSON structure used by the RAG documents.
    """

    title = extract_title(soup)

    recommendation = extract_recommendation(
        soup
    )

    grade = extract_grade(soup)

    release_date = extract_release_date(
        soup
    )

    population = extract_population(
        title
    )

    document = {
        "source": "USPSTF",
        "source_type": "clinical_preventive_recommendation",
        "title": title,
        "population": population,
        "recommendation": recommendation,
        "grade": grade,
        "release_date": release_date,
        "source_url": url,
    }

    return document


# ============================================================
# SAVE
# ============================================================


def save_document(
    document: dict,
) -> Path:
    """
    Save a recommendation as JSON.
    """

    title = document.get(
        "title",
        "uspstf_recommendation",
    )

    filename = (
        slugify(title)
        + ".json"
    )

    output_path = (
        OUTPUT_DIR
        / filename
    )

    with open(
        output_path,
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            document,
            file,
            indent=2,
            ensure_ascii=False,
        )

    return output_path


# ============================================================
# MAIN
# ============================================================


def main() -> None:

    print("=" * 70)
    print("USPSTF RAG DOCUMENT DOWNLOADER")
    print("=" * 70)

    # Create output directory.
    OUTPUT_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    print(
        f"\nOutput directory:"
        f"\n{OUTPUT_DIR}"
    )

    print(
        f"\nURLs to process:"
        f" {len(USPSTF_URLS)}"
    )

    successful = 0
    failed = 0

    for index, url in enumerate(
        USPSTF_URLS,
        start=1,
    ):

        print("\n" + "-" * 70)

        print(
            f"[{index}/{len(USPSTF_URLS)}]"
        )

        soup = get_page(url)

        if soup is None:

            failed += 1

            continue

        try:

            document = create_document(
                soup,
                url,
            )

            output_path = save_document(
                document
            )

            successful += 1

            print(
                f"  Title: "
                f"{document['title']}"
            )

            print(
                f"  Grade: "
                f"{document['grade']}"
            )

            print(
                f"  Release date: "
                f"{document['release_date']}"
            )

            print(
                f"  Saved: "
                f"{output_path.name}"
            )

        except Exception as exc:

            failed += 1

            print(
                f"  ERROR processing page: "
                f"{exc}"
            )

        # Small delay between requests.
        time.sleep(1)

    print("\n" + "=" * 70)
    print("DOWNLOAD COMPLETE")
    print("=" * 70)

    print(
        f"Successful: {successful}"
    )

    print(
        f"Failed:     {failed}"
    )

    print(
        f"Documents:  {OUTPUT_DIR}"
    )


if __name__ == "__main__":
    main()

