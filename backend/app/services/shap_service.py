import pickle
import joblib
from pathlib import Path

import numpy as np
import pandas as pd
import shap

from app.utils.preprocessing import preprocess_input


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parents[2]

ENSEMBLE_PATH = (
    BASE_DIR
    / "ml_models"
    / "UC09_3Model_Stacking_Ensemble.pkl"
)

SHAP_BACKGROUND_PATH = (
    BASE_DIR
    / "ml_models"
    / "shap_background.pkl"
)


# ============================================================
# LOAD STACKING ENSEMBLE
# ============================================================

# IMPORTANT:
# Use joblib here because this is how the working
# prediction_service.py loads the stacking package.

stacking_package = joblib.load(
    ENSEMBLE_PATH
)


# ============================================================
# EXTRACT MODELS
# ============================================================

catboost_model = stacking_package["catboost"]

lightgbm_model = stacking_package["lightgbm"]

xgboost_model = stacking_package["xgboost"]

meta_model = stacking_package["meta_model"]


# Exact feature order used during model training
FEATURES = list(
    stacking_package["features"]
)


# ============================================================
# LOAD SHAP BACKGROUND
# ============================================================

with open(
    SHAP_BACKGROUND_PATH,
    "rb"
) as f:
    SHAP_BACKGROUND = pickle.load(f)


# Validate background
if not isinstance(
    SHAP_BACKGROUND,
    pd.DataFrame
):
    raise TypeError(
        "shap_background.pkl must contain "
        "a pandas DataFrame."
    )


# Make absolutely sure the background uses
# the same 54 features and exact order.
SHAP_BACKGROUND = SHAP_BACKGROUND[
    FEATURES
].copy()


# ============================================================
# VALIDATION
# ============================================================

if len(FEATURES) != 54:
    raise ValueError(
        f"Expected 54 model features, "
        f"got {len(FEATURES)}."
    )


if SHAP_BACKGROUND.shape[1] != 54:
    raise ValueError(
        "SHAP background must contain "
        "exactly 54 features."
    )


# ============================================================
# RIDGE META MODEL PARAMETERS
# ============================================================

META_COEFFICIENTS = np.asarray(
    meta_model.coef_,
    dtype=float
).reshape(-1)


META_INTERCEPT = float(
    np.asarray(
        meta_model.intercept_
    ).reshape(-1)[0]
)


# ============================================================
# SHAP EXPLAINERS
# ============================================================

catboost_explainer = shap.TreeExplainer(
    catboost_model,
    data=SHAP_BACKGROUND
)


lightgbm_explainer = shap.TreeExplainer(
    lightgbm_model,
    data=SHAP_BACKGROUND
)


xgboost_explainer = shap.TreeExplainer(
    xgboost_model,
    data=SHAP_BACKGROUND
)


# ============================================================
# PREPARE MEMBER INPUT
# ============================================================

def _prepare_input(row):
    """
    Convert a single member record into the exact
    54-feature matrix expected by the ensemble.
    """

    df = pd.DataFrame([row])

    X_model, processed_df = preprocess_input(
        df
    )

    # Explicitly enforce model feature order
    X_model = X_model[
        FEATURES
    ].copy()

    return X_model, processed_df


# ============================================================
# GET SHAP VALUES
# ============================================================

def _get_shap_values(
    explainer,
    X
):
    """
    Get SHAP values and normalize their shape
    so the result is always:

        (number_of_rows, number_of_features)
    """

    values = explainer.shap_values(
        X
    )

    # Some SHAP/model combinations return
    # a list of arrays.
    if isinstance(
        values,
        list
    ):
        values = values[0]

    values = np.asarray(
        values
    )

    # Handle possible 3D output
    if values.ndim == 3:
        values = values[:, :, 0]

    if values.ndim != 2:
        raise ValueError(
            "Unexpected SHAP output shape: "
            f"{values.shape}"
        )

    return values


# ============================================================
# EXPLAIN SINGLE MEMBER
# ============================================================

