# Nauka

Digital bridge for Maharashtra's marine sector — fishermen/societies, institutional
buyers, marine equipment vendors, and PFZ/ocean intelligence, in one platform.

This repo is the Phase 1 build, scoped from `Nauka phase 1.pdf`. See
`docs/phase1_decisions.md` for the calls made to unblock this build and what
still needs your sign-off.

## What's here

```
backend/    FastAPI service — the whole Phase 1 API surface, tested and working
            (backend/migrations/ — Alembic schema migrations, see below)
frontend/   Next.js web portal — all 5 roles including fishermen, plus public PFZ & price pages
mobile/     Flutter app plan — on hold as of 2026-08-19, fishermen use the web portal instead
docs/       Decisions log
```

## Backend — running it

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate        # .venv\Scripts\activate.bat on cmd
pip install -r requirements.txt
alembic upgrade head          # creates/updates the schema — see "Database migrations" below
python -m app.seed            # loads the 8 Maharashtra harbours + equipment categories
uvicorn app.main:app --reload
```

Then open http://127.0.0.1:8000/docs for the interactive API (Swagger UI).

### Database migrations

Schema changes go through Alembic (`backend/migrations/`), not app-boot `create_all()` —
that's what used to force a full dev-database wipe every time a model changed, which
doesn't scale to real client data. Workflow for any model change:

```bash
# after editing a model in app/models/
alembic revision --autogenerate -m "add whatever_field to whatever_table"
# open the generated file in migrations/versions/ and actually read it —
# autogenerate misses some things (renames look like drop+add, for example)
alembic upgrade head
```

This applies incremental `ALTER TABLE`s and preserves existing rows — SQLite can't do most
`ALTER TABLE` operations natively, so `migrations/env.py` runs Alembic in "batch mode,"
which does the create-new-table/copy-data/swap dance safely under one migration instead.
The same migration files carry over unchanged when this moves to PostgreSQL.

Tests don't use this — `tests/test_health.py` builds its own isolated in-memory SQLite
schema directly via `create_all()`, which is the right call for fast, disposable test runs.
Migrations are for environments where the data needs to survive, tests aren't one of those.

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
Covers all 5 Phase 1 roles — fisherman, vendor, buyer/exporter, cooperative, and
admin/field-agent — plus public PFZ and price pages. `npm run build` passes
clean (TypeScript + ESLint, zero errors).

## What's implemented (maps to the Phase 1 doc)

| Phase 1 doc section | Status |
|---|---|
| Role 1 — Fishermen/Boat Owners onboarding | Done — OTP + profile + KYC gate, now with a web UI (no native mobile app; see decision below) |
| Role 2 — Cooperative Societies onboarding | Done — profile only; bulk aggregation reporting not built yet |
| Role 3 — Equipment & Gear Vendors | Done — profile + catalog + RFQ inbox |
| Role 4 — Exporters & B2B Buyers | Done — profile + RFQ requests; "direct interest pinging to societies" not built yet |
| Marine Equipment Catalog (B2B Marketplace) | Done — categories, products, port-location filter, RFQ |
| PFZ & Ocean Data | Partial real data as of 2026-08-19 — see below |
| Harbour Landings & Daily Price Index | Done — manual entry + computed 7-day trend |
| Catch logging | Added beyond the doc (decision #1) — see `docs/phase1_decisions.md` |
| Safety/weather gate | Not built — data model has room for it, no logic yet |

## Known gaps — real, not hidden

- **No formal INCOIS API/partnership exists — but real data is flowing for one
  parameter as of 2026-08-19.** INCOIS runs a public, unauthenticated ERDDAP
  server (`erddap.incois.gov.in`) with real satellite/ARGO-float ocean data.
  Investigated directly: most of its datasets are stale (its SST dataset stops
  in 2010, chlorophyll in 2006), but one ARGO objective-analysis dataset is
  genuinely current (~3-week lag). `app/services/incois_adapter.py` now pulls
  **real temperature** from it per zone, falling back to mock only where that
  grid has no nearby data (common right at the coast — ARGO floats operate in
  open water). **Chlorophyll and the actual PFZ zone boundaries/lines are
  still fully mock** — no live public source was found for either; the real
  "PFZ advisory" product (the demarcated zones INCOIS actually publishes) is
  only available as web maps and image/text bulletins, not an open API. Every
  advisory's `source` field states plainly which parts are real vs mock —
  check it rather than assuming. A formal `INCOIS_API_BASE_URL`/`INCOIS_API_KEY`
  partnership would still be the way to get the real zone-boundary product.
- **No session/token auth.** Endpoints take a `user_id` directly rather than a
  bearer token. Fine for building against locally; needs a real auth layer
  (JWT or similar) before this is exposed to real users.
- **OTP is stubbed.** Codes are generated and logged, not sent. Needs a real
  SMS provider before this leaves local dev.
- **SQLite, not PostgreSQL + PostGIS.** Models use plain lat/lng floats, so
  the swap to Postgres/PostGIS at scale is additive, not a rewrite — but it
  hasn't been done yet. Now that schema changes go through Alembic (see
  "Database migrations" above), the same migration history applies to
  Postgres unchanged — just point `DATABASE_URL` at it and run `alembic
  upgrade head`.
- **No native mobile app — decided, not just deferred (2026-08-19).** Fishermen
  use the web portal like every other role now. This means no reliable offline
  cache while at sea (a browser tab isn't a native app's local storage) — a
  PWA/service-worker layer would be the way to claw some of that back if it
  turns out to matter. `mobile/README.md` still has the original plan if this
  gets revisited.

## Next, when you're back

Read `docs/phase1_decisions.md` first — five defaults were picked to keep this
moving. Flag anything that's wrong; all five are cheap to change right now,
before any real data exists on top of them.
