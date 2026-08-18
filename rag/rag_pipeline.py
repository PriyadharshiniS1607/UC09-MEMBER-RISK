
from __future__ import annotations

import sys
from pathlib import Path
from typing import Any


# ============================================================
# PROJECT PATHS
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = PROJECT_ROOT / "backend"


# ============================================================
# MAKE PROJECT MODULES IMPORTABLE
# ============================================================

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


# ============================================================
# BACKEND DATABASE
# ============================================================

# pyrefly: ignore [missing-import]
from app.database.connection import SessionLocal
# pyrefly: ignore [missing-import]
from app.database.models import (
    Member,
    RiskPrediction,
    ShapExplanation,
)


# ============================================================
# RAG COMPONENTS
# ============================================================

from rag.intervention.context_builder import (
    build_rag_context,
)

from rag.intervention.intervention_retriever import (
    retrieve_intervention_evidence,
)

from rag.intervention.recommendation_generator import (
    generate_recommendations,
)


# ============================================================
# LOAD MEMBER DATA
# ============================================================

def load_member_context(
    db,
    member_id: str | None = None,
) -> tuple[Any, Any, Any]:
    """
    Load:

        Member
        Latest RiskPrediction
        Latest ShapExplanation

    from the backend database.
    """

    # --------------------------------------------------------
    # MEMBER
    # --------------------------------------------------------

    query = db.query(Member)

    if member_id:
        member = (
            query
            .filter(
                Member.member_id == member_id
            )
            .first()
        )
    else:
        member = (
            query
            .order_by(Member.id)
            .first()
        )

    if member is None:
        raise RuntimeError(
            "No member record found."
        )

    # --------------------------------------------------------
    # LATEST RISK PREDICTION
    # --------------------------------------------------------

    prediction = (
        db.query(RiskPrediction)
        .filter(
            RiskPrediction.member_id
            == member.id
        )
        .order_by(
            RiskPrediction.created_at.desc()
        )
        .first()
    )

    if prediction is None:
        raise RuntimeError(
            f"No risk prediction found "
            f"for member {member.member_id}."
        )

    # --------------------------------------------------------
    # LATEST SHAP EXPLANATION
    # --------------------------------------------------------

    shap = (
        db.query(ShapExplanation)
        .filter(
            ShapExplanation.prediction_id
            == prediction.id
        )
        .order_by(
            ShapExplanation.created_at.desc()
        )
        .first()
    )

    if shap is None:
        raise RuntimeError(
            f"No SHAP explanation found "
            f"for prediction {prediction.id}."
        )

    return member, prediction, shap


# ============================================================
# BUILD MEMBER RAG CONTEXT
# ============================================================

def build_member_context(
    member: Any,
    prediction: Any,
    shap: Any,
) -> dict[str, Any]:
    """
    Convert backend database objects into the structured
    member-specific context used by the RAG pipeline.
    """

    return build_rag_context(
        member=member,
        risk_prediction=prediction,
        shap_explanation=shap,
    )


# ============================================================
# RETRIEVE INTERVENTION EVIDENCE
# ============================================================

def retrieve_evidence(
    context: dict[str, Any],
    top_k_per_query: int = 3,
) -> dict[str, Any]:
    """
    Run SHAP driver mapping and FAISS evidence retrieval.
    """

    return retrieve_intervention_evidence(
        context=context,
        top_k_per_query=top_k_per_query,
    )


# ============================================================
# GENERATE LLM RECOMMENDATIONS
# ============================================================

def generate_intervention_recommendations(
    retrieval_result: dict[str, Any],
) -> dict[str, Any]:
    """
    Send the complete retrieval context to the OpenRouter
    LLM recommendation generator.
    """

    return generate_recommendations(
        retrieval_result
    )


# ============================================================
# COMPLETE END-TO-END PIPELINE
# ============================================================

