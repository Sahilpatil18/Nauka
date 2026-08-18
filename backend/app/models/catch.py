import uuid
from datetime import datetime

from sqlalchemy import Column, String, Float, DateTime, ForeignKey

from app.database import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class CatchLog(Base):
    """
    Fisherman-level catch entry (decision #1). Deliberately simple for
    Phase 1 — species, quantity, where, when. This table is the seed of the
    self-learning flywheel described in the tech blueprint: every future
    Fishing Opportunity Score / personalization model is trained by joining
    trips like this one against ocean conditions at the time. Get the
    fields right now; the ML comes later.
    """

    __tablename__ = "catch_logs"

    id = Column(String, primary_key=True, default=gen_uuid)
    fisherman_id = Column(String, ForeignKey("fisherman_profiles.id"), nullable=False)

    species = Column(String, nullable=False)
    quantity_kg = Column(Float, nullable=False)

    catch_latitude = Column(Float, nullable=True)
    catch_longitude = Column(Float, nullable=True)
    harbour_id = Column(String, ForeignKey("harbours.id"), nullable=True)

    # Recorded both ways: device_recorded_at trusts the phone's clock (may be
    # wrong/offline for days), synced_at is server time on ingest. Neither is
    # treated as ground truth yet — that's the clock-trust decision still open
    # from the tech-stack review, flagged here rather than silently resolved.
    device_recorded_at = Column(DateTime, nullable=False)
    synced_at = Column(DateTime, default=datetime.utcnow)
