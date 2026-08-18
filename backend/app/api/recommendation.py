from __future__ import annotations

from fastapi import (
    APIRouter,
    HTTPException,
    status,
)

from app.services.intervention_service import (
    get_or_generate_recommendations,
)


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/recommendations",
    tags=["Recommendations"],
)


# ============================================================
# GET MEMBER RECOMMENDATIONS
# ============================================================

@router.get("/{member_id}")
def get_recommendations(
    member_id: str,
):
    """
    Get intervention recommendations for one member.

    Workflow:

        GET /recommendations/{member_id}
                    |
                    v
             Find member
                    |
                    v
          Get latest prediction
                    |
                    v
       Check existing RAG intervention
             /              \
           YES              NO
            |                |
            v                v
       Return stored       Run RAG
       recommendation       |
                             v
                      Save Intervention
                             |
                             v
                    Return recommendation

    Existing recommendations for the same member + prediction
    are reused instead of running RAG/Gemini again.
    """

    member_id = member_id.strip()

    if not member_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="member_id is required.",
        )

    try:

        result = get_or_generate_recommendations(
            member_id
        )

        return result

    except ValueError as exc:

        message = str(exc)

        if "not found" in message.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=message,
            )

        if (
            "no prediction" in message.lower()
            or "no risk prediction" in message.lower()
        ):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=message,
            )

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message,
        )

    except RuntimeError as exc:

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        )

    except Exception as exc:

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Recommendation generation failed: "
                f"{str(exc)}"
            ),
        )