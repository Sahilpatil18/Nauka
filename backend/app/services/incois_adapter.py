"""
Adapter around INCOIS ocean/PFZ data. No formal INCOIS API partnership or
credentials exist, but two real public sources were found and investigated
directly on 2026-08-19:

1. incois.gov.in/MarineFisheries/TextData?secid=SEC002 — INCOIS's own public
   website publishes real, current, daily PFZ advisories for Maharashtra as a
   plain HTML table: named landing centers with bearing/distance/depth and
   the actual lat/long of each fishing zone. No login, no API key — this is
   session-based server navigation (visit the page, select a sector, read
   the result), not a documented/versioned API. INCOIS could restructure
   this page at any time and silently break the parser below — every caller
   treats a parse failure as "no real data available", never as an error,
   and falls back to the fully-mock zones.
2. erddap.incois.gov.in — a public ERDDAP data server. Most of its datasets
   are stale (SST archive stops in 2010, chlorophyll in 2006), but its ARGO
   10-day objective-analysis dataset is genuinely current (~3-week lag) and
   is used here to attach a real temperature to each real zone from (1).

So the honest picture:
  - reference_point / latitude / longitude: REAL, for whichever of our 8
    seeded harbours actually appear in INCOIS's Maharashtra table (as of
    investigation: Satpati, Arnala, Sassoon Dock, Alibag, Ratnagiri,
    Mirkarwada, and Malvan/Sindhudurg do; Karanja and Harnai don't appear in
    this particular sector's table, so they still fall back to mock).
  - sea_surface_temp_c: REAL where the ERDDAP grid has nearby coverage
    (frequently missing right at the coast — ARGO floats operate in open
    water), mock otherwise.
  - chlorophyll_mg_m3: always mock. No live public feed exists for it.

Every advisory's `source` field says exactly which parts are real vs mock —
never assume, read it.

erddap.incois.gov.in sends an incomplete TLS chain (missing intermediate
cert, confirmed via openssl to be a server misconfiguration, not a
fraudulent/mismatched cert — GlobalSign-issued, correct hostname, valid
dates). Fixed by adding the one legitimate missing intermediate to the trust
store, not by disabling verification. incois.gov.in itself (the main site)
sends a complete chain and needs no special handling.
"""
import logging
import random
import re
import ssl
from datetime import datetime, timedelta
from pathlib import Path

import httpx

from app.config import settings

logger = logging.getLogger("nauka.incois")

_CERT_DIR = Path(__file__).resolve().parent.parent / "certs"
_INCOIS_INTERMEDIATE_CERT = _CERT_DIR / "incois_intermediate.pem"

_ERDDAP_BASE = "https://erddap.incois.gov.in/erddap"
_ERDDAP_TEMP_DATASET = "incois_argo_10day_McCreary"  # confirmed current as of 2026-08-19

_INCOIS_BASE = "https://incois.gov.in"
_MAHARASHTRA_SECTOR_ID = "SEC002"  # confirmed 2026-08-19 by checking the page directly

# Maps a normalized substring found in INCOIS's "From the coast of" column to
# the matching harbour name already seeded in our own database (harbours.py).
# Only rows matching one of these are kept — INCOIS's table has ~70 landing
# centers for Maharashtra, far more granular than our 8 seeded harbours, and
# querying real-time temperature for every single one isn't worth the cost.
_KNOWN_HARBOUR_KEYWORDS = {
    "karanja": "Karanja",
    "alibag": "Alibag",
    "sasoondock": "Sassoon Dock",
    "sassoon": "Sassoon Dock",
    "arnala": "Arnala",
    "ratnagiri": "Ratnagiri / Mirkarwada",
    "mirkarwada": "Ratnagiri / Mirkarwada",
    "malvan": "Malvan",
    "sindhudurg": "Malvan",
    "harnai": "Harnai",
    "satpati": "Satpati",
}

_MOCK_ZONES = [
    {"reference_point": "12 NM West of Sassoon Dock", "latitude": 18.92, "longitude": 72.62},
    {"reference_point": "18 NM Southwest of Karanja", "latitude": 18.73, "longitude": 72.75},
    {"reference_point": "22 NM West of Ratnagiri", "latitude": 16.99, "longitude": 73.10},
    {"reference_point": "15 NM Northwest of Malvan", "latitude": 16.10, "longitude": 73.30},
    {"reference_point": "10 NM West of Satpati", "latitude": 19.75, "longitude": 72.65},
]


def _erddap_ssl_context() -> ssl.SSLContext:
    ctx = ssl.create_default_context()
    ctx.load_verify_locations(cafile=str(_INCOIS_INTERMEDIATE_CERT))
    return ctx


def _fetch_erddap_temperature(latitude: float, longitude: float) -> float | None:
    """
    Nearest-neighbor lookup against INCOIS's public ARGO 10-day analysis, at
    5m depth (shallowest available level — a reasonable surface-temperature
    proxy, not literally satellite SST). Returns None on missing grid
    coverage or any request failure — callers must have a mock fallback,
    this is a real, sparse, third-party data source, not a guaranteed one.
    """
    # ERDDAP's query syntax uses [ ] for dimension selectors — httpx (correctly,
    # per URL spec) won't send raw brackets, so they must be percent-encoded
    # here rather than left literal.
    url = (
        f"{_ERDDAP_BASE}/griddap/{_ERDDAP_TEMP_DATASET}.json"
        f"?T_ANALYZED%5B(last)%5D%5B(5)%5D%5B({latitude})%5D%5B({longitude})%5D"
    )
    try:
        with httpx.Client(timeout=8.0, verify=_erddap_ssl_context()) as client:
            resp = client.get(url)
            resp.raise_for_status()
            rows = resp.json()["table"]["rows"]
            if not rows:
                return None
            value = rows[0][-1]
            return round(value, 1) if value is not None else None
    except Exception:
        logger.warning("INCOIS ERDDAP temperature fetch failed for (%s, %s)", latitude, longitude, exc_info=True)
        return None


