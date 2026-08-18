from sqlalchemy.orm import Session
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parents[1]))
from app.database.connection import SessionLocal
from app.database.crud import get_user_by_username
from app.services.auth_service import (
    authenticate_user,
    login_user,
    register_user,
)


TEST_USERNAME = "security_test_user"
TEST_EMAIL = "security_test@example.com"
TEST_PASSWORD = "TestPassword123!"


def main():
    print("=" * 60)
    print("DATABASE USER AUTHENTICATION TEST")
    print("=" * 60)

    db: Session = SessionLocal()

    try:
        # --------------------------------------------------
        # 1. Check whether test user already exists
        # --------------------------------------------------

        existing_user = get_user_by_username(
            db,
            TEST_USERNAME,
        )

        if existing_user:
            print("\nTest user already exists.")
            print("User ID :", existing_user.id)
            print("Username:", existing_user.username)
            print("Email   :", existing_user.email)
            print("Role    :", existing_user.role)

            user = existing_user

        else:
            # --------------------------------------------------
            # 2. Create test user
            # --------------------------------------------------

            print("\nCreating test user...")

            user = register_user(
                db=db,
                username=TEST_USERNAME,
                email=TEST_EMAIL,
                password=TEST_PASSWORD,
                role="user",
            )

            print("User created successfully.")

        print("\nUser:")
        print("ID      :", user.id)
        print("Username:", user.username)
        print("Email   :", user.email)
        print("Role    :", user.role)
        print("Active  :", user.is_active)

        assert user.is_active is True

        # --------------------------------------------------
        # 3. Authenticate with correct password
        # --------------------------------------------------

        authenticated_user = authenticate_user(
            db=db,
            username=TEST_USERNAME,
            password=TEST_PASSWORD,
        )

        print("\nCorrect password authentication:")
        print(
            "Authenticated:",
            authenticated_user is not None,
        )

        assert authenticated_user is not None
        assert authenticated_user.id == user.id

        # --------------------------------------------------
        # 4. Authenticate with incorrect password
        # --------------------------------------------------

        wrong_user = authenticate_user(
            db=db,
            username=TEST_USERNAME,
            password="WrongPassword123!",
        )

        print("\nIncorrect password authentication:")
        print(
            "Authenticated:",
            wrong_user is not None,
        )

        assert wrong_user is None

        # --------------------------------------------------
        # 5. Login and create JWT
        # --------------------------------------------------

        login_result = login_user(
            db=db,
            username=TEST_USERNAME,
            password=TEST_PASSWORD,
        )

        print("\nLogin result:")
        print(
            "Token generated:",
            login_result is not None,
        )

        assert login_result is not None
        assert "access_token" in login_result
        assert login_result["token_type"] == "bearer"

        print(
            "Token type:",
            login_result["token_type"],
        )

        print(
            "Token length:",
            len(login_result["access_token"]),
        )

        print("\nAuthenticated user returned:")
        print(login_result["user"])

        # --------------------------------------------------
        # SUCCESS
        # --------------------------------------------------

        print("\n" + "=" * 60)
        print("DATABASE USER AUTHENTICATION TEST PASSED")
        print("=" * 60)

    finally:
        db.close()


if __name__ == "__main__":
    main()