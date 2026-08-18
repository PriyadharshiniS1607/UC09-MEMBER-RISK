from __future__ import annotations

import sys
from pathlib import Path
from typing import Any


# ============================================================
# PROJECT ROOT
# ============================================================

# rag_service.py
#     ↓
# backend/
#     ↓
# project root
#
# Path:
# UC09-MEMBER-RISK/
#     backend/
#     app/
#     services/
#     rag_service.py

PROJECT_ROOT = Path(__file__).resolve().parents[3]

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


# ============================================================
# RAG RECOMMENDATION SERVICE
# ============================================================

def get_member_recommendations(
    member_id: str,
) -> dict[str, Any]:
    """
    Generate intervention recommendations for one member.

    Workflow:

        Existing database
                |
                v
        Member + RiskPrediction + SHAP
                |
                v
        RAG context
                |
                v
        FAISS retrieval
                |
                v
        Gemini
                |
                v
        Validated recommendations

    This service does NOT:

        - upload CSV
        - run prediction
        - calculate SHAP
        - create a new prediction

    POST /predict is responsible for creating the prediction
    and SHAP information in the database.
    """

    member_id = member_id.strip()

    if not member_id:
        raise ValueError(
            "member_id is required."
        )

    # Import after PROJECT_ROOT has been added to sys.path.
    from rag.intervention.recommendation_generator import (
        generate_recommendations_for_member,
    )

    return generate_recommendations_for_member(
        member_id
    )