def explain_member(
    row,
    top_n=10
):
    """
    Explain the final stacking ensemble prediction.

    Pipeline:

        Member
          |
          v
        preprocessing
          |
          v
        54 features
          |
          +----> CatBoost
          |
          +----> LightGBM
          |
          +----> XGBoost
          |
          v
        Ridge meta-model
          |
          v
        Final risk score

    SHAP explanations are generated for each
    tree model and combined using the Ridge
    meta-model coefficients.
    """

    # --------------------------------------------------------
    # Prepare input
    # --------------------------------------------------------

    X_model, processed_df = _prepare_input(
        row
    )


    # --------------------------------------------------------
    # Base model predictions
    # --------------------------------------------------------

    cat_pred = float(
        catboost_model.predict(
            X_model
        )[0]
    )

    lgb_pred = float(
        lightgbm_model.predict(
            X_model
        )[0]
    )

    xgb_pred = float(
        xgboost_model.predict(
            X_model
        )[0]
    )


    # --------------------------------------------------------
    # Ridge meta-model input
    # --------------------------------------------------------

    meta_input = pd.DataFrame(
        {
            "CatBoost": [cat_pred],
            "LightGBM": [lgb_pred],
            "XGBoost": [xgb_pred]
        }
    )


    # --------------------------------------------------------
    # Final ensemble prediction
    # --------------------------------------------------------

    final_prediction = float(
        meta_model.predict(
            meta_input
        )[0]
    )


    # --------------------------------------------------------
    # SHAP values
    # --------------------------------------------------------

    cat_shap = _get_shap_values(
        catboost_explainer,
        X_model
    )[0]


    lgb_shap = _get_shap_values(
        lightgbm_explainer,
        X_model
    )[0]


    xgb_shap = _get_shap_values(
        xgboost_explainer,
        X_model
    )[0]


    # --------------------------------------------------------
    # Combine SHAP values
    #
    # Ridge:
    #
    # final =
    #     coef_cat * cat_prediction
    #   + coef_lgb * lgb_prediction
    #   + coef_xgb * xgb_prediction
    #   + intercept
    #
    # Therefore the feature-level contributions are
    # weighted by the same coefficients.
    # --------------------------------------------------------

    ensemble_shap = (
        META_COEFFICIENTS[0]
        * cat_shap

        + META_COEFFICIENTS[1]
        * lgb_shap

        + META_COEFFICIENTS[2]
        * xgb_shap
    )


    # --------------------------------------------------------
    # Rank features
    # --------------------------------------------------------

    ranking = pd.DataFrame(
        {
            "feature": FEATURES,
            "shap_value": ensemble_shap
        }
    )


    ranking["abs_shap"] = (
        ranking["shap_value"]
        .abs()
    )


    ranking = ranking.sort_values(
        "abs_shap",
        ascending=False
    )


    ranking = ranking.head(
        top_n
    )


    # --------------------------------------------------------
    # Build risk drivers
    # --------------------------------------------------------

    risk_drivers = []


    for _, item in ranking.iterrows():

        feature = item[
            "feature"
        ]

        shap_value = float(
            item[
                "shap_value"
            ]
        )

        feature_value = X_model.iloc[
            0
        ][feature]


        # Determine direction
        if shap_value > 0:

            direction = (
                "increases_risk"
            )

        elif shap_value < 0:

            direction = (
                "decreases_risk"
            )

        else:

            direction = (
                "neutral"
            )


        risk_drivers.append(
            {
                "feature": feature,

                "value": float(
                    feature_value
                ),

                "shap_value": shap_value,

                "impact": abs(
                    shap_value
                ),

                "direction": direction
            }
        )


    # --------------------------------------------------------
    # Member ID
    # --------------------------------------------------------

    member_id = None


    if (
        "member_id"
        in processed_df.columns
    ):

        member_id = str(
            processed_df.iloc[
                0
            ]["member_id"]
        )


    # --------------------------------------------------------
    # Return result
    # --------------------------------------------------------

    return {
        "member_id": member_id,

        "combined_risk_score": (
            final_prediction
        ),

        "base_predictions": {
            "catboost": cat_pred,
            "lightgbm": lgb_pred,
            "xgboost": xgb_pred
        },

        "risk_drivers": risk_drivers
    }


# ============================================================
# PUBLIC SERVICE FUNCTION
# ============================================================

def get_shap_explanation(
    row,
    top_n=10
):
    """
    Public function for API/service usage.
    """

    return explain_member(
        row,
        top_n=top_n
    )