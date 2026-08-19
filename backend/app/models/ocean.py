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

    # Structured fields matching INCOIS's own PFZ table columns exactly
    # (landing_center = their "From the coast of"), so the UI can show the
    # same table a person sees on incois.gov.in rather than our own summary.
    landing_center = Column(String, nullable=True)
    direction = Column(String, nullable=True)  # e.g. "SW"
    bearing_deg = Column(Float, nullable=True)
    distance_km_range = Column(String, nullable=True)  # e.g. "63-68" — a range, not a single value
    depth_m_range = Column(String, nullable=True)  # e.g. "25-30"
    latitude_dms = Column(String, nullable=True)  # e.g. "19 35 5 N"
    longitude_dms = Column(String, nullable=True)  # e.g. "72 6 32 E"

    sea_surface_temp_c = Column(Float, nullable=True)
    chlorophyll_mg_m3 = Column(Float, nullable=True)

    valid_from = Column(DateTime, nullable=False)
    valid_to = Column(DateTime, nullable=False)  # INCOIS's stated "TILL" date — display only, not a cache-freshness signal
    source_updated_at = Column(DateTime, nullable=True)  # INCOIS's own "Data updated on" timestamp, in UTC
    source = Column(String, default="INCOIS")
    fetched_at = Column(DateTime, default=datetime.utcnow)  # when *we* last fetched — this is what drives cache freshness
