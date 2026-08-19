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


def test_same_phone_number_can_hold_a_separate_account_per_role():
    # Regression test: a phone number that had already registered as one
    # role used to be silently returned as that role forever, ignoring
    # whichever role was picked on later logins (phone_number was globally
    # unique). Same phone, different roles, must now be independent accounts.
    phone = "+919800000007"
    fisherman_id = _register_and_verify(phone, "fisherman")
    vendor_id = _register_and_verify(phone, "vendor")
    assert fisherman_id != vendor_id

    fisherman_again = _register_and_verify(phone, "fisherman")
    assert fisherman_again == fisherman_id


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

    # Browsing PFZ works pre-KYC (decision #3). Count isn't fixed at 5
    # anymore — the adapter tries a real INCOIS scrape first (currently
    # returns 8 real Maharashtra zones) and only falls back to the 5 fully-
    # mock zones if that scrape fails or matches none of our harbours. This
    # test now depends on real network access to INCOIS/ERDDAP; if that's
    # ever a CI reliability problem, the adapter is the place to add a way
    # to force the mock path for tests.
    pfz_resp = client.get("/pfz")
    assert pfz_resp.status_code == 200
    assert len(pfz_resp.json()) > 0

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


def test_first_ever_profile_save_with_docs_still_queues_for_review():
    # Regression test: submitting boat_registration_no on the very first PUT
    # (profile row doesn't exist yet) previously left document_status stuck
    # at "unverified" instead of "pending_review", because the has_docs check
    # ran against a freshly-constructed ORM object before the column default
    # had been applied. Only caught by testing this in a single call — doing
    # it as profile-then-update (like the test below) doesn't reproduce it.
    fisherman_id = _register_and_verify("+919800000006", "fisherman")
    profile = client.put(
        f"/onboarding/{fisherman_id}/fisherman-profile",
        json={"boat_type": "motorized", "boat_registration_no": "MH-01-XY-9999"},
    ).json()
    assert profile["document_status"] == "pending_review"


def test_document_review_workflow():
    fisherman_id = _register_and_verify("+919800000004", "fisherman")
    admin_id = _register_and_verify("+919800000005", "admin")

    # No documents submitted yet -> unverified, nothing pending
    profile = client.put(f"/onboarding/{fisherman_id}/fisherman-profile", json={"boat_type": "traditional"}).json()
    assert profile["document_status"] == "unverified"

    pending = client.get("/verification/pending", params={"reviewer_user_id": admin_id})
    assert pending.status_code == 200
    assert profile["id"] not in [p["fisherman_profile_id"] for p in pending.json()]

    # Submitting a document number queues it for review
    profile = client.put(
        f"/onboarding/{fisherman_id}/fisherman-profile",
        json={"boat_type": "traditional", "boat_registration_no": "MH-01-AB-1234"},
    ).json()
    assert profile["document_status"] == "pending_review"

    pending = client.get("/verification/pending", params={"reviewer_user_id": admin_id}).json()
    assert any(p["fisherman_profile_id"] == profile["id"] for p in pending)

    # A non-admin cannot review
    forbidden = client.post(
        f"/verification/{profile['id']}/review",
        params={"reviewer_user_id": fisherman_id},
        json={"status": "verified"},
    )
    assert forbidden.status_code == 403

    # Admin approves
    reviewed = client.post(
        f"/verification/{profile['id']}/review",
        params={"reviewer_user_id": admin_id},
        json={"status": "verified", "notes": "Checked against harbour records in person"},
    )
    assert reviewed.status_code == 200, reviewed.text
    assert reviewed.json()["document_status"] == "verified"
    assert reviewed.json()["document_reviewed_by_user_id"] == admin_id

    # Now resolved, drops off the pending queue
    pending = client.get("/verification/pending", params={"reviewer_user_id": admin_id}).json()
    assert profile["id"] not in [p["fisherman_profile_id"] for p in pending]

    # Re-saving an unrelated field afterwards must not silently downgrade a verified profile
    unchanged = client.put(
        f"/onboarding/{fisherman_id}/fisherman-profile",
        json={"boat_type": "traditional", "boat_registration_no": "MH-01-AB-1234", "target_species": "Pomfret"},
    ).json()
    assert unchanged["document_status"] == "verified"


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