def _dms_to_decimal(dms: str) -> float | None:
    """'19 35 5 N' -> 19.58472. Returns None if the string doesn't parse."""
    match = re.match(r"\s*(\d+)\s+(\d+)\s+([\d.]+)\s*([NSEW])\s*$", dms)
    if not match:
        return None
    deg, minute, sec, hemisphere = match.groups()
    decimal = float(deg) + float(minute) / 60 + float(sec) / 3600
    if hemisphere in ("S", "W"):
        decimal = -decimal
    return round(decimal, 5)


def _fetch_incois_pfz_rows(sector_id: str = _MAHARASHTRA_SECTOR_ID) -> list[dict]:
    """
    Scrapes INCOIS's public Marine Fisheries text-data page. Session-based
    (visit the home page first to get a session cookie, then select the
    sector) — not a documented API. The table itself is a plain HTML
    <table><tr><td align="center">...</td></tr></table>, parsed here by
    regex since the structure is simple and consistent; if INCOIS changes
    it, this returns [] (via the cell-count check) rather than garbage.
    """
    with httpx.Client(timeout=15.0, follow_redirects=True) as client:
        client.get(f"{_INCOIS_BASE}/MarineFisheries/TextDataHome?mfid=1&request_locale=en")
        resp = client.get(f"{_INCOIS_BASE}/MarineFisheries/TextData?secid={sector_id}")
        resp.raise_for_status()
        html = resp.text

    cells = re.findall(r'<td align="center">([^<]*)</td>', html)
    rows = []
    for i in range(0, len(cells) - 6, 7):
        name, direction, _bearing, distance_km, _depth_m, lat_dms, lon_dms = cells[i : i + 7]
        latitude = _dms_to_decimal(lat_dms)
        longitude = _dms_to_decimal(lon_dms)
        if latitude is None or longitude is None:
            continue
        rows.append(
            {
                "name": name.strip(),
                "direction": direction.strip(),
                "distance_km": distance_km.strip(),
                "latitude": latitude,
                "longitude": longitude,
            }
        )
    return rows


def _fetch_real_pfz_advisories() -> list[dict] | None:
    """
    Returns None if the scrape itself failed (network error, page changed
    shape entirely) so the caller can log that distinctly from "scrape
    worked but matched none of our known harbours" (which returns []).
    Both cases fall back to the same place in get_pfz_advisories().
    """
    try:
        rows = _fetch_incois_pfz_rows()
    except Exception:
        logger.warning("INCOIS PFZ text-data scrape failed", exc_info=True)
        return None

    now = datetime.utcnow()
    advisories = []
    for row in rows:
        normalized = re.sub(r"[^a-z]", "", row["name"].lower())
        matched_harbour = next(
            (label for keyword, label in _KNOWN_HARBOUR_KEYWORDS.items() if keyword in normalized), None
        )
        if matched_harbour is None:
            continue

        real_temp = _fetch_erddap_temperature(row["latitude"], row["longitude"])
        if real_temp is not None:
            sea_surface_temp_c = real_temp
            temp_note = "real ERDDAP temperature"
        else:
            sea_surface_temp_c = round(random.uniform(26.0, 29.5), 1)
            temp_note = "mock temperature (no ERDDAP coverage here)"

        advisories.append(
            {
                "reference_point": f"{row['distance_km']} km {row['direction']} of {row['name']} (near {matched_harbour})",
                "latitude": row["latitude"],
                "longitude": row["longitude"],
                "sea_surface_temp_c": sea_surface_temp_c,
                "chlorophyll_mg_m3": round(random.uniform(0.3, 2.5), 2),  # always mock — see module docstring
                "valid_from": now,
                "valid_to": now + timedelta(days=1),  # this source updates daily
                "source": f"INCOIS real PFZ advisory (Maharashtra), {temp_note}, mock chlorophyll",
            }
        )
    return advisories


def _build_mock_advisories() -> list[dict]:
    """Full fallback — used only if the real INCOIS scrape fails or matches nothing."""
    now = datetime.utcnow()
    advisories = []
    for zone in _MOCK_ZONES:
        real_temp = _fetch_erddap_temperature(zone["latitude"], zone["longitude"])
        if real_temp is not None:
            sea_surface_temp_c = real_temp
            source = "INCOIS ERDDAP (real temperature, mock zone geometry/chlorophyll)"
        else:
            sea_surface_temp_c = round(random.uniform(26.0, 29.5), 1)
            source = "Fully mock — INCOIS PFZ page and ERDDAP both had no usable data"

        advisories.append(
            {
                **zone,
                "sea_surface_temp_c": sea_surface_temp_c,
                "chlorophyll_mg_m3": round(random.uniform(0.3, 2.5), 2),
                "valid_from": now,
                "valid_to": now + timedelta(days=2),
                "source": source,
            }
        )
    return advisories


def _fetch_live() -> list[dict]:
    """
    For a hypothetical future formal INCOIS API partnership — only used once
    incois_api_base_url is configured. Nothing currently sets it.
    """
    with httpx.Client(timeout=10.0) as client:
        resp = client.get(
            f"{settings.incois_api_base_url}/pfz",
            headers={"Authorization": f"Bearer {settings.incois_api_key}"},
        )
        resp.raise_for_status()
        return resp.json()


def get_pfz_advisories() -> list[dict]:
    if settings.incois_api_base_url:
        return _fetch_live()

    real = _fetch_real_pfz_advisories()
    if real:
        return real
    return _build_mock_advisories()
