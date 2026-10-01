from datetime import datetime, timezone
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.db.models import WeatherReport, Source, Media, WeatherEvent, ReportEventLink, VerificationResult, AuditLog
from app.pipeline.text_processor import clean_text, compute_text_hash, detect_language, extract_severity_keywords
from app.pipeline.classifier import classify_weather_event
from app.pipeline.geocoder import reverse_geocode, haversine_distance_km
from app.pipeline.deduplicator import find_duplicate_candidate, compute_media_hashes
from app.pipeline.verifier import evaluate_verification
from app.pipeline.event_cluster import find_or_create_weather_event

async def process_incoming_report(
    db: Session,
    payload: Dict[str, Any],
    websocket_manager = None
) -> WeatherReport:
    """
    End-to-End Processing Pipeline:
    Ingest -> Normalize -> Classify -> Geolocate -> Deduplicate -> Corroborate -> Score -> Persist -> Broadcast
    """
    # 1. Clean and normalize text
    raw_text = payload.get("text", "")
    text = clean_text(raw_text)
    text_hash = compute_text_hash(text)
    lang = detect_language(text)
    severity_info = extract_severity_keywords(text)
    
    # 2. Location resolution
    lat = float(payload.get("latitude", 28.6139))
    lon = float(payload.get("longitude", 77.2090))
    geo_info = reverse_geocode(lat, lon)
    state = payload.get("state") or geo_info.get("state")
    district = payload.get("district") or geo_info.get("district")
    city = payload.get("city") or geo_info.get("city")
    
    # 3. Source resolution
    source_name = payload.get("source_name", "Citizen Submission")
    source_type = payload.get("source_type", "citizen")
    source = db.query(Source).filter(Source.name == source_name).first()
    if not source:
        source_rel = 0.95 if source_type == "imd_api" else (0.85 if source_type == "open_meteo" else 0.65)
        source = Source(
            name=source_name,
            source_type=source_type,
            reliability_score=source_rel,
            verified=(source_type in ["imd_api", "open_meteo"])
        )
        db.add(source)
        db.flush()
        
    # 4. Classification
    reported_event_type = payload.get("event_type")
    if not reported_event_type or reported_event_type == "auto":
        clf_result = classify_weather_event(text)
        event_type = clf_result["event_type"]
        event_confidence = clf_result["confidence"]
    else:
        event_type = reported_event_type
        event_confidence = 0.88
        
    reported_at = payload.get("reported_at") or datetime.now(timezone.utc)
    if isinstance(reported_at, str):
        try:
            reported_at = datetime.fromisoformat(reported_at.replace("Z", "+00:00"))
        except Exception:
            reported_at = datetime.now(timezone.utc)
            
    # 5. Deduplication check against existing reports
    recent_reports = db.query(WeatherReport).order_by(WeatherReport.created_at.desc()).limit(100).all()
    recent_dicts = [{
        "id": r.id,
        "text": r.text,
        "text_hash": r.text_hash,
        "latitude": r.latitude,
        "longitude": r.longitude,
        "reported_at": r.reported_at
    } for r in recent_reports]
    
    dup_match = find_duplicate_candidate(text, lat, lon, reported_at, recent_dicts)
    is_duplicate = dup_match is not None
    duplicate_of_id = dup_match[0] if dup_match else None
    
    # 6. Corroboration check
    nearby_count = 0
    for r in recent_reports:
        if r.event_type == event_type:
            d = haversine_distance_km(lat, lon, r.latitude, r.longitude)
            if d <= 50.0:
                nearby_count += 1
                
    # 7. Media handling
    media_urls = payload.get("media_urls", [])
    has_media = len(media_urls) > 0
    
    # 8. Evidence Fusion Verification
    is_official = source_type in ["imd_api", "open_meteo"]
    verification_eval = evaluate_verification(
        source_reliability=source.reliability_score,
        reported_at=reported_at,
        latitude=lat,
        longitude=lon,
        is_duplicate=is_duplicate,
        has_media=has_media,
        nearby_matching_reports_count=nearby_count,
        is_official_source=is_official
    )
    
    # 9. Create WeatherReport model
    report = WeatherReport(
        source_id=source.id,
        external_id=payload.get("external_id"),
        text=text,
        event_type=event_type,
        event_confidence=event_confidence,
        reported_at=reported_at,
        ingested_at=datetime.now(timezone.utc),
        verification_status=verification_eval["decision"],
        latitude=lat,
        longitude=lon,
        state=state,
        district=district,
        city=city,
        language=lang,
        is_duplicate=is_duplicate,
        duplicate_of_id=duplicate_of_id,
        text_hash=text_hash
    )
    db.add(report)
    db.flush()
    
    # 10. Store Media records
    for uri in media_urls:
        media_rec = Media(
            report_id=report.id,
            object_uri=uri,
            media_type="image/jpeg",
            sha256=compute_text_hash(uri), # URL hash placeholder
            perceptual_hash="phash_" + compute_text_hash(uri)[:16]
        )
        db.add(media_rec)
        
    # 11. Store Verification Result
    ver_res = VerificationResult(
        report_id=report.id,
        source_score=verification_eval["source_score"],
        temporal_score=verification_eval["temporal_score"],
        spatial_score=verification_eval["spatial_score"],
        corroboration_score=verification_eval["corroboration_score"],
        media_score=verification_eval["media_score"],
        duplicate_penalty=verification_eval["duplicate_penalty"],
        final_score=verification_eval["final_score"],
        model_version=verification_eval["model_version"],
        decision=verification_eval["decision"],
        reason_breakdown={"reasons": verification_eval["reasons"]}
    )
    db.add(ver_res)
    
    # 12. Event Clustering & Linking
    active_events = db.query(WeatherEvent).filter(WeatherEvent.status == "ACTIVE").all()
    existing_evt_id, new_evt_dict = find_or_create_weather_event(
        event_type=event_type,
        lat=lat,
        lon=lon,
        reported_at=reported_at,
        state=state,
        district=district,
        city=city,
        severity=severity_info["severity"],
        existing_events=active_events
    )
    
    if existing_evt_id:
        link = ReportEventLink(
            report_id=report.id,
            event_id=existing_evt_id,
            relationship_type="duplicate" if is_duplicate else "corroborating"
        )
        db.add(link)
    elif new_evt_dict:
        new_event = WeatherEvent(**new_evt_dict)
        db.add(new_event)
        db.flush()
        link = ReportEventLink(
            report_id=report.id,
            event_id=new_event.id,
            relationship_type="primary"
        )
        db.add(link)
        
    # 13. System Audit Log
    audit = AuditLog(
        actor_id="system-pipeline",
        actor_name="Automated Ingestion Gateway",
        action="INGEST",
        entity_type="report",
        entity_id=report.id,
        old_value=None,
        new_value={
            "event_type": event_type,
            "verification_status": verification_eval["decision"],
            "final_score": verification_eval["final_score"],
            "city": city,
            "is_duplicate": is_duplicate
        }
    )
    db.add(audit)
    db.commit()
    db.refresh(report)
    
    # 14. Broadcast to WebSocket
    if websocket_manager:
        event_payload = {
            "type": "NEW_REPORT",
            "data": {
                "id": report.id,
                "text": report.text,
                "event_type": report.event_type,
                "latitude": report.latitude,
                "longitude": report.longitude,
                "city": report.city,
                "state": report.state,
                "verification_status": report.verification_status,
                "final_score": verification_eval["final_score"],
                "is_duplicate": report.is_duplicate,
                "reported_at": report.reported_at.isoformat()
            }
        }
        await websocket_manager.broadcast(event_payload)
        
    return report
