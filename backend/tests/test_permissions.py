from unittest.mock import MagicMock
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parents[1]))
from app.security.permissions import (
    PAYER_ADMIN,
    CLINICAL_ANALYST,
    CARE_MANAGER,
    PAYER_VIEWER,
    VALID_ROLES,
    require_role,
    require_prediction_access,
    require_shap_access,
    require_member_access,
    require_intervention_access,
)


print("=" * 60)
print("ROLE-BASED AUTHORIZATION TEST")
print("=" * 60)


# ------------------------------------------------------------
# 1. Verify configured roles
# ------------------------------------------------------------

print("\nConfigured payer roles:")

for role in VALID_ROLES:
    print(" -", role)

assert VALID_ROLES == {
    PAYER_ADMIN,
    CLINICAL_ANALYST,
    CARE_MANAGER,
    PAYER_VIEWER,
}


# ------------------------------------------------------------
# Helper
# ------------------------------------------------------------

def check_permission(permission_dependency, role):
    """
    Execute the role checker with a mocked authenticated user.
    """

    checker = permission_dependency()

    user = MagicMock()
    user.role = role

    return checker(current_user=user)


def should_allow(permission_dependency, role):
    check_permission(permission_dependency, role)


def should_deny(permission_dependency, role):
    try:
        check_permission(permission_dependency, role)

    except Exception as exc:
        # FastAPI HTTPException
        assert getattr(exc, "status_code", None) == 403
        return

    raise AssertionError(
        f"{role} was incorrectly allowed"
    )


# ------------------------------------------------------------
# 2. Prediction permissions
# ------------------------------------------------------------

print("\nPrediction API:")

prediction_allowed = [
    PAYER_ADMIN,
    CLINICAL_ANALYST,
    CARE_MANAGER,
]

prediction_denied = [
    PAYER_VIEWER,
]

for role in prediction_allowed:
    should_allow(require_prediction_access, role)
    print(f"  {role}: ALLOWED")

for role in prediction_denied:
    should_deny(require_prediction_access, role)
    print(f"  {role}: DENIED")


# ------------------------------------------------------------
# 3. SHAP permissions
# ------------------------------------------------------------

print("\nSHAP explanation API:")

shap_allowed = [
    PAYER_ADMIN,
    CLINICAL_ANALYST,
    CARE_MANAGER,
]

shap_denied = [
    PAYER_VIEWER,
]

for role in shap_allowed:
    should_allow(require_shap_access, role)
    print(f"  {role}: ALLOWED")

for role in shap_denied:
    should_deny(require_shap_access, role)
    print(f"  {role}: DENIED")


# ------------------------------------------------------------
# 4. Member permissions
# ------------------------------------------------------------

print("\nMember API:")

member_allowed = [
    PAYER_ADMIN,
    CLINICAL_ANALYST,
    CARE_MANAGER,
    PAYER_VIEWER,
]

for role in member_allowed:
    should_allow(require_member_access, role)
    print(f"  {role}: ALLOWED")


# ------------------------------------------------------------
# 5. Intervention permissions
# ------------------------------------------------------------

print("\nIntervention email API:")

intervention_allowed = [
    PAYER_ADMIN,
    CARE_MANAGER,
]

intervention_denied = [
    CLINICAL_ANALYST,
    PAYER_VIEWER,
]

for role in intervention_allowed:
    should_allow(require_intervention_access, role)
    print(f"  {role}: ALLOWED")

for role in intervention_denied:
    should_deny(require_intervention_access, role)
    print(f"  {role}: DENIED")


# ------------------------------------------------------------
# 6. Admin permissions
# ------------------------------------------------------------

print("\nAdmin-only access:")

admin_checker = require_role(PAYER_ADMIN)

admin_user = MagicMock()
admin_user.role = PAYER_ADMIN

admin_result = admin_checker(
    current_user=admin_user
)

assert admin_result is admin_user

print("  payer_admin: ALLOWED")


for role in [
    CLINICAL_ANALYST,
    CARE_MANAGER,
    PAYER_VIEWER,
]:
    user = MagicMock()
    user.role = role

    try:
        admin_checker(
            current_user=user
        )

    except Exception as exc:
        assert getattr(exc, "status_code", None) == 403
        print(f"  {role}: DENIED")

    else:
        raise AssertionError(
            f"{role} was incorrectly allowed"
        )


# ------------------------------------------------------------
# SUCCESS
# ------------------------------------------------------------

print("\n" + "=" * 60)
print("ROLE-BASED AUTHORIZATION TEST PASSED")
print("=" * 60)