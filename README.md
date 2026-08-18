# Nauka

Digital bridge for Maharashtra's marine sector — fishermen/societies, institutional
buyers, marine equipment vendors, and PFZ/ocean intelligence, in one platform.

This repo is the Phase 1 build, scoped from `Nauka phase 1.pdf`. See
`docs/phase1_decisions.md` for the calls made to unblock this build and what
still needs your sign-off.

## What's here

```
backend/    FastAPI service — the whole Phase 1 API surface, tested and working
frontend/   Next.js web portal — vendor/buyer/cooperative/admin, plus public PFZ & price pages
mobile/     Flutter app plan (SDK not installed in this environment — see mobile/README.md)
docs/       Decisions log
```

## Backend — running it

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate        # .venv\Scripts\activate.bat on cmd
pip install -r requirements.txt
python -m app.seed            # loads the 8 Maharashtra harbours + equipment categories
uvicorn app.main:app --reload
```

Then open http://127.0.0.1:8000/docs for the interactive API (Swagger UI).

Run the tests:

```bash
PYTHONPATH=. pytest tests/ -v
```

All 4 tests pass as of this commit — they exercise the full Phase 1 flow end to
end: OTP → role onboarding (all 4 roles) → KYC gate blocking catch logs until
verified → catch logging → PFZ fetch → marketplace product + RFQ → price index
with 7-day trend.

## Frontend — running it

Backend must already be running on port 8000 (above). Then:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000. Full page list and gaps are in `frontend/README.md`.
This covers the vendor, buyer/exporter, cooperative, and admin/field-agent
roles, plus public PFZ and price pages — **not** the fisherman experience,
which is the mobile app. `npm run build` passes clean (TypeScript + ESLint,
zero errors); backend + frontend were booted together and smoke-tested with
CORS confirmed working.

## What's implemented (maps to the Phase 1 doc)

| Phase 1 doc section | Status |
|---|---|
| Role 1 — Fishermen/Boat Owners onboarding | Done — OTP + profile + KYC gate |
| Role 2 — Cooperative Societies onboarding | Done — profile only; bulk aggregation reporting not built yet |
| Role 3 — Equipment & Gear Vendors | Done — profile + catalog + RFQ inbox |
| Role 4 — Exporters & B2B Buyers | Done — profile + RFQ requests; "direct interest pinging to societies" not built yet |
| Marine Equipment Catalog (B2B Marketplace) | Done — categories, products, port-location filter, RFQ |
| PFZ & Ocean Data | Done as passthrough (INCOIS adapter, currently mocked — see below) |
| Harbour Landings & Daily Price Index | Done — manual entry + computed 7-day trend |
| Catch logging | Added beyond the doc (decision #1) — see `docs/phase1_decisions.md` |
| Safety/weather gate | Not built — data model has room for it, no logic yet |

## Known gaps — real, not hidden

- **INCOIS API access is not confirmed.** `app/services/incois_adapter.py` returns
  mock PFZ data near real Maharashtra harbours so everything downstream works
  today. Swap in real credentials via `.env` (`INCOIS_API_BASE_URL`,
  `INCOIS_API_KEY`) once access is confirmed — no other code changes needed.
- **No session/token auth.** Endpoints take a `user_id` directly rather than a
  bearer token. Fine for building against locally; needs a real auth layer
  (JWT or similar) before this is exposed to real users.
- **OTP is stubbed.** Codes are generated and logged, not sent. Needs a real
  SMS provider before this leaves local dev.
- **SQLite, not PostgreSQL + PostGIS.** Models use plain lat/lng floats, so
  the swap to Postgres/PostGIS at scale is additive, not a rewrite — but it
  hasn't been done yet.
- **Mobile app isn't built.** Flutter SDK isn't installed in this environment.
  `mobile/README.md` has the setup steps and the screen list mapped to this
  API so a Flutter dev can pick it up directly.

## Next, when you're back

Read `docs/phase1_decisions.md` first — five defaults were picked to keep this
moving. Flag anything that's wrong; all five are cheap to change right now,
before any real data exists on top of them.
