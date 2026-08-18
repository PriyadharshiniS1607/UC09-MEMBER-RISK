import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parents[1]))
import pandas as pd
from app.services.prediction_service import predict_single_member


COLAB_FILE = "data/UC09_3Model_Stacking_Test_Predictions.csv"


df = pd.read_csv(COLAB_FILE)

print("Dataset shape:", df.shape)
print("\nColumns:")
print(df.columns.tolist())


# Take the first exact Colab prediction row
row = df.iloc[0].copy()


# Save Colab's prediction for comparison
colab_prediction = float(
    row["PREDICTED_COMBINED_RISK_SCORE"]
)


# Remove columns that are outputs, not model inputs
remove_columns = [
    "ACTUAL_COMBINED_RISK_SCORE",
    "PREDICTED_COMBINED_RISK_SCORE",
    "ABSOLUTE_ERROR"
]


input_row = row.drop(
    labels=[
        col for col in remove_columns
        if col in row.index
    ]
)


# Run the exact same row through backend
backend_result = predict_single_member(
    input_row.to_dict()
)


backend_prediction = float(
    backend_result["combined_risk_score"]
)


difference = abs(
    colab_prediction - backend_prediction
)


print("\n" + "=" * 60)
print("COLAB vs BACKEND VALIDATION")
print("=" * 60)

print(f"Colab prediction   : {colab_prediction:.10f}")
print(f"Backend prediction : {backend_prediction:.10f}")
print(f"Difference         : {difference:.10f}")

print("=" * 60)

if difference < 1e-5:
    print("PASS: Backend matches Colab.")
else:
    print("CHECK: Backend does not exactly match Colab.")

print("=" * 60)