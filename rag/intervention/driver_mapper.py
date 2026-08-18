from typing import Any


# ============================================================
# DRIVER → INTERVENTION CONCEPT MAPPING
# ============================================================

DRIVER_MAPPINGS = {
    # --------------------------------------------------------
    # Clinical conditions
    # --------------------------------------------------------

    "copd": {
        "domain": "clinical",
        "concept": "COPD management",
        "queries": [
            "COPD management",
            "COPD follow-up and treatment",
            "chronic respiratory disease management",
            "smoking cessation for COPD",
        ],
    },

    "diabetes": {
        "domain": "clinical",
        "concept": "Diabetes management",
        "queries": [
            "diabetes management",
            "type 2 diabetes preventive care",
            "diabetes screening and management",
        ],
    },

    "hypertension": {
        "domain": "clinical",
        "concept": "Hypertension management",
        "queries": [
            "hypertension management",
            "blood pressure screening",
            "hypertension follow-up",
        ],
    },

    "heart_disease": {
        "domain": "clinical",
        "concept": "Cardiovascular disease management",
        "queries": [
            "cardiovascular disease management",
            "heart disease preventive care",
            "cardiovascular risk reduction",
        ],
    },

    "obesity": {
        "domain": "clinical",
        "concept": "Weight management",
        "queries": [
            "weight management",
            "obesity prevention",
            "behavioral interventions for weight loss",
            "healthy diet and physical activity",
        ],
    },

    "cancer": {
        "domain": "clinical",
        "concept": "Cancer prevention and screening",
        "queries": [
            "cancer screening recommendations",
            "cancer prevention",
            "USPSTF cancer screening",
        ],
    },

    # --------------------------------------------------------
    # Healthcare utilization / care gaps
    # --------------------------------------------------------

    "preventive_care_gap": {
        "domain": "preventive_care",
        "concept": "Preventive care and recommended screening",
        "queries": [
            "preventive care screening recommendations",
            "USPSTF preventive screening",
            "preventive health services",
        ],
    },

    "medication_count": {
        "domain": "medication_management",
        "concept": "Medication management",
        "queries": [
            "medication adherence",
            "medication management",
            "medication review",
        ],
    },

    "ed_visits": {
        "domain": "healthcare_utilization",
        "concept": "Emergency department utilization",
        "queries": [
            "emergency department utilization",
            "reducing avoidable emergency department visits",
            "primary care access to reduce emergency department use",
        ],
    },

    "hospitalizations": {
        "domain": "healthcare_utilization",
        "concept": "Hospitalization prevention and care coordination",
        "queries": [
            "hospitalization prevention",
            "care coordination",
            "transitional care after hospitalization",
        ],
    },

    # --------------------------------------------------------
    # SDOH / economic stability
    # --------------------------------------------------------

    "ep_pov150": {
        "domain": "economic_stability",
        "concept": "Poverty and financial resource support",
        "queries": [
            "poverty social determinants of health",
            "financial resource support",
            "economic stability interventions",
        ],
    },

    "ep_unemp": {
        "domain": "economic_stability",
        "concept": "Employment and economic stability",
        "queries": [
            "employment social determinants of health",
            "unemployment economic stability",
            "employment support",
        ],
    },

    "ep_hburd": {
        "domain": "housing",
        "concept": "Housing cost burden and housing stability",
        "queries": [
            "housing instability",
            "housing cost burden",
            "housing assistance",
        ],
    },

    "ep_uninsur": {
        "domain": "healthcare_access",
        "concept": "Health insurance and healthcare access",
        "queries": [
            "health insurance access",
            "access to health services",
            "healthcare access barriers",
        ],
    },

    "ep_noveh": {
        "domain": "transportation",
        "concept": "Transportation access",
        "queries": [
            "transportation access healthcare",
            "transportation barriers to healthcare",
            "transportation social determinants of health",
        ],
    },

    "ep_limeng": {
        "domain": "healthcare_access",
        "concept": "Language and health literacy support",
        "queries": [
            "language barriers healthcare access",
            "health literacy",
            "language assistance healthcare",
        ],
    },

    "ep_disabl": {
        "domain": "social_community_context",
        "concept": "Disability support and accessible services",
        "queries": [
            "disability social determinants of health",
            "accessible healthcare services",
            "disability support",
        ],
    },

    # --------------------------------------------------------
    # Food access
    # --------------------------------------------------------

    "children_low_access_pct": {
        "domain": "food_access",
        "concept": "Food access support for children",
        "queries": [
            "food insecurity children",
            "food access children",
            "nutrition assistance children",
        ],
    },

    "no_vehicle_low_access_pct": {
        "domain": "food_access",
        "concept": "Transportation and food access",
        "queries": [
            "food access transportation barriers",
            "no vehicle food access",
            "food insecurity transportation",
        ],
    },

    "low_income_low_access_pct": {
        "domain": "food_access",
        "concept": "Low-income food access support",
        "queries": [
            "food insecurity low income households",
            "food assistance programs",
            "food access low income",
        ],
    },

    "low_food_access_pct": {
        "domain": "food_access",
        "concept": "Food access and food insecurity support",
        "queries": [
            "food insecurity",
            "food access interventions",
            "food assistance",
        ],
    },

    "seniors_low_access_pct": {
        "domain": "food_access",
        "concept": "Food access support for older adults",
        "queries": [
            "food insecurity older adults",
            "food access seniors",
            "nutrition assistance older adults",
        ],
    },

    # --------------------------------------------------------
    # CDC PLACES
    # --------------------------------------------------------

    "csmoking_adjprev": {
        "domain": "behavioral_health",
        "concept": "Smoking cessation",
        "queries": [
            "tobacco smoking cessation",
            "smoking cessation interventions",
            "USPSTF tobacco cessation",
        ],
    },

    "lpa_adjprev": {
        "domain": "physical_activity",
        "concept": "Physical activity promotion",
        "queries": [
            "physical activity health intervention",
            "healthy diet and physical activity",
            "physical activity counseling",
        ],
    },

    "depression_adjprev": {
        "domain": "behavioral_health",
        "concept": "Depression screening and support",
        "queries": [
            "depression screening",
            "depression treatment and support",
            "USPSTF depression screening",
        ],
    },

    "mhlth_adjprev": {
        "domain": "behavioral_health",
        "concept": "Mental health support",
        "queries": [
            "mental health services",
            "mental health social determinants",
            "behavioral health support",
        ],
    },

    "phlth_adjprev": {
        "domain": "health_status",
        "concept": "Poor physical health support",
        "queries": [
            "poor physical health health interventions",
            "chronic disease management",
            "access to primary care",
        ],
    },

    "ghlth_adjprev": {
        "domain": "health_status",
        "concept": "Overall health status and primary care support",
        "queries": [
            "primary care access",
            "preventive care",
            "health promotion",
        ],
    },

    "indeplive_adjprev": {
        "domain": "independent_living",
        "concept": "Independent living support",
        "queries": [
            "independent living older adults",
            "disability independent living support",
            "older adult functional support",
        ],
    },
}


