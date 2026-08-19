"""
Seed reference data: harbours and equipment categories.
Assumes the schema already exists — run `alembic upgrade head` first.

Harbours come in two groups:
  - PHASE1_HARBOURS: the 8 named in the Phase 1 doc, with real coastal
    coordinates (used for onboarding, price entry, etc. since the start).
  - PFZ_LANDING_CENTERS: every other coastal point INCOIS's live PFZ page
    was publishing for Maharashtra as of 2026-08-19 (see
    services/incois_adapter.py), added so "home harbour" selection reflects
    the full real coastline INCOIS actually covers, not just the original 8.
    No coordinates for these — we only have real coastal lat/long for the
    original 8; making up coordinates for the rest would be exactly the
    kind of fabricated data this project has been careful to avoid. INCOIS's
    own published set of landing centers changes over time (confirmed by
    fetching it repeatedly the same day), so this list is a snapshot, not
    a live sync — re-run this seed script to pick up newly-seen names later.
"""
from app.database import SessionLocal
from app.models.harbour import Harbour
from app.models.catalog import ProductCategory

PHASE1_HARBOURS = [
    ("Karanja", "Raigad", 18.73, 72.75),
    ("Alibag", "Raigad", 18.64, 72.87),
    ("Sassoon Dock", "Mumbai", 18.91, 72.83),
    ("Arnala", "Palghar", 19.43, 72.75),
    ("Ratnagiri / Mirkarwada", "Ratnagiri", 16.99, 73.30),
    ("Malvan", "Sindhudurg", 16.06, 73.47),
    ("Harnai", "Ratnagiri", 17.79, 73.09),
    ("Satpati", "Palghar", 19.75, 72.72),
]

# Snapshot of incois.gov.in/MarineFisheries/TextData?secid=SEC002's "From the
# coast of" column, 2026-08-19 — see module docstring above. "Arnala" is
# already in PHASE1_HARBOURS so it's excluded here to avoid a duplicate name.
PFZ_LANDING_CENTERS = [
    "Satpati(N)", "Vadarai", "Danda", "Edavan/Kore", "Tembhi", "Arnalapada",
    "Rangaon", "Datiware", "Uttan", "Manori", "Madh", "YerangalBhati",
    "Patwadi", "Marve/Malvani", "Vesava", "Varsova", "Worli", "Worli-Lotus",
    "Malabar Port (Mumbai)", "VarsoliChalmala", "Mazgaon", "Nanwell Pt",
    "Borli-Mandla", "Korlai", "Ekdara", "Shekhadi(Khalchi)", "Murud",
    "Bhardkhol-Diveagar", "Srivardhan", "Tolkeshwar Pt", "Anjanvel",
    "Kolthare", "Kondkarul", "Budhal", "Palshet", "Jaigarh Head",
    "Welneshwar", "SakharJaigad", "Jaigad", "Sindhudurg (Malvan)",
    "Dhurivada", "Sarjekot", "Wayri", "Khavana", "Talashil",
    "Kochara-Nivati", "Deobag", "Kelus", "Tarkarli/Kalethar",
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
        existing_harbour_names = {h.name for h in db.query(Harbour.name).all()}

        added = 0
        for name, district, lat, lng in PHASE1_HARBOURS:
            if name not in existing_harbour_names:
                db.add(Harbour(name=name, district=district, latitude=lat, longitude=lng))
                existing_harbour_names.add(name)
                added += 1

        for name in PFZ_LANDING_CENTERS:
            if name not in existing_harbour_names:
                db.add(Harbour(name=name, district=None, latitude=None, longitude=None))
                existing_harbour_names.add(name)
                added += 1

        if db.query(ProductCategory).count() == 0:
            for name, parent_id in CATEGORIES:
                db.add(ProductCategory(name=name, parent_id=parent_id))

        db.commit()
        print(f"Added {added} new harbours. Total: {db.query(Harbour).count()} harbours, "
              f"{db.query(ProductCategory).count()} categories.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
