import json
import re
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup


BASE_DIR = (
    Path(__file__).resolve().parent
)

OUTPUT_DIR = (
    BASE_DIR
    / "documents"
    / "sdoh"
    / "healthy_people_2030"
)


HEADERS = {
    "User-Agent": (
        "UC09-MEMBER-RISK-RAG/1.0 "
        "(research knowledge-base collection)"
    )
}


SDOH_PAGES = [
    {
        "domain": "economic_stability",
        "topic": "poverty",
        "url": (
            "https://odphp.health.gov/"
            "healthypeople/priority-areas/"
            "social-determinants-health/"
            "literature-summaries/poverty"
        ),
    },
    {
        "domain": "economic_stability",
        "topic": "employment",
        "url": (
            "https://odphp.health.gov/"
            "healthypeople/priority-areas/"
            "social-determinants-health/"
            "literature-summaries/employment"
        ),
    },
    {
        "domain": "economic_stability",
        "topic": "food_insecurity",
        "url": (
            "https://odphp.health.gov/"
            "healthypeople/priority-areas/"
            "social-determinants-health/"
            "literature-summaries/food-insecurity"
        ),
    },
    {
        "domain": "economic_stability",
        "topic": "housing_instability",
        "url": (
            "https://odphp.health.gov/"
            "healthypeople/priority-areas/"
            "social-determinants-health/"
            "literature-summaries/housing-instability"
        ),
    },
    {
        "domain": "education_access",
        "topic": "language_and_literacy",
        "url": (
            "https://odphp.health.gov/"
            "healthypeople/priority-areas/"
            "social-determinants-health/"
            "literature-summaries/"
            "language-and-literacy"
        ),
    },
    {
        "domain": "health_care_access",
        "topic": "access_to_health_services",
        "url": (
            "https://odphp.health.gov/"
            "healthypeople/priority-areas/"
            "social-determinants-health/"
            "literature-summaries/"
            "access-health-services"
        ),
    },
    {
        "domain": "health_care_access",
        "topic": "access_to_primary_care",
        "url": (
            "https://odphp.health.gov/"
            "healthypeople/priority-areas/"
            "social-determinants-health/"
            "literature-summaries/"
            "access-primary-care"
        ),
    },
    {
        "domain": "health_care_access",
        "topic": "health_literacy",
        "url": (
            "https://odphp.health.gov/"
            "healthypeople/priority-areas/"
            "social-determinants-health/"
            "literature-summaries/"
            "health-literacy"
        ),
    },
    {
        "domain": "neighborhood_built_environment",
        "topic": "food_access",
        "url": (
            "https://odphp.health.gov/"
            "healthypeople/priority-areas/"
            "social-determinants-health/"
            "literature-summaries/"
            "access-foods-support-healthy-dietary-patterns"
        ),
    },
    {
        "domain": "neighborhood_built_environment",
        "topic": "quality_of_housing",
        "url": (
            "https://odphp.health.gov/"
            "healthypeople/priority-areas/"
            "social-determinants-health/"
            "literature-summaries/"
            "quality-housing"
        ),
    },
    {
        "domain": "neighborhood_built_environment",
        "topic": "environmental_conditions",
        "url": (
            "https://odphp.health.gov/"
            "healthypeople/priority-areas/"
            "social-determinants-health/"
            "literature-summaries/"
            "environmental-conditions"
        ),
    },
    {
        "domain": "social_community_context",
        "topic": "civic_participation",
        "url": (
            "https://odphp.health.gov/"
            "healthypeople/priority-areas/"
            "social-determinants-health/"
            "literature-summaries/"
            "civic-participation"
        ),
    },
    {
        "domain": "social_community_context",
        "topic": "social_cohesion",
        "url": (
            "https://odphp.health.gov/"
            "healthypeople/priority-areas/"
            "social-determinants-health/"
            "literature-summaries/"
            "social-cohesion"
        ),
    },
]


def clean_text(text: str) -> str:
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def extract_page(url: str) -> dict:
    response = requests.get(
        url,
        headers=HEADERS,
        timeout=30,
    )

    response.raise_for_status()

    soup = BeautifulSoup(
        response.text,
        "html.parser",
    )

    # Remove elements that are not useful for RAG.
    for element in soup(
        [
            "script",
            "style",
            "noscript",
            "nav",
            "footer",
            "header",
        ]
    ):
        element.decompose()

    title = ""

    if soup.find("h1"):
        title = clean_text(
            soup.find("h1").get_text(" ", strip=True)
        )

    if not title and soup.title:
        title = clean_text(
            soup.title.get_text(" ", strip=True)
        )

    main_content = (
        soup.find("main")
        or soup.find("article")
        or soup.body
    )

    if main_content is None:
        raise ValueError(
            f"Could not find page content: {url}"
        )

    paragraphs = []

    for element in main_content.find_all(
        ["h2", "h3", "p", "li"]
    ):
        text = clean_text(
            element.get_text(" ", strip=True)
        )

        if text:
            paragraphs.append(text)

    content = "\n\n".join(
        paragraphs
    )

    return {
        "title": title,
        "content": content,
        "source_url": url,
    }


def save_document(
    document: dict,
    domain: str,
    topic: str,
):
    output_dir = (
        OUTPUT_DIR / domain
    )

    output_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    output_file = (
        output_dir / f"{topic}.json"
    )

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


def main():
    print(
        "Starting Healthy People 2030 "
        "SDOH knowledge-base collection..."
    )

    success = 0
    failed = 0

    for item in SDOH_PAGES:

        print(
            f"\nDownloading: "
            f"{item['topic']}"
        )

        try:
            page = extract_page(
                item["url"]
            )

            document = {
                "source": "Healthy People 2030",
                "document_type": "sdoh",
                "domain": item["domain"],
                "topic": item["topic"],
                "title": page["title"],
                "content": page["content"],
                "source_url": page["source_url"],
            }

            save_document(
                document=document,
                domain=item["domain"],
                topic=item["topic"],
            )

            success += 1

        except Exception as exc:
            failed += 1

            print(
                f"FAILED: {item['topic']}"
            )

            print(
                f"Reason: {exc}"
            )

        # Be polite to the source.
        time.sleep(1)

    print("\n" + "=" * 60)

    print(
        "Healthy People 2030 collection complete."
    )

    print(
        f"Successful: {success}"
    )

    print(
        f"Failed: {failed}"
    )

    print(
        f"Output directory: {OUTPUT_DIR}"
    )


if __name__ == "__main__":
    main()