from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import (
    User,
    UserRole,
    KycStatus,
    DocumentStatus,
    FishermanProfile,
    CooperativeProfile,
    VendorProfile,
    BuyerProfile,
)
from app.schemas.user import (
    FishermanProfileIn,
    FishermanProfileOut,
    CooperativeProfileIn,
    CooperativeProfileOut,
    VendorProfileIn,
    VendorProfileOut,
    BuyerProfileIn,
    BuyerProfileOut,
    KycSubmission,
    UserOut,
)

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


def _get_user_or_404(db: Session, user_id: str) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def _require_role(user: User, role: UserRole):
    if user.role != role:
        raise HTTPException(status_code=400, detail=f"User is not registered as a {role.value}")


@router.put("/{user_id}/fisherman-profile", response_model=FishermanProfileOut)
def upsert_fisherman_profile(user_id: str, payload: FishermanProfileIn, db: Session = Depends(get_db)):
    user = _get_user_or_404(db, user_id)
    _require_role(user, UserRole.fisherman)

    profile = db.query(FishermanProfile).filter(FishermanProfile.user_id == user_id).first()
    if profile is None:
        # Set document_status explicitly rather than relying on the column
        # default — a Column(default=...) is only applied to the in-memory
        # object at flush time, and the has_docs check below runs before that,
        # so an unset attribute would read as None here, not "unverified".
        profile = FishermanProfile(user_id=user_id, document_status=DocumentStatus.unverified, **payload.model_dump())
        db.add(profile)
    else:
        for field, value in payload.model_dump().items():
            setattr(profile, field, value)

    # Submitting/resubmitting any of the three document numbers queues them for
    # human review (decision: no ReALCraft/Port Authority API access exists to
    # verify these automatically — see DocumentStatus docstring). Never auto-
    # downgrade an already-verified profile just because an unrelated field
    # (e.g. target_species) was re-saved.
    has_docs = bool(profile.boat_registration_no or profile.access_pass_no or profile.high_sea_pass_no)
    if has_docs and profile.document_status in (DocumentStatus.unverified, DocumentStatus.rejected):
        profile.document_status = DocumentStatus.pending_review

    db.commit()
    db.refresh(profile)
    return profile


@router.get("/{user_id}/fisherman-profile", response_model=FishermanProfileOut)
def get_fisherman_profile(user_id: str, db: Session = Depends(get_db)):
    profile = db.query(FishermanProfile).filter(FishermanProfile.user_id == user_id).first()
    if profile is None:
        raise HTTPException(status_code=404, detail="Fisherman profile not found")
    return profile


@router.put("/{user_id}/cooperative-profile", response_model=CooperativeProfileOut)
def upsert_cooperative_profile(user_id: str, payload: CooperativeProfileIn, db: Session = Depends(get_db)):
    user = _get_user_or_404(db, user_id)
    _require_role(user, UserRole.cooperative)

    profile = db.query(CooperativeProfile).filter(CooperativeProfile.user_id == user_id).first()
    if profile is None:
        profile = CooperativeProfile(user_id=user_id, **payload.model_dump())
        db.add(profile)
    else:
        for field, value in payload.model_dump().items():
            setattr(profile, field, value)

    db.commit()
    db.refresh(profile)
    return profile


@router.put("/{user_id}/vendor-profile", response_model=VendorProfileOut)
def upsert_vendor_profile(user_id: str, payload: VendorProfileIn, db: Session = Depends(get_db)):
    user = _get_user_or_404(db, user_id)
    _require_role(user, UserRole.vendor)

    profile = db.query(VendorProfile).filter(VendorProfile.user_id == user_id).first()
    if profile is None:
        profile = VendorProfile(user_id=user_id, **payload.model_dump())
        db.add(profile)
    else:
        for field, value in payload.model_dump().items():
            setattr(profile, field, value)

    db.commit()
    db.refresh(profile)
    return profile


@router.put("/{user_id}/buyer-profile", response_model=BuyerProfileOut)
def upsert_buyer_profile(user_id: str, payload: BuyerProfileIn, db: Session = Depends(get_db)):
    user = _get_user_or_404(db, user_id)
    _require_role(user, UserRole.buyer)

    profile = db.query(BuyerProfile).filter(BuyerProfile.user_id == user_id).first()
    if profile is None:
        profile = BuyerProfile(user_id=user_id, **payload.model_dump())
        db.add(profile)
    else:
        for field, value in payload.model_dump().items():
            setattr(profile, field, value)

    db.commit()
    db.refresh(profile)
    return profile


@router.post("/{user_id}/kyc", response_model=UserOut)
def submit_kyc(user_id: str, payload: KycSubmission, db: Session = Depends(get_db)):
    """
    Moves a user from phone_verified -> full_kyc (decision #3: OTP alone
    unlocks browsing; full KYC is required only before catch logging or
    transacting, which is enforced in those routers, not here).
    """
    user = _get_user_or_404(db, user_id)

    role_profile_exists = {
        UserRole.fisherman: db.query(FishermanProfile).filter(FishermanProfile.user_id == user_id).first(),
        UserRole.cooperative: db.query(CooperativeProfile).filter(CooperativeProfile.user_id == user_id).first(),
        UserRole.vendor: db.query(VendorProfile).filter(VendorProfile.user_id == user_id).first(),
        UserRole.buyer: db.query(BuyerProfile).filter(BuyerProfile.user_id == user_id).first(),
    }.get(user.role)

    if role_profile_exists is None:
        raise HTTPException(status_code=400, detail="Complete the role profile before submitting KYC")

    if payload.aadhaar_last4:
        user.aadhaar_last4 = payload.aadhaar_last4

    user.kyc_status = KycStatus.full_kyc
    db.commit()
    db.refresh(user)
    return user
