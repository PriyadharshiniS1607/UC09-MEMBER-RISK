import pandas as pd
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parents[1]))
from app.database.connection import Base, engine
from app.database.models import User


print("=" * 60)
print("DATABASE CONNECTION TEST")
print("=" * 60)

try:
    with engine.connect() as connection:
        print("PostgreSQL connection: SUCCESS")

    Base.metadata.create_all(bind=engine)

    print("Database tables: CREATED/VERIFIED")
    print("Users table: users")

    print("=" * 60)
    print("DATABASE TEST PASSED")
    print("=" * 60)

except Exception as exc:
    print("=" * 60)
    print("DATABASE TEST FAILED")
    print("=" * 60)
    print(f"Error: {exc}")
    raise