from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from google import genai
from google.genai import types


# ============================================================
# PROJECT PATHS
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = PROJECT_ROOT / "backend"
ENV_FILE = PROJECT_ROOT / ".env"

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


# ============================================================
# ENVIRONMENT
# ============================================================

load_dotenv(
    ENV_FILE,
    override=False,
)

GEMINI_API_KEY = os.getenv(
    "GEMINI_API_KEY"
)

if not GEMINI_API_KEY:
    raise RuntimeError(
        "GEMINI_API_KEY is not configured. "
        f"Please add it to {ENV_FILE}"
    )


# ============================================================
# GEMINI
# ============================================================

MODEL_NAME = "gemini-3.5-flash-lite"

gemini_client = genai.Client(
    api_key=GEMINI_API_KEY
)


# ============================================================
# CONFIGURATION
# ============================================================

MAX_EVIDENCE_PER_INTERVENTION = 3
MAX_RECOMMENDATIONS = 3
TOP_K_PER_QUERY = 3

MAX_RETRIES = 4

INITIAL_RETRY_DELAY = 2

MAX_OUTPUT_TOKENS = 3000


# ============================================================
# SAFE SERIALIZATION
# ============================================================

def json_safe(
    value: Any,
) -> Any:
    """
    Convert database / numpy-like values into JSON-safe values.
    """

    if value is None:
        return None

    if isinstance(
        value,
        (str, int, float, bool),
    ):
        return value

    if isinstance(
        value,
        dict,
    ):
        return {
            str(key): json_safe(item)
            for key, item in value.items()
        }

    if isinstance(
        value,
        (list, tuple),
    ):
        return [
            json_safe(item)
            for item in value
        ]

    try:
        return value.item()

    except Exception:
        return str(value)


# ============================================================
# LOAD EXISTING MEMBER DATA FROM DATABASE
# ============================================================

def load_member_prediction_context(
    member_id: str,
) -> tuple[Any, Any, Any]:

    """
    Load an already-predicted member from the database.

    This function does NOT:

        - process CSV
        - run prediction
        - calculate SHAP
        - create a prediction
        - modify prediction data

    It only reads:

        Member
        latest RiskPrediction
        latest ShapExplanation
    """

    # pyrefly: ignore [missing-import]
    from app.database.connection import SessionLocal

    # pyrefly: ignore [missing-import]
    from app.database.models import (
        Member,
        RiskPrediction,
        ShapExplanation,
    )

    db = SessionLocal()

    try:

        # ----------------------------------------------------
        # MEMBER
        # ----------------------------------------------------

        member = (
            db.query(Member)
            .filter(
                Member.member_id == member_id
            )
            .first()
        )

        if member is None:

            raise RuntimeError(
                f"Member '{member_id}' was not found "
                "in the database."
            )

        # ----------------------------------------------------
        # LATEST PREDICTION
        # ----------------------------------------------------

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
                f"No risk prediction exists for member "
                f"'{member_id}'. "
                "Run POST /predict first."
            )

        # ----------------------------------------------------
        # LATEST SHAP
        # ----------------------------------------------------

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
                f"No SHAP explanation exists for prediction "
                f"{prediction.id} of member '{member_id}'. "
                "Make sure POST /predict completed SHAP generation."
            )

        return (
            member,
            prediction,
            shap,
        )

    finally:

        db.close()


# ============================================================
# BUILD RAG CONTEXT
# ============================================================

def build_database_rag_context(
    member: Any,
    prediction: Any,
    shap: Any,
) -> dict[str, Any]:

    from rag.intervention.context_builder import (
        build_rag_context,
    )

    return build_rag_context(
        member=member,
        risk_prediction=prediction,
        shap_explanation=shap,
    )


# ============================================================
# RUN INTERVENTION-SPECIFIC RAG RETRIEVAL
# ============================================================

