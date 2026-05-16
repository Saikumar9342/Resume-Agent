from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:password@localhost:5432/resume_agent"
    redis_url: str = "redis://localhost:6379/0"
    google_api_key: str = ""
    groq_api_key: str = ""
    secret_key: str = "change-me-in-production"
    cors_origins: list[str] = ["http://localhost:3000"]
    gemini_model: str = "gemini-2.0-flash"
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/api/v1/drive/callback"

    class Config:
        env_file = ".env"


settings = Settings()
