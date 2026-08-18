from datetime import date, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app import seed as seed_module

# Shared in-memory sqlite so every request in this test session sees the same data.
test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
Base.metadata.create_all(bind=test_engine)


def override_get_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def seed_harbours_and_categories():
    seed_module.SessionLocal = TestSessionLocal
    seed_module.engine = test_engine
    seed_module.seed()


def test_health():
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def _register_and_verify(phone: str, role: str) -> str:
    client.post("/auth/otp/request", json={"phone_number": phone})
    # dev stub logs the code instead of sending it — pull it straight from the store
    from app.services.otp_service import _otp_store

    code = _otp_store[phone][0]
    resp = client.post("/auth/otp/verify", json={"phone_number": phone, "code": code, "role": role})
    assert resp.status_code == 200, resp.text
    return resp.json()["id"]


def test_fisherman_onboarding_and_catch_log_gate():
    harbours = client.get("/harbours").json()
    assert len(harbours) == 8
    karanja = next(h for h in harbours if h["name"] == "Karanja")

    user_id = _register_and_verify("+919800000001", "fisherman")

    profile_resp = client.put(
        f"/onboarding/{user_id}/fisherman-profile",
        json={"home_harbour_id": karanja["id"], "boat_type": "motorized", "target_species": "Pomfret,Mackerel"},
    )
    assert profile_resp.status_code == 200, profile_resp.text

    # Browsing PFZ works pre-KYC (decision #3)
    pfz_resp = client.get("/pfz")
    assert pfz_resp.status_code == 200
    assert len(pfz_resp.json()) == 5

    # Logging a catch before full KYC must be rejected
    catch_payload = {
        "species": "Pomfret",
        "quantity_kg": 42.5,
        "harbour_id": karanja["id"],
        "device_recorded_at": datetime.utcnow().isoformat(),
    }
    blocked = client.post(f"/catch-logs?fisherman_user_id={user_id}", json=catch_payload)
    assert blocked.status_code == 403

    kyc_resp = client.post(f"/onboarding/{user_id}/kyc", json={"aadhaar_last4": "1234"})
    assert kyc_resp.status_code == 200
    assert kyc_resp.json()["kyc_status"] == "full_kyc"

    allowed = client.post(f"/catch-logs?fisherman_user_id={user_id}", json=catch_payload)
    assert allowed.status_code == 200, allowed.text

    logs = client.get(f"/catch-logs/for-fisherman/{user_id}")
    assert len(logs.json()) == 1


def test_marketplace_rfq_flow():
    harbours = client.get("/harbours").json()
    karanja = next(h for h in harbours if h["name"] == "Karanja")
    categories = client.get("/catalog/categories").json()
    nets_category = next(c for c in categories if "Nets" in c["name"])

    vendor_id = _register_and_verify("+919800000002", "vendor")
    client.put(
        f"/onboarding/{vendor_id}/vendor-profile",
        json={"business_name": "Konkan Marine Supplies", "gstin": "27ABCDE1234F1Z5"},
    )

    product_resp = client.post(
        f"/catalog/products?vendor_user_id={vendor_id}",
        json={"category_id": nets_category["id"], "name": "HDPE Multi-filament Net 90mm", "port_location": karanja["name"]},
    )
    assert product_resp.status_code == 200, product_resp.text
    product_id = product_resp.json()["id"]

    buyer_id = _register_and_verify("+919800000003", "buyer")
    client.put(
        f"/onboarding/{buyer_id}/buyer-profile",
        json={"business_name": "Konkan Seafood Exports", "gstin": "27XYZAB5678C1Z9"},
    )

    rfq_resp = client.post(
        f"/catalog/rfqs?requester_user_id={buyer_id}",
        json={"product_id": product_id, "quantity": 10, "message": "Need by next week"},
    )
    assert rfq_resp.status_code == 200, rfq_resp.text

    vendor_rfqs = client.get(f"/catalog/rfqs/for-vendor/{vendor_id}")
    assert len(vendor_rfqs.json()) == 1


def test_price_index_trend():
    harbours = client.get("/harbours").json()
    karanja = next(h for h in harbours if h["name"] == "Karanja")

    client.post(
        "/harbours/price-records",
        json={
            "harbour_id": karanja["id"],
            "species": "Pomfret",
            "record_date": str(date.today() - timedelta(days=3)),
            "min_price_per_kg": 300,
            "max_price_per_kg": 350,
            "avg_price_per_kg": 320,
        },
    )
    client.post(
        "/harbours/price-records",
        json={
            "harbour_id": karanja["id"],
            "species": "Pomfret",
            "record_date": str(date.today()),
            "min_price_per_kg": 330,
            "max_price_per_kg": 380,
            "avg_price_per_kg": 355,
        },
    )

    index = client.get("/harbours/price-index", params={"species": "Pomfret"}).json()
    assert len(index) == 1
    assert index[0]["trend_7day"] == "rising"
