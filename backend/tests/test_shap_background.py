import pickle
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[1]

SHAP_BACKGROUND_PATH = (
    BASE_DIR / "ml_models" / "shap_background.pkl"
)


print("=" * 60)
print("SHAP BACKGROUND INSPECTION")
print("=" * 60)

print("\nPath:")
print(SHAP_BACKGROUND_PATH)

with open(SHAP_BACKGROUND_PATH, "rb") as f:
    background = pickle.load(f)

print("\nType:")
print(type(background))

print("\nShape:")
if hasattr(background, "shape"):
    print(background.shape)
else:
    print("No shape attribute")

print("\nColumns:")
if hasattr(background, "columns"):
    print(list(background.columns))
else:
    print("No columns attribute")

print("\nPreview:")
print(background)

print("=" * 60)