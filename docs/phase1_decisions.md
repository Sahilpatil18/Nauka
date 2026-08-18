# Phase 1 — Working Decisions (review when back)

These are the calls made to unblock the build. Nothing here is final — flag anything
that's wrong and it changes fast, since nothing downstream depends on it yet except
the data model.

| # | Item | Decision made | Why | Cost to change later |
|---|------|----------------|-----|------------------------|
| 1 | Catch logging | Included in Phase 1 (fisherman-level: species, quantity, location, timestamp) | Tech blueprint explicitly said this must be instrumented "from day one" or the self-learning flywheel never gets training data | Low now, high later (would need migration once real trip/settlement history exists) |
| 2 | Safety/weather gate | Data model has a place for it (`PFZAdvisory` can carry an alert/severity field); no Go/Caution/Do-Not-Go decision logic implemented yet | Kept out of scope to match the Phase 1 doc you sent, which doesn't list it | Low — this is additive, not a schema change |
| 3 | Onboarding friction | OTP alone unlocks browsing (PFZ, prices, catalog); full KYC (Aadhaar, boat reg, access pass) required only before catch logging or transacting | Matches MVP acceptance bar from the other blueprints; avoids blocking first use on paperwork | Low |
| 4 | "AI advi[sory]" line in your Phase 1 doc | Implemented as INCOIS PFZ + SST/chlorophyll passthrough only, no scoring model | The line was cut off in your doc — this is the conservative reading | Medium — a real FOS-style model is a separate, later build |
| 5 | Price index data source | Built as a manual entry endpoint (admin/field-agent role) with a 7-day trend calculated from entered records | No live feed (CMFRI FishWatch / MPEDA-NETFISH) confirmed as licensed/available yet | Low — swapping in a live feed later is an additive adapter, same pattern as INCOIS |

## Also worth confirming when you're back

- **INCOIS API access**: not confirmed to exist yet. Built as an adapter (`services/incois_adapter.py`)
  returning realistic mock data so the rest of the app works today — swap in the real client once
  credentials/terms are confirmed. If Nauka is reusing Fishgram's existing INCOIS integration, that
  adapter can likely be replaced quickly.
- **Database**: running on SQLite for local dev (zero setup). Blueprint calls for PostgreSQL + PostGIS
  at scale — models use plain lat/lng floats for now so this is a straightforward swap, not a rewrite.
- **OTP/SMS**: stubbed — codes are logged to console instead of sent, since no SMS gateway is
  configured. Needs a real provider (MSG91, Twilio, etc.) before this leaves local dev.
- **Mobile app**: Flutter SDK isn't installed in this environment, so `mobile/` has the planned
  screen list and setup instructions rather than a running app. Backend is built API-first so this
  isn't blocking — any client can be pointed at it.
