import enum
import uuid
from datetime import datetime

from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, Enum, Text

from app.database import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class ProductCategory(Base):
    __tablename__ = "product_categories"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, unique=True, nullable=False)
    parent_id = Column(String, ForeignKey("product_categories.id"), nullable=True)


class Product(Base):
    __tablename__ = "products"

    id = Column(String, primary_key=True, default=gen_uuid)
    vendor_id = Column(String, ForeignKey("vendor_profiles.id"), nullable=False)
    category_id = Column(String, ForeignKey("product_categories.id"), nullable=False)

    name = Column(String, nullable=False)
    spec_summary = Column(Text, nullable=True)
    port_location = Column(String, nullable=True)  # for "filter by port location"
    price_hint = Column(Float, nullable=True)  # optional, RFQ is the real pricing path
    in_stock = Column(Integer, default=1)  # 1/0 — simple stock status flag for Phase 1
    created_at = Column(DateTime, default=datetime.utcnow)


class RFQStatus(str, enum.Enum):
    open = "open"
    responded = "responded"
    closed = "closed"


class RFQ(Base):
    """Request for Quote — the inquiry-to-lead flow for the equipment marketplace."""

    __tablename__ = "rfqs"

    id = Column(String, primary_key=True, default=gen_uuid)
    product_id = Column(String, ForeignKey("products.id"), nullable=False)
    requested_by_user_id = Column(String, ForeignKey("users.id"), nullable=False)

    quantity = Column(Integer, nullable=True)
    message = Column(Text, nullable=True)
    status = Column(Enum(RFQStatus), default=RFQStatus.open, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
