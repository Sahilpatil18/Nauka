# Nauka Mobile (Flutter) — not yet scaffolded

Flutter SDK isn't installed in this environment, so this is a plan, not code.
The backend is built API-first (see `../backend`), so a Flutter dev can start
against a running local API immediately — nothing here is blocked on this app
existing.

## Setup (once Flutter is available)

```bash
flutter create --org com.nauka nauka_app
cd nauka_app
flutter pub add dio flutter_secure_storage sqflite maplibre_gl
```

- `dio` — HTTP client for the FastAPI backend
- `flutter_secure_storage` — credential storage (per the tech blueprint's
  security section)
- `sqflite` — local offline cache (trips, catch drafts, cached PFZ)
- `maplibre_gl` — offline-capable map rendering, per the engineering blueprint

## Screen list for Phase 1, mapped to the API

| Screen | Backend endpoint(s) |
|---|---|
| Phone OTP login | `POST /auth/otp/request`, `POST /auth/otp/verify` |
| Role selection + profile setup (per role) | `PUT /onboarding/{user_id}/{role}-profile` |
| KYC submission | `POST /onboarding/{user_id}/kyc` |
| PFZ map (SST/chlorophyll overlay) | `GET /pfz` |
| Harbour price index | `GET /harbours/price-index` |
| Equipment catalog browse + filter | `GET /catalog/categories`, `GET /catalog/products` |
| Product RFQ | `POST /catalog/rfqs` |
| Vendor RFQ inbox | `GET /catalog/rfqs/for-vendor/{vendor_user_id}` |
| Catch log entry (fisherman, post-KYC) | `POST /catch-logs` |
| Catch history | `GET /catch-logs/for-fisherman/{user_id}` |

## Offline-first note

Per the tech-stack blueprint, treat the sync engine as first-class, not an
afterthought: queue catch-log and profile writes locally (sqflite) and flush
them via the endpoints above once connectivity returns, rather than blocking
the UI on a live request. The clock-trust question flagged in
`../docs/phase1_decisions.md` (device time vs. server time on catch entries)
is still open — resolve it before this queue is built, not after.
