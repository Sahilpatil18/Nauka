from datetime import date
from typing import Optional

from pydantic import BaseModel


class HarbourOut(BaseModel):
    id: str
    name: str
    district: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    class Config:
        from_attributes = True


class PriceRecordIn(BaseModel):
    harbour_id: str
    species: str
    record_date: date
    landing_volume_kg: Optional[float] = None
    min_price_per_kg: float
    max_price_per_kg: float
    avg_price_per_kg: float


class PriceRecordOut(PriceRecordIn):
    id: str

    class Config:
        from_attributes = True


class PriceIndexEntry(BaseModel):
    species: str
    harbour_id: str
    harbour_name: str
    latest_date: date
    min_price_per_kg: float
    max_price_per_kg: float
    avg_price_per_kg: float
    trend_7day: str  # "rising" | "falling" | "flat" | "insufficient_data"
