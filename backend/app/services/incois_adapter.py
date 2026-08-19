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

# Matched against INCOIS's own "From the coast of" name — that's the
# authoritative signal (INCOIS itself is telling us which coastal point this
# zone is offshore from), NOT the zone's own coordinates. Distance-matching
# was tried and is fundamentally wrong here: PFZ points are deliberately far
# offshore (Satpati's own zone is ~77km from Satpati's coastal coordinate —
# confirmed directly), so comparing a zone's lat/long to a harbour's lat/long
# rejects even the objectively correct pairing.
#
# The real bug was substring matching, not the name-based approach itself:
# "Marve/Malvani" (a Mumbai suburb) got wrongly matched to our Malvan harbour
# because "malvan" is a substring of "malvani". Fixed by matching whole
# tokens (split on non-letters) instead of raw substrings — "malvani" now
# correctly fails to equal "malvan".
_KNOWN_HARBOUR_KEYWORDS = {
    "karanja": "Karanja",
    "alibag": "Alibag",
    "sasoondock": "Sassoon Dock",
    "sassoon": "Sassoon Dock",
    "arnala": "Arnala",
    "arnalapada": "Arnala",  # a genuine compound of the name (Marathi "-pada" = hamlet-of), not a coincidence
    "ratnagiri": "Ratnagiri / Mirkarwada",
    "mirkarwada": "Ratnagiri / Mirkarwada",
    "malvan": "Malvan",
    "sindhudurg": "Malvan",
    "harnai": "Harnai",
    "satpati": "Satpati",
}


def _match_harbour_by_name(name: str) -> str | None:
    """Whole-word match only — see the false-positive this replaced, above."""
    for token in re.findall(r"[a-z]+", name.lower()):
        if token in _KNOWN_HARBOUR_KEYWORDS:
            return _KNOWN_HARBOUR_KEYWORDS[token]
    return None


_MOCK_ZONES = [
    {
        "reference_point": "12 NM West of Sassoon Dock",
        "landing_center": "Sassoon Dock",
        "direction": "W",
        "bearing_deg": 270,
        "distance_km_range": "20-24",
        "depth_m_range": "20-30",
        "latitude": 18.92,
        "longitude": 72.62,
    },
    {
        "reference_point": "18 NM Southwest of Karanja",
        "landing_center": "Karanja",
        "direction": "SW",
        "bearing_deg": 225,
        "distance_km_range": "31-35",
        "depth_m_range": "25-35",
        "latitude": 18.73,
        "longitude": 72.75,
    },
    {
        "reference_point": "22 NM West of Ratnagiri",
        "landing_center": "Ratnagiri",
        "direction": "W",
        "bearing_deg": 270,
        "distance_km_range": "38-42",
        "depth_m_range": "40-55",
        "latitude": 16.99,
        "longitude": 73.10,
    },
    {
        "reference_point": "15 NM Northwest of Malvan",
        "landing_center": "Malvan",
        "direction": "NW",
        "bearing_deg": 315,
        "distance_km_range": "26-30",
        "depth_m_range": "18-28",
        "latitude": 16.10,
        "longitude": 73.30,
    },
    {
        "reference_point": "10 NM West of Satpati",
        "landing_center": "Satpati",
        "direction": "W",
        "bearing_deg": 270,
        "distance_km_range": "17-21",
        "depth_m_range": "15-25",
        "latitude": 19.75,
        "longitude": 72.65,
    },
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


def _decimal_to_dms(value: float, positive_hemisphere: str, negative_hemisphere: str) -> str:
    """19.58472 -> '19 35 5 N' — inverse of _dms_to_decimal, used only for the
    fully-mock fallback zones so the table has the same columns either way."""
    hemisphere = positive_hemisphere if value >= 0 else negative_hemisphere
    value = abs(value)
    degrees = int(value)
    minutes_full = (value - degrees) * 60
    minutes = int(minutes_full)
    seconds = round((minutes_full - minutes) * 60)
    return f"{degrees} {minutes} {seconds} {hemisphere}"


_MONTH_ABBREVIATIONS = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}


def _parse_till_date(html: str) -> datetime | None:
    """
    INCOIS states the advisory's own validity right on the page — e.g.
    'SATELLITE DATA SHOWS LIKELY AVAILABILITY OF FISH STOCK TILL  19 AUG
    2026'. Real text, not baked into an image, so it's worth trusting over
    guessing our own expiry window. Returns None if the page doesn't have it
    (format changed, or this ever runs against a sector without the banner).
    """
    match = re.search(r"TILL\s+(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})", html, re.IGNORECASE)
    if not match:
        return None
    day, month_abbr, year = match.groups()
    month = _MONTH_ABBREVIATIONS.get(month_abbr.lower())
    if month is None:
        return None
    try:
        # Advisory is valid through the end of the stated day, not the start.
        return datetime(int(year), month, int(day), 23, 59, 59)
    except ValueError:
        return None


_SOURCE_UPDATED_PATTERN = re.compile(
    r'id="updatedDate"[^>]*>\s*[A-Za-z]{3}\s+([A-Za-z]{3})\s+(\d{1,2})\s+(\d{2}):(\d{2}):(\d{2})\s+IST\s+(\d{4})'
)


