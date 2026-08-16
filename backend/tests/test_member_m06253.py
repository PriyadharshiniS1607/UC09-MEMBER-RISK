import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parents[1]))
import pandas as pd
from app.services.prediction_service import predict_single_member


DATA_PATH = "data/UC09_FINAL_MEMBER_RISK_DATASET.csv"

MEMBER_ID = "M06253"

# Colab prediction for this same member
COLAB_PREDICTION = 68.909683


# ---------------------------------------------------------
# Load model-ready dataset
# ---------------------------------------------------------

df = pd.read_csv(DATA_PATH)

print("Dataset shape:", df.shape)


# ---------------------------------------------------------
# Find the exact member
# ---------------------------------------------------------

member_df = df[df["member_id"].astype(str) == MEMBER_ID].copy()

if member_df.empty:
    raise ValueError(
        f"Member {MEMBER_ID} not found in dataset."
    )

if len(member_df) > 1:
    raise ValueError(
        f"Multiple rows found for member {MEMBER_ID}."
    )


member = member_df.iloc[0]


print("\n" + "=" * 60)
print("MEMBER FOUND")
print("=" * 60)

print("Member ID:", member["member_id"])
print("Actual COMBINED_RISK_SCORE:",
      member.get("COMBINED_RISK_SCORE"))


# ---------------------------------------------------------
# Prepare member input
# ---------------------------------------------------------

# Convert the member row into a dictionary.
# prediction_service.py will perform preprocessing.
input_data = member.to_dict()


# ---------------------------------------------------------
# Backend prediction
# ---------------------------------------------------------

backend_result = predict_single_member(input_data)

backend_prediction = float(
    backend_result["combined_risk_score"]
)


# ---------------------------------------------------------
# Compare Colab vs Backend
# ---------------------------------------------------------

difference = abs(
    COLAB_PREDICTION - backend_prediction
)


print("\n" + "=" * 60)
print("COLAB vs IDE VALIDATION")
print("=" * 60)

print(f"Member ID          : {MEMBER_ID}")
print(f"Actual score       : {member.get('COMBINED_RISK_SCORE')}")
print(f"Colab prediction   : {COLAB_PREDICTION:.10f}")
print(f"Backend prediction : {backend_prediction:.10f}")
print(f"Difference         : {difference:.10f}")

print("=" * 60)


# ---------------------------------------------------------
# Validation
# ---------------------------------------------------------

if difference < 1e-5:
    print("PASS: Backend matches Colab.")
else:
    print("CHECK: Backend does NOT match Colab.")

print("=" * 60)