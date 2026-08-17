from sqlalchemy.orm import Session

from app.database.crud import (
    create_user,
    get_user_by_email,
    get_user_by_username,
)
from app.security.jwt import create_access_token
from app.security.password import (
    hash_password,
    verify_password,
)


def register_user(
    db: Session,
    username: str,
    email: str,
    password: str,
    role: str = "user",
):
    """
    Register a new user.
    """

    if get_user_by_username(db, username):
        raise ValueError(
            "Username already exists"
        )

    if get_user_by_email(db, email):
        raise ValueError(
            "Email already exists"
        )

    password_hash = hash_password(password)

    return create_user(
        db=db,
        username=username,
        email=email,
        password_hash=password_hash,
        role=role,
    )


def authenticate_user(
    db: Session,
    username: str,
    password: str,
):
    """
    Authenticate a user using username/password.
    """

    user = get_user_by_username(
        db,
        username,
    )

    if user is None:
        return None

    if not user.is_active:
        return None

    if not verify_password(
        password,
        user.password_hash,
    ):
        return None

    return user


def login_user(
    db: Session,
    username: str,
    password: str,
):
    """
    Authenticate the user and create a JWT.
    """

    user = authenticate_user(
        db,
        username,
        password,
    )

    if user is None:
        return None

    access_token = create_access_token(
        user_id=user.id,
        username=user.username,
        role=user.role,
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
        },
    }