
from __future__ import annotations

import sys
from pathlib import Path
from typing import Any


# ============================================================
# PROJECT PATH
# ============================================================

# File:
#   UC09-MEMBER-RISK/
#       rag/
#           intervention/
#               intervention_retriever.py
#
# parents[0] = intervention
# parents[1] = rag
# parents[2] = UC09-MEMBER-RISK
#
PROJECT_ROOT = Path(__file__).resolve().parents[2]

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


# ============================================================
# RAG IMPORTS
# ============================================================

from rag.retrieval.faiss_retriever import (
    load_faiss_index,
    load_model,
    load_records,
    retrieve,
)

from rag.intervention.driver_mapper import (
    map_intervention_drivers,
)


# ============================================================
# CONFIGURATION
# ============================================================

DEFAULT_TOP_K_PER_QUERY = 3


# ============================================================
# RETRIEVE INTERVENTION EVIDENCE
# ============================================================

def retrieve_intervention_evidence(
    context: dict[str, Any],
    top_k_per_query: int = DEFAULT_TOP_K_PER_QUERY,
) -> dict[str, Any]:
    """
    Retrieve evidence for member-specific intervention drivers.

    Pipeline:

        Member DB context
                |
                v
        Risk prediction
                |
                v
        Top SHAP drivers
                |
                v
        Driver mapper
                |
                v
        Intervention concepts
                |
                v
        Retrieval queries
                |
                v
             FAISS
                |
                v
        Supporting evidence

    IMPORTANT:

    The RAG system does not independently determine risk.

    Risk score, risk category, member information, and SHAP
    drivers come from the backend/ML system.

    FAISS is used only to retrieve evidence that supports
    the intervention recommendation.
    """

    # ========================================================
    # 1. MAP SHAP DRIVERS
    # ========================================================

    mapped_drivers = map_intervention_drivers(
        context
    )

    if not mapped_drivers:

        return {
            "member": context.get(
                "member",
                {},
            ),
            "risk": context.get(
                "risk",
                {},
            ),
            "shap": context.get(
                "shap",
                {},
            ),
            "mapped_drivers": [],
            "interventions": [],
        }

    # ========================================================
    # 2. LOAD FAISS RESOURCES
    # ========================================================

    records = load_records()

    index = load_faiss_index()

    model = load_model()

    # ========================================================
    # 3. RETRIEVE EVIDENCE FOR EACH DRIVER
    # ========================================================

    interventions = []

    for driver in mapped_drivers:

        feature = driver.get(
            "feature"
        )

        queries = driver.get(
            "retrieval_queries",
            [],
        )

        evidence = []

        # ----------------------------------------------------
        # Execute all retrieval queries associated with
        # this intervention concept.
        # ----------------------------------------------------

        for query in queries:

            if not query:
                continue

            results = retrieve(
                query=query,
                model=model,
                index=index,
                records=records,
                top_k=top_k_per_query,
            )

            for result in results:

                evidence.append(
                    {
                        "query": query,
                        "rank": result.get(
                            "rank"
                        ),
                        "score": result.get(
                            "score"
                        ),
                        "text": result.get(
                            "text",
                            "",
                        ),
                        "metadata": result.get(
                            "metadata",
                            {},
                        ),
                    }
                )

        # ====================================================
        # 4. DEDUPLICATE RETRIEVED CHUNKS
        # ====================================================

        unique_evidence = []

        seen = set()

        for item in evidence:

            metadata = item.get(
                "metadata",
                {},
            )

            chunk_id = metadata.get(
                "chunk_id"
            )

            document = metadata.get(
                "document"
            )

            # Prefer a stable document/chunk identifier.
            if chunk_id:

                key = (
                    document,
                    chunk_id,
                )

            else:

                key = item.get(
                    "text",
                    "",
                )

            if key in seen:
                continue

            seen.add(key)

            unique_evidence.append(
                item
            )

        # ====================================================
        # 5. SORT BY RETRIEVAL SCORE
        # ====================================================

        unique_evidence.sort(
            key=lambda item: (
                item.get(
                    "score",
                    0.0,
                )
            ),
            reverse=True,
        )

        # ====================================================
        # 6. KEEP DRIVER + EVIDENCE TOGETHER
        # ====================================================

        interventions.append(
            {
                "feature": feature,

                "value": driver.get(
                    "value"
                ),

                "shap_value": driver.get(
                    "shap_value"
                ),

                "impact": driver.get(
                    "impact"
                ),

                "direction": driver.get(
                    "direction"
                ),

                "domain": driver.get(
                    "domain"
                ),

                "concept": driver.get(
                    "concept"
                ),

                "retrieval_queries": queries,

                "evidence": unique_evidence,
            }
        )

    # ========================================================
    # 7. RETURN COMPLETE RAG RETRIEVAL CONTEXT
    # ========================================================

    return {
        # Member information
        "member": context.get(
            "member",
            {},
        ),

        # Risk score/category/model
        "risk": context.get(
            "risk",
            {},
        ),

        # Complete SHAP information
        "shap": context.get(
            "shap",
            {},
        ),

        # Driver -> intervention mappings
        "mapped_drivers": mapped_drivers,

        # Driver -> retrieved evidence
        "interventions": interventions,
    }


