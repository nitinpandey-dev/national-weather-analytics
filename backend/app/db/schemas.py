from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# User & Auth
class UserLogin(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    role: str
    full_name: Optional[str] = None
    is_active: bool

# Media
class MediaCreate(BaseModel):
    object_uri: str
    media_type: str = "image/jpeg"
    sha256: Optional[str] = None
    perceptual_hash: Optional[str] = None
    meta_info: Optional[Dict[str, Any]] = None

class MediaResponse(BaseModel):
    id: str
    object_uri: str
    media_type: str
    sha256: Optional[str] = None
    perceptual_hash: Optional[str] = None
    meta_info: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Verification Result
class VerificationBreakdown(BaseModel):
    source_score: float
    temporal_score: float
    spatial_score: float
    corroboration_score: float
    media_score: float
    duplicate_penalty: float
    final_score: float
    decision: str
    reasons: List[str] = []

class VerificationResultResponse(BaseModel):
    id: str
    source_score: float
    temporal_score: float
    spatial_score: float
    corroboration_score: float
    media_score: float
    duplicate_penalty: float
    final_score: float
    model_version: str
    decision: str
    reason_breakdown: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True

# Reports
class CitizenReportCreate(BaseModel):
    text: str = Field(..., description="Report text description")
    event_type: Optional[str] = Field("auto", description="Reported event type or 'auto' for AI classification")
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    state: Optional[str] = None
    district: Optional[str] = None
    city: Optional[str] = None
    media_urls: Optional[List[str]] = Field(default_factory=list)
    reporter_name: Optional[str] = "Anonymous Citizen"
    reporter_contact: Optional[str] = None

class ReportResponse(BaseModel):
    id: str
    source_id: Optional[str] = None
    source_name: Optional[str] = None
    source_type: Optional[str] = None
    text: str
    event_type: str
    event_confidence: float
    reported_at: datetime
    ingested_at: datetime
    verification_status: str
    latitude: float
    longitude: float
    state: Optional[str] = None
    district: Optional[str] = None
    city: Optional[str] = None
    is_duplicate: bool
    duplicate_of_id: Optional[str] = None
    media: List[MediaResponse] = []
    verification: Optional[VerificationResultResponse] = None
    linked_event_id: Optional[str] = None

    class Config:
        from_attributes = True

class VerifyRejectRequest(BaseModel):
    reason: Optional[str] = "Manual administrative review"
    notes: Optional[str] = None

class MergeReportsRequest(BaseModel):
    primary_report_id: str
    duplicate_report_ids: List[str]
    notes: Optional[str] = "Merged as duplicates"

# Weather Events
class EventResponse(BaseModel):
    id: str
    event_type: str
    title: str
    description: Optional[str] = None
    latitude: float
    longitude: float
    radius_km: float
    state: Optional[str] = None
    district: Optional[str] = None
    severity: str
    start_time: datetime
    end_time: Optional[datetime] = None
    confidence: float
    status: str
    reports_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True

# Analytics
class AnalyticsSummary(BaseModel):
    total_reports: int
    reports_last_hour: int
    verified_reports: int
    pending_reports: int
    rejected_reports: int
    needs_review_reports: int
    duplicate_reports: int
    duplicate_rate: float
    verification_rate: float
    active_weather_events: int
    high_confidence_events: int
    avg_processing_latency_ms: float
    reports_by_event: Dict[str, int]
    reports_by_state: Dict[str, int]
    reports_by_source: Dict[str, int]
    verification_funnel: Dict[str, int]

class TimeseriesPoint(BaseModel):
    timestamp: str
    total: int
    verified: int
    severe: int

# Audit Log
class AuditLogResponse(BaseModel):
    id: str
    actor_name: str
    action: str
    entity_type: str
    entity_id: str
    old_value: Optional[Dict[str, Any]] = None
    new_value: Optional[Dict[str, Any]] = None
    timestamp: datetime

    class Config:
        from_attributes = True