def retrieve_evidence(
    context: dict[str, Any],
) -> dict[str, Any]:

    from rag.intervention.intervention_retriever import (
        retrieve_intervention_evidence,
    )

    return retrieve_intervention_evidence(
        context=context,
        top_k_per_query=TOP_K_PER_QUERY,
    )


# ============================================================
# BUILD LLM CONTEXT
# ============================================================

def build_llm_context(
    retrieval_result: dict[str, Any],
) -> dict[str, Any]:

    member = retrieval_result.get(
        "member",
        {},
    )

    risk = retrieval_result.get(
        "risk",
        {},
    )

    shap = retrieval_result.get(
        "shap",
        {},
    )

    interventions = retrieval_result.get(
        "interventions",
        [],
    )

    prepared_interventions = []

    for intervention in interventions:

        evidence_items = []

        for evidence in intervention.get(
            "evidence",
            [],
        )[:MAX_EVIDENCE_PER_INTERVENTION]:

            metadata = evidence.get(
                "metadata",
                {},
            )

            evidence_items.append(
                {
                    "query": evidence.get(
                        "query"
                    ),

                    "score": evidence.get(
                        "score"
                    ),

                    "text": evidence.get(
                        "text"
                    ),

                    "source": metadata.get(
                        "source"
                    ),

                    "domain": metadata.get(
                        "domain"
                    ),

                    "topic": metadata.get(
                        "topic"
                    ),

                    "document": metadata.get(
                        "document"
                    ),

                    "chunk_id": metadata.get(
                        "chunk_id"
                    ),
                }
            )

        prepared_interventions.append(
            {
                "feature": intervention.get(
                    "feature"
                ),

                "value": intervention.get(
                    "value"
                ),

                "shap_value": intervention.get(
                    "shap_value"
                ),

                "impact": intervention.get(
                    "impact"
                ),

                "direction": intervention.get(
                    "direction"
                ),

                "domain": intervention.get(
                    "domain"
                ),

                "concept": intervention.get(
                    "concept"
                ),

                "evidence": evidence_items,
            }
        )

    return {
        "member": json_safe(
            member
        ),

        "risk": json_safe(
            risk
        ),

        "shap": {
            "top_risk_drivers": json_safe(
                shap.get(
                    "top_risk_drivers",
                    [],
                )
            ),

            "intervention_drivers": json_safe(
                shap.get(
                    "intervention_drivers",
                    [],
                )
            ),
        },

        "interventions": json_safe(
            prepared_interventions
        ),
    }


# ============================================================
# SYSTEM PROMPT
# ============================================================

SYSTEM_PROMPT = """
You are a healthcare intervention recommendation assistant.

Your task is to generate conservative, member-specific
intervention recommendations using ONLY the supplied:

1. Member information
2. Risk prediction
3. SHAP explanation
4. Intervention driver mappings
5. Retrieved RAG evidence

IMPORTANT SAFETY AND GROUNDING RULES:

- Do not invent diagnoses.
- Do not invent medications.
- Do not invent laboratory values.
- Do not invent smoking status.
- Do not invent clinical conditions.
- Do not invent patient history.
- Do not fabricate evidence.
- Do not fabricate sources.
- Do not fabricate chunk IDs.
- Do not create intervention features that are not supplied.
- Do not cite sources that are not supplied.
- Do not use FAISS similarity alone as proof of clinical appropriateness.
- SHAP drivers marked increases_risk should receive priority.
- A positive SHAP value for a binary feature with value 0 must NOT
  be used to claim that the member has that condition.
- Respect the actual member feature value.
- Do not prescribe medication.
- Do not provide medication dosage.
- When clinical appropriateness depends on missing information,
  recommend clinician/care-team review.
- Retrieved evidence supports the recommendation but does not
  replace clinical judgment.

VERY IMPORTANT EVIDENCE RULE:

Every recommendation must contain at least one evidence source.

The evidence source must use an EXACT chunk_id from the supplied
RAG context.

Do not invent a chunk_id.

Copy the chunk_id exactly as supplied.

The feature must also exactly match one of the supplied intervention
features.

The shap_impact must correspond to the supplied intervention.

Return valid JSON only.

Do not return markdown.

Do not return ```json fences.

Do not return explanations outside JSON.
"""