# ============================================================
# DISPLAY RESULTS
# ============================================================

def print_intervention_evidence(
    result: dict[str, Any],
) -> None:

    print()

    print("=" * 80)
    print("RAG INTERVENTION EVIDENCE")
    print("=" * 80)

    # ========================================================
    # MEMBER
    # ========================================================

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

    # ========================================================
    # RISK
    # ========================================================

    risk = result.get(
        "risk",
        {},
    )

    print()
    print("RISK")
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

    # ========================================================
    # SHAP DRIVERS
    # ========================================================

    shap = result.get(
        "shap",
        {},
    )

    print()
    print("TOP SHAP DRIVERS")
    print("-" * 80)

    for driver in shap.get(
        "top_risk_drivers",
        [],
    ):

        print(
            f"{driver.get('feature')} "
            f"| value={driver.get('value')} "
            f"| shap={driver.get('shap_value')} "
            f"| impact={driver.get('impact')} "
            f"| direction={driver.get('direction')}"
        )

    # ========================================================
    # MAPPED DRIVERS
    # ========================================================

    print()
    print("MAPPED INTERVENTION DRIVERS")
    print("-" * 80)

    mapped_drivers = result.get(
        "mapped_drivers",
        [],
    )

    for driver in mapped_drivers:

        print()

        print(
            f"Feature: "
            f"{driver.get('feature')}"
        )

        print(
            f"Concept: "
            f"{driver.get('concept')}"
        )

        print(
            f"Domain: "
            f"{driver.get('domain')}"
        )

        print(
            f"SHAP impact: "
            f"{driver.get('impact')}"
        )

    # ========================================================
    # RETRIEVED EVIDENCE
    # ========================================================

    print()
    print("RETRIEVED INTERVENTION EVIDENCE")
    print("-" * 80)

    interventions = result.get(
        "interventions",
        [],
    )

    if not interventions:

        print(
            "No intervention evidence retrieved."
        )

        return

    for intervention in interventions:

        print()
        print("=" * 80)

        print(
            f"Feature: "
            f"{intervention.get('feature')}"
        )

        print(
            f"Concept: "
            f"{intervention.get('concept')}"
        )

        print(
            f"Domain: "
            f"{intervention.get('domain')}"
        )

        print(
            f"Value: "
            f"{intervention.get('value')}"
        )

        print(
            f"SHAP impact: "
            f"{intervention.get('impact')}"
        )

        print(
            f"Retrieval queries: "
            f"{len(intervention.get('retrieval_queries', []))}"
        )

        evidence = intervention.get(
            "evidence",
            [],
        )

        print(
            f"Evidence chunks: "
            f"{len(evidence)}"
        )

        # ----------------------------------------------------
        # Print each evidence chunk
        # ----------------------------------------------------

        for index, item in enumerate(
            evidence,
            start=1,
        ):

            metadata = item.get(
                "metadata",
                {},
            )

            print()
            print(
                f"  Evidence #{index}"
            )

            print(
                f"  Query: "
                f"{item.get('query')}"
            )

            print(
                f"  Score: "
                f"{item.get('score', 0.0):.4f}"
            )

            print(
                f"  Source: "
                f"{metadata.get('source')}"
            )

            print(
                f"  Domain: "
                f"{metadata.get('domain')}"
            )

            print(
                f"  Topic: "
                f"{metadata.get('topic')}"
            )

            print(
                f"  Document: "
                f"{metadata.get('document')}"
            )

            print(
                f"  Chunk: "
                f"{metadata.get('chunk_id')}"
            )

            text = item.get(
                "text",
                "",
            )

            if len(text) > 700:

                text = (
                    text[:700]
                    + "..."
                )

            print()

            print(
                "  Text:"
            )

            print(
                f"  {text}"
            )


