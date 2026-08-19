import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api import auth, onboarding, catalog, pfz, harbour, catchlog, verification

# Without this, app-level loggers (e.g. app.services.otp_service) sit at the
# default WARNING level and their .info() calls — including the dev-stub OTP
# code — never print anywhere, even though nothing errors. Uvicorn configures
# its own loggers but not arbitrary ones like "nauka.otp".
logging.basicConfig(level=logging.INFO, format="%(name)s: %(message)s")

# Schema is owned by Alembic now (migrations/), not by the app on boot — run
# `alembic upgrade head` before starting the server. The app used to call
# Base.metadata.create_all() here, which only ever adds missing tables and
# silently does nothing for column changes on an existing table — that's
# exactly the gap that kept forcing a full dev-db wipe on every schema change.

app = FastAPI(title=settings.app_name)

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
