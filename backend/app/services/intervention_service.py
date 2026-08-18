
from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any

from app.database.connection import SessionLocal
from app.database.models import (
    EmailNotification,
    Intervention,
    Member,
    RiskPrediction,
)
from app.services.email_notification.service import (
    send_intervention_email,
)


# ============================================================
# EMAIL CONFIGURATION
# ============================================================

PAYER_VIEWER_EMAIL = os.getenv(
    "PAYER_VIEWER_EMAIL"
)


# ============================================================
# GET OR GENERATE RECOMMENDATIONS
# ============================================================

def get_or_generate_recommendations(
    member_id: str,
) -> dict[str, Any]:
    """
    Get an existing intervention or generate a new one.

    Workflow:

        Member
          |
          v
        Latest RiskPrediction
          |
          v
        Existing RAG Intervention?
          |
          +---- YES ---> Return existing intervention
          |
          +---- NO
                 |
                 v
          Run RAG/Gemini
                 |
                 v
          Create Intervention
                 |
                 v
              COMMIT
                 |
                 v
        Create EmailNotification
                 |
                 v
          Send Email
             /       \
          SENT       FAILED
            |          |
            +----+-----+
                 |
                 v
             Return API

    Important:

    1. RAG is executed only when the latest prediction does
       not already have an RAG intervention.

    2. Existing interventions are returned directly.

    3. Existing interventions do not trigger another email.

    4. The Intervention is committed before email sending.

    5. If email sending fails, the Intervention remains saved.

    6. EmailNotification records SENT/FAILED status.

    7. This service uses send_intervention_email() directly.
       It does NOT use EmailService.
    """

    # ========================================================
    # 1. VALIDATE MEMBER ID
    # ========================================================

    if not isinstance(member_id, str):
        raise ValueError(
            "member_id must be a string."
        )

    member_id = member_id.strip()

    if not member_id:
        raise ValueError(
            "member_id is required."
        )

    db = SessionLocal()

    try:

        # ====================================================
        # 2. FIND MEMBER
        # ====================================================

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

        # ====================================================
        # 3. FIND LATEST PREDICTION
        # ====================================================

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

        # ====================================================
        # 4. CHECK EXISTING RAG INTERVENTION
        # ====================================================

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

        # ====================================================
        # 5. RETURN EXISTING INTERVENTION
        # ====================================================

        if existing is not None:

            return {
                "member_id": member_id,

                "risk_summary": {
                    "risk_score": (
                        prediction.risk_score
                    ),
                    "risk_category": (
                        prediction.risk_category
                    ),
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

        # ====================================================
        # 6. GENERATE NEW RAG RECOMMENDATION
        # ====================================================

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

        # ====================================================
        # 7. EXTRACT recommendation_result
        # ====================================================

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

        # ====================================================
        # 8. EXTRACT RECOMMENDATIONS
        # ====================================================

        recommendations = (
            recommendation_result.get(
                "recommendations",
                [],
            )
        )

        if not isinstance(
            recommendations,
            list,
        ):
            recommendations = []

        # Keep only dictionary recommendations.
        recommendations = [
            recommendation
            for recommendation in recommendations
            if isinstance(
                recommendation,
                dict,
            )
        ]

        # ====================================================
        # 9. EXTRACT RISK SUMMARY
        # ====================================================

        risk_summary = (
            recommendation_result.get(
                "risk_summary",
                {},
            )
        )

        if not isinstance(
            risk_summary,
            dict,
        ):
            risk_summary = {}

        # ====================================================
        # 10. ENSURE RISK SUMMARY HAS PREDICTION DATA
        # ====================================================

        risk_score = risk_summary.get(
            "risk_score",
            prediction.risk_score,
        )

        risk_category = risk_summary.get(
            "risk_category",
            prediction.risk_category,
        )

        risk_summary = {
            **risk_summary,
            "risk_score": risk_score,
            "risk_category": risk_category,
        }

        # ====================================================
        # 11. DETERMINE INTERVENTION PRIORITY
        # ====================================================

        priorities: list[str] = []

        for recommendation in recommendations:

            priority = recommendation.get(
                "priority"
            )

            if priority is None:
                continue

            priorities.append(
                str(priority).strip().lower()
            )

        if "high" in priorities:
            intervention_priority = "HIGH"

        elif "medium" in priorities:
            intervention_priority = "MEDIUM"

        elif "low" in priorities:
            intervention_priority = "LOW"

        else:
            intervention_priority = None

        # ====================================================
        # 12. CREATE INTERVENTION
        # ====================================================

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

        # ====================================================
        # 13. COMMIT INTERVENTION BEFORE EMAIL
        # ====================================================

        db.commit()

        db.refresh(intervention)

        # ====================================================
        # 14. PREPARE EMAIL
        # ====================================================

        recipient_email = (
            PAYER_VIEWER_EMAIL or ""
        )

        email_subject = (
            f"New Member Intervention - "
            f"{member_id} - "
            f"{risk_category} Risk"
        )

        # ====================================================
        # 15. CREATE EMAIL NOTIFICATION
        # ====================================================

        email_notification = EmailNotification(
            member_id=member.id,

            recipient_email=recipient_email,

            subject=email_subject,

            notification_type=(
                "NEW_INTERVENTION"
            ),

            status="PENDING",
        )

        db.add(email_notification)

        db.commit()

        db.refresh(email_notification)

        # ====================================================
        # 16. SEND EMAIL
        # ====================================================

        email_status = "PENDING"
        email_error = None

        try:

            email_payload = {
                "member_id": member_id,

                "risk_summary": risk_summary,

                "recommendations": (
                    recommendations
                ),

                "intervention_id": (
                    intervention.id
                ),

                "prediction_id": (
                    prediction.id
                ),
            }

            # IMPORTANT:
            #
            # Do NOT use:
            #
            #     EmailService()
            #
            # Do NOT use:
            #
            #     send_intervention_notification()
            #
            # The email service exposes:
            #
            #     send_intervention_email()
            #

            send_intervention_email(
                email_payload
            )

            # =================================================
            # 17. EMAIL SUCCESS
            # =================================================

            email_notification.status = "SENT"

            email_notification.sent_at = (
                datetime.now(timezone.utc)
            )

            email_notification.error_message = None

            email_status = "SENT"

        except Exception as exc:

            # =================================================
            # 18. EMAIL FAILURE
            # =================================================
            #
            # IMPORTANT:
            #
            # The Intervention was already committed.
            #
            # Therefore email failure must NOT delete it.
            #

            email_notification.status = "FAILED"

            email_notification.error_message = (
                str(exc)[:2000]
            )

            email_status = "FAILED"

            email_error = str(exc)

        # ====================================================
        # 19. SAVE EMAIL STATUS
        # ====================================================

        db.commit()

        db.refresh(email_notification)

        # ====================================================
        # 20. RETURN RESULT
        # ====================================================

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

            "email_notification": {
                "notification_id": (
                    email_notification.id
                ),

                "recipient": (
                    email_notification.recipient_email
                ),

                "status": email_status,

                "error": email_error,
            },
        }

    except Exception:

        # ====================================================
        # 21. DATABASE ROLLBACK
        # ====================================================

        db.rollback()

        raise

    finally:

        # ====================================================
        # 22. CLOSE DATABASE SESSION
        # ====================================================

        db.close()

