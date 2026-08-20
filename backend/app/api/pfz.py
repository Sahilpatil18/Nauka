from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.harbour import Harbour
from app.schemas.ocean import PFZAdvisoryOut, PFZAdvisoryWithDistance
from app.services.geo import haversine_km
from app.services.pfz_cache import refresh_pfz_cache_if_stale

router = APIRouter(prefix="/pfz", tags=["pfz"])


@router.get("", response_model=list[PFZAdvisoryOut])
def get_current_pfz(db: Session = Depends(get_db)):
    """
    Returns the latest cached advisories, refreshing from the INCOIS adapter
    if the cache is empty or stale. No auth required — PFZ browsing works on
    OTP alone (decision #3). A background loop (see main.py) also refreshes
    this on a schedule, so this route's own refresh is a safety net for the
    rare case a request lands in the gap right as the cache expires, not the
    primary refresh mechanism.
    """
    return refresh_pfz_cache_if_stale(db)


@router.get("/near-harbour/{harbour_id}", response_model=list[PFZAdvisoryWithDistance])
def get_pfz_near_harbour(harbour_id: str, db: Session = Depends(get_db)):
    """
    "AI Advisory" v1 — deliberately just real geometry, not a model: every
    zone's straight-line distance from the given harbour (haversine, on real
    coordinates for both ends), sorted with live INCOIS zones first and
    nearest-first within each group. No species/catch prediction and no
    boat-range cutoff — INCOIS's feed has no species data to predict from,
    and there's no authoritative source here for a per-boat-type safe range,
    so asserting one would just be a guess dressed up as a recommendation.
    Distance is shown; the fisherman judges range for themselves.
    """
    harbour = db.get(Harbour, harbour_id)
    if not harbour:
        raise HTTPException(status_code=404, detail="Harbour not found")
    if harbour.latitude is None or harbour.longitude is None:
        raise HTTPException(status_code=404, detail="This harbour has no coordinates on file yet")

    advisories = refresh_pfz_cache_if_stale(db)
    results = []
    for a in advisories:
        is_live = "real PFZ advisory" in a.source
        distance_km = haversine_km(harbour.latitude, harbour.longitude, a.latitude, a.longitude)
        results.append(
            PFZAdvisoryWithDistance(**PFZAdvisoryOut.model_validate(a).model_dump(), distance_km=round(distance_km, 1), is_live=is_live)
        )
    results.sort(key=lambda r: (not r.is_live, r.distance_km))
    return results
