import sys
from pathlib import Path
from pprint import pprint

PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = PROJECT_ROOT / "backend"

sys.path.insert(0, str(PROJECT_ROOT))
sys.path.insert(0, str(BACKEND_ROOT))

# pyrefly: ignore [missing-import]
from app.database.connection import SessionLocal
# pyrefly: ignore [missing-import]
from app.database.models import (
    Member,
    RiskPrediction,
    ShapExplanation,
)

from rag.intervention.context_builder import build_rag_context
from rag.intervention.driver_mapper import map_intervention_drivers


def main():
    print("=" * 80)
    print("RAG DRIVER MAPPER TEST")
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

        mapped_drivers = map_intervention_drivers(context)

        print("\nMEMBER")
        print("-" * 80)
        print(f"Member ID: {member.member_id}")

        print("\nRISK")
        print("-" * 80)
        print(f"Risk score: {prediction.risk_score}")
        print(f"Risk category: {prediction.risk_category}")

        print("\nPRIMARY INTERVENTION DRIVERS")
        print("-" * 80)

        for driver in context["shap"]["intervention_drivers"]:
            print(
                f"{driver['feature']} | "
                f"value={driver['value']} | "
                f"impact={driver['impact']:.4f} | "
                f"direction={driver['direction']}"
            )

        print("\nMAPPED INTERVENTION CONCEPTS")
        print("-" * 80)

        for item in mapped_drivers:
            print(f"\nFeature: {item['feature']}")
            print(f"Value: {item['value']}")
            print(f"SHAP impact: {item['impact']:.4f}")
            print(f"Domain: {item['domain']}")
            print(f"Concept: {item['concept']}")

            print("Retrieval queries:")
            for query in item["retrieval_queries"]:
                print(f"  - {query}")

        print("\nRAW MAPPED OBJECTS")
        print("-" * 80)
        pprint(mapped_drivers)

        print("\n" + "=" * 80)
        print("DRIVER MAPPING TEST COMPLETED")
        print("=" * 80)

    finally:
        db.close()


if __name__ == "__main__":
    main()