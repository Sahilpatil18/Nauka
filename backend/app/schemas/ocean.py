from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class PFZAdvisoryOut(BaseModel):
    id: str
    latitude: float
    longitude: float
    reference_point: Optional[str] = None
    landing_center: Optional[str] = None
    direction: Optional[str] = None
    bearing_deg: Optional[float] = None
    distance_km_range: Optional[str] = None
    depth_m_range: Optional[str] = None
    latitude_dms: Optional[str] = None
    longitude_dms: Optional[str] = None
    sea_surface_temp_c: Optional[float] = None
    chlorophyll_mg_m3: Optional[float] = None
    valid_from: datetime
    valid_to: datetime
    source_updated_at: Optional[datetime] = None
    source: str

    class Config:
        from_attributes = True


class PFZAdvisoryWithDistance(PFZAdvisoryOut):
    distance_km: float
    is_live: bool
