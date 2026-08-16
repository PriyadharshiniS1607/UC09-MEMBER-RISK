import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parents[1]))
import pandas as pd
from app.services.prediction_service import stacking_predict, FEATURES


COLAB_FILE = "data/UC09_3Model_Stacking_Test_Predictions.csv"

df = pd.read_csv(COLAB_FILE)

row = df.iloc[0].copy()

# Remove prediction/output columns
for col in [
    "ACTUAL_COMBINED_RISK_SCORE",
    "PREDICTED_COMBINED_RISK_SCORE",
    "ABSOLUTE_ERROR"
]:
    if col in row.index:
        row = row.drop(col)

# IMPORTANT:
# Take the columns exactly in the order expected by the model.
X = pd.DataFrame([row.to_dict()])

# Add missing expected features if necessary
for feature in FEATURES:
    if feature not in X.columns:
        X[feature] = 0

# Exact model order
X = X[FEATURES].copy()

print("Input shape:", X.shape)
print("Input columns match FEATURES:", list(X.columns) == list(FEATURES))

print("\nGender:")
print(X[["gender_Male"]])

colab_prediction = float(
    df.iloc[0]["PREDICTED_COMBINED_RISK_SCORE"]
)

backend_prediction = float(
    stacking_predict(X)[0]
)

difference = abs(
    colab_prediction - backend_prediction
)

print("\n" + "=" * 60)
print("RAW COLAB ROW VS STACKING MODEL")
print("=" * 60)

print(f"Colab prediction   : {colab_prediction:.10f}")
print(f"Backend prediction : {backend_prediction:.10f}")
print(f"Difference         : {difference:.10f}")

if difference < 1e-5:
    print("\nPASS: Model artifact reproduces Colab prediction.")
else:
    print("\nCHECK: Difference exists even without preprocessing.")

print("=" * 60)