from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.catch import CatchLog
from app.models.user import User, KycStatus, FishermanProfile
from app.schemas.catch import CatchLogIn, CatchLogOut

router = APIRouter(prefix="/catch-logs", tags=["catch-logs"])


@router.post("", response_model=CatchLogOut)
def log_catch(fisherman_user_id: str = Query(...), payload: CatchLogIn = None, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == fisherman_user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    if user.requires_full_kyc():
        # decision #3 — full KYC gates catch logging, not browsing
        raise HTTPException(status_code=403, detail="Complete full KYC before logging catch")

    profile = db.query(FishermanProfile).filter(FishermanProfile.user_id == fisherman_user_id).first()
    if profile is None:
        raise HTTPException(status_code=400, detail="Complete fisherman profile first")

    entry = CatchLog(fisherman_id=profile.id, **payload.model_dump())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.get("/for-fisherman/{fisherman_user_id}", response_model=list[CatchLogOut])
def list_catch_logs(fisherman_user_id: str, db: Session = Depends(get_db)):
    profile = db.query(FishermanProfile).filter(FishermanProfile.user_id == fisherman_user_id).first()
    if profile is None:
        raise HTTPException(status_code=404, detail="Fisherman profile not found")
    return db.query(CatchLog).filter(CatchLog.fisherman_id == profile.id).order_by(CatchLog.device_recorded_at.desc()).all()