# ============================================================
# BUILD PROMPT
# ============================================================

def build_prompt(
    retrieval_result: dict[str, Any],
) -> str:

    llm_context = build_llm_context(
        retrieval_result
    )

    context_json = json.dumps(
        llm_context,
        indent=2,
        ensure_ascii=False,
    )

    return f"""
Generate prioritized intervention recommendations for the
following single member.

The member has already completed the prediction and SHAP pipeline.

Do NOT perform prediction.

Do NOT calculate SHAP.

Do NOT invent clinical information.

Use ONLY the supplied RAG context.

MEMBER-SPECIFIC RAG CONTEXT
===========================

{context_json}


RECOMMENDATION RULES
====================

1. Generate at most {MAX_RECOMMENDATIONS} recommendations.

2. Prioritize the strongest positive SHAP intervention drivers.

3. Only use intervention features supplied in the context.

4. Respect the actual member feature value.

5. If a binary feature has value 0, do not claim the member has
   that condition.

6. The SHAP impact must come from the supplied intervention.

7. Every recommendation must contain an exact evidence chunk_id
   copied from the supplied evidence.

8. Do not invent chunk IDs.

9. Every evidence source must belong to the recommendation's
   intervention feature.

10. Prefer the highest-quality supplied evidence.

11. Use practical care-coordination actions such as:

    - primary-care follow-up
    - condition-management review
    - preventive-care review
    - screening review
    - medication review
    - referral consideration
    - health education
    - social-service/resource connection

12. Do not prescribe medication.

13. Do not provide medication dosage.

14. If information is insufficient, recommend clinician/care-team
    review instead of making assumptions.

15. Recommendations must be ordered from highest to lowest priority.

16. The risk score and risk category must come from the supplied
    context.

17. Do not create evidence that does not exist.

18. Do not create a diagnosis that does not exist.

19. Do not mention unrelated evidence.

20. Use the exact feature name from the intervention context.

21. Use the exact chunk_id from the intervention evidence.

OUTPUT SCHEMA
=============

{{
  "member_id": "string",

  "risk_summary": {{
    "risk_score": number,
    "risk_category": "string",
    "summary": "string"
  }},

  "recommendations": [
    {{
      "priority": "high | medium | low",

      "feature": "string",

      "concept": "string",

      "domain": "string",

      "shap_impact": number,

      "rationale": "string",

      "recommended_action": "string",

      "next_step": "string",

      "evidence_basis": "string",

      "evidence_sources": [
        {{
          "source": "string",
          "domain": "string",
          "topic": "string",
          "document": "string",
          "chunk_id": "string",
          "score": number
        }}
      ]
    }}
  ]
}}
"""


# ============================================================
# GEMINI CALL
# ============================================================

def call_gemini(
    retrieval_result: dict[str, Any],
) -> str:

    prompt = build_prompt(
        retrieval_result
    )

    config = types.GenerateContentConfig(
        temperature=0.1,

        max_output_tokens=MAX_OUTPUT_TOKENS,

        response_mime_type="application/json",
    )

    last_error: Exception | None = None

    for attempt in range(
        1,
        MAX_RETRIES + 1,
    ):

        try:

            print(
                f"Calling Gemini ({MODEL_NAME}) "
                f"[attempt {attempt}/{MAX_RETRIES}]..."
            )

            response = (
                gemini_client.models.generate_content(
                    model=MODEL_NAME,
                    contents=prompt,
                    config=config,
                )
            )

            content = getattr(
                response,
                "text",
                None,
            )

            if not content:

                raise RuntimeError(
                    "Gemini returned an empty response."
                )

            return content.strip()

        except Exception as exc:

            last_error = exc

            error_text = str(exc)

            if attempt == MAX_RETRIES:

                raise RuntimeError(
                    "Gemini recommendation generation "
                    f"failed after {MAX_RETRIES} attempts.\n\n"
                    f"Last error: {error_text}"
                ) from exc

            wait_seconds = (
                INITIAL_RETRY_DELAY
                * (2 ** (attempt - 1))
            )

            print(
                "Gemini request failed "
                f"(attempt {attempt}/{MAX_RETRIES}). "
                f"Retrying in {wait_seconds} seconds..."
            )

            time.sleep(
                wait_seconds
            )

    raise RuntimeError(
        "Gemini recommendation generation failed."
    ) from last_error


