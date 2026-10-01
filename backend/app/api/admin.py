from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone
from app.core.database import get_db
from app.core.security import require_role
from app.db.models import AuditLog, Source, WeatherReport, WeatherEvent, ReportEventLink, Media, VerificationResult
from app.db.schemas import AuditLogResponse
from app.ingestion.simulator import generate_sample_report, SIMULATED_REPORTS
from app.ingestion.open_meteo_connector import OpenMeteoConnector
from app.pipeline.processor import process_incoming_report
from app.api.websocket import ws_manager

router = APIRouter(prefix="/admin", tags=["Admin Operations"])

@router.get("/audit-logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    user: dict = Depends(require_role(["moderator", "admin", "analyst"]))
):
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit).all()
    return logs

@router.get("/sources")
def get_registered_sources(db: Session = Depends(get_db)):
    sources = db.query(Source).all()
    return [{
        "id": s.id,
        "name": s.name,
        "source_type": s.source_type,
        "reliability_score": s.reliability_score,
        "verified": s.verified,
        "reports_count": len(s.reports),
        "created_at": s.created_at
    } for s in sources]

@router.post("/simulate-ingestion")
async def trigger_simulated_ingestion(
    count: int = Query(1, ge=1, le=20),
    db: Session = Depends(get_db)
):
    ingested = []
    for _ in range(count):
        payload = generate_sample_report()
        report = await process_incoming_report(db, payload, websocket_manager=ws_manager)
        ingested.append({
            "id": report.id,
            "text": report.text,
            "event_type": report.event_type,
            "city": report.city,
            "verification_status": report.verification_status,
            "is_duplicate": report.is_duplicate
        })
    return {"message": f"Successfully ingested and processed {len(ingested)} simulated reports", "reports": ingested}

@router.post("/fetch-live-open-meteo")
async def trigger_live_open_meteo_fetch(db: Session = Depends(get_db)):
    connector = OpenMeteoConnector()
    raw_items = connector.fetch_data()
    processed = []
    for item in raw_items:
        payload = connector.normalize_payload(item)
        rep = await process_incoming_report(db, payload, websocket_manager=ws_manager)
        processed.append({
            "id": rep.id,
            "city": rep.city,
            "event_type": rep.event_type,
            "status": rep.verification_status
        })
    return {"message": f"Processed {len(processed)} live observation reports from Open-Meteo", "reports": processed}

@router.post("/seed-demo-data")
async def seed_demo_data(db: Session = Depends(get_db)):
    # Check if reports already exist
    count = db.query(WeatherReport).count()
    if count >= 10:
        return {"message": f"Database already populated with {count} reports. Seed skipped."}
        
    results = []
    # Seed all curated reports in SIMULATED_REPORTS
    for i in range(len(SIMULATED_REPORTS)):
        payload = generate_sample_report(i)
        rep = await process_incoming_report(db, payload, websocket_manager=None)
        results.append(rep.id)
        
    return {"message": f"Successfully seeded {len(results)} initial baseline weather reports and clusters."}
