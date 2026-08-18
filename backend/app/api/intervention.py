
from __future__ import annotations

import os
from datetime import datetime, timezone

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.database.models import (
    EmailNotification,
    Intervention,
    Member,
)
from app.security.permissions import (
    require_intervention_access,
)
from app.services.email_notification.service import (
    EmailService,
)


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/interventions",
    tags=["Interventions"],
)


# ============================================================
# SEND INTERVENTION NOTIFICATION
# ============================================================

@router.post(
    "/{intervention_id}/notify",
)
def notify_intervention(
    intervention_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_intervention_access()
    ),
):
    """
    Send an existing intervention recommendation
    to the configured Payer Viewer email.

    Only:
        - payer_admin
        - care_manager

    can trigger this endpoint.

    This endpoint does NOT generate a new RAG
    recommendation.

    It uses the already persisted Intervention.
    """

    # ========================================================
    # FIND INTERVENTION
    # ========================================================

    intervention = (
        db.query(Intervention)
        .filter(
            Intervention.id == intervention_id
        )
        .first()
    )

    if intervention is None:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"Intervention '{intervention_id}' "
                "not found."
            ),
        )

    # ========================================================
    # FIND MEMBER
    # ========================================================

    member = (
        db.query(Member)
        .filter(
            Member.id == intervention.member_id
        )
        .first()
    )

    if member is None:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "Member associated with this "
                "intervention was not found."
            ),
        )

    # ========================================================
    # RECIPIENT
    # ========================================================

    recipient_email = os.getenv(
        "PAYER_VIEWER_EMAIL"
    )

    if not recipient_email:

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "PAYER_VIEWER_EMAIL is not configured."
            ),
        )

    # ========================================================
    # SUBJECT
    # ========================================================

    member_id = member.member_id

    subject = (
        "New Intervention Recommendation - "
        f"Member {member_id}"
    )

    notification_type = (
        "INTERVENTION_RECOMMENDATION"
    )

    # ========================================================
    # CREATE EMAIL NOTIFICATION HISTORY
    # ========================================================

    notification = EmailNotification(
        member_id=member.id,
        recipient_email=recipient_email,
        subject=subject,
        notification_type=notification_type,
        status="PENDING",
    )

    db.add(notification)
    db.commit()
    db.refresh(notification)

    # ========================================================
    # SEND EMAIL
    # ========================================================

    try:

        email_service = EmailService()

        recommendations = (
            intervention.recommendations
            or []
        )

        email_service.send_intervention_notification(
            recipient_email=recipient_email,
            subject=subject,
            member_id=member_id,
            recommendations=recommendations,
            intervention_id=intervention.id,
        )

        # ====================================================
        # UPDATE SUCCESS
        # ====================================================

        notification.status = "SENT"

        notification.sent_at = (
            datetime.now(timezone.utc)
        )

        notification.error_message = None

        db.commit()
        db.refresh(notification)

        return {
            "message": (
                "Intervention notification "
                "sent successfully."
            ),
            "intervention_id": intervention.id,
            "member_id": member_id,
            "recipient_email": recipient_email,
            "notification_id": notification.id,
            "status": notification.status,
            "sent_by": {
                "user_id": current_user.id,
                "username": current_user.username,
                "role": current_user.role,
            },
        }

    except Exception as exc:

        # ====================================================
        # UPDATE FAILURE
        # ====================================================

        notification.status = "FAILED"

        notification.error_message = str(
            exc
        )[:2000]

        db.commit()
        db.refresh(notification)

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Failed to send intervention "
                f"notification: {str(exc)}"
            ),
        ) from exc

