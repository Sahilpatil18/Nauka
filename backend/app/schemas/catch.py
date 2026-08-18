from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class CatchLogIn(BaseModel):
    species: str
    quantity_kg: float
    catch_latitude: Optional[float] = None
    catch_longitude: Optional[float] = None
    harbour_id: Optional[str] = None
    device_recorded_at: datetime


class CatchLogOut(CatchLogIn):
    id: str
    fisherman_id: str
    synced_at: datetime

    class Config:
        from_attributes = True
