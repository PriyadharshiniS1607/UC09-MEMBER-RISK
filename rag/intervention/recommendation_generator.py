from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any

from dotenv import load_dotenv


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
        "GEMINI_API_KEY is not configured.\n"
        f"Please add GEMINI_API_KEY to {ENV_FILE}"
    )


# ============================================================
# GEMINI
# ============================================================

try:
    from google import genai
    from google.genai import types
except ImportError as exc:
    raise RuntimeError(
        "The Gemini SDK is not installed.\n\n"
        "Install it using:\n"
        "pip install google-genai"
    ) from exc


MODEL_NAME = os.getenv(
    "GEMINI_MODEL",
    "gemini-3.6-flash",
)


gemini_client = genai.Client(
    api_key=GEMINI_API_KEY
)


# ============================================================
# CONFIGURATION
# ============================================================

MAX_EVIDENCE_PER_INTERVENTION = 2
MAX_RECOMMENDATIONS = 3
TOP_K_PER_QUERY = 3

# Gemini can sometimes truncate long JSON.
# We therefore give it enough output space.
MAX_OUTPUT_TOKENS = 3000

# Number of times to retry a failed/incomplete JSON response.
MAX_GEMINI_ATTEMPTS = 2


# ============================================================
# SAFE SERIALIZATION
# ============================================================

def json_safe(value: Any) -> Any:
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

    if isinstance(value, dict):
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

    IMPORTANT:

    This function does NOT:

        - process CSV
        - run prediction
        - calculate SHAP
        - create a prediction
        - create SHAP explanations

    POST /predict is responsible for those operations.

    This function only reads:

        Member
        RiskPrediction
        ShapExplanation
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
                f"'{member_id}'.\n\n"
                "Run POST /predict first."
            )

        # ----------------------------------------------------
        # SHAP
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
                f"{prediction.id} of member '{member_id}'.\n\n"
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
    """
    Build RAG context from existing database data.

    Architecture:

        POST /predict
              |
              v
        Database
          |
          +-- Member
          +-- RiskPrediction
          +-- ShapExplanation
              |
              v
        build_rag_context()
              |
              v
        FAISS retrieval
              |
              v
        Gemini
    """

    from rag.intervention.context_builder import (
        build_rag_context,
    )

    return build_rag_context(
        member=member,
        risk_prediction=prediction,
        shap_explanation=shap,
    )


# ============================================================
# INTERVENTION-SPECIFIC RETRIEVAL
# ============================================================

def retrieve_evidence(
    context: dict[str, Any],
) -> dict[str, Any]:
    """
    Retrieve intervention-specific evidence.

    No prediction or SHAP calculation happens here.
    """

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
    """
    Reduce the RAG result to the information Gemini needs.
    """

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
# GEMINI RESPONSE SCHEMA
# ============================================================

RECOMMENDATION_RESPONSE_SCHEMA = {
    "type": "object",

    "properties": {

        "member_id": {
            "type": "string",
        },

        "risk_summary": {
            "type": "object",

            "properties": {

                "risk_score": {
                    "type": "number",
                },

                "risk_category": {
                    "type": "string",
                },

                "summary": {
                    "type": "string",
                },
            },

            "required": [
                "risk_score",
                "risk_category",
                "summary",
            ],
        },

        "recommendations": {
            "type": "array",

            "items": {
                "type": "object",

                "properties": {

                    "priority": {
                        "type": "string",

                        "enum": [
                            "high",
                            "medium",
                            "low",
                        ],
                    },

                    "feature": {
                        "type": "string",
                    },

                    "concept": {
                        "type": "string",
                    },

                    "domain": {
                        "type": "string",
                    },

                    "shap_impact": {
                        "type": "number",
                    },

                    "rationale": {
                        "type": "string",
                    },

                    "recommended_action": {
                        "type": "string",
                    },

                    "next_step": {
                        "type": "string",
                    },

                    "evidence_basis": {
                        "type": "string",
                    },

                    "evidence_sources": {
                        "type": "array",

                        "items": {
                            "type": "object",

                            "properties": {

                                "source": {
                                    "type": "string",
                                },

                                "domain": {
                                    "type": "string",
                                },

                                "topic": {
                                    "type": "string",
                                },

                                "document": {
                                    "type": "string",
                                },

                                "chunk_id": {
                                    "type": "string",
                                },

                                "score": {
                                    "type": "number",
                                },
                            },

                            "required": [
                                "source",
                                "domain",
                                "topic",
                                "document",
                                "chunk_id",
                                "score",
                            ],
                        },
                    },
                },

                "required": [
                    "priority",
                    "feature",
                    "concept",
                    "domain",
                    "shap_impact",
                    "rationale",
                    "recommended_action",
                    "next_step",
                    "evidence_basis",
                    "evidence_sources",
                ],
            },
        },
    },

    "required": [
        "member_id",
        "risk_summary",
        "recommendations",
    ],
}


