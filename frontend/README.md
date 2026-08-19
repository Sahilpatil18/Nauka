# Nauka Frontend (Web)

Next.js (App Router, TypeScript, Tailwind) web portal for **all five Phase 1 roles** —
fishermen, vendors, buyers/exporters, cooperative societies, and admin/field agents —
plus public PFZ and harbour price pages.

Decision (2026-08-19): the native mobile app (`../mobile`) is on hold — fishermen use
this web portal too, same as every other role. That trades away true offline-at-sea
capability for now (a browser tab isn't a reliable offline cache the way a native app
with local storage is); worth revisiting with a PWA/service-worker layer if that
matters for how fishermen actually use this in practice.

## Running it

Backend must be running first (see `../backend/README` — `uvicorn app.main:app --reload`
on port 8000). Then:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000. API base URL is set in `.env.local`
(`NEXT_PUBLIC_API_BASE_URL`, defaults to `http://127.0.0.1:8000`).

## Pages

| Route | Purpose |
|---|---|
| `/` | Landing, role-aware links |
| `/login` | Phone OTP login + role selection |
| `/fisherman/onboarding`, `/fisherman/dashboard` | Fisherman profile/KYC, catch logging + history |
| `/vendor/onboarding`, `/vendor/dashboard` | Vendor profile/KYC, product listing, RFQ inbox |
| `/buyer/onboarding`, `/buyer/dashboard` | Buyer/exporter profile/KYC, browse catalog, request quotes |
| `/cooperative/onboarding` | Cooperative profile setup (no dashboard yet — matches backend, which has no aggregation-reporting endpoints built) |
| `/admin/prices` | Manual harbour price entry (decision #5 — no live price feed yet) |
| `/pfz` | Public PFZ advisory list (INCOIS passthrough) |
| `/prices` | Public harbour price index with 7-day trend |

## Known gaps — real, not hidden

- **No real auth.** Session is just the logged-in user's id/role stored in
  `localStorage` (`lib/session.tsx`), because the backend has no token auth yet
  either (see backend README). Replace both together.
- **OTP is manual.** The dev backend logs the code to its own console instead of
  sending an SMS — after "Send OTP" on `/login`, check the backend terminal.
- **Vendor catalog isn't scoped server-side.** `GET /catalog/products` returns
  every vendor's products; the vendor dashboard shows the whole list with a note
  in the UI. Needs a `vendor_id` filter on the backend once there's more than
  one vendor's worth of test data to make this matter.
- **Cooperative "bulk catch aggregation reporting" and "group equipment
  purchasing"** (from the Phase 1 doc) aren't built anywhere yet — backend only
  has profile CRUD for this role, so the frontend only has onboarding.

## Verified working (2026-08-18)

`npm run build` completes clean (TypeScript + ESLint via Next's build pipeline,
zero errors). Backend + frontend booted together in production mode, CORS
preflight confirmed working, all 10 routes returned 200.
