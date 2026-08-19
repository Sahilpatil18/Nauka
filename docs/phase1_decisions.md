# Phase 1 — Decisions

The original 5 calls made to unblock the build, now confirmed by you on 2026-08-19.
Kept here as a record of *why*, not as open questions anymore.

| # | Item | Decision | Confirmed |
|---|------|----------|-----------|
| 1 | Catch logging | Included in Phase 1 (fisherman-level: species, quantity, location, timestamp) | ✅ "Catch log from day one" |
| 2 | Safety/weather gate | **Not built, and not needed** — removed the placeholder `alert_severity`/`alert_message` fields from `PFZAdvisory` on 2026-08-19 since they were never going to be used | ✅ "weather safety not needed" |
| 3 | Onboarding friction | OTP alone unlocks browsing (PFZ, prices, catalog); full KYC (Aadhaar, boat reg, access pass) required only before catch logging or transacting | ✅ "lighter OTP access" |
| 4 | "AI advi[sory]" line in the Phase 1 doc | Implemented as INCOIS PFZ + SST/chlorophyll passthrough only, no scoring model | Not explicitly revisited — flag if this should change |
| 5 | Price index data source | Manual entry endpoint (`/admin/prices`), 7-day trend calculated from entered records — this is the intended ongoing operating model, not a stopgap | ✅ "prices and landings volume we will input manually daily no feed available yet" |

## Still open — not covered by the above

- **INCOIS API access**: a *formal* partnership/credentialed API still doesn't exist and isn't
  something that can be obtained from this side — that requires an actual relationship with
  INCOIS. **Substantially resolved 2026-08-19, in two steps**: first found and wired up INCOIS's
  public ERDDAP server (`erddap.incois.gov.in`) for real temperature; then found the much bigger
  win — INCOIS's own public website publishes real, current, daily PFZ advisories for Maharashtra
  at `incois.gov.in/MarineFisheries/TextData?secid=SEC002` as a plain HTML table (named landing
  centers, bearing/distance/depth, real lat/long per zone). `services/incois_adapter.py` now
  scrapes that (session-based page navigation, not a documented API — every failure mode falls
  back to mock rather than erroring, since INCOIS could restructure the page at any time without
  notice) and cross-references each real zone against ERDDAP for temperature. Result: **8 real
  Maharashtra PFZ zones**, matched against 6 of our 8 seeded harbours (Karanja and Harnai aren't
  in this sector's table), 4 with real temperature too. Chlorophyll is still fully mock — no live
  public feed exists for it. A formal `INCOIS_API_BASE_URL`/`INCOIS_API_KEY` partnership would
  still be the more robust long-term path (a real API contract instead of a scrape that could
  break), and remains the only way to also get chlorophyll live. See also: whether Nauka has any
  relationship to Fishgram/Captainfresh at all — unresolved since the project started.
- **Database**: running on SQLite for local dev (zero setup). Blueprint calls for PostgreSQL + PostGIS
  at scale — models use plain lat/lng floats for now so this is a straightforward swap, not a rewrite.
  **Resolved 2026-08-19**: Alembic migrations are now set up (`backend/migrations/`) — schema
  changes apply as incremental `ALTER TABLE`s that preserve existing data, instead of the
  wipe-and-recreate that was happening before. See the "Database migrations" section in the
  root README for the workflow.
- **OTP/SMS**: stubbed — codes are logged to the backend console instead of sent, since no SMS
  gateway is configured. Needs a real provider (MSG91, Twilio, etc.) before this leaves local dev.
- **Mobile app**: on hold as of 2026-08-19 — fishermen use the web portal like every other role.
  See `frontend/README.md` for the offline-access tradeoff that decision carries.
- **Admin role access control**: anyone can currently self-select "Admin / Field Agent" at login
  and gain the ability to review/reject fishermen's boat documents and enter harbour prices —
  there's no real gating on who can become an admin. Flagged, not yet fixed.
