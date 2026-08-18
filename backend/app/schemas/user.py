from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.models.user import UserRole, KycStatus, BoatType


class OtpRequest(BaseModel):
    phone_number: str


class OtpVerify(BaseModel):
    phone_number: str
    code: str
    role: UserRole


class UserOut(BaseModel):
    id: str
    phone_number: str
    role: UserRole
    kyc_status: KycStatus
    created_at: datetime

    class Config:
        from_attributes = True


class FishermanProfileIn(BaseModel):
    home_harbour_id: Optional[str] = None
    boat_type: Optional[BoatType] = None
    target_species: Optional[str] = None
    boat_registration_no: Optional[str] = None
    access_pass_no: Optional[str] = None
    high_sea_pass_no: Optional[str] = None
    cooperative_id: Optional[str] = None


class FishermanProfileOut(FishermanProfileIn):
    id: str
    user_id: str

    class Config:
        from_attributes = True


class CooperativeProfileIn(BaseModel):
    society_name: str
    society_registration_no: Optional[str] = None
    officer_in_charge_name: Optional[str] = None
    harbour_id: Optional[str] = None
    active_fleet_count: Optional[int] = 0
    primary_catch_varieties: Optional[str] = None


class CooperativeProfileOut(CooperativeProfileIn):
    id: str
    user_id: str

    class Config:
        from_attributes = True


class VendorProfileIn(BaseModel):
    business_name: str
    gstin: Optional[str] = None
    business_license_no: Optional[str] = None
    shop_address: Optional[str] = None
    brand_authorization: Optional[str] = None


class VendorProfileOut(VendorProfileIn):
    id: str
    user_id: str

    class Config:
        from_attributes = True


class BuyerProfileIn(BaseModel):
    business_name: str
    gstin: Optional[str] = None
    fssai_license_no: Optional[str] = None
    mpeda_registration_no: Optional[str] = None
    sourcing_species: Optional[str] = None
    processing_capacity_tonnes_per_month: Optional[int] = None
    preferred_delivery_hub: Optional[str] = None


class BuyerProfileOut(BuyerProfileIn):
    id: str
    user_id: str
    bank_account_verified: bool

    class Config:
        from_attributes = True


class KycSubmission(BaseModel):
    """Minimum fields to move a user from phone_verified -> full_kyc."""
    aadhaar_last4: Optional[str] = None
    # role-specific docs are read off the profile tables already saved;
    # this endpoint just flips kyc_status once required fields are present.
