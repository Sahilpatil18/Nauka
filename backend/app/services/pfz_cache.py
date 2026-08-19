"""
Shared PFZ cache refresh logic, used by both the /pfz route (refresh-on-
request) and the background loop in main.py (refresh-on-schedule regardless
of traffic). Kept in one place so both paths behave identically — this data
is safety/livelihood-relevant, so "stale because nobody happened to visit"
isn't acceptable; see main.py's _pfz_refresh_loop.
"""
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.ocean import PFZAdvisory
from app.services import incois_adapter


def refresh_pfz_cache_if_stale(db: Session) -> list[PFZAdvisory]:
    now = datetime.utcnow()
    fresh = db.query(PFZAdvisory).filter(PFZAdvisory.valid_to >= now).all()
    if fresh:
        return fresh

    raw = incois_adapter.get_pfz_advisories()
    records = [PFZAdvisory(**entry) for entry in raw]
    db.add_all(records)
    db.commit()
    for r in records:
        db.refresh(r)
    return records
