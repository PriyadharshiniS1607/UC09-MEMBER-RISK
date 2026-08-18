from typing import Any

def build_rag_context(
    member: Any,
    risk_prediction: Any,
    shap_explanation: Any,
) -> dict:
    """
    Build the complete member-specific context consumed by
    the intervention RAG pipeline.
    """

    top_risk_drivers = shap_explanation.top_risk_drivers or []

    # Keep the SHAP ordering produced by the ML pipeline.
    # Do not reorder by absolute impact here.
    drivers = [
        {
            "feature": item.get("feature"),
            "value": item.get("value"),
            "shap_value": item.get("shap_value"),
            "impact": item.get("impact"),
            "direction": item.get("direction"),
        }
        for item in top_risk_drivers
    ]

    # Only drivers explicitly identified by SHAP as increasing risk
    # become primary intervention candidates.
    intervention_drivers = [
        driver
        for driver in drivers
        if driver["direction"] == "increases_risk"
    ]

    return {
        "member": {
            "member_id": member.member_id,
            "age": member.age,
            "gender": member.gender,

            "clinical": {
                "diabetes": member.diabetes,
                "hypertension": member.hypertension,
                "heart_disease": member.heart_disease,
                "copd": member.copd,
                "obesity": member.obesity,
                "cancer": member.cancer,
                "chronic_condition_count": member.chronic_condition_count,
            },

            "utilization": {
                "total_encounters": member.total_encounters,
                "ed_visits": member.ed_visits,
                "hospitalizations": member.hospitalizations,
                "medication_count": member.medication_count,
                "preventive_care_gap": member.preventive_care_gap,
            },

            "sdoh": {
                "ep_pov150": member.ep_pov150,
                "ep_unemp": member.ep_unemp,
                "ep_hburd": member.ep_hburd,
                "ep_nohsdp": member.ep_nohsdp,
                "ep_uninsur": member.ep_uninsur,
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
            },

            "food_access": {
                "children_low_access_pct": member.children_low_access_pct,
                "no_vehicle_low_access_pct": member.no_vehicle_low_access_pct,
                "low_income_low_access_pct": member.low_income_low_access_pct,
                "low_food_access_pct": member.low_food_access_pct,
                "seniors_low_access_pct": member.seniors_low_access_pct,
            },

            "cdc_places": {
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
            },
        },

        "risk": {
            "risk_score": risk_prediction.risk_score,
            "risk_category": risk_prediction.risk_category,
            "model_version": risk_prediction.model_version,
            "prediction_id": risk_prediction.id,
        },

        "shap": {
            "top_risk_drivers": drivers,
            "intervention_drivers": intervention_drivers,
        },
    }