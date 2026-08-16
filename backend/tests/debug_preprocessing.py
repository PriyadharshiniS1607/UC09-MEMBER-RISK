import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parents[1]))
import pandas as pd
from app.utils.preprocessing import preprocess_input
from app.services.prediction_service import FEATURES


COLAB_FILE = "data/UC09_3Model_Stacking_Test_Predictions.csv"

df = pd.read_csv(COLAB_FILE)

row = df.iloc[0].copy()

# Remove prediction outputs
for col in [
    "ACTUAL_COMBINED_RISK_SCORE",
    "PREDICTED_COMBINED_RISK_SCORE",
    "ABSOLUTE_ERROR"
]:
    if col in row:
        row = row.drop(col)

raw_df = pd.DataFrame([row.to_dict()])

X_model, processed_df = preprocess_input(raw_df)

print("=" * 70)
print("PREPROCESSING DEBUG")
print("=" * 70)

print("\nOriginal gender columns:")
print(
    raw_df[
        [c for c in raw_df.columns if "gender" in c.lower()]
    ]
)

print("\nProcessed gender columns:")
print(
    X_model[
        [c for c in X_model.columns if "gender" in c.lower()]
    ]
)

print("\nModel feature count:")
print(len(FEATURES))

print("\nProcessed feature count:")
print(X_model.shape[1])

print("\nFEATURES:")
print(FEATURES)

print("\nProcessed X:")
print(X_model.to_string())

print("=" * 70)