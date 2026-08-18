from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.database.models import Member, RiskPrediction, ShapExplanation, Intervention
from app.security.permissions import require_member_access


router = APIRouter(
    prefix="/members",
    tags=["Members"],
)


def serialize_member(member: Member) -> Dict[str, Any]:
    """
    Serialize a Member database instance into a rich API dictionary
    including latest risk predictions, SHAP feature drivers, and SDOH context.
    """
    # Retrieve latest risk prediction if available
    latest_prediction = (
        sorted(member.risk_predictions, key=lambda p: p.id, reverse=True)[0]
        if member.risk_predictions
        else None
    )

    # Retrieve latest SHAP explanation if available
    latest_shap = (
        sorted(member.shap_explanations, key=lambda s: s.id, reverse=True)[0]
        if member.shap_explanations
        else None
    )

    risk_score = float(latest_prediction.risk_score) if latest_prediction else 0.0
    risk_category = str(latest_prediction.risk_category) if latest_prediction else "LOW"
    top_drivers = latest_shap.top_risk_drivers if latest_shap and latest_shap.top_risk_drivers else []

    return {
        "id": member.id,
        "member_id": member.member_id,
        # Demographics
        "age": member.age,
        "gender": member.gender,
        "state_fips": member.state_fips,
        "county_fips": member.county_fips,
        # Clinical
        "diabetes": member.diabetes,
        "hypertension": member.hypertension,
        "heart_disease": member.heart_disease,
        "copd": member.copd,
        "obesity": member.obesity,
        "cancer": member.cancer,
        "chronic_condition_count": member.chronic_condition_count,
        # Utilization
        "total_encounters": member.total_encounters,
        "ed_visits": member.ed_visits,
        "hospitalizations": member.hospitalizations,
        "medication_count": member.medication_count,
        "preventive_care_gap": member.preventive_care_gap,
        # SVI / SDOH Variables
        "ep_pov150": member.ep_pov150,
        "ep_unemp": member.ep_unemp,
        "ep_hburd": member.ep_hburd,
        "ep_nohsdp": member.ep_nohsdp,
        "ep_uninsur": member.ep_uninsur,
        "ep_age65": member.ep_age65,
        "ep_age17": member.ep_age17,
        "ep_disabl": member.ep_disabl,
        "ep_sngpnt": member.ep_sngpnt,
        "ep_limeng": member.ep_limeng,
        "ep_minrty": member.ep_minrty,
        "ep_munit": member.ep_munit,
        "ep_mobile": member.ep_mobile,
        "ep_crowd": member.ep_crowd,
        "ep_noveh": member.ep_noveh,
        "ep_groupq": member.ep_groupq,
        "rpl_themes": member.rpl_themes,
        # CDC PLACES Variables
        "diabetes_adjprev": member.diabetes_adjprev,
        "obesity_adjprev": member.obesity_adjprev,
        "csmoking_adjprev": member.csmoking_adjprev,
        "lpa_adjprev": member.lpa_adjprev,
        "bphigh_adjprev": member.bphigh_adjprev,
        "highchol_adjprev": member.highchol_adjprev,
        "chd_adjprev": member.chd_adjprev,
        "stroke_adjprev": member.stroke_adjprev,
        "copd_adjprev": member.copd_adjprev,
        "casthma_adjprev": member.casthma_adjprev,
        "cancer_adjprev": member.cancer_adjprev,
        "depression_adjprev": member.depression_adjprev,
        "mhlth_adjprev": member.mhlth_adjprev,
        "phlth_adjprev": member.phlth_adjprev,
        "ghlth_adjprev": member.ghlth_adjprev,
        "arthritis_adjprev": member.arthritis_adjprev,
        "disability_adjprev": member.disability_adjprev,
        "indeplive_adjprev": member.indeplive_adjprev,
        # Food Access Variables
        "children_low_access_pct": member.children_low_access_pct,
        "no_vehicle_low_access_pct": member.no_vehicle_low_access_pct,
        "low_income_low_access_pct": member.low_income_low_access_pct,
        "low_food_access_pct": member.low_food_access_pct,
        "seniors_low_access_pct": member.seniors_low_access_pct,
        # Latest Prediction & SHAP
        "risk_score": risk_score,
        "risk_category": risk_category,
        "top_risk_drivers": top_drivers,
        "prediction_id": latest_prediction.id if latest_prediction else None,
        "prediction_date": (
            latest_prediction.created_at.isoformat()
            if latest_prediction and latest_prediction.created_at
            else None
        ),
        "created_at": member.created_at.isoformat() if member.created_at else None,
        "updated_at": member.updated_at.isoformat() if member.updated_at else None,
    }


# ============================================================
# GET /members
# ============================================================

@router.get("/")
def get_members(
    current_user=Depends(require_member_access()),
    db: Session = Depends(get_db),
):
    """
    Return all members stored in PostgreSQL accessible to the authenticated payer user.
    Includes latest ML risk score, risk tier, and top SHAP features.
    """
    members = db.query(Member).order_by(Member.id).all()
    serialized = [serialize_member(m) for m in members]

    return {
        "message": "Members retrieved successfully from PostgreSQL",
        "requested_by": {
            "id": current_user.id,
            "username": current_user.username,
            "role": current_user.role,
        },
        "total_members": len(serialized),
        "members": serialized,
    }


# ============================================================
# GET /members/{member_id}
# ============================================================

@router.get("/{member_id}")
def get_member(
    member_id: str,
    current_user=Depends(require_member_access()),
    db: Session = Depends(get_db),
):
    """
    Return a specific member by business member_id or database integer PK.
    """
    member = (
        db.query(Member)
        .filter(
            (Member.member_id == member_id)
            | (Member.id == int(member_id) if member_id.isdigit() else False)
        )
        .first()
    )

    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Member '{member_id}' not found in cohort database.",
        )

    return {
        "message": "Member details retrieved successfully",
        "requested_by": {
            "id": current_user.id,
            "username": current_user.username,
            "role": current_user.role,
        },
        "member": serialize_member(member),
    }