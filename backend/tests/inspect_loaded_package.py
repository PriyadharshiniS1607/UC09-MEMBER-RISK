import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parents[1]))
from app.services.prediction_service import (
    stacking_package,
    final_catboost,
    final_lightgbm,
    final_xgboost,
    meta_model,
    FEATURES,
)


print("=" * 70)
print("LOADED STACKING PACKAGE")
print("=" * 70)

print("\nPackage type:")
print(type(stacking_package))

print("\nPackage keys:")
print(stacking_package.keys())


print("\nFeature count:")
print(len(FEATURES))

print("\nFeatures:")
print(FEATURES)


print("\n" + "=" * 70)
print("MODEL TYPES")
print("=" * 70)

print("\nCatBoost:")
print(type(final_catboost))

print("\nLightGBM:")
print(type(final_lightgbm))

print("\nXGBoost:")
print(type(final_xgboost))

print("\nMeta model:")
print(type(meta_model))


print("\n" + "=" * 70)
print("META MODEL")
print("=" * 70)

print(meta_model)

if hasattr(meta_model, "coef_"):
    print("\nMeta coefficients:")
    print(meta_model.coef_)

if hasattr(meta_model, "intercept_"):
    print("\nMeta intercept:")
    print(meta_model.intercept_)


print("\n" + "=" * 70)