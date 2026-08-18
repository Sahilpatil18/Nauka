from fastapi import FastAPI

from app.config import settings
from app.database import Base, engine
from app.api import auth, onboarding, catalog, pfz, harbour, catchlog

Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.app_name)

app.include_router(auth.router)
app.include_router(onboarding.router)
app.include_router(catalog.router)
app.include_router(pfz.router)
app.include_router(harbour.router)
app.include_router(catchlog.router)


@app.get("/health")
def health():
    return {"status": "ok", "app": settings.app_name}