# ============================================================
# JSON EXTRACTION
# ============================================================

def parse_llm_json(
    raw_response: str,
) -> dict[str, Any]:

    cleaned = raw_response.strip()

    # --------------------------------------------------------
    # Remove markdown fences if Gemini unexpectedly returns them
    # --------------------------------------------------------

    if cleaned.startswith(
        "```json"
    ):

        cleaned = cleaned[
            len("```json"):
        ].strip()

        if cleaned.endswith(
            "```"
        ):

            cleaned = cleaned[
                :-3
            ].strip()

    elif cleaned.startswith(
        "```"
    ):

        cleaned = cleaned[
            len("```"):
        ].strip()

        if cleaned.endswith(
            "```"
        ):

            cleaned = cleaned[
                :-3
            ].strip()

    # --------------------------------------------------------
    # Parse JSON
    # --------------------------------------------------------

    try:

        parsed = json.loads(
            cleaned
        )

    except json.JSONDecodeError as exc:

        raise RuntimeError(
            "Gemini returned invalid JSON.\n\n"
            f"Raw response:\n{raw_response}"
        ) from exc

    if not isinstance(
        parsed,
        dict,
    ):

        raise RuntimeError(
            "Gemini JSON response must be an object."
        )

    return parsed


# ============================================================
# BUILD FALLBACK EVIDENCE
# ============================================================

def get_actual_evidence_for_feature(
    intervention: dict[str, Any],
) -> list[dict[str, Any]]:

    """
    Get real evidence directly from RAG.

    This is important because Gemini may occasionally omit
    evidence_sources even though the RAG pipeline retrieved
    valid evidence.

    We NEVER fabricate evidence here.

    We only use evidence that already exists in retrieval_result.
    """

    evidence_sources = []

    for evidence in intervention.get(
        "evidence",
        [],
    )[:MAX_EVIDENCE_PER_INTERVENTION]:

        metadata = evidence.get(
            "metadata",
            {},
        )

        chunk_id = metadata.get(
            "chunk_id"
        )

        if not chunk_id:
            continue

        evidence_sources.append(
            {
                "source": metadata.get(
                    "source"
                ),

                "domain": metadata.get(
                    "domain"
                ),

                "topic": metadata.get(
                    "topic"
                ),

                "document": metadata.get(
                    "document"
                ),

                "chunk_id": chunk_id,

                "score": evidence.get(
                    "score"
                ),
            }
        )

    return evidence_sources


# ============================================================
# VALIDATION
# ============================================================

