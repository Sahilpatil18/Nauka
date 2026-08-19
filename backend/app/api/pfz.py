from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.ocean import PFZAdvisoryOut
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