def run_rag_pipeline(
    member_id: str | None = None,
    top_k_per_query: int = 3,
) -> dict[str, Any]:
    """
    Execute the complete UC09 Member Risk RAG pipeline.

    Flow:

        Backend Database
                ↓
        Member + Risk + SHAP
                ↓
        Context Builder
                ↓
        Driver Mapper
                ↓
        FAISS Retrieval
                ↓
        Retrieved Evidence
                ↓
        OpenRouter LLM
                ↓
        Validated Recommendations
    """

    db = SessionLocal()

    try:

        # ====================================================
        # STEP 1 — LOAD DATABASE CONTEXT
        # ====================================================

        print()
        print(
            "Loading member context from backend database..."
        )

        member, prediction, shap = (
            load_member_context(
                db=db,
                member_id=member_id,
            )
        )

        print()
        print(
            "DATABASE CONTEXT LOADED"
        )

        print("-" * 80)

        print(
            f"Member ID: "
            f"{member.member_id}"
        )

        print(
            f"Risk score: "
            f"{prediction.risk_score}"
        )

        print(
            f"Risk category: "
            f"{prediction.risk_category}"
        )

        print(
            f"Prediction ID: "
            f"{prediction.id}"
        )

        # ====================================================
        # STEP 2 — BUILD RAG CONTEXT
        # ====================================================

        print()
        print(
            "Building member-specific RAG context..."
        )

        context = build_member_context(
            member=member,
            prediction=prediction,
            shap=shap,
        )

        print(
            "RAG CONTEXT BUILT"
        )

        # ====================================================
        # STEP 3 — FAISS RETRIEVAL
        # ====================================================

        print()
        print(
            "Running intervention-specific FAISS retrieval..."
        )

        retrieval_result = retrieve_evidence(
            context=context,
            top_k_per_query=top_k_per_query,
        )

        print()
        print(
            "RETRIEVAL COMPLETED"
        )

        print("-" * 80)

        for intervention in retrieval_result.get(
            "interventions",
            [],
        ):

            print(
                f"{intervention.get('feature')} "
                f"| "
                f"{intervention.get('concept')} "
                f"| "
                f"evidence="
                f"{len(intervention.get('evidence', []))}"
            )

        # ====================================================
        # STEP 4 — OPENROUTER LLM
        # ====================================================

        print()
        print(
            "Calling OpenRouter LLM..."
        )

        llm_result = (
            generate_intervention_recommendations(
                retrieval_result
            )
        )

        # ====================================================
        # STEP 5 — FINAL RESULT
        # ====================================================

        recommendation_result = (
            llm_result.get(
                "recommendation_result",
                {},
            )
        )

        return {
            "member": retrieval_result.get(
                "member",
                {},
            ),

            "risk": retrieval_result.get(
                "risk",
                {},
            ),

            "shap": retrieval_result.get(
                "shap",
                {},
            ),

            "mapped_drivers": retrieval_result.get(
                "mapped_drivers",
                [],
            ),

            "interventions": retrieval_result.get(
                "interventions",
                [],
            ),

            "recommendation_result":
                recommendation_result,

            "raw_llm_response":
                llm_result.get(
                    "raw_llm_response",
                    "",
                ),
        }

    finally:

        db.close()


# ============================================================
# DISPLAY RESULT
# ============================================================