def validate_recommendations(
    result: dict[str, Any],
    retrieval_result: dict[str, Any],
) -> dict[str, Any]:

    member = retrieval_result.get(
        "member",
        {},
    )

    risk = retrieval_result.get(
        "risk",
        {},
    )

    interventions = retrieval_result.get(
        "interventions",
        [],
    )

    # ========================================================
    # INTERVENTION LOOKUP
    # ========================================================

    intervention_by_feature: dict[
        str,
        dict[str, Any],
    ] = {}

    for intervention in interventions:

        feature = intervention.get(
            "feature"
        )

        if feature:

            intervention_by_feature[
                feature
            ] = intervention

    allowed_features = set(
        intervention_by_feature.keys()
    )

    # ========================================================
    # EVIDENCE LOOKUP
    # ========================================================

    allowed_evidence: dict[
        str,
        dict[str, Any],
    ] = {}

    for intervention in interventions:

        feature = intervention.get(
            "feature"
        )

        for evidence in intervention.get(
            "evidence",
            [],
        ):

            metadata = evidence.get(
                "metadata",
                {},
            )

            chunk_id = metadata.get(
                "chunk_id"
            )

            if not chunk_id:
                continue

            allowed_evidence[
                chunk_id
            ] = {
                "feature": feature,

                "source": metadata.get(
                    "source"
                ),

                "domain": metadata.get(
                    "domain"
                ),

                "topic": metadata.get(
                    "topic"
                ),

                "document": metadata.get(
                    "document"
                ),

                "chunk_id": chunk_id,

                "score": evidence.get(
                    "score"
                ),
            }

    # ========================================================
    # MEMBER ID
    # ========================================================

    result["member_id"] = member.get(
        "member_id"
    )

    # ========================================================
    # RISK SUMMARY
    # ========================================================

    gemini_risk_summary = result.get(
        "risk_summary",
        {},
    )

    if not isinstance(
        gemini_risk_summary,
        dict,
    ):
        gemini_risk_summary = {}

    risk_score = risk.get(
        "risk_score"
    )

    risk_category = risk.get(
        "risk_category"
    )

    existing_summary = (
        gemini_risk_summary.get(
            "summary"
        )
    )

    if not existing_summary:

        existing_summary = (
            f"The member has a "
            f"{risk_category} risk category."
        )

    # ALWAYS use actual database/RAG risk values.
    result["risk_summary"] = {
        "risk_score": risk_score,

        "risk_category": risk_category,

        "summary": existing_summary,
    }

    # ========================================================
    # RECOMMENDATIONS
    # ========================================================

    recommendations = result.get(
        "recommendations",
        [],
    )

    if not isinstance(
        recommendations,
        list,
    ):

        recommendations = []

    validated = []

    for recommendation in recommendations:

        if not isinstance(
            recommendation,
            dict,
        ):
            continue

        # ----------------------------------------------------
        # FEATURE
        # ----------------------------------------------------

        feature = recommendation.get(
            "feature"
        )

        if feature not in allowed_features:

            continue

        actual_intervention = (
            intervention_by_feature[
                feature
            ]
        )

        # ----------------------------------------------------
        # ACTUAL RAG EVIDENCE
        # ----------------------------------------------------

        actual_evidence = (
            get_actual_evidence_for_feature(
                actual_intervention
            )
        )

        if not actual_evidence:

            continue

        # ----------------------------------------------------
        # GEMINI EVIDENCE
        # ----------------------------------------------------

        evidence_sources = (
            recommendation.get(
                "evidence_sources",
                [],
            )
        )

        validated_sources = []

        if isinstance(
            evidence_sources,
            list,
        ):

            for source in evidence_sources:

                if not isinstance(
                    source,
                    dict,
                ):
                    continue

                chunk_id = source.get(
                    "chunk_id"
                )

                if not chunk_id:
                    continue

                # ------------------------------------------------
                # Chunk must exist in actual RAG results.
                # ------------------------------------------------

                if chunk_id not in allowed_evidence:

                    continue

                actual_source = (
                    allowed_evidence[
                        chunk_id
                    ]
                )

                # ------------------------------------------------
                # Chunk must belong to same feature.
                # ------------------------------------------------

                if (
                    actual_source.get(
                        "feature"
                    )
                    != feature
                ):
                    continue

                validated_sources.append(
                    {
                        "source": actual_source.get(
                            "source"
                        ),

                        "domain": actual_source.get(
                            "domain"
                        ),

                        "topic": actual_source.get(
                            "topic"
                        ),

                        "document": actual_source.get(
                            "document"
                        ),

                        "chunk_id": chunk_id,

                        "score": actual_source.get(
                            "score"
                        ),
                    }
                )

        # ----------------------------------------------------
        # IMPORTANT FALLBACK
        #
        # Gemini sometimes produces a valid recommendation
        # but forgets to return the exact chunk_id.
        #
        # In that situation, use the real RAG evidence.
        #
        # This does NOT fabricate evidence.
        # ----------------------------------------------------

        if not validated_sources:

            validated_sources = (
                actual_evidence[
                    :MAX_EVIDENCE_PER_INTERVENTION
                ]
            )

        # ----------------------------------------------------
        # Still no evidence -> reject recommendation
        # ----------------------------------------------------

        if not validated_sources:

            continue

        # ----------------------------------------------------
        # FORCE RAG-GROUNDED VALUES
        # ----------------------------------------------------

        recommendation[
            "feature"
        ] = feature

        recommendation[
            "concept"
        ] = actual_intervention.get(
            "concept"
        )

        recommendation[
            "domain"
        ] = actual_intervention.get(
            "domain"
        )

        recommendation[
            "shap_impact"
        ] = actual_intervention.get(
            "shap_value"
        )

        recommendation[
            "evidence_sources"
        ] = validated_sources

        # ----------------------------------------------------
        # Default priority if Gemini omitted it
        # ----------------------------------------------------

        priority = recommendation.get(
            "priority"
        )

        if priority not in {
            "high",
            "medium",
            "low",
        }:

            shap_value = (
                actual_intervention.get(
                    "shap_value"
                )
            )

            try:

                shap_value = float(
                    shap_value
                )

            except (
                TypeError,
                ValueError,
            ):

                shap_value = 0.0

            if shap_value >= 5:

                priority = "high"

            elif shap_value > 0:

                priority = "medium"

            else:

                priority = "low"

            recommendation[
                "priority"
            ] = priority

        # ----------------------------------------------------
        # Ensure important text fields exist
        # ----------------------------------------------------

        if not recommendation.get(
            "rationale"
        ):

            recommendation[
                "rationale"
            ] = (
                f"The supplied SHAP intervention driver "
                f"'{feature}' contributed to the member's "
                f"predicted risk."
            )

        if not recommendation.get(
            "recommended_action"
        ):

            recommendation[
                "recommended_action"
            ] = (
                "Care-team review is recommended based on "
                "the supplied member risk and intervention evidence."
            )

        if not recommendation.get(
            "next_step"
        ):

            recommendation[
                "next_step"
            ] = (
                "Care coordinator to review the intervention "
                "with the appropriate care team."
            )

        if not recommendation.get(
            "evidence_basis"
        ):

            first_evidence = (
                actual_intervention
                .get(
                    "evidence",
                    [],
                )
            )

            if first_evidence:

                recommendation[
                    "evidence_basis"
                ] = first_evidence[
                    0
                ].get(
                    "text",
                    "Retrieved RAG evidence supports this intervention."
                )

            else:

                recommendation[
                    "evidence_basis"
                ] = (
                    "Retrieved RAG evidence supports this intervention."
                )

        validated.append(
            recommendation
        )

    # ========================================================
    # IMPORTANT FALLBACK
    #
    # If Gemini returns no usable recommendations, construct
    # conservative recommendations directly from the RAG
    # intervention drivers.
    #
    # This keeps the pipeline grounded and prevents:
    #
    # recommendations: []
    #
    # simply because Gemini forgot evidence_sources.
    # ========================================================

    if not validated:

        for intervention in interventions:

            if len(validated) >= MAX_RECOMMENDATIONS:

                break

            feature = intervention.get(
                "feature"
            )

            if not feature:

                continue

            evidence_sources = (
                get_actual_evidence_for_feature(
                    intervention
                )
            )

            if not evidence_sources:

                continue

            shap_value = intervention.get(
                "shap_value"
            )

            try:

                numeric_shap = float(
                    shap_value
                )

            except (
                TypeError,
                ValueError,
            ):

                numeric_shap = 0.0

            if numeric_shap >= 5:

                priority = "high"

            elif numeric_shap > 0:

                priority = "medium"

            else:

                priority = "low"

            evidence_items = intervention.get(
                "evidence",
                [],
            )

            evidence_text = ""

            if evidence_items:

                evidence_text = (
                    evidence_items[
                        0
                    ].get(
                        "text",
                        "",
                    )
                )

            fallback_recommendation = {
                "priority": priority,

                "feature": feature,

                "concept": intervention.get(
                    "concept"
                ),

                "domain": intervention.get(
                    "domain"
                ),

                "shap_impact": shap_value,

                "rationale": (
                    f"The supplied intervention driver "
                    f"'{feature}' contributed to the member's "
                    f"predicted risk with a SHAP impact of "
                    f"{numeric_shap:.2f}."
                ),

                "recommended_action": (
                    "Consider care-team review and appropriate "
                    "condition-management or preventive-care "
                    "follow-up based on the member's supplied "
                    "risk context."
                ),

                "next_step": (
                    "Care coordinator to review this intervention "
                    "with the appropriate clinical care team."
                ),

                "evidence_basis": (
                    evidence_text
                    or
                    "Retrieved RAG evidence supports this intervention."
                ),

                "evidence_sources": (
                    evidence_sources[
                        :MAX_EVIDENCE_PER_INTERVENTION
                    ]
                ),
            }

            validated.append(
                fallback_recommendation
            )

    # ========================================================
    # LIMIT
    # ========================================================

    result[
        "recommendations"
    ] = validated[
        :MAX_RECOMMENDATIONS
    ]

    return result


