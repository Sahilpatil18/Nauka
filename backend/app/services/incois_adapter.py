"""
Adapter around INCOIS ocean data. No formal INCOIS API partnership/credentials
exist — but INCOIS runs a public, unauthenticated ERDDAP server
(erddap.incois.gov.in) that publishes real satellite/ARGO-float-derived ocean
data. Investigated 2026-08-19: most datasets on it are stale (SST dataset
stops in 2010, chlorophyll in 2006), but the ARGO 10-day objective-analysis
dataset is genuinely current (~3-week lag). That's real temperature data, not
the official "PFZ zone" advisory product itself (no open API for the actual
zone boundaries/lines was found — those are only published as web maps and
image/text bulletins on incois.gov.in).

So this is honestly a partial integration:
  - sea_surface_temp_c: REAL, from INCOIS's own public ERDDAP server, when
    a nearby grid point has data (near-coast points are frequently sparse —
    ARGO floats operate in open water, not right against the shore).
  - chlorophyll_mg_m3: still mocked. No live public chlorophyll feed exists;
    the one dataset that had it stopped updating in 2006.
  - reference_point / zone geometry: still mocked. No public source for the
    actual demarcated PFZ zone lines was found.

Each advisory's `source` field says plainly which parts are real vs mock —
never claim more than what's actually true.

INCOIS's ERDDAP server sends an incomplete TLS chain (missing intermediate
cert) — confirmed via openssl this is a server misconfiguration, not a
fraudulent/mismatched cert (GlobalSign-issued, correct hostname, valid
dates). Fixed properly by adding the one legitimate missing intermediate
(fetched from GlobalSign's own CA Issuers URL) to the trust store, not by
disabling verification.
"""
import logging
import random
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


def _build_advisories() -> list[dict]:
    now = datetime.utcnow()
    advisories = []
    for zone in _MOCK_ZONES:
        real_temp = _fetch_erddap_temperature(zone["latitude"], zone["longitude"])

        if real_temp is not None:
            sea_surface_temp_c = real_temp
            source = "INCOIS ERDDAP (real temperature, mock zone geometry/chlorophyll)"
        else:
            sea_surface_temp_c = round(random.uniform(26.0, 29.5), 1)
            source = "INCOIS ERDDAP had no data at this point - mock temperature used"

        advisories.append(
            {
                **zone,
                "sea_surface_temp_c": sea_surface_temp_c,
                "chlorophyll_mg_m3": round(random.uniform(0.3, 2.5), 2),  # always mock — see module docstring
                "valid_from": now,
                "valid_to": now + timedelta(days=2),
                "source": source,
            }
        )
    return advisories


def _fetch_live() -> list[dict]:
    """
    For a hypothetical future formal INCOIS PFZ API (actual zone boundaries,
    not just ocean parameters) — only used once incois_api_base_url is
    configured. Nothing currently sets it; _build_advisories() above is what
    actually runs.
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
    return _build_advisories()
