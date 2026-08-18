from datetime import timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.harbour import Harbour, PriceRecord
from app.schemas.harbour import HarbourOut, PriceRecordIn, PriceRecordOut, PriceIndexEntry

router = APIRouter(prefix="/harbours", tags=["harbours"])


@router.get("", response_model=list[HarbourOut])
def list_harbours(db: Session = Depends(get_db)):
    return db.query(Harbour).all()


@router.post("/price-records", response_model=PriceRecordOut)
def add_price_record(payload: PriceRecordIn, entered_by_user_id: Optional[str] = Query(None), db: Session = Depends(get_db)):
    """
    Manual entry endpoint for field agents/admins (decision #5 — no live
    price feed confirmed yet). One call per species per harbour per day.
    """
    harbour = db.query(Harbour).filter(Harbour.id == payload.harbour_id).first()
    if harbour is None:
        raise HTTPException(status_code=404, detail="Harbour not found")

    record = PriceRecord(**payload.model_dump(), entered_by_user_id=entered_by_user_id)
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/price-index", response_model=list[PriceIndexEntry])
def get_price_index(species: Optional[str] = None, harbour_id: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Latest price + a simple rising/falling/flat trend computed by comparing
    the most recent record to the oldest record inside the last 7 days.
    Deliberately simple for Phase 1 — no smoothing, no outlier handling.
    """
    query = db.query(PriceRecord)
    if species:
        query = query.filter(PriceRecord.species == species)
    if harbour_id:
        query = query.filter(PriceRecord.harbour_id == harbour_id)

    records = query.order_by(PriceRecord.record_date.desc()).all()

    # group by (species, harbour_id)
    groups: dict[tuple[str, str], list[PriceRecord]] = {}
    for r in records:
        groups.setdefault((r.species, r.harbour_id), []).append(r)

    harbour_names = {h.id: h.name for h in db.query(Harbour).all()}

    entries = []
    for (sp, hid), recs in groups.items():
        recs_sorted = sorted(recs, key=lambda r: r.record_date)
        latest = recs_sorted[-1]

        window_start = latest.record_date - timedelta(days=7)
        window = [r for r in recs_sorted if r.record_date >= window_start]

        if len(window) < 2:
            trend = "insufficient_data"
        else:
            delta = window[-1].avg_price_per_kg - window[0].avg_price_per_kg
            if delta > 0.5:
                trend = "rising"
            elif delta < -0.5:
                trend = "falling"
            else:
                trend = "flat"

        entries.append(
            PriceIndexEntry(
                species=sp,
                harbour_id=hid,
                harbour_name=harbour_names.get(hid, "Unknown"),
                latest_date=latest.record_date,
                min_price_per_kg=latest.min_price_per_kg,
                max_price_per_kg=latest.max_price_per_kg,
                avg_price_per_kg=latest.avg_price_per_kg,
                trend_7day=trend,
            )
        )

    return entries