def _parse_source_updated_at(html: str) -> datetime | None:
    """
    INCOIS's page carries a hidden but real timestamp — <p id="updatedDate"
    style='display:none;'> Wed Aug 19 15:38:48 IST 2026</p> — showing exactly
    when their backend last regenerated this data. Confirmed by direct
    comparison: this is the actual source-of-truth for freshness, updating
    more often than the day-level "TILL" date implies — the underlying
    bearing/distance/depth numbers for the same landing center genuinely
    change within the same "TILL" window, more than once a day. Returns UTC
    (the site always reports IST — confirmed, not assumed, since it's an
    Indian government site — so this converts by a fixed -5:30 offset).
    """
    match = _SOURCE_UPDATED_PATTERN.search(html)
    if not match:
        return None
    month_abbr, day, hour, minute, second, year = match.groups()
    month = _MONTH_ABBREVIATIONS.get(month_abbr.lower())
    if month is None:
        return None
    try:
        ist = datetime(int(year), month, int(day), int(hour), int(minute), int(second))
        return ist - timedelta(hours=5, minutes=30)
    except ValueError:
        return None


def _fetch_incois_pfz_rows(
    sector_id: str = _MAHARASHTRA_SECTOR_ID,
) -> tuple[list[dict], datetime | None, datetime | None]:
    """
    Scrapes INCOIS's public Marine Fisheries text-data page. Session-based
    (visit the home page first to get a session cookie, then select the
    sector) — not a documented API. The table itself is a plain HTML
    <table><tr><td align="center">...</td></tr></table>, parsed here by
    regex since the structure is simple and consistent; if INCOIS changes
    it, this returns [] (via the cell-count check) rather than garbage.
    Returns (rows, till_date, source_updated_at).
    """
    with httpx.Client(timeout=15.0, follow_redirects=True) as client:
        client.get(f"{_INCOIS_BASE}/MarineFisheries/TextDataHome?mfid=1&request_locale=en")
        resp = client.get(f"{_INCOIS_BASE}/MarineFisheries/TextData?secid={sector_id}")
        resp.raise_for_status()
        html = resp.text

    valid_to = _parse_till_date(html)
    source_updated_at = _parse_source_updated_at(html)

    cells = re.findall(r'<td align="center">([^<]*)</td>', html)
    rows = []
    for i in range(0, len(cells) - 6, 7):
        name, direction, bearing, distance_km, depth_m, lat_dms, lon_dms = cells[i : i + 7]
        latitude = _dms_to_decimal(lat_dms)
        longitude = _dms_to_decimal(lon_dms)
        if latitude is None or longitude is None:
            continue
        rows.append(
            {
                "name": name.strip(),
                "direction": direction.strip(),
                "bearing_deg": bearing.strip(),
                "distance_km": distance_km.strip(),
                "depth_m": depth_m.strip(),
                "latitude": latitude,
                "longitude": longitude,
                "latitude_dms": lat_dms.strip(),
                "longitude_dms": lon_dms.strip(),
            }
        )
    return rows, valid_to, source_updated_at


def _fetch_real_pfz_advisories() -> list[dict] | None:
    """
    Returns None if the scrape itself failed (network error, page changed
    shape entirely) so the caller can log that distinctly from "scrape
    worked but matched none of our known harbours" (which returns []).
    Both cases fall back to the same place in get_pfz_advisories().
    """
    try:
        rows, parsed_valid_to, source_updated_at = _fetch_incois_pfz_rows()
    except Exception:
        logger.warning("INCOIS PFZ text-data scrape failed", exc_info=True)
        return None

    now = datetime.utcnow()
    # Trust INCOIS's own stated validity when we found it; otherwise fall
    # back to the 1-day assumption rather than leaving it unset.
    valid_to = parsed_valid_to if parsed_valid_to and parsed_valid_to > now else now + timedelta(days=1)
    advisories = []
    for row in rows:
        matched_harbour = _match_harbour_by_name(row["name"])
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
                "landing_center": row["name"],
                "direction": row["direction"],
                "bearing_deg": float(row["bearing_deg"]) if row["bearing_deg"] else None,
                "distance_km_range": row["distance_km"],
                "depth_m_range": row["depth_m"],
                "latitude_dms": row["latitude_dms"],
                "longitude_dms": row["longitude_dms"],
                "latitude": row["latitude"],
                "longitude": row["longitude"],
                "sea_surface_temp_c": sea_surface_temp_c,
                "chlorophyll_mg_m3": round(random.uniform(0.3, 2.5), 2),  # always mock — see module docstring
                "valid_from": now,
                "valid_to": valid_to,
                "source_updated_at": source_updated_at,
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
                "latitude_dms": _decimal_to_dms(zone["latitude"], "N", "S"),
                "longitude_dms": _decimal_to_dms(zone["longitude"], "E", "W"),
                "sea_surface_temp_c": sea_surface_temp_c,
                "chlorophyll_mg_m3": round(random.uniform(0.3, 2.5), 2),
                "valid_from": now,
                "valid_to": now + timedelta(days=2),
                "source_updated_at": None,
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
