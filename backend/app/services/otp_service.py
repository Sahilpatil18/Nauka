"""
Stubbed OTP service — no SMS gateway configured yet (see phase1_decisions.md).
Codes are generated, held in memory, and logged instead of sent. Swap
`send_otp` for a real provider (MSG91 / Twilio / etc.) before this leaves
local dev; the interface below is what the rest of the app depends on, so
that swap shouldn't touch any caller.
"""
import random
import logging
from datetime import datetime, timedelta

logger = logging.getLogger("nauka.otp")

_OTP_TTL_MINUTES = 5
_otp_store: dict[str, tuple[str, datetime]] = {}


def send_otp(phone_number: str) -> None:
    code = f"{random.randint(0, 999999):06d}"
    _otp_store[phone_number] = (code, datetime.utcnow() + timedelta(minutes=_OTP_TTL_MINUTES))
    logger.info("OTP for %s is %s (dev stub — not actually sent)", phone_number, code)


def verify_otp(phone_number: str, code: str) -> bool:
    entry = _otp_store.get(phone_number)
    if not entry:
        return False
    stored_code, expires_at = entry
    if datetime.utcnow() > expires_at:
        return False
    return stored_code == code
