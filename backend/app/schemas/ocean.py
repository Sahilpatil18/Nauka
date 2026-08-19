from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class PFZAdvisoryOut(BaseModel):
    id: str
    latitude: float
    longitude: float
    reference_point: Optional[str] = None
    sea_surface_temp_c: Optional[float] = None
    chlorophyll_mg_m3: Optional[float] = None
    valid_from: datetime
    valid_to: datetime
    source: str

    class Config:
        from_attributes = True
