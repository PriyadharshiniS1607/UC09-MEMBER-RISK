import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parents[1]))

import pandas as pd
from app.services.prediction_service import predict_single_member
# Final model-ready dataset
DATA_PATH = "data/UC09_FINAL_MEMBER_RISK_DATASET.csv"
# Load one member
df = pd.read_csv(DATA_PATH)

sample = df.iloc[0].to_dict()


# Run prediction
result = predict_single_member(sample)


print("=" * 60)
print("PREDICTION TEST")
print("=" * 60)

print("Member ID:", result.get("member_id"))
print("Combined Risk Score:", result["combined_risk_score"])

print("=" * 60)
print("Prediction successful")
print("=" * 60)