# ============================================================
# SYSTEM PROMPT
# ============================================================

SYSTEM_PROMPT = """
You are a healthcare intervention recommendation assistant.

Your job is ONLY to generate conservative,
member-specific intervention recommendations.

The prediction and SHAP analysis have ALREADY been completed.

You must use ONLY the supplied:

1. Member information
2. Risk prediction
3. SHAP explanation
4. Intervention driver mappings
5. Retrieved evidence

IMPORTANT:

- Do NOT perform a new prediction.
- Do NOT calculate SHAP.
- Do NOT invent diagnoses.
- Do NOT invent medications.
- Do NOT invent laboratory values.
- Do NOT invent smoking status.
- Do NOT invent patient history.
- Do NOT invent social determinants.
- Do NOT fabricate evidence.
- Do NOT fabricate sources.
- Do NOT fabricate chunk IDs.
- Do NOT create evidence that is not supplied.

SHAP RULES:

- Prioritize drivers marked as increasing risk.
- Use the supplied SHAP value.
- SHAP indicates contribution to predicted risk.
- SHAP does NOT independently establish a diagnosis.
- SHAP does NOT independently establish that treatment is required.
- A positive SHAP value for a binary feature with value 0 must
  NOT be interpreted as the member having that condition.
- Always consider the actual supplied feature value.

RAG RULES:

- FAISS similarity is supporting evidence only.
- Use evidence only when relevant to the proposed intervention.
- Every recommendation must reference evidence actually supplied.
- Every evidence chunk ID must come from the supplied context.
- Never create a new source or chunk ID.

HEALTHCARE SAFETY:

- Recommendations should be suitable for care coordination.
- Do not prescribe medication.
- Do not provide medication dosages.
- Do not make definitive diagnoses.
- Do not give emergency medical instructions unless explicitly
  supported by the supplied context.
- When clinical appropriateness depends on missing information,
  recommend clinician/care-team review.

GOOD ACTION TYPES INCLUDE:

- primary-care follow-up
- condition-management review
- preventive-care review
- screening review
- medication review
- referral consideration
- health education
- lifestyle support
- care-coordination follow-up
- social-service/resource connection

Return ONLY the requested structured JSON object.
"""


# ============================================================
# USER PROMPT
# ============================================================

def build_prompt(
    retrieval_result: dict[str, Any],
) -> str:
    """
    Build Gemini prompt from completed DB + RAG context.
    """

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
member described below.

IMPORTANT:

The prediction pipeline has ALREADY been completed.

The following context was obtained from the existing database
and intervention-specific RAG retrieval.

Do NOT perform prediction.

Do NOT calculate SHAP.

Do NOT invent missing patient information.

Do NOT create evidence.

MEMBER-SPECIFIC RAG CONTEXT
===========================

{context_json}

RECOMMENDATION RULES
====================

1. Generate at most {MAX_RECOMMENDATIONS} recommendations.

2. Prioritize the strongest SHAP intervention drivers.

3. Prioritize drivers that increase predicted risk.

4. Use the actual member feature value.

5. Never claim that a condition is present when the supplied
   binary feature value is 0.

6. Use only features present in the intervention list.

7. Use retrieved evidence only as supporting evidence.

8. Every recommendation must contain at least one evidence
   source.

9. Every evidence source must use a chunk_id from the supplied
   RAG context.

10. Do not create new chunk IDs.

11. Do not create new sources.

12. Do not prescribe medication.

13. Do not provide medication dosage.

14. Prefer practical care-coordination actions.

15. If clinical appropriateness cannot be determined from the
    supplied context, recommend clinician/care-team review.

