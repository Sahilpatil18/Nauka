from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.ocean import PFZAdvisory
from app.schemas.ocean import PFZAdvisoryOut
from app.services import incois_adapter

router = APIRouter(prefix="/pfz", tags=["pfz"])


@router.get("", response_model=list[PFZAdvisoryOut])
def get_current_pfz(db: Session = Depends(get_db)):
    """
    Returns the latest cached advisories, refreshing from the INCOIS adapter
    if the cache is empty or stale. No auth required — PFZ browsing works on
    OTP alone (decision #3).
    """
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
