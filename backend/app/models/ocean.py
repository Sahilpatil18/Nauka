import uuid
from datetime import datetime

from sqlalchemy import Column, String, Float, DateTime

from app.database import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class PFZAdvisory(Base):
    """
    A cached PFZ advisory pulled through the INCOIS adapter (see
    services/incois_adapter.py). This is a passthrough cache for Phase 1 —
    no scoring model on top yet (decision #4). Kept as its own table
    (rather than fetched live on every request) so the app still has
    something to show offline once synced.
    """

    __tablename__ = "pfz_advisories"

    id = Column(String, primary_key=True, default=gen_uuid)

    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    reference_point = Column(String, nullable=True)  # e.g. "12 NM West of Sassoon Dock"

    sea_surface_temp_c = Column(Float, nullable=True)
    chlorophyll_mg_m3 = Column(Float, nullable=True)

    valid_from = Column(DateTime, nullable=False)
    valid_to = Column(DateTime, nullable=False)
    source = Column(String, default="INCOIS")
    fetched_at = Column(DateTime, default=datetime.utcnow)