16. Order recommendations from highest priority to lowest.

17. The member_id must come from the supplied context.

18. The risk score and risk category must come from the supplied
    context.

19. The shap_impact must correspond to the supplied SHAP driver.

20. Do not mention evidence unrelated to the recommendation.

Return the recommendations using the supplied response schema.
"""


# ============================================================
# GEMINI CALL
# ============================================================

def call_gemini(
    retrieval_result: dict[str, Any],
    attempt: int = 1,
) -> str:
    """
    Call Gemini using structured JSON output.

    This is the important fix for the malformed/truncated JSON
    problem.
    """

    prompt = build_prompt(
        retrieval_result
    )

    # Give the model additional output room on retry.
    output_tokens = (
        MAX_OUTPUT_TOKENS
        if attempt == 1
        else MAX_OUTPUT_TOKENS + 2000
    )

    try:

        response = gemini_client.models.generate_content(
            model=MODEL_NAME,

            contents=[
                {
                    "role": "user",
                    "parts": [
                        {
                            "text": (
                                SYSTEM_PROMPT
                                + "\n\n"
                                + prompt
                            )
                        }
                    ],
                }
            ],

            config=types.GenerateContentConfig(

                temperature=0.1,

                max_output_tokens=output_tokens,

                response_mime_type="application/json",

                response_schema=(
                    RECOMMENDATION_RESPONSE_SCHEMA
                ),
            ),
        )

    except Exception as exc:

        raise RuntimeError(
            f"Gemini API request failed: {exc}"
        ) from exc

    # --------------------------------------------------------
    # Extract text
    # --------------------------------------------------------

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


# ============================================================
# JSON EXTRACTION
# ============================================================

def parse_llm_json(
    raw_response: str,
) -> dict[str, Any]:
    """
    Parse Gemini JSON.

    Structured output should already be JSON, but this function
    still handles accidental markdown fences safely.
    """

    cleaned = raw_response.strip()

    # --------------------------------------------------------
    # Remove accidental markdown fences
    # --------------------------------------------------------

    if cleaned.startswith(
        "```json"
    ):

        cleaned = cleaned[
            len("```json"):
        ].strip()

        if cleaned.endswith("```"):

            cleaned = cleaned[
                :-3
            ].strip()

    elif cleaned.startswith(
        "```"
    ):

        cleaned = cleaned[
            len("```"):
        ].strip()

        if cleaned.endswith("```"):

            cleaned = cleaned[
                :-3
            ].strip()

    # --------------------------------------------------------
    # Parse
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
# VALIDATION
# ============================================================

def validate_recommendations(
    result: dict[str, Any],
    retrieval_result: dict[str, Any],
) -> dict[str, Any]:
    """
    Validate Gemini output against the actual RAG context.

    This prevents Gemini from inventing:

        - features
        - evidence
        - sources
        - chunk IDs
    """

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
    # ALLOWED FEATURES
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
    # ALLOWED EVIDENCE
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

    existing_risk_summary = result.get(
        "risk_summary",
        {},
    )

    if not isinstance(
        existing_risk_summary,
        dict,
    ):
        existing_risk_summary = {}

    result["risk_summary"] = {
        "risk_score": risk.get(
            "risk_score"
        ),

        "risk_category": risk.get(
            "risk_category"
        ),

        "summary": existing_risk_summary.get(
            "summary",
            (
                f"The member has a "
                f"{risk.get('risk_category')} "
                f"risk category."
            ),
        ),
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

        raise RuntimeError(
            "Gemini recommendations must be a list."
        )

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
        # EVIDENCE
        # ----------------------------------------------------

        evidence_sources = recommendation.get(
            "evidence_sources",
            [],
        )

        if not isinstance(
            evidence_sources,
            list,
        ):
            continue

        validated_sources = []

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

            if chunk_id not in allowed_evidence:
                continue

            actual_source = (
                allowed_evidence[
                    chunk_id
                ]
            )

            # ------------------------------------------------
            # Ensure evidence actually belongs to this
            # intervention feature.
            # ------------------------------------------------

            if (
                actual_source.get(
                    "feature"
                )
                != feature
            ):
                continue

            # ------------------------------------------------
            # Never trust Gemini's source metadata.
            #
            # Replace it with the real metadata from RAG.
            # ------------------------------------------------

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
        # Recommendation must have real evidence.
        # ----------------------------------------------------

        if not validated_sources:
            continue

        # ----------------------------------------------------
        # Ensure SHAP impact comes from the actual RAG context.
        # ----------------------------------------------------

        recommendation[
            "shap_impact"
        ] = actual_intervention.get(
            "shap_value"
        )

        # ----------------------------------------------------
        # Ensure feature-related metadata comes from RAG.
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
            "evidence_sources"
        ] = validated_sources

        validated.append(
            recommendation
        )

    # ========================================================
    # LIMIT RESULTS
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
    """
    Generate recommendations from completed RAG retrieval.

    Does NOT:

        - load CSV
        - run prediction
        - calculate SHAP
        - write prediction data
    """

    last_error: Exception | None = None

    for attempt in range(
        1,
        MAX_GEMINI_ATTEMPTS + 1,
    ):

        print()
        print(
            f"Calling Gemini ({MODEL_NAME}) "
            f"[attempt {attempt}/{MAX_GEMINI_ATTEMPTS}]..."
        )

        try:

            raw_response = call_gemini(
                retrieval_result,
                attempt=attempt,
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

        except Exception as exc:

            last_error = exc

            print()
            print(
                f"Gemini attempt {attempt} failed:"
            )

            print(
                str(exc)
            )

            if attempt < MAX_GEMINI_ATTEMPTS:

                print()
                print(
                    "Retrying Gemini with a larger "
                    "output limit..."
                )

    raise RuntimeError(
        "Gemini recommendation generation failed "
        f"after {MAX_GEMINI_ATTEMPTS} attempts.\n\n"
        f"Last error: {last_error}"
    )


# ============================================================
# COMPLETE MEMBER RECOMMENDATION FLOW
# ============================================================

def generate_recommendations_for_member(
    member_id: str,
) -> dict[str, Any]:
    """
    Complete recommendation flow.

    IMPORTANT ARCHITECTURE:

        POST /predict
              |
              v
        CSV processing
              |
              v
        prediction
              |
              v
        SHAP
              |
              v
        DATABASE
              |
              v
    recommendation_generator.py
              |
              +--> read Member
              |
              +--> read RiskPrediction
              |
              +--> read ShapExplanation
              |
              v
        build_rag_context()
              |
              v
        FAISS intervention retrieval
              |
              v
        Gemini
              |
              v
        validation
              |
              v
        recommendation

    No prediction or SHAP generation happens here.
    """

    # ========================================================
    # 1. DATABASE
    # ========================================================

    print()
    print(
        "Loading existing prediction data from database..."
    )

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

    # ========================================================
    # 2. RAG CONTEXT
    # ========================================================

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

    # ========================================================
    # 3. FAISS
    # ========================================================

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
            f"evidence="
            f"{len(intervention.get('evidence', []))}"
        )

    # ========================================================
    # 4. GEMINI
    # ========================================================

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

    recommendation_result = result[
        "recommendation_result"
    ]

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
                f"document={source.get('document')} | "
                f"chunk={source.get('chunk_id')} | "
                f"score={source.get('score')}"
            )


# ============================================================
# SAVE RECOMMENDATION RESULT
# ============================================================

def save_recommendation_json(
    result: dict[str, Any],
    member_id: str,
) -> Path:
    """
    Save the generated recommendation locally.

    This is optional and does not modify prediction/SHAP data.
    """

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

    with output_file.open(
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            result[
                "recommendation_result"
            ],
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

        # ----------------------------------------------------
        # GENERATE
        # ----------------------------------------------------

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
        # JSON
        # ----------------------------------------------------

        print()
        print("=" * 80)
        print(
            "VALIDATED RECOMMENDATION JSON"
        )
        print("=" * 80)

        print(
            json.dumps(
                generated[
                    "recommendation_result"
                ],
                indent=2,
                ensure_ascii=False,
            )
        )

        # ----------------------------------------------------
        # SAVE
        # ----------------------------------------------------

        output_file = save_recommendation_json(
            generated,
            member_id,
        )

        print()
        print(
            f"Recommendation JSON saved to:"
        )

        print(
            output_file
        )

        # ----------------------------------------------------
        # COMPLETE
        # ----------------------------------------------------

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