import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import SessionLocal
from app.api import auth, onboarding, catalog, pfz, harbour, catchlog, verification
from app.services.pfz_cache import refresh_pfz_cache_if_stale, CACHE_MAX_AGE_MINUTES

# Without this, app-level loggers (e.g. app.services.otp_service) sit at the
# default WARNING level and their .info() calls — including the dev-stub OTP
# code — never print anywhere, even though nothing errors. Uvicorn configures
# its own loggers but not arbitrary ones like "nauka.otp".
logging.basicConfig(level=logging.INFO, format="%(name)s: %(message)s")
logger = logging.getLogger("nauka.pfz_refresh")

# Schema is owned by Alembic now (migrations/), not by the app on boot — run
# `alembic upgrade head` before starting the server. The app used to call
# Base.metadata.create_all() here, which only ever adds missing tables and
# silently does nothing for column changes on an existing table — that's
# exactly the gap that kept forcing a full dev-db wipe on every schema change.

# Matches pfz_cache.CACHE_MAX_AGE_MINUTES so this loop actually catches each
# expiry promptly instead of leaving a gap between the two. This data is
# safety/livelihood-relevant, so freshness shouldn't depend on someone
# happening to visit right after INCOIS updates. The check is cheap (a DB
# query) when the cache is still fresh; the real scrape only runs when
# it's actually expired.
_PFZ_REFRESH_CHECK_INTERVAL_SECONDS = CACHE_MAX_AGE_MINUTES * 60


async def _pfz_refresh_loop() -> None:
    while True:
        try:
            db = SessionLocal()
            try:
                await asyncio.to_thread(refresh_pfz_cache_if_stale, db)
            finally:
                db.close()
        except Exception:
            logger.warning("Background PFZ refresh check failed", exc_info=True)
        await asyncio.sleep(_PFZ_REFRESH_CHECK_INTERVAL_SECONDS)


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(_pfz_refresh_loop())
    yield
    task.cancel()


app = FastAPI(title=settings.app_name, lifespan=lifespan)

# Dev-only: wide open so the Next.js dev server (localhost:3000) can call this
# freely. Tighten to specific origins before this is exposed beyond local dev.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(onboarding.router)
app.include_router(catalog.router)
app.include_router(pfz.router)
app.include_router(harbour.router)
app.include_router(catchlog.router)
app.include_router(verification.router)


@app.get("/health")
def health():
    return {"status": "ok", "app": settings.app_name}
