from typing import Dict, Any, List
from datetime import datetime, timezone
from app.pipeline.geocoder import is_within_india, haversine_distance_km
from app.core.config import settings

MODEL_VERSION = "evidence-fusion-v2.5"

def evaluate_verification(
    source_reliability: float,
    reported_at: datetime,
    latitude: float,
    longitude: float,
    is_duplicate: bool,
    has_media: bool,
    nearby_matching_reports_count: int,
    is_official_source: bool = False
) -> Dict[str, Any]:
    """
    Computes multi-dimensional Evidence Fusion score (0.0 to 1.0).
    Combines:
    1. Source Reliability (30% weight)
    2. Spatial Consistency (15% weight)
    3. Temporal Consistency (15% weight)
    4. Corroboration / Neighbor Agreement (25% weight)
    5. Media Authenticity (15% weight)
    - Duplicate Penalty (up to -35%)
    """
    reasons = []
    
    # 1. Source score
    source_score = max(0.1, min(1.0, source_reliability))
    reasons.append(f"Source reliability factor: {source_score*100:.0f}%")
    
    # 2. Spatial validity
    if is_within_india(latitude, longitude):
        spatial_score = 1.0
        reasons.append("Geospatial coordinates validated within National Boundaries of India")
    else:
        spatial_score = 0.2
        reasons.append("Warning: Location coordinates fall outside primary India geographic envelope")
        
    # 3. Temporal validity
    now_utc = datetime.now(timezone.utc)
    # Check if reported_at has tzinfo
    if reported_at.tzinfo is None:
        reported_at = reported_at.replace(tzinfo=timezone.utc)
        
    diff_hours = (now_utc - reported_at).total_seconds() / 3600.0
    if 0 <= diff_hours <= 3.0:
        temporal_score = 1.0
        reasons.append("Near real-time freshness (under 3 hours)")
    elif 3.0 < diff_hours <= 24.0:
        temporal_score = 0.85
        reasons.append("Same-day observation report")
    elif diff_hours > 24.0:
        temporal_score = 0.50
        reasons.append("Delayed submission (>24 hours latency)")
    else: # Future timestamp
        temporal_score = 0.10
        reasons.append("Suspect: Future timestamp detected")
        
    # 4. Corroboration score
    if is_official_source:
        corroboration_score = 1.0
        reasons.append("Verified official meteorological feed; high intrinsic confidence")
    elif nearby_matching_reports_count >= 3:
        corroboration_score = 0.95
        reasons.append(f"High spatial corroboration: {nearby_matching_reports_count} nearby congruent reports detected")
    elif nearby_matching_reports_count == 2:
        corroboration_score = 0.80
        reasons.append("Moderate corroboration: 2 nearby concurrent reports")
    elif nearby_matching_reports_count == 1:
        corroboration_score = 0.65
        reasons.append("Single neighboring report corroboration")
    else:
        corroboration_score = 0.35
        reasons.append("Isolated report; awaiting additional ground corroboration")
        
    # 5. Media score
    if has_media:
        media_score = 0.85
        reasons.append("Ground photographic/visual evidence provided")
    else:
        media_score = 0.50
        reasons.append("No visual media attachment attached")
        
    # 6. Duplicate penalty
    duplicate_penalty = 0.0
    if is_duplicate:
        duplicate_penalty = 0.35
        reasons.append("Duplicate indicator penalty applied (-35%)")
        
    # Weighted evidence fusion
    raw_score = (
        (source_score * 0.30) +
        (spatial_score * 0.15) +
        (temporal_score * 0.15) +
        (corroboration_score * 0.25) +
        (media_score * 0.15)
    ) - duplicate_penalty
    
    final_score = round(max(0.05, min(0.99, raw_score)), 2)
    
    # Decision determination
    if is_official_source or final_score >= settings.MIN_CONFIDENCE_AUTO_VERIFY:
        decision = "VERIFIED"
    elif final_score <= settings.MIN_CONFIDENCE_SUSPICIOUS or is_duplicate:
        decision = "NEEDS_REVIEW"
    else:
        decision = "PENDING"
        
    return {
        "source_score": round(source_score, 2),
        "temporal_score": round(temporal_score, 2),
        "spatial_score": round(spatial_score, 2),
        "corroboration_score": round(corroboration_score, 2),
        "media_score": round(media_score, 2),
        "duplicate_penalty": round(duplicate_penalty, 2),
        "final_score": final_score,
        "decision": decision,
        "model_version": MODEL_VERSION,
        "reasons": reasons
    }
