from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.catalog import ProductCategory, Product, RFQ
from app.models.user import User, UserRole, VendorProfile
from app.schemas.catalog import CategoryOut, ProductIn, ProductOut, RFQIn, RFQOut

router = APIRouter(prefix="/catalog", tags=["catalog"])


@router.get("/categories", response_model=list[CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    return db.query(ProductCategory).all()


@router.get("/products", response_model=list[ProductOut])
def list_products(
    category_id: Optional[str] = None,
    port_location: Optional[str] = None,
    in_stock_only: bool = False,
    db: Session = Depends(get_db),
):
    query = db.query(Product)
    if category_id:
        query = query.filter(Product.category_id == category_id)
    if port_location:
        query = query.filter(Product.port_location == port_location)
    if in_stock_only:
        query = query.filter(Product.in_stock == 1)
    return query.all()


@router.post("/products", response_model=ProductOut)
def create_product(vendor_user_id: str = Query(...), payload: ProductIn = None, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == vendor_user_id).first()
    if user is None or user.role != UserRole.vendor:
        raise HTTPException(status_code=400, detail="Only vendors can list products")

    vendor_profile = db.query(VendorProfile).filter(VendorProfile.user_id == vendor_user_id).first()
    if vendor_profile is None:
        raise HTTPException(status_code=400, detail="Complete vendor profile before listing products")

    product = Product(vendor_id=vendor_profile.id, **payload.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.post("/rfqs", response_model=RFQOut)
def create_rfq(requester_user_id: str = Query(...), payload: RFQIn = None, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == payload.product_id).first()
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")

    rfq = RFQ(
        product_id=payload.product_id,
        requested_by_user_id=requester_user_id,
        quantity=payload.quantity,
        message=payload.message,
    )
    db.add(rfq)
    db.commit()
    db.refresh(rfq)
    return rfq


@router.get("/rfqs/for-vendor/{vendor_user_id}", response_model=list[RFQOut])
def list_rfqs_for_vendor(vendor_user_id: str, db: Session = Depends(get_db)):
    """Vendor's inquiry-to-lead dashboard feed."""
    vendor_profile = db.query(VendorProfile).filter(VendorProfile.user_id == vendor_user_id).first()
    if vendor_profile is None:
        raise HTTPException(status_code=404, detail="Vendor profile not found")

    product_ids = [p.id for p in db.query(Product.id).filter(Product.vendor_id == vendor_profile.id).all()]
    return db.query(RFQ).filter(RFQ.product_id.in_(product_ids)).all()
