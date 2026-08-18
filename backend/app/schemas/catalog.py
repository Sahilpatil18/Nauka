from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.models.catalog import RFQStatus


class CategoryOut(BaseModel):
    id: str
    name: str
    parent_id: Optional[str] = None

    class Config:
        from_attributes = True


class ProductIn(BaseModel):
    category_id: str
    name: str
    spec_summary: Optional[str] = None
    port_location: Optional[str] = None
    price_hint: Optional[float] = None
    in_stock: bool = True


class ProductOut(BaseModel):
    id: str
    vendor_id: str
    category_id: str
    name: str
    spec_summary: Optional[str] = None
    port_location: Optional[str] = None
    price_hint: Optional[float] = None
    in_stock: int
    created_at: datetime

    class Config:
        from_attributes = True


class RFQIn(BaseModel):
    product_id: str
    quantity: Optional[int] = None
    message: Optional[str] = None


class RFQOut(BaseModel):
    id: str
    product_id: str
    requested_by_user_id: str
    quantity: Optional[int] = None
    message: Optional[str] = None
    status: RFQStatus
    created_at: datetime

    class Config:
        from_attributes = True
