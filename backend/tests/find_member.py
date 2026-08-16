import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parents[1]))
import pandas as pd
DATA_PATH = "data/UC09_FINAL_MEMBER_RISK_DATASET.csv"

df = pd.read_csv(DATA_PATH)

print("Shape:", df.shape)
print("Columns:")
print(df.columns.tolist())

# Check row/index 6252
print("\nRow 6252:")
print(df.iloc[6252])

# If there is a member ID column, show it
for col in ["member_id", "MemberID", "Member_ID", "id", "ID"]:
    if col in df.columns:
        print(f"\n{col} at row 6252:", df.iloc[6252][col])