def normalize_feature_name(feature: str | None) -> str:
    """
    Normalize model feature names so they can be matched
    against the intervention mapping.
    """

    if not feature:
        return ""

    normalized = feature.strip().lower()

    # Handle feature naming variations produced by ML datasets.
    aliases = {
        "indeplive_adjprev": "indeplive_adjprev",
        "indeplive_adjprev": "indeplive_adjprev",
        "indeplive_adjprev": "indeplive_adjprev",
        "INDEPLIVE_AdjPrev".lower(): "indeplive_adjprev",
    }

    return aliases.get(normalized, normalized)


def map_driver(driver: dict[str, Any]) -> dict[str, Any] | None:
    """
    Convert one SHAP driver into an intervention concept.

    Unknown features are deliberately ignored rather than
    inventing an intervention.
    """

    feature = normalize_feature_name(driver.get("feature"))

    mapping = DRIVER_MAPPINGS.get(feature)

    if mapping is None:
        return None

    return {
        "feature": driver.get("feature"),
        "value": driver.get("value"),
        "shap_value": driver.get("shap_value"),
        "impact": driver.get("impact"),
        "direction": driver.get("direction"),
        "domain": mapping["domain"],
        "concept": mapping["concept"],
        "retrieval_queries": mapping["queries"],
    }


def map_intervention_drivers(
    context: dict[str, Any],
) -> list[dict[str, Any]]:
    """
    Map SHAP intervention drivers into intervention concepts.

    For binary clinical features, a zero value means the member
    does not currently have that condition and should not receive
    a condition-specific intervention solely because SHAP contributed
    positively to the prediction.
    """

    shap_context = context.get("shap", {})
    drivers = shap_context.get("intervention_drivers", [])

    mapped = []

    binary_clinical_features = {
        "diabetes",
        "hypertension",
        "heart_disease",
        "copd",
        "obesity",
        "cancer",
    }

    for driver in drivers:
        feature = normalize_feature_name(driver.get("feature"))
        value = driver.get("value")

        if (
            feature in binary_clinical_features
            and value is not None
            and float(value) == 0.0
        ):
            continue

        result = map_driver(driver)

        if result is not None:
            mapped.append(result)

    return mapped