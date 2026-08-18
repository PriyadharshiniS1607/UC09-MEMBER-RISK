import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parents[1]))
import pandas as pd
from app.services.shap_service import get_shap_explanation

DATA_PATH = "data/UC09_FINAL_MEMBER_RISK_DATASET.csv"


df = pd.read_csv(DATA_PATH)

member = df[
    df["member_id"].astype(str) == "M06253"
].iloc[0]


print("=" * 60)
print("SHAP MEMBER TEST")
print("=" * 60)

result = get_shap_explanation(
    member,
    top_n=10
)

print("\nMember ID:")
print(result["member_id"])

print("\nCombined Risk Score:")
print(result["combined_risk_score"])

print("\nBase Predictions:")
for name, value in result["base_predictions"].items():
    print(f"{name}: {value}")


print("\nTop Risk Drivers:")

for i, driver in enumerate(
    result["risk_drivers"],
    start=1
):
    print(
        f"{i}. "
        f"{driver['feature']} | "
        f"value={driver['value']} | "
        f"SHAP={driver['shap_value']:.6f} | "
        f"{driver['direction']}"
    )

print("=" * 60)