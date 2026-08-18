import pandas as pd
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parents[1]))
from app.services.risk_service import (
    classify_risk,
    get_risk_prediction,
)


# ---------------------------------------------------------
# Test threshold classification
# ---------------------------------------------------------

print("=" * 60)
print("RISK THRESHOLD TEST")
print("=" * 60)

test_scores = [
    10,
    25,
    25.01,
    40,
    50,
    50.01,
    69.12,
    75,
    75.01,
    90,
]

for score in test_scores:
    print(
        f"Score: {score:8.2f} -> "
        f"{classify_risk(score)}"
    )


# ---------------------------------------------------------
# Test actual member
# ---------------------------------------------------------

DATA_PATH = "data/UC09_FINAL_MEMBER_RISK_DATASET.csv"

df = pd.read_csv(DATA_PATH)

member = df[
    df["member_id"].astype(str) == "M06253"
].iloc[0]


print("\n" + "=" * 60)
print("M06253 RISK TEST")
print("=" * 60)

result = get_risk_prediction(member)

print("Member ID :", result.get("member_id"))
print(
    "Risk score:",
    result["combined_risk_score"]
)
print(
    "Risk level:",
    result["risk_level"]
)

print("=" * 60)