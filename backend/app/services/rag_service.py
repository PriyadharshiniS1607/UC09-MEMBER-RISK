from __future__ import annotations

from typing import Any


# ============================================================
# RAG RECOMMENDATION SERVICE
# ============================================================

def get_member_recommendations(
    member_id: str,
) -> dict[str, Any]:
    """
    Get or generate member intervention recommendations.

    Workflow:

        API
         |
         v
        RAG Service
         |
         v
        Intervention Service
         |
         +----------------------+
         |                      |
         v                      v
    Existing DB             New intervention
         |                      |
         v                      v
    Return result          Run RAG/Gemini
                                |
                                v
                         Save Intervention
                                |
                                v
                              Commit
                                |
                                v
                          Send email
                                |
                                v
                         Return result

    Existing interventions are returned directly and do not
    trigger another RAG generation or email.
    """

    member_id = member_id.strip()

    if not member_id:
        raise ValueError(
            "member_id is required."
        )

    # --------------------------------------------------------
    # Import here to avoid unnecessary import/circular issues.
    # --------------------------------------------------------

    from app.services.intervention_service import (
        get_or_generate_recommendations,
    )

    intervention_result = (
        get_or_generate_recommendations(
            member_id
        )
    )

    # --------------------------------------------------------
    # Keep the response format expected by
    # recommendation.py
    #
    # recommendation.py currently expects:
    #
    # {
    #     "recommendation_result": {...}
    # }
    # --------------------------------------------------------

    return {
        "recommendation_result": intervention_result,
    }