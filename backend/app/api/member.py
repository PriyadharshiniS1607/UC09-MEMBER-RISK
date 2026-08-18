from fastapi import APIRouter, Depends

from app.security.permissions import require_member_access


router = APIRouter(
    prefix="/members",
    tags=["Members"],
)


# ============================================================
# GET /members
# ============================================================

@router.get("/")
def get_members(
    current_user=Depends(require_member_access()),
):
    """
    Return members accessible to the authenticated payer user.

    All four payer roles have member access.
    """

    return {
        "message": "Member API is authenticated",
        "requested_by": {
            "id": current_user.id,
            "username": current_user.username,
            "role": current_user.role,
        },
        "members": [],
    }


# ============================================================
# GET /members/{member_id}
# ============================================================

@router.get("/{member_id}")
def get_member(
    member_id: str,
    current_user=Depends(require_member_access()),
):
    """
    Return a specific member.

    All four payer roles have member access.
    """

    return {
        "message": "Member API is authenticated",
        "member_id": member_id,
        "requested_by": {
            "id": current_user.id,
            "username": current_user.username,
            "role": current_user.role,
        },
    }