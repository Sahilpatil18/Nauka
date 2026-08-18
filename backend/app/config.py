from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Nauka Phase 1 API"
    database_url: str = "sqlite:///./nauka.db"

    # INCOIS integration — no confirmed API access yet. Adapter falls back to
    # mock data when this is unset. See docs/phase1_decisions.md.
    incois_api_base_url: str | None = None
    incois_api_key: str | None = None

    class Config:
        env_file = ".env"


settings = Settings()
