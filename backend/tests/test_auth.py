import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parents[1]))
from app.security.password import (
    hash_password,
    verify_password,
)


def main():
    print("=" * 60)
    print("AUTHENTICATION SECURITY TEST")
    print("=" * 60)

    password = "TestPassword123!"

    # --------------------------------------------------
    # 1. Hash password
    # --------------------------------------------------

    hashed = hash_password(password)

    print("\nPassword hashing:")
    print("Original password :", password)
    print("Password hash     :", hashed)

    assert hashed != password

    # --------------------------------------------------
    # 2. Verify correct password
    # --------------------------------------------------

    correct_result = verify_password(
        password,
        hashed,
    )

    print("\nCorrect password verification:")
    print("Result:", correct_result)

    assert correct_result is True

    # --------------------------------------------------
    # 3. Verify incorrect password
    # --------------------------------------------------

    wrong_result = verify_password(
        "WrongPassword123!",
        hashed,
    )

    print("\nIncorrect password verification:")
    print("Result:", wrong_result)

    assert wrong_result is False

    # --------------------------------------------------
    # SUCCESS
    # --------------------------------------------------

    print("\n" + "=" * 60)
    print("PASSWORD SECURITY TEST PASSED")
    print("=" * 60)


if __name__ == "__main__":
    main()