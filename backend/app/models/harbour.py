import uuid
from datetime import datetime

from sqlalchemy import Column, String, Float, Date, DateTime, ForeignKey

from app.database import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class Harbour(Base):
    __tablename__ = "harbours"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, unique=True, nullable=False)
    district = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)


class PriceRecord(Base):
    """
    Manually entered by an admin / field agent for Phase 1 (decision #5 —
    no live CMFRI FishWatch / MPEDA-NETFISH feed confirmed yet). One row per
    species per harbour per day. The 7-day trend is computed from these rows
    at read time rather than stored, so there's nothing to keep in sync.
    """

    __tablename__ = "price_records"

    id = Column(String, primary_key=True, default=gen_uuid)
    harbour_id = Column(String, ForeignKey("harbours.id"), nullable=False)
    species = Column(String, nullable=False, index=True)
    record_date = Column(Date, nullable=False, index=True)

    landing_volume_kg = Column(Float, nullable=True)
    min_price_per_kg = Column(Float, nullable=False)
    max_price_per_kg = Column(Float, nullable=False)
    avg_price_per_kg = Column(Float, nullable=False)

    entered_by_user_id = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
