from datetime import timedelta
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./agenda.db"

    # Security
    SECRET_KEY: str = "change-this-to-a-random-secret-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # CORS — comma-separated list of allowed origins
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:4173"

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def access_token_expire_delta(self) -> timedelta:
        return timedelta(minutes=self.ACCESS_TOKEN_EXPIRE_MINUTES)

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
