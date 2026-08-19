"""
Adapter around INCOIS PFZ data. No API access has been confirmed yet, so this
returns realistic mock data by default — everything downstream (models,
endpoints, future mobile client) is built against this interface, so wiring
up the real INCOIS feed later means implementing `_fetch_live` and nothing
else has to change.

If Nauka is reusing Fishgram's existing INCOIS integration (their OSICON
material shows an FTP + cron -> S3 -> processing pipeline), that pipeline
can likely feed this adapter directly instead of a live API call.
"""
import random
from datetime import datetime, timedelta

import httpx

from app.config import settings

# Rough Maharashtra coastal bounding box, used only to generate plausible
# mock advisories near real harbours.
_MOCK_ZONES = [
    {"reference_point": "12 NM West of Sassoon Dock", "latitude": 18.92, "longitude": 72.62},
    {"reference_point": "18 NM Southwest of Karanja", "latitude": 18.73, "longitude": 72.75},
    {"reference_point": "22 NM West of Ratnagiri", "latitude": 16.99, "longitude": 73.10},
    {"reference_point": "15 NM Northwest of Malvan", "latitude": 16.10, "longitude": 73.30},
    {"reference_point": "10 NM West of Satpati", "latitude": 19.75, "longitude": 72.65},
]


def _mock_advisories() -> list[dict]:
    now = datetime.utcnow()
    advisories = []
    for zone in _MOCK_ZONES:
        advisories.append(
            {
                **zone,
                "sea_surface_temp_c": round(random.uniform(26.0, 29.5), 1),
                "chlorophyll_mg_m3": round(random.uniform(0.3, 2.5), 2),
                "valid_from": now,
                "valid_to": now + timedelta(days=2),
                "source": "INCOIS (mock — no live access configured)",
            }
        )
    return advisories


def _fetch_live() -> list[dict]:
    """Real INCOIS call — only used once incois_api_base_url is configured."""
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
    return _mock_advisories()
