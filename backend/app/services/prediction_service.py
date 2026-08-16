import joblib
import pandas as pd

from app.utils.preprocessing import preprocess_input


ENSEMBLE_PATH = "ml_models/UC09_3Model_Stacking_Ensemble.pkl"


# Load complete stacking package
stacking_package = joblib.load(ENSEMBLE_PATH)

final_catboost = stacking_package["catboost"]
final_lightgbm = stacking_package["lightgbm"]
final_xgboost = stacking_package["xgboost"]
meta_model = stacking_package["meta_model"]

FEATURES = stacking_package["features"]


def stacking_predict(X_input):

    X_input = pd.DataFrame(
        X_input,
        columns=FEATURES
    )

    cat_pred = final_catboost.predict(X_input)

    lgb_pred = final_lightgbm.predict(X_input)

    xgb_pred = final_xgboost.predict(X_input)

    meta_input = pd.DataFrame({
        "CatBoost": cat_pred,
        "LightGBM": lgb_pred,
        "XGBoost": xgb_pred
    })

    return meta_model.predict(meta_input)


def predict_member(df):

    X_model, processed_df = preprocess_input(df)

    predictions = stacking_predict(X_model)

    results = []

    for i, score in enumerate(predictions):

        result = {
            "combined_risk_score": float(score)
        }

        if "member_id" in processed_df.columns:
            result["member_id"] = str(
                processed_df.iloc[i]["member_id"]
            )

        results.append(result)

    return results


def predict_single_member(row):

    df = pd.DataFrame([row])

    return predict_member(df)[0]