# ============================================================
# GENERATE RECOMMENDATIONS
# ============================================================

def generate_recommendations(
    retrieval_result: dict[str, Any],
) -> dict[str, Any]:

    raw_response = call_gemini(
        retrieval_result
    )

    parsed = parse_llm_json(
        raw_response
    )

    validated = validate_recommendations(
        parsed,
        retrieval_result,
    )

    return {
        "recommendation_result": validated,

        "raw_llm_response": raw_response,
    }


# ============================================================
# COMPLETE MEMBER RECOMMENDATION FLOW
# ============================================================

def generate_recommendations_for_member(
    member_id: str,
) -> dict[str, Any]:

    print()

    print(
        "Loading existing prediction data from database..."
    )

    # --------------------------------------------------------
    # 1. DATABASE
    # --------------------------------------------------------

    member, prediction, shap = (
        load_member_prediction_context(
            member_id
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

    print(
        f"SHAP ID: "
        f"{getattr(shap, 'id', 'N/A')}"
    )

    # --------------------------------------------------------
    # 2. RAG CONTEXT
    # --------------------------------------------------------

    print()

    print(
        "Building RAG context from existing database data..."
    )

    context = build_database_rag_context(
        member=member,
        prediction=prediction,
        shap=shap,
    )

    print()

    print(
        "RAG CONTEXT BUILT"
    )

    # --------------------------------------------------------
    # 3. FAISS RETRIEVAL
    # --------------------------------------------------------

    print()

    print(
        "Running intervention-specific FAISS retrieval..."
    )

    retrieval_result = retrieve_evidence(
        context
    )

    print()

    print(
        "RETRIEVAL COMPLETED"
    )

    print("-" * 80)

    interventions = retrieval_result.get(
        "interventions",
        [],
    )

    if not interventions:

        print(
            "No intervention drivers were mapped."
        )

    for intervention in interventions:

        print(
            f"{intervention.get('feature')} | "
            f"{intervention.get('concept')} | "
            f"SHAP={intervention.get('shap_value')} | "
            f"evidence="
            f"{len(intervention.get('evidence', []))}"
        )

    # --------------------------------------------------------
    # 4. GEMINI
    # --------------------------------------------------------

    print()

    print(
        f"Calling Gemini ({MODEL_NAME})..."
    )

    generated = generate_recommendations(
        retrieval_result
    )

    return generated


# ============================================================
# DISPLAY
# ============================================================

def print_recommendations(
    result: dict[str, Any],
) -> None:

    recommendation_result = result.get(
        "recommendation_result",
        {},
    )

    member_id = recommendation_result.get(
        "member_id"
    )

    risk_summary = recommendation_result.get(
        "risk_summary",
        {},
    )

    recommendations = recommendation_result.get(
        "recommendations",
        [],
    )

    print()

    print("=" * 80)

    print(
        "GEMINI RAG INTERVENTION RECOMMENDATIONS"
    )

    print("=" * 80)

    print()

    print(
        f"Member ID: {member_id}"
    )

    print()

    print(
        "RISK SUMMARY"
    )

    print("-" * 80)

    print(
        f"Risk score: "
        f"{risk_summary.get('risk_score')}"
    )

    print(
        f"Risk category: "
        f"{risk_summary.get('risk_category')}"
    )

    print(
        f"Summary: "
        f"{risk_summary.get('summary')}"
    )

    print()

    print(
        "RECOMMENDATIONS"
    )

    print("-" * 80)

    if not recommendations:

        print(
            "No validated recommendations were returned."
        )

        return

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
            f"Domain: "
            f"{recommendation.get('domain')}"
        )

        print(
            f"SHAP impact: "
            f"{recommendation.get('shap_impact')}"
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
            f"Next step: "
            f"{recommendation.get('next_step')}"
        )

        print(
            f"Evidence basis: "
            f"{recommendation.get('evidence_basis')}"
        )

        print()

        print(
            "Evidence sources:"
        )

        for source in recommendation.get(
            "evidence_sources",
            [],
        ):

            print(
                f"  - "
                f"{source.get('source')} | "
                f"{source.get('topic')} | "
                f"chunk={source.get('chunk_id')} | "
                f"score={source.get('score')}"
            )


# ============================================================
# SAVE JSON
# ============================================================

def save_recommendation_json(
    member_id: str,
    result: dict[str, Any],
) -> Path:

    output_dir = (
        PROJECT_ROOT
        / "rag"
        / "intervention"
        / "outputs"
    )

    output_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    output_file = (
        output_dir
        / f"{member_id}_recommendations.json"
    )

    recommendation_result = result.get(
        "recommendation_result",
        {},
    )

    with output_file.open(
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            recommendation_result,
            file,
            indent=2,
            ensure_ascii=False,
        )

    return output_file


# ============================================================
# MAIN
# ============================================================

def main() -> None:

    print("=" * 80)

    print(
        "GEMINI RAG RECOMMENDATION GENERATOR"
    )

    print("=" * 80)

    # --------------------------------------------------------
    # MEMBER ID
    # --------------------------------------------------------

    if len(sys.argv) > 1:

        member_id = sys.argv[1]

    else:

        member_id = "M00001"

    print()

    print(
        f"Generating recommendation for member: "
        f"{member_id}"
    )

    print()

    print(
        f"Gemini model: {MODEL_NAME}"
    )

    try:

        generated = (
            generate_recommendations_for_member(
                member_id
            )
        )

        # ----------------------------------------------------
        # DISPLAY
        # ----------------------------------------------------

        print_recommendations(
            generated
        )

        # ----------------------------------------------------
        # JSON OUTPUT
        # ----------------------------------------------------

        print()

        print("=" * 80)

        print(
            "VALIDATED RECOMMENDATION JSON"
        )

        print("=" * 80)

        print(
            json.dumps(
                generated.get(
                    "recommendation_result",
                    {},
                ),
                indent=2,
                ensure_ascii=False,
            )
        )

        # ----------------------------------------------------
        # SAVE
        # ----------------------------------------------------

        output_file = (
            save_recommendation_json(
                member_id,
                generated,
            )
        )

        print()

        print(
            "Recommendation JSON saved to:"
        )

        print(
            output_file
        )

        print()

        print("=" * 80)

        print(
            "GEMINI RAG RECOMMENDATION COMPLETED"
        )

        print("=" * 80)

    except Exception as exc:

        print()

        print("=" * 80)

        print(
            "RECOMMENDATION GENERATION FAILED"
        )

        print("=" * 80)

        print()

        print(
            f"Error: {exc}"
        )

        raise


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":

    main()