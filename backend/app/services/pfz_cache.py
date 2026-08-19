"""
Shared PFZ cache refresh logic, used by both the /pfz route (refresh-on-
request) and the background loop in main.py (refresh-on-schedule regardless
of traffic). Kept in one place so both paths behave identically — this data
is safety/livelihood-relevant, so "stale because nobody happened to visit"
isn't acceptable; see main.py's _pfz_refresh_loop.

Freshness is judged by `fetched_at` (when *we* last pulled it), not by
`valid_to` (INCOIS's own "TILL <date>" banner). Confirmed by direct
comparison against a page printout on 2026-08-19 that the underlying
bearing/distance/depth numbers for the same landing center change *within*
a single "TILL" day — that field is INCOIS's stated forecast-validity
window, not a signal for how often their position data actually refreshes.
Using it as the cache TTL was serving up to a full day of exactly the kind
of stale numbers this data can't afford to have.
"""
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.models.ocean import PFZAdvisory
from app.services import incois_adapter

CACHE_MAX_AGE_MINUTES = 15


def refresh_pfz_cache_if_stale(db: Session) -> list[PFZAdvisory]:
    now = datetime.utcnow()
    freshness_cutoff = now - timedelta(minutes=CACHE_MAX_AGE_MINUTES)
    fresh = db.query(PFZAdvisory).filter(PFZAdvisory.fetched_at >= freshness_cutoff).all()
    if fresh:
        return fresh

    raw = incois_adapter.get_pfz_advisories()
    # This is a live snapshot, not a history table — drop the previous
    # cache entirely rather than accumulating rows forever alongside it.
    db.query(PFZAdvisory).delete()
    records = [PFZAdvisory(**entry) for entry in raw]
    db.add_all(records)
    db.commit()
    for r in records:
        db.refresh(r)
    return records
