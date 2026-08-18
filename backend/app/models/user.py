import enum
import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, Enum, Boolean, ForeignKey, Integer
from sqlalchemy.orm import relationship

from app.database import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class UserRole(str, enum.Enum):
    fisherman = "fisherman"
    cooperative = "cooperative"
    vendor = "vendor"
    buyer = "buyer"
    admin = "admin"


class KycStatus(str, enum.Enum):
    # OTP alone is enough to browse (PFZ, prices, catalog). Full KYC is only
    # required before catch logging or transacting — see decision #3.
    unverified = "unverified"
    phone_verified = "phone_verified"
    full_kyc = "full_kyc"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_uuid)
    phone_number = Column(String, unique=True, nullable=False, index=True)
    role = Column(Enum(UserRole), nullable=False)
    kyc_status = Column(Enum(KycStatus), default=KycStatus.unverified, nullable=False)
    aadhaar_last4 = Column(String, nullable=True)  # store only last 4 digits, never full number
    created_at = Column(DateTime, default=datetime.utcnow)

    fisherman_profile = relationship("FishermanProfile", back_populates="user", uselist=False)
    cooperative_profile = relationship("CooperativeProfile", back_populates="user", uselist=False)
    vendor_profile = relationship("VendorProfile", back_populates="user", uselist=False)
    buyer_profile = relationship("BuyerProfile", back_populates="user", uselist=False)

    def requires_full_kyc(self) -> bool:
        return self.kyc_status != KycStatus.full_kyc


class BoatType(str, enum.Enum):
    mechanized = "mechanized"
    motorized = "motorized"
    traditional = "traditional"


class FishermanProfile(Base):
    __tablename__ = "fisherman_profiles"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), unique=True, nullable=False)

    home_harbour_id = Column(String, ForeignKey("harbours.id"), nullable=True)
    boat_type = Column(Enum(BoatType), nullable=True)
    target_species = Column(String, nullable=True)  # comma-separated for Phase 1 simplicity

    # KYC documents — only required to move kyc_status to full_kyc
    boat_registration_no = Column(String, nullable=True)  # ReALCraft / Port Authority reg no.
    access_pass_no = Column(String, nullable=True)
    high_sea_pass_no = Column(String, nullable=True)

    cooperative_id = Column(String, ForeignKey("cooperative_profiles.id"), nullable=True)

    user = relationship("User", back_populates="fisherman_profile")
    home_harbour = relationship("Harbour")


class CooperativeProfile(Base):
    __tablename__ = "cooperative_profiles"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), unique=True, nullable=False)

    society_name = Column(String, nullable=False)
    society_registration_no = Column(String, nullable=True)
    officer_in_charge_name = Column(String, nullable=True)
    harbour_id = Column(String, ForeignKey("harbours.id"), nullable=True)
    active_fleet_count = Column(Integer, default=0)
    primary_catch_varieties = Column(String, nullable=True)

    user = relationship("User", back_populates="cooperative_profile")
    harbour = relationship("Harbour")


class VendorProfile(Base):
    __tablename__ = "vendor_profiles"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), unique=True, nullable=False)

    business_name = Column(String, nullable=False)
    gstin = Column(String, nullable=True)
    business_license_no = Column(String, nullable=True)
    shop_address = Column(String, nullable=True)
    brand_authorization = Column(String, nullable=True)

    user = relationship("User", back_populates="vendor_profile")


class BuyerProfile(Base):
    __tablename__ = "buyer_profiles"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), unique=True, nullable=False)

    business_name = Column(String, nullable=False)
    gstin = Column(String, nullable=True)
    fssai_license_no = Column(String, nullable=True)
    mpeda_registration_no = Column(String, nullable=True)  # required for exporters only
    bank_account_verified = Column(Boolean, default=False)
    sourcing_species = Column(String, nullable=True)
    processing_capacity_tonnes_per_month = Column(Integer, nullable=True)
    preferred_delivery_hub = Column(String, nullable=True)

    user = relationship("User", back_populates="buyer_profile")
