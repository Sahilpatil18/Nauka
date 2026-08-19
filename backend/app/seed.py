"""
Seed the 8 Maharashtra harbours and equipment categories named in the Phase 1 doc.
Assumes the schema already exists — run `alembic upgrade head` first.
"""
from app.database import SessionLocal
from app.models.harbour import Harbour
from app.models.catalog import ProductCategory

HARBOURS = [
    ("Karanja", "Raigad", 18.73, 72.75),
    ("Alibag", "Raigad", 18.64, 72.87),
    ("Sassoon Dock", "Mumbai", 18.91, 72.83),
    ("Arnala", "Palghar", 19.43, 72.75),
    ("Ratnagiri / Mirkarwada", "Ratnagiri", 16.99, 73.30),
    ("Malvan", "Sindhudurg", 16.06, 73.47),
    ("Harnai", "Ratnagiri", 17.79, 73.09),
    ("Satpati", "Palghar", 19.75, 72.72),
]

CATEGORIES = [
    ("Fishing Nets, Floats & Twines", None),
    ("Marine Engines & Motors, Hardware & Hydraulics", None),
    ("Navigation & Safety", None),
    ("Ice, Cold Chain & Preservation Equipment", None),
]


def seed():
    db = SessionLocal()
    try:
        if db.query(Harbour).count() == 0:
            for name, district, lat, lng in HARBOURS:
                db.add(Harbour(name=name, district=district, latitude=lat, longitude=lng))

        if db.query(ProductCategory).count() == 0:
            for name, parent_id in CATEGORIES:
                db.add(ProductCategory(name=name, parent_id=parent_id))

        db.commit()
        print(f"Seeded {db.query(Harbour).count()} harbours and {db.query(ProductCategory).count()} categories.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
