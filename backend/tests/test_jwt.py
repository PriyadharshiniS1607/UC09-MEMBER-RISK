import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parents[1]))
from app.security.jwt import (
    create_access_token,
    decode_access_token,
)


def main():
    print("=" * 60)
    print("JWT SECURITY TEST")
    print("=" * 60)

    user_id = 1
    username = "testuser"
    role = "user"

    # --------------------------------------------------
    # Create token
    # --------------------------------------------------

    token = create_access_token(
        user_id=user_id,
        username=username,
        role=role,
    )

    print("\nJWT created:")
    print(token)

    assert isinstance(token, str)
    assert len(token) > 0

    # --------------------------------------------------
    # Decode token
    # --------------------------------------------------

    payload = decode_access_token(token)

    print("\nDecoded payload:")
    print(payload)

    # --------------------------------------------------
    # Validate payload
    # --------------------------------------------------

    assert payload["sub"] == "1"
    assert payload["username"] == "testuser"
    assert payload["role"] == "user"

    print("\nPayload validation:")
    print("User ID :", payload["sub"])
    print("Username:", payload["username"])
    print("Role    :", payload["role"])

    print("\n" + "=" * 60)
    print("JWT SECURITY TEST PASSED")
    print("=" * 60)


if __name__ == "__main__":
    main()