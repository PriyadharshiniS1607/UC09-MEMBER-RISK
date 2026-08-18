from fastapi import Depends, HTTPException, status

from app.security.auth import get_current_user


PAYER_ADMIN = "payer_admin"
CLINICAL_ANALYST = "clinical_analyst"
CARE_MANAGER = "care_manager"
PAYER_VIEWER = "payer_viewer"


VALID_ROLES = {
    PAYER_ADMIN,
    CLINICAL_ANALYST,
    CARE_MANAGER,
    PAYER_VIEWER,
}


def require_role(*allowed_roles: str):
    """
    Require the authenticated user to have one
    of the specified payer roles.
    """

    invalid_roles = set(allowed_roles) - VALID_ROLES

    if invalid_roles:
        raise ValueError(
            f"Invalid role(s): {', '.join(sorted(invalid_roles))}"
        )

    def role_checker(
        current_user=Depends(get_current_user),
    ):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )

        return current_user

    return role_checker


def require_payer_admin():
    return require_role(PAYER_ADMIN)


def require_clinical_analyst():
    return require_role(CLINICAL_ANALYST)


def require_care_manager():
    return require_role(CARE_MANAGER)


def require_payer_viewer():
    return require_role(PAYER_VIEWER)


def require_prediction_access():
    return require_role(
        PAYER_ADMIN,
        CLINICAL_ANALYST,
        CARE_MANAGER,
    )


def require_shap_access():
    return require_role(
        PAYER_ADMIN,
        CLINICAL_ANALYST,
        CARE_MANAGER,
    )


def require_member_access():
    return require_role(
        PAYER_ADMIN,
        CLINICAL_ANALYST,
        CARE_MANAGER,
        PAYER_VIEWER,
    )


def require_intervention_access():
    return require_role(
        PAYER_ADMIN,
        CARE_MANAGER,
    )