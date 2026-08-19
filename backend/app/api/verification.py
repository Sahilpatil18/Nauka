from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole, FishermanProfile, DocumentStatus
from app.schemas.user import DocumentReviewIn, FishermanProfileOut, PendingReviewOut

router = APIRouter(prefix="/verification", tags=["verification"])


def _require_admin(db: Session, reviewer_user_id: str) -> User:
    reviewer = db.query(User).filter(User.id == reviewer_user_id).first()
    if reviewer is None or reviewer.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Only admin/field-agent users can review documents")
    return reviewer


@router.get("/pending", response_model=list[PendingReviewOut])
def list_pending_reviews(reviewer_user_id: str = Query(...), db: Session = Depends(get_db)):
    _require_admin(db, reviewer_user_id)

    rows = (
        db.query(FishermanProfile, User)
        .join(User, User.id == FishermanProfile.user_id)
        .filter(FishermanProfile.document_status == DocumentStatus.pending_review)
        .all()
    )
    return [
        PendingReviewOut(
            fisherman_profile_id=profile.id,
            user_id=user.id,
            phone_number=user.phone_number,
            boat_registration_no=profile.boat_registration_no,
            access_pass_no=profile.access_pass_no,
            high_sea_pass_no=profile.high_sea_pass_no,
            document_status=profile.document_status,
        )
        for profile, user in rows
    ]


@router.post("/{fisherman_profile_id}/review", response_model=FishermanProfileOut)
def review_documents(
    fisherman_profile_id: str,
    payload: DocumentReviewIn,
    reviewer_user_id: str = Query(...),
    db: Session = Depends(get_db),
):
    reviewer = _require_admin(db, reviewer_user_id)

    if payload.status not in (DocumentStatus.verified, DocumentStatus.rejected):
        raise HTTPException(status_code=400, detail="Review status must be 'verified' or 'rejected'")

    profile = db.query(FishermanProfile).filter(FishermanProfile.id == fisherman_profile_id).first()
    if profile is None:
        raise HTTPException(status_code=404, detail="Fisherman profile not found")

    profile.document_status = payload.status
    profile.document_review_notes = payload.notes
    profile.document_reviewed_by_user_id = reviewer.id
    profile.document_reviewed_at = datetime.utcnow()

    db.commit()
    db.refresh(profile)
    return profile
