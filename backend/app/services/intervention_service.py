from __future__ import annotations

from typing import Any

from app.database.connection import SessionLocal
from app.database.models import (
    Member,
    RiskPrediction,
    Intervention,
)


def get_or_generate_recommendations(
    member_id: str,
) -> dict[str, Any]:
    """
    Return recommendations for a member.

    Workflow:

        GET /recommendations/{member_id}
                    |
                    v
            Find member
                    |
                    v
            Find latest prediction
                    |
                    v
        Existing RAG intervention?
              /            \
            YES             NO
             |               |
             v               v
        Fetch from DB      Run RAG
                             |
                             v
                         Save to DB
                             |
                             v
                       Return result

    Recommendations are cached per prediction.

    If a RAG intervention already exists for the member's
    latest prediction, Gemini/RAG is NOT called again.

    A new RAG recommendation is generated only when the
    member has a newer prediction without an intervention.
    """

    member_id = member_id.strip()

    if not member_id:
        raise ValueError(
            "member_id is required."
        )

    db = SessionLocal()

    try:
        # ==================================================
        # 1. FIND MEMBER
        # ==================================================

        member = (
            db.query(Member)
            .filter(
                Member.member_id == member_id
            )
            .first()
        )

        if member is None:
            raise ValueError(
                f"Member '{member_id}' not found."
            )

        # ==================================================
        # 2. FIND LATEST PREDICTION
        # ==================================================

        prediction = (
            db.query(RiskPrediction)
            .filter(
                RiskPrediction.member_id == member.id
            )
            .order_by(
                RiskPrediction.created_at.desc()
            )
            .first()
        )

        if prediction is None:
            raise ValueError(
                f"No prediction found for member "
                f"'{member_id}'. "
                "Run POST /predict first."
            )

        # ==================================================
        # 3. CHECK EXISTING RAG INTERVENTION
        # ==================================================

        existing = (
            db.query(Intervention)
            .filter(
                Intervention.member_id == member.id,
                Intervention.prediction_id == prediction.id,
                Intervention.source == "RAG",
            )
            .order_by(
                Intervention.created_at.desc()
            )
            .first()
        )

        # ==================================================
        # 4. EXISTING RESULT
        # ==================================================

        if existing is not None:

            return {
                "member_id": member_id,

                "risk_summary": {
                    "risk_score": prediction.risk_score,
                    "risk_category": prediction.risk_category,
                },

                "recommendations": (
                    existing.recommendations
                    or []
                ),

                "source": existing.source,

                "status": existing.status,

                "intervention_id": existing.id,

                "prediction_id": prediction.id,

                "created_at": (
                    existing.created_at.isoformat()
                    if existing.created_at
                    else None
                ),
            }

        # ==================================================
        # 5. NO EXISTING RESULT
        #
        # Run RAG only for this prediction.
        # ==================================================

        from rag.intervention.recommendation_generator import (
            generate_recommendations_for_member,
        )

        result = generate_recommendations_for_member(
            member_id
        )

        if not isinstance(result, dict):
            raise RuntimeError(
                "RAG recommendation generator returned "
                "an invalid result."
            )

        # ==================================================
        # 6. EXTRACT RECOMMENDATION RESULT
        # ==================================================

        recommendation_result = result.get(
            "recommendation_result",
            {},
        )

        if not isinstance(
            recommendation_result,
            dict,
        ):
            raise RuntimeError(
                "RAG recommendation result is invalid."
            )

        recommendations = recommendation_result.get(
            "recommendations",
            [],
        )

        if not isinstance(
            recommendations,
            list,
        ):
            recommendations = []

        risk_summary = recommendation_result.get(
            "risk_summary",
            {},
        )

        if not isinstance(
            risk_summary,
            dict,
        ):
            risk_summary = {}

        # ==================================================
        # 7. DETERMINE INTERVENTION PRIORITY
        # ==================================================

        priorities = []

        for recommendation in recommendations:

            if not isinstance(
                recommendation,
                dict,
            ):
                continue

            priority = recommendation.get(
                "priority"
            )

            if priority:
                priorities.append(
                    str(priority).lower()
                )

        if "high" in priorities:

            intervention_priority = "HIGH"

        elif "medium" in priorities:

            intervention_priority = "MEDIUM"

        elif "low" in priorities:

            intervention_priority = "LOW"

        else:

            intervention_priority = None

        # ==================================================
        # 8. SAVE RAG INTERVENTION
        # ==================================================

        intervention = Intervention(
            member_id=member.id,

            prediction_id=prediction.id,

            intervention_priority=(
                intervention_priority
            ),

            recommendations=recommendations,

            source="RAG",

            status="PENDING",
        )

        db.add(intervention)

        db.commit()

        db.refresh(intervention)

        # ==================================================
        # 9. AUTOMATIC EMAIL NOTIFICATION (NON-BLOCKING)
        #
        # Send automated email to PAYER_VIEWER_EMAIL.
        # Failures in email delivery will NOT break the
        # recommendation API response.
        # ==================================================

        try:
            from app.services.email import EmailService
            EmailService.send_rag_intervention_email(
                member_id=member_id,
                risk_score=prediction.risk_score,
                risk_category=prediction.risk_category,
                recommendations=recommendations,
            )
        except Exception as email_err:
            import logging
            logging.getLogger("InterventionService").warning(
                f"Automated email notification failed: {email_err}"
            )

        # ==================================================
        # 10. RETURN SAVED RESULT
        # ==================================================

        return {
            "member_id": member_id,

            "risk_summary": risk_summary,

            "recommendations": recommendations,

            "source": intervention.source,

            "status": intervention.status,

            "intervention_id": intervention.id,

            "prediction_id": prediction.id,

            "created_at": (
                intervention.created_at.isoformat()
                if intervention.created_at
                else None
            ),
        }

    except Exception:
        # ----------------------------------------------
        # Important:
        # If anything fails after a DB transaction has
        # started, rollback before closing the session.
        # ----------------------------------------------

        db.rollback()

        raise

    finally:
        db.close()

