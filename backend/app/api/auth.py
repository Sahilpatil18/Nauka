from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole, KycStatus
from app.schemas.user import OtpRequest, OtpVerify, UserOut
from app.services import otp_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/otp/request")
def request_otp(payload: OtpRequest):
    otp_service.send_otp(payload.phone_number)
    return {"status": "sent", "note": "dev stub — check server logs for the code"}


@router.post("/otp/verify", response_model=UserOut)
def verify_otp(payload: OtpVerify, db: Session = Depends(get_db)):
    if not otp_service.verify_otp(payload.phone_number, payload.code):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    user = (
        db.query(User)
        .filter(User.phone_number == payload.phone_number, User.role == payload.role)
        .first()
    )
    if user is None:
        user = User(
            phone_number=payload.phone_number,
            role=payload.role,
            kyc_status=KycStatus.phone_verified,
        )
        db.add(user)
    else:
        if user.kyc_status == KycStatus.unverified:
            user.kyc_status = KycStatus.phone_verified

    db.commit()
    db.refresh(user)
    return user
