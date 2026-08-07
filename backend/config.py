from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./complaints.db"
    APP_ENV: str = "development"

    GROQ_API_KEY: str = ""

    CORS_ORIGINS: str = "http://localhost:5173"
    MAX_UPLOAD_MB: int = 10

    # Feature flags for bonus LangGraph nodes
    FEATURE_SUMMARY: bool = True
    FEATURE_ROOT_CAUSE: bool = True
    FEATURE_CAPA: bool = True
    FEATURE_DUPLICATE_DETECTION: bool = False

    @field_validator("GROQ_API_KEY")
    @classmethod
    def groq_key_required(cls, v: str, info) -> str:
        # Allow empty key in test environment
        import os
        if not v and os.environ.get("APP_ENV", "development") != "test":
            raise ValueError(
                "GROQ_API_KEY is required. Set it in backend/.env or as an environment variable."
            )
        return v

    class Config:
        env_file = ".env"


settings = Settings()
