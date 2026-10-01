import os
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "National Weather Analytics Platform"
    PROJECT_VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "sih2026-national-weather-analytics-ultra-secret-key-998822")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./weather_analytics.db")
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ]
    
    # ML / Model thresholds
    MIN_CONFIDENCE_AUTO_VERIFY: float = 0.85
    MIN_CONFIDENCE_SUSPICIOUS: float = 0.35
    DEDUPLICATION_SIMILARITY_THRESHOLD: float = 0.80
    SPATIAL_CLUSTER_RADIUS_KM: float = 40.0
    TEMPORAL_CLUSTER_HOURS: float = 6.0
    
    class Config:
        case_sensitive = True

settings = Settings()