# ============================================================
# DATABASE TEST
# ============================================================

def load_test_member_context():
    """
    Load one real member from the backend database and build
    the RAG context.

    Backend is intentionally kept separate from the RAG
    implementation.
    """

    # --------------------------------------------------------
    # Add backend to Python path.
    #
    # backend/
    #   app/
    #
    # Models import:
    #   from app.database...
    # --------------------------------------------------------

    backend_dir = (
        PROJECT_ROOT
        / "backend"
    )

    if str(backend_dir) not in sys.path:

        sys.path.insert(
            0,
            str(backend_dir),
        )

    # --------------------------------------------------------
    # Backend imports
    # --------------------------------------------------------

    # pyrefly: ignore [missing-import]
    from app.database.connection import (
        SessionLocal,
    )

    # pyrefly: ignore [missing-import]
    from app.database.models import (
        Member,
        RiskPrediction,
        ShapExplanation,
    )

    # --------------------------------------------------------
    # RAG context builder
    # --------------------------------------------------------

    from rag.intervention.context_builder import (
        build_rag_context,
    )

    # --------------------------------------------------------
    # Database session
    # --------------------------------------------------------

    db = SessionLocal()

    try:

        # ====================================================
        # MEMBER
        # ====================================================

        member = (
            db.query(Member)
            .order_by(
                Member.id
            )
            .first()
        )

        if member is None:

            raise RuntimeError(
                "No member records found "
                "in the database."
            )

        # ====================================================
        # LATEST RISK PREDICTION
        # ====================================================

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
                "No risk prediction found "
                f"for member {member.member_id}."
            )

        # ====================================================
        # SHAP EXPLANATION
        # ====================================================

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
                "No SHAP explanation found "
                f"for prediction {prediction.id}."
            )

        # ====================================================
        # BUILD COMPLETE MEMBER RAG CONTEXT
        # ====================================================

        context = build_rag_context(
            member=member,
            risk_prediction=prediction,
            shap_explanation=shap,
        )

        return context

    finally:

        db.close()


# ============================================================
# MAIN
# ============================================================

def main() -> None:

    print("=" * 80)
    print("RAG INTERVENTION RETRIEVER TEST")
    print("=" * 80)

    print()
    print(
        "Loading member context from backend database..."
    )

    # ========================================================
    # 1. LOAD CONTEXT FROM BACKEND
    # ========================================================

    context = load_test_member_context()

    # ========================================================
    # 2. DISPLAY BASIC CONTEXT
    # ========================================================

    member = context.get(
        "member",
        {},
    )

    risk = context.get(
        "risk",
        {},
    )

    print()
    print("DATABASE CONTEXT LOADED")
    print("-" * 80)

    print(
        f"Member ID: "
        f"{member.get('member_id')}"
    )

    print(
        f"Risk score: "
        f"{risk.get('risk_score')}"
    )

    print(
        f"Risk category: "
        f"{risk.get('risk_category')}"
    )

    print(
        f"Prediction ID: "
        f"{risk.get('prediction_id')}"
    )

    # ========================================================
    # 3. RUN INTERVENTION RETRIEVAL
    # ========================================================

    print()
    print(
        "Running intervention-specific FAISS retrieval..."
    )

    result = retrieve_intervention_evidence(
        context=context,
        top_k_per_query=DEFAULT_TOP_K_PER_QUERY,
    )

    # ========================================================
    # 4. DISPLAY RESULTS
    # ========================================================

    print_intervention_evidence(
        result
    )

    # ========================================================
    # 5. COMPLETION
    # ========================================================

    print()
    print("=" * 80)
    print(
        "INTERVENTION RETRIEVAL TEST COMPLETED"
    )
    print("=" * 80)


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":
    main()

