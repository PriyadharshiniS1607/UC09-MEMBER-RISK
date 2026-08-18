import sys
from pathlib import Path
from pprint import pprint

PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = PROJECT_ROOT / "backend"

sys.path.insert(0, str(PROJECT_ROOT))
sys.path.insert(0, str(BACKEND_ROOT))

from app.database.connection import SessionLocal
from app.database.models import (
    Member,
    RiskPrediction,
    ShapExplanation,
)

from rag.intervention.context_builder import build_rag_context


def main():
    print("=" * 80)
    print("RAG MEMBER CONTEXT BUILDER TEST")
    print("=" * 80)

    db = SessionLocal()

    try:
        shap = db.query(ShapExplanation).first()

        if shap is None:
            print("NO SHAP RECORD FOUND")
            return

        prediction = (
            db.query(RiskPrediction)
            .filter(RiskPrediction.id == shap.prediction_id)
            .first()
        )

        if prediction is None:
            print("NO RISK PREDICTION FOUND")
            return

        member = (
            db.query(Member)
            .filter(Member.id == shap.member_id)
            .first()
        )

        if member is None:
            print("NO MEMBER FOUND")
            return

        context = build_rag_context(
            member=member,
            risk_prediction=prediction,
            shap_explanation=shap,
        )

        print("\nMEMBER")
        print("-" * 80)
        pprint(context["member"])

        print("\nRISK")
        print("-" * 80)
        pprint(context["risk"])

        print("\nTOP SHAP DRIVERS")
        print("-" * 80)

        for driver in context["shap"]["top_risk_drivers"]:
            print(
                f"{driver['feature']}: "
                f"value={driver['value']}, "
                f"shap={driver['shap_value']:.4f}, "
                f"impact={driver['impact']:.4f}, "
                f"direction={driver['direction']}"
            )

        print("\nINTERVENTION DRIVERS")
        print("-" * 80)

        for driver in context["shap"]["intervention_drivers"]:
            print(
                f"{driver['feature']}: "
                f"value={driver['value']}, "
                f"impact={driver['impact']:.4f}, "
                f"direction={driver['direction']}"
            )

        print("\n" + "=" * 80)
        print("CONTEXT BUILDING COMPLETED SUCCESSFULLY")
        print("=" * 80)

    finally:
        db.close()


if __name__ == "__main__":
    main()