def print_pipeline_result(
    result: dict[str, Any],
) -> None:

    print()
    print("=" * 80)
    print(
        "LLM INTERVENTION RECOMMENDATIONS"
    )
    print("=" * 80)

    # --------------------------------------------------------
    # MEMBER
    # --------------------------------------------------------

    member = result.get(
        "member",
        {},
    )

    print()
    print("MEMBER")
    print("-" * 80)

    print(
        f"Member ID: "
        f"{member.get('member_id')}"
    )

    print(
        f"Age: "
        f"{member.get('age')}"
    )

    print(
        f"Gender: "
        f"{member.get('gender')}"
    )

    # --------------------------------------------------------
    # RISK
    # --------------------------------------------------------

    risk = result.get(
        "risk",
        {},
    )

    print()
    print("RISK SUMMARY")
    print("-" * 80)

    print(
        f"Risk score: "
        f"{risk.get('risk_score')}"
    )

    print(
        f"Risk category: "
        f"{risk.get('risk_category')}"
    )

    print(
        f"Model version: "
        f"{risk.get('model_version')}"
    )

    print(
        f"Prediction ID: "
        f"{risk.get('prediction_id')}"
    )

    # --------------------------------------------------------
    # MAPPED DRIVERS
    # --------------------------------------------------------

    print()
    print("MAPPED INTERVENTION DRIVERS")
    print("-" * 80)

    mapped_drivers = result.get(
        "mapped_drivers",
        [],
    )

    for driver in mapped_drivers:

        print(
            f"{driver.get('feature')} "
            f"| "
            f"{driver.get('concept')} "
            f"| "
            f"impact="
            f"{driver.get('impact'):.4f}"
        )

    # --------------------------------------------------------
    # RETRIEVAL
    # --------------------------------------------------------

    print()
    print("RETRIEVED EVIDENCE")
    print("-" * 80)

    for intervention in result.get(
        "interventions",
        [],
    ):

        print()

        print(
            f"Feature: "
            f"{intervention.get('feature')}"
        )

        print(
            f"Concept: "
            f"{intervention.get('concept')}"
        )

        print(
            f"Evidence chunks: "
            f"{len(intervention.get('evidence', []))}"
        )

    # --------------------------------------------------------
    # RECOMMENDATIONS
    # --------------------------------------------------------

    recommendation_result = result.get(
        "recommendation_result",
        {},
    )

    print()
    print("RECOMMENDATIONS")
    print("-" * 80)

    summary = recommendation_result.get(
        "risk_summary",
        {},
    )

    if summary:

        print(
            f"Summary: "
            f"{summary.get('summary')}"
        )

    recommendations = (
        recommendation_result.get(
            "recommendations",
            [],
        )
    )

    if not recommendations:

        print()
        print(
            "No recommendations generated."
        )

    for index, recommendation in enumerate(
        recommendations,
        start=1,
    ):

        print()

        print(
            f"Recommendation #{index}"
        )

        print(
            f"Priority: "
            f"{recommendation.get('priority')}"
        )

        print(
            f"Feature: "
            f"{recommendation.get('feature')}"
        )

        print(
            f"Concept: "
            f"{recommendation.get('concept')}"
        )

        print(
            f"Rationale: "
            f"{recommendation.get('rationale')}"
        )

        print(
            f"Recommended action: "
            f"{recommendation.get('recommended_action')}"
        )

        print(
            f"Evidence basis: "
            f"{recommendation.get('evidence_basis')}"
        )

        sources = (
            recommendation.get(
                "evidence_sources",
                [],
            )
        )

        if sources:

            print()
            print(
                "Evidence sources:"
            )

            for source in sources:

                print(
                    f"  - "
                    f"{source.get('source')} "
                    f"| "
                    f"{source.get('topic')} "
                    f"| "
                    f"score={source.get('score')}"
                )

    # --------------------------------------------------------
    # RAW RESPONSE
    # --------------------------------------------------------

    print()
    print("=" * 80)
    print("RAW LLM JSON")
    print("=" * 80)

    print(
        result.get(
            "raw_llm_response",
            "",
        )
    )

    print()
    print("=" * 80)
    print(
        "END-TO-END RAG PIPELINE COMPLETED"
    )
    print("=" * 80)


# ============================================================
# MAIN
# ============================================================

def main() -> None:

    print("=" * 80)
    print(
        "UC09 MEMBER RISK — END-TO-END RAG PIPELINE TEST"
    )
    print("=" * 80)

    result = run_rag_pipeline(
        member_id=None,
        top_k_per_query=3,
    )

    print_pipeline_result(
        result
    )


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":
    main()

