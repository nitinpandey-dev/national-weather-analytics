import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, Boolean, ForeignKey, JSON, Text, Integer
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class Source(Base):
    __tablename__ = "sources"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False, unique=True)
    source_type = Column(String(50), nullable=False) # citizen, imd_api, open_meteo, social_rss, satellite
    reliability_score = Column(Float, default=0.7) # 0.0 to 1.0
    verified = Column(Boolean, default=True)
    meta_info = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    reports = relationship("WeatherReport", back_populates="source")

class WeatherReport(Base):
    __tablename__ = "weather_reports"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    source_id = Column(String(36), ForeignKey("sources.id"), nullable=True)
    external_id = Column(String(100), nullable=True)
    raw_payload_uri = Column(String(255), nullable=True)
    text = Column(Text, nullable=False)
    event_type = Column(String(50), nullable=False) # rainfall, heavy_rainfall, thunderstorm, flood, heatwave, fog, dust_storm, etc.
    event_confidence = Column(Float, default=0.5)
    reported_at = Column(DateTime(timezone=True), default=utc_now)
    ingested_at = Column(DateTime(timezone=True), default=utc_now)
    verification_status = Column(String(30), default="PENDING") # PENDING, VERIFIED, REJECTED, NEEDS_REVIEW
    
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    state = Column(String(100), nullable=True)
    district = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)
    
    language = Column(String(10), default="en")
    is_duplicate = Column(Boolean, default=False)
    duplicate_of_id = Column(String(36), ForeignKey("weather_reports.id"), nullable=True)
    text_hash = Column(String(64), nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=utc_now)

    # Relationships
    source = relationship("Source", back_populates="reports")
    media = relationship("Media", back_populates="report", cascade="all, delete-orphan")
    verification_result = relationship("VerificationResult", back_populates="report", uselist=False, cascade="all, delete-orphan")
    event_links = relationship("ReportEventLink", back_populates="report", cascade="all, delete-orphan")

class Media(Base):
    __tablename__ = "media"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    report_id = Column(String(36), ForeignKey("weather_reports.id"), nullable=False)
    object_uri = Column(String(500), nullable=False)
    media_type = Column(String(50), default="image/jpeg")
    sha256 = Column(String(64), nullable=True)
    perceptual_hash = Column(String(64), nullable=True)
    meta_info = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    report = relationship("WeatherReport", back_populates="media")

class WeatherEvent(Base):
    __tablename__ = "weather_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    event_type = Column(String(50), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    radius_km = Column(Float, default=25.0)
    state = Column(String(100), nullable=True)
    district = Column(String(100), nullable=True)
    severity = Column(String(20), default="MODERATE") # LOW, MODERATE, HIGH, SEVERE, CATASTROPHIC
    start_time = Column(DateTime(timezone=True), default=utc_now)
    end_time = Column(DateTime(timezone=True), nullable=True)
    confidence = Column(Float, default=0.75)
    status = Column(String(30), default="ACTIVE") # ACTIVE, MONITORING, RESOLVED
    created_at = Column(DateTime(timezone=True), default=utc_now)

    report_links = relationship("ReportEventLink", back_populates="event", cascade="all, delete-orphan")

class ReportEventLink(Base):
    __tablename__ = "report_event_links"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    report_id = Column(String(36), ForeignKey("weather_reports.id"), nullable=False)
    event_id = Column(String(36), ForeignKey("weather_events.id"), nullable=False)
    relationship_type = Column(String(50), default="corroborating") # primary, corroborating, duplicate

    report = relationship("WeatherReport", back_populates="event_links")
    event = relationship("WeatherEvent", back_populates="report_links")

class VerificationResult(Base):
    __tablename__ = "verification_results"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    report_id = Column(String(36), ForeignKey("weather_reports.id"), nullable=False, unique=True)
    source_score = Column(Float, default=0.7)
    temporal_score = Column(Float, default=1.0)
    spatial_score = Column(Float, default=1.0)
    corroboration_score = Column(Float, default=0.5)
    media_score = Column(Float, default=0.8)
    duplicate_penalty = Column(Float, default=0.0)
    final_score = Column(Float, default=0.65)
    model_version = Column(String(50), default="fusion-ensemble-v2.1")
    decision = Column(String(30), default="NEEDS_REVIEW") # VERIFIED, REJECTED, NEEDS_REVIEW
    reason_breakdown = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    report = relationship("WeatherReport", back_populates="verification_result")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    actor_id = Column(String(36), nullable=False)
    actor_name = Column(String(100), default="System")
    action = Column(String(50), nullable=False) # VERIFY, REJECT, MERGE, CLUSTER, INGEST, OVERRIDE
    entity_type = Column(String(50), nullable=False) # report, event, source, config
    entity_id = Column(String(36), nullable=False)
    old_value = Column(JSON, nullable=True)
    new_value = Column(JSON, nullable=True)
    timestamp = Column(DateTime(timezone=True), default=utc_now)

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(30), default="viewer") # viewer, analyst, moderator, admin
    full_name = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
