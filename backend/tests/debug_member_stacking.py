import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parents[1]))
import pandas as pd
from app.utils.preprocessing import preprocess_input

from app.services.prediction_service import (
    final_catboost,
    final_lightgbm,
    final_xgboost,
    meta_model,
    FEATURES,
)


DATA_PATH = "data/UC09_FINAL_MEMBER_RISK_DATASET.csv"
MEMBER_ID = "M06253"

COLAB_PREDICTION = 68.909683


# ---------------------------------------------------------
# Load exact member
# ---------------------------------------------------------

df = pd.read_csv(DATA_PATH)

member_df = df[
    df["member_id"].astype(str) == MEMBER_ID
].copy()

if member_df.empty:
    raise ValueError(f"{MEMBER_ID} not found.")

member = member_df.iloc[0]

# Convert to one-row DataFrame
raw_df = pd.DataFrame([member.to_dict()])


# ---------------------------------------------------------
# Preprocess
# ---------------------------------------------------------

X_model, _ = preprocess_input(raw_df)

print("=" * 70)
print("M06253 STACKING DEBUG")
print("=" * 70)

print("\nInput shape:", X_model.shape)
print("Expected features:", len(FEATURES))

print(
    "Feature order correct:",
    list(X_model.columns) == list(FEATURES)
)


# ---------------------------------------------------------
# Base models
# ---------------------------------------------------------

cat_pred = final_catboost.predict(X_model)
lgb_pred = final_lightgbm.predict(X_model)
xgb_pred = final_xgboost.predict(X_model)


print("\n" + "=" * 70)
print("BASE MODEL PREDICTIONS")
print("=" * 70)

print("CatBoost :", cat_pred[0])
print("LightGBM :", lgb_pred[0])
print("XGBoost  :", xgb_pred[0])


# ---------------------------------------------------------
# Meta model
# ---------------------------------------------------------

meta_input = pd.DataFrame({
    "CatBoost": cat_pred,
    "LightGBM": lgb_pred,
    "XGBoost": xgb_pred,
})


print("\n" + "=" * 70)
print("META MODEL INPUT")
print("=" * 70)

print(meta_input)


meta_pred = meta_model.predict(meta_input)


print("\n" + "=" * 70)
print("FINAL COMPARISON")
print("=" * 70)

print("Colab prediction   :", COLAB_PREDICTION)
print("Backend prediction :", meta_pred[0])
print("Difference         :", abs(
    COLAB_PREDICTION - meta_pred[0]
))

print("=" * 70)