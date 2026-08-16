import json
from pathlib import Path

from app.services.prediction_service import predict_single_member


# ---------------------------------------------------------
# Paths
# ---------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parents[2]

THRESHOLDS_PATH = (
    BASE_DIR / "ml_models" / "risk_thresholds.json"
)


# ---------------------------------------------------------
# Load risk thresholds
# ---------------------------------------------------------

with open(THRESHOLDS_PATH, "r", encoding="utf-8") as f:
    RISK_THRESHOLDS = json.load(f)


LOW_MEDIUM = float(RISK_THRESHOLDS["LOW_MEDIUM"])
MEDIUM_HIGH = float(RISK_THRESHOLDS["MEDIUM_HIGH"])
HIGH_VERY_HIGH = float(RISK_THRESHOLDS["HIGH_VERY_HIGH"])


# ---------------------------------------------------------
# Risk classification
# ---------------------------------------------------------

def classify_risk(score: float) -> str:
    """
    Convert the combined risk score into a risk level.

    Thresholds are loaded from risk_thresholds.json.

    <= 25       -> LOW
    <= 50       -> MEDIUM
    <= 75       -> HIGH
    > 75        -> VERY HIGH
    """

    score = float(score)

    if score <= LOW_MEDIUM:
        return "LOW"

    elif score <= MEDIUM_HIGH:
        return "MEDIUM"

    elif score <= HIGH_VERY_HIGH:
        return "HIGH"

    else:
        return "VERY HIGH"


# ---------------------------------------------------------
# Main risk prediction
# ---------------------------------------------------------

def get_risk_prediction(row):
    """
    Run the prediction pipeline and attach the risk level.

    Parameters
    ----------
    row : pandas.Series or dict
        Single member record.

    Returns
    -------
    dict
        Prediction result containing member_id,
        combined_risk_score and risk_level.
    """

    prediction = predict_single_member(row)

    score = float(prediction["combined_risk_score"])

    result = {
        "combined_risk_score": score,
        "risk_level": classify_risk(score),
    }

    if prediction.get("member_id") is not None:
        result["member_id"] = prediction["member_id"]

    return result


# ---------------------------------------------------------
# Batch risk prediction
# ---------------------------------------------------------

def get_risk_predictions(df):
    """
    Predict risk for multiple members.

    Parameters
    ----------
    df : pandas.DataFrame
        Member records.

    Returns
    -------
    list[dict]
        Risk prediction for every member.
    """

    results = []

    for _, row in df.iterrows():

        prediction = get_risk_prediction(row)

        results.append(prediction)

    return results