from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.database.crud import get_user_by_id
from app.security.auth import get_current_user
from app.security.permissions import (
    PAYER_ADMIN,
    VALID_ROLES,
    require_payer_admin,
)
from app.services.auth_service import (
    register_user,
    login_user,
)


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


# ============================================================
# REQUEST MODELS
# ============================================================

class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8)
    confirm_password: str = Field(min_length=8)


class LoginRequest(BaseModel):
    username: str
    password: str


class RoleUpdateRequest(BaseModel):
    role: str


# ============================================================
# REGISTER
# ============================================================

@router.post("/register")
def register(
    request: RegisterRequest,
    db: Session = Depends(get_db),
):
    """
    Register a new payer user.

    All newly registered users receive the
    payer_viewer role by default.
    """

    if request.password != request.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match",
        )

    try:
        user = register_user(
            db=db,
            username=request.username,
            email=request.email,
            password=request.password,
            role="payer_viewer",
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        )

    return {
        "message": "User registered successfully",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
        },
    }


# ============================================================
# LOGIN
# ============================================================

@router.post("/login")
def login(
    request: LoginRequest,
    db: Session = Depends(get_db),
):
    """
    Authenticate a user and return a JWT access token.
    """

    result = login_user(
        db=db,
        username=request.username,
        password=request.password,
    )

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )

    return result


# ============================================================
# CURRENT USER
# ============================================================

@router.get("/me")
def get_me(
    current_user=Depends(get_current_user),
):
    """
    Return the currently authenticated user.
    """

    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "role": current_user.role,
        "is_active": current_user.is_active,
    }


# ============================================================
# ADMIN: LIST USERS
# ============================================================

@router.get("/users")
def list_users(
    db: Session = Depends(get_db),
    current_user=Depends(require_payer_admin()),
):
    """
    List all users.

    Payer admin only.
    """

    from app.database.models import User

    users = (
        db.query(User)
        .order_by(User.id)
        .all()
    )

    return {
        "users": [
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role,
                "is_active": user.is_active,
                "created_at": user.created_at,
            }
            for user in users
        ]
    }


# ============================================================
# ADMIN: CHANGE USER ROLE
# ============================================================

@router.patch("/users/{user_id}/role")
def update_user_role(
    user_id: int,
    request: RoleUpdateRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_payer_admin()),
):
    """
    Change a user's role.

    Only payer_admin can perform this operation.
    """

    new_role = request.role.strip().lower()

    # --------------------------------------------------------
    # Validate role
    # --------------------------------------------------------

    if new_role not in VALID_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "Invalid role",
                "allowed_roles": sorted(VALID_ROLES),
            },
        )

    # --------------------------------------------------------
    # Find target user
    # --------------------------------------------------------

    user = get_user_by_id(
        db,
        user_id,
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # --------------------------------------------------------
    # Prevent admin from accidentally changing themselves
    # --------------------------------------------------------

    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot change your own role",
        )

    # --------------------------------------------------------
    # Update role
    # --------------------------------------------------------

    old_role = user.role

    user.role = new_role

    db.commit()
    db.refresh(user)

    return {
        "message": "User role updated successfully",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "old_role": old_role,
            "new_role": user.role,
        },
    }