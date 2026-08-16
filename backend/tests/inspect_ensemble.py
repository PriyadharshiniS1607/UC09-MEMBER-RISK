import pickle
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parents[1]))
MODEL_PATH = "ml_models/UC09_3Model_Stacking_Ensemble.pkl"


with open(MODEL_PATH, "rb") as f:
    ensemble = pickle.load(f)


print("=" * 70)
print("ENSEMBLE INSPECTION")
print("=" * 70)

print("\nType:")
print(type(ensemble))

print("\nClass:")
print(ensemble.__class__)

print("\nModule:")
print(ensemble.__class__.__module__)


print("\nAttributes:")
print(
    [
        attr
        for attr in dir(ensemble)
        if not attr.startswith("_")
    ]
)


if hasattr(ensemble, "named_estimators_"):
    print("\nNamed estimators:")
    print(ensemble.named_estimators_)


if hasattr(ensemble, "estimators_"):
    print("\nEstimators:")
    print(ensemble.estimators_)


if hasattr(ensemble, "final_estimator_"):
    print("\nFinal estimator:")
    print(ensemble.final_estimator_)


if hasattr(ensemble, "meta_model"):
    print("\nMeta model:")
    print(ensemble.meta_model)


print("=" * 70)